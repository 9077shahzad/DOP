/**
 * The confirmed distance is the only chargeable distance: km × CHF 2.20, no
 * free km, no minimum, no 180 km cap. The postcode estimate stays a reference.
 */
import { describe, expect, it } from "vitest";

import { INITIAL_STATE, calculate, type PricedPlannerState } from "@/lib/pricing";
import { TEST_PRICING } from "@/lib/planner-pricing.fixture";

// Move only, one service: no discount, so the per-km part is visible 1:1.
const move: PricedPlannerState = {
  ...INITIAL_STATE,
  fromZip: "3600",
  toZip: "8000",
  roomUnits: 3.5,
  services: { move: true, pack: false, clean: false, disp: false },
};

const moveLine = (km: number) => calculate(move, TEST_PRICING, { confirmedKm: km }).lines.find((l) => l.id === "move")!.amount;
// The existing access score adds effort above 40 km (unchanged rule), so the
// per-km part is isolated against a reference inside the same score bucket.
const kmCost = (km: number) => {
  const ref = km > 40 ? 41 : 0;
  return Math.round((moveLine(km) - moveLine(ref) + ref * 2.2) * 100) / 100;
};

describe("confirmed distance pricing", () => {
  it.each([
    [0, 0],
    [10, 22],
    [25, 55],
    [100, 220],
    [180, 396],
    [200, 440],
    [250, 550],
    [400, 880],
  ])("%s km = CHF %s", (km, chf) => {
    expect(kmCost(km)).toBe(chf);
  });

  it("the confirmed distance replaces the estimate for the price (80 → 100, 120 → 70)", () => {
    for (const confirmed of [100, 70]) {
      const c = calculate(move, TEST_PRICING, { confirmedKm: confirmed });
      expect(c.km).toBe(confirmed);
      expect(c.distanceManualRequired).toBeUndefined();
    }
  });

  it("an estimate above 180 km is flagged, never clipped", () => {
    const far = { ...move, fromZip: "1200", toZip: "9000" };
    const c = calculate(far, TEST_PRICING);
    expect(c.km).toBeGreaterThan(180);
    expect(c.distanceManualRequired).toBe(true);
  });
});
