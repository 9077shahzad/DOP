import { createFileRoute, redirect } from "@tanstack/react-router";

import { DEFAULT_LANG, detectLanguage } from "@/i18n/config";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PS Umzug AG | Umzug, Reinigung und Entsorgung" },
      { name: "description", content: "Umzug, Reinigung und Entsorgung mit PS Umzug AG planen und eine persönliche Offerte anfragen." },
      { property: "og:title", content: "PS Umzug AG | Umzug, Reinigung und Entsorgung" },
      { property: "og:description", content: "Umzug, Reinigung und Entsorgung mit PS Umzug AG planen und eine persönliche Offerte anfragen." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  beforeLoad: () => {
    const lang = typeof window === "undefined" ? DEFAULT_LANG : detectLanguage();
    throw redirect({ to: "/$lang", params: { lang }, replace: true });
  },
  component: () => null,
});
