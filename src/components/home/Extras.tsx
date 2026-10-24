/**
 * Consumer-facing homepage blocks that sit between the hero and the contact
 * band: the three-step explainer, the guarantee banner, the benefit grid,
 * customer voices, partner strip and the short guide teasers.
 *
 * Anything not yet backed by real, verifiable data (reviews, partner names)
 * carries the shared placeholder badge — the site never claims proof it does
 * not have.
 */
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BadgeCheck,
  CalendarClock,
  FileCheck2,
  MapPin,
  Quote,
  ShieldCheck,
  Star,
  UserRound,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import { Section, SectionHead } from "@/components/public/Section";
import { buttonVariants } from "@/components/system";
import type { Lang } from "@/i18n/config";
import { cn } from "@/lib/utils";

const STEPS = ["s1", "s2", "s3"] as const;
const BENEFITS = ["b1", "b2", "b3", "b4", "b5", "b6"] as const;
const BENEFIT_ICONS = [FileCheck2, ShieldCheck, UserRound, BadgeCheck, CalendarClock, MapPin] as const;
const REVIEWS = ["r1", "r2", "r3", "r4", "r5", "r6"] as const;
const GUIDES = ["g1", "g2", "g3"] as const;

function PlaceholderBadge() {
  const { t } = useTranslation("common");
  return <p className="label-mono text-warning">{t("placeholder.badge")}</p>;
}

/** 01 → 02 → 03. The shortest possible promise of how the changeover runs. */
export function ThreeSteps({ lang }: { lang: Lang }) {
  const { t } = useTranslation("home");

  return (
    <Section tone="canvas">
      <SectionHead align="center" title={t("steps3.title")} lead={t("steps3.lead")} className="mx-auto text-center" />
      <ol className="mt-12 grid gap-4 md:grid-cols-3">
        {STEPS.map((s) => (
          <li key={s} className="flex flex-col rounded-2xl bg-surface p-6 md:p-8">
            <p className="data-mono text-2xl text-primary">{t(`steps3.${s}.label`)}</p>
            <h3 className="type-h3 mt-5 text-ink">{t(`steps3.${s}.title`)}</h3>
            <p className="type-small mt-3 flex-1 text-ink-2">{t(`steps3.${s}.body`)}</p>
            {s === "s1" ? (
              <Link
                to="/$lang/planer"
                params={{ lang }}
                className="label-mono mt-6 inline-flex items-center gap-2 text-primary underline-offset-4 hover:underline"
              >
                {t("steps3.s1.cta")}
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
            ) : null}
          </li>
        ))}
      </ol>
    </Section>
  );
}

/** The one commercial promise worth a full-width band. */
export function GuaranteeBanner({ lang }: { lang: Lang }) {
  const { t } = useTranslation("home");

  return (
    <Section tone="primary">
      <div className="grid items-center gap-8 rounded-3xl bg-canvas p-8 md:grid-cols-[minmax(0,1fr)_auto] md:p-12">
        <div className="min-w-0">
          <p className="label-mono text-primary">{t("promo.eyebrow")}</p>
          <h2 className="type-h2 mt-4 text-ink">{t("promo.title")}</h2>
          <p className="type-body mt-4 max-w-2xl text-ink-2">{t("promo.body")}</p>
        </div>
        <Link
          to="/$lang/planer"
          params={{ lang }}
          className={cn(buttonVariants({ variant: "primary", size: "lg" }), "shrink-0")}
        >
          {t("promo.cta")}
        </Link>
      </div>
    </Section>
  );
}

/** Six reasons, icon-led, deliberately short. */
export function Benefits() {
  const { t } = useTranslation("home");

  return (
    <Section tone="surface">
      <SectionHead align="center" title={t("benefits.title")} lead={t("benefits.lead")} className="mx-auto text-center" />
      <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {BENEFITS.map((b, i) => {
          const Icon = BENEFIT_ICONS[i] ?? BadgeCheck;
          return (
            <li key={b} className="rounded-2xl bg-canvas p-6">
              <Icon aria-hidden="true" strokeWidth={1.5} className="size-6 text-primary" />
              <h3 className="mt-5 text-[1.0625rem] font-semibold text-ink">{t(`benefits.${b}.title`)}</h3>
              <p className="type-small mt-2 text-ink-2">{t(`benefits.${b}.body`)}</p>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}

/** Customer voices. Marked as placeholders until real reviews are collected. */
export function Reviews() {
  const { t } = useTranslation("home");
  const isPlaceholder = t("reviews.ph") === "true";

  return (
    <Section tone="canvas">
      <SectionHead align="center" title={t("reviews.title")} lead={t("reviews.lead")} className="mx-auto text-center" />
      {isPlaceholder ? (
        <div className="mt-4 flex justify-center">
          <PlaceholderBadge />
        </div>
      ) : null}

      <ul className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {REVIEWS.map((r) => (
          <li key={r} className="flex flex-col rounded-2xl bg-surface p-6">
            <Quote aria-hidden="true" strokeWidth={1.5} className="size-5 text-primary" />
            <p className="type-small mt-4 flex-1 text-ink">{t(`reviews.${r}.quote`)}</p>
            <div className="mt-6 flex items-center justify-between gap-3">
              <p className="label-mono text-soft">
                {t(`reviews.${r}.name`)} · {t(`reviews.${r}.city`)}
              </p>
              <span aria-hidden="true" className="flex gap-0.5">
                {[0, 1, 2, 3, 4].map((n) => (
                  <Star key={n} className="size-3.5 fill-primary text-primary" />
                ))}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </Section>
  );
}

/** Partner / channel strip. Wordmarks only — no borrowed logos. */
export function Partners() {
  const { t } = useTranslation("home");
  const names = ["Immobilien Zürich", "Hauswartung Nord", "Storage Basel", "Entsorgung AG", "Facility Ost"];

  return (
    <Section tone="surface">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="label-mono text-soft">{t("partners.title")}</p>
        {t("partners.ph") === "true" ? <PlaceholderBadge /> : null}
      </div>
      <ul className="mt-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {names.map((n) => (
          <li
            key={n}
            className="rounded-xl bg-canvas px-4 py-5 text-center text-sm font-semibold text-soft"
          >
            {n}
          </li>
        ))}
      </ul>
    </Section>
  );
}

/** Short guide teasers, each pointing at a real page. */
export function GuideTeasers({ lang }: { lang: Lang }) {
  const { t } = useTranslation("home");

  const targets = [
    { to: "/$lang/planer" as const, params: { lang } },
    { to: "/$lang/leistungen/$service" as const, params: { lang, service: "reinigung" } },
    { to: "/$lang/kontakt" as const, params: { lang } },
  ];

  return (
    <Section tone="canvas">
      <SectionHead title={t("guide.title")} lead={t("guide.lead")} />
      <ul className="mt-10 grid gap-4 md:grid-cols-3">
        {GUIDES.map((g, i) => {
          const target = targets[i] ?? targets[0]!;
          return (
            <li key={g} className="flex flex-col rounded-2xl bg-surface p-6 md:p-7">
              <h3 className="type-h3 text-ink">{t(`guide.${g}.title`)}</h3>
              <p className="type-small mt-3 flex-1 text-ink-2">{t(`guide.${g}.body`)}</p>
              <Link
                {...(target as { to: "/$lang/planer"; params: { lang: Lang } })}
                className="label-mono mt-6 inline-flex items-center gap-2 text-primary underline-offset-4 hover:underline"
              >
                {t(`guide.${g}.cta`)}
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}

/** Closing conversion band shared by the public sub-pages. */
export function CtaBand({ lang }: { lang: Lang }) {
  const { t } = useTranslation("pages");

  return (
    <Section tone="ink">
      <div className="grid gap-8 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] md:items-center">
        <div>
          <h2 className="type-h2 text-canvas">{t("cta.title")}</h2>
          <p className="type-lead mt-4 text-canvas/75">{t("cta.body")}</p>
        </div>
        <div className="flex flex-wrap gap-3 md:justify-end">
          <Link
            to="/$lang/planer"
            params={{ lang }}
            className={cn(buttonVariants({ variant: "primary" }))}
          >
            {t("cta.primary")}
          </Link>
          <Link
            to="/$lang/kontakt"
            params={{ lang }}
            className="label-mono inline-flex min-h-12 items-center rounded-xl border border-canvas/30 px-5 text-canvas transition-colors hover:bg-canvas/10"
          >
            {t("cta.secondary")}
          </Link>
        </div>
      </div>
    </Section>
  );
}
