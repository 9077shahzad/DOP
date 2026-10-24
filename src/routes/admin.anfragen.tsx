/**
 * /admin/anfragen — t("anf.title"): the single inbox for every new customer
 * request (Offertrechner, phone/manual leads and the contact form). Taking a
 * request over as an offer moves the same record to Offerten.
 */
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useActiveLang } from "@/lib/admin-i18n";

import { ConfirmDelete } from "@/components/admin/ConfirmDelete";
import { QuoteDossier } from "@/components/admin/QuoteDossier";
import { btn, btnPrimary } from "@/components/system";
import i18n from "@/i18n/config";
import { formatCurrency, formatDateTime } from "@/i18n/format";
import { archiveRecord, fetchLeadlessRequestQuotes, fetchNewRequests, readableRows, requestToOffer, type RequestItem } from "@/lib/dop";
import { langOf, privateHead } from "@/lib/seo";
import type { QuoteRow } from "@/lib/quotes";

export const Route = createFileRoute("/admin/anfragen")({
  ssr: false,
  head: () => privateHead(langOf(i18n.language), "admin"),
  component: NewRequests,
});

function title(item: RequestItem): string {
  return item.kind === "lead" ? item.lead.customer_name || "—" : item.enquiry.name || "—";
}

function NewRequests() {
  const { t } = useTranslation("dop");
  const lang = useActiveLang();
  const navigate = useNavigate();
  const [archived, setArchived] = useState(false);
  const [includeTest, setIncludeTest] = useState(false);
  const [rows, setRows] = useState<RequestItem[] | null>(null);
  const [orphans, setOrphans] = useState<QuoteRow[]>([]);
  const [open, setOpen] = useState<RequestItem | null>(null);
  const [del, setDel] = useState<RequestItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [r, o] = await Promise.all([fetchNewRequests(archived, includeTest), archived ? Promise.resolve([]) : fetchLeadlessRequestQuotes(includeTest)]);
      setRows(r);
      setOrphans(o);
      setError(null);
    } catch {
      setRows([]);
      setError(t("anf.loadErr"));
    }
  }, [archived, includeTest]);
  useEffect(() => void load(), [load]);

  async function toOffer(item: RequestItem) {
    setBusy(true);
    try {
      const quoteId = await requestToOffer(item.kind, item.id);
      setOpen(null);
      if (quoteId) void navigate({ to: "/admin/offerten", search: { offer: quoteId } as never });
      else await load();
    } catch (e) {
      setError(t("anf.notTaken", { msg: (e as Error).message }));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="label-mono text-primary">{t("anf.step")}</p>
          <h1 className="mt-2 text-3xl md:text-4xl">{archived ? t("anf.archiveTitle") : t("anf.title")}</h1>
          <p className="mt-2 max-w-2xl text-sm text-ink-2">
            {t("anf.intro")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {!archived ? (
            <label className="flex items-center gap-2 text-sm text-ink-2">
              <input type="checkbox" checked={includeTest} onChange={(e) => setIncludeTest(e.target.checked)} />
              {t("common.showTest")}
            </label>
          ) : null}
          <button type="button" className={btn} onClick={() => setArchived((v) => !v)}>
            {archived ? t("anf.back") : t("common.showArchive")}
          </button>
        </div>
      </div>

      {error ? <p role="alert" className="mt-4 border-l-4 border-destructive bg-surface px-4 py-3 text-sm text-destructive">{error}</p> : null}

      {rows === null ? (
        <p className="label-mono mt-8 text-soft">{t("common.loading")}</p>
      ) : rows.length === 0 && orphans.length === 0 ? (
        <p className="mt-8 text-ink-2">{archived ? t("anf.noneArchived") : t("anf.none")}</p>
      ) : (
        <div className="mt-8 overflow-x-auto rounded-md border border-line bg-surface">
          <table className="w-full min-w-[48rem] text-sm">
            <thead>
              <tr className="border-b border-line text-start">
                {["received", "customer", "source", "place", "value", ""].map((h) => (
                  <th key={h} className="label-mono px-4 py-3 text-start text-soft">{h ? t(`anf.col.${h}`) : ""}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => (
                <tr key={`${item.kind}-${item.id}`} className="border-b border-line last:border-0">
                  <td className="data-mono px-4 py-3 text-soft">{formatDateTime(item.created_at, lang)}</td>
                  <td className="px-4 py-3 text-ink">
                    {title(item)}
                    {(item.kind === "lead" ? (item.lead as { is_test?: boolean }).is_test : item.enquiry.is_test) ? (
                      <span className="label-mono ms-2 rounded-md border border-line px-1 text-soft">{t("common.test")}</span>
                    ) : null}
                    <span className="label-mono block text-soft">
                      {item.kind === "lead" ? item.lead.customer_phone || item.lead.customer_email : item.enquiry.phone || item.enquiry.email}
                    </span>
                  </td>
                  <td className="px-4 py-3">{item.kind === "enquiry" ? t("anf.src.contact") : item.quote ? t("anf.src.calc") : t("anf.src.phone")}</td>
                  <td className="px-4 py-3 text-ink-2">
                    {item.kind === "lead" ? [item.lead.postcode, item.lead.city].filter(Boolean).join(" ") || "—" : item.enquiry.from_text || "—"}
                  </td>
                  <td className="data-mono px-4 py-3">
                    {item.kind === "lead" && item.quote?.price_total ? formatCurrency(Number(item.quote.price_total), lang, 2) : "—"}
                  </td>
                  <td className="px-4 py-3 text-end">
                    <div className="flex justify-end gap-2">
                      {archived ? (
                        <>
                        <span className="label-mono self-center rounded-md border border-destructive px-2 py-1 text-destructive">{t("common.archived")}</span>
                        <button type="button" className={btn} onClick={async () => { await archiveRecord(item.kind, item.id, true); await load(); }}>
                          {t("common.restore")}
                        </button>
                        </>
                      ) : (
                        <>
                          <button type="button" className={btnPrimary} onClick={() => setOpen(item)}>{t("common.open")}</button>
                          <button type="button" className={btn} onClick={() => setDel(item)}>{t("common.delete")}</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {orphans.map((q) => (
                <tr key={`quote-${q.id}`} data-leadless-quote={q.reference} className="border-b border-line last:border-0">
                  <td className="data-mono px-4 py-3 text-soft">{formatDateTime(q.created_at, lang)}</td>
                  <td className="px-4 py-3 text-ink">
                    {q.customer_name || "—"}
                    {(q as { is_test?: boolean }).is_test ? <span className="label-mono ms-2 rounded-md border border-line px-1 text-soft">{t("common.test")}</span> : null}
                    <span className="label-mono block text-soft">{q.reference} · {q.customer_phone || q.customer_email || "—"}</span>
                  </td>
                  <td className="px-4 py-3">{t("anf.src.calcNoReq")}</td>
                  <td className="px-4 py-3 text-ink-2">{[q.from_zip, q.to_zip].filter(Boolean).join(" → ") || "—"}</td>
                  <td className="data-mono px-4 py-3">{q.price_total ? formatCurrency(Number(q.price_total), lang, 2) : "—"}</td>
                  <td className="px-4 py-3 text-end label-mono text-soft">{t("anf.viewOnly")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {open ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-ink/50 p-4">
          <div role="dialog" aria-modal="true" aria-label={t("anf.dialog")} className="mx-auto max-w-4xl rounded-md border border-line bg-canvas p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="label-mono text-primary">{t("anf.new")}</p>
                <h2 className="mt-1 text-2xl">{title(open)}</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" className={btnPrimary} disabled={busy} onClick={() => void toOffer(open)}>
                  {t("anf.toOffer")}
                </button>
                <button type="button" className={btn} onClick={() => setDel(open)}>{t("common.delete")}</button>
                <button type="button" className={btn} onClick={() => setOpen(null)}>{t("common.close")}</button>
              </div>
            </div>
            <div className="mt-6">
              <RequestBody item={open} onChanged={load} />
            </div>
          </div>
        </div>
      ) : null}

      {del ? (
        <ConfirmDelete
          label={title(del)}
          busy={busy}
          onCancel={() => setDel(null)}
          onConfirm={async () => {
            setBusy(true);
            try {
              await archiveRecord(del.kind, del.id);
              setDel(null);
              setOpen(null);
              await load();
            } catch (e) {
              setError(t("anf.notDeleted", { msg: (e as Error).message }));
            } finally {
              setBusy(false);
            }
          }}
        />
      ) : null}
    </section>
  );
}

function RequestBody({ item, onChanged }: { item: RequestItem; onChanged: () => void }) {
  const { t } = useTranslation("dop");
  const rows =
    item.kind === "enquiry"
      ? [
          { label: t("f.name"), value: item.enquiry.name || "—", depth: 0 },
          { label: t("corr.phone"), value: item.enquiry.phone || "—", depth: 0 },
          { label: t("corr.email"), value: item.enquiry.email || "—", depth: 0 },
          { label: t("key.from"), value: item.enquiry.from_text || "—", depth: 0 },
          { label: t("key.to"), value: item.enquiry.to_text || "—", depth: 0 },
          { label: t("f.prefDate"), value: item.enquiry.preferred_date || "—", depth: 0 },
          { label: t("f.lang"), value: (item.enquiry.language || "de").toUpperCase(), depth: 0 },
          { label: t("f.message"), value: item.enquiry.message || "—", depth: 0 },
        ]
      : [
          { label: t("f.ref"), value: item.lead.reference, depth: 0 },
          { label: t("f.name"), value: item.lead.customer_name || "—", depth: 0 },
          { label: t("corr.phone"), value: item.lead.customer_phone || "—", depth: 0 },
          { label: t("corr.email"), value: item.lead.customer_email || "—", depth: 0 },
          { label: t("f.lang"), value: (item.lead.language || "de").toUpperCase(), depth: 0 },
          { label: t("f.address"), value: [item.lead.service_address, item.lead.postcode, item.lead.city, item.lead.canton].filter(Boolean).join(", ") || "—", depth: 0 },
          { label: t("f.prefDate"), value: item.lead.preferred_date || "—", depth: 0 },
          { label: t("f.desc"), value: item.lead.description || "—", depth: 0 },
          ...readableRows(item.lead.service_details),
        ];
  const details = (
    <dl className="divide-y divide-line rounded-md border border-line bg-surface text-sm">
      {rows.map((r, i) => (
        <div key={i} className="grid gap-2 px-4 py-2 sm:grid-cols-[14rem_1fr]" style={{ paddingInlineStart: `${1 + r.depth * 1.25}rem` }}>
          <dt className={r.value ? "text-soft" : "label-mono text-primary"}>{r.label}</dt>
          <dd className="whitespace-pre-wrap text-ink">{r.value}</dd>
        </div>
      ))}
    </dl>
  );
  // Calculator requests: full customer/request details first, then the offer.
  if (item.kind === "lead" && item.quote) {
    return (
      <div className="space-y-6">
        <section>
          <h3 className="label-mono mb-2 text-primary">{t("anf.custDetails")}</h3>
          {details}
        </section>
        <QuoteDossier quote={item.quote} extraIds={[item.lead.id]} onChanged={onChanged} />
      </div>
    );
  }
  return details;
}
