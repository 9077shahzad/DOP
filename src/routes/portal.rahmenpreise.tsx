import { createFileRoute } from "@tanstack/react-router";
import { Trans, useTranslation } from "react-i18next";

import { usePortal } from "@/components/portal/PortalContext";
import i18n, { isLang, type Lang } from "@/i18n/config";
import { formatCurrency, formatDate } from "@/i18n/format";
import { effectiveRates } from "@/lib/portal";
import { langOf, privateHead } from "@/lib/seo";

export const Route = createFileRoute("/portal/rahmenpreise")({
  head: () => privateHead(langOf(i18n.language), "portalRates"),
  component: RatesPage,
});

const SERVICES = ["clean", "clearance", "repairs"] as const;

function RatesPage() {
  const { data, loading } = usePortal();
  const { t, i18n } = useTranslation("portal");
  const lang = (isLang(i18n.language) ? i18n.language : "de") as Lang;
  const discount = Number(data.organization?.framework_discount ?? 0);
  // Published prices with this organisation's agreed overrides applied.
  const rates = effectiveRates(data.rates, data.overrides);

  if (loading) {
    return <p className="label-mono mx-auto max-w-7xl px-4 py-12 text-soft md:px-8">{t("loading")}</p>;
  }

  const groups = SERVICES.filter((service) => rates.some((rate) => rate.service === service));
  const unitTitle = (unitType: string) => {
    const key = `rates.unit.${unitType}`;
    const label = t(key);
    return label === key ? unitType : label;
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 md:px-8">
      <p className="label-mono text-primary">{data.organization?.name ?? t("org.fallback")}</p>
      <h1 className="mt-3 text-4xl md:text-5xl">{t("rates.title")}</h1>
      <p className="mt-4 max-w-2xl text-ink-2">
        <Trans
          t={t}
          i18nKey="rates.intro"
          values={{ percent: Math.round(discount * 100) }}
          components={[<span key="p" className="data-mono" />]}
        />
      </p>

      <section className="mt-6 max-w-2xl border border-line bg-surface p-4">
        <h2 className="label-mono text-soft">{t("rates.trace.title")}</h2>
        <dl className="mt-2 grid gap-1 text-sm sm:grid-cols-3">
          <div>
            <dt className="label-mono text-soft">{t("rates.trace.version")}</dt>
            <dd className="data-mono text-ink">{data.pricingVersion ?? "—"}</dd>
          </div>
          <div>
            <dt className="label-mono text-soft">{t("rates.trace.effective")}</dt>
            <dd className="data-mono text-ink">
              {data.pricingEffectiveFrom ? formatDate(data.pricingEffectiveFrom, lang) : "—"}
            </dd>
          </div>
          <div>
            <dt className="label-mono text-soft">{t("rates.trace.overrides")}</dt>
            <dd className="data-mono text-ink">{data.overrides.length}</dd>
          </div>
        </dl>
        <p className="mt-2 text-xs text-soft">{t("rates.trace.note")}</p>
      </section>

      {rates.length === 0 ? (
        <p className="mt-8 max-w-2xl border border-ink bg-surface p-6 text-sm text-ink-2">
          {t("rates.empty")}
        </p>
      ) : (
        <div className="mt-8 grid gap-px bg-line md:grid-cols-3">
          {groups.map((service) => (
            <section key={service} className="bg-surface p-5">
              <h2 className="text-xl">{t(`rates.service.${service}`)}</h2>
              <dl className="mt-4 space-y-2 text-sm">
                {rates
                  .filter((rate) => rate.service === service)
                  .map((rate) => (
                    <div key={rate.id} className="flex justify-between gap-3 border-b border-line pb-2">
                      <dt className="text-ink-2">{unitTitle(rate.unit_type)}</dt>
                      <dd className="data-mono text-ink">{formatCurrency(Number(rate.price), lang)}</dd>
                    </div>
                  ))}
              </dl>
              <p className="label-mono mt-4 text-primary">
                {t("rates.after")}{" "}
                <span className="data-mono">
                  {formatCurrency(
                    Math.min(
                      ...rates
                        .filter((rate) => rate.service === service)
                        .map((rate) => Number(rate.price) * (1 - discount)),
                    ),
                    lang,
                  )}
                </span>
              </p>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
