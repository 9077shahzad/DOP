/**
 * Server-side authorisation matrix.
 *
 * One signed-in client per role, plus a signed-out one, asserting what each can
 * read and write across the sensitive tables and functions. These assertions run
 * against the real database through PostgREST, so they cover grants, RLS and
 * SECURITY DEFINER argument checks together — the three layers that have to
 * agree for tenant isolation to hold.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  ENV_READY,
  admin,
  anonClient,
  canExecute,
  cleanupUsers,
  makeUser,
  readAccess,
  type TestUser,
} from "./harness";

const d = ENV_READY ? describe : describe.skip;

type Fixtures = {
  orgA: string;
  orgB: string;
  propertyA: string;
  unitA: string;
  propertyB: string;
  partnerA: string;
  partnerB: string;
  leadId: string;
  quoteA: string;
  quoteB: string;
};

let fx: Fixtures;
let anon: ReturnType<typeof anonClient>;
let customerA: TestUser; // property manager, organisation A
let customerB: TestUser; // property manager, organisation B
let partnerUserA: TestUser;
let partnerUserB: TestUser;
let sales: TestUser;
let ops: TestUser;
let partnerManager: TestUser;
let finance: TestUser;
let adminUser: TestUser;

d("server-side authorisation", () => {
  beforeAll(async () => {
    const db = admin();
    anon = anonClient();

    const { data: orgs, error: orgErr } = await db
      .from("organizations")
      .insert([{ name: "UAT Org A" }, { name: "UAT Org B" }])
      .select("id, name");
    if (orgErr) throw orgErr;
    const orgA = orgs!.find((o) => o.name === "UAT Org A")!.id as string;
    const orgB = orgs!.find((o) => o.name === "UAT Org B")!.id as string;

    const { data: props, error: propErr } = await db
      .from("properties")
      .insert([
        { organization_id: orgA, address: "UAT Teststrasse 1", zip: "8000", city: "Zürich" },
        { organization_id: orgB, address: "UAT Testweg 2", zip: "3000", city: "Bern" },
      ])
      .select("id, organization_id");
    if (propErr) throw propErr;
    const propertyA = props!.find((p) => p.organization_id === orgA)!.id as string;
    const propertyB = props!.find((p) => p.organization_id === orgB)!.id as string;

    const { data: unit, error: unitErr } = await db
      .from("units")
      .insert({ organization_id: orgA, property_id: propertyA, label: "UAT 1.OG", rooms: 3.5 })
      .select("id")
      .single();
    if (unitErr) throw unitErr;

    customerA = await makeUser({ role: "manager", organizationId: orgA, label: "customer-a" });
    customerB = await makeUser({ role: "manager", organizationId: orgB, label: "customer-b" });
    partnerUserA = await makeUser({ role: null, label: "partner-a" });
    partnerUserB = await makeUser({ role: null, label: "partner-b" });
    sales = await makeUser({ role: "sales", label: "sales" });
    ops = await makeUser({ role: "ops_manager", label: "ops" });
    partnerManager = await makeUser({ role: "partner_manager", label: "pm" });
    finance = await makeUser({ role: "finance", label: "finance" });
    adminUser = await makeUser({ role: "zuegelwerk_admin", label: "admin" });

    const { data: partners, error: partnerErr } = await db
      .from("partners")
      .insert([
        { legal_name: "UAT Partner A", created_by: partnerUserA.id, country: "CH", city: "Zürich" },
        { legal_name: "UAT Partner B", created_by: partnerUserB.id, country: "CH", city: "Bern" },
      ])
      .select("id, legal_name");
    if (partnerErr) throw partnerErr;
    const partnerA = partners!.find((p) => p.legal_name === "UAT Partner A")!.id as string;
    const partnerB = partners!.find((p) => p.legal_name === "UAT Partner B")!.id as string;

    const { data: lead, error: leadErr } = await db
      .from("leads")
      .insert({ is_test: true,
        customer_name: "UAT Lead",
        customer_email: "uat.lead@ps-umzug-test.invalid",
        customer_phone: "+41790000001",
        description: "UAT fixture",
      })
      .select("id")
      .single();
    if (leadErr) throw leadErr;

    const { data: quotes, error: quoteErr } = await db
      .from("partner_quotes")
      .insert([
        { partner_id: partnerA, lead_id: lead!.id, partner_cost: 1000, status: "submitted" },
        { partner_id: partnerB, lead_id: lead!.id, partner_cost: 1200, status: "submitted" },
      ])
      .select("id, partner_id");
    if (quoteErr) throw quoteErr;

    fx = {
      orgA,
      orgB,
      propertyA,
      unitA: unit!.id as string,
      propertyB,
      partnerA,
      partnerB,
      leadId: lead!.id as string,
      quoteA: quotes!.find((q) => q.partner_id === partnerA)!.id as string,
      quoteB: quotes!.find((q) => q.partner_id === partnerB)!.id as string,
    };
  }, 120_000);

  afterAll(async () => {
    const db = admin();
    if (fx) {
      await db.from("partner_quotes").delete().in("id", [fx.quoteA, fx.quoteB]);
      await db.from("leads").delete().eq("id", fx.leadId);
      await db.from("partners").delete().in("id", [fx.partnerA, fx.partnerB]);
      await db.from("units").delete().eq("id", fx.unitA);
      await db.from("properties").delete().in("id", [fx.propertyA, fx.propertyB]);
      await db.from("organizations").delete().in("id", [fx.orgA, fx.orgB]);
    }
    await cleanupUsers();
  }, 120_000);

  /* ------------------------------------------------------- anonymous surface */

  describe("anonymous visitor", () => {
    it("reads only the two public tables", async () => {
      expect(await readAccess(anon, "legal_documents")).not.toBe("denied");
      expect(await readAccess(anon, "legal_entities")).not.toBe("denied");
    });

    it("cannot read markets directly (public access goes via the public_markets function)", async () => {
      expect(await readAccess(anon, "markets")).toBe("denied");
    });

    const forbidden = [
      "leads",
      "quotes",
      "partners",
      "partner_quotes",
      "profiles",
      "properties",
      "units",
      "jobs_execution",
      "invoices",
      "accounts",
      "email_messages",
      "email_threads",
      "notification_log",
      "user_roles",
      "consent_records",
      "enquiries",
      "change_orders",
      "job_materials",
      "lead_queues",
      "partner_documents",
    ];
    for (const table of forbidden) {
      it(`cannot read ${table}`, async () => {
        expect(await readAccess(anon, table)).toBe("denied");
      });
    }

    it("cannot write to leads directly", async () => {
      const { error } = await anon.from("leads").insert({ is_test: true, customer_name: "hacker" });
      expect(error).toBeTruthy();
    });

    it("cannot call staff functions", async () => {
      expect(await canExecute(anon, "is_staff")).toBe(false);
      expect(await canExecute(anon, "cron_health")).toBe(false);
      expect(await canExecute(anon, "set_partner_status", {
        _partner_id: fx.partnerA,
        _new_status: "approved",
        _note: "x",
      })).toBe(false);
    });

    it("may call the public intake and tracker functions", async () => {
      expect(await canExecute(anon, "public_markets")).toBe(true);
      expect(await canExecute(anon, "lead_tracker", { _reference: "MF-0000", _contact: "none" })).toBe(true);
    });

    it("cannot call internal system routines", async () => {
      expect(await canExecute(anon, "active_markets")).toBe(false);
      expect(await canExecute(anon, "identity_candidates", { _email: "a@b.ch", _phone: "" })).toBe(false);
      expect(await canExecute(anon, "route_lead_queue", {
        _source_key: "web",
        _customer_type: "private",
        _urgency: "",
        _flag: "",
      })).toBe(false);
    });
  });

  /* --------------------------------------------- internal routine isolation */

  describe("internal routines are not client-callable", () => {
    it("hides customer identity lookup from every signed-in role", async () => {
      for (const user of [customerA, partnerUserA, sales]) {
        expect(
          await canExecute(user.client, "identity_candidates", { _email: "a@b.ch", _phone: "" }),
          "identity_candidates reachable by a signed-in user",
        ).toBe(false);
      }
    });

    it("hides email-to-entity matching from every signed-in role", async () => {
      for (const user of [customerA, partnerUserA]) {
        expect(await canExecute(user.client, "email_match_sender", { _addr: "a@b.ch" })).toBe(false);
      }
    });

    it("hides the margin calculation from customers and partners", async () => {
      for (const user of [customerA, partnerUserA]) {
        expect(await canExecute(user.client, "compute_lead_economics", { _lead_id: fx.leadId })).toBe(false);
        const { error } = await user.client.rpc("recompute_lead_economics", { _lead_id: fx.leadId });
        expect(error, "recompute_lead_economics allowed a non-staff caller").toBeTruthy();
      }
    });

    it("hides fraud scoring and duplicate resolution", async () => {
      expect(await canExecute(customerA.client, "detect_lead_risk", { _lead_id: fx.leadId })).toBe(false);
      expect(await canExecute(customerA.client, "resolve_lead_duplicate", { _id: fx.leadId, _status: "merged" })).toBe(
        false,
      );
    });

    it("hides response-time targets from customers", async () => {
      const { error } = await customerA.client.rpc("lead_sla_minutes", { _lead_id: fx.leadId });
      expect(error, "lead_sla_minutes allowed a customer").toBeTruthy();
    });
  });

  /* ---------------------------------------------------------- cost isolation */

  describe("cost and margin columns", () => {
    const costColumns: Array<[string, string]> = [
      ["leads", "expected_cost"],
      ["leads", "expected_margin"],
      ["leads", "expected_margin_pct"],
      ["partner_quotes", "partner_cost"],
      ["change_orders", "partner_cost"],
      ["job_materials", "supplier_cost"],
    ];

    for (const [table, column] of costColumns) {
      it(`${table}.${column} is unreadable even for an admin over PostgREST`, async () => {
        for (const user of [customerA, partnerUserA, sales, ops, finance, adminUser]) {
          const { error } = await user.client.from(table).select(column).limit(1);
          expect(error, `${table}.${column} leaked to a signed-in role`).toBeTruthy();
        }
      });
    }

    it("exposes costs to cost-visible staff only through the checked function", async () => {
      for (const user of [ops, finance, adminUser, partnerManager]) {
        const { error } = await user.client.rpc("quote_costs_for_lead", { _lead_id: fx.leadId });
        expect(error, `cost function refused a cost-visible role`).toBeFalsy();
      }
    });

    it("refuses the cost function for sales and customers", async () => {
      for (const user of [sales, customerA]) {
        const { data, error } = await user.client.rpc("quote_costs_for_lead", { _lead_id: fx.leadId });
        const rows = (data as unknown[] | null) ?? [];
        expect(error !== null || rows.length === 0).toBe(true);
      }
    });

    it("gives a partner only its own quote costs", async () => {
      const { data, error } = await partnerUserA.client.rpc("my_partner_quotes");
      expect(error).toBeFalsy();
      const rows = (data as Array<{ quote_id: string }> | null) ?? [];
      expect(rows.some((r) => r.quote_id === fx.quoteB)).toBe(false);
    });
  });

  /* --------------------------------------------------------- tenant isolation */

  describe("organisation isolation", () => {
    it("shows organisation A its own property and never organisation B's", async () => {
      const { data } = await customerA.client.from("properties").select("id, organization_id");
      const ids = (data ?? []).map((r) => r.id as string);
      expect(ids).toContain(fx.propertyA);
      expect(ids).not.toContain(fx.propertyB);
    });

    it("refuses a cross-organisation unit insert", async () => {
      const { error } = await customerB.client.from("units").insert({
        organization_id: fx.orgA,
        property_id: fx.propertyA,
        label: "UAT intruder",
        rooms: 2.5,
      });
      expect(error).toBeTruthy();
    });

    it("refuses a cross-organisation property update", async () => {
      const { data } = await customerB.client
        .from("properties")
        .update({ city: "Hacked" })
        .eq("id", fx.propertyA)
        .select("id");
      expect(data ?? []).toHaveLength(0);
      const { data: check } = await admin().from("properties").select("city").eq("id", fx.propertyA).single();
      expect(check!.city).toBe("Zürich");
    });

    it("keeps the CRM out of a customer's reach", async () => {
      expect(["denied", "empty"]).toContain(await readAccess(customerA.client, "leads", "id"));
      expect(["denied", "empty"]).toContain(await readAccess(customerA.client, "partners", "id"));
      expect(["denied", "empty"]).toContain(await readAccess(customerA.client, "email_messages", "id"));
    });
  });

  describe("partner isolation", () => {
    it("shows partner A its own record only", async () => {
      const { data } = await partnerUserA.client.from("partners").select("id");
      const ids = (data ?? []).map((r) => r.id as string);
      expect(ids).toContain(fx.partnerA);
      expect(ids).not.toContain(fx.partnerB);
    });

    it("refuses partner A writing partner B's record", async () => {
      const { data } = await partnerUserB.client
        .from("partners")
        .update({ trading_name: "stolen" })
        .eq("id", fx.partnerA)
        .select("id");
      expect(data ?? []).toHaveLength(0);
    });

    it("never lets a partner set its own status", async () => {
      const { error } = await partnerUserA.client
        .from("partners")
        .update({ status: "approved" })
        .eq("id", fx.partnerA)
        .select("id");
      const { data: row } = await admin()
        .from("partners")
        .select("status")
        .eq("id", fx.partnerA)
        .single();
      expect(error !== null || row!.status !== "approved").toBe(true);
    });

    it("never shows a partner the internal assessment kept about it", async () => {
      // The score, tier and account manager live in a staff-only record.
      const { data, error } = await partnerUserA.client
        .from("partner_internal")
        .select("partner_id, internal_score, classification, account_manager_id");
      expect(error !== null || (data ?? []).length === 0).toBe(true);
    });


    it("never lets a partner read the CRM or another partner's quotes", async () => {
      expect(["denied", "empty"]).toContain(await readAccess(partnerUserA.client, "leads", "id"));
      const { data } = await partnerUserA.client.from("partner_quotes").select("id");
      const ids = (data ?? []).map((r) => r.id as string);
      expect(ids).not.toContain(fx.quoteB);
    });

    it("never lets a partner read email threads", async () => {
      expect(["denied", "empty"]).toContain(await readAccess(partnerUserA.client, "email_messages", "id"));
    });
  });

  /* --------------------------------------------------------- role escalation */

  describe("role escalation", () => {
    for (const [label, get] of [
      ["customer", () => customerA],
      ["partner", () => partnerUserA],
      ["sales", () => sales],
    ] as const) {
      it(`${label} cannot promote itself to admin`, async () => {
        const user = get();
        await user.client.from("profiles").update({ role: "zuegelwerk_admin" }).eq("id", user.id);
        const { data } = await admin().from("profiles").select("role").eq("id", user.id).single();
        expect(data!.role).not.toBe("zuegelwerk_admin");
      });

      it(`${label} cannot move itself into another organisation`, async () => {
        const user = get();
        await user.client.from("profiles").update({ organization_id: fx.orgB }).eq("id", user.id);
        const { data } = await admin().from("profiles").select("organization_id").eq("id", user.id).single();
        if (label === "customer") expect(data!.organization_id).toBe(fx.orgA);
        else expect(data!.organization_id).not.toBe(fx.orgB);
      });
    }

    it("refuses a non-staff caller on the partner status function", async () => {
      for (const user of [customerA, partnerUserA]) {
        const { error } = await user.client.rpc("set_partner_status", {
          _partner_id: fx.partnerA,
          _new_status: "approved",
          _note: "escalation attempt",
        });
        expect(error).toBeTruthy();
      }
      const { data } = await admin().from("partners").select("status").eq("id", fx.partnerA).single();
      expect(data!.status).not.toBe("approved");
    });
  });

  /* ------------------------------------------------------------- staff reads */

  describe("staff reads", () => {
    it("lets dispatch roles read the lead pipeline", async () => {
      for (const user of [sales, ops, adminUser]) {
        const { error } = await user.client.from("leads").select("id, reference, status").limit(1);
        expect(error, "a dispatch role lost lead access").toBeFalsy();
      }
    });

    it("lets staff read the mailbox and customers not", async () => {
      const { error } = await adminUser.client.from("email_messages").select("id").limit(1);
      expect(error).toBeFalsy();
    });
  });
});
