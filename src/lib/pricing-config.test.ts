/**
 * Publish-gate regression tests. These sit alongside the 16 boundary tests in
 * price-resolution.test.ts and are part of the permanent pricing regression
 * suite: a configuration that overlaps, or that gaps without saying so, must
 * never be publishable.
 */
import { describe, expect, it } from "vitest";

import { canPublish, unreviewedRules, validateRuleSet, type PricingRule } from "@/lib/pricing-config";

function rule(over: Partial<PricingRule> & { band_id: string }): PricingRule {
  return {
    id: over.band_id,
    configuration_id: "cfg",
    service: "clean",
    property_type: "any",
    room_min: null,
    room_max: null,
    price: 100,
    currency: "CHF",
    unit_type: "",
    gap_after_intentional: false,
    requires_commercial_review: false,
    sort_order: 0,
    created_at: "",
    updated_at: "",
    ...over,
  } as PricingRule;
}

const contiguous: PricingRule[] = [
  rule({ band_id: "1.5-2.5", room_min: 1.5, room_max: 2.5, price: 520 }),
  rule({ band_id: "2.5-3.5", room_min: 2.5, room_max: 3.5, price: 640, requires_commercial_review: true }),
  rule({ band_id: "3.5", room_min: 3.5, room_max: 4.5, price: 740, requires_commercial_review: true }),
  rule({ band_id: "4.5", room_min: 4.5, room_max: 5.5, price: 880 }),
];

describe("publish gate", () => {
  it("accepts a contiguous half-open set", () => {
    expect(validateRuleSet(contiguous)).toEqual([]);
    expect(canPublish(contiguous)).toBe(true);
  });

  it("refuses an overlap and names both bands and the affected range", () => {
    const issues = validateRuleSet([
      ...contiguous,
      rule({ band_id: "3.0-4.0", room_min: 3.0, room_max: 4.0 }),
    ]);
    expect(issues.some((i) => i.kind === "overlap")).toBe(true);
    const overlap = issues.find((i) => i.kind === "overlap")!;
    expect(overlap.a).toBeTruthy();
    expect(overlap.b).toBeTruthy();
    expect(overlap.to).toBeGreaterThan(overlap.from);
    expect(canPublish([...contiguous, rule({ band_id: "3.0-4.0", room_min: 3, room_max: 4 })])).toBe(false);
  });

  it("refuses an unmarked gap", () => {
    const gapped = contiguous.filter((r) => r.band_id !== "3.5");
    const issues = validateRuleSet(gapped);
    expect(issues).toHaveLength(1);
    expect(issues[0]!.kind).toBe("gap");
  });

  it("allows a gap that is explicitly marked intentional", () => {
    const gapped = contiguous
      .filter((r) => r.band_id !== "3.5")
      .map((r) => (r.band_id === "2.5-3.5" ? { ...r, gap_after_intentional: true } : r));
    expect(validateRuleSet(gapped)).toEqual([]);
  });

  it("validates the full set, not the edited row", () => {
    // The edited row alone is valid; the set it joins is not.
    const edited = rule({ band_id: "2.0-3.0", room_min: 2, room_max: 3 });
    expect(validateRuleSet([edited])).toEqual([]);
    expect(canPublish([...contiguous, edited])).toBe(false);
  });

  it("refuses a reversed or zero-width band", () => {
    const issues = validateRuleSet([rule({ band_id: "bad", room_min: 3, room_max: 3 })]);
    expect(issues[0]!.kind).toBe("invalid");
  });

  it("refuses an empty configuration", () => {
    expect(validateRuleSet([])[0]!.kind).toBe("empty");
  });

  it("ignores non-band rules in contiguity checks", () => {
    expect(validateRuleSet([...contiguous, rule({ band_id: "", unit_type: "per_m3", price: 95 })])).toEqual([]);
  });

  it("surfaces the two provisional prices as unreviewed", () => {
    expect(unreviewedRules(contiguous).map((r) => Number(r.price))).toEqual([640, 740]);
  });
});
