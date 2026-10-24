/**
 * PS Umzug pricing engine.
 *
 * Every number that carries a price or a commercial factor comes from the
 * published pricing configuration (`PlannerPricing`) — the same source the
 * portal reads. Nothing here hardcodes a rate, and there is no fallback:
 * without a published configuration the estimator produces no figure.
 *
 * The two constants below shape the access-complexity model, not the price
 * list: they translate a MoveScore into effort, and are deliberately not
 * commercial parameters.
 */

import { optionalParam, param, type PlannerPricing } from "@/lib/planner-pricing";
import { zuegelterminInfoFromIso } from "@/lib/zuegeltermine";

const ACCESS_FACTOR_DIVISOR = 145;
const EFFORT_DIVISOR = 125;

export type { Lang } from "@/i18n/config";
import type { Lang } from "@/i18n/config";


export type Item = {
  id: string;
  m3: number;
  de: string;
  fr: string;
  it: string;
  en: string;
  ar?: string;
  special?: boolean;
  /** Replaced by more precise items; kept so older requests stay readable. */
  legacy?: boolean;
  /** No approved volume yet — counted as an item, not yet in the m³ estimate. */
  volumePending?: boolean;
};

export const ITEMS: Item[] = [
  { id: "sofa", m3: 1.2, de: "Sofa", fr: "Canapé", it: "Divano", en: "Sofa", ar: "أريكة" },
  { id: "chairA", m3: 0.5, de: "Sessel", fr: "Fauteuil", it: "Poltrona", en: "Armchair", ar: "كرسي بذراعين" },
  { id: "table", m3: 0.8, de: "Esstisch", fr: "Table à manger", it: "Tavolo da pranzo", en: "Dining table", ar: "طاولة طعام" },
  { id: "chair", m3: 0.15, de: "Stuhl", fr: "Chaise", it: "Sedia", en: "Chair", ar: "كرسي" },
  { id: "bed", m3: 0.9, de: "Bett", fr: "Lit", it: "Letto", en: "Bed", ar: "سرير", legacy: true },
  { id: "bed_single", m3: 0.9, de: "Einzelbett", fr: "Lit simple", it: "Letto singolo", en: "Single bed", ar: "سرير مفرد" },
  { id: "bed_double", m3: 0.9, de: "Doppelbett", fr: "Lit double", it: "Letto matrimoniale", en: "Double bed", ar: "سرير مزدوج" },
  { id: "bed_kids", m3: 0, volumePending: true, de: "Kinderbett", fr: "Lit d'enfant", it: "Lettino", en: "Children's bed", ar: "سرير أطفال" },
  { id: "wardr", m3: 1.4, de: "Kleiderschrank", fr: "Armoire", it: "Armadio", en: "Wardrobe", ar: "خزانة ملابس", legacy: true },
  { id: "wardr_kids", m3: 1.4, de: "Kinderschrank", fr: "Armoire enfant", it: "Armadio per bambini", en: "Children's wardrobe", ar: "خزانة أطفال" },
  { id: "wardr_2", m3: 1.4, de: "2-türiger Kleiderschrank", fr: "Armoire 2 portes", it: "Armadio a 2 ante", en: "2-door wardrobe", ar: "خزانة بابين" },
  { id: "wardr_3", m3: 1.4, de: "3-türiger Kleiderschrank", fr: "Armoire 3 portes", it: "Armadio a 3 ante", en: "3-door wardrobe", ar: "خزانة ثلاثة أبواب" },
  { id: "wardr_4", m3: 1.4, de: "4-türiger Kleiderschrank", fr: "Armoire 4 portes", it: "Armadio a 4 ante", en: "4-door wardrobe", ar: "خزانة أربعة أبواب" },
  { id: "comm", m3: 0.5, de: "Kommode", fr: "Commode", it: "Cassettiera", en: "Chest of drawers", ar: "خزانة أدراج" },
  { id: "sideboard", m3: 0, volumePending: true, de: "Sideboard", fr: "Buffet", it: "Credenza", en: "Sideboard", ar: "خزانة جانبية" },
  { id: "wallunit", m3: 0, volumePending: true, de: "Wohnwand", fr: "Meuble mural", it: "Parete attrezzata", en: "Wall unit", ar: "وحدة جدارية" },
  { id: "vitrine", m3: 0, volumePending: true, de: "Vitrine", fr: "Vitrine", it: "Vetrina", en: "Display cabinet", ar: "خزانة عرض" },
  { id: "vanity", m3: 0, volumePending: true, de: "Schminktisch", fr: "Coiffeuse", it: "Toeletta", en: "Dressing table", ar: "طاولة زينة" },
  { id: "mirror", m3: 0, volumePending: true, de: "Spiegel", fr: "Miroir", it: "Specchio", en: "Mirror", ar: "مرآة" },
  { id: "pictures", m3: 0, volumePending: true, de: "Bilder", fr: "Tableaux", it: "Quadri", en: "Pictures", ar: "لوحات" },
  { id: "carpet", m3: 0, volumePending: true, de: "Teppich", fr: "Tapis", it: "Tappeto", en: "Carpet", ar: "سجادة" },
  { id: "tv", m3: 0.2, de: "TV", fr: "TV", it: "TV", en: "TV", ar: "تلفزيون" },
  { id: "wash", m3: 0.5, de: "Waschmaschine", fr: "Lave-linge", it: "Lavatrice", en: "Washing machine", ar: "غسالة" },
  { id: "tumbler", m3: 0, volumePending: true, de: "Tumbler", fr: "Sèche-linge", it: "Asciugatrice", en: "Tumble dryer", ar: "مجفف ملابس" },
  { id: "fridge", m3: 0.5, de: "Kühlschrank", fr: "Réfrigérateur", it: "Frigorifero", en: "Refrigerator", ar: "ثلاجة" },
  { id: "desk", m3: 0.6, de: "Bürotisch", fr: "Bureau", it: "Scrivania", en: "Office desk", ar: "مكتب" },
  { id: "officechair", m3: 0, volumePending: true, de: "Bürostuhl", fr: "Chaise de bureau", it: "Sedia da ufficio", en: "Office chair", ar: "كرسي مكتب" },
  { id: "garden", m3: 0.8, de: "Gartenmöbel", fr: "Mobilier de jardin", it: "Mobili da giardino", en: "Outdoor furniture", ar: "أثاث حديقة", legacy: true },
  { id: "garden_table", m3: 0.8, de: "Gartentisch", fr: "Table de jardin", it: "Tavolo da giardino", en: "Garden table", ar: "طاولة حديقة" },
  { id: "garden_chair", m3: 0.8, de: "Gartenstuhl", fr: "Chaise de jardin", it: "Sedia da giardino", en: "Garden chair", ar: "كرسي حديقة" },
  { id: "garden_lounge", m3: 0.8, de: "Lounge", fr: "Salon de jardin", it: "Lounge", en: "Lounge set", ar: "أريكة حديقة" },
  { id: "grill", m3: 0, volumePending: true, de: "Grill", fr: "Grill", it: "Griglia", en: "Barbecue", ar: "شواية" },
  { id: "plants_s", m3: 0, volumePending: true, de: "Pflanzen bis 1 Meter", fr: "Plantes jusqu'à 1 m", it: "Piante fino a 1 m", en: "Plants up to 1 m", ar: "نباتات حتى متر" },
  { id: "plants_l", m3: 0, volumePending: true, de: "Pflanzen über 1 Meter", fr: "Plantes de plus de 1 m", it: "Piante oltre 1 m", en: "Plants over 1 m", ar: "نباتات فوق متر" },
  { id: "sports", m3: 0, volumePending: true, de: "Sportgeräte", fr: "Équipement de sport", it: "Attrezzi sportivi", en: "Sports equipment", ar: "معدات رياضية" },
  { id: "velo", m3: 0, volumePending: true, de: "Velo", fr: "Vélo", it: "Bicicletta", en: "Bicycle", ar: "دراجة" },
  { id: "cellar", m3: 0.4, de: "Kellerregal", fr: "Étagère de cave", it: "Scaffale da cantina", en: "Basement shelf", ar: "رف قبو" },
  { id: "piano", m3: 1.6, de: "Klavier", fr: "Piano", it: "Pianoforte", en: "Piano", ar: "بيانو", special: true },
  { id: "epiano", m3: 0, volumePending: true, de: "E-Piano", fr: "Piano électrique", it: "Piano elettrico", en: "Electric piano", ar: "بيانو كهربائي", special: true },
  { id: "safe", m3: 0.6, de: "Tresor", fr: "Coffre-fort", it: "Cassaforte", en: "Safe", ar: "خزنة", special: true },
  { id: "box", m3: 0.07, de: "Kiste", fr: "Carton", it: "Scatolone", en: "Box", ar: "صندوق" },
];

/** Items whose m³ value the owner still has to configure. */
export function itemsWithoutVolume(): Item[] {
  return ITEMS.filter((i) => i.volumePending);
}

export function itemName(item: Item, lang: Lang): string {
  return item[lang] ?? item.de;
}

export type Lift = "ok" | "small" | "none";
export type PropertyType = "flat" | "house" | "office";
export type Level = 0 | 1 | 2;

export type UploadKind = "photo" | "video" | "floorplan";

/** A file the customer attached in the wizard, before the lead exists. */
export type UploadRef = {
  storage_path: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  kind: UploadKind;
};

/** Window coverings that have to be cleaned along with the windows. */
export const WINDOW_COVERINGS = ["lamellen", "rollladen", "fensterlaeden"] as const;
export type WindowCovering = (typeof WINDOW_COVERINGS)[number];

/**
 * Reinigungs-Checkliste — collected only when cleaning is booked. Dependent
 * answers (Hochdruckreinigung, Schamponieren) are ignored everywhere as soon
 * as their parent answer is "Nein".
 */
export type CleaningChecklist = {
  propertyType: PropertyType;
  /** null until chosen; `other` carries a free description instead. */
  roomUnits: number | null;
  otherSize: string;
  windowsNormal: number;
  windowsLarge: number;
  coverings: WindowCovering[];
  wetRooms: number;
  balcony: boolean;
  balconyPressure: boolean;
  cellar: boolean;
  garage: boolean;
  carpet: boolean;
  carpetShampoo: boolean;
  /** Dübellöcher spachteln — number of holes, non-negative whole number. */
  dowelHoles: number;
};

export const EMPTY_CLEANING: CleaningChecklist = {
  propertyType: "flat",
  roomUnits: null,
  otherSize: "",
  windowsNormal: 0,
  windowsLarge: 0,
  coverings: [],
  wetRooms: 0,
  balcony: false,
  balconyPressure: false,
  cellar: false,
  garage: false,
  carpet: false,
  carpetShampoo: false,
  dowelHoles: 0,
};

/**
 * Cleaning work the published price list carries no rate for.
 *
 * The list prices end cleaning by room count only. Anything the checklist
 * records beyond that has no approved surcharge, so it is neither invented nor
 * presented as included: the position is marked for manual pricing before the
 * offer may be finalised.
 */
export const CLEANING_REVIEW_KEYS = [
  "otherSize",
  "coverings",
] as const;

export type CleaningReviewKey = (typeof CLEANING_REVIEW_KEYS)[number];

/**
 * Selected cleaning work that needs a manual price before the offer is final.
 * Everything the published price list carries an approved surcharge for is
 * priced instead of flagged — only work without a rate stays for review.
 * `lamellen` has an approved rate, the other coverings do not.
 */
export function cleaningReviewItems(cleaning: CleaningChecklist): CleaningReviewKey[] {
  const c = effectiveCleaning(cleaning);
  const flagged: CleaningReviewKey[] = [];
  if (c.otherSize.trim() !== "") flagged.push("otherSize");
  if (c.coverings.some((k) => k !== "lamellen")) flagged.push("coverings");
  return flagged;
}


/** Only the answers that still apply — a "Nein" parent removes its child. */
export function effectiveCleaning(c: CleaningChecklist): CleaningChecklist {
  return {
    ...c,
    balconyPressure: c.balcony ? c.balconyPressure : false,
    carpetShampoo: c.carpet ? c.carpetShampoo : false,
    windowsNormal: Math.max(0, Math.round(c.windowsNormal)),
    windowsLarge: Math.max(0, Math.round(c.windowsLarge)),
    wetRooms: Math.max(0, Math.round(c.wetRooms)),
    dowelHoles: Math.max(0, Math.floor(Number(c.dowelHoles ?? 0) || 0)),
  };
}

/** What the customer expects to have cleared out, and by how much work. */
export type DisposalDetails = {
  /** Estimated volume in m³, null while not answered. */
  m3: number | null;
  /** Estimated team hours, null while not answered. */
  hours: number | null;
  notes: string;
};

export const EMPTY_DISPOSAL: DisposalDetails = { m3: null, hours: null, notes: "" };

export type PlannerState = {
  fromAddress: string;
  fromZip: string;
  fromCity: string;
  fromCanton: string;
  toAddress: string;
  toZip: string;
  toCity: string;
  toCanton: string;
  /** null until the customer picks a size — never a default. */
  roomUnits: number | null;
  floorOut: number;
  floorIn: number;
  /** Lift at the departure address. */
  liftOut: Lift;
  /** Lift at the destination address — recorded separately. */
  liftIn: Lift;
  propertyType: PropertyType;
  /** Parking at the departure address. */
  parkingOut: Level;
  /** Parking at the destination address — recorded separately. */
  parkingIn: Level;
  carry: Level;
  narrowStairs: boolean;
  /** Pick-up (or single service address): parking permit needed. */
  permit: boolean;
  /** Pick-up (or single service address): furniture hoist needed. */
  hoist: boolean;
  /** Destination: parking permit needed — stored independently. */
  permitIn: boolean;
  /** Destination: furniture hoist needed — stored independently. */
  hoistIn: boolean;
  /** Destination carrying distance and stair condition, independent of departure. */
  carryIn: Level;
  narrowStairsIn: boolean;
  /** Follow-up to "Verpackungsmaterial": self pick-up/return or delivery by PS Umzug. */
  packingMaterialOption: PackingMaterialOption;
  /** "Weitere Informationen" — optional free text from the customer. */
  notes: string;
  services: { move: boolean; pack: boolean; clean: boolean; disp: boolean };
  items: Record<string, number>;
  /** Extra services beyond the main ones — keys from EXTRA_SERVICES. */
  extras: string[];
  cleaning: CleaningChecklist;
  disposal: DisposalDetails;
  date: string | null;
  /** Separate cleaning appointment — a different day from the move. */
  cleanDate: string | null;
  /** Fallback date the customer would also accept. */
  altDate: string | null;
  /** Preferred start time, "HH:MM" or empty. */
  startTime: string;
  /** Files uploaded in the wizard, attached to the lead after submission. */
  uploads: UploadRef[];
  /** Stable id for this submission's upload folder. */
  draftId: string;
  name: string;
  /** Separate wizard fields; `name` always holds "first last". */
  firstName?: string;
  lastName?: string;
  company: string;
  phone: string;
  email: string;
  /** Language the customer wants to be contacted in. */
  contactLanguage: string;
  /** Number of lamps to mount — only priced with `lamp_installation`. */
  lampCount: number;
  /**
   * Invoice address of the customer. Deliberately separate from the moving
   * departure/destination and the cleaning property address, which are places
   * the work happens, not necessarily where the customer lives.
   */
  customerStreet: string;
  customerZip: string;
  customerCity: string;
  customerCountry: string;
};


export type PackingMaterialOption = "" | "self" | "delivery";

/** Postcodes the official directory assigns to Steffisburg (verified: 3612, 3613 → Steffisburg BE). */
export const STEFFISBURG_POSTCODES = ["3612", "3613"] as const;

/**
 * True when a work address lies in Steffisburg. The trigger is the four-digit
 * postcode (town and canton are derived from it and cannot be typed), so free
 * text in the street field can never unlock the discount.
 */
export function steffisburgAddress(state: Pick<PlannerState, "fromZip" | "toZip" | "services">): boolean {
  const is = (zip: string) => (STEFFISBURG_POSTCODES as readonly string[]).includes(zip.trim());
  return is(state.fromZip) || (Boolean(state.services.move) && is(state.toZip));
}

/**
 * Extra services offered on top of the main ones. Labels come from i18n.
 * `packing_service` is packing labour; `packing_material` is the material —
 * two different services that are never merged into one.
 */
export const EXTRA_SERVICES = [
  "packing_service",
  "packing_material",
  "furniture_assembly",
  "lamp_installation",
  "piano_transport",
  // "hoist" (Möbellift) is NOT an extra service: it is recorded once on the
  // access step and priced there, so it can never be charged twice.

  "storage",
  "handover_guarantee",
  "parking_permit",
] as const;

/** Only offered when cleaning is booked. */
export const CLEANING_ONLY_EXTRAS = ["handover_guarantee"] as const;

/**
 * Every service flag a stored request can carry, in display order. `pack` is
 * only ever set on older requests — packing is an extra service today.
 */
export const MAIN_AND_EXTRA_SERVICE_KEYS = ["move", "clean", "disp", "pack"] as const satisfies readonly (keyof PlannerState["services"])[];

/**
 * The main service "Endreinigung mit Abnahmegarantie" already includes the
 * handover guarantee, so it can never be charged a second time.
 */
export const GUARANTEE_INCLUDED_IN_CLEANING = true;

/**
 * The extra services that actually apply to the current selection.
 *
 * Every extra on the list is moving work. A request without a move therefore
 * offers none of them, so a hidden selection can never stay chargeable on a
 * cleaning-only offer.
 */
export function applicableExtras(services: PlannerState["services"]): readonly string[] {
  return EXTRA_SERVICES.filter((key) => {
    if (key === "handover_guarantee") {
      // Shown only with cleaning, and then as an included part of it.
      return services.clean && !GUARANTEE_INCLUDED_IN_CLEANING;
    }
    return Boolean(services.move);
  });
}


/** Drops extras that no longer apply after a change of service selection. */
export function prunedExtras(state: PlannerState): string[] {
  const allowed = new Set(applicableExtras(state.services));
  return state.extras.filter((key) => allowed.has(key));
}

export const INITIAL_STATE: PlannerState = {
  fromAddress: "",
  fromZip: "",
  fromCity: "",
  fromCanton: "",
  toAddress: "",
  toZip: "",
  toCity: "",
  toCanton: "",
  roomUnits: null,
  floorOut: 2,
  floorIn: 2,
  liftOut: "ok",
  liftIn: "ok",
  propertyType: "flat",
  parkingOut: 0,
  parkingIn: 0,
  carry: 0,
  narrowStairs: false,
  permit: false,
  hoist: false,
  permitIn: false,
  hoistIn: false,
  carryIn: 0,
  narrowStairsIn: false,
  packingMaterialOption: "",
  notes: "",
  services: { move: true, pack: false, clean: false, disp: false },
  items: {},
  extras: [],
  cleaning: EMPTY_CLEANING,
  disposal: EMPTY_DISPOSAL,
  date: null,
  cleanDate: null,
  altDate: null,
  startTime: "08:00",
  uploads: [],
  draftId: "",
  name: "",
  company: "",
  phone: "",
  email: "",
  contactLanguage: "de",
  lampCount: 0,
  customerStreet: "",
  customerZip: "",
  customerCity: "",
  customerCountry: "",
};

/** Swiss postcodes are exactly four digits. */
export function isValidZip(zip: string): boolean {
  return /^[1-9]\d{3}$/.test(zip.trim());
}

/**
 * INTERNAL PLANNING HEURISTIC — NOT A BILLABLE DISTANCE.
 *
 * Derives an approximate distance from the two postcodes for duration and
 * crew planning and for the provisional estimate range only. It must never be
 * presented to a customer as road kilometres and must never be the km a
 * quotation is billed on: the chargeable distance comes from
 * `resolve_route_distance()` (routing provider) or from a value confirmed by
 * sales/dispatch through `set_quote_distance()`.
 */
export function planningDistanceHeuristic(
  zipA: string,
  zipB: string,
  pricing: PlannerPricing,
): { km: number; minutes: number; manualRequired?: boolean } {
  const a = Number.parseInt(zipA.replace(/\D/g, ""), 10);
  const b = Number.parseInt(zipB.replace(/\D/g, ""), 10);
  if (!Number.isFinite(a) || !Number.isFinite(b) || zipA.length < 4 || zipB.length < 4) {
    return { km: 0, minutes: 0 };
  }
  // Never clipped: above `distance_max_km` the postcode formula is not
  // reliable, so the distance is flagged "Distanz muss manuell bestätigt
  // werden" instead of being replaced by an artificial maximum.
  const km = Math.round(Math.abs(a - b) * param(pricing, "engine:distance_km_per_zip") + param(pricing, "engine:distance_base_km"));
  const manualRequired = km > param(pricing, "engine:distance_max_km");
  const minutes =
    Math.round((km / param(pricing, "engine:travel_speed_kmh")) * 60) +
    param(pricing, "engine:travel_overhead_min");
  return manualRequired ? { km, minutes, manualRequired } : { km, minutes };
}


export type ScoreReasonId =
  | "noLift"
  | "smallLift"
  | "parking"
  | "carry"
  | "narrowStairs"
  | "permit"
  | "hoist"
  | "permitIn"
  | "hoistIn"
  | "special"
  | "distance"
  | "volume";

export type ScoreResult = {
  score: number;
  label: "easy" | "medium" | "demanding";
  reasons: { id: ScoreReasonId; deduction: number }[];
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function specialCount(items: Record<string, number>): number {
  return ITEMS.filter((i) => i.special).reduce((sum, i) => sum + (items[i.id] ?? 0), 0);
}

/** MoveScore — deterministic access complexity, 100 = ideal conditions. */
export function zuegelScore(state: PlannerState, m3: number, km: number): ScoreResult {
  const reasons: { id: ScoreReasonId; deduction: number }[] = [];
  const add = (id: ScoreReasonId, deduction: number) => {
    if (deduction > 0) reasons.push({ id, deduction });
  };

  // Both addresses are scored: the harder of the two access situations drives
  // the effort, and each address keeps its own recorded answer.
  const floor = state.services.move ? Math.max(state.floorOut, state.floorIn) : state.floorOut;
  const lifts: Lift[] = state.services.move ? [state.liftOut, state.liftIn] : [state.liftOut];
  const worstLift: Lift = lifts.includes("none") ? "none" : lifts.includes("small") ? "small" : "ok";
  const parking = state.services.move
    ? (Math.max(state.parkingOut, state.parkingIn) as Level)
    : state.parkingOut;
  if (worstLift === "none") add("noLift", Math.min(26, 6 * floor));
  if (worstLift === "small") add("smallLift", 8);
  add("parking", 9 * parking);
  add("carry", 8 * state.carry);
  if (state.narrowStairs) add("narrowStairs", 10);
  if (state.permit) add("permit", 6);
  if (state.hoist) add("hoist", 12);
  // The destination's permit and hoist use exactly the same logic as pick-up.
  if (state.services.move && state.permitIn) add("permitIn", 6);
  if (state.services.move && state.hoistIn) add("hoistIn", 12);
  // Destination carrying/stairs are recorded for staff review; no separate
  // charge or score is invented without an approved rule for these inputs.
  const specials = specialCount(state.items);
  if (specials > 0) add("special", Math.min(10, specials * 5));
  if (km > 40) add("distance", 5);
  if (m3 > 26) add("volume", 5);

  const total = reasons.reduce((sum, r) => sum + r.deduction, 0);
  const score = clamp(100 - total, 5, 100);
  const label = score >= 78 ? "easy" : score >= 52 ? "medium" : "demanding";

  return {
    score,
    label,
    reasons: [...reasons].sort((a, b) => b.deduction - a.deduction),
  };
}

/** Cleaning surcharges the published price list carries a rate for. */
export const CLEANING_SURCHARGE_IDS = [
  "clean_balcony",
  "clean_pressure",
  "clean_cellar",
  "clean_garage",
  "clean_carpet_shampoo",
  "clean_windows_normal",
  "clean_windows_large",
  "clean_lamellen",
  "clean_dowel_holes",
] as const;
export type CleaningSurchargeId = (typeof CLEANING_SURCHARGE_IDS)[number];

/** Moving surcharges the published price list carries a rate for. */
export const MOVING_SURCHARGE_IDS = [
  "extra_furniture_assembly",
  "extra_piano_transport",
  "extra_lamp_installation",
  "extra_packing_material_delivery",
] as const;
export type MovingSurchargeId = (typeof MOVING_SURCHARGE_IDS)[number];

/** Every position a calculation can produce. */
export type LineId =
  | "move"
  | "pack"
  | "clean"
  | "disp"
  | "disp_volume"
  | "disp_labour"
  | CleaningSurchargeId
  | MovingSurchargeId;

/**
 * Customer-safe record of which published rules and factors produced a
 * figure. Parameter keys only — no configuration ids, no costs, no margins.
 */
export type PricingTrace = {
  version: number;
  effectiveFrom: string;
  currency: string;
  /** Priced positions: which published rules the amount was built from. */
  lines: { id: LineId; rules: string[] }[];
  /** Shared factors that shaped the figures (VAT, bundle, volume, crew...). */
  factors: { key: string; value: number }[];
};

/**
 * Entsorgung/Räumung, billed on volume plus team hours — never as a package.
 * Both parts are reported separately so the offer can show them separately.
 */
/** Parts of the moving position: base and volume include the access factor. */
export type MoveBreakdown = {
  base: number;
  volume: number;
  distance: number;
  m3: number;
  km: number;
  kmRate: number;
};

export type DisposalCalculation = {
  /** Estimated volume in m³ — an estimate, not a measured quantity. */
  m3: number;
  ratePerM3: number;
  volumeAmount: number;
  /** Planned team hours (one rate for the complete two-person team). */
  estimatedHours: number;
  /** Billed team hours after the company minimum. */
  billedHours: number;
  /** Published team rate per hour, null while none is approved. */
  teamRate: number | null;
  labourAmount: number;
  minimumApplied: boolean;
  /** True when no approved team rate exists — the position stays an inquiry. */
  pending: boolean;
};

export type DiscountReason = "bundle" | "steffisburg";

export type Calculation = {
  km: number;
  /** Postcode estimate above distance_max_km: must be confirmed manually. */
  distanceManualRequired?: boolean;
  minutes: number;
  m3: number;
  boxes: number;
  vans: number;
  crew: number;
  loadHours: number;
  /** Cleaning duration — a separate day, never added to the moving day. */
  cleanHours: number;
  totalHours: number;
  accessFactor: number;
  score: ScoreResult;
  lines: { id: LineId; amount: number }[];
  /** Volume and labour breakdown of the disposal position. */
  disposal?: DisposalCalculation;
  /** Informational split of the "move" position; parts add up to its amount. */
  moveBreakdown?: MoveBreakdown;
  subtotal: number;
  discountRate: number;
  discount: number;
  /** Why the (single) discount applies; absent on older offers. */
  discountReason?: DiscountReason;
  /** Always 0: prices no longer depend on the chosen date. */
  peakRate: number;
  peakSurcharge: number;
  /** Kept for offers issued while a moving-date surcharge still existed. */
  peakLabel?: string;
  net: number;
  vat: number;
  total: number;
  rangeLow: number;
  rangeHigh: number;
  serviceCount: number;
  /** Present whenever the figure was computed from a published configuration. */
  trace?: PricingTrace;
};

export type PricedPlannerState = PlannerState & { roomUnits: number };

/* ------------------------------------------------- minimum billing (4 hours)
 *
 * Versioned commercial rule, never a constant in code: the minimum, its basis
 * and the tariffs all come from the price list in force. A quote shows the
 * estimated duration and the billed duration separately — one worked hour is
 * never presented as four worked hours.
 */

export type MinimumBillingConfig = {
  /** Minimum billed hours, per person or per team depending on `basis`. */
  minHours: number;
  basis: "person" | "team";
  /** Signed-off tariff per person and hour. */
  personRate: number | null;
  /** Signed-off tariff for the complete team and hour. */
  teamRate: number | null;
  /** Internal staffing cost per person and hour — office view only. */
  internalCostRate: number | null;
};

export type MinimumBillingResult = {
  basis: "person" | "team";
  minHours: number;
  people: number;
  /** Planned duration per person, in order. */
  estimatedHours: number[];
  /** Billed duration per person (or the single team duration). */
  billedHours: number[];
  /** Sum of the planned hours (person-hours, or team hours on a team tariff). */
  estimatedUnits: number;
  /** Sum of the billed units — what the position is priced on. */
  billedUnits: number;
  /** True when the minimum lifted the billed duration above the planned one. */
  applied: boolean;
  rate: number | null;
  /** Null while no signed-off tariff exists; the offer then stays unpriced. */
  amount: number | null;
  /** Internal staffing cost under the same minimum. Office view only. */
  internalCost: number | null;
};

/**
 * Company-wide rule: every job and service commitment carries at least four
 * billable hours, whatever the service type or booking channel. Actual worked
 * time is recorded separately and never reduces the billed minimum.
 */
export const COMPANY_MIN_BILLABLE_HOURS = 4;

/** True when a price list satisfies the company-wide four-hour minimum. */
export function meetsCompanyMinimum(config: MinimumBillingConfig | null): boolean {
  return config != null && config.minHours >= COMPANY_MIN_BILLABLE_HOURS;
}

/**
 * A flat or package price must already cover the four-hour minimum. Returns
 * the floor the package may not fall below, or null while no tariff is signed
 * off — in that case the offer stays unpriced rather than guessing.
 */
export function packagePriceFloor(config: MinimumBillingConfig | null, people: number): number | null {
  if (!config) return null;
  const heads = Math.max(1, Math.round(people));
  if (config.basis === "team") {
    return config.teamRate == null ? null : config.minHours * config.teamRate;
  }
  return config.personRate == null ? null : config.minHours * config.personRate * heads;
}

/** The minimum-billing rule of a price list, or null when it carries none. */
export function minimumBillingConfig(pricing: PlannerPricing): MinimumBillingConfig | null {
  const policy = pricing.minimumBilling;
  if (!policy) return null;
  return {
    minHours: policy.minHours,
    basis: policy.basis,
    personRate: optionalParam(pricing, "labour:per_person_hour"),
    teamRate: optionalParam(pricing, "labour:per_team_hour"),
    internalCostRate: optionalParam(pricing, "cost:per_person_hour"),
  };
}

/**
 * Validation is per pricing mode. A price list without hourly tariffs is
 * complete for flat and quantity-based offers — it only blocks hourly ones.
 * Returns the missing commercial inputs; an empty list means "may be quoted".
 */
export function hourlyQuotingBlockers(config: MinimumBillingConfig | null): string[] {
  if (!config) return ["labour:min_hours"];
  const needed = config.basis === "team" ? "labour:per_team_hour" : "labour:per_person_hour";
  const rate = config.basis === "team" ? config.teamRate : config.personRate;
  return rate == null || rate <= 0 ? [needed] : [];
}

/** True only when an hourly offer can be priced from the price list in force. */
export function canQuoteHourly(config: MinimumBillingConfig | null): boolean {
  return hourlyQuotingBlockers(config).length === 0;
}

/**
 * Strips every internal figure from a minimum-billing result. Customer
 * documents, the portal and public API responses use this projection — the
 * cost view is never merely hidden in the interface.
 */
export function customerFacingBilling(
  result: MinimumBillingResult,
): Omit<MinimumBillingResult, "internalCost"> {
  const { internalCost: _internalCost, ...rest } = result;
  return rest;
}

/**
 * Applies the minimum to an hourly assignment.
 *
 * `hours` is either one duration for everybody or one duration per person.
 * On a team tariff the team duration is lifted once and the head count is NOT
 * multiplied in again.
 */
export function minimumBilling(input: {
  people: number;
  hours: number | number[];
  config: MinimumBillingConfig;
}): MinimumBillingResult {
  const { config } = input;
  const people = Math.max(1, Math.round(input.people));
  const perPerson = Array.isArray(input.hours)
    ? input.hours.slice(0, people)
    : Array.from({ length: people }, () => input.hours as number);
  while (Array.isArray(input.hours) && perPerson.length < people) perPerson.push(0);

  if (config.basis === "team") {
    const teamHours = Math.max(...perPerson, 0);
    const billed = Math.max(teamHours, config.minHours);
    const rate = config.teamRate;
    return {
      basis: "team",
      minHours: config.minHours,
      people,
      estimatedHours: [teamHours],
      billedHours: [billed],
      estimatedUnits: teamHours,
      billedUnits: billed,
      applied: billed > teamHours,
      rate,
      amount: rate == null ? null : billed * rate,
      internalCost:
        config.internalCostRate == null ? null : billed * people * config.internalCostRate,
    };
  }

  const billedHours = perPerson.map((h) => Math.max(h, config.minHours));
  const estimatedUnits = perPerson.reduce((sum, h) => sum + h, 0);
  const billedUnits = billedHours.reduce((sum, h) => sum + h, 0);
  const rate = config.personRate;
  return {
    basis: "person",
    minHours: config.minHours,
    people,
    estimatedHours: perPerson,
    billedHours,
    estimatedUnits,
    billedUnits,
    applied: billedUnits > estimatedUnits,
    rate,
    amount: rate == null ? null : billedUnits * rate,
    internalCost:
      config.internalCostRate == null ? null : billedUnits * config.internalCostRate,
  };
}

/**
 * A flat-price offer is never topped up with a minimum-hours position: the
 * agreed lump sum stands on its own.
 */
export function flatPriceWithMinimum(amount: number): number {
  return amount;
}

/** Which published rules a priced position is built from. */
export const TRACE_RULES: Record<LineId, string[]> = {
  move: ["move:base", "move:per_m3", "move:per_km"],
  pack: ["packing:base", "packing:per_m3"],
  clean: ["endcleaning:base", "endcleaning:per_room"],
  disp: ["disposal:per_m3", "disposal:m3_share", "disposal:min_m3"],
  // Volume and team labour are quoted as two separate positions.
  disp_volume: ["disposal:per_m3", "disposal:m3_share", "disposal:min_m3"],
  disp_labour: ["disposal:per_team_hour"],
  clean_balcony: ["cleanextra:balcony"],
  clean_pressure: ["cleanextra:pressure"],
  clean_cellar: ["cleanextra:cellar"],
  clean_garage: ["cleanextra:garage"],
  clean_carpet_shampoo: ["cleanextra:carpet_shampoo"],
  clean_windows_normal: ["cleanextra:window_normal", "cleanextra:window_free"],
  clean_windows_large: ["cleanextra:window_large", "cleanextra:window_free"],
  clean_lamellen: ["cleanextra:lamellen"],
  clean_dowel_holes: ["cleanextra:dowel_hole"],
  extra_furniture_assembly: [
    "moveextra:furniture_assembly",
    "moveextra:furniture_assembly_min_rooms",
  ],
  extra_piano_transport: ["moveextra:piano_transport"],
  extra_lamp_installation: ["moveextra:lamp_installation"],
  extra_packing_material_delivery: ["moveextra:packing_material_delivery"],
};

/**
 * Approved cleaning surcharges for one offer.
 *
 * Each fixed surcharge is applied once per quotation. The free window
 * allowance is shared across both window types: the first N windows in
 * total are free (normal windows first, then large), and only windows
 * beyond that single allowance are charged, each with its own rate. Carpet on
 * its own costs nothing — only shampooing is charged, and only while carpet
 * is still selected.
 */
export function cleaningSurcharges(
  cleaning: CleaningChecklist,
  pricing: PlannerPricing,
): { id: CleaningSurchargeId; amount: number; quantity: number }[] {
  const c = effectiveCleaning(cleaning);
  const rate = (key: Parameters<typeof optionalParam>[1]) => optionalParam(pricing, key);
  const free = Math.max(0, rate("cleanextra:window_free") ?? 0);
  const out: { id: CleaningSurchargeId; amount: number; quantity: number }[] = [];
  const fixed = (on: boolean, id: CleaningSurchargeId, key: Parameters<typeof optionalParam>[1]) => {
    const price = rate(key);
    if (on && price != null && price > 0) out.push({ id, amount: price, quantity: 1 });
  };
  fixed(c.balcony, "clean_balcony", "cleanextra:balcony");
  fixed(c.balconyPressure, "clean_pressure", "cleanextra:pressure");
  fixed(c.cellar, "clean_cellar", "cleanextra:cellar");
  fixed(c.garage, "clean_garage", "cleanextra:garage");
  fixed(c.carpetShampoo, "clean_carpet_shampoo", "cleanextra:carpet_shampoo");
  fixed(c.coverings.includes("lamellen"), "clean_lamellen", "cleanextra:lamellen");

  const dowel = rate("cleanextra:dowel_hole");
  if (dowel != null && dowel > 0 && c.dowelHoles > 0) {
    out.push({ id: "clean_dowel_holes", amount: c.dowelHoles * dowel, quantity: c.dowelHoles });
  }

  const normalRate = rate("cleanextra:window_normal");
  const freeNormal = Math.min(free, c.windowsNormal);
  const chargeableNormal = c.windowsNormal - freeNormal;
  if (normalRate != null && chargeableNormal > 0) {
    out.push({
      id: "clean_windows_normal",
      amount: chargeableNormal * normalRate,
      quantity: chargeableNormal,
    });
  }
  const largeRate = rate("cleanextra:window_large");
  const chargeableLarge = Math.max(0, c.windowsLarge - (free - freeNormal));
  if (largeRate != null && chargeableLarge > 0) {
    out.push({
      id: "clean_windows_large",
      amount: chargeableLarge * largeRate,
      quantity: chargeableLarge,
    });
  }
  return out;
}

/**
 * Approved moving surcharges. Furniture assembly/disassembly needs both the
 * selected service and a property of at least the configured room count —
 * a large property alone never triggers it.
 */
export function movingSurcharges(
  state: PlannerState,
  pricing: PlannerPricing,
): { id: MovingSurchargeId; amount: number; quantity: number }[] {
  const rate = (key: Parameters<typeof optionalParam>[1]) => optionalParam(pricing, key);
  const out: { id: MovingSurchargeId; amount: number; quantity: number }[] = [];
  const selected = new Set(state.extras);

  const assembly = rate("moveextra:furniture_assembly");
  const minRooms = rate("moveextra:furniture_assembly_min_rooms");
  if (
    selected.has("furniture_assembly") &&
    assembly != null &&
    assembly > 0 &&
    minRooms != null &&
    state.roomUnits != null &&
    state.roomUnits >= minRooms
  ) {
    out.push({ id: "extra_furniture_assembly", amount: assembly, quantity: 1 });
  }

  const piano = rate("moveextra:piano_transport");
  if (selected.has("piano_transport") && piano != null && piano > 0) {
    out.push({ id: "extra_piano_transport", amount: piano, quantity: 1 });
  }

  const lamp = rate("moveextra:lamp_installation");
  const lamps = Math.max(0, Math.floor(state.lampCount));
  if (selected.has("lamp_installation") && lamp != null && lamp > 0 && lamps > 0) {
    out.push({ id: "extra_lamp_installation", amount: lamps * lamp, quantity: lamps });
  }

  // Charged exactly once, and only while the material itself is selected.
  const delivery = rate("moveextra:packing_material_delivery");
  if (
    selected.has("packing_material") &&
    state.packingMaterialOption === "delivery" &&
    delivery != null &&
    delivery > 0
  ) {
    out.push({ id: "extra_packing_material_delivery", amount: delivery, quantity: 1 });
  }
  return out;
}


/** Duration model — how long work takes, not what it costs. */
const MIN_LOAD_HOURS = 1.5;
const UNLOAD_SHARE = 0.85;
const HANDLING_MULTIPLIER = 1.85;
const SETUP_HOURS = 0.75;

/** Only callable once every price-driving input is set — see resolvePlannerPrice. */
export function calculate(
  state: PricedPlannerState,
  pricing: PlannerPricing,
  opts: { confirmedKm?: number | null; inventoryVolumes?: Record<string, number> } = {},
): Calculation {
  const p = (key: Parameters<typeof param>[1]) => param(pricing, key);
  const moving = state.services.move;
  const route = planningDistanceHeuristic(state.fromZip, state.toZip, pricing);
  // A confirmed distance (staff or routing) replaces the postcode estimate for
  // pricing only; the estimate stays available as a planning reference.
  const confirmed = opts.confirmedKm != null && Number.isFinite(opts.confirmedKm) && opts.confirmedKm >= 0
    ? opts.confirmedKm
    : null;
  const km = moving ? (confirmed ?? route.km) : 0;
  const minutes = moving
    ? confirmed != null
      ? Math.round((confirmed / p("engine:travel_speed_kmh")) * 60) + p("engine:travel_overhead_min")
      : route.minutes
    : 0;
  // A disposal-only request never records a room count; it prices on volume.
  const rooms = state.roomUnits ?? 0;
  const cleanRooms = moving ? rooms : state.cleaning.roomUnits ?? rooms;

  const itemM3 = Object.entries(state.items).reduce((sum, [id, quantity]) => {
    const fallback = ITEMS.find((item) => item.id === id);
    // Preserve existing commercial calculations (especially boxes). Only
    // previously unrated items take their approved catalogue volume.
    const volume = fallback && !fallback.volumePending ? fallback.m3 : opts.inventoryVolumes?.[id];
    return sum + Math.max(0, quantity) * (volume ?? 0);
  }, 0);
  const countedBoxes = state.items["box"] ?? 0;
  const hasInventory = Object.entries(state.items).some(([id, qty]) => qty > 0 &&
    (ITEMS.some((i) => i.id === id) || (opts.inventoryVolumes?.[id] ?? 0) > 0));

  const m3 = hasInventory
    ? itemM3 + (countedBoxes > 0 ? 0 : rooms * p("engine:m3_per_room_extra"))
    : rooms * p("engine:m3_per_room");
  const boxes = countedBoxes > 0 ? countedBoxes : Math.round(rooms * p("engine:boxes_per_room"));

  const vans = Math.max(1, Math.ceil(m3 / p("engine:van_capacity_m3")));
  const crew = clamp(
    Math.round(m3 / p("engine:crew_m3_per_person")) + 1,
    p("engine:crew_min"),
    p("engine:crew_max"),
  );

  const score = zuegelScore(state, m3, km);
  const accessFactor = 1 + (100 - score.score) / ACCESS_FACTOR_DIVISOR;
  const loadHours = moving
    ? Math.max(MIN_LOAD_HOURS, (m3 / (p("engine:crew_m3_per_person_hour") * crew)) * accessFactor)
    : 0;
  const cleanHours = state.services.clean
    ? p("engine:clean_hours_base") + cleanRooms * p("engine:clean_hours_per_room")
    : 0;
  // The moving day and the cleaning day are separate days, so their durations
  // are reported separately and never summed into one working day.
  const totalHours = moving ? loadHours * HANDLING_MULTIPLIER + minutes / 60 + SETUP_HOURS : 0;

  const effort = 1 + (100 - score.score) / EFFORT_DIVISOR;
  const lines: Calculation["lines"] = [];
  const traceLines: PricingTrace["lines"] = [];
  if (moving) {
    lines.push({
      id: "move",
      amount: (p("move:base") + m3 * p("move:per_m3")) * effort + km * p("move:per_km"),
    });
    traceLines.push({ id: "move", rules: TRACE_RULES.move });
  }
  // Packing labour is an additional service, booked under Zusatzleistungen.
  if (state.services.pack || state.extras.includes("packing_service")) {
    lines.push({ id: "pack", amount: m3 * p("packing:per_m3") + p("packing:base") });
    traceLines.push({ id: "pack", rules: TRACE_RULES.pack });
  }
  if (state.services.clean) {
    lines.push({ id: "clean", amount: p("endcleaning:base") + cleanRooms * p("endcleaning:per_room") });
    traceLines.push({ id: "clean", rules: TRACE_RULES.clean });
  }

  // Entsorgung/Räumung is billed on volume plus team hours, never as a
  // package: CHF x per m³ plus CHF y per hour for the two-person team. Both
  // rates come from the published price list; without an approved team rate
  // the position stays an inquiry instead of an invented package price.
  // Disposal team hours are billed exactly as booked — this position is
  // exempt from the four-hour minimum (owner decision, Notizen 3).
  const teamRate = optionalParam(pricing, "disposal:per_team_hour");
  let disposal: DisposalCalculation | undefined;
  if (state.services.disp) {
    const estimatedM3 =
      state.disposal.m3 != null
        ? state.disposal.m3
        : Math.max(p("disposal:min_m3"), m3 * p("disposal:m3_share"));
    const estimatedHours = Math.max(0, state.disposal.hours ?? 0);
    const billedHours = estimatedHours;
    if (teamRate == null) {
      disposal = {
        m3: estimatedM3,
        ratePerM3: p("disposal:per_m3"),
        volumeAmount: 0,
        estimatedHours,
        billedHours,
        teamRate: null,
        labourAmount: 0,
        minimumApplied: billedHours > estimatedHours,
        pending: true,
      };
    } else {
      const volumeAmount = estimatedM3 * p("disposal:per_m3");
      const labourAmount = billedHours * teamRate;
      disposal = {
        m3: estimatedM3,
        ratePerM3: p("disposal:per_m3"),
        volumeAmount,
        estimatedHours,
        billedHours,
        teamRate,
        labourAmount,
        minimumApplied: billedHours > estimatedHours,
        pending: false,
      };
      // Two positions, never one package price: the customer sees the volume
      // charge and the team-hour charge separately.
      lines.push({ id: "disp_volume", amount: volumeAmount });
      lines.push({ id: "disp_labour", amount: labourAmount });
      traceLines.push({ id: "disp_volume", rules: TRACE_RULES.disp_volume });
      traceLines.push({ id: "disp_labour", rules: TRACE_RULES.disp_labour });
    }
  }

  // Approved surcharges. Each one is charged at most once per offer, only for
  // the services actually booked, and only when the published price list
  // carries a rate for it.
  for (const s of state.services.clean ? cleaningSurcharges(state.cleaning, pricing) : []) {
    lines.push({ id: s.id, amount: s.amount });
    traceLines.push({ id: s.id, rules: TRACE_RULES[s.id] });
  }
  for (const s of moving ? movingSurcharges(state, pricing) : []) {
    lines.push({ id: s.id, amount: s.amount });
    traceLines.push({ id: s.id, rules: TRACE_RULES[s.id] });
  }

  // Every printed amount is a Rappen amount and the printed rows add up:
  // positions are rounded first, the subtotal is their sum, the discount is
  // rounded on that subtotal.
  const rappen = (x: number) => Math.round((x + Number.EPSILON) * 100) / 100;
  for (const l of lines) l.amount = rappen(l.amount);
  // Breakdown is display-only: it is derived from the already rounded position
  // and never feeds back into any total. Rounding residue goes to the base.
  const moveLine = lines.find((l) => l.id === "move");
  const moveBreakdown: MoveBreakdown | undefined = moveLine
    ? (() => {
        const distance = rappen(km * p("move:per_km"));
        const volume = rappen(m3 * p("move:per_m3") * effort);
        return { base: rappen(moveLine.amount - distance - volume), volume, distance, m3: rappen(m3), km, kmRate: p("move:per_km") };
      })()
    : undefined;
  const subtotal = rappen(lines.reduce((sum, l) => sum + l.amount, 0));

  // Discounts. Exactly one discount applies per offer — never compounded:
  // the combination discount (by the main services booked) and the
  // Steffisburg location discount compete, the higher rate wins, and on a tie
  // the combination discount is used. Recomputed from state every time, so
  // navigation or refresh can never apply it twice.
  const serviceCount = MAIN_AND_EXTRA_SERVICE_KEYS.filter((key) => state.services[key]).length;
  const mainCount = (["move", "clean", "disp"] as const).filter((key) => state.services[key]).length;
  const bundleRate =
    mainCount >= 3 ? p("engine:bundle_three") : mainCount === 2 ? p("engine:bundle_two") : 0;
  const locationRate = steffisburgAddress(state)
    ? Math.max(0, optionalParam(pricing, "engine:discount_steffisburg") ?? 0)
    : 0;
  const discountReason: DiscountReason | undefined =
    bundleRate <= 0 && locationRate <= 0
      ? undefined
      : bundleRate >= locationRate
        ? "bundle"
        : "steffisburg";
  const discountRate = discountReason === "bundle" ? bundleRate : discountReason === "steffisburg" ? locationRate : 0;
  const discount = rappen(subtotal * discountRate);

  // No date-based surcharge: the price is the same on every selectable day.
  // VAT is rounded half-up to the Rappen on the net amount, so the total the
  // customer sees on screen is exactly the total stored and printed.
  const net = rappen(subtotal - discount);
  const vat = rappen(net * p("engine:vat_rate"));

  return {
    km,
    ...(moving && confirmed == null && route.manualRequired ? { distanceManualRequired: true } : {}),
    minutes,
    m3,
    boxes,
    vans,
    crew,
    loadHours,
    cleanHours,
    totalHours,
    accessFactor,
    score,
    lines,
    ...(disposal ? { disposal } : {}),
    ...(moveBreakdown ? { moveBreakdown } : {}),
    subtotal,
    discountRate,
    discount,
    ...(discountReason ? { discountReason } : {}),
    peakRate: 0,
    peakSurcharge: 0,
    net,
    vat,
    total: rappen(net + vat),
    rangeLow: net * p("engine:range_low"),
    rangeHigh: net * p("engine:range_high"),
    serviceCount,
    trace: {
      version: pricing.version,
      effectiveFrom: pricing.effectiveFrom,
      currency: pricing.currency,
      lines: traceLines,
      factors: [
        { key: "engine:vat_rate", value: p("engine:vat_rate") },
        ...(discountReason === "bundle" ? [{ key: "engine:bundle", value: discountRate }] : []),
        ...(discountReason === "steffisburg" ? [{ key: "engine:discount_steffisburg", value: discountRate }] : []),
        { key: "engine:m3_per_room", value: p("engine:m3_per_room") },
        { key: "engine:van_capacity_m3", value: p("engine:van_capacity_m3") },
        { key: "engine:crew_m3_per_person_hour", value: p("engine:crew_m3_per_person_hour") },
      ],
    },
  };
}


/** Deterministic quote reference, format PS-2026-00842. */
export function quoteReference(state: PlannerState): string {
  const seed = `${state.fromZip}|${state.toZip}|${state.roomUnits ?? ""}|${state.date ?? ""}|${state.email}`;
  let hash = 7;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) % 99991;
  const year = new Date().getFullYear();
  return `PS-${year}-${String(hash % 100000).padStart(5, "0")}`;
}


/**
 * No simulated availability any more: until a real dispatch calendar is
 * connected, every future day is selectable and no day carries a different
 * price. The requested date stays subject to confirmation.
 */
export function isSelectableDate(date: Date, today: Date): boolean {
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  return day > start;
}

export type TimelineStep = { id: string; start: number; hours: number };

/**
 * One dated working plan. Moving and cleaning are separate days and therefore
 * separate plans — cleaning is never appended to the end of the moving day.
 */
export type TimelinePlan = {
  id: "move" | "clean";
  /** ISO date of that day, null while the customer has not chosen one. */
  date: string | null;
  steps: TimelineStep[];
  /** Approximate handover time on the cleaning day, in hours (16 = 16:00). */
  handoverAt?: number;
  /** True when the estimated cleaning duration runs past the handover time. */
  conflict?: boolean;
};

/** Cleaning starts at 08:00 and the handover is scheduled for about 16:00. */
export const CLEANING_START_HOUR = 8;
export const CLEANING_HANDOVER_HOUR = 16;

/**
 * Moving and cleaning both start at 08:00 Europe/Zurich. The start time is
 * not a customer choice, so it is stored and printed as a fixed value.
 */
export const FIXED_START_TIME = "08:00";


function quarter(hours: number): number {
  return Math.max(0.25, Math.round(hours * 4) / 4);
}

/** Hour-by-hour moving day derived from the calculation. Crew arrives 08:00. */
export function buildTimeline(state: PricedPlannerState, calc: Calculation): TimelineStep[] {
  const steps: TimelineStep[] = [];
  if (!state.services.move) return steps;
  let cursor = 8;
  const push = (id: string, hours: number) => {
    steps.push({ id, start: cursor, hours: quarter(hours) });
    cursor += quarter(hours);
  };

  push("arrival", 0.25);
  push("protection", 0.5);
  push("loading", calc.loadHours);
  push("drive", Math.max(0.25, calc.minutes / 60));
  push("unloading", calc.loadHours * UNLOAD_SHARE);
  push("positioning", 0.5);
  return steps;
}

/** The cleaning day: start 08:00, handover at approximately 16:00. */
export function buildCleaningTimeline(calc: Calculation): TimelineStep[] {
  const steps: TimelineStep[] = [];
  let cursor = CLEANING_START_HOUR;
  const push = (id: string, hours: number) => {
    steps.push({ id, start: cursor, hours: quarter(hours) });
    cursor += quarter(hours);
  };
  push("cleanArrival", 0.25);
  push("cleaning", Math.max(0.5, calc.cleanHours));
  steps.push({ id: "handover", start: CLEANING_HANDOVER_HOUR, hours: 0.75 });
  return steps;
}

/** Both dated plans, each only when the service is actually booked. */
export function buildPlans(state: PricedPlannerState, calc: Calculation): TimelinePlan[] {
  const plans: TimelinePlan[] = [];
  if (state.services.move) {
    plans.push({ id: "move", date: state.date, steps: buildTimeline(state, calc) });
  }
  if (state.services.clean) {
    const steps = buildCleaningTimeline(calc);
    const lastWork = steps.length > 1 ? steps[steps.length - 2]! : null;
    plans.push({
      id: "clean",
      date: state.cleanDate ?? (state.services.move ? null : state.date),
      steps,
      handoverAt: CLEANING_HANDOVER_HOUR,
      conflict: lastWork ? lastWork.start + lastWork.hours > CLEANING_HANDOVER_HOUR : false,
    });
  }
  return plans;
}

export function formatHours(hours: number, lang: Lang): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return new Intl.NumberFormat(lang === "de" ? "de-CH" : lang, {
    minimumFractionDigits: 0,
  }).format(h) + (m > 0 ? `:${String(m).padStart(2, "0")} h` : ":00 h");
}

export function clockLabel(hour: number): string {
  const h = Math.floor(hour) % 24;
  const m = Math.round((hour - Math.floor(hour)) * 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
