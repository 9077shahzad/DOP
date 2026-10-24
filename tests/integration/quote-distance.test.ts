/**
 * Chargeable distance and price-list provenance.
 *
 * The postcode difference is a planning heuristic only. What a customer is
 * billed for must be a routing result or a value confirmed by sales/dispatch,
 * and an offer with an unconfirmed distance can never be sent. A quotation
 * also keeps the price-list version it was created under, so publishing a
 * later version never moves an existing amount.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { ENV_READY, admin, anonClient, cleanupUsers, makeUser, type TestUser } from "./harness";

const d = ENV_READY ? describe : describe.skip;

let staff: TestUser;
let quoteId = "";
let reference = "";
let futureConfig = "";

async function insertQuote() {
  const { data, error } = await admin()
    .from("quotes")
    .insert({ is_test: true,
      reference: "pending",
      language: "de",
      customer_name: "Distanz Test",
      customer_email: "distanz.test@example.invalid",
      from_zip: "3613",
      to_zip: "3600",
      room_units: 3.5,
      price_total: 2400,
    })
    .select("id, reference, distance_source, price_total")
    .single();
  expect(error).toBeFalsy();
  return data!;
}

d("chargeable distance on a quotation", () => {
  beforeAll(async () => {
    staff = await makeUser({ role: "zuegelwerk_admin", label: "distance-staff" });
    const row = await insertQuote();
    quoteId = row.id as string;
    reference = row.reference as string;
  }, 60_000);

  afterAll(async () => {
    await admin().from("quotes").delete().eq("id", quoteId);
    await cleanupUsers([staff]);
  });

  it("a new quotation starts with an unconfirmed distance", async () => {
    const { data } = await admin().from("quotes").select("distance_source").eq("id", quoteId).single();
    expect(data!.distance_source).toBe("unconfirmed");
  });

  it("refuses to send an offer while the distance is unconfirmed", async () => {
    const { error } = await staff.client.rpc("send_quote", { _reference: reference });
    expect(error?.message ?? "").toContain("distance_unconfirmed");
  });

  it("records a manually confirmed distance entered by staff", async () => {
    const { data, error } = await staff.client.rpc("set_quote_distance", {
      _quote_id: quoteId,
      _km: 12.4,
      _source: "manual",
    });
    expect(error).toBeFalsy();
    const row = (Array.isArray(data) ? data[0] : data) as Record<string, unknown>;
    expect(Number(row["distance_km"])).toBe(12.4);
    expect(row["distance_source"]).toBe("manual");
    expect(row["distance_confirmed_at"]).toBeTruthy();
  });

  it("accepts a routing value as the chargeable distance", async () => {
    const { data, error } = await staff.client.rpc("set_quote_distance", {
      _quote_id: quoteId,
      _km: 18.6,
      _source: "routing",
    });
    expect(error).toBeFalsy();
    const row = (Array.isArray(data) ? data[0] : data) as Record<string, unknown>;
    expect(Number(row["distance_km"])).toBe(18.6);
    expect(row["distance_source"]).toBe("routing");
  });

  it("refuses a negative distance and an unknown source", async () => {
    const negative = await staff.client.rpc("set_quote_distance", { _quote_id: quoteId, _km: -1 });
    expect(negative.error).toBeTruthy();
    const bogus = await staff.client.rpc("set_quote_distance", {
      _quote_id: quoteId,
      _km: 10,
      _source: "postcode_guess",
    });
    expect(bogus.error).toBeTruthy();
  });

  it("accepts a confirmed distance above 180 km (no cap)", async () => {
    const { error } = await staff.client.rpc("set_quote_distance", { _quote_id: quoteId, _km: 400 });
    expect(error).toBeFalsy();
    await staff.client.rpc("set_quote_distance", { _quote_id: quoteId, _km: 18.6, _source: "routing" });
  });

  it("sends the offer once the distance is confirmed", async () => {
    const { error } = await staff.client.rpc("send_quote", { _reference: reference });
    expect(error).toBeFalsy();
    const { data } = await admin().from("quotes").select("sent_at").eq("id", quoteId).single();
    expect(data!.sent_at).toBeTruthy();
  });

  it("charges the confirmed kilometres at the published per-km rate", async () => {
    const { data: cfg } = await admin()
      .from("pricing_configurations")
      .select("id")
      .eq("market", "CH")
      .eq("status", "published")
      .order("version", { ascending: false })
      .limit(1)
      .single();
    const { data } = await admin()
      .from("pricing_rules")
      .select("price")
      .eq("configuration_id", cfg!.id)
      .eq("service", "move")
      .eq("unit_type", "per_km")
      .single();
    const perKm = Number(data!.price);
    expect(perKm).toBe(2.2);
    const { data: quote } = await admin().from("quotes").select("distance_km").eq("id", quoteId).single();
    expect(Number(quote!.distance_km) * perKm).toBeCloseTo(18.6 * 2.2, 6);
  });

  it("never exposes the routing adapter to signed-out visitors", async () => {
    const { error } = await anonClient().rpc("resolve_route_distance", {
      _origin: "3613",
      _destination: "3600",
    });
    expect(error).toBeTruthy();
  });

  it("reports external input required while no routing provider is configured", async () => {
    const { data, error } = await staff.client.rpc("resolve_route_distance", {
      _origin: "3613",
      _destination: "3600",
    });
    expect(error).toBeFalsy();
    const r = data as Record<string, unknown>;
    expect(r["status"]).toBe("external_input_required");
    expect(r["km"]).toBeNull();
  });
});

d("price-list provenance", () => {
  let stamped: { id: string; version: string | null; total: number } | null = null;

  afterAll(async () => {
    if (stamped) await admin().from("quotes_customer").delete().eq("id", stamped.id);
  });

  it("stamps a new customer quotation with the active published price list", async () => {
    const { data, error } = await admin()
      .from("quotes_customer")
      .insert({ labour: 1000, transport: 200, total: 1298.8, language: "de" })
      .select("id, price_list_version_id, total")
      .single();
    expect(error).toBeFalsy();
    stamped = {
      id: data!.id as string,
      version: (data!.price_list_version_id as string | null) ?? null,
      total: Number(data!.total),
    };
    // The stamp must name the list actually IN FORCE today, whichever version
    // that is — a fixed version number would go stale on every publication.
    const { data: active } = await admin().rpc("active_pricing_configuration", { _market: "CH" });
    expect(active).toBeTruthy();
    expect(stamped.version).toBe(active as unknown as string);
  });

  /**
   * A published price list is immutable, so the future fixture version cannot
   * be deleted afterwards: it is created once, dated 2099 so it never becomes
   * the active list, and reused by every later run.
   */
  it("publishing a later version leaves an existing quotation untouched", async () => {
    const existing = await admin()
      .from("pricing_configurations")
      .select("id")
      .eq("market", "CH")
      .eq("version", 999)
      .maybeSingle();
    if (existing.data) {
      futureConfig = existing.data.id as string;
    } else {
      const { data: cfg, error } = await admin()
        .from("pricing_configurations")
        .insert({
          market: "CH",
          name: "UAT Regressionsfixture — nicht verwenden",
          version: 999,
          status: "draft",
          effective_from: "2099-01-01",
          notes: "Regression fixture: a future version must never alter an existing quotation.",
        })
        .select("id")
        .single();
      expect(error).toBeFalsy();
      futureConfig = cfg!.id as string;
      await admin().from("pricing_rules").insert({
        configuration_id: futureConfig,
        service: "move",
        property_type: "any",
        band_id: "",
        unit_type: "per_km",
        price: 9.9,
        currency: "CHF",
      });
      await admin().from("pricing_configurations").update({ status: "published" }).eq("id", futureConfig);
    }

    const { data: after } = await admin()
      .from("quotes_customer")
      .select("price_list_version_id, total")
      .eq("id", stamped!.id)
      .single();
    expect(after!.price_list_version_id).toBe(stamped!.version);
    expect(Number(after!.total)).toBe(stamped!.total);
  });
});
