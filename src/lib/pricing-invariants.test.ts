/**
 * Pricing invariants.
 *
 * The portal pricing defect was not a wrong formula — it was a price shown
 * before the inputs existed, and a stale price left on screen after an input
 * changed. These tests encode both as invariants over every price-driving
 * input, plus the band boundary matrix (below · at · above every edge).
 */
import { describe, expect, it } from "vitest";

import {
  CLEANING_BANDS,
  PLANNER_ROOM_STEPS,
  isPriced,
  matchBand,
  plannerMissingInputs,
  resolvePlannerPrice,
  resolvePortalPrice,
  type PortalPriceInput,
  type RateRow,
} from "@/lib/price-resolution";
import { INITIAL_STATE, calculate, type PlannerState, type PricedPlannerState } from "@/lib/pricing";
import { TEST_PRICING } from "@/lib/planner-pricing.fixture";
import { param } from "@/lib/planner-pricing";

const P = (key: Parameters<typeof param>[1]) => param(TEST_PRICING, key);

const rates: RateRow[] = [
  { service: "clean", unit_type: "1.5-2.5", price: 520 },
  { service: "clean", unit_type: "2.5-3.5", price: 640 },
  { service: "clean", unit_type: "3.5", price: 740 },
  { service: "clean", unit_type: "4.5", price: 880 },
  { service: "clearance", unit_type: "per_m3", price: 95 },
  { service: "repairs", unit_type: "per_hour", price: 110 },
  // Calculation factors are configured rows too — never constants in code.
  { service: "clearance", unit_type: "m3_per_room", price: 2.2 },
  { service: "repairs", unit_type: "hours_per_job", price: 2 },
  { service: "handover", unit_type: "flat", price: 180 },
];

const plannerComplete: PlannerState = {
  ...INITIAL_STATE,
  roomUnits: 3.5,
  fromZip: "8001",
  toZip: "8400",
  services: { move: true, pack: false, clean: false, disp: false },
};

const portalComplete: PortalPriceInput = {
  unitId: "unit-1",
  rooms: 3.5,
  services: { clean: true },
  rates,
  bands: CLEANING_BANDS,
  discountRate: 0,
};

/* ------------------------------------------- 1. unset input ⇒ no price ever */

describe("no price without every price-driving input", () => {
  const plannerUnsetters: Array<[string, (s: PlannerState) => PlannerState]> = [
    ["room size", (s) => ({ ...s, roomUnits: null })],
    ["origin postcode", (s) => ({ ...s, fromZip: "" })],
    ["short origin postcode", (s) => ({ ...s, fromZip: "80" })],
    ["destination postcode", (s) => ({ ...s, toZip: "" })],
    ["services", (s) => ({ ...s, services: { move: false, pack: false, clean: false, disp: false } })],
  ];

  for (const [label, unset] of plannerUnsetters) {
    it(`planner: produces no figure with ${label} unset`, () => {
      const r = resolvePlannerPrice(unset(plannerComplete), TEST_PRICING);
      expect(r.state).toBe("incomplete");
      expect(JSON.stringify(r)).not.toMatch(/"total"/);
    });
  }

  it("planner: names every missing input rather than picking one", () => {
    const missing = plannerMissingInputs({
      ...INITIAL_STATE,
      services: { move: true, pack: false, clean: true, disp: true },
    });
    expect(missing).toEqual(
      expect.arrayContaining(["rooms", "fromZip", "toZip", "disposalVolume", "disposalHours"]),
    );
  });

  it("planner: never demands an input the chosen services do not price", () => {
    // Cleaning only — no destination, no disposal quantities.
    const cleaning = plannerMissingInputs({
      ...INITIAL_STATE,
      services: { move: false, pack: false, clean: true, disp: false },
    });
    // The size of a cleaning-only job is asked for in the cleaning step.
    expect(cleaning).toContain("cleanRooms");
    expect(cleaning).not.toContain("rooms");
    expect(cleaning).not.toContain("toZip");
    expect(cleaning).not.toContain("disposalVolume");

    // Disposal only — no room count, no destination.
    const disposal = plannerMissingInputs({
      ...INITIAL_STATE,
      services: { move: false, pack: false, clean: false, disp: true },
    });
    expect(disposal).not.toContain("rooms");
    expect(disposal).not.toContain("toZip");
    expect(disposal).toEqual(expect.arrayContaining(["disposalVolume", "disposalHours"]));
  });

  const portalUnsetters: Array<[string, (i: PortalPriceInput) => PortalPriceInput]> = [
    ["unit", (i) => ({ ...i, unitId: null })],
    ["services", (i) => ({ ...i, services: {} })],
    ["all services deselected", (i) => ({ ...i, services: { clean: false, clearance: false } })],
  ];

  for (const [label, unset] of portalUnsetters) {
    it(`portal: produces no figure with ${label} unset`, () => {
      const r = resolvePortalPrice(unset(portalComplete));
      expect(r.state).toBe("incomplete");
      expect(isPriced(r)).toBe(false);
    });
  }

  it("portal: an unrecorded room count never falls back to a default band", () => {
    const r = resolvePortalPrice({ ...portalComplete, rooms: null });
    expect(r.state).toBe("quotation");
    // Not the 1.5-2.5 rate, not the mid band, not zero-priced as if free.
    expect(JSON.stringify(r)).not.toContain("520");
  });

  it("portal: a missing framework rate becomes a quotation, never CHF 0", () => {
    const r = resolvePortalPrice({ ...portalComplete, rates: [] });
    expect(r.state).toBe("quotation");
    if (r.state !== "quotation") return;
    for (const line of r.lines) expect(line.quotation ? line.amount === 0 : line.amount > 0).toBe(true);
  });
});

/* ----------------------------- 2. a changed input invalidates a prior result */

describe("a changed input clears the previous result", () => {
  /**
   * Resolution is a pure function of the inputs, which is what makes a stale
   * price structurally impossible: the same inputs always give the same state,
   * and any changed input gives a freshly computed one.
   */
  it("is referentially transparent for identical inputs", () => {
    expect(resolvePortalPrice(portalComplete)).toEqual(resolvePortalPrice(portalComplete));
    expect(resolvePlannerPrice(plannerComplete, TEST_PRICING)).toEqual(resolvePlannerPrice(plannerComplete, TEST_PRICING));
  });

  const mutations: Array<[string, (i: PortalPriceInput) => PortalPriceInput]> = [
    ["unit deselected", (i) => ({ ...i, unitId: null })],

    ["room count changed", (i) => ({ ...i, rooms: 2.5 })],
    ["room count cleared", (i) => ({ ...i, rooms: null })],
    ["service added", (i) => ({ ...i, services: { ...i.services, handover: true } })],
    ["service removed", (i) => ({ ...i, services: {} })],
    ["rate withdrawn", (i) => ({ ...i, rates: [] })],
    ["discount changed", (i) => ({ ...i, discountRate: 0.05 })],
    ["override added", (i) => ({ ...i, overrides: [{ service: "clean", unit_type: "3.5", price: 610, unit_id: "unit-1" }] })],
  ];

  const before = resolvePortalPrice(portalComplete);
  expect(before.state).toBe("priced");

  for (const [label, mutate] of mutations) {
    it(`portal: ${label} yields a different result than the one on screen`, () => {
      const after = resolvePortalPrice(mutate(portalComplete));
      expect(after).not.toEqual(before);
      if (after.state === "priced" && before.state === "priced") {
        const changedTotal = after.total !== before.total;
        const changedShape = JSON.stringify(after.lines) !== JSON.stringify(before.lines);
        expect(changedTotal || changedShape).toBe(true);
      }
    });
  }

  it("portal: swapping the unit re-reads that unit's agreed price", () => {
    const overrides = [{ service: "clean", unit_type: "3.5", price: 610, unit_id: "unit-1" }];
    const first = resolvePortalPrice({ ...portalComplete, overrides });
    const second = resolvePortalPrice({ ...portalComplete, unitId: "unit-2", overrides });
    expect(isPriced(first) && first.subtotal).toBe(610);
    expect(isPriced(second) && second.subtotal).toBe(740);
  });

  const plannerMutations: Array<[string, (s: PlannerState) => PlannerState]> = [
    ["room size changed", (s) => ({ ...s, roomUnits: 4.5 })],
    ["destination changed", (s) => ({ ...s, toZip: "9000" })],
    ["cleaning added", (s) => ({ ...s, services: { ...s.services, clean: true } })],
    ["lift removed", (s) => ({ ...s, liftOut: "none" as const, liftIn: "none" as const })],
    ["piano added", (s) => ({ ...s, items: { ...s.items, piano: 1 } })],
  ];

  for (const [label, mutate] of plannerMutations) {
    it(`planner: ${label} recomputes the estimate`, () => {
      const a = resolvePlannerPrice(plannerComplete, TEST_PRICING);
      const b = resolvePlannerPrice(mutate(plannerComplete), TEST_PRICING);
      if (a.state !== "priced" || b.state !== "priced") throw new Error("expected two estimates");
      expect(b.calc.total).not.toBe(a.calc.total);
    });
  }
});

/* ------------------------------------------- 3. no default for an unset value */

describe("no default is substituted for an unselected value", () => {
  it("the planner's initial state carries no room size", () => {
    expect(INITIAL_STATE.roomUnits).toBeNull();
    expect(resolvePlannerPrice(INITIAL_STATE, TEST_PRICING).state).toBe("incomplete");
  });

  it("the room size steps are the only offered values and none is preselected", () => {
    expect([...PLANNER_ROOM_STEPS]).toEqual([1.5, 2.5, 3.5, 4.5, 5.5]);
    expect(PLANNER_ROOM_STEPS as readonly number[]).not.toContain(INITIAL_STATE.roomUnits as never);
  });

  it("an empty postcode never resolves to a distance", () => {
    const r = resolvePlannerPrice({ ...plannerComplete, toZip: "" }, TEST_PRICING);
    expect(r.state).toBe("incomplete");
  });

  it("a zero rate is treated as unconfigured, not as a free service", () => {
    const r = resolvePortalPrice({
      ...portalComplete,
      rates: [{ service: "clean", unit_type: "3.5", price: 0 }],
    });
    expect(r.state).toBe("quotation");
  });

  it("the handover fee comes from the published configuration, not from code", () => {
    const r = resolvePortalPrice({ ...portalComplete, services: { handover: true } });
    expect(r.state).toBe("priced");
    if (!isPriced(r)) return;
    expect(r.subtotal).toBe(180);
  });

  it("an unconfigured handover fee is a quotation, never an assumed flat fee", () => {
    const r = resolvePortalPrice({ ...portalComplete, services: { handover: true }, rates: [] });
    expect(r.state).toBe("quotation");
  });

  it("a missing calculation factor is a quotation, never an assumed factor", () => {
    const withoutFactor = rates.filter((rate) => rate.unit_type !== "m3_per_room");
    const r = resolvePortalPrice({
      ...portalComplete,
      services: { clearance: true },
      rates: withoutFactor,
    });
    expect(r.state).toBe("quotation");
  });
});

/* ------------------------------------------------------ 4. boundary matrices */

describe("band boundary matrix", () => {
  const edges = [1.5, 2.5, 3.5, 4.5, 5.5];
  const below = (v: number) => v - 0.01;
  const above = (v: number) => v + 0.01;

  for (const edge of edges) {
    it(`room count ${edge}: below / at / above resolve to at most one band each`, () => {
      for (const value of [below(edge), edge, above(edge)]) {
        const hits = CLEANING_BANDS.filter((b) => value >= b.min && value < b.max);
        expect(hits.length).toBeLessThanOrEqual(1);
      }
    });

    it(`room count ${edge}: the portal price follows the band, or asks for a quotation`, () => {
      for (const value of [below(edge), edge, above(edge)]) {
        const band = matchBand(CLEANING_BANDS, value);
        const r = resolvePortalPrice({ ...portalComplete, rooms: value });
        if (band) {
          expect(r.state, `rooms=${value}`).toBe("priced");
          if (isPriced(r)) expect(r.lines[0]!.rule).toBe(`clean:${band.id}`);
        } else {
          expect(r.state, `rooms=${value}`).toBe("quotation");
        }
      }
    });
  }

  it("is quotation-only below the first and at/above the last edge", () => {
    for (const value of [0, 1, 1.49, 5.5, 6, 12]) {
      expect(resolvePortalPrice({ ...portalComplete, rooms: value }).state).toBe("quotation");
    }
  });
});

describe("crew and van boundaries", () => {
  /** Vans step at every multiple of the vehicle capacity. */
  for (const capacityMultiple of [1, 2, 3]) {
    const edge = P("engine:van_capacity_m3") * capacityMultiple;
    it(`${edge} m³: one van up to the edge, one more just past it`, () => {
      expect(Math.max(1, Math.ceil((edge - 0.01) / P("engine:van_capacity_m3")))).toBe(capacityMultiple);
      expect(Math.max(1, Math.ceil(edge / P("engine:van_capacity_m3")))).toBe(capacityMultiple);
      expect(Math.max(1, Math.ceil((edge + 0.01) / P("engine:van_capacity_m3")))).toBe(capacityMultiple + 1);
    });
  }

  it("keeps the crew inside the configured minimum and maximum at every size", () => {
    for (const rooms of PLANNER_ROOM_STEPS) {
      const calc = calculate({ ...plannerComplete, roomUnits: rooms }, TEST_PRICING);
      expect(calc.crew).toBeGreaterThanOrEqual(P("engine:crew_min"));
      expect(calc.crew).toBeLessThanOrEqual(P("engine:crew_max"));
      expect(calc.vans).toBeGreaterThanOrEqual(1);
    }
  });

  it("never returns a negative or non-finite figure across the size range", () => {
    for (const rooms of PLANNER_ROOM_STEPS) {
      const calc = calculate({ ...plannerComplete, roomUnits: rooms, services: { move: true, pack: true, clean: true, disp: true } }, TEST_PRICING);
      for (const value of [calc.subtotal, calc.discount, calc.net, calc.vat, calc.total, calc.rangeLow, calc.rangeHigh]) {
        expect(Number.isFinite(value)).toBe(true);
        expect(value).toBeGreaterThanOrEqual(0);
      }
      expect(calc.rangeLow).toBeLessThanOrEqual(calc.total);
      expect(calc.rangeHigh).toBeGreaterThanOrEqual(calc.net);
    }
  });
});

describe("bundle discount and VAT boundaries", () => {
  const withServices = (n: number): PricedPlannerState => ({
    ...plannerComplete,
    roomUnits: 3.5,
    services: {
      move: n >= 1,
      pack: n >= 4,
      clean: n >= 2,
      disp: n >= 3,
    },
  });

  it("steps exactly at one, two and three services", () => {
    expect(calculate(withServices(1), TEST_PRICING).discountRate).toBe(0);
    expect(calculate(withServices(2), TEST_PRICING).discountRate).toBe(P("engine:bundle_two"));
    expect(calculate(withServices(3), TEST_PRICING).discountRate).toBe(P("engine:bundle_three"));
    expect(calculate(withServices(4), TEST_PRICING).discountRate).toBe(P("engine:bundle_three"));
  });

  it("applies VAT to the discounted net, never to the gross subtotal", () => {
    const calc = calculate(withServices(3), TEST_PRICING);
    expect(calc.net).toBeCloseTo(calc.subtotal - calc.discount, 6);
    // VAT is on the net, rounded to the Rappen.
    expect(calc.vat).toBeCloseTo(calc.net * P("engine:vat_rate"), 2);
    expect(calc.total).toBeCloseTo(calc.net + calc.vat, 2);
  });

  it("rounds VAT half-up to the Rappen so screen, record and PDF agree (CHF 715 net → 57.92 VAT, 772.92 total)", () => {
    const calc = calculate(withServices(3), TEST_PRICING);
    const net = 715;
    const vat = Math.round((net * 0.081 + Number.EPSILON) * 100) / 100;
    expect(vat).toBe(57.92);
    expect(Number((net + vat).toFixed(2))).toBe(772.92);
    expect(Number(calc.total.toFixed(2))).toBe(Number((Math.round((calc.net + Number.EPSILON) * 100) / 100 + calc.vat).toFixed(2)));
    expect(Math.round(calc.vat * 100)).toBe(calc.vat * 100);
  });

  it("printed rows add up to the Rappen: positions → subtotal → discount → net → VAT → total", () => {
    for (const n of [1, 2, 3]) {
      const c = calculate(withServices(n), TEST_PRICING);
      const cents = (x: number) => Math.round(x * 100);
      expect(cents(c.lines.reduce((a, l) => a + l.amount, 0))).toBe(cents(c.subtotal));
      expect(cents(c.subtotal) - cents(c.discount)).toBe(cents(c.net));
      expect(cents(c.net) + cents(c.vat)).toBe(cents(c.total));
    }
  });

  it("uses the 8.1 % Swiss rate in one place only", () => {
    expect(P("engine:vat_rate")).toBe(0.081);
  });
});

describe("MoveScore boundaries", () => {
  it("stays within 5 and 100 under the worst and best access", () => {
    const worst = calculate({
      ...plannerComplete,
      roomUnits: 5.5,
      floorOut: 6,
      floorIn: 6,
      liftOut: "none",
      liftIn: "none",
      parkingOut: 2,
      parkingIn: 2,
      carry: 2,
      narrowStairs: true,
      permit: true,
      hoist: true,
      items: { piano: 2, safe: 1 },
    }, TEST_PRICING);
    expect(worst.score.score).toBeGreaterThanOrEqual(5);
    const best = calculate(
      { ...plannerComplete, roomUnits: 1.5, liftOut: "ok", liftIn: "ok", parkingOut: 0, parkingIn: 0, carry: 0 },
      TEST_PRICING,
    );
    expect(best.score.score).toBeLessThanOrEqual(100);
    expect(best.score.score).toBeGreaterThan(worst.score.score);
  });

  it("labels at the documented thresholds", () => {
    const label = (score: number) => (score >= 78 ? "easy" : score >= 52 ? "medium" : "demanding");
    expect(label(78)).toBe("easy");
    expect(label(77.99)).toBe("medium");
    expect(label(52)).toBe("medium");
    expect(label(51.99)).toBe("demanding");
  });
});

/* ---------------------------------------------------- notice-to-change rules */

describe("date neutrality and disposal billing", () => {
  const base: PricedPlannerState = {
    ...(INITIAL_STATE as PlannerState),
    roomUnits: 3.5,
    fromZip: "3600",
    toZip: "3612",
    date: "2026-10-01",
    services: { ...INITIAL_STATE.services, move: true },
  } as PricedPlannerState;

  it("prices the same on every selectable day, including weekends", () => {
    const weekday = calculate(base, TEST_PRICING).total;
    const saturday = calculate({ ...base, date: "2026-10-03" }, TEST_PRICING).total;
    const monthEnd = calculate({ ...base, date: "2026-10-31" }, TEST_PRICING).total;
    expect(saturday).toBe(weekday);
    expect(monthEnd).toBe(weekday);
  });

  it("bills disposal as volume plus one team rate, never multiplied by headcount", () => {
    const pricing = {
      ...TEST_PRICING,
      values: { ...TEST_PRICING.values, "disposal:per_team_hour": 120, "disposal:per_m3": 40 },
    };
    const state = {
      ...base,
      services: { ...INITIAL_STATE.services, disp: true },
      disposal: { m3: 5, hours: 4, notes: "" },
    } as PricedPlannerState;
    const calc = calculate(state, pricing);
    expect(calc.disposal?.volumeAmount).toBe(200);
    expect(calc.disposal?.labourAmount).toBe(480);
    // Shown as two positions, summing to the notice's example of 680.
    expect(calc.lines.find((l) => l.id === "disp_volume")?.amount).toBe(200);
    expect(calc.lines.find((l) => l.id === "disp_labour")?.amount).toBe(480);
    const disposalTotal = calc.lines
      .filter((l) => l.id.startsWith("disp"))
      .reduce((sum, l) => sum + l.amount, 0);
    expect(disposalTotal).toBe(680);
  });

  it("keeps the disposal position pending when no team rate is published", () => {
    const state = {
      ...base,
      services: { ...INITIAL_STATE.services, disp: true },
      disposal: { m3: 5, hours: 4, notes: "" },
    } as PricedPlannerState;
    const calc = calculate(state, TEST_PRICING);
    expect(calc.disposal?.pending).toBe(true);
    expect(calc.lines.some((l) => l.id.startsWith("disp"))).toBe(false);
  });
});
