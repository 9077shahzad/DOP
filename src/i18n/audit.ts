import { DEFAULT_LANG, SUPPORTED_LANGS, resources, type Lang } from "./config";

type Report = Record<Lang, { missing: string[]; extra: string[]; empty: string[] }>;

function flatten(input: unknown, prefix = "", out: Record<string, string> = {}) {
  if (input && typeof input === "object") {
    for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
      const path = prefix ? `${prefix}.${key}` : key;
      if (value && typeof value === "object") flatten(value, path, out);
      else out[path] = String(value ?? "");
    }
  }
  return out;
}

/**
 * Dev-only translation audit: reports keys missing from, extra in, or empty in
 * each language compared with the default (de) dictionary.
 */
export function auditTranslations(): Report {
  const base = flatten(resources[DEFAULT_LANG]);
  const baseKeys = Object.keys(base);
  const report = {} as Report;

  for (const lang of SUPPORTED_LANGS) {
    const flat = flatten(resources[lang]);
    const keys = Object.keys(flat);
    report[lang] = {
      missing: baseKeys.filter((k) => !(k in flat)),
      // Languages with more plural forms than German (Arabic: zero/two/few/many)
      // may add those forms to a key German pluralises with _one/_other.
      extra: keys.filter((k) => {
        if (k in base) return false;
        const stem = k.replace(/_(zero|two|few|many)$/, "");
        return stem === k || !(`${stem}_other` in base);
      }),
      empty: keys.filter((k) => (flat[k] ?? "").trim() === ""),
    };
  }

  if (import.meta.env.DEV) {
    for (const lang of SUPPORTED_LANGS) {
      const { missing, extra, empty } = report[lang];
      if (missing.length || extra.length || empty.length) {
        console.warn(`[i18n audit] ${lang}`, { missing, extra, empty });
      }
    }
  }

  return report;
}

if (import.meta.env.DEV && typeof window !== "undefined") {
  (window as unknown as { auditTranslations: typeof auditTranslations }).auditTranslations =
    auditTranslations;
}
