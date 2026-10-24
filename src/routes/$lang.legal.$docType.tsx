import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { DraftBanner, LegalMarkdown } from "@/components/legal/LegalMarkdown";
import { formatDate } from "@/i18n/format";
import { CURRENCY, isDocType } from "@/lib/legal";
import { fetchDocument, fetchLegalEntity } from "@/lib/legal-data";
import { langOf, publicHead } from "@/lib/seo";

export const Route = createFileRoute("/$lang/legal/$docType")({
  beforeLoad: ({ params }) => {
    if (!isDocType(params.docType)) throw notFound();
  },
  head: ({ params }) =>
    publicHead(langOf(params.lang), "legalDoc", `/legal/${params.docType}`),
  component: LegalDocPage,
});

function LegalDocPage() {
  const { lang, docType } = Route.useParams();
  const active = langOf(lang);
  const { t } = useTranslation("legal");
  const type = isDocType(docType) ? docType : "terms";

  const doc = useQuery({
    queryKey: ["legal-doc", active, type],
    queryFn: () => fetchDocument(active, type),
  });
  const entity = useQuery({
    queryKey: ["legal-entity"],
    queryFn: () => fetchLegalEntity(),
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 md:px-8 md:py-16">
      <Link
        to="/$lang/legal"
        params={{ lang: active }}
        className="label-mono text-primary underline-offset-4 hover:underline"
      >
        ← {t("index.title")}
      </Link>

      <h1 className="type-h1 mt-6 text-ink">{t(`doc.${type}.title`)}</h1>

      {doc.isLoading ? (
        <p className="label-mono mt-8 text-soft">{t("loading")}</p>
      ) : doc.error ? (
        <p role="alert" className="mt-8 border-s-4 border-destructive bg-surface p-4 text-ink">
          {t("error")}
        </p>
      ) : !doc.data ? (
        <p className="mt-8 rounded-2xl bg-surface p-5 text-ink-2">{t("doc.missing")}</p>
      ) : (
        <article className="mt-8">
          <DraftBanner status={doc.data.status} />
          <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { k: "meta.country", v: t("country") },
              { k: "meta.version", v: `v${doc.data.version}` },
              { k: "meta.effective", v: doc.data.effective_date ? formatDate(doc.data.effective_date, active) : "—" },
              { k: "meta.updated", v: formatDate(doc.data.created_at, active) },
            ].map((row) => (
              <div key={row.k} className="rounded-xl bg-surface px-4 py-3">
                <dt className="label-mono text-soft">{t(row.k)}</dt>
                <dd className="data-mono text-sm text-ink">{row.v}</dd>
              </div>
            ))}
          </dl>

          <LegalMarkdown
            className="mt-8"
            body={doc.data.body}
            entity={entity.data ?? null}
            currency={CURRENCY}
          />
        </article>
      )}
    </div>
  );
}
