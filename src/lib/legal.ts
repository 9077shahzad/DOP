/**
 * Legal & Compliance — Switzerland only.
 *
 * The company contracts in Switzerland, under Swiss law, in CHF, with Swiss
 * MWST. There is no EU consumer regime, no market selector and no statutory
 * 14-day distance-contract withdrawal right: cancellation is contractual.
 */

import type { Lang } from "@/i18n/config";

export const COUNTRY = "CH" as const;
export type Country = typeof COUNTRY;

export const CURRENCY = "CHF" as const;

/** Swiss MWST, kept in sync with the estimator configuration. */
export const VAT_RATE = 0.081;

/** Switzerland's national languages plus English — all four run on the site. */
export const DOC_LANGS: Lang[] = ["de", "fr", "it", "en", "ar"];

export const DOC_TYPES = [
  "terms",
  "privacy",
  "cookies",
  "cancellation",
  "legal_notice",
  "complaints",
  "partner_terms",
  "partner_code_of_conduct",
  "partner_privacy",
  "partner_health_safety",
] as const;
export type DocType = (typeof DOC_TYPES)[number];

export const PARTNER_DOC_TYPES: DocType[] = [
  "partner_terms",
  "partner_code_of_conduct",
  "partner_privacy",
  "partner_health_safety",
];

export function isDocType(value: unknown): value is DocType {
  return typeof value === "string" && (DOC_TYPES as readonly string[]).includes(value);
}

/** Language actually available for the document set. */
export function docLanguage(lang: Lang): Lang {
  return DOC_LANGS.includes(lang) ? lang : "de";
}

/** Company-identifying fields; empty means "pending", never invent a value. */
export const COMPANY_FIELDS = [
  "legal_name",
  "register_number",
  "vat_number",
  "address_line",
  "postal_code",
  "city",
  "canton",
  "email",
  "phone",
] as const;
export type CompanyField = (typeof COMPANY_FIELDS)[number];

/**
 * Contact fields that are editable but do not gate the "complete" status:
 * a company may legitimately have no mobile line or website.
 */
export const CONTACT_FIELDS = ["mobile_phone", "website"] as const;
export type ContactField = (typeof CONTACT_FIELDS)[number];

/** Banking data is maintained separately and validated before invoices issue. */
export const BANK_FIELDS = ["bank_name", "iban", "qr_iban"] as const;
export type BankField = (typeof BANK_FIELDS)[number];
