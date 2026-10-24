import { useCallback, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

import { supabase } from "@/integrations/supabase/client";
import { LOCALES, RTL_LANGS, detectLanguage, isLang, storeLanguage, type Lang } from "@/i18n/config";
import type { Organization, Profile } from "@/lib/portal";

/**
 * Portal language resolution. The portal is authenticated and has no /:lang
 * URL segment, so the stored preference wins over the URL:
 *   profiles.ui_language -> organizations.ui_language -> browser -> de
 */
export function resolvePortalLanguage(profile: Profile | null, organization: Organization | null): Lang {
  if (isLang(profile?.ui_language)) return profile.ui_language;
  if (isLang(organization?.ui_language)) return organization.ui_language;
  return detectLanguage("/"); // localStorage -> browser -> de, no URL segment to read
}

export function applyDocumentLanguage(lang: Lang) {
  if (typeof document === "undefined") return;
  document.documentElement.lang = LOCALES[lang];
  document.documentElement.dir = RTL_LANGS.includes(lang) ? "rtl" : "ltr";
}

/** The active UI language, plus a setter that persists it to the user's own profile row. */
export function usePortalLanguage(userId: string | null) {
  const { i18n } = useTranslation();
  const active = (isLang(i18n.language) ? i18n.language : "de") as Lang;
  const appliedFor = useRef<string | null>(null);

  useEffect(() => {
    applyDocumentLanguage(active);
  }, [active]);

  /** Applies the stored preference once per signed-in session, never overriding a manual switch. */
  const applyStored = useCallback(
    (profile: Profile | null, organization: Organization | null) => {
      const key = profile?.id ?? organization?.id ?? null;
      if (!key || appliedFor.current === key) return;
      appliedFor.current = key;
      const lang = resolvePortalLanguage(profile, organization);
      storeLanguage(lang);
      if (i18n.language !== lang) void i18n.changeLanguage(lang);
    },
    [i18n],
  );

  const setLanguage = useCallback(
    (lang: Lang) => {
      storeLanguage(lang);
      void i18n.changeLanguage(lang);
      if (!userId) return;
      // Column-level UPDATE grant means only ui_language can ever be written here.
      // The query builder is lazy — it must be awaited to run.
      void supabase
        .from("profiles")
        .update({ ui_language: lang })
        .eq("id", userId)
        .then(({ error }) => {
          if (error) console.warn("[portal] could not persist ui_language", error.message);
        });
    },
    [i18n, userId],
  );

  return { active, setLanguage, applyStored };
}
