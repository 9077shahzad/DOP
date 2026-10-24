import { useTranslation } from "react-i18next";

import type { Lang } from "@/i18n/config";
import { formatDate, formatNumber } from "@/i18n/format";
import type { PricingTrace } from "@/lib/pricing";

/**
 * Customer-safe pricing trace: which published price list produced the figure
 * and which rules it used. Rule labels are translated names — no internal
 * identifiers, no costs, no margins, no draft or historical configuration.
 */
export function PricingTracePanel({ trace, lang }: { trace: PricingTrace | undefined; lang: Lang }) {
  const { t } = useTranslation("planer");
  if (!trace) return null;

  return (
    <details className="border border-line bg-surface">
      <summary className="cursor-pointer px-4 py-3 text-sm text-ink">
        {t("trace.title")}
        <span className="data-mono ml-2 text-soft">
          v{formatNumber(trace.version, lang)} ·{" "}
          {trace.effectiveFrom ? formatDate(trace.effectiveFrom, lang) : ""}
        </span>
      </summary>
      <div className="border-t border-line px-4 py-4">
        <p className="text-sm text-ink-2">{t("trace.note")}</p>
        <ul className="mt-3 space-y-2">
          {trace.lines.map((line) => (
            <li key={line.id}>
              <p className="label-mono text-soft">{t(`quote.lines.${line.id}`)}</p>
              <p className="text-sm text-ink">
                {line.rules.map((rule) => t(`trace.rule.${rule}`, { defaultValue: rule })).join(" · ")}
              </p>
            </li>
          ))}
        </ul>
        {trace.factors.length > 0 ? (
          <dl className="mt-4 grid gap-px bg-line sm:grid-cols-2">
            {trace.factors.map((factor) => (
              <div key={factor.key} className="bg-surface px-3 py-2">
                <dt className="label-mono text-soft">
                  {t(`trace.rule.${factor.key}`, { defaultValue: factor.key })}
                </dt>
                <dd className="data-mono text-sm text-ink">
                  {formatNumber(factor.value, lang, { maximumFractionDigits: 3 })}
                </dd>
              </div>
            ))}
          </dl>
        ) : null}
      </div>
    </details>
  );
}
