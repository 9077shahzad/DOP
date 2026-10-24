import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { BookNowLink } from "@/components/brand/BookNow";
import { ServiceFlow } from "@/components/depth/ServiceFlow";
import { PageHero, Section, SectionHead } from "@/components/public/Section";
import { buttonVariants } from "@/components/system";
import { isLang, type Lang } from "@/i18n/config";
import { isServiceId, type ServiceId } from "@/lib/services";
import { langOf, publicHead } from "@/lib/seo";
import { cn } from "@/lib/utils";
import { useCompany } from "@/components/shell/CompanyContext";
import { phoneDisplay, telHref } from "@/lib/company";
import i18nInstance from "@/i18n/config";

export const Route = createFileRoute("/$lang/leistungen/$service")({
  beforeLoad: ({ params }) => {
    if (!isServiceId(params.service)) throw notFound();
  },
  head: ({ params }) => {
    const active = langOf(params.lang);
    const base = publicHead(active, "home", "");
    const title = i18nInstance.getFixedT(active, "svc")(`${params.service}.title`);
    const description = i18nInstance.getFixedT(active, "svc")(`${params.service}.lead`);
    return {
      ...base,
      meta: [
        { title: `${title} — PS Umzug AG` },
        { name: "description", content: description },
        { property: "og:title", content: `${title} — PS Umzug AG` },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary" },
      ],
    };
  },
  component: ServicePage,
});

function ServicePage() {
  const { lang, service } = Route.useParams();
  const active = (isLang(lang) ? lang : "de") as Lang;
  const { t } = useTranslation(["svc", "common"]);
  const company = useCompany();

  return (
    <>
      <PageHero
        eyebrow={t(`svc:${service}.short`)}
        title={t(`svc:${service}.title`)}
        lead={t(`svc:${service}.lead`)}
        actions={
          <>
            <BookNowLink lang={active} service={service as ServiceId} size="lg" />
            {company ? (
              <a href={telHref(company)} className={cn(buttonVariants({ variant: "ghost", size: "lg" }))}>
                {phoneDisplay(company)}
              </a>
            ) : null}
          </>
        }
      />

      <Section tone="surface">
        <ul className="grid gap-4 sm:grid-cols-3">
          {(["b1", "b2", "b3"] as const).map((b) => (
            <li key={b} className="rounded-2xl bg-canvas px-6 py-7 text-[0.9375rem] text-ink">
              {t(`svc:${service}.${b}`)}
            </li>
          ))}
        </ul>
      </Section>

      <Section tone="canvas">
        <SectionHead title={t("svc:flow.title")} lead={t("svc:flow.lead")} />
        <div className="mt-10">
          <ServiceFlow />
        </div>
      </Section>
    </>
  );
}
