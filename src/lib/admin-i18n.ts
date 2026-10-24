import { useTranslation } from "react-i18next";

import { isLang, type Lang } from "@/i18n/config";
import { rowLabel } from "@/lib/i18n-label";
import type { PartnerCategoryRow } from "@/lib/partner-admin-data";

/** The active UI language, for the Intl helpers in the admin screens. */
export function useActiveLang(): Lang {
  const { i18n } = useTranslation();
  return (isLang(i18n.language) ? i18n.language : "de") as Lang;
}

/** Category names are stored per language on the row, not in the dictionaries. */
export function categoryLabel(category: PartnerCategoryRow | undefined, lang: Lang, fallback: string): string {
  if (!category) return fallback;
  return rowLabel(category, lang, fallback);
}
