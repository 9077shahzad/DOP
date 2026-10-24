/**
 * Price resolution — one state machine for every pricing surface.
 *
 * Three states, always distinguishable, never collapsed into a number:
 *   incomplete  — one or more price-driving inputs are unset. NO price at all.
 *   priced      — every input is set and a rule matched. The rule and the
 *                 scope that produced the figure travel with the result.
 *   quotation   — every input is set but no rule matches. Never extrapolate,
 *                 never round to the nearest band, never borrow a neighbour.
 *
 * A placeholder in the UI ("Bitte wählen") must map to `null` here. A default
 * hiding behind a label is the defect this module exists to prevent.
 */

import { calculate, planningDistanceHeuristic, ITEMS, type Calculation, type PlannerState } from "@/lib/pricing";
import type { PlannerPricing } from "@/lib/planner-pricing";

/**
 * Swiss statutory VAT. A legal rate, not a commercial price — the published
 * configuration still overrides it via the `engine`/`vat_rate` row.
 */
export const SWISS_VAT_RATE = 0.081;

/* ------------------------------------------------------------------ stages */

/** The four commercial stages, in order. Stored on the record, shown on screen. */
export const STAGES = ["richtwert", "offerte", "vertragspreis", "rechnung"] as const;
export type PriceStage = (typeof STAGES)[number];

/* ------------------------------------------------------------------- bands */

/**
 * Half-open band: matches `min <= value < max`. Half-open is what makes
 * contiguity provable — every value in [first.min, last.max) matches exactly
 * one band, with no gap and no overlap. `auditBands` proves it.
 */
export type Band = { id: string; min: number; max: number };

export type BandAudit = {
  gaps: { after: string; from: number; to: number }[];
  overlaps: { a: string; b: string; from: number; to: number }[];
};

export function auditBands(bands: Band[]): BandAudit {
  const sorted = [...bands].sort((a, b) => a.min - b.min);
  const gaps: BandAudit["gaps"] = [];
  const overlaps: BandAudit["overlaps"] = [];
  for (let i = 1; i < sorted.length; i += 1) {
    const prev = sorted[i - 1]!;
    const cur = sorted[i]!;
    if (cur.min > prev.max) gaps.push({ after: prev.id, from: prev.max, to: cur.min });
    if (cur.min < prev.max) overlaps.push({ a: prev.id, b: cur.id, from: cur.min, to: prev.max });
  }
  return { gaps, overlaps };
}

export function matchBand(bands: Band[], value: number | null): Band | null {
  if (value == null || !Number.isFinite(value)) return null;
  return bands.find((band) => value >= band.min && value < band.max) ?? null;
}

/**
 * Reference cleaning bands: the shape a published configuration must keep.
 * Used by the boundary regression suite and as the seed for a new
 * configuration — never as a runtime fallback for a missing configuration.
 */
export const CLEANING_BANDS: Band[] = [
  { id: "1.5-2.5", min: 1.5, max: 2.5 },
  { id: "2.5-3.5", min: 2.5, max: 3.5 },
  { id: "3.5", min: 3.5, max: 4.5 },
  { id: "4.5", min: 4.5, max: 5.5 },
];

/** Planner size steps offered in the UI. 5.5 means "5.5 or more". */
export const PLANNER_ROOM_STEPS = [1.5, 2.5, 3.5, 4.5, 5.5] as const;

/**
 * Bundle discount tiers, built from the published configuration. Callers that
 * hold no configuration get no discount — never an assumed one.
 */
export function discountTiers(rates: RateRow[]): { minServices: number; rate: number }[] {
  const value = (unitType: string) =>
    Number(rates.find((r) => r.service === "engine" && r.unit_type === unitType)?.price ?? 0);
  return [
    { minServices: 3, rate: value("bundle_three") },
    { minServices: 2, rate: value("bundle_two") },
    { minServices: 0, rate: 0 },
  ];
}

export function bundleDiscountRate(serviceCount: number, rates: RateRow[] = []): number {
  return discountTiers(rates).find((tier) => serviceCount >= tier.minServices)?.rate ?? 0;
}

/* -------------------------------------------------------------- resolution */

/** Which layer produced a figure. Shown next to the price, never implied. */
export type RuleScope =
  | "unit_override"
  | "property_override"
  | "org_override"
  | "framework_rate"
  | "config";

export type ResolvedLine = {
  id: string;
  labelKey: string;
  params: Record<string, string | number>;
  amount: number;
  /** Which rule matched, e.g. `clean:2.5-3.5`. Empty for quotation lines. */
  rule: string;
  scope: RuleScope | null;
  quotation: boolean;
};

export type PriceResolution =
  | {
      state: "incomplete";
      /** i18n key suffixes of the inputs still unset, e.g. ["unit", "rooms"]. */
      missing: string[];
    }
  | {
      state: "quotation";
      reason: "no_matching_rule" | "no_rate_configured";
      /** Lines that could be priced anyway, kept for transparency. */
      lines: ResolvedLine[];
      detail: Record<string, string | number>;
    }
  | {
      state: "priced";
      stage: PriceStage;
      lines: ResolvedLine[];
      subtotal: number;
      discountRate: number;
      discount: number;
      net: number;
      vat: number;
      total: number;
      /** The dominant scope across the priced lines. */
      scope: RuleScope;
    };

export function isPriced(r: PriceResolution): r is Extract<PriceResolution, { state: "priced" }> {
  return r.state === "priced";
}

function totals(
  lines: ResolvedLine[],
  discountRate: number,
  stage: PriceStage,
  scope: RuleScope,
  vatRate: number = SWISS_VAT_RATE,
) {
  const subtotal = round2(lines.reduce((sum, line) => sum + line.amount, 0));
  const discount = round2(subtotal * discountRate);
  const net = round2(subtotal - discount);
  const vat = round2(net * vatRate);
  return {
    state: "priced" as const,
    stage,
    lines,
    subtotal,
    discountRate,
    discount,
    net,
    vat,
    total: round2(net + vat),
    scope,
  };
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/* ------------------------------------------------- portal changeover prices */

export type RateRow = { service: string; unit_type: string; price: number | string };

/** A property-, unit- or organisation-level agreed price. Narrowest wins. */
export type PriceOverride = {
  service: string;
  unit_type: string;
  price: number | string;
  unit_id?: string | null;
  property_id?: string | null;
};

export type PortalServiceKey = "clean" | "clearance" | "repairs" | "handover";

export type PortalPriceInput = {
  /** null until the manager picks a unit — never a default. */
  unitId: string | null;
  /** The selected unit's own room count. null when not recorded. */
  rooms: number | null;
  services: Partial<Record<PortalServiceKey, boolean>>;
  /**
   * Every figure the calculation may use, from the published pricing
   * configuration in force. Prices AND calculation factors both live here —
   * `clearance/m3_per_room`, `repairs/hours_per_job`, `handover/flat`. A factor
   * that is not configured produces a quotation line, never an assumed number.
   */
  rates: RateRow[];
  overrides?: PriceOverride[];
  /** Bands from the published pricing configuration. No fallback. */
  bands?: Band[];
  discountRate: number;
  stage?: PriceStage;
};

function rateOf(rates: RateRow[], service: string, unitType: string): number {
  return Number(rates.find((r) => r.service === service && r.unit_type === unitType)?.price ?? 0);
}

function overrideFor(
  overrides: PriceOverride[] | undefined,
  unitId: string | null,
  service: string,
  unitType: string,
): { price: number; scope: RuleScope } | null {
  if (!overrides?.length) return null;
  const matches = overrides.filter(
    (o) => o.service === service && (o.unit_type === "" || o.unit_type === unitType),
  );
  const unitLevel = matches.find((o) => unitId != null && o.unit_id === unitId);
  if (unitLevel) return { price: Number(unitLevel.price), scope: "unit_override" };
  const propertyLevel = matches.find((o) => o.property_id != null && o.unit_id == null);
  if (propertyLevel) return { price: Number(propertyLevel.price), scope: "property_override" };
  const orgLevel = matches.find((o) => o.property_id == null && o.unit_id == null);
  if (orgLevel) return { price: Number(orgLevel.price), scope: "org_override" };
  return null;
}

/**
 * Portal changeover pricing. Returns `incomplete` before a unit is chosen and
 * `quotation` for a unit whose room count is unrecorded or outside every band.
 */
export function resolvePortalPrice(input: PortalPriceInput): PriceResolution {
  const missing: string[] = [];
  if (!input.unitId) missing.push("unit");
  const selectedServices = (Object.keys(input.services) as PortalServiceKey[]).filter(
    (key) => input.services[key],
  );
  if (selectedServices.length === 0) missing.push("services");
  if (missing.length > 0) return { state: "incomplete", missing };

  // No fallback: bands come from the published configuration or there are none.
  const band = matchBand(input.bands ?? [], input.rooms);
  const lines: ResolvedLine[] = [];
  let quotation = false;
  let scope: RuleScope = "framework_rate";

  if (input.services.clean) {
    const override = band ? overrideFor(input.overrides, input.unitId, "clean", band.id) : null;
    const price = override?.price ?? (band ? rateOf(input.rates, "clean", band.id) : 0);
    if (band && price > 0) {
      if (override) scope = override.scope;
      lines.push({
        id: "clean",
        labelKey: "newJob.line.clean",
        params: { unitType: String(input.rooms) },
        amount: price,
        rule: `clean:${band.id}`,
        scope: override?.scope ?? "framework_rate",
        quotation: false,
      });
    } else {
      quotation = true;
      lines.push({
        id: "clean",
        labelKey: "newJob.line.cleanQuotation",
        params: { rooms: input.rooms == null ? "—" : String(input.rooms) },
        amount: 0,
        rule: "",
        scope: null,
        quotation: true,
      });
    }
  }

  if (input.services.clearance) {
    const ratePerM3 = Number(
      overrideFor(input.overrides, input.unitId, "clearance", "per_m3")?.price ??
        rateOf(input.rates, "clearance", "per_m3"),
    );
    const m3PerRoom = rateOf(input.rates, "clearance", "m3_per_room");
    if (input.rooms != null && ratePerM3 > 0 && m3PerRoom > 0) {
      const m3 = Math.round(input.rooms * m3PerRoom * 10) / 10;
      lines.push({
        id: "clearance",
        labelKey: "newJob.line.clearance",
        params: { m3 },
        amount: round2(m3 * ratePerM3),
        rule: "clearance:per_m3",
        scope: "framework_rate",
        quotation: false,
      });
    } else {
      quotation = true;
      lines.push({
        id: "clearance",
        labelKey: "newJob.line.clearanceQuotation",
        params: {},
        amount: 0,
        rule: "",
        scope: null,
        quotation: true,
      });
    }
  }

  if (input.services.repairs) {
    const perHour = rateOf(input.rates, "repairs", "per_hour");
    const hours = rateOf(input.rates, "repairs", "hours_per_job");
    if (perHour > 0 && hours > 0) {
      lines.push({
        id: "repairs",
        labelKey: "newJob.line.repairs",
        params: { hours },
        amount: round2(perHour * hours),
        rule: "repairs:per_hour",
        scope: "framework_rate",
        quotation: false,
      });
    } else {
      quotation = true;
      lines.push({
        id: "repairs",
        labelKey: "newJob.line.repairsQuotation",
        params: {},
        amount: 0,
        rule: "",
        scope: null,
        quotation: true,
      });
    }
  }

  if (input.services.handover) {
    const flat = Number(
      overrideFor(input.overrides, input.unitId, "handover", "flat")?.price ??
        rateOf(input.rates, "handover", "flat"),
    );
    if (flat > 0) {
      lines.push({
        id: "handover",
        labelKey: "newJob.line.handover",
        params: {},
        amount: flat,
        rule: "handover:flat",
        scope: "framework_rate",
        quotation: false,
      });
    } else {
      quotation = true;
      lines.push({
        id: "handover",
        labelKey: "newJob.line.handoverQuotation",
        params: {},
        amount: 0,
        rule: "",
        scope: null,
        quotation: true,
      });
    }
  }

  if (quotation) {
    return {
      state: "quotation",
      reason: input.rooms == null ? "no_rate_configured" : "no_matching_rule",
      lines,
      detail: { rooms: input.rooms == null ? "—" : String(input.rooms) },
    };
  }

  const configuredVat = Number(
    input.rates.find((r) => r.service === "engine" && r.unit_type === "vat_rate")?.price ?? 0,
  );
  return totals(
    lines,
    input.discountRate,
    input.stage ?? "vertragspreis",
    scope,
    configuredVat > 0 ? configuredVat : SWISS_VAT_RATE,
  );
}

/* ------------------------------------------------------- planner estimation */

/**
 * Inventory keys that hold back the automatic Richtpreis: counted items
 * without an approved volume. No volume is ever invented for them.
 */
export function blockingInventory(items: Record<string, number>, inventoryVolumes?: Record<string, number>): string[] {
  return Object.entries(items ?? {})
    .filter(([id, qty]) => Number(qty) > 0 &&
      (ITEMS.find((item) => item.id === id)?.volumePending || !ITEMS.some((item) => item.id === id)) &&
      (inventoryVolumes?.[id] ?? 0) <= 0)
    .map(([id]) => id);
}

/** Which planner inputs must be set before any figure may be shown. */
export function plannerMissingInputs(state: PlannerState, inventoryVolumes?: Record<string, number>): string[] {
  const missing: string[] = [];
  const { move, clean, disp } = state.services;
  // Only what the chosen services actually price. A cleaning-only or
  // disposal-only request is never held back by a moving destination.
  if (move && state.roomUnits == null) missing.push("rooms");
  // A cleaning-only request records its size inside the cleaning checklist.
  if (clean && !move && state.cleaning.roomUnits == null && state.roomUnits == null) {
    missing.push("cleanRooms");
  }
  if (state.fromZip.trim().length < 4) missing.push("fromZip");
  if (move && state.toZip.trim().length < 4) missing.push("toZip");
  if (move && blockingInventory(state.items, inventoryVolumes).length > 0) missing.push("inventoryVolume");
  if (disp) {
    if (state.disposal.m3 == null) missing.push("disposalVolume");
    if (state.disposal.hours == null) missing.push("disposalHours");
  }
  if (!Object.values(state.services).some(Boolean)) missing.push("services");
  return missing;
}


export type PlannerResolution =
  | { state: "incomplete"; missing: string[] }
  /** No published pricing configuration is in force — an inquiry, not a price. */
  | { state: "unavailable" }
  | { state: "priced"; stage: PriceStage; calc: Calculation };

/**
 * Planner output is a Richtwert — an indicative estimate, never a total.
 * With any price-driving input unset it produces nothing at all.
 */
export function resolvePlannerPrice(
  state: PlannerState,
  pricing: PlannerPricing | null,
  inventoryVolumes?: Record<string, number>,
): PlannerResolution {
  const missing = plannerMissingInputs(state, inventoryVolumes);
  if (missing.length > 0) return { state: "incomplete", missing };
  if (!pricing) return { state: "unavailable" };
  return {
    state: "priced",
    stage: "richtwert",
    calc: calculate(state as PlannerState & { roomUnits: number }, pricing, inventoryVolumes ? { inventoryVolumes } : {}),
  };
}

export { planningDistanceHeuristic };
