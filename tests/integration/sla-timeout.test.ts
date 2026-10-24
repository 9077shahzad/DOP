/**
 * SLA timeout sweep — regression.
 *
 * This job disappeared from the scheduler once already (the automation switch
 * called cron.unschedule), and nobody noticed because nothing asserted on it.
 * These tests pin the behaviour that matters: an overdue opportunity times out
 * exactly once, the partner's timeout counter moves exactly once, the lead is
 * either reallocated or raised as an allocation exception, and a second run
 * over the same data changes nothing.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { ENV_READY, admin, cleanupUsers, makeUser, type TestUser } from "./harness";

const d = ENV_READY ? describe : describe.skip;

let staff: TestUser;
const leadIds: string[] = [];
const partnerIds: string[] = [];

type Snapshot = {
  status: string;
  timelineRows: number;
  timedOutCount: number;
  openOpportunities: number;
  exceptions: number;
};

async function seedOverdueOpportunity(): Promise<{ leadId: string; partnerId: string; opportunityId: string }> {
  const db = admin();
  const { data: lead, error: leadError } = await db
    .from("leads")
    .insert({ is_test: true,
      customer_name: "UAT SLA",
      customer_email: `uat.sla.${Math.random().toString(36).slice(2)}@ps-umzug-test.invalid`,
      description: "sla timeout regression",
    })
    .select("id")
    .single();
  if (leadError) throw new Error(leadError.message);
  leadIds.push(lead!.id as string);

  const { data: partner, error: partnerError } = await db
    .from("partners")
    .insert({ legal_name: `UAT SLA ${Math.random()}`, created_by: staff.id, status: "approved" })
    .select("id")
    .single();
  if (partnerError) throw new Error(partnerError.message);
  partnerIds.push(partner!.id as string);

  const { data: opp, error: oppError } = await db
    .from("partner_opportunities")
    .insert({
      partner_id: partner!.id,
      lead_id: lead!.id,
      reference: `UAT-SLA-${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
      status: "sent",
      title: "UAT SLA",
      currency: "CHF",
      sent_at: new Date(Date.now() - 3_600_000).toISOString(),
      respond_by: new Date(Date.now() - 600_000).toISOString(),
    })
    .select("id")
    .single();
  if (oppError) throw new Error(oppError.message);

  return { leadId: lead!.id as string, partnerId: partner!.id as string, opportunityId: opp!.id as string };
}

async function snapshot(ids: { leadId: string; partnerId: string; opportunityId: string }): Promise<Snapshot> {
  const db = admin();
  const [opp, timeline, perf, open, exceptions] = await Promise.all([
    db.from("partner_opportunities").select("status").eq("id", ids.opportunityId).single(),
    db.from("lead_activities").select("id, meta").eq("lead_id", ids.leadId),
    db.from("partner_performance").select("opportunities_timed_out").eq("partner_id", ids.partnerId).maybeSingle(),
    db.from("partner_opportunities").select("id").eq("lead_id", ids.leadId).in("status", ["sent", "viewed"]),
    db.from("allocation_exceptions").select("id").eq("lead_id", ids.leadId),
  ]);
  const timedOutRows = (timeline.data ?? []).filter(
    (row) => (row.meta as { action?: string } | null)?.action === "timed_out",
  );
  return {
    status: (opp.data?.status as string) ?? "",
    timelineRows: timedOutRows.length,
    timedOutCount: Number(perf.data?.opportunities_timed_out ?? 0),
    openOpportunities: open.data?.length ?? 0,
    exceptions: exceptions.data?.length ?? 0,
  };
}

d("SLA timeout sweep", () => {
  beforeAll(async () => {
    staff = await makeUser({ role: "zuegelwerk_admin", label: "sla" });
  });

  afterAll(async () => {
    const db = admin();
    await db.from("allocation_exceptions").delete().in("lead_id", leadIds);
    await db.from("lead_activities").delete().in("lead_id", leadIds);
    await db.from("partner_opportunities").delete().in("lead_id", leadIds);
    await db.from("partner_performance").delete().in("partner_id", partnerIds);
    await db.from("partners").delete().in("id", partnerIds);
    await db.from("leads").delete().in("id", leadIds);
    await cleanupUsers();
  });

  it("is registered in the scheduler every five minutes", async () => {
    const { data, error } = await staff.client.rpc("cron_health");
    expect(error).toBeNull();
    const jobs = (data ?? []) as Array<{ job_name: string; schedule: string; active: boolean }>;
    const sla = jobs.find((j) => j.job_name === "mf-sla-timeouts");
    expect(sla, "mf-sla-timeouts must be registered").toBeTruthy();
    expect(sla!.schedule).toBe("*/5 * * * *");
    expect(sla!.active).toBe(true);
  });

  it("times an overdue opportunity out exactly once and resolves the lead", async () => {
    const ids = await seedOverdueOpportunity();
    const db = admin();

    const { data: first, error } = await db.rpc("run_sla_timeouts_job", { _trigger: "manual" });
    expect(error).toBeNull();
    expect((first as { skipped?: boolean }).skipped).toBe(false);

    const after = await snapshot(ids);
    expect(after.status).toBe("timed_out");
    expect(after.timelineRows).toBe(1);
    expect(after.timedOutCount).toBe(1);
    // Either the lead moved to another partner, or the gap was raised.
    expect(after.openOpportunities + after.exceptions).toBeGreaterThan(0);

    // Second run over the same data must be a no-op.
    const { error: secondError } = await db.rpc("run_sla_timeouts_job", { _trigger: "manual" });
    expect(secondError).toBeNull();
    const again = await snapshot(ids);
    expect(again).toEqual(after);
  });

  it("does not double-process when two sweeps overlap", async () => {
    const ids = await seedOverdueOpportunity();
    const db = admin();

    const [a, b] = await Promise.all([
      db.rpc("run_sla_timeouts_job", { _trigger: "manual" }),
      db.rpc("run_sla_timeouts_job", { _trigger: "manual" }),
    ]);
    expect(a.error).toBeNull();
    expect(b.error).toBeNull();

    const after = await snapshot(ids);
    expect(after.status).toBe("timed_out");
    expect(after.timelineRows).toBe(1);
    expect(after.timedOutCount).toBe(1);
  });
});
