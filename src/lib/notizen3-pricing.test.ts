/**
 * Notizen 3 pricing rules (owner decisions, price list 1029):
 * - disposal team hours billed exactly as booked, no four-hour minimum
 * - 5% combination discount for two and for three main services
 * - 5% Steffisburg discount (PLZ 3612/3613) at pick-up or destination
 * - never both discounts at once
 * - dowel holes CHF 4.50 each, packing-material delivery CHF 80 once
 */
import { describe, expect, it } from "vitest";

import { INITIAL_STATE, calculate, steffisburgAddress, type PlannerState, type PricedPlannerState } from "@/lib/pricing";
import { TEST_PRICING } from "@/lib/planner-pricing.fixture";
import type { PlannerPricing } from "@/lib/planner-pricing";

const PRICING: PlannerPricing = {
  ...TEST_PRICING,
  values: {
    ...TEST_PRICING.values,
    "disposal:per_m3": 40,
    "disposal:per_team_hour": 120,
    "engine:bundle_two": 0.05,
    "engine:bundle_three": 0.05,
    "engine:discount_steffisburg": 0.05,
    "cleanextra:dowel_hole": 4.5,
    "moveextra:packing_material_delivery": 80,
  },
};

const base = (patch: Partial<PlannerState>): PricedPlannerState => ({
  ...INITIAL_STATE,

  fromZip: "3000",
  toZip: "8001",
  ...patch,
  roomUnits: patch.roomUnits ?? 3.5,
});

const svc = (s: Partial<PlannerState["services"]>) => ({ move: false, pack: false, clean: false, disp: false, ...s });

describe("disposal without minimum", () => {
  it.each([1, 3.5])("bills %s team hours exactly", (hours) => {
    const c = calculate(base({ services: svc({ disp: true }), disposal: { m3: 3, hours, notes: "" } }), PRICING);
    expect(c.disposal?.billedHours).toBe(hours);
    expect(c.disposal?.minimumApplied).toBeFalsy();
  });
});

describe("single discount", () => {
  it("5% for two main services", () => {
    const c = calculate(base({ services: svc({ move: true, clean: true }) }), PRICING);
    expect(c.discountRate).toBe(0.05);
    expect(c.discountReason).toBe("bundle");
  });

  it("5% for all three main services, no extra discount", () => {
    const c = calculate(
      base({ services: svc({ move: true, clean: true, disp: true }), disposal: { m3: 2, hours: 1, notes: "" } }),
      PRICING,
    );
    expect(c.discountRate).toBe(0.05);
  });

  it("Steffisburg at pick-up or destination triggers the location discount", () => {
    expect(steffisburgAddress({ fromZip: "3613", toZip: "8001", services: svc({ move: true }) })).toBe(true);
    expect(steffisburgAddress({ fromZip: "8001", toZip: "3612", services: svc({ move: true }) })).toBe(true);
    const c = calculate(base({ fromZip: "3613", services: svc({ move: true }) }), PRICING);
    expect(c.discountReason).toBe("steffisburg");
    expect(c.discountRate).toBe(0.05);
  });

  it("never stacks bundle and Steffisburg", () => {
    const c = calculate(base({ fromZip: "3613", services: svc({ move: true, clean: true }) }), PRICING);
    expect(c.discountRate).toBe(0.05);
    expect(c.discount).toBeCloseTo(c.subtotal * 0.05, 2);
  });

  it("no discount outside Steffisburg for one service", () => {
    expect(calculate(base({ services: svc({ move: true }) }), PRICING).discountRate).toBe(0);
  });
});

describe("new surcharges", () => {
  it("dowel holes: quantity × CHF 4.50", () => {
    const c = calculate(
      base({ services: svc({ clean: true }), cleaning: { ...INITIAL_STATE.cleaning, dowelHoles: 12 } }),
      PRICING,
    );
    expect(c.lines.find((l) => l.id === "clean_dowel_holes")?.amount).toBeCloseTo(54, 6);
  });

  it("packing material delivery CHF 80 once, self pick-up free", () => {
    const delivery = calculate(
      base({ services: svc({ move: true }), extras: ["packing_material"], packingMaterialOption: "delivery" }),
      PRICING,
    );
    expect(delivery.lines.filter((l) => l.id === "extra_packing_material_delivery").map((l) => l.amount)).toEqual([80]);
    const self = calculate(
      base({ services: svc({ move: true }), extras: ["packing_material"], packingMaterialOption: "self" }),
      PRICING,
    );
    expect(self.lines.some((l) => l.id === "extra_packing_material_delivery")).toBe(false);
  });
});
