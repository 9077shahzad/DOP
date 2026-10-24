import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ENV_READY, admin, cleanupUsers, makeUser, type TestUser } from "./harness";

const suite = ENV_READY ? describe : describe.skip;
suite("order conversion requires genuine customer acceptance", () => {
  let staff: TestUser;
  let quoteId: string;
  beforeAll(async () => {
    staff = await makeUser({ role: "zuegelwerk_admin", label: "acceptance-gate" });
    const { data, error } = await admin().from("quotes").insert({
      is_test: true, reference: "pending", language: "de", customer_name: "UAT acceptance gate",
      customer_email: "acceptance-gate@ps-umzug-test.invalid", workflow_stage: "offer_draft",
      price_total: 1800, price_net: 1665.12, price_vat: 134.88,
      services: { move: true }, move_date: "2026-12-01", distance_km: 9, distance_source: "manual",
    }).select("id").single();
    expect(error).toBeNull();
    if (!data) throw new Error("test quote not created");
    quoteId = data.id;
  }, 60000);
  afterAll(async () => {
    if (quoteId) await admin().from("quotes").update({ archived_at: new Date().toISOString() }).eq("id", quoteId);
    await cleanupUsers();
  }, 60000);
  it("rejects even an admin reason when the customer has not accepted", async () => {
    const result = await staff.client.rpc("dop_offer_to_order_checked", { _quote_id: quoteId, _override_reason: "UAT: must not bypass acceptance" });
    expect(result.error?.message).toContain("acceptance_required");
    const { data } = await admin().from("quotes").select("job_id, accepted_at, accepted_snapshot").eq("id", quoteId).single();
    expect(data?.job_id).toBeNull();
    expect(data?.accepted_at).toBeNull();
    expect(data?.accepted_snapshot).toBeNull();
  });
  it("denies a direct call bypassing the checked conversion", async () => {
    const result = await staff.client.rpc("dop_offer_to_order", { _quote_id: quoteId });
    expect(result.error?.code).toBe("42501");
  });
});