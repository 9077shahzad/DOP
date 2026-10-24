/**
 * Root catch-all: bare conventional legal URLs without a language prefix
 * (`/impressum`, `/privacy`, `/terms`, …) permanently redirect into the
 * detected language's canonical legal page. Everything else 404s.
 */
import { createFileRoute, notFound, redirect } from "@tanstack/react-router";

import { DEFAULT_LANG, detectLanguage } from "@/i18n/config";
import { resolveBareAlias } from "@/lib/legal-aliases";

export const Route = createFileRoute("/$")({
  beforeLoad: ({ params }) => {
    const slug = (params._splat ?? "").replace(/\/+$/, "");
    if (!slug || slug.includes("/")) throw notFound();
    const lang = typeof window === "undefined" ? DEFAULT_LANG : detectLanguage();
    const target = resolveBareAlias(slug, lang);
    if (target) throw redirect({ href: target, statusCode: 301, throw: true });
    throw notFound();
  },
  component: () => null,
});
