/**
 * Review invitations are bound to a genuine close-out.
 *
 * A review row can no longer be inserted from a browser. Only
 * `create_review_request` mints one: it checks the caller's role, insists the
 * job is finished, derives the customer relationship itself, mints the token
 * and writes an audit note. The customer's answer can be given once.
 */
import { afterAll, describe, expect, it } from "vitest";

import { admin, anonClient, cleanupUsers, ENV_READY, makeUser } from "./harness";
import { cleanupFixtures, seedCompletedJob, seedJob } from "./seed";

const suite = ENV_READY ? describe : describe.skip;

suite("review invitations", () => {
  afterAll(async () => {
    await cleanupFixtures();
    await cleanupUsers();
  });

  it("a finished job produces one token, and asking again reuses it", async () => {
    const staff = await makeUser({ role: "zuegelwerk_admin", label: "rev-admin" });
    const job = await seedCompletedJob();

    const first = await staff.client.rpc("create_review_request", { _job_id: job.id });
    expect(first.error).toBeNull();
    const created = first.data as Record<string, unknown>;
    expect(created["created"]).toBe(true);
    expect(String(created["token"]).length).toBeGreaterThanOrEqual(32);

    const again = await staff.client.rpc("create_review_request", { _job_id: job.id });
    const reused = again.data as Record<string, unknown>;
    expect(reused["created"]).toBe(false);
    expect(reused["token"]).toBe(created["token"]);

    const rows = await admin().from("job_reviews").select("id, job_id").eq("job_id", job.id);
    expect(rows.data?.length).toBe(1);

    const audit = await admin()
      .from("job_events_exec")
      .select("body")
      .eq("job_id", job.id)
      .eq("body", "review_requested");
    expect((audit.data ?? []).length).toBe(1);
  });

  it("an unfinished job cannot be reviewed", async () => {
    const staff = await makeUser({ role: "zuegelwerk_admin", label: "rev-open" });
    const job = await seedJob({ status: "scheduled" });
    const { error } = await staff.client.rpc("create_review_request", { _job_id: job.id });
    expect(error?.message).toContain("job_not_completed");
  });

  it("unauthorised callers cannot mint a review token or insert one directly", async () => {
    const outsider = await makeUser({ role: null, label: "rev-outsider" });
    const job = await seedCompletedJob();

    const refused = await outsider.client.rpc("create_review_request", { _job_id: job.id });
    expect(refused.error).not.toBeNull();

    const anon = await anonClient().rpc("create_review_request", { _job_id: job.id });
    expect(anon.error).not.toBeNull();

    const direct = await outsider.client.from("job_reviews").insert({ job_id: job.id });
    expect(direct.error).not.toBeNull();

    const rows = await admin().from("job_reviews").select("id").eq("job_id", job.id);
    expect(rows.data?.length).toBe(0);
  });

  it("the customer can answer through the token exactly once", async () => {
    const staff = await makeUser({ role: "zuegelwerk_admin", label: "rev-submit" });
    const job = await seedCompletedJob();
    const { data } = await staff.client.rpc("create_review_request", { _job_id: job.id });
    const token = String((data as Record<string, unknown>)["token"]);

    const anon = anonClient();
    const read = await anon.rpc("review_by_token", { _token: token });
    expect(read.error).toBeNull();

    const first = await anon.rpc("submit_review", { _token: token, _rating: 5, _comment: "UAT" });
    expect(first.error).toBeNull();
    const second = await anon.rpc("submit_review", { _token: token, _rating: 1, _comment: "UAT again" });
    expect(second.data ?? false).toBe(false);

    const row = await admin().from("job_reviews").select("rating").eq("job_id", job.id).single();
    expect(Number(row.data?.rating)).toBe(5);
  });
});
