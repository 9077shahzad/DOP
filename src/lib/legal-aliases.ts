/**
 * Conventional legal URLs people actually type or link to.
 *
 * The canonical location of every legal document is `/{lang}/legal/{docType}`.
 * These aliases exist because Swiss and German visitors type `/impressum`,
 * French ones `/mentions-legales`, and inbound links from registries and
 * directories use the same conventional slugs. Every alias resolves to a
 * permanent (301) redirect to the canonical path — never a duplicate page.
 */
import { SUPPORTED_LANGS, isLang, type Lang } from "@/i18n/config";
import type { DocType } from "@/lib/legal";

/** Per-language alias slug -> canonical document type. */
export const LEGAL_ALIASES: Record<Lang, Record<string, DocType>> = {
  de: {
    impressum: "legal_notice",
    datenschutz: "privacy",
    datenschutzerklaerung: "privacy",
    agb: "terms",
    cookies: "cookies",
    "cookie-richtlinie": "cookies",
    widerruf: "cancellation",
    stornierung: "cancellation",
  },
  fr: {
    "mentions-legales": "legal_notice",
    confidentialite: "privacy",
    "politique-de-confidentialite": "privacy",
    cgv: "terms",
    cookies: "cookies",
    annulation: "cancellation",
  },
  it: {
    "note-legali": "legal_notice",
    privacy: "privacy",
    termini: "terms",
    cookie: "cookies",
    cookies: "cookies",
    cancellazione: "cancellation",
  },
  en: {
    imprint: "legal_notice",
    "legal-notice": "legal_notice",
    privacy: "privacy",
    "privacy-policy": "privacy",
    terms: "terms",
    cookies: "cookies",
    cancellation: "cancellation",
  },
  ar: {
    imprint: "legal_notice",
    "legal-notice": "legal_notice",
    privacy: "privacy",
    "privacy-policy": "privacy",
    terms: "terms",
    cookies: "cookies",
    cancellation: "cancellation",
  },
};

/**
 * Language-prefixed alias: `/de/impressum` -> `/de/legal/legal_notice`.
 * Returns null when the slug is not an alias, so the caller can 404 honestly.
 */
export function resolveLangAlias(lang: string, slug: string): string | null {
  if (!isLang(lang)) return null;
  const doc = LEGAL_ALIASES[lang][slug.toLowerCase()];
  return doc ? `/${lang}/legal/${doc}` : null;
}

/**
 * Bare alias without a language prefix: `/impressum`, `/privacy`, `/terms`.
 * Matched against every language's alias table, then resolved into the
 * visitor's detected language so the redirect lands on readable content.
 */
export function resolveBareAlias(slug: string, detected: Lang): string | null {
  const key = slug.toLowerCase();
  // Prefer the detected language's own table, then fall back to any language.
  const own = LEGAL_ALIASES[detected][key];
  if (own) return `/${detected}/legal/${own}`;
  for (const lang of SUPPORTED_LANGS) {
    const doc = LEGAL_ALIASES[lang][key];
    if (doc) return `/${detected}/legal/${doc}`;
  }
  return null;
}

/** Every alias path, used by the crawler and the redirect self-test. */
export function allAliasPaths(): string[] {
  const paths: string[] = [];
  for (const lang of SUPPORTED_LANGS) {
    for (const slug of Object.keys(LEGAL_ALIASES[lang])) paths.push(`/${lang}/${slug}`);
  }
  for (const slug of Object.keys(LEGAL_ALIASES.de)) paths.push(`/${slug}`);
  return [...new Set(paths)];
}
