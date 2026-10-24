import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

import { applyDocumentLanguage, usePortalLanguage } from "@/components/portal/usePortalLanguage";
import { supabase } from "@/integrations/supabase/client";
import { detectLanguage, isLang, storeLanguage, type Lang } from "@/i18n/config";

/**
 * Admin language resolution — same rule as the portal, one shared preference:
 *   profiles.ui_language -> browser language -> de
 * Switching persists to the staff member's own profiles.ui_language through the
 * column-level UPDATE grant, so staff and portal users share one setting.
 */
export function useAdminLanguage(userId: string | null): { active: Lang; setLanguage: (lang: Lang) => void } {
  const { i18n } = useTranslation();
  const { setLanguage } = usePortalLanguage(userId);
  const active = (isLang(i18n.language) ? i18n.language : "de") as Lang;
  const appliedFor = useRef<string | null>(null);

  useEffect(() => {
    applyDocumentLanguage(active);
  }, [active]);

  useEffect(() => {
    if (!userId || appliedFor.current === userId) return;
    appliedFor.current = userId;
    void supabase
      .from("profiles")
      .select("ui_language")
      .eq("id", userId)
      .maybeSingle()
      .then(({ data }) => {
        // Stored preference wins; the admin paths carry no /:lang segment.
        const lang = isLang(data?.ui_language) ? data.ui_language : detectLanguage("/");
        storeLanguage(lang);
        if (i18n.language !== lang) void i18n.changeLanguage(lang);
      });
  }, [userId, i18n]);

  return { active, setLanguage };
}
