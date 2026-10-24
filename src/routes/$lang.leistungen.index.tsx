/**
 * /$lang/leistungen — overview of the six PS Umzug services.
 *
 * The header's "Dienstleistungen" item resolves here; each card links to the
 * existing service page. Content comes from the `svc` dictionary, so nothing
 * is invented for this page.
 */
import { Link, createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { BookNowLink } from "@/components/brand/BookNow";
import { PageHero, Section } from "@/components/public/Section";
import i18nInstance, { isLang, type Lang } from "@/i18n/config";
import { SERVICE_IDS } from "@/lib/services";
import { langOf, publicHead } from "@/lib/seo";

export const Route = createFileRoute("/$lang/leistungen/")({
  head: ({ params }) => {
    const active = langOf(params.lang);
    const base = publicHead(active, "home", "");
    const t = i18nInstance.getFixedT(active, "nav");
    const title = `${t("services")} — PS Umzug AG`;
    const description = i18nInstance.getFixedT(active, "svc")("umzug.lead");
    return {
      ...base,
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary" },
      ],
    };
  },
  component: ServicesIndex,
});

function ServicesIndex() {
  const { lang } = Route.useParams();
  const active = (isLang(lang) ? lang : "de") as Lang;
  const { t } = useTranslation(["svc", "nav"]);

  return (
    <>
      <PageHero
        eyebrow="PS Umzug AG"
        title={t("nav:services")}
        lead={t("svc:umzug.lead")}
        actions={<BookNowLink lang={active} size="lg" label={t("nav:getQuote")} />}
      />

      <Section>
        <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {SERVICE_IDS.map((id) => (
            <li key={id}>
              <Link
                to="/$lang/leistungen/$service"
                params={{ lang: active, service: id }}
                className="flex h-full flex-col gap-2 rounded-2xl border border-line bg-surface p-6 transition-colors hover:border-primary"
              >
                <span className="label-mono text-primary">{t(`svc:${id}.short`)}</span>
                <span className="type-h3 text-ink">{t(`svc:${id}.title`)}</span>
                <span className="type-small text-ink-2">{t(`svc:${id}.lead`)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </Section>
    </>
  );
}
