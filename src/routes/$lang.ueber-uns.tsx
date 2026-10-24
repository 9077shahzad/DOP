/**
 * /:lang/ueber-uns — who PS Umzug is, how we work and what we hold
 * ourselves to. Editorial, claim-free: no invented team members, no
 * unverifiable numbers.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { CtaBand, GuideTeasers, ThreeSteps } from "@/components/home/Extras";
import { Panel, PageHero, Section, SectionHead } from "@/components/public/Section";
import { BookNowLink } from "@/components/brand/BookNow";
import { langOf, publicHead } from "@/lib/seo";
import type { Lang } from "@/i18n/config";

export const Route = createFileRoute("/$lang/ueber-uns")({
  head: ({ params }) => publicHead(langOf(params.lang), "about", "/ueber-uns"),
  component: AboutPage,
});

const STATS = ["s1", "s2", "s3"] as const;
const VALUES = ["v1", "v2", "v3", "v4"] as const;

function AboutPage() {
  const { lang: raw } = Route.useParams();
  const lang = langOf(raw) as Lang;
  const { t } = useTranslation("pages");

  return (
    <>
      <PageHero
        eyebrow={t("about.eyebrow")}
        title={t("about.title")}
        lead={t("about.lead")}
        actions={<BookNowLink lang={lang} />}
      />

      <Section tone="surface">
        <ul className="grid gap-6 md:grid-cols-3">
          {STATS.map((s) => (
            <li key={s} className="rounded-2xl bg-canvas p-6 md:p-8">
              <p className="type-h3 text-ink">{t(`about.stats.${s}.value`)}</p>
              <p className="type-small mt-3 text-ink-2">{t(`about.stats.${s}.label`)}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section tone="canvas">
        <SectionHead title={t("about.values.title")} lead={t("about.values.lead")} />
        <ul className="mt-10 grid gap-6 md:grid-cols-2">
          {VALUES.map((v) => (
            <li key={v} className="rounded-2xl bg-surface p-6 md:p-8">
              <h3 className="type-h3 text-ink">{t(`about.values.${v}.title`)}</h3>
              <p className="type-small mt-3 text-ink-2">{t(`about.values.${v}.body`)}</p>
            </li>
          ))}
        </ul>
      </Section>

      <ThreeSteps lang={lang} />

      <Section tone="surface">
        <Panel tone="ink" className="grid gap-6 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] md:items-center">
          <div>
            <h2 className="type-h2 text-canvas">{t("about.culture.title")}</h2>
            <p className="type-small mt-4 text-canvas/75">{t("about.culture.body")}</p>
          </div>
          <div className="md:justify-self-end">
            <a
              href={`/${lang}/partner`}
              className="label-mono inline-flex min-h-12 items-center rounded-xl bg-canvas px-5 text-ink transition-colors hover:bg-line"
            >
              {t("about.culture.cta")}
            </a>
          </div>
        </Panel>
      </Section>

      <GuideTeasers lang={lang} />
      <CtaBand lang={lang} />
    </>
  );
}
