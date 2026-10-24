/**
 * An order without a moving date cannot leave "scheduled" (be confirmed).
 * Uses an existing is_test order that has no date; a refused update changes nothing.
 */
import { describe, expect, it } from "vitest";

import { ENV_READY, admin } from "./harness";

const d = ENV_READY ? describe : describe.skip;

d("order confirmation requires a moving date", () => {
  it("refuses scheduled → assigned while the date is missing", async () => {
    const db = admin();
    const { data: job } = await db
      .from("jobs_execution")
      .select("id")
      .eq("is_test", true)
      .eq("status", "scheduled")
      .is("scheduled_start", null)
      .limit(1)
      .maybeSingle();
    if (!job) return;
    const { error } = await db.from("jobs_execution").update({ status: "assigned" } as never).eq("id", job.id);
    expect(error?.message ?? "").toContain("move_date_required");
    const { data: after } = await db.from("jobs_execution").select("status").eq("id", job.id).single();
    expect(after?.status).toBe("scheduled");
  });
});
