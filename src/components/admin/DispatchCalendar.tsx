/**
 * Dispatch calendar — the same open jobs as the board, laid out by day, week
 * or month so a dispatcher sees load and progress at a glance. Read-only:
 * every write still happens through the board's assignment row.
 */
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button, Card, CardHeader } from "@/components/system";
import { formatDate } from "@/i18n/format";
import { useActiveLang } from "@/lib/admin-i18n";
import {
  dayKeyOf,
  groupByDay,
  progressOf,
  shiftAnchor,
  visibleDays,
  type CalendarMode,
} from "@/lib/dispatch-calendar";
import type { JobExec } from "@/lib/jobs-exec";

export function DispatchCalendar({
  jobs,
  teamName,
  vehicleName,
}: {
  jobs: JobExec[];
  teamName: (id: string | null) => string;
  vehicleName: (id: string | null) => string;
}) {
  const { t } = useTranslation("ops");
  const lang = useActiveLang();
  const [mode, setMode] = useState<CalendarMode>("week");
  const [anchor, setAnchor] = useState<Date>(() => new Date());

  const byDay = useMemo(() => groupByDay(jobs), [jobs]);
  const days = useMemo(() => visibleDays(mode, anchor), [mode, anchor]);
  const unplanned = useMemo(() => jobs.filter((j) => !j.scheduled_start), [jobs]);
  const todayKey = dayKeyOf(new Date());

  const heading =
    mode === "month"
      ? formatDate(anchor, lang, { month: "long", year: "numeric" })
      : mode === "week"
        ? `${formatDate(days[0]!, lang, { dateStyle: "medium" })} – ${formatDate(days[days.length - 1]!, lang, { dateStyle: "medium" })}`
        : formatDate(anchor, lang, { dateStyle: "full" });

  return (
    <Card>
      <CardHeader
        title={t("dispatch.cal.title")}
        eyebrow={heading}
        action={
          <div className="flex flex-wrap gap-2">
            {(["day", "week", "month"] as CalendarMode[]).map((m) => (
              <Button key={m} size="sm" variant={mode === m ? "primary" : "outline"} onClick={() => setMode(m)}>
                {t(`dispatch.cal.${m}`)}
              </Button>
            ))}
            <Button size="sm" variant="outline" onClick={() => setAnchor(shiftAnchor(mode, anchor, -1))} aria-label={t("dispatch.cal.prev")}>
              ‹
            </Button>
            <Button size="sm" variant="outline" onClick={() => setAnchor(new Date())}>
              {t("dispatch.cal.today")}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setAnchor(shiftAnchor(mode, anchor, 1))} aria-label={t("dispatch.cal.next")}>
              ›
            </Button>
          </div>
        }
      />

      <div
        className={`mt-4 grid gap-px overflow-hidden rounded-md border border-line bg-line ${
          mode === "day" ? "grid-cols-1" : "grid-cols-2 md:grid-cols-7"
        }`}
      >
        {days.map((day) => {
          const key = dayKeyOf(day);
          const list = byDay.get(key) ?? [];
          const dim = mode === "month" && day.getMonth() !== anchor.getMonth();
          return (
            <div key={key} className={`min-h-24 bg-surface p-2 ${dim ? "opacity-60" : ""}`}>
              <p className={`label-mono ${key === todayKey ? "text-primary" : "text-soft"}`}>
                {formatDate(day, lang, mode === "day" ? { dateStyle: "full" } : { weekday: "short", day: "2-digit", month: "2-digit" })}
              </p>
              <ul className="mt-2 space-y-2">
                {list.map((job) => (
                  <li key={job.id} className="rounded-sm border border-line p-2">
                    <p className="data-mono text-xs text-ink">{job.reference}</p>
                    <p className="type-small text-soft">
                      {job.scheduled_start ? formatDate(job.scheduled_start, lang, { hour: "2-digit", minute: "2-digit" }) : ""}
                      {" · "}
                      {t(`status.${job.status}`, { defaultValue: job.status })}
                    </p>
                    {mode !== "month" ? (
                      <p className="type-small text-soft">
                        {teamName(job.team_id)} · {vehicleName(job.vehicle_id)}
                      </p>
                    ) : null}
                    <div className="mt-1 h-1 w-full rounded-full bg-line" aria-hidden>
                      <div
                        className={`h-1 rounded-full ${job.status === "cancelled" ? "bg-danger" : "bg-primary"}`}
                        style={{ width: `${Math.max(6, progressOf(job.status) * 100)}%` }}
                      />
                    </div>
                  </li>
                ))}
                {list.length === 0 ? <li className="type-small text-soft">—</li> : null}
              </ul>
            </div>
          );
        })}
      </div>

      {unplanned.length > 0 ? (
        <div className="mt-4">
          <p className="label-mono text-soft">{t("dispatch.unplanned")}</p>
          <ul className="mt-2 space-y-1 text-sm">
            {unplanned.map((job) => (
              <li key={job.id} className="data-mono">
                {job.reference} · {t(`status.${job.status}`, { defaultValue: job.status })}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </Card>
  );
}
