import { LOCALES, UI_LANGS, isLang, resources, type Lang } from "@/i18n/config";
import { isIndexable, siteUrl } from "@/lib/site";

/** Deprecated literal replaced by the configurable origin. */
export const SITE_URL = siteUrl();

export type SeoKey =
  | "home"
  | "planer"
  | "offer"
  | "portalOverview"
  | "portalNewJob"
  | "portalJobs"
  | "portalHandover"
  | "portalRates"
  | "portalInvoices"
  | "portalSites"
  | "portalPortfolio"

  | "serviceRequest"
  | "status"
  | "adminQueue"
  | "adminPricing"
  | "adminInbox"
  | "b2b"
  | "contact"
  | "portalSupport"
  | "admin"
  | "partnerLanding"
  | "partnerApply"
  | "partnerPolicy"
  | "legalIndex"
  | "legalDoc"
  | "legalCompany"
  | "about"
  | "guarantees"
  | "howItWorks";

export function langOf(value: unknown): Lang {
  return isLang(value) ? value : "de";
}

function copy(lang: Lang, key: SeoKey) {
  const dict = resources[lang].seo as unknown as Record<
    string,
    { title: string; description: string }
  >;
  const fallback = resources.de.seo as unknown as Record<
    string,
    { title: string; description: string }
  >;
  return dict[key] ?? fallback[key] ?? { title: "PS Umzug AG", description: "" };
}

/**
 * Public page metadata in the active language, with self-referencing
 * canonical / og:url and hreflang alternates for the four language trees.
 */
export function publicHead(lang: Lang, key: SeoKey, path: string) {
  const { title, description } = copy(lang, key);
  const base = siteUrl();
  const url = base ? `${base}/${lang}${path}` : "";

  return {
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      ...(url ? [{ property: "og:url", content: url }] : []),
      { property: "og:locale", content: LOCALES[lang].replace("-", "_") },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
      ...(isIndexable() ? [] : [{ name: "robots", content: "noindex, nofollow" }]),
    ],
    links: base
      ? [
          { rel: "canonical", href: url },
          ...UI_LANGS.map((l) => ({
            rel: "alternate",
            hrefLang: LOCALES[l],
            href: `${base}/${l}${path}`,
          })),
          { rel: "alternate", hrefLang: "x-default", href: `${base}/de${path}` },
        ]
      : [],
  };
}

/** Private pages: translated title and social preview, never indexed. */
export function privateHead(lang: Lang, key: SeoKey) {
  const { title, description } = copy(lang, key);
  return {
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
      { name: "robots", content: "noindex, nofollow" },
    ],
  };
}
