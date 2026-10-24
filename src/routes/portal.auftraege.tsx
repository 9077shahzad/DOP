import { createFileRoute } from "@tanstack/react-router";
import { Fragment, useState } from "react";
import { useTranslation } from "react-i18next";

import { usePortal } from "@/components/portal/PortalContext";
import i18n, { isLang, type Lang } from "@/i18n/config";
import { formatCurrency, formatDayMonthYear } from "@/i18n/format";
import { STAGES, servicesOf, type Job } from "@/lib/portal";
import { langOf, privateHead } from "@/lib/seo";

export const Route = createFileRoute("/portal/auftraege")({
  head: () => privateHead(langOf(i18n.language), "portalJobs"),
  component: JobsPage,
});

/** Portal-written notes are stored as stable codes; older rows hold free text. */
function useEventNote() {
  const { t } = useTranslation("portal");
  return (note: string | null) => {
    if (!note) return null;
    const key = `jobs.eventNote.${note}`;
    const translated = t(key);
    return translated === key || translated === note.split(".").pop() ? note : translated;
  };
}

function JobsPage() {
  const { data, loading } = usePortal();
  const { t, i18n } = useTranslation("portal");
  const lang = (isLang(i18n.language) ? i18n.language : "de") as Lang;
  const [openId, setOpenId] = useState<string | null>(null);

  const unitOf = (id: string | null) => data.units.find((u) => u.id === id);
  const propertyOf = (id: string | null | undefined) => data.properties.find((p) => p.id === id);

  if (loading) {
    return <p className="label-mono mx-auto max-w-7xl px-4 py-12 text-soft md:px-8">{t("loading")}</p>;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 md:px-8">
      <p className="label-mono text-primary">{t("jobs.eyebrow")}</p>
      <h1 className="mt-3 text-4xl md:text-5xl">{t("jobs.title")}</h1>

      {data.jobs.length === 0 ? (
        <p className="mt-8 max-w-2xl border border-ink bg-surface p-6 text-sm text-ink-2">
          {t("jobs.empty")}
        </p>
      ) : (
        <section className="mt-8 border border-line bg-surface">
          <table className="w-full text-start text-sm">
            <caption className="sr-only">{t("jobs.caption")}</caption>
            <thead>
              <tr className="border-b border-line">
                <th scope="col" className="label-mono px-5 py-3 text-start text-soft">{t("table.reference")}</th>
                <th scope="col" className="label-mono px-5 py-3 text-start text-soft">{t("table.object")}</th>
                <th scope="col" className="label-mono px-5 py-3 text-start text-soft">{t("table.services")}</th>
                <th scope="col" className="label-mono px-5 py-3 text-start text-soft">{t("table.date")}</th>
                <th scope="col" className="label-mono px-5 py-3 text-start text-soft">{t("table.status")}</th>
                <th scope="col" className="label-mono px-5 py-3 text-end text-soft">{t("table.amount")}</th>
              </tr>
            </thead>
            <tbody>
              {data.jobs.map((job) => {
                const unit = unitOf(job.unit_id);
                const property = propertyOf(unit?.property_id);
                const open = openId === job.id;
                return (
                  <Fragment key={job.id}>
                    <tr
                      onClick={() => setOpenId(open ? null : job.id)}
                      aria-expanded={open}
                      aria-label={t("jobs.rowLabel", { reference: job.reference })}
                      tabIndex={0}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setOpenId(open ? null : job.id);
                        }
                      }}
                      className={`cursor-pointer border-b border-line ${open ? "bg-primary-subtle" : "hover:bg-canvas"}`}
                    >
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
                        {job.scheduled_date ? formatDayMonthYear(job.scheduled_date) : "—"}
                      </td>
                      <td className="px-5 py-3 text-ink">{t(`stage.${job.status}`)}</td>
                      <td className="data-mono px-5 py-3 text-end">{formatCurrency(Number(job.amount), lang)}</td>
                    </tr>
                    {open ? (
                      <tr className="border-b border-line bg-canvas">
                        <td colSpan={6} className="px-5 py-6">
                          <Tracker job={job} />
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}

function Tracker({ job }: { job: Job }) {
  const { data } = usePortal();
  const { t, i18n } = useTranslation("portal");
  const lang = (isLang(i18n.language) ? i18n.language : "de") as Lang;
  const noteText = useEventNote();
  const events = data.events.filter((event) => event.job_id === job.id);
  const currentIndex = STAGES.indexOf(job.status);

  return (
    <div>
      <p className="label-mono text-soft">
        {t("jobs.history")} · <span className="data-mono text-ink">{job.reference}</span>
      </p>
      <ol className="mt-4 grid gap-px bg-line md:grid-cols-4">
        {STAGES.map((stage, index) => {
          const event = events.find((item) => item.stage === stage);
          const done = index < currentIndex || Boolean(event && index <= currentIndex);
          const current = index === currentIndex;
          const note = noteText(event?.note ?? null);
          return (
            <li key={stage} className={`bg-surface p-4 ${current ? "border-s-4 border-primary" : ""}`}>
              <div className="flex items-center gap-2">
                <span
                  className={`label-mono flex size-6 items-center justify-center ${
                    current ? "bg-primary text-primary-foreground" : done ? "bg-ink text-canvas" : "bg-line text-soft"
                  }`}
                >
                  {index + 1}
                </span>
                <span className="label-mono text-soft">
                  {current ? t("jobs.state.current") : done ? t("jobs.state.done") : t("jobs.state.open")}
                </span>
              </div>
              <p className={`mt-2 text-sm ${done || current ? "text-ink" : "text-soft"}`}>
                {t(`stage.${stage}`)}
              </p>
              <p className="data-mono mt-1 text-xs text-soft">
                {event ? formatDayMonthYear(event.created_at, true) : "—"}
              </p>
              {note ? <p className="mt-1 text-xs text-ink-2">{note}</p> : null}
            </li>
          );
        })}
      </ol>
      {job.notes ? (
        <p className="mt-4 text-sm text-ink-2">
          {t("jobs.note")}: {job.notes}
        </p>
      ) : null}
    </div>
  );
}
