import { Link } from "@tanstack/react-router";
import { Check, MessageCircle, Phone, Mail } from "lucide-react";
import { useTranslation } from "react-i18next";

import { BookNowLink } from "@/components/brand/BookNow";
import { AreaSelector } from "@/components/home/AreaSelector";
import { ContactForm } from "@/components/home/ContactForm";
import { ServiceChooser } from "@/components/home/ServiceChooser";
import { Benefits, GuaranteeBanner, GuideTeasers, Partners, Reviews, ThreeSteps } from "@/components/home/Extras";
import { Section, SectionHead } from "@/components/public/Section";
import { buttonVariants } from "@/components/system";
import { useCompany } from "@/components/shell/CompanyContext";
import { mailHref, phoneDisplay, telHref } from "@/lib/company";
import { WhatsappHandoff } from "@/components/brand/WhatsappHandoff";
import { PropertyExplorer } from "@/components/depth/PropertyExplorer";
import { ServiceFlow } from "@/components/depth/ServiceFlow";
import type { Lang } from "@/i18n/config";
import { cn } from "@/lib/utils";

const SERVICE_KEYS = ["moving", "cleaning", "disposal"] as const;

export function HomeSections({ lang }: { lang: Lang }) {
  const company = useCompany();
  const { t } = useTranslation(["home", "common", "svc"]);

  const pmRows = [
    { label: t("home:pm.rowSmall"), value: t("home:pm.rowSmallPrice") },
    { label: t("home:pm.row35"), value: t("home:pm.row35Price") },
    { label: t("home:pm.row45"), value: t("home:pm.row45Price") },
    { label: t("home:pm.row55"), value: t("home:pm.row55Price") },
    { label: t("home:pm.rowClear"), value: t("home:pm.rowClearPrice") },
  ];

  const stamp = [1, 2, 3, 4, 5] as const;
  const faqs = [1, 2, 3, 4, 5] as const;
  const trust = [1, 2, 3, 4, 5, 6, 7, 8] as const;

  return (
    <>
      {/* 1 — Stressfrei in drei Schritten */}
      <ThreeSteps lang={lang} />

      {/* 2 — Leistungen: six customer-language categories, sub-services on demand */}
      <Section id="leistungen" tone="canvas">
        <SectionHead title={t("home:catUi.title")} lead={t("home:catUi.lead")} />
        <div className="mt-10">
          <ServiceChooser lang={lang} />
        </div>

        <div className="mt-14 grid gap-4 md:grid-cols-3">
          {SERVICE_KEYS.map((key) => (
            <article key={key} className="flex flex-col rounded-2xl bg-surface p-6 md:p-8">
              <h3 className="type-h3 text-ink">{t(`home:services.${key}.title`)}</h3>
              <p className="type-small mt-3 text-ink-2">{t(`home:services.${key}.desc`)}</p>

              <ul className="mt-6 flex-1 space-y-3">
                {[1, 2, 3, 4].map((n) => (
                  <li key={n} className="flex gap-3 text-sm text-ink">
                    <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span>{t(`home:services.${key}.b${n}`)}</span>
                  </li>
                ))}
              </ul>

              <p className="data-mono mt-7 text-sm text-ink">{t(`home:services.${key}.price`)}</p>
              <BookNowLink lang={lang} size="touch" block className="mt-5" />
            </article>
          ))}
        </div>
      </Section>

      {/* 3 — Abnahmegarantie als Band */}
      <GuaranteeBanner lang={lang} />

      {/* 4 — Vorteile */}
      <Benefits />

      {/* 5 — Kundenstimmen */}
      <Reviews />

      {/* 6 — Partnerleiste */}
      <Partners />

      {/* 7 — Objekt-Explorer */}
      <Section id="objekt" tone="surface">
        <SectionHead title={t("svc:explorer.title")} lead={t("svc:explorer.lead")} />
        <div className="mt-10">
          <PropertyExplorer lang={lang} />
        </div>
      </Section>

      {/* 1c — Einsatzmodell */}
      <Section id="modell" tone="canvas">
        <SectionHead title={t("svc:flow.title")} lead={t("svc:flow.lead")} />
        <div className="mt-10">
          <ServiceFlow />
        </div>
      </Section>

      {/* 2 — Für Verwaltungen */}
      <Section id="verwaltungen" tone="ink">
        <div className="grid gap-12 lg:grid-cols-2">
          <div>
            <SectionHead
              tone="dark"
              eyebrow={t("home:pm.eyebrow")}
              title={t("home:pm.title")}
              lead={t("home:pm.p1")}
            />
            <p className="type-body mt-4 text-canvas/70">{t("home:pm.p2")}</p>
            <Link
              to="/portal"
              className={cn(buttonVariants({ variant: "primary", size: "lg" }), "mt-8")}
            >
              {t("home:pm.cta")}
            </Link>
          </div>

          <div>
            <div className="overflow-hidden rounded-2xl bg-canvas/8 ring-1 ring-canvas/15">
              <p className="label-mono px-5 py-4 text-primary-light">{t("home:pm.tableTitle")}</p>
              <dl>
                {pmRows.map((row) => (
                  <div key={row.label} className="flex items-center justify-between gap-4 px-5 py-3">
                    <dt className="text-sm text-canvas/85">{row.label}</dt>
                    <dd className="data-mono text-sm text-canvas">{row.value}</dd>
                  </div>
                ))}
                <div className="mt-2 flex items-center justify-between gap-4 bg-primary px-5 py-4 text-primary-foreground">
                  <dt className="text-sm font-medium">{t("home:pm.rowFramework")}</dt>
                  <dd className="data-mono text-sm font-medium">{t("home:pm.rowFrameworkPrice")}</dd>
                </div>
              </dl>
            </div>
            <p className="label-mono mt-3 text-canvas/55">{t("home:pm.note")}</p>
          </div>
        </div>
      </Section>

      {/* 3 — Abnahmegarantie */}
      <Section id="abnahmegarantie" tone="surface">
        <div className="grid gap-12 lg:grid-cols-2">
          <SectionHead
            eyebrow={t("home:guarantee.eyebrow")}
            title={t("home:guarantee.title")}
            lead={t("home:guarantee.body")}
          />

          <div className="overflow-hidden rounded-2xl bg-canvas ring-1 ring-line">
            <p className="label-mono bg-primary-subtle px-5 py-4 text-primary">{t("home:guarantee.stampTitle")}</p>
            <dl className="px-5 py-2">
              {stamp.map((n) => (
                <div key={n} className="flex items-baseline justify-between gap-4 py-3.5">
                  <dt className="label-mono text-soft">{t(`home:guarantee.l${n}`)}</dt>
                  <dd className="data-mono text-sm text-ink">{t(`home:guarantee.v${n}`)}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </Section>

      {/* 5 — Einsatzgebiet */}
      <Section tone="surface">
        <SectionHead title={t("home:area.title")} lead={t("home:area.lead")} />
        <div className="mt-10">
          <AreaSelector />
        </div>
      </Section>

      {/* Ratgeber */}
      <GuideTeasers lang={lang} />

      {/* Häufige Fragen */}
      <Section id="fragen" tone="canvas">
        <SectionHead title={t("home:faq.title")} />
        <div className="mt-10 max-w-4xl space-y-3">
          {faqs.map((n) => (
            <details key={n} className="group rounded-2xl bg-surface px-5 open:bg-surface-2">
              <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-6 py-5 text-left">
                <span className="text-[1.0625rem] font-semibold text-ink">{t(`home:faq.q${n}`)}</span>
                <span aria-hidden="true" className="data-mono text-xl text-primary group-open:hidden">
                  +
                </span>
                <span aria-hidden="true" className="data-mono hidden text-xl text-primary group-open:inline">
                  −
                </span>
              </summary>
              <p className="type-small pb-6 text-ink-2">{t(`home:faq.a${n}`)}</p>
            </details>
          ))}
        </div>
      </Section>

      {/* 7 — Vertrauen. Only what is true; placeholders stay marked as such. */}
      <Section tone="surface">
        <SectionHead title={t("home:trust.title")} lead={t("home:trust.lead")} />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {trust.map((n) => {
            const isPlaceholder = t(`home:trust.c${n}.ph`) === "true";
            return (
              <div key={n} className="rounded-2xl bg-canvas px-5 py-6">
                <p className="label-mono text-soft">{t(`home:trust.c${n}.title`)}</p>
                <p className="type-small mt-3 text-ink">{t(`home:trust.c${n}.body`)}</p>
                {isPlaceholder ? (
                  <p className="label-mono mt-3 text-warning">{t("common:placeholder.badge")}</p>
                ) : null}
              </div>
            );
          })}
        </div>
      </Section>

      {/* 8 — Kontakt */}
      <Section id="kontakt" tone="ink">
        <div className="grid gap-12 lg:grid-cols-2">
          <div>
            <SectionHead tone="dark" title={t("home:contact.title")} lead={t("home:contact.lead")} />

            <div className="mt-10 space-y-3">
              {(company
                ? [
                    { icon: Phone, label: t("home:contact.phone"), value: phoneDisplay(company), href: telHref(company) },
                    { icon: MessageCircle, label: t("home:contact.whatsapp"), value: phoneDisplay(company), href: "", wa: true },
                    { icon: Mail, label: t("home:contact.email"), value: company.email, href: mailHref(company) },
                  ]
                : []
              ).map((tile) => {
                const inner = (
                  <>
                    <tile.icon aria-hidden="true" strokeWidth={1.5} className="size-5 text-primary-light" />
                    <span className="text-left">
                      <span className="label-mono block text-canvas/55">{tile.label}</span>
                      <span className="data-mono block text-sm text-canvas">{tile.value}</span>
                    </span>
                  </>
                );
                const cls =
                  "flex min-h-16 w-full items-center gap-4 rounded-xl bg-canvas/8 px-5 py-4 transition-colors motion-fast hover:bg-canvas/15";
                return "wa" in tile && tile.wa ? (
                  <WhatsappHandoff key={tile.label} context="home_contact_tile" className={cls}>
                    {inner}
                  </WhatsappHandoff>
                ) : (
                  <a key={tile.label} href={tile.href} className={cls}>
                    {inner}
                  </a>
                );
              })}
            </div>
          </div>

          <ContactForm />
        </div>
      </Section>
    </>
  );
}
