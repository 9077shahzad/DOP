/**
 * /$lang/offerte — localized deep link into the quotation wizard at step 1.
 *
 * Distinct from /$lang/offerte/$ref, which shows an existing offer. Query
 * parameters (UTM, referral) are preserved through the redirect.
 */
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/$lang/offerte/")({
  validateSearch: (search: Record<string, unknown>) => search,
  beforeLoad: ({ params, search }) => {
    throw redirect({
      to: "/$lang/planer",
      params: { lang: params.lang },
      search: search as never,
      replace: true,
    });
  },
});
