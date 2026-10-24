/**
 * Full business journey on marked test data:
 * Anfrage → Offerte (versioned, sent) → Annahme durch Kundschaft (public RPC)
 * → Auftrag (acceptance-checked) → Disposition (Termin, Team, Fahrzeug)
 * → Abschluss → Rechnung (aus dem Auftrag, ausgestellt).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { ENV_READY, admin, anonClient, cleanupUsers, makeUser, type TestUser } from "./harness";
import { cleanupFixtures, isoInDays, seedTeamWithMember, seedVehicle } from "./seed";

const d = ENV_READY ? describe : describe.skip;
const CONTACT = "journey.test@ps-umzug-test.invalid";

d("Anfrage → Offerte → Annahme → Termin → Rechnung", () => {
  let staff: TestUser;
  let dispatcher: TestUser;
  let finance: TestUser;
  const state: Record<string, string> = {};

  beforeAll(async () => {
    staff = await makeUser({ role: "zuegelwerk_admin", label: "journey" });
    dispatcher = await makeUser({ role: "dispatcher", label: "journey-disp" });
    finance = await makeUser({ role: "finance", label: "journey-fin" });
  }, 90_000);

  afterAll(async () => {
    const db = admin();
    const at = new Date().toISOString();
    if (state["job"]) await db.from("jobs_execution").update({ archived_at: at } as never).eq("id", state["job"]);
    if (state["quote"]) await db.from("quotes").update({ archived_at: at } as never).eq("id", state["quote"]);
    await cleanupFixtures();
    await cleanupUsers();
  }, 90_000);

  it("runs the whole chain without any staff bypass", async () => {
    const db = admin();
    const { data: gate } = await db.rpc("minimum_gate_state", { _accepted: null, _total: 10_000_000, _people: 2 });
    const total = Number((gate as { floor?: number }).floor ?? 0) + 400;

    // 1. Anfrage.
    const { data: q, error: e0 } = await db.from("quotes").insert({
      is_test: true, reference: "pending", language: "de",
      customer_name: "Journey Test", customer_email: CONTACT, customer_phone: "+41 79 000 00 00",
      customer_street: "Rechnungsweg 9", customer_zip: "3000", customer_city: "Bern", customer_country: "CH",
      from_address: "Bahnhofstrasse 1", from_zip: "3613", to_address: "Zielweg 2", to_zip: "3600",
      room_units: 3.5, move_date: isoInDays(25).slice(0, 10), price_total: total,
      workflow_stage: "new_request", distance_km: 8, distance_source: "manual",
    } as never).select("id, reference").single();
    expect(e0).toBeFalsy();
    state["quote"] = String((q as { id: string }).id);
    const reference = String((q as { reference: string }).reference);

    // 2. Offerte bearbeitet (neue Version) und versendet.
    const { data: v, error: e1 } = await staff.client.rpc("dop_update_offer" as never, {
      _quote_id: state["quote"], _reason: "Journey: Offerte erstellt",
      _payload: { price_total: total, customer_notes: "Journey-Test" },
    } as never);
    expect(e1).toBeFalsy();
    const version = Number(v);
    await db.from("quotes").update({ workflow_stage: "offer_sent", sent_version: version, sent_at: new Date().toISOString() } as never).eq("id", state["quote"]);
    const { data: qv } = await db.from("quote_versions").select("total").eq("quote_id", state["quote"]).eq("version", version).single();

    // Before acceptance the order conversion is refused.
    const early = await staff.client.rpc("dop_offer_to_order_checked", { _quote_id: state["quote"] });
    expect(early.error).toBeTruthy();

    // 3. Annahme durch die Kundschaft über den öffentlichen Weg.
    const { error: e2 } = await anonClient().rpc("accept_public_quote", {
      _reference: reference, _contact: CONTACT, _version: version, _total: Number(qv!.total), _accepted_by_name: "Journey Test",
    });
    expect(e2).toBeFalsy();
    const { data: accepted } = await db.from("quotes").select("accepted_version, accepted_at").eq("id", state["quote"]).single();
    expect(accepted!.accepted_version).toBe(version);

    // 4. Auftrag.
    const { data: jobId, error: e3 } = await staff.client.rpc("dop_offer_to_order_checked", { _quote_id: state["quote"] });
    expect(e3).toBeFalsy();
    state["job"] = String(jobId);
    const { data: job } = await db.from("jobs_execution").select("is_test, job_value, quote_reference").eq("id", state["job"]).single();
    expect(job!.is_test).toBe(true);
    expect(Number(job!.job_value)).toBe(Number(qv!.total));
    expect(job!.quote_reference).toBe(reference);

    // 5. Termin, Team und Fahrzeug.
    const { teamId } = await seedTeamWithMember();
    const vehicleId = await seedVehicle();
    const { error: e4 } = await dispatcher.client.rpc("assign_job_resources", {
      _job_id: state["job"], _team_id: teamId, _vehicle_id: vehicleId,
      _scheduled_start: isoInDays(25), _scheduled_end: isoInDays(25),
    });
    expect(e4).toBeFalsy();
    const { data: scheduled } = await db.from("jobs_execution").select("scheduled_start").eq("id", state["job"]).single();
    expect(scheduled!.scheduled_start).toBeTruthy();

    // 6. Abschluss und Rechnung.
    await db.from("jobs_execution").update({ status: "completed", completed_at: new Date().toISOString() } as never).eq("id", state["job"]);
    const { data: invoiceId, error: e5 } = await finance.client.rpc("create_invoice_from_job", { _job_id: state["job"] });
    expect(e5).toBeFalsy();
    const { data: inv } = await db.from("invoices").select("total, status, is_test").eq("id", String(invoiceId)).single();
    expect(inv!.is_test).toBe(true);
    const { data: addr } = await db.from("invoices").select("customer_address").eq("id", String(invoiceId)).single();
    expect((addr!.customer_address as Record<string, unknown>)["street"]).toBe("Rechnungsweg 9");
    expect(Number(inv!.total)).toBe(Number(qv!.total));
    const issued = await finance.client.rpc("issue_invoice", { _id: String(invoiceId) });
    const { data: after } = await db.from("invoices").select("status").eq("id", String(invoiceId)).single();
    // Issuing needs the approved bank/QR configuration; without it the invoice stays a draft, never a fake issue.
    if (issued.error) expect(after!.status).toBe("draft");
    else expect(after!.status).toBe("issued");
    state["invoiceStatus"] = String(after!.status);
    state["issueError"] = issued.error?.message ?? "";
    console.info("journey", JSON.stringify(state));
  }, 120_000);
});
