/**
 * The quote reference is a capability identifier, so the public lookup is
 * minimised by design rather than protected by entropy alone: it may reveal
 * what the offer page renders and nothing else.
 *
 * Also pins the single runtime pricing source: `published_pricing` is
 * signed-in only, exposes published rules of an active market only, and never
 * drafts, archived versions or internal review metadata.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { ENV_READY, admin, anonClient, cleanupUsers, makeUser, type TestUser } from "./harness";

const d = ENV_READY ? describe : describe.skip;

/** Assigned by the database trigger on insert. */
let REFERENCE = "";

/** Fields the offer page never needs and the reference must never reveal. */
const FORBIDDEN = [
  "customer_name",
  "customer_company",
  "customer_phone",
  "customer_email",
  "from_address",
  "to_address",
  "id",
  "lead_id",
  "assigned_to",
  "internal_notes",
  "partner_id",
  "cost",
  "margin",
];

let anon: ReturnType<typeof anonClient>;
let customer: TestUser;

d("public quote lookup", () => {
  beforeAll(async () => {
    anon = anonClient();
    customer = await makeUser("owner");
    const { data: inserted, error } = await admin()
      .from("quotes")
      .insert({ is_test: true,
        reference: "pending", // replaced by the database trigger
        language: "de",
        customer_name: "Test Person",
        customer_email: "test.person@example.com",
        customer_phone: "+41 79 000 00 00",
        from_address: "Teststrasse 1",
        from_zip: "8001",
        to_address: "Zielweg 2",
        to_zip: "8400",
        room_units: 3.5,
        price_total: 2400,
      })
      .select("reference")
      .single();
    expect(error).toBeFalsy();
    REFERENCE = inserted!.reference;
  }, 60_000);

  afterAll(async () => {
    await admin().from("quotes").delete().eq("reference", REFERENCE);
    await cleanupUsers([customer]);
  });

  it("returns the offer to the customer who presents the matching e-mail", async () => {
    const { data, error } = await anon.rpc("get_public_quote", {
      _reference: REFERENCE,
      _contact: "Test.Person@example.com",
    });
    expect(error).toBeFalsy();
    expect(Array.isArray(data) ? data.length : 0).toBe(1);
  });

  it("accepts the phone number the offer was requested with", async () => {
    const { data } = await anon.rpc("get_public_quote", {
      _reference: REFERENCE,
      _contact: "079 000 00 00",
    });
    expect(Array.isArray(data) ? data.length : 0).toBe(1);
  });

  it("reveals nothing to someone holding the reference alone", async () => {
    for (const contact of ["", "   ", "someone.else@example.com", "+41 79 111 11 11"]) {
      const { data } = await anon.rpc("get_public_quote", {
        _reference: REFERENCE,
        _contact: contact,
      });
      expect(Array.isArray(data) ? data.length : 0, `${contact} unlocked the offer`).toBe(0);
    }
  });

  it("returns no personal or internal field", async () => {
    const { data } = await anon.rpc("get_public_quote", {
      _reference: REFERENCE,
      _contact: "test.person@example.com",
    });
    const row = (Array.isArray(data) ? data[0] : data) as Record<string, unknown>;
    for (const field of FORBIDDEN) {
      expect(Object.keys(row), `${field} is exposed by the reference`).not.toContain(field);
    }
    expect(JSON.stringify(row)).not.toContain("test.person@example.com");
    expect(JSON.stringify(row)).not.toContain("Teststrasse");
  });

  it("reveals nothing for a guessed or unknown reference", async () => {
    for (const guess of ["MF-TEST", "%", "MF-TEST-%", "unknown"]) {
      const { data } = await anon.rpc("get_public_quote", {
        _reference: guess,
        _contact: "test.person@example.com",
      });
      expect(Array.isArray(data) ? data.length : 0).toBe(0);
    }
  });

  it("no longer exposes the whole quote row through the old lookup", async () => {
    const { error } = await anon.rpc(
      "get_quote_by_reference" as never,
      { _reference: REFERENCE } as never,
    );
    expect(error).toBeTruthy();
  });

  it("keeps the quotes table itself unreadable without staff rights", async () => {
    const { error } = await anon.from("quotes").select("customer_email").limit(1);
    expect(error).toBeTruthy();
  });
});

d("published pricing reader", () => {
  let user: TestUser;
  let guest: ReturnType<typeof anonClient>;

  beforeAll(async () => {
    guest = anonClient();
    user = await makeUser("owner");
  }, 60_000);

  afterAll(async () => {
    await cleanupUsers([user]);
  });

  it("is not callable signed out", async () => {
    const { error } = await guest.rpc("published_pricing", { _market: "CH" });
    expect(error).toBeTruthy();
  });

  it("gives a signed-in portal user the published prices", async () => {
    const { data, error } = await user.client.rpc("published_pricing", { _market: "CH" });
    expect(error).toBeFalsy();
    expect((data ?? []).length).toBeGreaterThan(0);
  });

  it("returns exactly one published version and no internal metadata", async () => {
    const { data } = await user.client.rpc("published_pricing", { _market: "CH" });
    const rows = data ?? [];
    expect(new Set(rows.map((row) => row.version)).size).toBe(1);
    const keys = Object.keys(rows[0] as Record<string, unknown>);
    for (const internal of ["requires_commercial_review", "status", "notes", "created_by", "cost"]) {
      expect(keys, `${internal} leaks to the portal`).not.toContain(internal);
    }
  });

  it("returns nothing for an inactive market", async () => {
    const { data } = await user.client.rpc("published_pricing", { _market: "DE" });
    expect((data ?? []).length).toBe(0);
  });

  it("keeps configurations and rules themselves invisible to portal users", async () => {
    const { data: configs } = await user.client.from("pricing_configurations").select("id").limit(1);
    expect(configs ?? []).toHaveLength(0);
    const { data: rules } = await user.client.from("pricing_rules").select("id").limit(1);
    expect(rules ?? []).toHaveLength(0);
  });
});

d("public projection keeps internal cost rates out", () => {
  let guest: ReturnType<typeof anonClient>;

  beforeAll(() => {
    guest = anonClient();
  });

  it("never projects a cost rate to the estimator", async () => {
    const { data, error } = await guest.rpc("public_planner_pricing", { _market: "CH" });
    expect(error).toBeFalsy();
    const rows = (data ?? []) as { service: string; unit_type: string }[];
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.map((row) => row.service)).not.toContain("cost");
  });

  it("exposes only the minimum-duration policy, never a tariff or a cost", async () => {
    const { data, error } = await guest.rpc("public_minimum_billing", { _market: "CH" });
    expect(error).toBeFalsy();
    const rows = (data ?? []) as Record<string, unknown>[];
    // The published list in force carries no minimum yet; the draft must not leak.
    for (const row of rows) {
      expect(Object.keys(row).sort()).toEqual(
        ["effective_from", "min_hours", "min_hours_basis", "version"].sort(),
      );
      expect(["person", "team"]).toContain(row["min_hours_basis"]);
    }
  });
});
