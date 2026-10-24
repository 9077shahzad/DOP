/**
 * A–E data chain: Anfrage → Offerte (edited, new version) → Annahme → Auftrag.
 * Field-by-field comparison of every operational field between the stages,
 * plus the order-document audit entry. All rows carry is_test = true.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { ENV_READY, admin, anonClient, cleanupUsers, makeUser, type TestUser } from "./harness";

const d = ENV_READY ? describe : describe.skip;

type Scenario = { key: string; move: boolean; clean: boolean; disp: boolean };
const SCENARIOS: Scenario[] = [
  { key: "A", move: true, clean: false, disp: false },
  { key: "B", move: false, clean: true, disp: false },
  { key: "C", move: true, clean: true, disp: false },
  { key: "D", move: true, clean: false, disp: true },
  { key: "E", move: true, clean: true, disp: true },
];

function servicesFor(s: Scenario) {
  return {
    move: s.move, clean: s.clean, disp: s.disp, pack: false,
    lines: [{ key: "labour", amount: 1800 }],
    access: { liftOut: "none", liftIn: "small", parkingOut: 1, parkingIn: 2, permitIn: true, hoistIn: true, carryIn: 1, narrowStairsIn: true },
    places: { fromCity: "Steffisburg", fromCanton: "BE", toCity: "Thun", toCanton: "BE" },
    extras: ["lamp_installation", "furniture_assembly"],
    lamp_count: 3,
    cleaning: s.clean ? { propertyType: "flat", roomUnits: 3.5, windowsNormal: 6, windowsLarge: 2, wetRooms: 2, balcony: true, cellar: true } : null,
    disposal: s.disp ? { m3: 4, hours: 3, notes: "Altes Sofa und Matratzen, Keller" } : null,
    clean_date: s.clean ? "2026-11-03" : null,
    discount: { reason: "bundle", rate: 0.05, amount: 90 },
    team_plan: "Team Nord: 3 Personen, 1 LKW",
  };
}

const CONTACT = "chain.test@ps-umzug-test.invalid";

d("A–E Anfrage → Offerte → Auftrag data chain", () => {
  let staff: TestUser;
  const created: { quotes: string[]; jobs: string[]; leads: string[] } = { quotes: [], jobs: [], leads: [] };

  beforeAll(async () => {
    staff = await makeUser({ role: "zuegelwerk_admin", label: "chain" });
  }, 60_000);

  afterAll(async () => {
    // Offers with versions cannot be deleted; test rows are archived instead (is_test keeps them out of lists).
    const db = admin();
    const at = new Date().toISOString();
    for (const id of created.jobs) await db.from("jobs_execution").update({ archived_at: at } as never).eq("id", id);
    for (const id of created.quotes) await db.from("quotes").update({ archived_at: at } as never).eq("id", id);
    await cleanupUsers();
  }, 60_000);

  for (const sc of SCENARIOS) {
    it(`scenario ${sc.key}: every field survives edit, acceptance and conversion`, async () => {
      const db = admin();
      // 1. Anfrage as the wizard stores it.
      const { data: q0, error: e0 } = await db.from("quotes").insert({
        is_test: true, reference: "pending", language: "de",
        customer_name: `Kette ${sc.key}`, customer_email: CONTACT, customer_phone: "+41 79 000 00 00",
        customer_street: "Rechnungsweg 9", customer_zip: "3000", customer_city: "Bern", customer_country: "CH",
        from_address: "Bahnhofstrasse 1", from_zip: "3613", to_address: sc.move ? "Zielweg 2" : "", to_zip: sc.move ? "3600" : "",
        room_units: 3.5, floor_out: 3, floor_in: 1, lift: "none", property_type: "flat", parking: 1, carry: 2,
        narrow_stairs: true, permit: true, hoist: true, items: sc.move ? { sofa: 1, bed_double: 2 } : {},
        move_date: "2026-11-02", services: servicesFor(sc), customer_notes: "Bitte Klingel B",
        price_total: 1710, price_net: 1581.87, price_vat: 128.13, workflow_stage: "new_request",
        distance_km: 8, distance_source: "manual",
      } as never).select("*").single();
      expect(e0).toBeFalsy();
      const quote = q0 as Record<string, unknown>;
      created.quotes.push(String(quote["id"]));

      // 2. Staff edits the whole offer — new version + audited history.
      const edited = { ...servicesFor(sc), disposal: sc.disp ? { m3: 5, hours: 3, notes: "Altes Sofa, Matratzen und Kellerregal" } : null };
      const { data: version, error: e1 } = await staff.client.rpc("dop_update_offer" as never, {
        _quote_id: quote["id"], _reason: `Kette ${sc.key}: Umfang angepasst`,
        _payload: {
          customer_notes: "Bitte Klingel B, Hund im Haus", items: sc.move ? { sofa: 1, bed_double: 2, wardrobe: 1 } : {},
          services: edited, price_total: 1850, price_net: 1711.38, price_vat: 138.62, crew: 3, volume_m3: 22,
          boxes: 30, vans: 1, load_hours: 5, total_hours: 7, access_score: 60, score_label: "mittel",
          price_low: 1700, price_high: 2000, discount_rate: 0.05,
        },
      } as never);
      expect(e1).toBeFalsy();
      const v = Number(version);
      expect(v).toBeGreaterThan(Number(quote["version"] ?? 1));
      const { data: versions } = await db.from("quote_versions").select("version").eq("quote_id", String(quote["id"]));
      expect((versions ?? []).filter((r) => r.version === v).length).toBe(1);
      const { data: ev } = await db.from("workflow_events").select("action, detail").eq("entity_id", String(quote["id"])).eq("action", "offer_edited");
      expect(ev?.length).toBe(1);

      // 3. Sent and accepted exactly in this version.
      await db.from("quotes").update({ workflow_stage: "offer_sent", sent_version: v, sent_at: new Date().toISOString() } as never).eq("id", String(quote["id"]));
      await db.from("quotes").update({ accepted_at: new Date().toISOString(), accepted_version: v, accepted_by_name: `Kette ${sc.key}`, workflow_stage: "offer_accepted" } as never).eq("id", String(quote["id"]));
      const { data: offer } = await db.from("quotes").select("*").eq("id", String(quote["id"])).single();
      const o = offer as Record<string, unknown>;
      expect(o["accepted_version"]).toBe(v);

      // Accepted offers are frozen for editing.
      const frozen = await staff.client.rpc("dop_update_offer" as never, { _quote_id: o["id"], _reason: "x", _payload: {} } as never);
      expect(frozen.error?.message ?? "").toContain("frozen");

      // 4. Auftrag.
      const { data: jobId, error: e2 } = await staff.client.rpc("dop_offer_to_order_checked", { _quote_id: String(o["id"]) });
      expect(e2).toBeFalsy();
      created.jobs.push(String(jobId));
      const { data: job } = await db.from("jobs_execution").select("*").eq("id", String(jobId)).single();
      const j = job as Record<string, unknown>;
      const { data: l } = await db.from("quotes").select("lead_id").eq("id", String(o["id"])).single();
      if (l?.lead_id) created.leads.push(l.lead_id);

      // Field-by-field: Offerte → Auftrag.
      const snap = (j["accepted_snapshot"] ?? {}) as { quote?: Record<string, unknown>; accepted_version?: Record<string, unknown> };
      const sq = snap.quote ?? {};
      for (const k of ["customer_name", "customer_email", "customer_phone", "customer_street", "customer_zip", "customer_city",
        "from_address", "from_zip", "to_address", "to_zip", "room_units", "floor_out", "floor_in", "lift", "property_type",
        "parking", "carry", "narrow_stairs", "permit", "hoist", "move_date", "customer_notes", "price_total", "crew", "version", "accepted_version"]) {
        expect(sq[k], `snapshot ${k}`).toEqual(o[k]);
      }
      expect(sq["items"]).toEqual(o["items"]);
      expect(sq["services"]).toEqual(o["services"]);
      expect(Number(snap.accepted_version?.["version"])).toBe(v);
      expect(Number(snap.accepted_version?.["total"])).toBe(Number(o["price_total"]));

      const svc = o["services"] as ReturnType<typeof servicesFor>;
      // Specific operational facts the business named.
      if (sc.disp) expect(svc.disposal?.notes).toBe("Altes Sofa, Matratzen und Kellerregal");
      if (sc.clean) expect(svc.cleaning?.windowsNormal).toBe(6);
      expect(svc.team_plan).toBe("Team Nord: 3 Personen, 1 LKW");
      expect(svc.discount.amount).toBe(90);
      // Direct columns on the job.
      expect(j["inventory"]).toEqual(o["items"]);
      expect(j["extras"]).toEqual(svc.extras);
      expect(Number(j["job_value"])).toBe(Number(o["price_total"]));
      expect(j["quote_reference"]).toBe(o["reference"]);
      const origin = j["origin"] as Record<string, unknown>;
      expect(origin["hoist"]).toBe(true);
      expect(origin["lift"]).toBe("none");
      expect(origin["floor"]).toBe(3);
      const dest = j["destination"] as Record<string, unknown>;
      expect(dest["hoist"]).toBe(true);
      expect(dest["lift"]).toBe("small");

      // 5. Order-document send audit — logged on the job, never on the offer.
      const log = await staff.client.rpc("dop_log_order_send" as never, { _job_id: jobId, _recipient: CONTACT, _status: "queued", _detail: { template: "order_document" } } as never);
      expect(log.error).toBeFalsy();
      const { data: sent } = await db.from("workflow_events").select("entity, action, detail").eq("entity_id", String(jobId)).eq("action", "order_document_sent");
      expect(sent?.[0]?.entity).toBe("job");
      expect((sent?.[0]?.detail as Record<string, unknown>)["document"]).toBe("order");
      const { data: offerSends } = await db.from("workflow_events").select("id").eq("entity_id", String(o["id"])).eq("action", "sent");
      expect(offerSends?.length ?? 0).toBe(0);
    }, 60_000);
  }

  it("visitors cannot edit offers or log order sends", async () => {
    const anon = anonClient();
    const a = await anon.rpc("dop_update_offer" as never, { _quote_id: "00000000-0000-0000-0000-000000000000", _payload: {}, _reason: "x" } as never);
    expect(a.error).toBeTruthy();
    const b = await anon.rpc("dop_log_order_send" as never, { _job_id: "00000000-0000-0000-0000-000000000000", _recipient: "x", _status: "sent" } as never);
    expect(b.error).toBeTruthy();
  });
});
