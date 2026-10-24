/**
 * Planner pricing parameters — the SAME published pricing configuration the
 * portal reads, projected for the public estimator.
 *
 * There is no code-side fallback on purpose: if the published configuration
 * does not contain a parameter, the estimator produces no figure at all and
 * the inquiry is captured as a request for an offer. A hardcoded default is
 * exactly the divergence between planner and portal this module removes.
 */

import { supabase } from "@/integrations/supabase/client";

/** Every parameter the estimator needs, as `service:unit_type`. */
export const PLANNER_PARAM_KEYS = [
  "move:base",
  "move:per_m3",
  "move:per_km",
  "packing:base",
  "packing:per_m3",
  "endcleaning:base",
  "endcleaning:per_room",
  "disposal:per_m3",
  "disposal:m3_share",
  "disposal:min_m3",
  "engine:vat_rate",
  "engine:bundle_two",
  "engine:bundle_three",
  "engine:crew_m3_per_person_hour",
  "engine:crew_min",
  "engine:crew_max",
  "engine:crew_m3_per_person",
  "engine:van_capacity_m3",
  "engine:boxes_per_room",
  "engine:m3_per_room",
  "engine:m3_per_room_extra",
  "engine:travel_speed_kmh",
  "engine:travel_overhead_min",
  "engine:distance_km_per_zip",
  "engine:distance_base_km",
  "engine:distance_max_km",
  "engine:clean_hours_base",
  "engine:clean_hours_per_room",
  "engine:peak_surcharge_pct",
  "engine:range_low",
  "engine:range_high",
] as const;

export type PlannerParamKey = (typeof PLANNER_PARAM_KEYS)[number];

/**
 * Parameters that may be absent. They are versioned exactly like every other
 * price-list value, but a configuration without them stays usable: an hourly
 * tariff that the owner has not signed off must not block the estimator, it
 * must only prevent an hourly offer from being priced.
 *
 * `cost:per_person_hour` is an internal staffing cost. The public projection
 * never carries it — it is excluded in the database function as well, so it
 * cannot reach a customer document even by accident.
 */
export const OPTIONAL_PARAM_KEYS = [
  "labour:per_person_hour",
  "labour:per_team_hour",
  // Hourly rate of the two-person disposal/clearance team. Without it the
  // disposal position stays an inquiry instead of an invented package price.
  "disposal:per_team_hour",
  "cost:per_person_hour",
  // Approved cleaning surcharges. A surcharge that the price list does not
  // carry is never charged and never silently treated as included.
  "cleanextra:balcony",
  "cleanextra:pressure",
  "cleanextra:cellar",
  "cleanextra:garage",
  "cleanextra:carpet_shampoo",
  "cleanextra:window_free",
  "cleanextra:window_normal",
  "cleanextra:window_large",
  "cleanextra:lamellen",
  // Dübellöcher spachteln, charged per hole.
  "cleanextra:dowel_hole",
  // Approved moving surcharges.
  "moveextra:furniture_assembly",
  "moveextra:furniture_assembly_min_rooms",
  "moveextra:piano_transport",
  "moveextra:lamp_installation",
  // Verpackungsmaterial delivered and collected by PS Umzug AG (once per offer).
  "moveextra:packing_material_delivery",
  // Location discount for addresses in Steffisburg (fraction, e.g. 0.05).
  "engine:discount_steffisburg",
] as const;


export type OptionalParamKey = (typeof OPTIONAL_PARAM_KEYS)[number];

/** Parameter keys that must never appear in a customer-facing projection. */
export const INTERNAL_ONLY_PARAM_KEYS = ["cost:per_person_hour"] as const;

/** Reads an optional parameter; null when the price list does not carry it. */
export function optionalParam(pricing: PlannerPricing, key: OptionalParamKey): number | null {
  const value = pricing.values[key];
  return Number.isFinite(value) ? (value as number) : null;
}

/**
 * The minimum-duration rule of a price-list version.
 *
 * The basis is a validated word, not a number: it is stored as `person` or
 * `team` on the configuration itself, so it can never be read as a price and
 * always travels with the version it belongs to.
 */
export type MinimumBillingPolicy = {
  minHours: number;
  basis: "person" | "team";
};

export function parseMinimumBillingPolicy(row: {
  min_hours: number | string | null;
  min_hours_basis: string | null;
}): MinimumBillingPolicy | null {
  const minHours = Number(row.min_hours);
  const basis = row.min_hours_basis;
  if (!Number.isFinite(minHours) || minHours <= 0) return null;
  if (basis !== "person" && basis !== "team") return null;
  return { minHours, basis };
}

export type PlannerPricing = {
  /** Published configuration version the figures come from. */
  version: number;
  /** Date that version became effective. */
  effectiveFrom: string;
  currency: string;
  values: Record<string, number>;
  /** Minimum-duration rule of this version, absent when it carries none. */
  minimumBilling?: MinimumBillingPolicy | null;
};

export type PricingRuleRow = {
  version: number;
  effective_from: string;
  service: string;
  unit_type: string;
  price: number | string;
  currency: string;
};

export function buildPlannerPricing(
  rows: PricingRuleRow[],
  minimumBilling: MinimumBillingPolicy | null = null,
): PlannerPricing | null {
  if (rows.length === 0) return null;
  const values: Record<string, number> = {};
  for (const row of rows) {
    const value = Number(row.price);
    if (Number.isFinite(value)) values[`${row.service}:${row.unit_type}`] = value;
  }
  const first = rows[0]!;
  const pricing: PlannerPricing = {
    version: Number(first.version),
    effectiveFrom: first.effective_from,
    currency: first.currency ?? "CHF",
    values,
    minimumBilling,
  };
  return missingParams(pricing).length === 0 ? pricing : null;
}

export function missingParams(pricing: PlannerPricing): PlannerParamKey[] {
  return PLANNER_PARAM_KEYS.filter((key) => !Number.isFinite(pricing.values[key]));
}

/** Reads a parameter. Callers only ever hold a complete `PlannerPricing`. */
export function param(pricing: PlannerPricing, key: PlannerParamKey): number {
  const value = pricing.values[key];
  if (!Number.isFinite(value)) throw new Error(`pricing_param_missing:${key}`);
  return value as number;
}

/** Published estimator parameters of the active market. Null when none is live. */
export async function fetchPlannerPricing(market = "CH"): Promise<PlannerPricing | null> {
  const { data, error } = await supabase.rpc("public_planner_pricing", { _market: market });
  if (error) return null;
  const { data: policyRows } = await supabase.rpc("public_minimum_billing", { _market: market });
  const policy = Array.isArray(policyRows) && policyRows[0] ? parseMinimumBillingPolicy(policyRows[0]) : null;
  return buildPlannerPricing((data ?? []) as PricingRuleRow[], policy);
}
