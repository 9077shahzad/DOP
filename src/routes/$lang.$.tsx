/**
 * Language-prefixed catch-all: turns conventional legal URLs such as
 * `/de/impressum` or `/fr/mentions-legales` into permanent redirects to the
 * canonical `/{lang}/legal/{docType}` page. Anything that is not a known
 * alias 404s honestly rather than being silently rewritten.
 */
import { createFileRoute, notFound, redirect } from "@tanstack/react-router";

import { resolveLangAlias } from "@/lib/legal-aliases";

export const Route = createFileRoute("/$lang/$")({
  beforeLoad: ({ params }) => {
    const target = resolveLangAlias(params.lang, (params._splat ?? "").replace(/\/+$/, ""));
    if (target) throw redirect({ href: target, statusCode: 301, throw: true });
    throw notFound();
  },
  component: () => null,
});
