import { describe, expect, it } from "vitest";
import { INITIAL_STATE, calculate } from "@/lib/pricing";
import { plannerMissingInputs } from "@/lib/price-resolution";
import { TEST_PRICING } from "@/lib/planner-pricing.fixture";

const state = {
  ...INITIAL_STATE,
  roomUnits: 3.5,
  fromZip: "8001",
  toZip: "8400",
  services: { move: true, clean: false, disp: false, pack: false },
};

describe("inventory volumes without invented commercial prices", () => {
  it("takes a previously unrated item's approved catalogue volume", () => {
    const withItem = { ...state, items: { sideboard: 2 } };
    expect(plannerMissingInputs(withItem, { sideboard: 0.7 })).not.toContain("inventoryVolume");
    expect(calculate(withItem, TEST_PRICING, { inventoryVolumes: { sideboard: 0.7 } }).m3).toBeGreaterThan(
      calculate(withItem, TEST_PRICING).m3,
    );
  });

  it("refuses a selected item missing approved volume", () => {
    expect(plannerMissingInputs({ ...state, items: { liegestuhl: 1 } }, {})).toContain("inventoryVolume");
    expect(plannerMissingInputs({ ...state, items: { sideboard: 1 } })).toContain("inventoryVolume");
  });

  it("preserves established box volumes even when the catalogue differs", () => {
    const box = { ...state, items: { box: 40 } };
    expect(calculate(box, TEST_PRICING, { inventoryVolumes: { box: 0.084 } }).m3).toBe(
      calculate(box, TEST_PRICING).m3,
    );
  });
});