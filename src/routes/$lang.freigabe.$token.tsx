/**
 * Customer decision on a change order, reached by an unguessable 30-day link.
 * No account, no personal data on the page beyond the job reference.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button, Chip, EmptyState, ErrorState, Field, Input, LoadingState, NoticeState } from "@/components/system";
import { formatCurrency, formatDate } from "@/i18n/format";
import { isLang, type Lang } from "@/i18n/config";
import { fetchChangeOrderByToken, respondChangeOrder, type PublicChangeOrder } from "@/lib/jobs-exec";

export const Route = createFileRoute("/$lang/freigabe/$token")({
  ssr: false,
  component: ChangeOrderDecision,
  head: () => ({
    meta: [
      { title: "Nachtrag freigeben — PS Umzug" },
      { name: "description", content: "Zusätzliche Leistung während Ihres Auftrags prüfen und freigeben oder ablehnen." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Nachtrag freigeben — PS Umzug" },
      { property: "og:description", content: "Zusätzliche Leistung prüfen und freigeben oder ablehnen." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function ChangeOrderDecision() {
  const { lang: rawLang, token } = Route.useParams();
  const lang = (isLang(rawLang) ? rawLang : "de") as Lang;
  const { t, i18n } = useTranslation("jobs");
  const [order, setOrder] = useState<PublicChangeOrder | null | "missing">(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (i18n.language !== lang) void i18n.changeLanguage(lang);
  }, [i18n, lang]);

  useEffect(() => {
    void fetchChangeOrderByToken(token).then((row) => setOrder(row ?? "missing"));
  }, [token]);

  async function decide(accept: boolean) {
    setBusy(true);
    setError(null);
    try {
      await respondChangeOrder(token, accept, name);
      setOrder(await fetchChangeOrderByToken(token));
    } catch (err) {
      console.error(err);
      setError(t("public.failed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    /* The $lang layout already supplies nav, main and footer — this route only
       contributes the decision itself, so the page has one main landmark. */
    <div className="mx-auto w-full max-w-2xl px-4 py-16 md:px-8">
        <p className="label-mono text-primary">{t("public.eyebrow")}</p>
        <h1 className="type-h1 mt-2 text-ink">{t("public.title")}</h1>

        {order === null ? (
          <LoadingState label={t("common.loading")} />
        ) : order === "missing" ? (
          <EmptyState className="mt-6" title={t("public.title")} body={t("public.missing")} />
        ) : (
          <section className="mt-6 rounded-md rounded-2xl bg-surface p-5 elev-raised">
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="label-mono text-soft">{t("public.job")}</dt>
                <dd className="data-mono mt-1 text-ink">{order.jobReference}</dd>
              </div>
              <div>
                <dt className="label-mono text-soft">{t("public.reference")}</dt>
                <dd className="data-mono mt-1 text-ink">{order.reference}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="label-mono text-soft">{t("public.description")}</dt>
                <dd className="type-body mt-1 text-ink">{order.description}</dd>
              </div>
              <div className="rounded-md border border-primary bg-primary-subtle px-4 py-3">
                <dt className="label-mono text-soft">{t("public.price")}</dt>
                <dd className="data-mono mt-1 text-2xl tabular-nums text-ink">
                  {order.customerPrice == null ? "—" : formatCurrency(order.customerPrice, lang)}
                </dd>
              </div>
              <div>
                <dt className="label-mono text-soft">{t("public.expires")}</dt>
                <dd className="data-mono mt-1 text-sm text-ink">
                  {order.expiresAt ? formatDate(order.expiresAt, lang, { dateStyle: "long" }) : "—"}
                </dd>
              </div>
            </dl>

            <p className="type-caption mt-4">{t("public.vatNote")}</p>

            {order.status === "awaiting_customer" ? (
              <>
                <Field className="mt-6" label={t("public.name")} required>
                  {(p) => <Input value={name} onChange={(e) => setName(e.target.value)} {...p} />}
                </Field>
                {error ? <ErrorState className="mt-4" message={error} /> : null}
                <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                  <Button
                    type="button"
                    size="lg"
                    className="sm:flex-1"
                    disabled={busy || !name.trim()}
                    onClick={() => void decide(true)}
                  >
                    {t("public.approve")}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    disabled={busy || !name.trim()}
                    onClick={() => void decide(false)}
                  >
                    {t("public.reject")}
                  </Button>
                </div>
              </>
            ) : (
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Chip status={order.status}>{t(`changeOrder.status.${order.status}`, order.status)}</Chip>
                <NoticeState
                  className="flex-1"
                  message={t(`public.decided.${order.status}`, t("public.decidedGeneric"))}
                />
              </div>
            )}
          </section>
        )}
    </div>
  );
}
