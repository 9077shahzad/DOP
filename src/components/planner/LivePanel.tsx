import { useTranslation } from "react-i18next";

import { CountUp } from "@/components/planner/primitives";
import { PricingTracePanel } from "@/components/planner/PricingTracePanel";
import { VolumeStack } from "@/components/planner/VolumeStack";
import type { Lang } from "@/i18n/config";
import { formatCurrency, formatNumber } from "@/i18n/format";
import type { DistanceSource } from "@/lib/distance";
import type { Calculation, PlannerState } from "@/lib/pricing";

export function LivePanel({
  calc,
  missing,
  state,
  lang,
  reference,
  unavailable = false,
  distanceSource = "unconfirmed",
  compact = false,
}: {
  calc: Calculation | null;
  missing: string[];
  state: PlannerState;
  lang: Lang;
  reference: string;
  /** No published price list is in force — an offer follows, not a figure. */
  unavailable?: boolean;
  /** While "unconfirmed", travel distance is not part of the shown range. */
  distanceSource?: DistanceSource;
  /** Upload step: show the existing price without the planning diagnostics. */
  compact?: boolean;
}) {
  const { t, i18n } = useTranslation("planer");
  const floor = Math.max(state.floorOut, state.floorIn);

  // Unset inputs mean no figure at all — not a greyed one, not a stale one.
  if (!calc) {
    return (
      <aside
        aria-label={t("panel.title")}
        className="border border-ink bg-surface lg:sticky lg:top-24"
      >
        <h2 className="label-mono border-b border-ink bg-ink px-4 py-3 text-primary">
          {t("panel.title")}
        </h2>
        <div className="px-4 py-6">
          <p className="text-sm text-ink">{unavailable ? t("panel.unavailable") : t("panel.empty")}</p>
          <ul className="mt-3 space-y-1.5">
            {missing.map((key) => (
              <li key={key} className="flex gap-2 text-sm text-ink-2">
                <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 bg-ink" />
                {/* Never show a raw key to the customer: fall back to the step's field label. */}
                <span>{i18n.exists(`planer:panel.missing.${key}`) ? t(`panel.missing.${key}`) : i18n.exists(`planer:blockers.fields.${key}`) ? t(`blockers.fields.${key}`) : t("panel.empty")}</span>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    );
  }

  const rows = [
    {
      label: t("panel.volume"),
      value: calc.m3,
      format: (v: number) => `${formatNumber(v, lang, { maximumFractionDigits: 1 })} m³`,
    },
    { label: t("panel.boxes"), value: calc.boxes, format: (v: number) => formatNumber(Math.round(v), lang) },
    {
      label: t("panel.van"),
      value: calc.vans,
      format: (v: number) => t("panel.vans", { count: Math.round(v) }),
    },
    {
      label: t("panel.crew"),
      value: calc.crew,
      format: (v: number) => t("panel.people", { count: Math.round(v) }),
    },
    {
      label: t("panel.loadTime"),
      value: calc.loadHours,
      format: (v: number) => `${formatNumber(v, lang, { maximumFractionDigits: 1 })} h`,
    },
    {
      label: t("panel.duration"),
      value: calc.totalHours,
      format: (v: number) => `${formatNumber(v, lang, { maximumFractionDigits: 1 })} h`,
    },
  ];


  return (
    <aside
      aria-label={t("panel.title")}
      className="border border-ink bg-surface lg:sticky lg:top-24"
    >
      <h2 className="label-mono border-b border-ink bg-ink px-4 py-3 text-primary">
        {t("panel.title")}
      </h2>

      {!compact ? <>
      <dl className="grid grid-cols-2 gap-px bg-line">
        {rows.map((r) => (
          <div key={r.label} className="bg-surface px-4 py-3">
            <dt className="label-mono text-soft">{r.label}</dt>
            <dd className="mt-1 text-lg text-ink">
              <CountUp value={r.value} format={r.format} />
            </dd>
          </div>
        ))}
      </dl>

      <VolumeStack m3={calc.m3} vans={calc.vans} boxes={calc.boxes} items={state.items} lang={lang} />

      <div className="border-t border-line px-4 py-4">
        <div className="flex items-baseline justify-between gap-3">
          <span className="label-mono text-soft">{t("panel.score")}</span>
          <span className="data-mono type-h2 text-ink">
            <CountUp value={calc.score.score} format={(v) => String(Math.round(v))} />
            <span className="text-sm text-soft">/100</span>
          </span>
        </div>
        <div
          role="img"
          aria-label={`${t("panel.score")} ${calc.score.score}/100 — ${t(`score.${calc.score.label}`)}`}
          className="mt-2 h-2 w-full bg-line"
        >
          <div className="h-full bg-primary transition-[width] duration-500" style={{ width: `${calc.score.score}%` }} />
        </div>
        <p className="label-mono mt-2 text-primary">{t(`score.${calc.score.label}`)}</p>
        <ul className="mt-3 space-y-1.5">
          {calc.score.reasons.slice(0, 4).map((r) => (
            <li key={r.id} className="flex gap-2 text-sm text-ink-2">
              <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 bg-ink" />
              <span>
                {t(`score.reasons.${r.id}`, { floor })}
                <span className="data-mono text-soft"> −{r.deduction}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      </> : null}

      <div className="border-t border-ink bg-ink px-4 py-4 text-canvas">
        <span className="label-mono text-primary">{t("panel.price")}</span>
        <p className="label-mono mt-1 inline-block border border-primary px-2 py-0.5 text-primary">
          {t("stage.richtwert")}
        </p>
        <p className="data-mono mt-1 text-2xl leading-tight">
          <CountUp value={calc.rangeLow} format={(v) => formatCurrency(v, lang)} />
          <span className="px-1 text-soft">–</span>
          <CountUp value={calc.rangeHigh} format={(v) => formatCurrency(v, lang)} />
        </p>
        <p className="mt-1 text-xs text-line/70">{t("panel.priceNote")}</p>
        {distanceSource === "unconfirmed" ? (
          <p className="mt-2 text-xs text-line/80">{t("panel.distanceExcluded")}</p>
        ) : null}

        {calc.discount > 0 ? (
          <p className="label-mono mt-3 inline-block bg-primary px-2 py-1 text-primary-foreground">
            {t("panel.saving", {
              percent: Math.round(calc.discountRate * 100),
              amount: formatCurrency(calc.discount, lang),
            })}
          </p>
        ) : null}

      </div>

      {!compact ? <div className="border-t border-line">
        <PricingTracePanel trace={calc.trace} lang={lang} />
      </div> : null}
    </aside>
  );
}
