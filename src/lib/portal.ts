import { matchBand, type Band, type PriceOverride, type RateRow } from "@/lib/price-resolution";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Organization = Database["public"]["Tables"]["organizations"]["Row"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Property = Database["public"]["Tables"]["properties"]["Row"];
export type Unit = Database["public"]["Tables"]["units"]["Row"];
export type Job = Database["public"]["Tables"]["jobs"]["Row"];
export type JobEvent = Database["public"]["Tables"]["job_events"]["Row"];
export type JobStatus = Database["public"]["Enums"]["job_status"];

/** The eight-stage changeover pipeline, in order. */
export const STAGES: JobStatus[] = [
  "received",
  "survey",
  "quote_approved",
  "scheduled",
  "crew_assigned",
  "clearance",
  "cleaning",
  "handover_done",
];

export const SERVICE_KEYS = ["clean", "clearance", "repairs", "handover"] as const;
export type ServiceKey = (typeof SERVICE_KEYS)[number];

/**
 * Rows that carry a calculation factor rather than a sellable price. They are
 * part of the published configuration but must not appear on a rate card.
 */
export const FACTOR_UNIT_TYPES = ["m3_per_room", "hours_per_job"];

export type JobServices = Partial<Record<ServiceKey, boolean>>;

export function servicesOf(job: Job): ServiceKey[] {
  const raw = (job.services ?? {}) as Record<string, unknown>;
  return SERVICE_KEYS.filter((key) => raw[key] === true);
}

/** Unit types a manager can pick; labels live in the `portal` namespace. */
export const UNIT_TYPES = [
  "wohnung",
  "studio",
  "attikawohnung",
  "reihenhaus",
  "einfamilienhaus",
  "buero",
  "ladenflaeche",
  "gewerbe",
  "lager",
  "gemeinschaftsraum",
  "sonstiges",
] as const;
export type UnitType = (typeof UNIT_TYPES)[number];

/** Swiss room ladder; 6.0 stands for "6.0 and more". */
export const ROOM_OPTIONS = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6] as const;

/**
 * Maps a room count onto a cleaning band from the published pricing
 * configuration — half-open [min, max). No nearest-band rounding: anything
 * outside every band returns null, and the job is quoted by hand.
 */
export function cleaningUnitType(bands: Band[], rooms: number | null | undefined): string | null {
  return matchBand(bands, rooms ?? null)?.id ?? null;
}

/**
 * The rate card as this organisation sees it: published prices with its own
 * agreed overrides applied. Calculation factors are not prices and are
 * excluded. Used for display only — pricing itself goes through
 * `resolvePortalPrice`, which applies unit and property overrides too.
 */
export function effectiveRates(
  rates: RateRow[],
  overrides: PriceOverride[],
): Array<{ id: string; service: string; unit_type: string; price: number }> {
  return rates
    .filter((rate) => !FACTOR_UNIT_TYPES.includes(rate.unit_type))
    .map((rate) => {
      const agreed = overrides.find(
        (o) =>
          o.property_id == null &&
          o.unit_id == null &&
          o.service === rate.service &&
          o.unit_type === rate.unit_type,
      );
      return {
        id: `${rate.service}:${rate.unit_type}`,
        service: rate.service,
        unit_type: rate.unit_type,
        price: Number(agreed?.price ?? rate.price),
      };
    });
}


/** Everything the portal needs for the signed-in organisation, in one read. */
export type PortalData = {
  profile: Profile | null;
  organization: Organization | null;
  properties: Property[];
  units: Unit[];
  jobs: Job[];
  events: JobEvent[];
  /** Prices and factors from the published pricing configuration in force. */
  rates: RateRow[];
  /** Room bands from that same configuration — never a hardcoded ladder. */
  bands: Band[];
  /** Agreed prices for this organisation, property or unit. Narrowest wins. */
  overrides: PriceOverride[];
  /** Published configuration version the portal is pricing against. */
  pricingVersion: number | null;
  /** Date that published version took effect — shown in the pricing trace. */
  pricingEffectiveFrom: string | null;
  /** Currency of the published configuration. */
  pricingCurrency: string | null;
};

export async function loadPortalData(userId: string): Promise<PortalData> {
  const [profileRes, orgRes, propRes, unitRes, jobRes, eventRes, priceRes, overrideRes] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("organizations").select("*").limit(1).maybeSingle(),
      supabase.from("properties").select("*").order("address"),
      supabase.from("units").select("*").order("label"),
      supabase.from("jobs").select("*").order("created_at", { ascending: false }),
      supabase.from("job_events").select("*").order("created_at"),
      // Single runtime source of truth: only published, currently effective
      // rules for an active market. Drafts and archived versions never appear.
      supabase.rpc("published_pricing", { _market: "CH" }),
      supabase
        .from("portfolio_price_overrides")
        .select("service, unit_type, price, property_id, unit_id"),
    ]);

  const published = priceRes.data ?? [];
  const bandsById = new Map<string, Band>();
  for (const row of published) {
    if (row.service !== "clean" || !row.band_id) continue;
    bandsById.set(row.band_id, {
      id: row.band_id,
      min: Number(row.room_min),
      max: row.room_max == null ? Number.POSITIVE_INFINITY : Number(row.room_max),
    });
  }

  return {
    profile: profileRes.data ?? null,
    organization: orgRes.data ?? null,
    properties: propRes.data ?? [],
    units: unitRes.data ?? [],
    jobs: jobRes.data ?? [],
    events: eventRes.data ?? [],
    rates: published.map((row) => ({
      service: row.service,
      unit_type: row.unit_type,
      price: Number(row.price),
    })),
    bands: [...bandsById.values()].sort((a, b) => a.min - b.min),
    overrides: overrideRes.data ?? [],
    pricingVersion: published[0] ? Number(published[0].version) : null,
    pricingEffectiveFrom: published[0]?.effective_from ?? null,
    pricingCurrency: published[0]?.currency ?? null,
  };
}

export type NewJobInput = {
  organizationId: string;
  unitId: string;
  moveOutDate: string;
  handoverDate: string;
  services: JobServices;
  notes: string;
  amount: number;
  actorId: string;
};

/** Inserts the job plus its first audit-trail event. */
export async function createJob(input: NewJobInput): Promise<Job> {
  const { data, error } = await supabase
    .from("jobs")
    .insert({
      reference: "pending", // replaced by the database trigger
      organization_id: input.organizationId,
      unit_id: input.unitId,
      type: "changeover",
      status: "received",
      services: input.services,
      move_out_date: input.moveOutDate || null,
      scheduled_date: input.handoverDate || null,
      amount: input.amount,
      notes: input.notes,
    })
    .select()
    .single();

  if (error || !data) throw new Error(error?.message ?? "job_insert_failed");

  const { error: eventError } = await supabase.from("job_events").insert({
    organization_id: input.organizationId,
    job_id: data.id,
    stage: "received",
    note: "created_via_portal", // stable code, translated at render time
    actor_id: input.actorId,
  });
  if (eventError) throw new Error(eventError.message);

  return data;
}

/* ---------------------------------------------------------------------------
 * Portfolio management — properties and units the organisation owns.
 * Every write carries organization_id so the existing RLS check passes.
 * ------------------------------------------------------------------------ */

export type PropertyInput = {
  address: string;
  zip: string;
  city: string;
  canton: string;
  reference: string;
  unit_count: number;
  notes: string;
};

export type UnitInput = {
  label: string;
  unit_type: string;
  rooms: number | null;
  floor: number;
  has_lift: boolean;
  size_m2: number | null;
  notes: string;
};

export async function createProperty(organizationId: string, input: PropertyInput): Promise<Property> {
  const { data, error } = await supabase
    .from("properties")
    .insert({ ...input, organization_id: organizationId })
    .select()
    .single();
  if (error || !data) throw new Error(error?.message ?? "property_insert_failed");
  return data;
}

export async function updateProperty(id: string, patch: Partial<PropertyInput> & { archived?: boolean }) {
  const { error } = await supabase.from("properties").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function createUnits(
  organizationId: string,
  propertyId: string,
  rows: UnitInput[],
): Promise<Unit[]> {
  const { data, error } = await supabase
    .from("units")
    .insert(rows.map((row) => ({ ...row, organization_id: organizationId, property_id: propertyId })))
    .select();
  if (error || !data) throw new Error(error?.message ?? "unit_insert_failed");
  return data;
}

export async function updateUnit(id: string, patch: Partial<UnitInput> & { archived?: boolean }) {
  const { error } = await supabase.from("units").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
}

/* ---------------------------------------------------------------------------
 * CSV / Excel import. The file is parsed in the browser, mapped column by
 * column and previewed before a single row is written. Nothing is inserted
 * until the manager confirms the preview.
 * ------------------------------------------------------------------------ */

export type ParsedSheet = { headers: string[]; rows: string[][] };

/** Delimiter-separated text (CSV or an Excel "Save as CSV"), quotes honoured. */
export function parseDelimited(text: string): ParsedSheet {
  const clean = text.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  const delimiter = (clean.split("\n")[0]?.match(/;/g)?.length ?? 0) >=
    (clean.split("\n")[0]?.match(/,/g)?.length ?? 0)
    ? ";"
    : ",";

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < clean.length; i += 1) {
    const char = clean[i]!;
    if (quoted) {
      if (char === '"') {
        if (clean[i + 1] === '"') {
          field += '"';
          i += 1;
        } else quoted = false;
      } else field += char;
      continue;
    }
    if (char === '"') quoted = true;
    else if (char === delimiter) {
      row.push(field.trim());
      field = "";
    } else if (char === "\n") {
      row.push(field.trim());
      rows.push(row);
      row = [];
      field = "";
    } else field += char;
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field.trim());
    rows.push(row);
  }

  const nonEmpty = rows.filter((r) => r.some((c) => c !== ""));
  const headers = nonEmpty.shift() ?? [];
  return { headers, rows: nonEmpty };
}

/** Target fields an imported column can be mapped onto. */
export const IMPORT_FIELDS = [
  "address",
  "zip",
  "city",
  "canton",
  "reference",
  "label",
  "unit_type",
  "rooms",
  "floor",
  "size_m2",
  "notes",
] as const;
export type ImportField = (typeof IMPORT_FIELDS)[number];

/** Best-effort header guess so the mapping starts in a sensible place. */
export function guessMapping(headers: string[]): (ImportField | "")[] {
  const hints: Record<ImportField, string[]> = {
    address: ["adresse", "address", "strasse", "street", "objekt"],
    zip: ["plz", "zip", "postleitzahl", "npa", "cap"],
    city: ["ort", "stadt", "city", "ville", "località"],
    canton: ["kanton", "canton", "cantone"],
    reference: ["referenz", "reference", "objektnr", "liegenschaft"],
    label: ["wohnung", "einheit", "unit", "label", "bezeichnung", "nr"],
    unit_type: ["typ", "type", "art", "tipo"],
    rooms: ["zimmer", "rooms", "pièces", "locali", "zi"],
    floor: ["etage", "stock", "floor", "geschoss", "piano"],
    size_m2: ["fläche", "flaeche", "m2", "size", "superficie"],
    notes: ["bemerkung", "notiz", "notes", "remarque", "nota"],
  };
  return headers.map((header) => {
    const key = header.toLowerCase().trim();
    const hit = IMPORT_FIELDS.find((field) => hints[field].some((h) => key.includes(h)));
    return hit ?? "";
  });
}

export type ImportRow = {
  property: PropertyInput;
  unit: UnitInput | null;
  problems: string[];
};

function toNumber(value: string): number | null {
  const parsed = Number(String(value).replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

/** Turns mapped rows into the exact records that would be written. */
export function buildImportRows(sheet: ParsedSheet, mapping: (ImportField | "")[]): ImportRow[] {
  return sheet.rows.map((cells) => {
    const get = (field: ImportField): string => {
      const index = mapping.indexOf(field);
      return index === -1 ? "" : (cells[index] ?? "").trim();
    };

    const property: PropertyInput = {
      address: get("address"),
      zip: get("zip"),
      city: get("city"),
      canton: get("canton").toUpperCase().slice(0, 2),
      reference: get("reference"),
      unit_count: 0,
      notes: "",
    };

    const label = get("label");
    const roomsRaw = get("rooms");
    const rooms = roomsRaw === "" ? null : toNumber(roomsRaw);
    const typeRaw = get("unit_type").toLowerCase();
    const unitType = (UNIT_TYPES as readonly string[]).includes(typeRaw) ? typeRaw : "wohnung";
    const size = get("size_m2");
    const floor = get("floor");

    const problems: string[] = [];
    if (!property.address) problems.push("address");
    if (roomsRaw !== "" && rooms === null) problems.push("rooms");

    return {
      property,
      unit: label
        ? {
            label,
            unit_type: unitType,
            rooms,
            floor: toNumber(floor) ?? 0,
            has_lift: false,
            size_m2: size === "" ? null : toNumber(size),
            notes: get("notes"),
          }
        : null,
      problems,
    };
  });
}

export type ImportResult = { properties: number; units: number; skipped: number };

/**
 * Writes the previewed rows. Rows are grouped by address so one property with
 * many flats becomes one property record; existing addresses are reused.
 */
export async function importPortfolio(
  organizationId: string,
  rows: ImportRow[],
  existing: Property[],
): Promise<ImportResult> {
  const usable = rows.filter((row) => row.problems.length === 0);
  const skipped = rows.length - usable.length;
  const byAddress = new Map<string, ImportRow[]>();
  for (const row of usable) {
    const key = `${row.property.address.toLowerCase()}|${row.property.zip}`;
    byAddress.set(key, [...(byAddress.get(key) ?? []), row]);
  }

  let created = 0;
  let units = 0;
  for (const group of byAddress.values()) {
    const first = group[0]!;
    const match = existing.find(
      (p) =>
        p.address.toLowerCase() === first.property.address.toLowerCase() &&
        (p.zip ?? "") === first.property.zip,
    );
    let propertyId = match?.id ?? null;
    if (!propertyId) {
      const property = await createProperty(organizationId, {
        ...first.property,
        unit_count: group.filter((row) => row.unit).length,
      });
      propertyId = property.id;
      created += 1;
    }
    const unitRows = group.map((row) => row.unit).filter((u): u is UnitInput => u !== null);
    if (unitRows.length > 0) {
      await createUnits(organizationId, propertyId, unitRows);
      units += unitRows.length;
    }
  }
  return { properties: created, units, skipped };
}

/* ------------------------------------------------- per-property/unit prices */

export type OverrideRow = Database["public"]["Tables"]["portfolio_price_overrides"]["Row"];

export async function fetchOverrides(): Promise<OverrideRow[]> {
  const { data, error } = await supabase
    .from("portfolio_price_overrides")
    .select("*")
    .eq("archived", false)
    .order("created_at");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function saveOverride(input: {
  organizationId: string;
  propertyId: string | null;
  unitId: string | null;
  service: string;
  unitType: string;
  price: number;
  note: string;
}): Promise<void> {
  const { error } = await supabase.from("portfolio_price_overrides").insert({
    organization_id: input.organizationId,
    property_id: input.propertyId,
    unit_id: input.unitId,
    service: input.service,
    unit_type: input.unitType,
    price: input.price,
    note: input.note,
  });
  if (error) throw new Error(error.message);
}

export async function archiveOverride(id: string): Promise<void> {
  const { error } = await supabase.from("portfolio_price_overrides").update({ archived: true }).eq("id", id);
  if (error) throw new Error(error.message);
}

/* --------------------------------------------------------- multi-unit order */

/** One request per unit, so each keeps its own reference and audit trail. */
export async function createJobsForUnits(
  base: Omit<NewJobInput, "unitId">,
  unitIds: string[],
): Promise<Job[]> {
  const jobs: Job[] = [];
  for (const unitId of unitIds) {
    jobs.push(await createJob({ ...base, unitId }));
  }
  return jobs;
}

/* ------------------------------------------------- occupants & unit history */

export type Occupant = Database["public"]["Tables"]["unit_occupants"]["Row"];

export type OccupantInput = {
  full_name: string;
  email: string;
  phone: string;
  moves_out_on: string | null;
  notes: string;
};

/** Current occupants of the organisation's units. Archived rows stay hidden. */
export async function fetchOccupants(): Promise<Occupant[]> {
  const { data, error } = await supabase
    .from("unit_occupants")
    .select("*")
    .eq("archived", false)
    .order("created_at");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createOccupant(
  organizationId: string,
  unitId: string,
  input: OccupantInput,
): Promise<Occupant> {
  const { data, error } = await supabase
    .from("unit_occupants")
    .insert({
      organization_id: organizationId,
      unit_id: unitId,
      full_name: input.full_name,
      email: input.email,
      phone: input.phone,
      moves_out_on: input.moves_out_on,
      notes: input.notes,
    })
    .select()
    .single();
  if (error || !data) throw new Error(error?.message ?? "occupant_insert_failed");
  return data;
}

export async function updateOccupant(
  id: string,
  patch: Partial<OccupantInput> & { archived?: boolean },
): Promise<void> {
  const { error } = await supabase.from("unit_occupants").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
}

export type ServiceHistoryEntry = {
  job: Job;
  services: ServiceKey[];
  events: JobEvent[];
};

/**
 * Service history for one unit, newest first — derived from the portal data
 * already loaded, so it costs no extra round trip and honours the same RLS.
 */
export function unitServiceHistory(unitId: string, jobs: Job[], events: JobEvent[]): ServiceHistoryEntry[] {
  return jobs
    .filter((job) => job.unit_id === unitId)
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    .map((job) => ({
      job,
      services: servicesOf(job),
      events: events
        .filter((event) => event.job_id === job.id)
        .sort((a, b) => (a.created_at < b.created_at ? 1 : -1)),
    }));
}
