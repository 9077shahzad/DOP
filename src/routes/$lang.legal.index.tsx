import { Link, createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { formatDate } from "@/i18n/format";
import { DOC_TYPES } from "@/lib/legal";
import { fetchDocumentIndex } from "@/lib/legal-data";
import { langOf, publicHead } from "@/lib/seo";

export const Route = createFileRoute("/$lang/legal/")({
  head: ({ params }) => publicHead(langOf(params.lang), "legalIndex", "/legal"),
  component: LegalIndex,
});

function LegalIndex() {
  const { lang } = Route.useParams();
  const active = langOf(lang);
  const { t } = useTranslation("legal");

  const documents = useQuery({
    queryKey: ["legal-index", active],
    queryFn: () => fetchDocumentIndex(active),
  });

  const byType = new Map((documents.data ?? []).map((d) => [d.doc_type, d]));

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 md:px-8 md:py-16">
      <p className="label-mono text-primary">{t("eyebrow")}</p>
      <h1 className="mt-3 type-h1 text-ink">{t("index.title")}</h1>
      <p className="mt-4 max-w-2xl text-ink-2">{t("index.lead")}</p>

      <p className="label-mono mt-6 text-soft">{t("regime.swiss")}</p>

      <ul className="mt-8 grid gap-px bg-line sm:grid-cols-2">
        {DOC_TYPES.map((docType) => {
          const doc = byType.get(docType);
          return (
            <li key={docType} className="bg-surface">
              <Link
                to="/$lang/legal/$docType"
                params={{ lang: active, docType }}
                className="flex h-full flex-col gap-2 p-5 transition-colors hover:bg-primary-subtle"
              >
                <span className="text-lg text-ink">{t(`doc.${docType}.title`)}</span>
                <span className="text-sm text-ink-2">{t(`doc.${docType}.summary`)}</span>
                <span className="label-mono mt-auto flex flex-wrap gap-3 pt-2 text-soft">
                  <span>{t("country")}</span>
                  {doc ? <span>v{doc.version}</span> : null}
                  {doc?.effective_date ? <span>{formatDate(doc.effective_date, active)}</span> : null}
                  <span className={doc?.status === "published" ? "text-success" : "text-warning"}>
                    {t(`status.${doc?.status ?? "draft"}`)}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      <p className="mt-10 border-s-4 border-warning bg-warning/10 p-4 text-sm text-ink">
        {t("index.disclaimer")}
      </p>
    </div>
  );
}
