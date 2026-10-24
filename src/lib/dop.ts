import { offerSearchFilter } from "@/lib/offer-search";
/**
 * DOP workflow: Neue Anfragen → Offerten → Aufträge.
 *
 * One record per customer request moves through the stages; nothing is
 * duplicated. Every write goes through a staff-checked database function that
 * also writes the workflow history. "Löschen" archives (recoverable).
 */
import { supabase } from "@/integrations/supabase/client";
import type { QuoteRow } from "@/lib/quotes";
import type { Tables } from "@/integrations/supabase/types";
import { ITEMS } from "@/lib/pricing";
import de from "@/i18n/de.json";
import i18n from "@/i18n/config";

/** Label maps resolve in the active UI language at read time; German stays the fallback. */
function localized(prefix: string, base: Record<string, string>): Record<string, string> {
  return new Proxy(base, {
    get: (target, k) => (typeof k === "string" && k in target ? i18n.t(`dop:${prefix}.${k}`, { defaultValue: target[k] }) : undefined),
  });
}
const tr = (k: string, o: Record<string, unknown> = {}): string => String(i18n.t(`dop:${k}`, o as never));

const ITEM_BY_ID = new Map(ITEMS.map((i) => [i.id, i]));
const ITEM_NAME = { get: (id: string) => { const it = ITEM_BY_ID.get(id); if (!it) return undefined; const l = i18n.language as keyof typeof it; return (typeof it[l] === "string" ? (it[l] as string) : it.de); } };
const EXTRA_NAME = ((de as { planer?: { step8?: { items?: unknown } } })['planer']?.step8?.items ?? {}) as Record<string, string>;

export type DopKind = "lead" | "enquiry" | "quote" | "job";
export type LeadRow = Tables<"leads">;
export type EnquiryRow = Tables<"enquiries">;
export type WorkflowEvent = Tables<"workflow_events">;

export const OFFER_STAGES = ["offer_draft", "offer_ready", "offer_sent", "offer_accepted", "offer_rejected"] as const;

/** German label for every stage — technical names never reach the screen. */
export const STAGE_LABEL: Record<string, string> = localized("stage", {
  new_request: "Neue Anfrage",
  offer: "Offerte",
  offer_draft: "Offerte in Bearbeitung",
  offer_ready: "Offerte bereit",
  offer_sent: "Offerte gesendet",
  offer_accepted: "Offerte angenommen",
  offer_rejected: "Offerte abgelehnt",
  order: "Auftrag",
  closed: "Abgeschlossen",
});

export const EVENT_LABEL: Record<string, string> = localized("event", {
  offer_edited: "Offerte bearbeitet",
  order_document_sent: "Auftrag versendet",
  archived: "Gelöscht (archiviert)",
  restored: "Wiederhergestellt",
  offer_created: "Offerte erstellt",
  stage_offer_draft: "Offerte in Bearbeitung",
  stage_offer_ready: "Offerte bereit",
  stage_offer_sent: "Offerte gesendet",
  stage_offer_accepted: "Offerte angenommen",
  stage_offer_rejected: "Offerte abgelehnt",
  customer_corrected: "Kundendaten korrigiert (nach Annahme, ohne Preisänderung)",
  price_changed: "Preis geändert",
  price_adjusted: "Manuelle Preisanpassung",
  offer_accepted: "Vom Kunden angenommen",
  distance_confirmed: "Distanz bestätigt – Offerte neu berechnet",
  order_override: "Admin-Ausnahme: ohne Kundenannahme umgewandelt",
  sent: "Versand",
  converted_to_order: "In Auftrag umgewandelt",
  order_created: "Auftrag erstellt",
});

export type RequestItem =
  | { kind: "lead"; id: string; created_at: string; lead: LeadRow; quote: QuoteRow | null }
  | { kind: "enquiry"; id: string; created_at: string; enquiry: EnquiryRow };

/**
 * Leads use column-level access: cost/margin fields are never readable, so
 * `select("*")` is refused. List the readable columns explicitly.
 */
const LEAD_READ =
  "id, reference, source_id, campaign, customer_name, customer_phone, customer_email, preferred_contact, country, canton, city, postcode, service_address, category_id, service_details, preferred_date, preferred_time, urgency, description, property_type, customer_type, status, temperature, priority, estimated_value, lead_owner_id, fulfilment_type, assigned_partner_id, assigned_team_id, locked_by, locked_at, last_activity_at, next_action_at, lost_reason_id, language, created_at, updated_at, expected_sell, travel_cost, acquisition_cost, min_margin_pct, economics_flags, risk_score, risk_reviewed, ip_hash, referred_by_partner_id, queue_id, utm_source, utm_medium, utm_campaign, utm_term, utm_content, gclid, referrer, landing_page, first_review_at, first_contact_at, quoted_at, awaiting_since, workflow_stage, archived_at, archived_by";

/** Active new requests: planner/phone leads plus contact-form messages, one list. */
export async function fetchNewRequests(archived = false, includeTest = false): Promise<RequestItem[]> {
  // Query builders are mutable: build a fresh one per branch so archive and
  // active filters never stack (stacked filters made the archive always empty).
  const leadQ = () => supabase.from("leads").select(`${LEAD_READ}, is_test`).order("created_at", { ascending: false }).limit(300);
  const enqQ = supabase.from("enquiries").select("*").order("created_at", { ascending: false }).limit(300);
  const activeLeads = () => leadQ().is("archived_at", null).eq("workflow_stage", "new_request");
  const [leads, enquiries] = await Promise.all([
    // Test-suite rows (is_test) stay out of the active list unless "Testdaten anzeigen" is on; the archive keeps them for audit.
    archived ? leadQ().not("archived_at", "is", null) : includeTest ? activeLeads() : activeLeads().eq("is_test", false),
    // All enquiries (any stage) so a contact-form lead twin can be recognised.
    enqQ,
  ]);
  if (leads.error) throw leads.error;
  if (enquiries.error) throw enquiries.error;
  const allEnq = enquiries.data ?? [];
  const enqRows = allEnq.filter((e) =>
    archived ? e.archived_at != null : e.archived_at == null && (includeTest || !e.is_test) && e.workflow_stage === "new_request",
  );
  // The contact form writes one lead plus one enquiry copy. Show it once: the
  // enquiry carries the request through "Als Offerte übernehmen".
  const isTwin = (l: LeadRow) =>
    allEnq.some(
      (e) =>
        (e.name ?? "").trim() === (l.customer_name ?? "").trim() &&
        ((e.email && e.email === l.customer_email) || (e.phone && e.phone === l.customer_phone)) &&
        Math.abs(new Date(e.created_at).getTime() - new Date(l.created_at).getTime()) < 5 * 60_000,
    );
  const leadRows = ((leads.data ?? []) as unknown as LeadRow[]).filter((l) => !isTwin(l));
  const ids = leadRows.map((l) => l.id);
  const quotes = ids.length
    ? await supabase.from("quotes").select("*").in("lead_id", ids).order("created_at", { ascending: false })
    : { data: [] as QuoteRow[], error: null };
  if (quotes.error) throw quotes.error;
  const byLead = new Map<string, QuoteRow>();
  for (const q of (quotes.data ?? []) as QuoteRow[]) if (q.lead_id && !byLead.has(q.lead_id)) byLead.set(q.lead_id, q);
  const items: RequestItem[] = [
    ...leadRows.map((lead) => ({ kind: "lead" as const, id: lead.id, created_at: lead.created_at, lead, quote: byLead.get(lead.id) ?? null })),
    ...enqRows.map((enquiry) => ({ kind: "enquiry" as const, id: enquiry.id, created_at: enquiry.created_at, enquiry })),
  ];
  return items.sort((a, b) => b.created_at.localeCompare(a.created_at));
}

/**
 * Calculator quotes still at the request stage with no linked lead. Shown read-only
 * under New Requests; the test switch only changes visibility, never the stage.
 */
export async function fetchLeadlessRequestQuotes(includeTest = false): Promise<QuoteRow[]> {
  let q = supabase.from("quotes").select("*").is("lead_id", null).is("archived_at", null).eq("workflow_stage", "new_request").order("created_at", { ascending: false }).limit(300);
  if (!includeTest) q = q.eq("is_test", false);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as QuoteRow[];
}

export async function fetchOffers(archived = false, includeTest = false, search = ""): Promise<QuoteRow[]> {
  let q = supabase.from("quotes").select("*").order("created_at", { ascending: false }).limit(300);
  const filter = offerSearchFilter(search);
  if (filter) q = q.or(filter);
  if (archived) q = q.not("archived_at", "is", null);
  else {
    q = q.is("archived_at", null).in("workflow_stage", [...OFFER_STAGES]);
    if (!includeTest) q = q.eq("is_test", false);
  }
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as QuoteRow[];
}

export async function fetchQuoteByReference(reference: string): Promise<QuoteRow | null> {
  const { data, error } = await supabase.from("quotes").select("*").eq("reference", reference).maybeSingle();
  if (error) throw error;
  return (data as QuoteRow | null) ?? null;
}

export async function fetchHistory(ids: string[]): Promise<WorkflowEvent[]> {
  const clean = ids.filter(Boolean);
  if (!clean.length) return [];
  const { data, error } = await supabase
    .from("workflow_events")
    .select("*")
    .in("entity_id", clean)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function archiveRecord(kind: DopKind, id: string, restore = false) {
  const { error } = await supabase.rpc("dop_archive", { _kind: kind, _id: id, _restore: restore });
  if (error) throw error;
}

export async function requestToOffer(kind: "lead" | "enquiry", id: string): Promise<string | null> {
  const { data, error } = await supabase.rpc("dop_request_to_offer", { _kind: kind, _id: id });
  if (error) throw error;
  return (data as string | null) ?? null;
}

/** Allowed without override: next step, or back to "in Bearbeitung". */
export function isNormalStep(from: string, to: string): boolean {
  const a = OFFER_STAGES.indexOf(from as never), b = OFFER_STAGES.indexOf(to as never);
  return b === a || b === a + 1 || b === 0;
}

export async function setOfferStage(quoteId: string, stage: (typeof OFFER_STAGES)[number], reason?: string) {
  const { error } = await supabase.rpc("dop_set_offer_stage", { _quote_id: quoteId, _stage: stage, ...(reason ? { _reason: reason } : {}) });
  if (error) throw error;
}

/** Separate "Manuelle Preisanpassung" line (+/- CHF); calculation untouched. */
export async function adjustPrice(quoteId: string, delta: number, reason: string, customerNote = ""): Promise<number> {
  const { data, error } = await supabase.rpc("dop_adjust_price", { _quote_id: quoteId, _delta: delta, _reason: reason, _customer_note: customerNote });
  if (error) throw error;
  return Number(data);
}

export async function offerToOrder(quoteId: string, overrideReason?: string): Promise<string> {
  const { data, error } = await supabase.rpc("dop_offer_to_order_checked", { _quote_id: quoteId, ...(overrideReason ? { _override_reason: overrideReason } : {}) });
  if (error) throw error;
  return String(data);
}

export async function logSend(quoteId: string, recipient: string, status: string) {
  const { error } = await supabase.rpc("dop_log_send", { _quote_id: quoteId, _recipient: recipient, _status: status });
  if (error) throw error;
}

/* ------------------------------------------------ human-readable values */

const KEY_LABEL: Record<string, string> = localized("key", {
  quote_reference: "Offertnummer",
  services: "Leistungen",
  move: "Umzug",
  pack: "Einpacken",
  clean: "Reinigung",
  disp: "Entsorgung",
  extras: "Zusatzservices",
  items: "Inventarliste",
  origin: "Auszugsadresse",
  destination: "Einzugsadresse",
  street: "Strasse / Nr.",
  zip: "PLZ",
  city: "Ort",
  canton: "Kanton",
  floor: "Stockwerk",
  lift: "Lift",
  parking: "Parkieren",
  carry: "Tragdistanz",
  narrow_stairs: "Enges Treppenhaus",
  permit: "Parkbewilligung",
  hoist: "Möbellift",
  roomUnits: "Wohnungsgrösse (Zimmer)",
  propertyType: "Objektart",
  property_type: "Objektart",
  cleaning: "Reinigung",
  disposal: "Entsorgung",
  m3: "Volumen (m³)",
  hours: "Teamstunden",
  notes: "Weitere Informationen",
  clean_date: "Reinigungstermin",
  alt_date: "Alternativtermin",
  start_time: "Startzeit",
  contact_language: "Sprache",
  uploads: "Uploads",
  volume_m3: "Umzugsvolumen (m³)",
  crew: "Mitarbeitende",
  vans: "Fahrzeuge",
  boxes: "Umzugskartons",
  total_chf: "Total (CHF)",
  lamp_count: "Lampen (Anzahl)",
  customer_address: "Rechnungsadresse",
  country: "Land",
  disposal_m3: "Entsorgungsvolumen (m³)",
  disposal_team_hours: "Entsorgung Teamstunden",
  packing_material_option: "Verpackungsmaterial",
  discount: "Rabatt",
  reason: "Grund",
  rate: "Satz",
  amount: "Betrag",
  priced: "Preis berechnet",
  planning_distance_km_heuristic: "Planungsdistanz (Schätzung, km)",
  dowelHoles: "Dübellöcher (Anzahl)",
  windowsNormal: "Fenster normal",
  windowsLarge: "Fenster gross",
  wetRooms: "Nasszellen",
  balcony: "Balkon",
  cellar: "Keller",
  garage: "Garage",
  carpet: "Teppich",
  carpetShampoo: "Teppichshampoonierung",
  windowCoverings: "Fensterabdeckungen",
  pressureWash: "Hochdruckreinigung",
  propertyTypeOther: "Andere Objektart",
  otherSize: "Andere Grösse",
  cleaning_team: "Reinigungsteam",
  moving_team: "Umzugsteam",
  carryIn: "Tragdistanz Einzug",
  narrowStairsIn: "Enges Treppenhaus Einzug",
  from: "Von",
  to: "Nach",
});

const VALUE_LABEL: Record<string, string> = localized("value", {
  none: "Kein Lift",
  ok: "Lift vorhanden",
  small: "Kleiner Lift",
  flat: "Wohnung",
  house: "Einfamilienhaus",
  office: "Büro",
  self: "Abholung und Rückgabe durch Kunde",
  delivery: "Lieferung und Abholung durch PS Umzug AG",
  bundle: "Kombinationsrabatt",
  steffisburg: "Standortrabatt Steffisburg",
  furniture_assembly: "Möbelmontage",
  lamp_installation: "Lampenmontage",
  piano_transport: "Klaviertransport",
  packing_material: "Verpackungsmaterial",
  packing: "Einpackservice",
  unpacking: "Auspackservice",
  de: "Deutsch",
  fr: "Französisch",
  it: "Italienisch",
  en: "Englisch",
  ar: "Arabisch",
});

const parkingLabel = (i: number) => (i >= 0 && i < 3 ? tr(`rr.park.${i}`) : undefined);

export function humanKey(key: string): string {
  if (KEY_LABEL[key]) return KEY_LABEL[key];
  const words = key.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function humanValue(key: string, value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? tr("rr.yes") : tr("rr.no");
  if ((key === "parking" || key === "carry") && (typeof value === "number" || /^\d$/.test(String(value)))) {
    return parkingLabel(Number(value)) ?? String(value);
  }
  if (Array.isArray(value)) return value.length ? value.map((v) => humanValue(key, v)).join(", ") : tr("rr.none");
  if (typeof value === "string") {
    const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (iso) return `${iso[3]}-${iso[2]}-${iso[1]}`;
  }
  if (typeof value === "string") return VALUE_LABEL[value] ?? (EXTRA_NAME[value] ? i18n.t(`planer:step8.items.${value}`, { defaultValue: EXTRA_NAME[value] }) : value);
  if (typeof value === "number") return String(value).replace(".", ".");
  return "";
}

export type ReadableRow = { label: string; value: string; depth: number };

/** Flatten stored request details into labelled rows — never raw JSON. */
export function readableRows(obj: unknown, depth = 0): ReadableRow[] {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return [];
  const out: ReadableRow[] = [];
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (key === "services" && value && typeof value === "object" && !Array.isArray(value)) {
      const on = Object.entries(value as Record<string, unknown>).filter(([, v]) => v === true).map(([k]) => humanKey(k));
      out.push({ label: KEY_LABEL["services"]!, value: on.length ? on.join(", ") : "—", depth });
      continue;
    }
    if (key === "items" && value && typeof value === "object" && !Array.isArray(value)) {
      const list = Object.entries(value as Record<string, unknown>).filter(([, n]) => Number(n) > 0);
      out.push({ label: KEY_LABEL["items"]!, value: list.length ? tr("rr.positions", { n: list.length }) : tr("rr.none"), depth });
      for (const [item, n] of list) out.push({ label: ITEM_NAME.get(item) ?? humanKey(item), value: `${n} ×`, depth: depth + 1 });
      continue;
    }
    if (value && typeof value === "object" && !Array.isArray(value)) {
      out.push({ label: humanKey(key), value: "", depth });
      out.push(...readableRows(value, depth + 1));
      continue;
    }
    out.push({ label: humanKey(key), value: humanValue(key, value), depth });
  }
  return out;
}

/** Admin-only: mark/unmark a record as test data (set server-side, logged in history). */
export async function setTestFlag(kind: DopKind, id: string, isTest: boolean) {
  const { error } = await supabase.rpc("dop_set_test_flag", { _kind: kind, _id: id, _is_test: isTest });
  if (error) throw error;
}

/** Staff marks an offer as rejected (reason required, logged). Accepted offers cannot be rejected. */
export async function rejectOffer(quoteId: string, reason: string): Promise<void> {
  const { error } = await supabase.rpc("dop_reject_offer", { _quote_id: quoteId, _reason: reason });
  if (error) throw error;
}
