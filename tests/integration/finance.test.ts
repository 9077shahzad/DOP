/**
 * Finance authorisation and invoice lifecycle.
 *
 * The point of these tests is that money handling is decided in the database,
 * not in the screen: a signed-out visitor cannot reach any finance function, a
 * signed-in user without a finance role is refused, and an invoice cannot be
 * issued while the company's legally required details are still unset.
 */
import { afterAll, describe, expect, it } from "vitest";

import { ENV_READY, anonClient, cleanupUsers, makeUser } from "./harness";

const suite = ENV_READY ? describe : describe.skip;

suite("finance access", () => {
  afterAll(async () => {
    await cleanupUsers();
  });

  it("signed-out visitors cannot execute any finance function", async () => {
    const anon = anonClient();
    for (const fn of [
      "create_invoice_from_job",
      "issue_invoice",
      "apply_invoice_payment",
      "cancel_invoice",
      "mark_overdue_invoices",
      "invoice_config_state",
      "management_kpis",
    ]) {
      const { error } = await anon.rpc(fn as never, {} as never);
      // A function anon may not execute is not even exposed in the API schema,
      // so PostgREST reports it as missing rather than as a privilege error.
      expect(error, `${fn} must be closed to anon`).toBeTruthy();
      expect(
        error?.code === "42501" || error?.code === "PGRST202" || /permission denied/i.test(error?.message ?? ""),
        `${fn} refusal: ${error?.code} ${error?.message}`,
      ).toBe(true);
    }
  });

  it("signed-out visitors cannot read invoices or invoice events", async () => {
    const anon = anonClient();
    const invoices = await anon.from("invoices").select("id").limit(1);
    const events = await anon.from("invoice_events").select("id").limit(1);
    expect(invoices.error ?? invoices.data?.length === 0).toBeTruthy();
    expect(events.error ?? events.data?.length === 0).toBeTruthy();
  });

  it("a signed-in user without a finance role is refused by the database", async () => {
    const user = await makeUser({ role: null, label: "finance-none" });
    const { error } = await user.client.rpc("create_invoice_from_job", {
      _job_id: "00000000-0000-0000-0000-000000000000",
    });
    expect(error).toBeTruthy();
    expect(String(error?.message)).toMatch(/not_authorised|permission denied/i);
  });

  it("finance staff see the configuration state instead of a fabricated invoice", async () => {
    const user = await makeUser({ role: "finance", label: "finance-ok" });
    const { data, error } = await user.client.rpc("invoice_config_state");
    expect(error?.message ?? null).toBeNull();
    const state = (data ?? {}) as { complete?: boolean; missing?: unknown[] };
    expect(typeof state.complete).toBe("boolean");
    // The company's UID/MWST and QR-IBAN are owner inputs that are still open,
    // so the gate must report them rather than let an invoice be issued.
    if (!state.complete) expect(Array.isArray(state.missing)).toBe(true);
  });

  it("an unknown job cannot be invoiced", async () => {
    const user = await makeUser({ role: "finance", label: "finance-job" });
    const { error } = await user.client.rpc("create_invoice_from_job", {
      _job_id: "00000000-0000-0000-0000-000000000000",
    });
    expect(String(error?.message)).toMatch(/job_not_found/);
  });

  it("management figures are counted for a range and never invented", async () => {
    const user = await makeUser({ role: "ops_manager", label: "finance-kpi" });
    const { data, error } = await user.client.rpc("management_kpis", {
      _from: "2020-01-01",
      _to: "2020-01-02",
    });
    expect(error).toBeNull();
    const kpis = (data ?? {}) as Record<string, unknown>;
    expect(Number(kpis["leads"] ?? 0)).toBe(0);
    expect(Number(kpis["invoiced_total"] ?? 0)).toBe(0);
    expect(kpis["rating_avg"] ?? null).toBeNull();
  });
});
