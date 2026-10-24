/**
 * Labels that staff maintain (services, inventory, queues, sources, loss
 * reasons, partner categories) live on the record itself, in every interface
 * language, as a single `label_i18n` JSONB field — never as one record per
 * language. German is the source and the fallback.
 */

import { DEFAULT_LANG, type Lang } from "@/i18n/config";

export type LabelI18n = unknown;

/** Reads a record label in the active language, falling back to German. */
export function labelIn(label: LabelI18n, lang: Lang, fallback = ""): string {
  if (label && typeof label === "object") {
    const map = label as Record<string, unknown>;
    const value = map[lang];
    if (typeof value === "string" && value.trim()) return value;
    const german = map[DEFAULT_LANG];
    if (typeof german === "string" && german.trim()) return german;
  }
  return fallback;
}

/** Legacy rows still carrying label_de/fr/it/en columns alongside label_i18n. */
export function rowLabel(
  row:
    | ({ label_i18n?: unknown; label_de?: string | null; label_fr?: string | null; label_it?: string | null; label_en?: string | null })
    | null
    | undefined,
  lang: Lang,
  fallback = "",
): string {
  if (!row) return fallback;
  const columns: Partial<Record<Lang, string | null | undefined>> = {
    de: row.label_de,
    fr: row.label_fr,
    it: row.label_it,
    en: row.label_en,
  };
  return labelIn(row.label_i18n as LabelI18n, lang, columns[lang] || row.label_de || fallback);
}
