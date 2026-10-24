/**
 * /offerte — language-agnostic deep link into the quotation wizard.
 *
 * Opens the wizard directly at step 1 in the visitor's detected language.
 * Query parameters (UTM, referral) are carried through the redirect.
 */
import { createFileRoute, redirect } from "@tanstack/react-router";

import { detectLanguage } from "@/i18n/config";

export const Route = createFileRoute("/offerte")({
  validateSearch: (search: Record<string, unknown>) => search,
  beforeLoad: ({ search }) => {
    throw redirect({
      to: "/$lang/planer",
      params: { lang: detectLanguage() },
      search: search as never,
      replace: true,
    });
  },
});
