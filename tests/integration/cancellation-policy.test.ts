import { describe, expect, it } from "vitest";
import { admin, ENV_READY } from "./harness";

const suite = ENV_READY ? describe : describe.skip;

suite("approved cancellation policy", () => {
  it("has no active 40 percent cancellation charge", async () => {
    const { count, error } = await admin()
      .from("cancellation_rules")
      .select("id", { count: "exact", head: true })
      .eq("active", true)
      .eq("charge_pct", 40);
    expect(error).toBeNull();
    expect(count).toBe(0);
  });
});