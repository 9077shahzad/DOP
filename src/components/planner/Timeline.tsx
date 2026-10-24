import { useTranslation } from "react-i18next";

import type { Lang } from "@/i18n/config";
import { formatNumber } from "@/i18n/format";
import { clockLabel, CLEANING_HANDOVER_HOUR, type TimelinePlan } from "@/lib/pricing";

/**
 * One dated working plan. Moving and cleaning each get their own section, so
 * cleaning never continues the moving day into the night.
 */
export function Timeline({ plan, lang }: { plan: TimelinePlan; lang: Lang }) {
  const { t } = useTranslation("planer");
  const headingId = `einsatzplan-${plan.id}`;

  return (
    <section aria-labelledby={headingId} className="rounded-2xl bg-surface">
      <div className="border-b border-line px-5 py-4">
        <h2 id={headingId} className="text-2xl">
          {t(`timeline.title_${plan.id}`)}
        </h2>
        <p className="mt-1 text-sm text-soft">
          {plan.date ? `${plan.date} · ` : ""}
          {t("timeline.note")}
        </p>
        {plan.id === "clean" ? (
          <p className="data-mono mt-1 text-sm text-primary">
            {t("timeline.handover", { time: clockLabel(plan.handoverAt ?? CLEANING_HANDOVER_HOUR) })}
          </p>
        ) : null}
        {plan.conflict ? (
          <p role="status" className="mt-2 text-sm text-danger">
            {t("timeline.handoverConflict")}
          </p>
        ) : null}
      </div>

      <ol className="flex flex-col md:flex-row md:items-stretch">
        {plan.steps.map((s, i) => (
          <li
            key={s.id}
            className="flex-1 border-b border-line p-4 last:border-b-0 md:border-b-0 md:border-e md:last:border-e-0"
          >
            <div className="flex items-center gap-2">
              <span className="label-mono flex size-6 items-center justify-center bg-ink text-canvas">
                {i + 1}
              </span>
              <span className="data-mono text-sm text-primary">{clockLabel(s.start)}</span>
            </div>
            <p className="mt-2 font-medium text-ink">{t(`timeline.${s.id}`)}</p>
            <p className="data-mono mt-1 text-xs text-soft">
              {formatNumber(s.hours, lang, { maximumFractionDigits: 2 })} h
            </p>
            <div
              aria-hidden="true"
              className="mt-3 h-1 bg-primary"
              style={{ width: `${Math.min(100, s.hours * 22)}%` }}
            />
          </li>
        ))}
      </ol>
    </section>
  );
}
