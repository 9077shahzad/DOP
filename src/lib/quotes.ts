import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { Lang } from "@/i18n/config";
import { param, type PlannerPricing } from "@/lib/planner-pricing";
import { zuegelterminInfoFromIso } from "@/lib/zuegeltermine";
import {
  EMPTY_CLEANING,
  EMPTY_DISPOSAL,
  effectiveCleaning,
  FIXED_START_TIME,
  INITIAL_STATE,
  zuegelScore,
  type Calculation,
  type CleaningChecklist,
  type DisposalCalculation, type MoveBreakdown,
  type DisposalDetails,
  type Level,
  type LineId,
  type Lift,
  type PlannerState,
  type PropertyType,
  type PricedPlannerState,
  TRACE_RULES,
} from "@/lib/pricing";

export type QuoteRow = Database["public"]["Tables"]["quotes"]["Row"];

/**
 * What a quote reference may reveal. The reference is a capability
 * identifier, so the public projection is minimised by design: sizes, scores,
 * dates and the stored prices only. No name, company, phone, e-mail, street
 * address, internal id, partner, cost, margin or operational field.
 */
export type PublicQuote = Database["public"]["Functions"]["get_public_quote"]["Returns"][number];

type StoredAccess = {
  liftOut?: Lift;
  liftIn?: Lift;
  parkingOut?: Level;
  parkingIn?: Level;
  permitIn?: boolean;
  hoistIn?: boolean;
  carryIn?: Level;
  narrowStairsIn?: boolean;
};

type StoredServices = {
  move?: boolean;
  pack?: boolean;
  clean?: boolean;
  disp?: boolean;
  lines?: { id: LineId; amount: number }[];
  /** Lift and parking per address, recorded separately. */
  access?: StoredAccess;
  extras?: string[];
  cleaning?: CleaningChecklist | null;
  disposal?: DisposalDetails | null;
  disposal_calc?: DisposalCalculation;
  move_calc?: MoveBreakdown;
  clean_date?: string | null;
  /** Number of lamps to mount; only meaningful with `lamp_installation`. */
  lamp_count?: number;
  /** Fixed 08:00 start, stored so the record states it rather than implies it. */
  start_time?: string;
  /** "self" or "delivery" — only with packing_material. */
  packing_material_option?: "" | "self" | "delivery";
  /** Town and canton of both addresses, derived from the postcode directory. */
  places?: { fromCity?: string; fromCanton?: string; toCity?: string; toCanton?: string };
  /** Which single discount applied, frozen with the offer. */
  discount?: { reason: "bundle" | "steffisburg"; rate: number; amount: number };
};


/**
 * Persist the planner state together with a frozen snapshot of the
 * calculation. Prices are stored as calculated under the published pricing
 * configuration in force today: publishing a new version later must never
 * rewrite what a customer was told.
 */
export function buildQuotePayload(state: PricedPlannerState, calc: Calculation, lang: Lang) {
  return {
      language: lang,
      customer_name: state.name,
      customer_company: state.company,
      customer_phone: state.phone,
      customer_email: state.email,
      customer_street: state.customerStreet || state.fromAddress,
      customer_zip: state.customerZip || state.fromZip,
      customer_city: state.customerCity || state.fromCity,
      customer_country: state.customerCountry || "CH",
      customer_notes: state.notes.trim().slice(0, 4000),
      from_address: state.fromAddress,
      from_zip: state.fromZip,
      to_address: state.toAddress,
      to_zip: state.toZip,
      room_units: state.roomUnits,
      floor_out: state.floorOut,
      floor_in: state.floorIn,
      // The stored single-value columns keep the departure address; both
      // addresses travel in full inside `services.access`.
      lift: state.liftOut,
      property_type: state.propertyType,
      parking: state.parkingOut,
      carry: state.carry,
      narrow_stairs: state.narrowStairs,
      permit: state.permit,
      hoist: state.hoist,
      services: {
        ...state.services,
        lines: calc.lines,
        access: {
          liftOut: state.liftOut,
          liftIn: state.liftIn,
          parkingOut: state.parkingOut,
          parkingIn: state.parkingIn,
          ...(state.services.move ? { permitIn: state.permitIn, hoistIn: state.hoistIn, carryIn: state.carryIn, narrowStairsIn: state.narrowStairsIn } : {}),
        },
        extras: state.extras,
        packing_material_option: state.extras.includes("packing_material") ? state.packingMaterialOption : "",
        places: {
          fromCity: state.fromCity,
          fromCanton: state.fromCanton,
          ...(state.services.move ? { toCity: state.toCity, toCanton: state.toCanton } : {}),
        },
        ...(calc.discountReason
          ? { discount: { reason: calc.discountReason, rate: calc.discountRate, amount: Number(calc.discount.toFixed(2)) } }
          : {}),
        cleaning: state.services.clean ? effectiveCleaning(state.services.move
          ? { ...state.cleaning, propertyType: state.propertyType, roomUnits: state.roomUnits }
          : state.cleaning) : null,
        disposal: state.services.disp ? state.disposal : null,
        clean_date: state.cleanDate,
        lamp_count: state.extras.includes("lamp_installation") ? state.lampCount : 0,
        start_time: FIXED_START_TIME,
        ...(calc.disposal ? { disposal_calc: calc.disposal } : {}),
        ...(calc.moveBreakdown ? { move_calc: calc.moveBreakdown } : {}),
      } satisfies StoredServices,
      items: state.items,
      move_date: state.date ?? "",
      distance_km: calc.km,
      volume_m3: Number(calc.m3.toFixed(2)),
      boxes: calc.boxes,
      vans: calc.vans,
      crew: calc.crew,
      load_hours: Number(calc.loadHours.toFixed(2)),
      total_hours: Number(calc.totalHours.toFixed(2)),
      access_score: calc.score.score,
      score_label: calc.score.label,
      price_net: Number(calc.net.toFixed(2)),
      price_vat: Number(calc.vat.toFixed(2)),
      price_total: Number(calc.total.toFixed(2)),
      price_low: Number(calc.rangeLow.toFixed(2)),
      price_high: Number(calc.rangeHigh.toFixed(2)),
      discount_rate: calc.discountRate,
  };
}

export async function createQuote(
  state: PricedPlannerState,
  calc: Calculation,
  lang: Lang,
): Promise<string> {
  const { data, error } = await supabase.rpc("create_quote", {
    payload: buildQuotePayload(state, calc, lang),
  });

  if (error || !data) {
    throw new Error(error?.message ?? "quote_insert_failed");
  }
  return data;
}


export async function createEnquiry(input: {
  name: string;
  phone: string;
  email: string;
  fromText: string;
  toText: string;
  preferredDate: string | null;
  message: string;
  language: Lang;
}): Promise<void> {
  // Direct table writes are revoked; intake goes through a validating routine.
  const { error } = await supabase.rpc("create_enquiry", {
    payload: {
      name: input.name,
      phone: input.phone,
      email: input.email,
      from_text: input.fromText,
      to_text: input.toText,
      preferred_date: input.preferredDate || null,
      message: input.message,
      language: input.language,
    },
  });
  if (error) throw new Error(error.message);
}


/**
 * Identity block of a stored quote. Released by the database only to whoever
 * proves the contact the quote was requested with — the public projection
 * still carries no name and no address.
 */
export type QuoteCustomer = {
  name: string;
  company: string;
  street: string;
  zip: string;
  city: string;
  country: string;
  email: string;
  phone: string;
  fromAddress: string;
  toAddress: string;
  notes: string;
};

export async function fetchQuoteCustomer(
  reference: string,
  contact: string,
): Promise<QuoteCustomer | null> {
  const { data, error } = await supabase.rpc("get_quote_customer", {
    _reference: reference,
    _contact: contact,
  });
  const row = Array.isArray(data) ? data[0] : null;
  if (error || !row) return null;
  return {
    name: row.customer_name ?? "",
    company: row.customer_company ?? "",
    street: row.customer_street ?? "",
    zip: row.customer_zip ?? "",
    city: row.customer_city ?? "",
    country: row.customer_country ?? "",
    email: row.customer_email ?? "",
    phone: row.customer_phone ?? "",
    fromAddress: row.from_address ?? "",
    toAddress: row.to_address ?? "",
    notes: row.customer_notes ?? "",
  };
}

export function rowToState(row: PublicQuote): PlannerState {
  const services = (row.services ?? {}) as StoredServices;
  return {
    ...INITIAL_STATE,
    // Street addresses are deliberately not returned by the public lookup.
    fromAddress: "",
    fromZip: row.from_zip ?? "",
    toAddress: "",
    toZip: row.to_zip ?? "",
    roomUnits: row.room_units == null ? null : Number(row.room_units),
    floorOut: row.floor_out ?? 0,
    floorIn: row.floor_in ?? 0,
    // Offers made before the two addresses were recorded separately carry one
    // answer; it then stands for both sides, exactly as it was quoted.
    liftOut: (services.access?.liftOut ?? row.lift ?? "ok") as Lift,
    liftIn: (services.access?.liftIn ?? row.lift ?? "ok") as Lift,
    propertyType: (row.property_type ?? "flat") as PropertyType,
    parkingOut: (services.access?.parkingOut ?? row.parking ?? 0) as Level,
    parkingIn: (services.access?.parkingIn ?? row.parking ?? 0) as Level,
    carry: (row.carry ?? 0) as Level,
    narrowStairs: Boolean(row.narrow_stairs),
    permit: Boolean(row.permit),
    hoist: Boolean(row.hoist),
    permitIn: Boolean(services.access?.permitIn),
    hoistIn: Boolean(services.access?.hoistIn),
    carryIn: (services.access?.carryIn ?? 0) as Level,
    narrowStairsIn: Boolean(services.access?.narrowStairsIn),
    packingMaterialOption: services.packing_material_option ?? "",
    fromCity: services.places?.fromCity ?? "",
    fromCanton: services.places?.fromCanton ?? "",
    toCity: services.places?.toCity ?? "",
    toCanton: services.places?.toCanton ?? "",
    services: {
      move: Boolean(services.move),
      pack: Boolean(services.pack),
      clean: Boolean(services.clean),
      disp: Boolean(services.disp),
    },
    extras: services.extras ?? [],
    cleaning: { ...EMPTY_CLEANING, ...(services.cleaning ?? {}) },
    disposal: services.disposal ?? EMPTY_DISPOSAL,
    items: (row.items ?? {}) as Record<string, number>,
    date: row.move_date,
    cleanDate: services.clean_date ?? null,
    lampCount: Math.max(0, Math.floor(services.lamp_count ?? 0)),
    startTime: services.start_time ?? FIXED_START_TIME,
  };
}

/** Rebuild the Calculation shape from the stored snapshot (no recomputation of prices). */
export function rowToCalculation(
  row: PublicQuote,
  state: PlannerState,
  pricing?: PlannerPricing | null,
): Calculation {
  const services = (row.services ?? {}) as StoredServices;
  const lines = services.lines ?? [];
  const m3 = Number(row.volume_m3 ?? 0);
  const km = row.distance_km ?? 0;
  const subtotal = lines.reduce((sum, l) => sum + l.amount, 0);
  const discountRate = Number(row.discount_rate ?? 0);
  const net = Number(row.price_net ?? subtotal);
  const scored = zuegelScore(state, m3, km);
  const discount = subtotal * discountRate;
  // A manual price adjustment is a separate gross line; keep it out of the peak surcharge.
  const adj = Number((row as { manual_adjustment?: number | null }).manual_adjustment ?? 0);
  const grossRatio = net > 0 ? Number(row.price_total ?? 0) / net : 1.081;
  const rawPeak = Math.round((net - adj / grossRatio - (subtotal - discount)) * 100) / 100;
  // A few cents are VAT rounding of the stored net, never a real surcharge.
  const peakSurcharge = rawPeak < 0.05 ? 0 : rawPeak;
  const peakInfo = zuegelterminInfoFromIso(row.move_date);

  return {
    km,
    // Travel time is a live assumption of the published configuration, never
    // a hardcoded speed. Without one there is no schedule to draw.
    minutes: pricing
      ? Math.round((km / param(pricing, "engine:travel_speed_kmh")) * 60) +
        param(pricing, "engine:travel_overhead_min")
      : 0,
    m3,
    boxes: row.boxes ?? 0,
    // No invented crew/vehicle for an offer that was never calculated.
    vans: row.vans ?? (lines.length ? 1 : 0),
    crew: row.crew ?? (lines.length ? 2 : 0),
    loadHours: Number(row.load_hours ?? 0),
    cleanHours: pricing && services.clean
      ? param(pricing, "engine:clean_hours_base") +
        Number(services.cleaning?.roomUnits ?? row.room_units ?? 0) *
          param(pricing, "engine:clean_hours_per_room")
      : 0,
    totalHours: Number(row.total_hours ?? 0),
    accessFactor: 1,
    score: {
      score: row.access_score ?? scored.score,
      label: (row.score_label ?? scored.label) as Calculation["score"]["label"],
      reasons: scored.reasons,
    },
    lines,
    ...(services.disposal_calc ? { disposal: services.disposal_calc } : {}),
    // Offers saved before the field rename carry `perKm`; map it to `kmRate`.
    ...(services.move_calc ? { moveBreakdown: { ...services.move_calc, kmRate: services.move_calc.kmRate ?? (services.move_calc as unknown as Record<string, number>)["per" + "Km"] ?? 0 } } : {}),
    subtotal,
    discountRate,
    discount,
    ...(services.discount?.reason ? { discountReason: services.discount.reason } : {}),
    // Whatever the snapshot's net carries beyond the discounted subtotal is the
    // Swiss moving-date surcharge that applied when the offer was made.
    peakRate: subtotal - discount > 0 ? peakSurcharge / (subtotal - discount) : 0,
    peakSurcharge,
    ...(peakSurcharge > 0 && peakInfo?.peakLabel ? { peakLabel: peakInfo.peakLabel } : {}),
    net,
    vat: Number(row.price_vat ?? 0),
    total: Number(row.price_total ?? 0),
    rangeLow: Number(row.price_low ?? 0),
    rangeHigh: Number(row.price_high ?? 0),
    serviceCount: lines.length,
    ...(row.pricing_version != null
      ? {
          trace: {
            version: Number(row.pricing_version),
            effectiveFrom: String(row.pricing_effective_from ?? ""),
            currency: "CHF",
            lines: lines.map((l) => ({ id: l.id, rules: TRACE_RULES[l.id] ?? [] })),
            factors: [],
          },
        }
      : {}),
  };
}
