/**
 * Shared types for the notification templates.
 *
 * Kept in its own module so the partner templates and the operational
 * (customer / job / invoice) templates can share the same shape without
 * importing each other.
 */

export type EmailLang = "de" | "fr" | "it" | "en";

export const LANGS: EmailLang[] = ["de", "fr", "it", "en"];

export type TemplateData = {
  /** Partner, customer or contact name, when known. */
  name?: string | null;
  /** Business reference, e.g. MF-P-0042 or MF-2026-9ZFDFXQA. */
  reference?: string | null;
  /** Localised status label. */
  status?: string | null;
  /** Free-text note written by staff. */
  note?: string | null;
  /** Absolute link the CTA points to. */
  actionUrl?: string | null;
  /** Deadline / due date, already formatted. */
  dueDate?: string | null;
  /** Sender company display name. */
  companyName?: string | null;
  /** Already formatted amount incl. currency, e.g. "CHF 1'240.00". */
  amount?: string | null;
  /** Already formatted appointment / execution date. */
  scheduledFor?: string | null;
  /** Address or object description of the job. */
  location?: string | null;
  /** Extra bullet lines rendered verbatim (already localised by the caller). */
  items?: string[] | null;
};

export type Copy = {
  subject: (d: TemplateData) => string;
  heading: (d: TemplateData) => string;
  intro: (d: TemplateData) => string;
  body: (d: TemplateData) => string[];
  cta: string;
  footer: string;
};

export const greeting: Record<EmailLang, (name?: string | null) => string> = {
  de: (n) => (n ? `Guten Tag ${n}` : "Guten Tag"),
  fr: (n) => (n ? `Bonjour ${n}` : "Bonjour"),
  it: (n) => (n ? `Buongiorno ${n}` : "Buongiorno"),
  en: (n) => (n ? `Hello ${n}` : "Hello"),
};

/** Builds a Copy entry whose intro is the standard localised greeting. */
export function copyOf(
  lang: EmailLang,
  parts: Omit<Copy, "intro">,
): Copy {
  return { ...parts, intro: (d) => greeting[lang](d.name) };
}
