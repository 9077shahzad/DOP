/**
 * Invoice payments — one authoritative path.
 *
 * The legacy `record_invoice_payment` overwrote the paid amount and wrote no
 * history; it has been removed. These tests prove it is gone, and that the
 * surviving `apply_invoice_payment` accumulates part payments, refuses more
 * than the outstanding balance, refuses invoices that cannot be paid and
 * leaves an audit trail.
 */
import { afterAll, describe, expect, it } from "vitest";

import { admin, anonClient, cleanupUsers, ENV_READY, makeUser } from "./harness";
import { cleanupFixtures, dateInDays, seedInvoice } from "./seed";

const suite = ENV_READY ? describe : describe.skip;

suite("invoice payments", () => {
  afterAll(async () => {
    await cleanupFixtures();
    await cleanupUsers();
  });

  it("the legacy payment function no longer exists on any client", async () => {
    const finance = await makeUser({ role: "finance", label: "pay-legacy" });
    const args = {
      _invoice: "00000000-0000-0000-0000-000000000000",
      _amount: 1,
      _paid_on: dateInDays(0),
      _method: "bank_transfer",
      _reference: "",
      _note: "",
    };
    for (const client of [anonClient(), finance.client, admin()]) {
      const { error } = await client.rpc("record_invoice_payment", args as never);
      expect(error).not.toBeNull();
      expect(`${error?.code} ${error?.message}`).toMatch(/PGRST202|does not exist|permission denied|42883|42501/i);
    }
  });

  it("part payments accumulate and settle the invoice exactly", async () => {
    const finance = await makeUser({ role: "finance", label: "pay-accumulate" });
    const id = await seedInvoice({ total: 1081, net: 1000, vat: 81 });

    const first = await finance.client.rpc("apply_invoice_payment", {
      _id: id,
      _amount: 400,
      _paid_on: dateInDays(0),
      _method: "bank_transfer",
      _reference: "UAT-1",
      _note: "",
    });
    expect(first.error).toBeNull();
    expect(Number((first.data as Record<string, unknown>)["amount_paid"])).toBe(400);
    expect((first.data as Record<string, unknown>)["partially_paid"]).toBe(true);

    const second = await finance.client.rpc("apply_invoice_payment", {
      _id: id,
      _amount: 681,
      _paid_on: dateInDays(0),
      _method: "bank_transfer",
      _reference: "UAT-2",
      _note: "",
    });
    expect(second.error).toBeNull();
    const settled = second.data as Record<string, unknown>;
    expect(Number(settled["amount_paid"])).toBe(1081);
    expect(settled["settled"]).toBe(true);

    const invoice = await admin().from("invoices").select("status, amount_paid").eq("id", id).single();
    expect(invoice.data?.status).toBe("paid");
    expect(Number(invoice.data?.amount_paid)).toBe(1081);

    const events = await admin().from("invoice_events").select("kind").eq("invoice_id", id);
    expect((events.data ?? []).filter((e) => String(e.kind).includes("pay")).length).toBeGreaterThanOrEqual(2);
  });

  it("a payment larger than the outstanding balance is refused", async () => {
    const finance = await makeUser({ role: "finance", label: "pay-over" });
    const id = await seedInvoice({ total: 500, net: 463, vat: 37 });

    await finance.client.rpc("apply_invoice_payment", {
      _id: id,
      _amount: 300,
      _paid_on: dateInDays(0),
      _method: "cash",
      _reference: "",
      _note: "",
    });
    const over = await finance.client.rpc("apply_invoice_payment", {
      _id: id,
      _amount: 300,
      _paid_on: dateInDays(0),
      _method: "cash",
      _reference: "",
      _note: "",
    });
    expect(over.error?.message).toContain("amount_exceeds_outstanding");

    const invoice = await admin().from("invoices").select("amount_paid, status").eq("id", id).single();
    expect(Number(invoice.data?.amount_paid)).toBe(300);
    expect(invoice.data?.status).not.toBe("paid");
  });

  it("zero and negative amounts are refused", async () => {
    const finance = await makeUser({ role: "finance", label: "pay-invalid" });
    const id = await seedInvoice();
    for (const amount of [0, -50]) {
      const { error } = await finance.client.rpc("apply_invoice_payment", {
        _id: id,
        _amount: amount,
        _paid_on: dateInDays(0),
        _method: "cash",
        _reference: "",
        _note: "",
      });
      expect(error?.message).toContain("invalid_amount");
    }
  });

  it("draft and cancelled invoices cannot be paid", async () => {
    const finance = await makeUser({ role: "finance", label: "pay-state" });
    const draft = await seedInvoice({ status: "draft" });
    const cancelled = await seedInvoice({ status: "cancelled" });
    for (const id of [draft, cancelled]) {
      const { error } = await finance.client.rpc("apply_invoice_payment", {
        _id: id,
        _amount: 10,
        _paid_on: dateInDays(0),
        _method: "cash",
        _reference: "",
        _note: "",
      });
      expect(error?.message).toContain("invoice_not_payable");
    }
  });

  it("only finance-authorised callers can record a payment", async () => {
    const outsider = await makeUser({ role: "staff", label: "pay-outsider" });
    const id = await seedInvoice();
    const args = {
      _id: id,
      _amount: 10,
      _paid_on: dateInDays(0),
      _method: "cash",
      _reference: "",
      _note: "",
    };
    const refused = await outsider.client.rpc("apply_invoice_payment", args as never);
    expect(refused.error).not.toBeNull();

    const anon = await anonClient().rpc("apply_invoice_payment", args as never);
    expect(anon.error).not.toBeNull();

    const invoice = await admin().from("invoices").select("amount_paid").eq("id", id).single();
    expect(Number(invoice.data?.amount_paid)).toBe(0);
  });
});
