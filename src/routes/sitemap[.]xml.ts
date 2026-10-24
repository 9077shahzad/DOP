import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

import { UI_LANGS } from "@/i18n/config";
import { siteUrl } from "@/lib/site";

/** Public, indexable pages only — portal, admin and quotation links stay out. */
const PATHS: { path: string; changefreq: string; priority: string }[] = [
  { path: "", changefreq: "weekly", priority: "1.0" },
  { path: "/planer", changefreq: "monthly", priority: "0.8" },
  { path: "/geschaeftskunden", changefreq: "monthly", priority: "0.8" },
  { path: "/ablauf", changefreq: "monthly", priority: "0.7" },
  { path: "/garantien", changefreq: "monthly", priority: "0.7" },
  { path: "/ueber-uns", changefreq: "monthly", priority: "0.6" },
  { path: "/kontakt", changefreq: "monthly", priority: "0.7" },
  { path: "/status", changefreq: "monthly", priority: "0.4" },
  { path: "/legal", changefreq: "monthly", priority: "0.3" },
];

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        // Crawlers ignore relative <loc> entries, so fall back to the origin
        // this request arrived on when no public origin is configured yet.
        const SITE_URL = siteUrl() || new URL(request.url).origin;
        const urls = PATHS.flatMap((entry) =>
          UI_LANGS.map((lang) =>
            [
              `  <url>`,
              `    <loc>${SITE_URL}/${lang}${entry.path}</loc>`,
              `    <changefreq>${entry.changefreq}</changefreq>`,
              `    <priority>${entry.priority}</priority>`,
              `  </url>`,
            ].join("\n"),
          ),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
