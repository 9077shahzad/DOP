/**
 * Chargeable distance on a quotation.
 *
 * The postcode difference is a planning heuristic only (crew and duration
 * planning). The kilometres a customer is charged for must either come from a
 * routing provider or be confirmed by sales/dispatch, and a quotation with an
 * unconfirmed distance can never be sent.
 */

import { supabase } from "@/integrations/supabase/client";

export const DISTANCE_SOURCES = ["manual", "routing", "unconfirmed"] as const;
export type DistanceSource = (typeof DISTANCE_SOURCES)[number];

export type RouteDistance = {
  /** "external_input_required" until a routing provider is configured. */
  status: "external_input_required" | "provider_configured" | "resolved";
  provider: string | null;
  km: number | null;
  /** Driving time in minutes when a provider resolved the route. */
  minutes: number | null;
  source: DistanceSource;
};

/** Provider-agnostic routing integration point. Never invents kilometres. */
export async function resolveRouteDistance(
  origin: string,
  destination: string,
): Promise<RouteDistance> {
  const { data, error } = await supabase.rpc("resolve_route_distance", {
    _origin: origin,
    _destination: destination,
  });
  if (error) throw error;
  const r = (data ?? {}) as Record<string, unknown>;
  return {
    status: (r["status"] as RouteDistance["status"]) ?? "external_input_required",
    provider: (r["provider"] as string | null) ?? null,
    km: r["km"] == null ? null : Number(r["km"]),
    minutes: r["duration_min"] == null ? null : Number(r["duration_min"]),
    source: (r["source"] as DistanceSource) ?? "unconfirmed",
  };
}

/**
 * Visitor-safe route lookup for the public wizard. Returns no kilometres while
 * no routing provider is configured — the wizard then says the chargeable
 * distance is confirmed on the offer.
 */
export async function publicRouteDistance(
  origin: string,
  destination: string,
): Promise<RouteDistance> {
  const { data, error } = await supabase.rpc("public_route_distance", {
    _origin: origin,
    _destination: destination,
  });
  if (error) throw error;
  const r = (data ?? {}) as Record<string, unknown>;
  return {
    status: (r["status"] as RouteDistance["status"]) ?? "external_input_required",
    provider: null,
    km: r["km"] == null ? null : Number(r["km"]),
    minutes: r["duration_min"] == null ? null : Number(r["duration_min"]),
    source: (r["source"] as DistanceSource) ?? "unconfirmed",
  };
}

/** Records the authorised chargeable distance for a quotation. */
export async function setQuoteDistance(
  quoteId: string,
  km: number,
  source: Exclude<DistanceSource, "unconfirmed"> = "manual",
): Promise<{ km: number; source: DistanceSource }> {
  const { data, error } = await supabase.rpc("set_quote_distance", {
    _quote_id: quoteId,
    _km: km,
    _source: source,
  });
  if (error) throw error;
  const row = (Array.isArray(data) ? data[0] : data) as Record<string, unknown>;
  return {
    km: Number(row?.["distance_km"] ?? km),
    source: (row?.["distance_source"] as DistanceSource) ?? source,
  };
}

/** Marks the quotation as sent. Refused while the distance is unconfirmed. */
export async function markQuoteSent(reference: string): Promise<void> {
  const { error } = await supabase.rpc("send_quote", { _reference: reference });
  if (error) throw error;
}

/** Maps a database refusal to a translation key the UI can show. */
export function distanceErrorKey(message: string): string {
  if (message.includes("distance_unconfirmed")) return "quotes.distance.unconfirmedError";
  if (message.includes("distance_above_maximum")) return "quotes.distance.aboveMaximum";
  if (message.includes("invalid_distance")) return "quotes.distance.invalid";
  return "quotes.saveError";
}

/**
 * Confirms (or changes) the chargeable distance and fully re-prices the offer
 * with it: km × published per-km rate, discount, four-hour rule and VAT as
 * usual. The result is a new offer version with a history entry; accepted
 * offers stay frozen. An offer that was never calculated only records the km.
 */
export async function confirmQuoteDistance(
  row: import("@/lib/quotes").QuoteRow,
  km: number,
  source: Exclude<DistanceSource, "unconfirmed"> = "manual",
): Promise<number> {
  const [{ fetchPlannerPricing }, { rowToState, buildQuotePayload }, { resolvePlannerPrice }, { calculate, planningDistanceHeuristic }, { fetchInventory }] =
    await Promise.all([
      import("@/lib/planner-pricing"),
      import("@/lib/quotes"),
      import("@/lib/price-resolution"),
      import("@/lib/pricing"),
      import("@/lib/inventory"),
    ]);
  const pricing = await fetchPlannerPricing("CH");
  const oldServices = (row.services ?? {}) as Record<string, unknown>;
  const calculated = Array.isArray(oldServices["lines"]) && (oldServices["lines"] as unknown[]).length > 0;
  let payload: Record<string, unknown> | null = null;
  let planningKm: number | null = null;
  if (calculated && pricing) {
    const state = rowToState(row as never);
    const catalogue = await fetchInventory(true);
    const inventoryVolumes = Object.fromEntries(catalogue.map((item) => [item.key, Number(item.m3)]));
    if (resolvePlannerPrice(state, pricing, inventoryVolumes).state === "priced") {
      const priced = state as Parameters<typeof calculate>[0];
      const calc = calculate(priced, pricing, { confirmedKm: km, inventoryVolumes });
      planningKm = state.services.move ? planningDistanceHeuristic(state.fromZip, state.toZip, pricing).km : null;
      const p = buildQuotePayload(priced, calc, (row.language ?? "de") as never);
      payload = { ...p, services: { ...oldServices, ...p.services } };
    }
  }
  const { data, error } = await supabase.rpc("dop_confirm_distance", {
    _quote_id: row.id,
    _km: km,
    _source: source,
    _payload: payload as never,
    _planning_km: planningKm as never,
  });
  if (error) throw error;
  return Number(data);
}
