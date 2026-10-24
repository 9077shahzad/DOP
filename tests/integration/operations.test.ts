/**
 * Operational chain: accepted quotation → booking → dispatch → crew → completion.
 *
 * This is the checkpoint evidence. It runs against the real backend with real
 * roles, so a broken grant, a missing hand-over field, a double booking or a
 * skipped completion gate fails here rather than on a moving day.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { ENV_READY, admin, cleanupUsers, makeUser, type TestUser } from "./harness";

const d = describe.skipIf(!ENV_READY);

const TAG = `ops-${Date.now()}`;

let dispatcher: TestUser;
let crew: TestUser;
let otherCrew: TestUser;
let leadId = "";
let quoteId = "";
let teamId = "";
let otherTeamId = "";
let vehicleId = "";
let jobId = "";
let secondJobId = "";

const day = new Date(Date.now() + 14 * 86_400_000).toISOString().slice(0, 10);
const start = `${day}T07:00:00.000Z`;
const end = `${day}T11:00:00.000Z`;

d("operational chain", () => {
  beforeAll(async () => {
    const db = admin();
    dispatcher = await makeUser({ role: "ops_manager", label: "dispatch" });
    crew = await makeUser({ role: null, label: "crew" });
    otherCrew = await makeUser({ role: null, label: "crew2" });

    const { data: lead } = await db
      .from("leads")
      .insert({ is_test: true,
        customer_name: `UAT ${TAG}`,
        customer_email: `${TAG}@ps-umzug-test.invalid`,
        customer_phone: "+41 79 000 00 00",
        city: "Thun",
        canton: "BE",
        postcode: "3600",
        service_address: "Teststrasse 1",
        preferred_date: day,
        preferred_time: "08:00",
        campaign: TAG,
        service_details: {
          service: "umzug",
          origin: { street: "Teststrasse 1", postcode: "3600", city: "Thun", floor: "2", lift: false },
          destination: { street: "Bahnhofstrasse 85", postcode: "3613", city: "Steffisburg", floor: "1", lift: true },
          items: [{ key: "sofa", qty: 2 }],
          extras: ["packing"],
        },
      })
      .select("id")
      .single();
    leadId = lead!.id as string;

    const { data: quote } = await db
      .from("quotes_customer")
      .insert({
        lead_id: leadId,
        reference: `UAT-${TAG}`,
        status: "accepted",
        total: 1000,
        currency: "CHF",
        // Accepted before the four-hour policy took effect, so it stays bookable.
        accepted_at: "2026-01-01T00:00:00Z",
      })
      .select("id")
      .single();
    quoteId = quote!.id as string;

    const { data: team } = await db.from("internal_teams").insert({ name: `UAT Crew ${TAG}` }).select("id").single();
    teamId = team!.id as string;
    const { data: team2 } = await db.from("internal_teams").insert({ name: `UAT Crew2 ${TAG}` }).select("id").single();
    otherTeamId = team2!.id as string;

    const { data: emp } = await db
      .from("employees")
      .insert({ full_name: `UAT Crew ${TAG}`, user_id: crew.id })
      .select("id")
      .single();
    const { data: emp2 } = await db
      .from("employees")
      .insert({ full_name: `UAT Crew2 ${TAG}`, user_id: otherCrew.id })
      .select("id")
      .single();
    await db.from("crew_members").insert([
      { team_id: teamId, employee_id: emp!.id },
      { team_id: otherTeamId, employee_id: emp2!.id },
    ]);

    const { data: vehicle } = await db
      .from("vehicles")
      .insert({ plate: `UAT${TAG.slice(-6)}`, label: "Testfahrzeug" })
      .select("id")
      .single();
    vehicleId = vehicle!.id as string;
  }, 60_000);

  afterAll(async () => {
    const db = admin();
    // Invoices raised from the test jobs: always flagged as test data (so they
    // never reach finance lists or KPIs), then removed where the ledger allows.
    const testJobs = [jobId, secondJobId].filter(Boolean) as string[];
    if (testJobs.length) {
      await db.from("jobs_execution").update({ is_test: true }).in("id", testJobs);
      await db.from("invoices").update({ is_test: true }).in("job_id", testJobs);
      await db.from("invoices").delete().in("job_id", testJobs);
    }
    if (jobId) await db.from("jobs_execution").delete().eq("id", jobId);
    if (secondJobId) await db.from("jobs_execution").delete().eq("id", secondJobId);
    await db.from("quotes_customer").delete().eq("id", quoteId);
    await db.from("leads").delete().eq("id", leadId);
    await db.from("crew_members").delete().in("team_id", [teamId, otherTeamId]);
    await db.from("employees").delete().like("full_name", `%${TAG}`);
    await db.from("internal_teams").delete().in("id", [teamId, otherTeamId]);
    await db.from("vehicles").delete().eq("id", vehicleId);
    await cleanupUsers();
  }, 60_000);

  it("only a dispatcher may turn an accepted quotation into a booking", async () => {
    const { error } = await crew.client.rpc("create_booking_from_quote", { _quote_id: quoteId });
    expect(error).not.toBeNull();
  });

  it("carries customer, addresses, inventory, extras and references onto the job", async () => {
    const { data, error } = await dispatcher.client.rpc("create_booking_from_quote", {
      _quote_id: quoteId,
      _scheduled_start: start,
      _scheduled_end: end,
    });
    expect(error).toBeNull();
    const job = data as unknown as Record<string, unknown>;
    jobId = job["id"] as string;
    expect(job["customer_name"]).toContain(TAG);
    expect(job["quote_id"]).toBe(quoteId);
    expect(job["lead_id"]).toBe(leadId);
    expect(JSON.stringify(job["origin"])).toContain("3600");
    expect(JSON.stringify(job["destination"])).toContain("3613");
    expect(JSON.stringify(job["inventory"])).toContain("sofa");
    expect(JSON.stringify(job["extras"])).toContain("packing");
    expect(String(job["reference"])).not.toHaveLength(0);
  });

  it("booking the same quotation twice returns the same job", async () => {
    const { data } = await dispatcher.client.rpc("create_booking_from_quote", { _quote_id: quoteId });
    expect((data as unknown as Record<string, unknown>)["id"]).toBe(jobId);
  });

  it("assigns crew and vehicle and refuses a double booking", async () => {
    const { error } = await dispatcher.client.rpc("assign_job_resources", {
      _job_id: jobId,
      _team_id: teamId,
      _vehicle_id: vehicleId,
      _scheduled_start: start,
      _scheduled_end: end,
    });
    expect(error).toBeNull();

    const db = admin();
    const { data: second } = await db
      .from("jobs_execution")
      .insert({ is_test: true, lead_id: leadId, reference: `UAT-J2-${TAG}`, scheduled_start: start, scheduled_end: end })
      .select("id")
      .single();
    secondJobId = second!.id as string;

    const { error: clash } = await dispatcher.client.rpc("assign_job_resources", {
      _job_id: secondJobId,
      _team_id: teamId,
      _vehicle_id: vehicleId,
      _scheduled_start: start,
      _scheduled_end: end,
    });
    expect(clash).not.toBeNull();
  });

  it("availability lookup is dispatcher-only", async () => {
    const { data } = await dispatcher.client.rpc("resource_busy", { _start: start, _end: end });
    expect((data ?? []).length).toBeGreaterThan(0);
    const { data: crewView, error } = await crew.client.rpc("resource_busy", { _start: start, _end: end });
    expect(error ? true : (crewView ?? []).length === 0).toBe(true);
  });

  it("crew sees only its own assigned job", async () => {
    const { data: mine } = await crew.client.from("jobs_execution").select("id").eq("id", jobId);
    expect((mine ?? []).length).toBe(1);
    const { data: theirs } = await otherCrew.client.from("jobs_execution").select("id").eq("id", jobId);
    expect((theirs ?? []).length).toBe(0);
  });

  it("crew walks the status ladder with server-set timestamps", async () => {
    for (const status of ["en_route", "on_site", "in_progress", "loading", "in_transit", "unloading"]) {
      const { error } = await crew.client.rpc("set_job_status", { _job_id: jobId, _status: status });
      expect([status, error]).toStrictEqual([status, null]);
    }
    const { data } = await admin().from("jobs_execution").select("status, arrived_at, started_at").eq("id", jobId).single();
    expect(data!.status).toBe("unloading");
    expect(data!.arrived_at).not.toBeNull();
    expect(data!.started_at).not.toBeNull();
  });

  it("refuses completion without photos, signature and final note", async () => {
    const { error } = await crew.client.rpc("set_job_status", { _job_id: jobId, _status: "completed" });
    expect(error).not.toBeNull();
  });

  it("completes with evidence, signature and note, and dispatch sees the same state", async () => {
    const db = admin();
    await db.from("job_photos").insert([
      { job_id: jobId, phase: "before", storage_path: `${TAG}/before.jpg` },
      { job_id: jobId, phase: "after", storage_path: `${TAG}/after.jpg` },
    ]);
    const { error: sigError } = await crew.client.rpc("record_job_confirmation", {
      _job_id: jobId,
      _kind: "signature",
      _name: "Testkundin",
      _signature_path: `${TAG}/sig.png`,
    });
    expect(sigError).toBeNull();

    const { error } = await crew.client.rpc("set_job_status", {
      _job_id: jobId,
      _status: "completed",
      _note: "Alles abgeschlossen, keine Schäden.",
    });
    expect(error).toBeNull();

    const { data: seenByDispatch } = await dispatcher.client
      .from("jobs_execution")
      .select("status, completed_at, signed_by_name")
      .eq("id", jobId)
      .single();
    expect(seenByDispatch!.status).toBe("completed");
    expect(seenByDispatch!.completed_at).not.toBeNull();
    expect(seenByDispatch!.signed_by_name).toBe("Testkundin");
  });
});
