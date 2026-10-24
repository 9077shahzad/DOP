/**
 * Test fixture mirroring the published CH pricing configuration.
 *
 * This is a FIXTURE, not a fallback: nothing in the runtime imports it. It
 * exists so the boundary and invariant regression suite can pin behaviour to
 * a known price list without reaching the database.
 */

import type { PlannerPricing } from "@/lib/planner-pricing";

export const TEST_PRICING: PlannerPricing = {
  version: 3,
  effectiveFrom: "2026-01-01",
  currency: "CHF",
  values: {
    "move:base": 240,
    "move:per_m3": 62,
    "move:per_km": 2.2,
    "packing:base": 120,
    "packing:per_m3": 18,
    "endcleaning:base": 180,
    "endcleaning:per_room": 290,
    "disposal:base": 90,
    "disposal:per_m3": 110,
    "disposal:m3_share": 0.18,
    "disposal:min_m3": 2,
    "engine:vat_rate": 0.081,
    "engine:bundle_two": 0.05,
    "engine:bundle_three": 0.08,
    "engine:crew_m3_per_person_hour": 2.4,
    "engine:crew_min": 2,
    "engine:crew_max": 5,
    "engine:crew_m3_per_person": 9,
    "engine:van_capacity_m3": 18,
    "engine:boxes_per_room": 20,
    "engine:m3_per_room": 6.4,
    "engine:m3_per_room_extra": 1.4,
    "engine:travel_speed_kmh": 42,
    "engine:travel_overhead_min": 12,
    "engine:distance_km_per_zip": 0.055,
    "engine:distance_base_km": 4,
    "engine:distance_max_km": 180,
    "engine:clean_hours_base": 2.5,
    "engine:clean_hours_per_room": 0.6,
    "engine:peak_surcharge_pct": 15,
    "engine:range_low": 0.92,
    "engine:range_high": 1.1,
  },
};
