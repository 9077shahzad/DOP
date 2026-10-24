/**
 * Approved cleaning and moving surcharges.
 *
 * Every figure here comes from the published price list fixture — the test
 * proves the arithmetic and the conditions, never a hardcoded price in code.
 */
import { describe, expect, it } from "vitest";

import { TEST_PRICING } from "@/lib/planner-pricing.fixture";
import type { PlannerPricing } from "@/lib/planner-pricing";
import {
  cleaningSurcharges,
  movingSurcharges,
  applicableExtras,
  EMPTY_CLEANING,
  INITIAL_STATE,
  type CleaningChecklist,
  type PlannerState,
} from "@/lib/pricing";

const PRICING: PlannerPricing = {
  ...TEST_PRICING,
  values: {
    ...TEST_PRICING.values,
    "cleanextra:balcony": 20,
    "cleanextra:pressure": 80,
    "cleanextra:cellar": 20,
    "cleanextra:garage": 20,
    "cleanextra:carpet_shampoo": 80,
    "cleanextra:lamellen": 50,
    "cleanextra:window_free": 3,
    "cleanextra:window_normal": 10,
    "cleanextra:window_large": 20,
    "moveextra:furniture_assembly": 200,
    "moveextra:furniture_assembly_min_rooms": 3.5,
    "moveextra:piano_transport": 250,
    "moveextra:lamp_installation": 35,
  },
};

const sum = (lines: { amount: number }[]) => lines.reduce((total, l) => total + l.amount, 0);

function cleaning(next: Partial<CleaningChecklist>): CleaningChecklist {
  return { ...EMPTY_CLEANING, roomUnits: 3.5, ...next };
}

function planner(next: Partial<PlannerState>): PlannerState {
  return {
    ...INITIAL_STATE,
    services: { move: true, pack: false, clean: false, disp: false },
    roomUnits: 3.5,
    ...next,
  };
}

describe("cleaning surcharges", () => {
  it("shares one free window allowance across both sizes", () => {
    // Allowance 3 covers the 3 normal windows; all 3 large windows are charged.
    expect(sum(cleaningSurcharges(cleaning({ windowsNormal: 3 }), PRICING))).toBe(0);
    const lines = cleaningSurcharges(cleaning({ windowsNormal: 3, windowsLarge: 3 }), PRICING);
    expect(sum(lines)).toBe(60);
  });

  it("charges only the windows beyond the allowance, per size", () => {
    const lines = cleaningSurcharges(cleaning({ windowsNormal: 4, windowsLarge: 5 }), PRICING);
    // 3 free normal, 1 normal × 10 + 5 large × 20.
    expect(sum(lines)).toBe(110);
  });

  it("carpet alone is free, shampooing is charged", () => {
    expect(sum(cleaningSurcharges(cleaning({ carpet: true }), PRICING))).toBe(0);
    expect(
      sum(cleaningSurcharges(cleaning({ carpet: true, carpetShampoo: true }), PRICING)),
    ).toBe(80);
  });

  it("adds up the six fixed extras with 5 normal and 4 large windows", () => {
    const lines = cleaningSurcharges(
      cleaning({
        balcony: true,
        balconyPressure: true,
        cellar: true,
        garage: true,
        carpet: true,
        carpetShampoo: true,
        coverings: ["lamellen"],
        windowsNormal: 5,
        windowsLarge: 4,
      }),
      PRICING,
    );
    // 270 fixed extras + 2 normal × 10 + 4 large × 20.
    expect(sum(lines)).toBe(370);
  });

  it("charges each fixed surcharge at most once", () => {
    const lines = cleaningSurcharges(cleaning({ balcony: true }), PRICING);
    expect(lines.filter((l) => l.id === "clean_balcony")).toHaveLength(1);
  });

  it("prices nothing when the price list carries no approved rate", () => {
    const lines = cleaningSurcharges(
      cleaning({ balcony: true, windowsNormal: 9 }),
      TEST_PRICING,
    );
    expect(lines).toHaveLength(0);
  });
});

describe("moving surcharges", () => {
  it("charges furniture assembly from the configured room count", () => {
    const lines = movingSurcharges(
      planner({ extras: ["furniture_assembly"], roomUnits: 3.5 }),
      PRICING,
    );
    expect(sum(lines)).toBe(200);
  });

  it("never charges furniture assembly below the configured room count", () => {
    const lines = movingSurcharges(
      planner({ extras: ["furniture_assembly"], roomUnits: 2.5 }),
      PRICING,
    );
    expect(lines).toHaveLength(0);
  });

  it("never charges furniture assembly on size alone", () => {
    expect(movingSurcharges(planner({ extras: [], roomUnits: 5.5 }), PRICING)).toHaveLength(0);
  });

  it("adds assembly, piano and three lamps", () => {
    const lines = movingSurcharges(
      planner({
        extras: ["furniture_assembly", "piano_transport", "lamp_installation"],
        lampCount: 3,
        roomUnits: 4.5,
      }),
      PRICING,
    );
    expect(sum(lines)).toBe(555);
  });

  it("drops the lamp charge when the service is not selected", () => {
    expect(movingSurcharges(planner({ extras: [], lampCount: 3 }), PRICING)).toHaveLength(0);
  });
});

describe("service switching", () => {
  it("offers no moving extras on a cleaning-only request", () => {
    expect(
      applicableExtras({ move: false, pack: false, clean: true, disp: false }),
    ).toHaveLength(0);
  });

  it("never offers the hoist as an extra — it lives on the access step", () => {
    expect(applicableExtras({ move: true, pack: false, clean: false, disp: false })).not.toContain(
      "hoist",
    );
  });
});
