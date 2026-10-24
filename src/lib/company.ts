/**
 * Company contact block.
 *
 * The single source of truth is the `legal_entities` row for the market
 * (see `company_contact()` in the database). Nothing here hard-codes a phone
 * number, an address or an e-mail: components read the record and derive the
 * links they need. Register/VAT numbers are deliberately nullable — they stay
 * unconfirmed until the Handelsregister data is verified.
 */

export type OpeningHours = { days: string; from: string; to: string };

export type Company = {
  country: string;
  legal_name: string;
  address_line: string;
  postal_code: string;
  city: string;
  canton: string;
  email: string;
  phone: string;
  /** Mobile / direct line; null while unset. */
  mobile_phone: string | null;
  /** Company website; null while unset. */
  website: string | null;
  /** Opening hours as [{ days, from, to }] — admin-editable, never hard-coded. */
  opening_hours: OpeningHours[];
  /** null while the commercial register entry is unconfirmed. */
  register_number: string | null;
  /** null while the UID/MWST number is unconfirmed. */
  vat_number: string | null;
  /** "pending" until every registration field is confirmed. */
  status: string;
  /** false blocks publishing of legal documents. */
  legal_ready: boolean;
};

/** Swiss canton codes to full names, used for structured data and addresses. */
const CANTONS: Record<string, string> = {
  AG: "Aargau", AI: "Appenzell Innerrhoden", AR: "Appenzell Ausserrhoden", BE: "Bern",
  BL: "Basel-Landschaft", BS: "Basel-Stadt", FR: "Freiburg", GE: "Genf", GL: "Glarus",
  GR: "Graubünden", JU: "Jura", LU: "Luzern", NE: "Neuenburg", NW: "Nidwalden",
  OW: "Obwalden", SG: "St. Gallen", SH: "Schaffhausen", SO: "Solothurn", SZ: "Schwyz",
  TG: "Thurgau", TI: "Tessin", UR: "Uri", VD: "Waadt", VS: "Wallis", ZG: "Zug", ZH: "Zürich",
};

export function cantonName(company: Company | null): string {
  if (!company?.canton) return "";
  return CANTONS[company.canton.toUpperCase()] ?? company.canton;
}

/** "079 900 01 92" -> "+41799000192" (E.164, no spaces). */
export function phoneE164(phone: string | undefined | null): string {
  const raw = (phone ?? "").replace(/[^\d+]/g, "");
  if (!raw) return "";
  if (raw.startsWith("+")) return raw;
  if (raw.startsWith("00")) return `+${raw.slice(2)}`;
  if (raw.startsWith("0")) return `+41${raw.slice(1)}`;
  return `+${raw}`;
}

/** Human-readable international form, e.g. "+41 79 900 01 92". */
export function phoneDisplay(company: Company | null): string {
  const e164 = phoneE164(company?.phone);
  if (!e164.startsWith("+41") || e164.length !== 12) return company?.phone ?? "";
  const d = e164.slice(3);
  return `+41 ${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5, 7)} ${d.slice(7)}`;
}

export function telHref(company: Company | null): string {
  return `tel:${phoneE164(company?.phone) || ""}`;
}

export function mailHref(company: Company | null, subject?: string, body?: string): string {
  const params = [
    subject ? `subject=${encodeURIComponent(subject)}` : "",
    body ? `body=${encodeURIComponent(body)}` : "",
  ].filter(Boolean);
  return `mailto:${company?.email ?? ""}${params.length ? `?${params.join("&")}` : ""}`;
}

/** WhatsApp deep link to the company number, with an optional prefilled text. */
export function whatsappHref(company: Company | null, text?: string): string {
  const number = phoneE164(company?.phone).replace(/^\+/, "");
  const query = text ? `?text=${encodeURIComponent(text)}` : "";
  return `https://wa.me/${number}${query}`;
}

/** "Obere Gründlistrasse 7, 6055 Alpnach" */
export function addressLine(company: Company | null): string {
  if (!company) return "";
  return [company.address_line, [company.postal_code, company.city].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(", ");
}

/** Full postal address including canton and country, for the legal notice. */
export function addressFull(company: Company | null): string {
  if (!company) return "";
  const region = cantonName(company);
  return [addressLine(company), region, company.country === "CH" ? "Schweiz" : company.country]
    .filter(Boolean)
    .join(", ");
}

/** True when registration data is still unconfirmed — keeps draft banners on. */
export function registrationPending(company: Company | null): boolean {
  return !company || !company.register_number || !company.vat_number || company.status !== "complete";
}

/** "Mo-Fr 08:00-17:00" lines for the contact block and structured data. */
export function openingHoursLines(company: Company | null): string[] {
  const rows = Array.isArray(company?.opening_hours) ? company.opening_hours : [];
  return rows
    .filter((r) => r && r.days && r.from && r.to)
    .map((r) => `${r.days} ${r.from}\u2013${r.to}`);
}

/** tel: link for the mobile number, empty when none is configured. */
export function mobileHref(company: Company | null): string {
  const e164 = phoneE164(company?.mobile_phone);
  return e164 ? `tel:${e164}` : "";
}
