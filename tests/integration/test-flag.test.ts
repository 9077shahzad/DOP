/**
 * The is_test marker must be trustworthy: only the service role (test suite)
 * or an administrator via dop_set_test_flag may set it; the public and normal
 * staff cannot. Every admin change is logged in the workflow history.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ENV_READY, admin, anonClient, cleanupUsers, makeUser, type TestUser } from "./harness";

describe.skipIf(!ENV_READY)("is_test marker", () => {
  let quoteId = "";
  let adminUser: TestUser;
  let staffUser: TestUser;

  beforeAll(async () => {
    const { data, error } = await admin()
      .from("quotes")
      .insert({ is_test: true, customer_name: "Flag Test", customer_email: "flag.test@ps-umzug-test.invalid", language: "de" })
      .select("id")
      .single();
    if (error) throw error;
    quoteId = data.id;
    // Start unflagged so the admin action is a real change.
    await admin().from("quotes").update({ is_test: false }).eq("id", quoteId);
    adminUser = await makeUser({ role: "zuegelwerk_admin", label: "flagadmin" });
    staffUser = await makeUser({ role: "sales", label: "flagstaff" });
  });

  afterAll(async () => {
    await admin().from("quotes").update({ is_test: true }).eq("id", quoteId);
    await cleanupUsers();
  });

  it("refuses the public", async () => {
    const { error } = await anonClient().rpc("dop_set_test_flag", { _kind: "quote", _id: quoteId, _is_test: true });
    expect(error).not.toBeNull();
  });

  it("refuses a normal staff user", async () => {
    const { error } = await staffUser.client.rpc("dop_set_test_flag", { _kind: "quote", _id: quoteId, _is_test: true });
    expect(error).not.toBeNull();
    const { data } = await admin().from("quotes").select("is_test").eq("id", quoteId).single();
    expect(data?.is_test).toBe(false);
  });

  it("ignores is_test written directly by a signed-in user", async () => {
    await staffUser.client.from("quotes").update({ is_test: true }).eq("id", quoteId);
    const { data } = await admin().from("quotes").select("is_test").eq("id", quoteId).single();
    expect(data?.is_test).toBe(false);
  });

  it("lets an administrator mark it and logs the change", async () => {
    const { error } = await adminUser.client.rpc("dop_set_test_flag", { _kind: "quote", _id: quoteId, _is_test: true });
    expect(error).toBeNull();
    const { data } = await admin().from("quotes").select("is_test").eq("id", quoteId).single();
    expect(data?.is_test).toBe(true);
    const { data: ev } = await admin()
      .from("workflow_events")
      .select("action, actor_id, detail")
      .eq("entity_id", quoteId)
      .eq("action", "test_flag_changed");
    expect(ev?.length).toBe(1);
    expect(ev?.[0]?.actor_id).toBe(adminUser.id);
  });

  it("public intake cannot create a test-flagged request", async () => {
    const { data, error } = await anonClient().rpc("create_lead", {
      payload: { customer_name: "Flag Intake", customer_email: "flag.intake@ps-umzug-test.invalid", is_test: true, language: "de" } as never,
    });
    if (error) return; // intake refused the payload: also acceptable
    const id = (data as { id?: string } | string | null) && (typeof data === "string" ? data : (data as { id?: string }).id);
    if (!id) return;
    const { data: lead } = await admin().from("leads").select("is_test").eq("id", id).maybeSingle();
    expect(lead?.is_test ?? false).toBe(false);
    await admin().from("leads").delete().eq("id", id);
  });
});
