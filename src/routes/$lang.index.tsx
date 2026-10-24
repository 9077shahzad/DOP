import { Link, createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { QuoteStarter } from "@/components/home/QuoteStarter";
import { Shell } from "@/components/public/Section";
import { buttonVariants } from "@/components/system";
import { useParallax } from "@/hooks/useParallax";
import { HomeSections } from "@/components/home/HomeSections";
import { isLang, type Lang } from "@/i18n/config";
import { buildHomeJsonLd } from "@/lib/home-jsonld";
import { fetchCompany } from "@/lib/company.functions";
import { langOf, publicHead } from "@/lib/seo";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/$lang/")({
  // Public read: structured data must carry the real address and phone.
  loader: async () => ({ company: await fetchCompany() }),
  head: ({ params, loaderData }) => {
    const active = langOf(params.lang);
    const base = publicHead(active, "home", "");
    return {
      ...base,
      scripts: [
        {
          type: "application/ld+json",
          children: buildHomeJsonLd(active, loaderData?.company ?? null),
        },
      ],
    };
  },
  component: Home,
});

function Home() {
  const { lang } = Route.useParams();
  const active = (isLang(lang) ? lang : "de") as Lang;
  const { t } = useTranslation(["hero", "common"]);

  const proof = ["1", "2", "3"] as const;
  // A light drift on the headline only — the surface stays calm.
  const parallax = useParallax(0.1);

  return (
    <>
      {/* Hero — the first question is on screen without scrolling. */}
      <section className="bg-surface pb-14 pt-10 md:pb-20 md:pt-16">
        <Shell>
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,26rem)] lg:items-center lg:gap-16">
            <div>
              <p className="label-mono text-primary">{t("hero:eyebrow")}</p>

              <h1
                className="parallax-layer type-display mt-5 text-ink"
                style={{ ["--parallax" as string]: -parallax * 0.25 }}
              >
                <span className="block">{t("hero:line1")}</span>
                <span className="block">{t("hero:line2")}</span>
                <span className="block text-primary">{t("hero:line3")}</span>
              </h1>

              <p className="type-lead mt-7 max-w-xl text-ink-2">{t("hero:lead")}</p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  to="/$lang/planer"
                  params={{ lang: active }}
                  className={cn(buttonVariants({ variant: "primary", size: "lg" }))}
                >
                  {t("hero:ctaPrimary")}
                </Link>
                <Link to="/portal" className={cn(buttonVariants({ variant: "ghost", size: "lg" }))}>
                  {t("hero:ctaSecondary")}
                </Link>
              </div>
            </div>

            <QuoteStarter lang={active} />
          </div>

          <ul className="mt-14 grid gap-3 md:grid-cols-3">
            {proof.map((k) => (
              <li key={k} className="rounded-2xl bg-canvas px-6 py-7">
                <p className="data-mono text-2xl font-medium text-ink">{t(`hero:proof.${k}.value`)}</p>
                <p className="type-small mt-2 text-soft">{t(`hero:proof.${k}.label`)}</p>
              </li>
            ))}
          </ul>
        </Shell>
      </section>

      <HomeSections lang={active} />
    </>
  );
}

