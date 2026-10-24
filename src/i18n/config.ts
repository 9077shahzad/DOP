import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import ar from "./ar.json";
import de from "./de.json";
import en from "./en.json";
import fr from "./fr.json";
import it from "./it.json";

export const SUPPORTED_LANGS = ["de", "fr", "it", "en", "ar"] as const;
export type Lang = (typeof SUPPORTED_LANGS)[number];

export const DEFAULT_LANG: Lang = "de";

/**
 * Languages offered in the interface. German stays the default and the
 * fallback; the platform — public site, wizard, portal, admin and crew app —
 * is fully available in all five.
 */
export const UI_LANGS: Lang[] = ["de", "fr", "it", "en", "ar"];

/** Language -> full BCP-47 locale used for Intl formatting and html lang. */
export const LOCALES: Record<Lang, string> = {
  de: "de-CH",
  fr: "fr-CH",
  it: "it-CH",
  en: "en-GB",
  ar: "ar",
};

/** Arabic renders the whole interface right to left. */
export const RTL_LANGS: string[] = ["ar"];

export const NAMESPACES = ["common", "nav", "hero", "planer", "home", "portal", "partner", "legal", "admin", "jobs", "seo", "svc", "intake", "chat", "pages", "ops", "ai", "dop"] as const;

export const resources = { de, fr, it, en, ar } as const;

export function isLang(value: unknown): value is Lang {
  return typeof value === "string" && (SUPPORTED_LANGS as readonly string[]).includes(value);
}

/** Detection order: URL segment -> localStorage -> browser language -> de. */
export function detectLanguage(pathname?: string): Lang {
  const fromUrl = (pathname ?? (typeof window !== "undefined" ? window.location.pathname : ""))
    .split("/")
    .filter(Boolean)[0];
  if (isLang(fromUrl)) return fromUrl;

  if (typeof window !== "undefined") {
    try {
      const stored = window.localStorage.getItem("mf.lang");
      if (isLang(stored)) return stored;
    } catch {
      /* storage unavailable */
    }
    for (const candidate of window.navigator.languages ?? [window.navigator.language]) {
      const base = candidate?.slice(0, 2).toLowerCase();
      if (isLang(base)) return base;
    }
  }

  return DEFAULT_LANG;
}

export function storeLanguage(lang: Lang) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem("mf.lang", lang);
  } catch {
    /* storage unavailable */
  }
}

if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    resources,
    lng: DEFAULT_LANG,
    // Fallback chain: selected -> en -> de. Never render undefined.
    fallbackLng: ["en", "de"],
    ns: NAMESPACES as unknown as string[],
    defaultNS: "common",
    supportedLngs: SUPPORTED_LANGS as unknown as string[],
    interpolation: { escapeValue: false },
    returnNull: false,
    returnEmptyString: false,
    saveMissing: import.meta.env.DEV,
    missingKeyHandler: (lngs, ns, key) => {
      if (import.meta.env.DEV) {
        console.warn(`[i18n] missing key "${ns}:${key}" for ${Array.isArray(lngs) ? lngs.join(",") : lngs}`);
      }
    },
    parseMissingKeyHandler: (key) => key.split(".").pop() ?? key,
  });
}

export default i18n;
