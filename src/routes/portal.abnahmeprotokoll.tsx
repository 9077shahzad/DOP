import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { usePortal } from "@/components/portal/PortalContext";
import i18n, { isLang, type Lang } from "@/i18n/config";
import { formatDate } from "@/i18n/format";
import { langOf, privateHead } from "@/lib/seo";

export const Route = createFileRoute("/portal/abnahmeprotokoll")({
  head: () => privateHead(langOf(i18n.language), "portalHandover"),
  component: HandoverPage,
});

function HandoverPage() {
  const { data, loading } = usePortal();
  const { t, i18n } = useTranslation("portal");
  const lang = (isLang(i18n.language) ? i18n.language : "de") as Lang;

  if (loading) {
    return <p className="label-mono mx-auto max-w-7xl px-4 py-12 text-soft md:px-8">{t("loading")}</p>;
  }

  const ready = data.jobs.filter((job) => job.status === "cleaning" || job.status === "handover_done");

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 md:px-8">
      <p className="label-mono text-primary">{t("handover.eyebrow")}</p>
      <h1 className="mt-3 text-4xl md:text-5xl">{t("handover.title")}</h1>
      <p className="mt-4 max-w-2xl text-ink-2">{t("handover.intro")}</p>

      <section className="mt-8 border border-line bg-surface">
        <div className="border-b border-line px-5 py-4">
          <h2 className="text-2xl">{t("handover.upcoming")}</h2>
        </div>
        {ready.length === 0 ? (
          <p className="px-5 py-6 text-sm text-soft">{t("handover.empty")}</p>
        ) : (
          <ul className="divide-y divide-line">
            {ready.map((job) => {
              const unit = data.units.find((u) => u.id === job.unit_id);
              const property = data.properties.find((p) => p.id === unit?.property_id);
              return (
                <li key={job.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 text-sm">
                  <span className="data-mono">{job.reference}</span>
                  <span className="text-ink">
                    {property?.address ?? "—"} · {unit?.label ?? "—"}
                  </span>
                  <span className="data-mono text-soft">
                    {job.scheduled_date ? formatDate(job.scheduled_date, lang, { dateStyle: "medium" }) : "—"}
                  </span>
                  <span className="label-mono text-primary">{t(`stage.${job.status}`)}</span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
