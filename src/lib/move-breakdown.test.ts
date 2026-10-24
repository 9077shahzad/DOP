/**
 * The moving position's breakdown (base, volume, distance) is display-only:
 * its parts add up to the printed position, distance is km × CHF/km, and the
 * position and totals are exactly what they were before the breakdown existed.
 */
import { describe, expect, it } from "vitest";

import { INITIAL_STATE, calculate, type PricedPlannerState } from "@/lib/pricing";
import { TEST_PRICING } from "@/lib/planner-pricing.fixture";
import { param } from "@/lib/planner-pricing";

const P = (key: Parameters<typeof param>[1]) => param(TEST_PRICING, key);
const move = (over: Partial<PricedPlannerState> = {}): PricedPlannerState => ({
  ...INITIAL_STATE,
  services: { move: true, clean: false, disp: false, pack: false },
  fromZip: "3613",
  toZip: "3600",
  roomUnits: 3.5,
  floorOut: 3,
  ...over,
} as PricedPlannerState);

describe("moving price breakdown", () => {
  for (const km of [0, 9, 57.5, 250]) {
    it(`parts add up to the move position at ${km} km`, () => {
      const c = calculate(move(), TEST_PRICING, { confirmedKm: km });
      const b = c.moveBreakdown!;
      const line = c.lines.find((l) => l.id === "move")!;
      expect(Math.round((b.base + b.volume + b.distance) * 100)).toBe(Math.round(line.amount * 100));
      expect(b.km).toBe(km);
      expect(b.distance).toBeCloseTo(Math.round(km * P("move:per_km") * 100) / 100, 2);
    });
  }

  it("does not change the move position or totals", () => {
    const c = calculate(move(), TEST_PRICING, { confirmedKm: 9 });
    const effort = 1 + (100 - c.score.score) / 125;
    const expected = Math.round(((P("move:base") + c.m3 * P("move:per_m3")) * effort + 9 * P("move:per_km")) * 100) / 100;
    expect(c.lines.find((l) => l.id === "move")!.amount).toBe(expected);
    expect(c.subtotal).toBe(Math.round(c.lines.reduce((s, l) => s + l.amount, 0) * 100) / 100);
  });

  it("is absent when no move is booked", () => {
    const c = calculate(move({ services: { move: false, clean: true, disp: false, pack: false } }), TEST_PRICING);
    expect(c.moveBreakdown).toBeUndefined();
  });
});
