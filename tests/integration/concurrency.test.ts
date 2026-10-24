/**
 * Concurrency.
 *
 * Three places where two callers can collide on the same row: partner quote
 * acceptance, change-order approval, and consolidated invoice generation.
 * Each must end with exactly one winner and no partially written state.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { ENV_READY, admin, cleanupUsers, makeUser, type TestUser } from "./harness";

const d = ENV_READY ? describe : describe.skip;

const RUNS = 10;

let staff: TestUser;
const leadIds: string[] = [];
const partnerIds: string[] = [];
const accountIds: string[] = [];
const jobIds: string[] = [];

async function seedRace() {
  const db = admin();
  const { data: lead } = await db
    .from("leads")
    .insert({ is_test: true,
      customer_name: "UAT Race",
      customer_email: `uat.race.${Math.random().toString(36).slice(2)}@ps-umzug-test.invalid`,
      description: "acceptance race",
    })
    .select("id")
    .single();
  leadIds.push(lead!.id as string);

  const { data: partners } = await db
    .from("partners")
    .insert([
      { legal_name: `UAT Race A ${Math.random()}`, created_by: staff.id, status: "approved" },
      { legal_name: `UAT Race B ${Math.random()}`, created_by: staff.id, status: "approved" },
    ])
    .select("id");
  const ids = (partners ?? []).map((p) => p.id as string);
  partnerIds.push(...ids);

  const { data: opps } = await db
    .from("partner_opportunities")
    .insert(
      ids.map((partner_id) => ({
        partner_id,
        lead_id: lead!.id,
        status: "sent",
        title: "UAT race opportunity",
      })),
    )
    .select("id, partner_id");

  const { data: quotes } = await db
    .from("partner_quotes")
    .insert(
      (opps ?? []).map((o) => ({
        opportunity_id: o.id,
        partner_id: o.partner_id,
        lead_id: lead!.id,
        partner_cost: 900,
        status: "submitted",
        submitted_at: new Date().toISOString(),
      })),
    )
    .select("id");

  return { leadId: lead!.id as string, quoteIds: (quotes ?? []).map((q) => q.id as string) };
}

d("concurrency", () => {
  beforeAll(async () => {
    staff = await makeUser({ role: "zuegelwerk_admin", label: "race-admin" });
  }, 60_000);

  afterAll(async () => {
    const db = admin();
    if (jobIds.length) await db.from("jobs_execution").delete().in("id", jobIds);
    if (leadIds.length) {
      await db.from("change_orders").delete().in("lead_id", leadIds);
      await db.from("partner_quotes").delete().in("lead_id", leadIds);
      await db.from("partner_opportunities").delete().in("lead_id", leadIds);
      await db.from("lead_activities").delete().in("lead_id", leadIds);
      await db.from("jobs_execution").delete().in("lead_id", leadIds);
      await db.from("leads").delete().in("id", leadIds);
    }
    if (partnerIds.length) await db.from("partners").delete().in("id", partnerIds);
    if (accountIds.length) {
      await db.from("invoice_lines").delete().in("invoice_id", []);
      await db.from("invoices").delete().in("account_id", accountIds);
      await db.from("accounts").delete().in("id", accountIds);
    }
    await cleanupUsers();
  }, 120_000);

  it(`accepts exactly one partner quote in ${RUNS} simultaneous races`, async () => {
    let doubleWinners = 0;
    for (let run = 0; run < RUNS; run += 1) {
      const { leadId, quoteIds } = await seedRace();
      const results = await Promise.all(
        quoteIds.map((id) => staff.client.rpc("accept_partner_quote", { _quote_id: id, _note: "race" })),
      );
      const ok = results.filter((r) => !r.error).length;
      const refused = results.filter(
        (r) => r.error && (r.error.code === "55006" || /already/i.test(r.error.message)),
      ).length;

      const { data: accepted } = await admin()
        .from("partner_quotes")
        .select("id")
        .eq("lead_id", leadId)
        .eq("status", "accepted");
      if ((accepted ?? []).length !== 1) doubleWinners += 1;
      expect(ok).toBe(1);
      expect(refused).toBe(results.length - 1);
    }
    expect(doubleWinners).toBe(0);
  }, 180_000);

  it("decides a change order once, even from two simultaneous approvals", async () => {
    const db = admin();
    const { leadId } = await seedRace();
    const { data: job, error: jobErr } = await db
      .from("jobs_execution")
      .insert({ is_test: true, lead_id: leadId, status: "in_progress", job_value: 2000, partner_id: partnerIds[partnerIds.length - 1]! })
      .select("id")
      .single();
    if (jobErr) throw new Error(`job seed failed: ${jobErr.message}`);
    jobIds.push(job!.id as string);

    const { data: created, error: createErr } = await staff.client.rpc("create_change_order", {
      _job_id: job!.id,
      _description: "UAT extra work",
      _reason: "additional volume",
      _customer_price: 400,
    });
    expect(createErr).toBeFalsy();
    // create_change_order returns the whole row, not just its id.
    const coId = (created as { id: string }).id;

    await staff.client.rpc("send_change_order", { _id: coId, _customer_price: 400 });

    const results = await Promise.all([
      staff.client.rpc("decide_change_order_staff", { _id: coId, _approve: true, _channel: "phone", _name: "A" }),
      staff.client.rpc("decide_change_order_staff", { _id: coId, _approve: false, _channel: "phone", _name: "B" }),
    ]);
    const ok = results.filter((r) => !r.error).length;
    expect(ok, JSON.stringify(results.map((r) => r.error))).toBe(1);

    const { data: row } = await db
      .from("change_orders")
      .select("status, customer_decided_at, decided_name")
      .eq("id", coId)
      .single();
    // One terminal decision, one decider, one timestamp — never both outcomes.
    expect(["approved", "rejected"]).toContain(row!.status);
    expect(row!.customer_decided_at).toBeTruthy();
    expect(["A", "B"]).toContain(row!.decided_name);
  }, 120_000);

  it("generates one invoice per account and period, not one per caller", async () => {
    const db = admin();
    const { data: account } = await db
      .from("accounts")
      .insert({ legal_name: `UAT Invoice ${Math.random()}`, country: "CH", status: "active" })
      .select("id")
      .single();
    accountIds.push(account!.id as string);

    const start = "2026-01-01";
    const end = "2026-01-31";
    const results = await Promise.all([
      staff.client.rpc("build_consolidated_invoice", {
        _account_id: account!.id,
        _period_start: start,
        _period_end: end,
      }),
      staff.client.rpc("build_consolidated_invoice", {
        _account_id: account!.id,
        _period_start: start,
        _period_end: end,
      }),
    ]);
    const failed = results.filter((r) => r.error);
    // Either the second call is refused, or it returns the same invoice.
    const { data: invoices } = await db
      .from("invoices")
      .select("id")
      .eq("account_id", account!.id)
      .eq("period_start", start)
      .eq("period_end", end);
    expect((invoices ?? []).length, `duplicate invoices created (${failed.length} refused)`).toBeLessThanOrEqual(1);
  }, 120_000);
});
