import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { langOf, publicHead } from "@/lib/seo";
import { POLICY_SLUGS, type PolicySlug } from "@/lib/partner";

export const Route = createFileRoute("/$lang/richtlinien/$doc")({
  beforeLoad: ({ params }) => {
    if (!(POLICY_SLUGS as readonly string[]).includes(params.doc)) throw notFound();
  },
  head: ({ params }) => ({
    ...publicHead(langOf(params.lang), "partnerPolicy", `/richtlinien/${params.doc}`),
    meta: [
      ...publicHead(langOf(params.lang), "partnerPolicy", `/richtlinien/${params.doc}`).meta,
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PolicyPage,
});

function PolicyPage() {
  const { lang, doc } = Route.useParams();
  const active = langOf(lang);
  const { t } = useTranslation("partner");
  const slug = doc as PolicySlug;

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 md:px-8">
      <p className="label-mono rounded-md border border-primary bg-primary/5 px-3 py-2 text-primary">
        {t("policy.draftBadge")}
      </p>
      <h1 className="mt-6 type-h2 text-ink">{t(`policy.${slug}.title`)}</h1>
      <p className="mt-4 text-ink-2">{t(`policy.${slug}.body`)}</p>
      <p className="mt-6 text-sm text-soft">{t("policy.draftNote")}</p>
      <div className="mt-10">
        <Link
          to="/$lang"
          params={{ lang: active }}
          className="label-mono text-primary hover:underline"
        >
          {t("policy.back")}
        </Link>
      </div>
    </div>
  );
}
