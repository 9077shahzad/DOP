/**
 * Staff editing of a complete offer.
 *
 * The edited planner state is re-priced with the same engine as the customer
 * wizard and the active price list (confirmed km kept). When the state is not
 * priceable — e.g. inventory without approved volume — no price is invented:
 * the offer is saved without a total. Every save is a new immutable version
 * with an audited history entry (`dop_update_offer`).
 */
import { supabase } from "@/integrations/supabase/client";
import type { Lang } from "@/i18n/config";
import type { PlannerState } from "@/lib/pricing";
import { rowToState, type PublicQuote, type QuoteRow } from "@/lib/quotes";

export function adminRowToState(quote: QuoteRow): PlannerState {
  const base = rowToState(quote as unknown as PublicQuote);
  return {
    ...base,
    name: quote.customer_name ?? "",
    company: quote.customer_company ?? "",
    phone: quote.customer_phone ?? "",
    email: quote.customer_email ?? "",
    customerStreet: quote.customer_street ?? "",
    customerZip: quote.customer_zip ?? "",
    customerCity: quote.customer_city ?? "",
    customerCountry: quote.customer_country ?? "",
    fromAddress: quote.from_address ?? "",
    toAddress: quote.to_address ?? "",
    notes: quote.customer_notes ?? "",
    contactLanguage: quote.language ?? "de",
  };
}

export type SaveResult = { version: number; priced: boolean; blocking: string[] };

export async function saveEditedOffer(
  quote: QuoteRow,
  state: PlannerState,
  reason: string,
  teamPlan: string,
): Promise<SaveResult> {
  const [{ fetchPlannerPricing }, { buildQuotePayload }, { resolvePlannerPrice, blockingInventory }, { calculate }, { fetchInventory }] =
    await Promise.all([
      import("@/lib/planner-pricing"),
      import("@/lib/quotes"),
      import("@/lib/price-resolution"),
      import("@/lib/pricing"),
      import("@/lib/inventory"),
    ]);
  const pricing = await fetchPlannerPricing("CH");
  const catalogue = await fetchInventory(true);
  const inventoryVolumes = Object.fromEntries(catalogue.map((item) => [item.key, Number(item.m3)]));
  const lang = (quote.language ?? "de") as Lang;
  const oldServices = (quote.services ?? {}) as Record<string, unknown>;
  const confirmedKm = quote.distance_source === "manual" || quote.distance_source === "routing" ? Number(quote.distance_km) : undefined;

  let payload: Record<string, unknown>;
  let priced = false;
  if (resolvePlannerPrice(state, pricing, inventoryVolumes).state === "priced" && pricing) {
    const s = state as Parameters<typeof calculate>[0];
    const calc = calculate(s, pricing, { inventoryVolumes, ...(confirmedKm != null ? { confirmedKm } : {}) });
    payload = buildQuotePayload(s, calc, lang) as unknown as Record<string, unknown>;
    priced = true;
  } else {
    // Operational fields only; the stored lines no longer apply.
    const fake = { lines: [], km: 0, m3: 0, boxes: 0, vans: 0, crew: 0, loadHours: 0, totalHours: 0, score: { score: 0, label: "" },
      net: 0, vat: 0, total: 0, rangeLow: 0, rangeHigh: 0, discountRate: 0, discount: 0, discountReason: null } as never;
    const p = buildQuotePayload({ ...state, roomUnits: state.roomUnits ?? 0 } as never, fake, lang) as unknown as Record<string, unknown>;
    if (state.roomUnits == null) p["room_units"] = null;
    for (const k of ["distance_km", "volume_m3", "boxes", "vans", "crew", "load_hours", "total_hours", "access_score", "score_label",
      "price_net", "price_vat", "price_total", "price_low", "price_high", "discount_rate"]) delete p[k];
    payload = p;
  }
  const newServices = (payload["services"] ?? {}) as Record<string, unknown>;
  payload["services"] = {
    ...oldServices,
    ...newServices,
    ...(priced ? {} : { lines: [], discount: null }),
    start_time: /^\d{2}:\d{2}$/.test(state.startTime) ? state.startTime : "08:00",
    team_plan: teamPlan.trim().slice(0, 1000),
    pricing_blocked_by: priced ? [] : blockingInventory(state.items, inventoryVolumes),
  };
  const { data, error } = await supabase.rpc("dop_update_offer" as never, {
    _quote_id: quote.id,
    _payload: payload,
    _reason: reason.trim(),
  } as never);
  if (error) throw error;
  return { version: Number(data), priced, blocking: priced ? [] : blockingInventory(state.items, inventoryVolumes) };
}
