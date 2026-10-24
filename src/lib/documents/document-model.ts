/**
 * Printable document model for invoices and quotes.
 *
 * Company data comes from `legal_entities` and nowhere else. Fields that are
 * still pending are rendered as a visible placeholder — never blank space, and
 * never an invented CHE number.
 */
import { VAT_RATE } from "@/lib/legal";

import type { DocumentIcon } from "./pdf-icons";
import { buildQrReference, formatQrReference, qrBillState, qrReferenceMode, type CreditorConfig } from "./qr-bill";

export type { DocumentIcon };

export const PLACEHOLDER = "[ausstehend]";

export type EntityFields = {
  legal_name?: string | null;
  register_number?: string | null;
  vat_number?: string | null;
  address_line?: string | null;
  postal_code?: string | null;
  city?: string | null;
  canton?: string | null;
  email?: string | null;
  phone?: string | null;
  country?: string | null;
  qr_iban?: string | null;
  iban?: string | null;
  bank_name?: string | null;
};

export type IssuerBlock = {
  lines: string[];
  /** Field keys still pending; each is shown as PLACEHOLDER in `lines`. */
  pending: string[];
};

const shown = (value: string | null | undefined, pending: string[], key: string): string => {
  const clean = (value ?? "").trim();
  if (clean) return clean;
  pending.push(key);
  return PLACEHOLDER;
};

export function issuerBlock(entity: EntityFields | null | undefined): IssuerBlock {
  const e = entity ?? {};
  const pending: string[] = [];
  const lines = [
    shown(e.legal_name, pending, "legal_name"),
    shown(e.address_line, pending, "address_line"),
    `${shown(e.postal_code, pending, "postal_code")} ${shown(e.city, pending, "city")}`,
    `CHE: ${shown(e.register_number, pending, "register_number")}`,
    `MWST: ${shown(e.vat_number, pending, "vat_number")}`,
    `${shown(e.email, pending, "email")} · ${shown(e.phone, pending, "phone")}`,
  ];
  return { lines, pending };
}

/**
 * Bank line for the page footer, built only from stored banking data. Nothing
 * is invented: with no IBAN on file the footer simply carries no bank line.
 */
export function bankFooterLine(entity: EntityFields | null | undefined): string | undefined {
  const e = entity ?? {};
  const iban = (e.iban ?? "").trim();
  if (!iban) return undefined;
  const bank = (e.bank_name ?? "").trim();
  return [bank, `IBAN ${iban}`].filter(Boolean).join(" · ");
}

export type DocumentLine = {
  description: string;
  quantity: number;
  unitPrice: number;
  net: number;
  vatRate: number;
};

export type PaymentPart = {
  state: "configured" | "not_configured";
  missing: string[];
  reference: string;
  referenceFormatted: string;
  creditor: Partial<CreditorConfig>;
  amount: number;
  currency: string;
  debtor?: { name?: string; addressLine?: string; postalCode?: string; city?: string };
};

/** Key figures printed as a boxed grid under the header. */
export type DocumentFact = { label: string; value: string };
/** Labelled block of detail rows (route, services, inventory, …). */
export type DocumentSection = { title: string; rows: DocumentFact[]; icon?: DocumentIcon };
/** Boxed party block — customer on the left, contact and basis on the right. */
export type DocumentParty = { title: string; rows: DocumentFact[]; icon?: DocumentIcon };
/** One line of the appointment table: what, on which date, starting when. */
export type DocumentAppointment = { label: string; date: string; time: string; icon?: DocumentIcon };
/** Pick-up or drop-off address with its access details. */
export type DocumentLocation = { title: string; address: string; details: string[]; icon?: DocumentIcon };
/** Row of the commercial summary (subtotal, discount, net, VAT, gross). */
export type DocumentSummaryRow = { label: string; value: string; emphasis?: boolean; negative?: boolean };
/** Free-text block with a heading — scope of services, terms, conditions. */
export type DocumentTextBlock = { title: string; body: string[]; icon?: DocumentIcon };
/** Hour-by-hour plan of the working day. */
export type DocumentScheduleStep = { time: string; label: string; duration: string };
/** Scannable code that is not a payment part (e.g. link to the online offer). */
export type DocumentQr = { dataUrl: string; caption: string; title: string };
/**
 * Optional service. `selected: false` stays outside every total — it is priced
 * but not charged until the customer picks it, which creates a new version.
 */
export type DocumentOption = { description: string; amount?: number; priceLabel?: string; selected: boolean };

export type DocumentModel = {
  kind: "invoice" | "quote" | "order";
  reference: string;
  issuedOn: string;
  dueOn: string;
  issuer: IssuerBlock;
  recipient: string[];
  lines: DocumentLine[];
  net: number;
  vat: number;
  vatRate: number;
  total: number;
  currency: string;
  /** Present on invoices only. */
  payment?: PaymentPart;
  notes: string[];
  facts?: DocumentFact[];
  sections?: DocumentSection[];
  schedule?: DocumentScheduleStep[];
  scheduleTitle?: string;
  /**
   * One dated plan per service day. Moving and cleaning are printed as
   * separate sections so cleaning never continues the moving day.
   */
  schedules?: { title: string; rows: DocumentScheduleStep[] }[];
  qr?: DocumentQr;
  /** Document version the customer accepts — printed and bound to acceptance. */
  version?: number;
  /** Plain status line, e.g. "Entwurf" or "Offerte". */
  status?: string;
  /** Optional services, excluded from every total until selected. */
  options?: DocumentOption[];
  /** Quantity/tariff proof for hourly offers, including the minimum. */
  effort?: DocumentSection;
  /** Customer-facing minimum-billing explanation for hourly services. */
  minimumNote?: string;
  /** Print the acceptance block (version, options, place/date, signature). */
  acceptance?: boolean;
  /** Second title line, e.g. the object the offer covers. */
  subtitle?: string;
  /** Short opening paragraph above the commercial overview. */
  intro?: string;
  /** One-line contact strip repeated at the top of every page. */
  contactStrip?: string;
  /** Bank line repeated in the footer of every page. */
  bankLine?: string;
  /** Customer block and contact/basis block, printed side by side. */
  parties?: DocumentParty[];
  appointments?: DocumentAppointment[];
  appointmentsTitle?: string;
  /** Pick-up and drop-off address blocks with their access details. */
  locations?: DocumentLocation[];
  locationsTitle?: string;
  /** Commercial summary under the price table. */
  summary?: DocumentSummaryRow[];
  summaryTitle?: string;
  /** Heading above the position table. */
  priceTitle?: string;
  /** Footnotes printed under the summary. */
  summaryNotes?: string[];
  /** Scope of services, printed as headed paragraphs. */
  scopeBlocks?: DocumentTextBlock[];
  scopeTitle?: string;
  /** Contract conditions, printed after the offer content. */
  terms?: DocumentTextBlock[];
  termsTitle?: string;
  termsSubtitle?: string;
  /** Sentence the customer ticks in the acceptance block. */
  acceptanceStatement?: string;
  /** Contact for changes, printed under the acceptance block. */
  acceptanceContact?: string;
  /** Enforce the approved commercial / scope / terms page sequence. */
  mandatoryQuoteFormat?: boolean;
};

/** Optional presentation detail a caller can attach to a rendered document. */
export type DocumentExtras = Partial<
  Pick<
    DocumentModel,
    | "facts"
    | "sections"
    | "schedule"
    | "scheduleTitle"
    | "schedules"
    | "qr"
    | "version"
    | "status"
    | "options"
    | "effort"
    | "minimumNote"
    | "acceptance"
    | "subtitle"
    | "intro"
    | "contactStrip"
    | "bankLine"
    | "parties"
    | "appointments"
    | "appointmentsTitle"
    | "locations"
    | "locationsTitle"
    | "summary"
    | "summaryTitle"
    | "priceTitle"
    | "summaryNotes"
    | "scopeBlocks"
    | "scopeTitle"
    | "terms"
    | "termsTitle"
    | "termsSubtitle"
    | "acceptanceStatement"
    | "acceptanceContact"
    | "mandatoryQuoteFormat"
  >
>;


export function creditorFrom(entity: EntityFields | null | undefined): Partial<CreditorConfig> {
  const e = entity ?? {};
  return {
    name: (e.legal_name ?? "").trim(),
    addressLine: (e.address_line ?? "").trim(),
    postalCode: (e.postal_code ?? "").trim(),
    city: (e.city ?? "").trim(),
    country: (e.country ?? "CH").trim(),
    qrIban: (e.qr_iban ?? "").trim(),
  };
}

export function paymentPart(
  entity: EntityFields | null | undefined,
  invoice: { id: string; reference: string; created_at?: string | null; qr_reference?: string | null },
  amount: number,
  currency: string,
  debtor?: PaymentPart["debtor"],
): PaymentPart {
  const creditor = creditorFrom(entity);
  const state = qrBillState(creditor);
  // Only a bank-issued QR-IBAN may print a structured QRR reference; on an
  // ordinary account the invoice number is the payment reference.
  const structured = qrReferenceMode(creditor.qrIban ?? "") !== "NON";
  const reference = !structured
    ? invoice.reference
    : (invoice.qr_reference ?? "").trim() ||
    buildQrReference(
      `${(invoice.created_at ?? "").replace(/\D/g, "").slice(0, 8)}${invoice.reference.replace(/\D/g, "")}${invoice.id.replace(/-/g, "")}`,
    );
  return {
    state: state.configured ? "configured" : "not_configured",
    missing: state.missing,
    reference,
    referenceFormatted: structured ? formatQrReference(reference) : reference,
    creditor,
    amount,
    currency,
    ...(debtor ? { debtor } : {}),
  };
}

type InvoiceInput = {
  id: string;
  reference: string;
  created_at?: string | null;
  issued_at?: string | null;
  due_on?: string | null;
  qr_reference?: string | null;
  net: number | string;
  vat: number | string;
  total: number | string;
  currency?: string | null;
};

/** Invoice addressee lines: name, street, "zip city" from the stored billing address. */
export function invoiceRecipient(name: string | null | undefined, address: unknown): string[] {
  const a = (address && typeof address === "object" ? address : {}) as Record<string, unknown>;
  const s = (k: string) => (typeof a[k] === "string" ? (a[k] as string).trim() : "");
  const place = [s("zip"), s("city")].filter(Boolean).join(" ");
  return [(name ?? "").trim(), s("street"), place].filter(Boolean);
}

export function invoiceDocument(
  invoice: InvoiceInput,
  lines: Array<{ description: string; quantity: number | string; unit_price: number | string; net: number | string; vat_rate: number | string }>,
  entity: EntityFields | null | undefined,
  recipient: string[] = [],
): DocumentModel {
  const currency = invoice.currency || "CHF";
  const total = Number(invoice.total);
  return {
    kind: "invoice",
    reference: invoice.reference,
    issuedOn: (invoice.issued_at ?? invoice.created_at ?? "").slice(0, 10),
    dueOn: (invoice.due_on ?? "").slice(0, 10),
    issuer: issuerBlock(entity),
    recipient,
    lines: lines.map((l) => ({
      description: l.description,
      quantity: Number(l.quantity),
      unitPrice: Number(l.unit_price),
      net: Number(l.net),
      vatRate: Number(l.vat_rate),
    })),
    net: Number(invoice.net),
    vat: Number(invoice.vat),
    vatRate: VAT_RATE,
    total,
    currency,
    payment: paymentPart(entity, invoice, total, currency, {
      ...(recipient[0] ? { name: recipient[0] } : {}),
      ...(recipient[1] ? { addressLine: recipient[1] } : {}),
      ...(recipient[2]?.split(" ")[0] ? { postalCode: recipient[2].split(" ")[0] } : {}),
      ...(recipient[2]?.split(" ").slice(1).join(" ") ? { city: recipient[2].split(" ").slice(1).join(" ") } : {}),
    }),
    notes: [],
    // Banking data is printed in the footer only when it is on file.
    ...(bankFooterLine(entity) ? { bankLine: bankFooterLine(entity)! } : {}),
  };
}

type QuoteInput = {
  reference: string;
  created_at?: string | null;
  valid_until?: string | null;
  line_items?: unknown;
  labour?: number | string | null;
  materials?: number | string | null;
  transport?: number | string | null;
  equipment?: number | string | null;
  disposal?: number | string | null;
  discount?: number | string | null;
  vat: number | string;
  total: number | string;
  currency?: string | null;
  terms?: string | null;
};

const num = (value: unknown): number => Number(value ?? 0) || 0;

export function quoteDocument(
  quote: QuoteInput,
  entity: EntityFields | null | undefined,
  recipient: string[] = [],
  labels: Partial<Record<"labour" | "materials" | "transport" | "equipment" | "disposal" | "discount", string>> = {},
): DocumentModel {
  const stored = Array.isArray(quote.line_items)
    ? (quote.line_items as Array<{ description?: string; quantity?: number; unit_price?: number; net?: number }>)
    : [];
  const lines: DocumentLine[] = stored.length
    ? stored.map((l) => ({
        description: String(l.description ?? ""),
        quantity: num(l.quantity) || 1,
        unitPrice: num(l.unit_price) || num(l.net),
        net: num(l.net) || num(l.unit_price) * (num(l.quantity) || 1),
        vatRate: VAT_RATE,
      }))
    : (
        [
          ["labour", quote.labour],
          ["materials", quote.materials],
          ["transport", quote.transport],
          ["equipment", quote.equipment],
          ["disposal", quote.disposal],
          ["discount", quote.discount == null ? null : -Math.abs(num(quote.discount))],
        ] as const
      )
        .filter(([, value]) => value != null && num(value) !== 0)
        .map(([key, value]) => ({
          description: labels[key] ?? key,
          quantity: 1,
          unitPrice: num(value),
          net: num(value),
          vatRate: VAT_RATE,
        }));

  const net = lines.reduce((sum, l) => sum + l.net, 0);
  return {
    kind: "quote",
    reference: quote.reference,
    issuedOn: (quote.created_at ?? "").slice(0, 10),
    dueOn: (quote.valid_until ?? "").slice(0, 10),
    issuer: issuerBlock(entity),
    recipient,
    lines,
    net,
    vat: num(quote.vat),
    vatRate: VAT_RATE,
    total: num(quote.total),
    currency: quote.currency || "CHF",
    notes: quote.terms ? [quote.terms] : [],
    ...(bankFooterLine(entity) ? { bankLine: bankFooterLine(entity)! } : {}),
  };
}
