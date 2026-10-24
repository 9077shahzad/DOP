/**
 * One completed job can only ever carry one invoice.
 *
 * Two finance users clicking at the same moment must not produce two invoices
 * for the same job: the unique index decides, and the function returns the
 * invoice that won instead of failing.
 */
import { afterAll, describe, expect, it } from "vitest";

import { admin, cleanupUsers, ENV_READY, makeUser } from "./harness";
import { cleanupFixtures, seedCompletedJob } from "./seed";

const suite = ENV_READY ? describe : describe.skip;

suite("invoice creation is idempotent under concurrency", () => {
  afterAll(async () => {
    await cleanupFixtures();
    await cleanupUsers();
  });

  it("two simultaneous attempts produce exactly one invoice", async () => {
    const a = await makeUser({ role: "finance", label: "inv-a" });
    const b = await makeUser({ role: "finance", label: "inv-b" });
    const job = await seedCompletedJob({ job_value: 1500 });

    const [first, second] = await Promise.all([
      a.client.rpc("create_invoice_from_job", { _job_id: job.id }),
      b.client.rpc("create_invoice_from_job", { _job_id: job.id }),
    ]);

    const ids = [first, second].filter((r) => !r.error).map((r) => String(r.data));
    expect(ids.length).toBeGreaterThanOrEqual(1);

    const rows = await admin().from("invoices").select("id, job_id, total").eq("job_id", job.id);
    expect(rows.data?.length).toBe(1);
    for (const id of ids) expect(id).toBe(rows.data![0]!.id);
    expect(Number(rows.data![0]!.total)).toBe(1500);
  });

  it("a job without a price is never invoiced with a fabricated amount", async () => {
    const finance = await makeUser({ role: "finance", label: "inv-nopricing" });
    const job = await seedCompletedJob({ job_value: null });
    const { error } = await finance.client.rpc("create_invoice_from_job", { _job_id: job.id });
    expect(error?.message).toContain("pricing_required");
    const rows = await admin().from("invoices").select("id").eq("job_id", job.id);
    expect(rows.data?.length ?? 0).toBe(0);
  });
});
