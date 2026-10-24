/**
 * /:lang/auftrag/:token — public job tracking.
 *
 * No login: the token names one job. The page shows the appointment, the
 * towns, the crew name and how far the move has progressed — nothing else.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { Card, CardHeader, ErrorState, LoadingState } from "@/components/system";
import { formatDateTime } from "@/i18n/format";
import { langOf, privateHead } from "@/lib/seo";
import { TRACKING_STEPS, fetchJobTracking, trackingStepIndex, type JobTracking } from "@/lib/job-tracking";

export const Route = createFileRoute("/$lang/auftrag/$token")({
  ssr: false,
  head: ({ params }) => privateHead(langOf(params.lang), "status"),
  component: TrackingPage,
});

function TrackingPage() {
  const { lang: raw, token } = Route.useParams();
  const lang = langOf(raw);
  const { t } = useTranslation("ops");
  const [data, setData] = useState<JobTracking | null | "loading">("loading");

  useEffect(() => {
    let alive = true;
    const load = () => {
      void fetchJobTracking(token)
        .then((r) => alive && setData(r))
        .catch(() => alive && setData(null));
    };
    load();
    const timer = window.setInterval(load, 60_000);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [token]);

  if (data === "loading") return <LoadingState label={t("common.loading")} />;
  if (!data) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16">
        <ErrorState message={t("tracking.invalid")} />
      </main>
    );
  }

  const current = trackingStepIndex(data.status);
  const cancelled = data.status === "cancelled";

  return (
    <main className="mx-auto max-w-2xl px-4 py-10 space-y-6">
      <Card>
        <CardHeader title={t("tracking.title")} eyebrow={`${t("tracking.reference")}: ${data.reference}`} />
        <dl className="grid gap-3 sm:grid-cols-2">
          <Detail label={t("tracking.appointment")}>
            {data.scheduledStart ? formatDateTime(data.scheduledStart, lang) : t("common.none")}
            {data.scheduledEnd ? ` – ${formatDateTime(data.scheduledEnd, lang)}` : ""}
          </Detail>
          <Detail label={t("tracking.route")}>
            {[data.originCity, data.destinationCity].filter(Boolean).join(" → ") || t("common.none")}
          </Detail>
          <Detail label={t("tracking.team")}>{data.teamName ?? t("tracking.teamPending")}</Detail>
          <Detail label={t("common.status")}>
            {t(`status.${data.status}`, { defaultValue: data.status })}
          </Detail>
        </dl>
      </Card>

      <Card>
        <CardHeader title={t("tracking.progress")} />
        {cancelled ? (
          <p className="text-sm text-danger-ink">{t("tracking.cancelled")}</p>
        ) : (
          <ol className="space-y-3">
            {TRACKING_STEPS.map((step, index) => {
              const done = current >= index;
              return (
                <li key={step} className="flex items-center gap-3">
                  <span
                    aria-hidden
                    className={`h-3 w-3 shrink-0 rounded-full ${done ? "bg-primary" : "bg-line"}`}
                  />
                  <span className={done ? "text-sm font-medium" : "text-sm text-soft"}>
                    {t(`status.${step}`, { defaultValue: step })}
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </Card>

      {data.timeline.length > 0 ? (
        <Card>
          <CardHeader title={t("tracking.history")} />
          <ul className="space-y-2 text-sm">
            {data.timeline.map((entry, i) => (
              <li key={`${entry.at}-${i}`} className="flex justify-between gap-4">
                <span>{t(`status.${entry.status}`, { defaultValue: entry.status })}</span>
                <span className="text-soft">{formatDateTime(entry.at, lang)}</span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {data.contactPhone ? (
        <p className="text-sm text-soft">
          {t("tracking.help")}{" "}
          <a className="underline" href={`tel:${data.contactPhone.replace(/\s/g, "")}`}>
            {data.contactPhone}
          </a>
        </p>
      ) : null}
    </main>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-soft">{label}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  );
}
