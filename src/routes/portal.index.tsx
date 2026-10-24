import { Link, createFileRoute } from "@tanstack/react-router";
import { Trans, useTranslation } from "react-i18next";

import { usePortal } from "@/components/portal/PortalContext";
import i18n, { isLang, type Lang } from "@/i18n/config";
import { formatCurrency, formatDayMonthYear } from "@/i18n/format";
import { buttonVariants } from "@/components/system";
import { servicesOf } from "@/lib/portal";
import { langOf, privateHead } from "@/lib/seo";

export const Route = createFileRoute("/portal/")({
  head: () => privateHead(langOf(i18n.language), "portalOverview"),
  component: PortalOverview,
});

function PortalOverview() {
  const { data, loading } = usePortal();
  const { t, i18n } = useTranslation("portal");
  const lang = (isLang(i18n.language) ? i18n.language : "de") as Lang;
  const { properties, units, jobs, organization } = data;

  const activeChangeovers = jobs.filter((job) => job.status !== "handover_done").length;

  const now = new Date();
  const weekEnd = new Date(now);
  weekEnd.setDate(now.getDate() + 7);
  const thisWeek = jobs.filter((job) => {
    if (!job.scheduled_date) return false;
    const date = new Date(job.scheduled_date);
    return date >= new Date(now.toDateString()) && date <= weekEnd;
  }).length;

  const upcoming = [...jobs]
    .filter((job) => job.scheduled_date)
    .sort((a, b) => String(a.scheduled_date).localeCompare(String(b.scheduled_date)))
    .slice(0, 8);

  // Repeat booking: the newest job is the natural starting point for a
  // returning customer — the order form opens prefilled from it.
  const lastJob = [...jobs].sort((a, b) =>
    String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")),
  )[0];

  const unitOf = (id: string | null) => units.find((u) => u.id === id);
  const propertyOf = (id: string | null | undefined) => properties.find((p) => p.id === id);

  if (loading) {
    return <p className="label-mono mx-auto max-w-7xl px-4 py-12 text-soft md:px-8">{t("loading")}</p>;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 md:px-8">
      <p className="label-mono text-primary">{organization?.name ?? t("org.fallback")}</p>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-4xl md:text-5xl">{t("overview.title")}</h1>
        <Link
          to="/portal/neuer-auftrag"
          search={lastJob ? { repeat: lastJob.id } : {}}
          className={buttonVariants({ variant: "primary", size: "md" })}
        >
          {lastJob ? t("overview.bookRepeat") : t("overview.book")}
        </Link>
      </div>

      {jobs.length === 0 && properties.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <div className="mt-8 grid gap-px bg-line sm:grid-cols-2 lg:grid-cols-4">
            <Kpi label={t("overview.kpi.properties")} value={properties.length} />
            <Kpi label={t("overview.kpi.units")} value={units.length} />
            <Kpi label={t("overview.kpi.active")} value={activeChangeovers} />
            <Kpi label={t("overview.kpi.week")} value={thisWeek} />
          </div>

          <section className="mt-10 border border-line bg-surface">
            <div className="border-b border-line px-5 py-4">
              <h2 className="text-2xl">{t("overview.upcoming.title")}</h2>
            </div>
            {upcoming.length === 0 ? (
              <p className="px-5 py-6 text-sm text-soft">
                {t("overview.upcoming.empty")}{" "}
                <Link to="/portal/neuer-auftrag" className="text-primary underline">
                  {t("overview.upcoming.emptyLink")}
                </Link>
                .
              </p>
            ) : (
              <table className="w-full text-start text-sm">
                <thead>
                  <tr className="border-b border-line">
                    <Th>{t("table.reference")}</Th>
                    <Th>{t("table.object")}</Th>
                    <Th>{t("table.services")}</Th>
                    <Th>{t("table.date")}</Th>
                    <Th>{t("table.status")}</Th>
                    <Th align="end">{t("table.amount")}</Th>
                  </tr>
                </thead>
                <tbody>
                  {upcoming.map((job) => {
                    const unit = unitOf(job.unit_id);
                    const property = propertyOf(unit?.property_id);
                    return (
                      <tr key={job.id} className="border-b border-line last:border-b-0">
                        <td className="data-mono px-5 py-3">{job.reference}</td>
                        <td className="px-5 py-3 text-ink">
                          {property?.address ?? "—"} · {unit?.label ?? "—"}
                        </td>
                        <td className="px-5 py-3 text-ink-2">
                          {servicesOf(job)
                            .map((key) => t(`serviceShort.${key}`))
                            .join(" · ") || "—"}
                        </td>
                        <td className="data-mono px-5 py-3">
                          {job.scheduled_date
                            ? formatDayMonthYear(job.scheduled_date)
                            : "—"}
                        </td>
                        <td className="px-5 py-3 text-ink">{t(`stage.${job.status}`)}</td>
                        <td className="data-mono px-5 py-3 text-end">
                          {formatCurrency(Number(job.amount), lang)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: number }) {
  return (
    <div className="lift-card bg-surface p-5 elev-raised">
      <p className="label-mono text-soft">{label}</p>
      <p className="data-mono mt-2 text-4xl text-ink">{value}</p>
    </div>
  );
}

function Th({ children, align = "start" }: { children: React.ReactNode; align?: "start" | "end" }) {
  return (
    <th scope="col" className={`label-mono px-5 py-3 text-${align} text-soft`}>
      {children}
    </th>
  );
}

function EmptyState() {
  const { t } = useTranslation("portal");
  return (
    <section className="mt-8 border border-ink bg-surface p-6 md:p-8">
      <p className="label-mono text-primary">{t("overview.empty.eyebrow")}</p>
      <h2 className="mt-3 text-2xl">{t("overview.empty.title")}</h2>
      <ol className="mt-4 space-y-3 text-sm text-ink-2">
        {(["step1", "step2", "step3"] as const).map((step, index) => (
          <li key={step}>
            <span className="data-mono text-primary">{String(index + 1).padStart(2, "0")}</span>{" "}
            <Trans t={t} i18nKey={`overview.empty.${step}`} />
          </li>
        ))}
      </ol>
      <Link
        to="/portal/neuer-auftrag"
        className="mt-6 inline-flex bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary-hover"
      >
        {t("nav.newJob")}
      </Link>
    </section>
  );
}
