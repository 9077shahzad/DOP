import { Link, createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { brandButton } from "@/components/brand/Button";
import { langOf, publicHead } from "@/lib/seo";
import { PARTNER_GROUPS } from "@/lib/partner";
import { ServiceFlow } from "@/components/depth/ServiceFlow";

export const Route = createFileRoute("/$lang/partner/")({
  head: ({ params }) => publicHead(langOf(params.lang), "partnerLanding", "/partner"),
  component: PartnerLanding,
});

const BENEFITS = [
  "orders",
  "b2b_b2c",
  "framework",
  "markets",
  "digital",
  "communication",
  "transparent",
  "growth",
] as const;

const PROCESS = ["register", "review", "approval", "orders"] as const;
const DOCS = ["identity", "trade_licence", "vat_certificate", "insurance", "bank_details", "safety_policy"] as const;

/**
 * Compensation models a partner can be engaged on. Only the models are listed —
 * the rates themselves are agreed per partner contract and never published here.
 */
const RATE_MODELS = ["fixed", "hourly", "daily", "per_job", "per_trip", "per_km", "quotation"] as const;

function PartnerLanding() {
  const { lang } = Route.useParams();
  const active = langOf(lang);
  const { t: tSvc } = useTranslation("svc");
  const { t } = useTranslation("partner");

  return (
    <div>
      <section className="border-b border-line bg-surface">
        <div className="mx-auto max-w-7xl px-4 py-16 md:px-8 md:py-24">
          <p className="label-mono text-primary">{t("landing.eyebrow")}</p>
          <h1 className="mt-3 max-w-3xl text-4xl leading-tight md:text-6xl">{t("landing.title")}</h1>
          <p className="mt-5 max-w-2xl text-lg text-ink-2">{t("landing.lead")}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              to="/$lang/partner/registrieren"
              params={{ lang: active }}
              className={brandButton({ variant: "primary", size: "lg" })}
            >
              {t("landing.ctaPrimary")}
            </Link>
            <Link to="/partner" className={brandButton({ variant: "ghost", size: "lg" })}>
              {t("landing.ctaSecondary")}
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 md:px-8">
        <h2 className="text-2xl md:text-3xl">{t("landing.benefitsTitle")}</h2>
        <p className="mt-2 max-w-2xl text-ink-2">{t("landing.benefitsLead")}</p>
        <ul className="mt-8 grid gap-px overflow-hidden rounded-md border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
          {BENEFITS.map((key) => (
            <li key={key} className="bg-canvas p-5">
              <h3 className="text-base font-semibold text-ink">{t(`landing.benefits.${key}.title`)}</h3>
              <p className="mt-2 text-sm text-ink-2">{t(`landing.benefits.${key}.body`)}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="border-y border-line bg-surface">
        <div className="mx-auto max-w-7xl px-4 py-16 md:px-8">
          <h2 className="text-2xl md:text-3xl">{t("landing.whoTitle")}</h2>
          <p className="mt-2 max-w-2xl text-ink-2">{t("landing.whoLead")}</p>
          <ul className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {PARTNER_GROUPS.map((group) => (
              <li key={group} className="rounded-md border border-line bg-canvas p-5">
                <h3 className="text-base font-semibold text-ink">{t(`groups.${group}.label`)}</h3>
                <p className="mt-2 text-sm text-ink-2">{t(`groups.${group}.line`)}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 md:px-8">
        <h2 className="text-2xl md:text-3xl">{t("landing.processTitle")}</h2>
        <ol className="mt-8 grid gap-4 md:grid-cols-4">
          {PROCESS.map((key, index) => (
            <li key={key} className="rounded-md border border-line bg-canvas p-5">
              <p className="label-mono text-primary">{String(index + 1).padStart(2, "0")}</p>
              <h3 className="mt-2 text-base font-semibold text-ink">{t(`landing.process.${key}.title`)}</h3>
              <p className="mt-2 text-sm text-ink-2">{t(`landing.process.${key}.body`)}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Compensation: models only, never published rates. */}
      <section className="border-y border-line bg-surface">
        <div className="mx-auto max-w-7xl px-4 py-16 md:px-8">
          <h2 className="text-2xl md:text-3xl">{t("landing.ratesTitle")}</h2>
          <p className="mt-2 max-w-2xl text-ink-2">{t("landing.ratesLead")}</p>
          <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {RATE_MODELS.map((model) => (
              <li key={model} className="rounded-md border border-line bg-canvas p-4 text-sm text-ink">
                {t(`pricing.${model}`)}
              </li>
            ))}
          </ul>
          <p className="mt-6 max-w-2xl text-sm text-soft">{t("landing.ratesNote")}</p>
        </div>
      </section>

      {/* Where partners sit in the dispatch model. */}
      <section className="border-t border-line">
        <div className="mx-auto max-w-7xl px-4 py-16 md:px-8">
          <h2 className="text-2xl md:text-3xl">{tSvc("flow.title")}</h2>
          <p className="mt-2 max-w-2xl text-ink-2">{tSvc("flow.lead")}</p>
          <div className="mt-8">
            <ServiceFlow highlight="partner" />
          </div>
        </div>
      </section>

      <section className="border-t border-line bg-surface">
        <div className="mx-auto max-w-7xl px-4 py-16 md:px-8">
          <h2 className="text-2xl md:text-3xl">{t("landing.docsTitle")}</h2>
          <p className="mt-2 max-w-2xl text-ink-2">{t("landing.docsLead")}</p>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {DOCS.map((doc) => (
              <li key={doc} className="rounded-md border border-line bg-canvas p-4 text-sm text-ink">
                {t(`documents.${doc}`)}
              </li>
            ))}
          </ul>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link
              to="/$lang/partner/registrieren"
              params={{ lang: active }}
              className={brandButton({ variant: "primary", size: "lg" })}
            >
              {t("landing.ctaPrimary")}
            </Link>
            <Link to="/partner" className={brandButton({ variant: "ghost", size: "lg" })}>
              {t("landing.ctaStatus")}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
