import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

import { isIndexable, siteUrl } from "@/lib/site";

/**
 * Served dynamically so the SITE_INDEXABLE switch controls crawling.
 * While indexing is off the whole site is disallowed — a Swiss commercial
 * site without a published Impressum must not be indexed.
 */
export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const origin = siteUrl() || new URL(request.url).origin;
        const body = isIndexable()
          ? [
              "User-agent: Googlebot",
              "Allow: /",
              "",
              "User-agent: Bingbot",
              "Allow: /",
              "",
              "User-agent: Twitterbot",
              "Allow: /",
              "",
              "User-agent: facebookexternalhit",
              "Allow: /",
              "",
              "User-agent: *",
              "Allow: /",
              "",
              "Disallow: /portal",
              "Disallow: /admin",
              "",
              `Sitemap: ${origin}/sitemap.xml`,
              "",
            ].join("\n")
          : ["# Indexing disabled (SITE_INDEXABLE=false)", "User-agent: *", "Disallow: /", ""].join("\n");

        return new Response(body, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "public, max-age=300",
          },
        });
      },
    },
  },
});
