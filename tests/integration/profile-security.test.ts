/**
 * Self-service profile editing must never become privilege escalation.
 *
 * The database, not the interface, decides which profile columns a signed-in
 * person may change. These tests attack the profile row directly through
 * PostgREST — exactly what a determined user with the publishable key can do.
 */
import { afterAll, describe, expect, it } from "vitest";

import { admin, cleanupUsers, ENV_READY, makeUser } from "./harness";

const suite = ENV_READY ? describe : describe.skip;

suite("profile column protection", () => {
  afterAll(async () => {
    await cleanupUsers();
  });

  it("lets a customer change the fields self-service allows", async () => {
    const user = await makeUser({ role: "manager", label: "prof-self" });
    const { error } = await user.client
      .from("profiles")
      .update({ full_name: "Renamed by owner", ui_language: "fr" })
      .eq("id", user.id);
    expect(error).toBeFalsy();
    const { data } = await admin().from("profiles").select("full_name, ui_language").eq("id", user.id).single();
    expect(data!.full_name).toBe("Renamed by owner");
    expect(data!.ui_language).toBe("fr");
  });

  it("refuses a customer promoting itself to super admin", async () => {
    const user = await makeUser({ role: "manager", label: "prof-escalate" });
    const { error } = await user.client.from("profiles").update({ role: "super_admin" }).eq("id", user.id);
    expect(error).toBeTruthy();
    const { data } = await admin().from("profiles").select("role").eq("id", user.id).single();
    expect(data!.role).toBe("manager");
  });

  it("refuses a crew member changing its own role", async () => {
    const user = await makeUser({ role: "crew_leader", label: "prof-crew" });
    const { error } = await user.client.from("profiles").update({ role: "ops_manager" }).eq("id", user.id);
    expect(error).toBeTruthy();
    const { data } = await admin().from("profiles").select("role").eq("id", user.id).single();
    expect(data!.role).toBe("crew_leader");
  });

  it("refuses ordinary staff changing its own role", async () => {
    const user = await makeUser({ role: "sales", label: "prof-sales" });
    const { error } = await user.client.from("profiles").update({ role: "zuegelwerk_admin" }).eq("id", user.id);
    expect(error).toBeTruthy();
    const viaRpc = await user.client.rpc("set_user_role", { _user_id: user.id, _role: "zuegelwerk_admin", _note: "x" });
    expect(viaRpc.error).toBeTruthy();
    const { data } = await admin().from("profiles").select("role").eq("id", user.id).single();
    expect(data!.role).toBe("sales");
  });

  it("refuses a change to tenant linkage", async () => {
    const org = await admin().from("organizations").insert({ name: "UAT Profile Org" }).select("id").single();
    const user = await makeUser({ role: "manager", label: "prof-tenant" });
    const { error } = await user.client
      .from("profiles")
      .update({ organization_id: org.data!.id })
      .eq("id", user.id);
    expect(error).toBeTruthy();
    const { data } = await admin().from("profiles").select("organization_id").eq("id", user.id).single();
    expect(data!.organization_id).toBeNull();
    await admin().from("organizations").delete().eq("id", org.data!.id);
  });

  it("lets an administrator change another user's role and records the audit", async () => {
    const adminUser = await makeUser({ role: "zuegelwerk_admin", label: "prof-admin" });
    const target = await makeUser({ role: "manager", label: "prof-target" });

    const { error } = await adminUser.client.rpc("set_user_role", {
      _user_id: target.id,
      _role: "ops_manager",
      _note: "promotion approved",
    });
    expect(error).toBeFalsy();

    const { data } = await admin().from("profiles").select("role").eq("id", target.id).single();
    expect(data!.role).toBe("ops_manager");

    const { data: audit } = await admin()
      .from("role_change_audit")
      .select("from_role, to_role, actor_id, note")
      .eq("subject_id", target.id)
      .order("created_at", { ascending: false })
      .limit(1);
    expect(audit?.[0]?.to_role).toBe("ops_manager");
    expect(audit?.[0]?.from_role).toBe("manager");
    expect(audit?.[0]?.actor_id).toBe(adminUser.id);
    expect(audit?.[0]?.note).toBe("promotion approved");

    await admin().from("role_change_audit").delete().eq("subject_id", target.id);
  });

  it("refuses a direct-ID update of somebody else's profile", async () => {
    const attacker = await makeUser({ role: "manager", label: "prof-attacker" });
    const victim = await makeUser({ role: "manager", label: "prof-victim" });
    const { data } = await attacker.client
      .from("profiles")
      .update({ full_name: "hijacked" })
      .eq("id", victim.id)
      .select("id");
    expect(data ?? []).toHaveLength(0);
    const { data: row } = await admin().from("profiles").select("full_name").eq("id", victim.id).single();
    expect(row!.full_name).not.toBe("hijacked");
  });
});
