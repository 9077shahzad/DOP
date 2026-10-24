import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { useTranslation } from "react-i18next";

import { DispatchPanel } from "@/components/admin/DispatchPanel";
import { JobsBoard } from "@/components/admin/JobsBoard";

export const Route = createFileRoute("/admin/auftraege")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({ tab: s["tab"] === "zuteilung" ? ("zuteilung" as const) : undefined }),
  component: AdminJobs,
  head: () => ({
    meta: [
      { title: "Aufträge — PS Umzug Admin" },
      { name: "description", content: "Aufträge steuern, Crew und Fahrzeuge zuteilen, drucken und senden." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Aufträge — PS Umzug Admin" },
      { property: "og:description", content: "Aufträge steuern, zuteilen, drucken und senden." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function AdminJobs() {
  const { tab } = Route.useSearch();
  const navigate = useNavigate();
  const { t: tr } = useTranslation("dop");
  const tabs = [
    { key: undefined, label: tr("au.list") },
    { key: "zuteilung" as const, label: tr("au.dispatch") },
  ];
  return (
    <>
      <p className="label-mono text-primary">{tr("au.step")}</p>
      <div role="tablist" aria-label={tr("au.title")} className="mb-6 mt-3 flex gap-2">
        {tabs.map((t) => (
          <button
            key={t.label}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => void navigate({ to: "/admin/auftraege", search: { tab: t.key } as never, replace: true })}
            className={`label-mono rounded-md border px-3 py-2 ${tab === t.key ? "border-primary bg-primary text-primary-foreground" : "border-line bg-surface text-ink-2"}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === "zuteilung" ? <DispatchPanel /> : <JobsBoard />}
    </>
  );
}
