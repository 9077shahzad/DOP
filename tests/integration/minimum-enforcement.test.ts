/**
 * Four-hour minimum — mandatory enforcement, no approval path.
 *
 * The rule lives on an approved, active company policy record, not on a price
 * list. A new commitment passes only when an approved hourly calculation basis
 * exists AND the price demonstrably covers the minimum after discounts.
 * A staff note is audit evidence only and never releases an offer. Only offers
 * ACCEPTED before the policy took effect keep their agreed terms.
 *
 * The active policy bills on a TEAM basis, so the floor is
 * `min_hours × approved team rate`, independent of head count. A supplied rate
 * is only honoured when the price list in force actually carries it.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { ENV_READY, admin } from "./harness";

const d = ENV_READY ? describe : describe.skip;

const CONTACT = "minimum.enforcement@example.com";

/** Anything accepted before this instant keeps its agreed terms. */
const BEFORE_POLICY = "2026-09-11T00:00:00Z";

d("company-wide four-hour minimum", () => {
  let policy: { min_hours: number; basis: string; status: string } | null = null;
  /** min_hours × approved team rate, read from the live configuration. */
  let floor = 0;
  let teamRate = 0;
  let belowId = "";
  let notedId = "";
  let legacyId = "";
  let staleDraftId = "";
  let aboveId = "";
  const references: string[] = [];

  async function makeQuote(total: number) {
    const { data, error } = await admin()
      .from("quotes")
      .insert({ is_test: true,
        reference: "pending",
        language: "de",
        customer_name: "Minimum Test",
        customer_email: CONTACT,
        from_address: "Teststrasse 1",
        from_zip: "3613",
        to_address: "Zielweg 2",
        to_zip: "3600",
        room_units: 3.5,
        price_total: total,
      })
      .select("id, reference")
      .single();
    expect(error).toBeFalsy();
    references.push(data!.reference);
    return data!.id as string;
  }

  async function latestVersion(quoteId: string) {
    const { data } = await admin()
      .from("quote_versions")
      .select("version, total")
      .eq("quote_id", quoteId)
      .order("version", { ascending: false })
      .limit(1)
      .single();
    return data!;
  }

  beforeAll(async () => {
    const { data } = await admin()
      .from("minimum_billing_policy")
      .select("min_hours, basis, status")
      .eq("status", "active")
      .maybeSingle();
    policy = data as typeof policy;

    // The floor comes from the live gate, never from a number copied into a test.
    const { data: state } = await admin().rpc("minimum_gate_state", {
      _accepted: null,
      _total: 10_000_000,
      _people: 2,
    });
    const gate = state as { floor?: number; rate?: number };
    floor = Number(gate.floor ?? 0);
    teamRate = Number(gate.rate ?? 0);

    belowId = await makeQuote(Math.max(1, floor - 100));
    notedId = await makeQuote(Math.max(1, floor - 100));
    legacyId = await makeQuote(Math.max(1, floor - 100));
    staleDraftId = await makeQuote(Math.max(1, floor - 100));
    aboveId = await makeQuote(floor + 250);

    // Audit note only — it must not open any door.
    await admin()
      .from("quotes")
      .update({
        min_hours_attested_at: new Date().toISOString(),
        min_hours_note: "Pauschale deckt 4 Teamstunden (Testnachweis).",
        min_hours_people: 2,
      })
      .eq("id", notedId);

    // An offer ACCEPTED before the policy took effect keeps its agreed terms.
    const { data: legacy } = await admin()
      .from("quotes")
      .update({ accepted_at: BEFORE_POLICY })
      .eq("id", legacyId)
      .select("reference")
      .single();
    references[2] = legacy!.reference;

    // An old draft that was never accepted gets no exemption from its age.
    const { data: oldDraft } = await admin()
      .from("quotes")
      .update({ created_at: BEFORE_POLICY })
      .eq("id", staleDraftId)
      .select("reference")
      .single();
    references[3] = oldDraft!.reference;
  }, 60_000);

  afterAll(async () => {
    await admin().from("quotes").delete().eq("customer_email", CONTACT);
  });

  it("enforces the minimum from an active approved company policy, not from a price list", () => {
    expect(policy).toBeTruthy();
    expect(Number(policy!.min_hours)).toBe(4);
    expect(policy!.basis).toBe("team");
    expect(policy!.status).toBe("active");
  });

  it("derives the floor from the approved team tariff in force", () => {
    expect(teamRate).toBeGreaterThan(0);
    expect(floor).toBeCloseTo(Number(policy!.min_hours) * teamRate, 2);
  });

  it("refuses a total below the floor and accepts one above it", async () => {
    const { data: low } = await admin().rpc("minimum_gate_state", {
      _accepted: null,
      _total: floor - 0.05,
      _people: 2,
    });
    expect((low as { ok: boolean }).ok).toBe(false);
    expect((low as { reason: string }).reason).toBe("below_minimum");

    const { data: high } = await admin().rpc("minimum_gate_state", {
      _accepted: null,
      _total: floor,
      _people: 2,
    });
    expect((high as { ok: boolean }).ok).toBe(true);
  });

  it("does not multiply the team floor by head count", async () => {
    const { data: two } = await admin().rpc("minimum_gate_state", {
      _accepted: null,
      _total: floor,
      _people: 2,
    });
    const { data: five } = await admin().rpc("minimum_gate_state", {
      _accepted: null,
      _total: floor,
      _people: 5,
    });
    expect((two as { floor: number }).floor).toBe((five as { floor: number }).floor);
  });

  it("blocks acceptance of a new offer that stays under the minimum", async () => {
    const version = await latestVersion(belowId);
    const { error } = await admin().rpc("accept_public_quote", {
      _reference: references[0],
      _contact: CONTACT,
      _version: version.version,
      _total: version.total,
    });
    expect(error?.message ?? "").toContain("minimum_hours_unverified");
  });

  it("still blocks acceptance when a staff note is recorded", async () => {
    const version = await latestVersion(notedId);
    const { error } = await admin().rpc("accept_public_quote", {
      _reference: references[1],
      _contact: CONTACT,
      _version: version.version,
      _total: version.total,
    });
    expect(error?.message ?? "").toContain("minimum_hours_unverified");
  });

  it("keeps the staff note as audit evidence without granting an exemption", async () => {
    const { data } = await admin()
      .from("quotes")
      .select("min_hours_note, min_hours_attested_at, accepted_at")
      .eq("id", notedId)
      .single();
    expect(data!.min_hours_note).toContain("4 Teamstunden");
    expect(data!.min_hours_attested_at).toBeTruthy();
    expect(data!.accepted_at).toBeNull();
  });

  it("accepts a new offer that demonstrably covers the minimum", async () => {
    const version = await latestVersion(aboveId);
    const { error } = await admin().rpc("accept_public_quote", {
      _reference: references[4],
      _contact: CONTACT,
      _version: version.version,
      _total: version.total,
    });
    expect(error).toBeFalsy();
  });

  it("leaves an offer accepted before the policy untouched", async () => {
    const version = await latestVersion(legacyId);
    const { error } = await admin().rpc("accept_public_quote", {
      _reference: references[2],
      _contact: CONTACT,
      _version: version.version,
      _total: version.total,
    });
    expect(error).toBeFalsy();
    const { data } = await admin().from("quotes").select("accepted_at").eq("id", legacyId).single();
    expect(data!.accepted_at).toBeTruthy();
  });

  it("still blocks an old draft that was never accepted before the policy", async () => {
    const version = await latestVersion(staleDraftId);
    // Its age gives no exemption: the minimum gate refuses its total on its own.
    const { data: gate } = await admin().rpc("minimum_gate_state", {
      _accepted: null,
      _total: version.total,
      _people: 2,
    });
    expect((gate as { ok: boolean }).ok).toBe(false);
    // Once the policy date is older than the 30-day offer validity, the portal
    // no longer finds the draft at all — also a refusal, never an acceptance.
    const { error } = await admin().rpc("accept_public_quote", {
      _reference: references[3],
      _contact: CONTACT,
      _version: version.version,
      _total: version.total,
    });
    expect(error?.message ?? "").toMatch(/minimum_hours_unverified|quote_not_found/);
    const { data } = await admin().from("quotes").select("accepted_at").eq("id", staleDraftId).single();
    expect(data!.accepted_at).toBeNull();
  });

  it("refuses a calculation basis the price list in force does not carry", async () => {
    const { data } = await admin().rpc("minimum_gate_state", {
      _accepted: null,
      _total: 10_000_000,
      _people: 2,
      _rate: 7.77,
    });
    expect((data as { ok: boolean }).ok).toBe(false);
    expect((data as { reason: string }).reason).toBe("unapproved_rate_basis");
  });

  it("honours an approved tariff supplied as the calculation basis", async () => {
    const { data } = await admin().rpc("minimum_gate_state", {
      _accepted: null,
      _total: 4 * teamRate,
      _people: 2,
      _rate: teamRate,
    });
    expect((data as { ok: boolean }).ok).toBe(true);
    expect((data as { rate: number }).rate).toBeCloseTo(teamRate, 2);
  });

  it("refuses to release a customer offer, with or without a staff note", async () => {
    const { data: lead } = await admin()
      .from("leads")
      .insert({ is_test: true, customer_name: "Minimum Test", customer_email: CONTACT, language: "de" })
      .select("id")
      .single();
    const { data: quote } = await admin()
      .from("quotes_customer")
      .insert({ lead_id: lead!.id, total: floor - 100, vat: 0, language: "de" })
      .select("id")
      .single();

    const blocked = await admin()
      .from("quotes_customer")
      .update({ status: "sent" })
      .eq("id", quote!.id);
    expect(blocked.error?.message ?? "").toContain("minimum_hours_unverified");

    await admin()
      .from("quotes_customer")
      .update({
        min_hours_attested_at: new Date().toISOString(),
        min_hours_note: "Pauschale deckt 4 Teamstunden (Testnachweis).",
        min_hours_people: 2,
      })
      .eq("id", quote!.id);
    const stillBlocked = await admin()
      .from("quotes_customer")
      .update({ status: "sent" })
      .eq("id", quote!.id);
    expect(stillBlocked.error?.message ?? "").toContain("minimum_hours_unverified");

    // Above the floor the same offer is released.
    await admin().from("quotes_customer").update({ total: floor + 100 }).eq("id", quote!.id);
    const released = await admin()
      .from("quotes_customer")
      .update({ status: "sent" })
      .eq("id", quote!.id);
    expect(released.error).toBeFalsy();

    await admin().from("quotes_customer").delete().eq("id", quote!.id);
    await admin().from("leads").delete().eq("id", lead!.id);
  });

  it("refuses to create a job from an offer that cannot show the minimum", async () => {
    const { data: lead } = await admin()
      .from("leads")
      .insert({ is_test: true, customer_name: "Minimum Job", customer_email: CONTACT, language: "de" })
      .select("id")
      .single();
    const { data: quote } = await admin()
      .from("quotes_customer")
      .insert({
        lead_id: lead!.id,
        total: floor - 100,
        vat: 0,
        language: "de",
        min_hours_attested_at: new Date().toISOString(),
        min_hours_note: "Pauschale deckt 4 Teamstunden (Testnachweis).",
        min_hours_people: 2,
      })
      .select("id")
      .single();

    const { error } = await admin()
      .from("jobs_execution")
      .insert({ is_test: true, lead_id: lead!.id, quote_id: quote!.id, status: "scheduled" });
    expect(error?.message ?? "").toContain("minimum_hours_unverified");

    await admin().from("quotes_customer").delete().eq("id", quote!.id);
    await admin().from("leads").delete().eq("id", lead!.id);
  });
});
