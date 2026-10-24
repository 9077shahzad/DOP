/**
 * One place that knows the public origin of this deployment.
 *
 * Everything user-visible that needs an absolute URL — canonical tags,
 * hreflang, Open Graph, JSON-LD, sitemap, robots, quote and approval links —
 * reads from here. Configure with PUBLIC_SITE_URL / SITE_URL (plus APP_URL and ADMIN_URL);
 * VITE_-prefixed variants are read for client bundles. No origin is
 * hard-coded — never emit the WordPress marketing site as canonical origin.
 *
 * Indexability is a separate switch and defaults to OFF: the site must stay
 * noindex until the Swiss legal documents are published and demo data is
 * purged.
 */

/**
 * No origin is hard-coded. When PUBLIC_SITE_URL / SITE_URL is not configured
 * the browser origin is used, and on the server absolute URLs are simply
 * omitted rather than pointing at a wrong domain.
 */
function browserOrigin(): string {
  return typeof window !== "undefined" && window.location ? window.location.origin : "";
}

function readEnv(key: string): string {
  const viteEnv = (import.meta as { env?: Record<string, string | undefined> }).env;
  const fromVite = viteEnv?.[`VITE_${key}`] ?? viteEnv?.[key];
  if (fromVite) return String(fromVite);
  if (typeof process !== "undefined" && process.env) return process.env[key] ?? "";
  return "";
}

/** Absolute origin without a trailing slash. */
export function siteUrl(): string {
  const configured = (readEnv("PUBLIC_SITE_URL") || readEnv("SITE_URL")).trim();
  // Server-rendered links (e-mails, PDFs) must always be absolute: fall back
  // to the connected primary domain when no origin is configured.
  const value = configured || browserOrigin() || "https://psumzug.com";
  return value.replace(/\/+$/, "");
}

/** Absolute URL for a site-relative path. */
export function siteHref(path: string): string {
  return `${siteUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}

/**
 * Search engines are only allowed in once this is explicitly enabled.
 * Anything other than "true" (including unset) means noindex.
 */
export function isIndexable(): boolean {
  return readEnv("SITE_INDEXABLE").trim().toLowerCase() === "true";
}

/** Canonical host of the public site (no scheme). */
export function siteHost(): string {
  try {
    return new URL(siteUrl()).host;
  } catch {
    return "";
  }
}

/**
 * Origin of the application itself (customer portal, quotation wizard).
 * Falls back to the public site origin when APP_URL is not configured.
 */
export function appUrl(): string {
  const configured = readEnv("APP_URL").trim();
  return (configured || siteUrl()).replace(/\/+$/, "");
}

/** Origin of the admin console. Falls back to the app origin. */
export function adminUrl(): string {
  const configured = readEnv("ADMIN_URL").trim();
  return (configured || appUrl()).replace(/\/+$/, "");
}
