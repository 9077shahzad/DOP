/**
 * Inquiry capture.
 *
 * Every public entry point ends in create_lead(). These tests call it exactly
 * as the browser does — signed out, through PostgREST — and assert the record
 * that must exist afterwards: one lead, the right source, the right queue, the
 * queue's default owner, and a notification row that is a notice about the
 * record rather than the record itself.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { ENV_READY, admin, anonClient, cleanupUsers } from "./harness";

const d = ENV_READY ? describe : describe.skip;

const created: string[] = [];
let anon: ReturnType<typeof anonClient>;

/** Unique contact per case so the per-contact rate limit never crosses cases. */
function contact(tag: string) {
  const n = Math.floor(Math.random() * 1_000_000);
  return {
    customer_email: `uat.${tag}.${n}@ps-umzug-test.invalid`,
    customer_phone: `+4179${String(1_000_000 + n).slice(0, 7)}`,
    customer_name: `UAT ${tag}`,
  };
}

/** create_lead returns the human reference (PSU-YYMMDD-NNNN), not the row id. */
async function submit(payload: Record<string, unknown>) {
  const { data, error } = await anon.rpc("create_lead", { payload: payload as never });
  if (error) return { ref: null as string | null, error };
  const ref = String(data);
  const { data: row } = await admin().from("leads").select("id").eq("reference", ref).maybeSingle();
  if (row?.id) created.push(row.id as string);
  return { ref, error: null };
}

async function leadRow(ref: string) {
  const { data, error } = await admin()
    .from("leads")
    .select("id, reference, source_id, queue_id, lead_owner_id, customer_type, status, utm_source, utm_medium, gclid, landing_page")
    .eq("reference", ref)
    .single();
  if (error) throw error;
  return data!;
}


/** Entry points, in the same shape src/lib/leads.ts sends. */
const ENTRY_POINTS: Array<{
  id: string;
  source: string;
  expectQueue: string;
  payload: () => Record<string, unknown>;
}> = [
  {
    id: "planner / Book Now",
    source: "booking_form",
    expectQueue: "sales_dispatch",
    payload: () => ({ source_key: "booking_form", customer_type: "private", ...contact("planner") }),
  },
  {
    id: "contact page callback",
    source: "website_form",
    expectQueue: "sales_dispatch",
    payload: () => ({
      source_key: "website_form",
      service_details: { channel: "callback" },
      ...contact("callback"),
    }),
  },
  {
    id: "B2B inquiry",
    source: "b2b_inquiry",
    expectQueue: "b2b",
    payload: () => ({ source_key: "b2b_inquiry", customer_type: "b2b", ...contact("b2b") }),
  },
  {
    id: "portal support",
    source: "website_form",
    expectQueue: "support",
    payload: () => ({
      source_key: "website_form",
      flag: "support",
      customer_type: "b2b",
      ...contact("support"),
    }),
  },
  {
    id: "service request (survey needed)",
    source: "website_form",
    expectQueue: "sales_dispatch",
    payload: () => ({
      source_key: "website_form",
      service_details: { channel: "service_request", service: "hvac" },
      ...contact("service"),
    }),
  },
  {
    id: "WhatsApp handoff",
    source: "whatsapp",
    expectQueue: "sales_dispatch",
    payload: () => ({ source_key: "whatsapp", preferred_contact: "whatsapp", ...contact("whatsapp") }),
  },
];

d("inquiry capture", () => {
  beforeAll(() => {
    anon = anonClient();
  });

  afterAll(async () => {
    const db = admin();
    if (created.length) {
      await db.from("notification_log").delete().in("subject_id", created);
      await db.from("lead_activities").delete().in("lead_id", created);
      await db.from("leads").delete().in("id", created);
    }
    await cleanupUsers();
  }, 60_000);

  for (const entry of ENTRY_POINTS) {
    describe(entry.id, () => {
      it("creates exactly one lead with a reference, queue and owner", async () => {
        const payload = entry.payload();
        const { ref, error } = await submit(payload);
        expect(error).toBeNull();
        expect(ref).toBeTruthy();

        const row = await leadRow(ref!);
        expect(row.reference).toMatch(/^PSU-\d{6}-\d{4}$/);
        expect(row.queue_id).toBeTruthy();

        const { data: queue } = await admin()
          .from("lead_queues")
          .select("key, default_owner_id, sla_first_review_minutes")
          .eq("id", row.queue_id!)
          .single();
        expect(queue!.key).toBe(entry.expectQueue);
        // The owner is the queue's default owner — never left unassigned.
        expect(row.lead_owner_id).toBe(queue!.default_owner_id);
        expect(queue!.sla_first_review_minutes).toBeGreaterThan(0);

        const { data: source } = await admin()
          .from("lead_sources")
          .select("key")
          .eq("id", row.source_id!)
          .single();
        expect(source!.key).toBe(entry.source);

        // exactly one lead for that contact
        const { count } = await admin()
          .from("leads")
          .select("id", { count: "exact", head: true })
          .eq("customer_email", String(payload["customer_email"]));
        expect(count).toBe(1);
      });

      it("records the notification without it being the record of truth", async () => {
        const payload = entry.payload();
        const { ref } = await submit(payload);
        const lead = await leadRow(ref!);
        const { data: notes } = await admin()
          .from("notification_log")
          .select("template, status, subject_id")
          .eq("subject_id", lead.id);
        expect((notes ?? []).length).toBeGreaterThan(0);
        // Nothing may claim delivery while no provider is connected.
        for (const n of notes ?? []) expect(["pending", "queued", "failed"]).toContain(n.status);
        // The lead survives regardless of the notification's fate.
        await admin().from("notification_log").update({ status: "failed" }).eq("subject_id", lead.id);
        const still = await leadRow(ref!);
        expect(still.reference).toBe(ref);
      });
    });
  }

  describe("attribution", () => {
    it("stores UTM parameters, gclid and landing page on the lead", async () => {
      const { ref } = await submit({
        source_key: "booking_form",
        ...contact("utm"),
        utm_source: "google",
        utm_medium: "cpc",
        utm_campaign: "umzug-zh",
        gclid: "uat-gclid-123",
        landing_page: "https://ps-umzug.test/de/planer",
      });
      const row = await leadRow(ref!);
      expect(row.utm_source).toBe("google");
      expect(row.utm_medium).toBe("cpc");
      expect(row.gclid).toBe("uat-gclid-123");
      expect(row.landing_page).toContain("/de/planer");
    });
  });

  describe("abuse protection", () => {
    it("rejects a filled honeypot", async () => {
      const { error } = await anon.rpc("create_lead", {
        payload: { source_key: "website_form", ...contact("hp"), hp: "http://spam" } as never,
      });
      // Spam is either refused or quarantined; it must never reach a queue clean.
      if (!error) {
        const { data } = await admin()
          .from("leads")
          .select("id, status")
          .order("created_at", { ascending: false })
          .limit(1);
        created.push(data![0]!.id as string);
        expect(data![0]!.status).toBe("spam_review");
      } else {
        expect(error.message).toBeTruthy();
      }
    });

    it("rate-limits a burst from the same contact", async () => {
      const c = contact("burst");
      let refused = 0;
      for (let i = 0; i < 8; i += 1) {
        const { error } = await submit({ source_key: "website_form", ...c, description: `burst ${i}` });
        if (error) refused += 1;
      }
      expect(refused).toBeGreaterThan(0);
      const { count } = await admin()
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("customer_email", c.customer_email);
      expect(count ?? 0).toBeLessThanOrEqual(5);
    });

    it("does not create a second lead for a simultaneous double submit", async () => {
      const c = contact("double");
      const payload = { source_key: "website_form", ...c, description: "double submit" };
      const [a, b] = await Promise.all([submit(payload), submit(payload)]);
      const refs = [a.ref, b.ref].filter(Boolean) as string[];
      const ids = (
        await admin().from("leads").select("id").in("reference", refs)
      ).data?.map((r) => r.id as string) ?? [];
      const { data } = await admin()
        .from("leads")
        .select("id")
        .eq("customer_email", c.customer_email);
      // Two identical submissions may both be accepted by the database, but the
      // duplicate must be surfaced for review rather than silently forked.
      if ((data ?? []).length > 1) {
        const { data: dupes } = await admin()
          .from("lead_duplicates")
          .select("id")
          .in("lead_id", ids);
        expect((dupes ?? []).length, "duplicate not flagged for review").toBeGreaterThan(0);
      } else {
        expect((data ?? []).length).toBe(1);
      }
    });
  });
});
