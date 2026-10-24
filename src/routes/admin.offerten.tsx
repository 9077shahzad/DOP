/**
 * /admin/offerten — step 2. Only offers in progress, ready, sent or accepted;
 * converted offers live in Aufträge, deleted ones in the archive view.
 */
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Search } from "lucide-react";

import { ConfirmDelete } from "@/components/admin/ConfirmDelete";
import { QuoteDossier } from "@/components/admin/QuoteDossier";
import { OfferStatusBadge, offerTone } from "@/components/admin/OfferStatusBadge";
import { btn, btnPrimary } from "@/components/system";
import i18n from "@/i18n/config";
import { formatCurrency, formatDate, formatDayMonthYear } from "@/i18n/format";
import { STAGE_LABEL, isNormalStep, archiveRecord, setTestFlag, rejectOffer, fetchOffers, logSend, offerToOrder, setOfferStage } from "@/lib/dop";
import { confirmQuoteDistance, distanceErrorKey, markQuoteSent } from "@/lib/distance";
import { notifyQuoteSent } from "@/lib/operational-mail.functions";
import type { QuoteRow } from "@/lib/quotes";
import { hasCurrentCustomerAcceptance } from "@/lib/order-acceptance";
import { langOf, privateHead } from "@/lib/seo";
import { useTranslation } from "react-i18next";
import { useActiveLang } from "@/lib/admin-i18n";

export const Route = createFileRoute("/admin/offerten")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({ offer: typeof s["offer"] === "string" ? s["offer"] : undefined }),
  head: () => ({ ...privateHead(langOf(i18n.language), "admin"), meta: [
    { title: "Offerten | PS Umzug AG" },
    { name: "description", content: "PS Umzug Offerten, Kundendaten und versionierte Dokumente verwalten." },
    { property: "og:title", content: "Offerten | PS Umzug AG" },
    { property: "og:description", content: "PS Umzug Offerten, Kundendaten und versionierte Dokumente verwalten." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex, nofollow" },
  ] }),
  component: AdminOfferten,
});

function AdminOfferten() {
  const { t } = useTranslation("admin");
  const lang = useActiveLang();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [archived, setArchived] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [query, setQuery] = useState("");
  useEffect(() => {
    const id = setTimeout(() => setQuery(searchText.trim()), 300);
    return () => clearTimeout(id);
  }, [searchText]);
  const [includeTest, setIncludeTest] = useState(false);
  const [rows, setRows] = useState<QuoteRow[] | null>(null);
  const [del, setDel] = useState<QuoteRow | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [download, setDownload] = useState<QuoteRow | null>(null);
  const [ask, setAsk] = useState<{ title: string; text: string; run: (reason: string) => Promise<void> } | null>(null);

  const load = useCallback(async () => {
    try {
      setRows(await fetchOffers(archived, includeTest, query));
    } catch {
      setRows([]);
      setError(t("dop:of.loadErr"));
    }
  }, [archived, includeTest, query]);
  useEffect(() => void load(), [load]);

  const open = rows?.find((r) => r.id === search.offer) ?? null;
  const setOpen = (id?: string) => void navigate({ to: "/admin/offerten", search: { offer: id } as never, replace: true });

  async function send(row: QuoteRow) {
    setBusy(row.id);
    setError(null);
    setNotice(null);
    try {
      // Always the stored, latest version — markQuoteSent refuses an unconfirmed distance.
      await markQuoteSent(row.reference);
    } catch (e) {
      const m = String((e as Error)?.message ?? "");
      setError(m.includes("minimum_hours_unverified") ? errText(m) : t(distanceErrorKey(m)));
      setBusy(null);
      return;
    }
    let status = "failed";
    try {
      status = (await notifyQuoteSent({ data: { reference: row.reference, force: true } })).status;
    } catch {
      status = "failed";
    }
    await logSend(row.id, row.customer_email || row.customer_phone || "", status).catch(() => undefined);
    setNotice(
      status === "sent"
        ? t("dop:of.sentTo", { v: row.version ?? 1, to: row.customer_email })
        : status === "failed"
          ? t("dop:of.sendFailed")
          : t("dop:of.sendPending"),
    );
    setBusy(null);
    await load();
  }

  function convert(row: QuoteRow) {
    if (!hasCurrentCustomerAcceptance(row)) {
      setError(t("dop:of.convertText"));
      return;
    }
    return void doConvert(row);
  }

  function changeStage(row: QuoteRow, stage: string) {
    if (stage === "offer_rejected") {
      return void setAsk({
        title: t("dop:of.reject"),
        text: t("dop:of.rejectText", { ref: row.reference }),
        run: async (reason) => {
          try { await rejectOffer(row.id, reason); } catch (e) { setError(errText((e as Error).message)); }
          await load();
        },
      });
    }
    const run = async (reason?: string) => {
      try {
        await setOfferStage(row.id, stage as "offer_draft", reason);
      } catch (e) {
        setError(errText((e as Error).message));
      }
      await load();
    };
    if (isNormalStep(row.workflow_stage, stage)) return void run();
    setAsk({
      title: t("dop:of.skip"),
      text: t("dop:of.skipText", { from: STAGE_LABEL[row.workflow_stage], to: STAGE_LABEL[stage] }),
      run,
    });
  }

  async function doConvert(row: QuoteRow, reason?: string) {
    setBusy(row.id);
    setError(null);
    try {
      await offerToOrder(row.id, reason);
      setOpen(undefined);
      void navigate({ to: "/admin/auftraege", search: {} as never });
    } catch (e) {
      const m = (e as Error).message;
      setError(m.includes("pricing_required") ? t("dop:of.noPrice") : t("dop:of.notConverted", { msg: errText(m) }));
      setBusy(null);
    }
  }

  async function confirmDistance(row: QuoteRow, raw: string) {
    if (raw.trim() === "") return;
    const km = Number(raw);
    if (!Number.isFinite(km) || km < 0) return;
    if (row.distance_source !== "unconfirmed" && Number(row.distance_km) === km) return;
    try {
      const v = await confirmQuoteDistance(row, km, "manual");
      setNotice(t("dop:of.kmConfirmed", { km, v }));
      await load();
    } catch (e) {
      setError(t(distanceErrorKey(String((e as Error)?.message ?? ""))));
    }
  }

  function print(row: QuoteRow) {
    setOpen(row.id);
    setNotice(t("dop:of.printNote"));
  }

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="label-mono text-primary">{t("dop:of.step")}</p>
          <h1 className="mt-2 text-3xl md:text-4xl">{archived ? t("dop:of.archiveTitle") : t("dop:of.title")}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {!archived ? (
            <label className="flex items-center gap-2 text-sm text-ink-2">
              <input type="checkbox" checked={includeTest} onChange={(e) => setIncludeTest(e.target.checked)} />
              {t("dop:common.showTest")}
            </label>
          ) : null}
          <button type="button" className={btn} onClick={() => setArchived((v) => !v)}>
            {archived ? t("dop:of.back") : t("dop:common.showArchive")}
          </button>
        </div>
      </div>

      <label className="mt-6 flex w-full items-center gap-2 rounded-md border border-line bg-surface px-3 md:max-w-md">
        <Search aria-hidden="true" className="size-4 shrink-0 text-soft" />
        <span className="sr-only">{t("dop:of.search")}</span>
        <input
          type="search"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          placeholder={t("dop:of.searchPlaceholder")}
          className="h-11 min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-soft"
        />
      </label>

      {error ? <p role="alert" className="mt-4 border-l-4 border-destructive bg-surface px-4 py-3 text-sm text-destructive">{error}</p> : null}
      {notice ? <p role="status" className="mt-4 border-l-4 border-primary bg-surface px-4 py-3 text-sm text-ink-2">{notice}</p> : null}

      {rows === null ? (
        <p className="label-mono mt-8 text-soft">{t("dop:common.loading")}</p>
      ) : rows.length === 0 ? (
        <p className="mt-8 text-ink-2">{query ? t("dop:of.noMatch", { query }) : archived ? t("dop:of.noneArchived") : t("dop:of.none")}</p>
      ) : (
        <div className="mt-8 rounded-md border border-line bg-surface md:overflow-x-auto">
          <table className="w-full text-sm md:min-w-[64rem] block md:table">
            <thead className="hidden md:table-header-group">
              <tr className="border-b border-line">
                {["ref", "date", "customer", "route", "total", "status", "actions"].map((h) => (
                  <th key={h} className="label-mono px-4 py-3 text-start text-soft">{t(`dop:of.col.${h}`)}</th>
                ))}
              </tr>
            </thead>
            <tbody className="block md:table-row-group">
              {rows.map((row) => (
                <tr key={row.id} className="grid grid-cols-2 gap-x-3 gap-y-2 p-4 md:table-row md:p-0 border-b border-line last:border-0 align-top">
                  <td data-label={t("dop:of.col.ref")} className="data-mono md:px-4 md:py-3 text-ink before:block before:font-mono before:text-[0.65rem] before:uppercase before:tracking-widest before:text-soft before:content-[attr(data-label)] md:before:hidden">{row.reference}{(row as { is_test?: boolean }).is_test ? <span className="label-mono ms-2 rounded-md border border-line px-1 text-soft">{t("dop:common.test")}</span> : null}<span className="label-mono block text-soft">V{row.version ?? 1}</span></td>
                  <td data-label={t("dop:of.col.date")} className="data-mono md:px-4 md:py-3 text-soft before:block before:font-mono before:text-[0.65rem] before:uppercase before:tracking-widest before:text-soft before:content-[attr(data-label)] md:before:hidden">{formatDayMonthYear(row.created_at)}</td>
                  <td data-label={t("dop:of.col.customer")} className="md:px-4 md:py-3 text-ink col-span-2 before:block before:font-mono before:text-[0.65rem] before:uppercase before:tracking-widest before:text-soft before:content-[attr(data-label)] md:before:hidden">
                    {row.customer_name || "—"}
                    <span className="label-mono block text-soft">{row.customer_phone || row.customer_email || "—"}</span>
                  </td>
                  <td data-label={t("dop:of.col.route")} className="data-mono md:px-4 md:py-3 text-ink-2 before:block before:font-mono before:text-[0.65rem] before:uppercase before:tracking-widest before:text-soft before:content-[attr(data-label)] md:before:hidden">
                    {row.from_zip || "—"}{row.to_zip ? ` → ${row.to_zip}` : ""}
                    <span className="mt-1 flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        step="0.1"
                        aria-label={`${t("dop:jf.distance")} ${row.reference}`}
                        defaultValue={row.distance_km ?? ""}
                        disabled={!!row.accepted_at || row.workflow_stage === "offer_accepted"}
                        title={row.accepted_at ? t("dop:of.lockedTitle") : undefined}
                        onBlur={(e) => void confirmDistance(row, e.target.value)}
                        className="w-20 border border-line bg-canvas px-2 py-1 text-xs"
                      />
                      <span className={row.distance_source === "unconfirmed" ? "label-mono text-destructive" : "label-mono text-soft"}>
                        {row.distance_source === "unconfirmed" ? t("dop:of.unconfirmed") : t("dop:of.confirmed")}
                      </span>
                    </span>
                  </td>
                  <td data-label={t("dop:of.col.total")} className="data-mono md:px-4 md:py-3 text-ink before:block before:font-mono before:text-[0.65rem] before:uppercase before:tracking-widest before:text-soft before:content-[attr(data-label)] md:before:hidden">{formatCurrency(Number(row.price_total ?? 0), lang, 2)}</td>
                  <td data-label={t("dop:of.col.status")} className="md:px-4 md:py-3 col-span-2 before:block before:font-mono before:text-[0.65rem] before:uppercase before:tracking-widest before:text-soft before:content-[attr(data-label)] md:before:hidden">
                    {archived ? (
                      <span className="label-mono rounded-md border border-destructive px-2 py-1 text-destructive">
                        Archiviert · {STAGE_LABEL[row.workflow_stage] ?? "—"}
                      </span>
                    ) : (
                      <div className="flex flex-col items-start gap-2">
                      <OfferStatusBadge tone={offerTone(row)} />
                      <select
                        aria-label={`Status ${row.reference}`}
                        value={row.workflow_stage}
                        onChange={(e) => changeStage(row, e.target.value)}
                        className="border border-line bg-canvas px-2 py-1 text-xs"
                      >
                        {(row.workflow_stage === "offer_rejected"
                          ? ["offer_rejected", "offer_draft"]
                          : row.accepted_at || row.workflow_stage === "offer_accepted"
                            ? ["offer_accepted"]
                            : ["offer_draft", "offer_ready", "offer_sent", "offer_accepted", "offer_rejected"]
                        ).map((s) => (
                          <option key={s} value={s}>{s === "offer_draft" && row.workflow_stage === "offer_rejected" ? t("dop:of.reopen") : STAGE_LABEL[s]}</option>
                        ))}
                      </select>
                      </div>
                    )}
                  </td>
                  <td data-label={t("dop:of.col.actions")} className="md:px-4 md:py-3 col-span-2 before:block before:font-mono before:text-[0.65rem] before:uppercase before:tracking-widest before:text-soft before:content-[attr(data-label)] md:before:hidden">
                    {archived ? (
                      <button type="button" className={btn} onClick={async () => { await archiveRecord("quote", row.id, true); await load(); }}>{t("dop:common.restore")}</button>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        <button type="button" className={btn} onClick={() => setOpen(row.id)}>{t("dop:common.edit")}</button>
                        <button type="button" className={btn} onClick={() => print(row)}>{t("dop:of.print")}</button>
                        <button type="button" className={btn} disabled={download !== null} onClick={() => { setError(null); setDownload(row); }}>{t("dop:of.downloadPdf")}</button>
                        <button
                          type="button"
                          className={btn}
                          disabled={busy === row.id || row.distance_source === "unconfirmed"}
                          title={row.distance_source === "unconfirmed" ? t("dop:of.confirmFirst") : undefined}
                          onClick={() => void send(row)}
                        >
                          {t("dop:of.send")}
                        </button>
                        <button type="button" className={btnPrimary} disabled={busy === row.id || !hasCurrentCustomerAcceptance(row)} title={!hasCurrentCustomerAcceptance(row) ? t("dop:of.convertText") : undefined} onClick={() => void convert(row)}>{t("dop:of.convert")}</button>
                        <button type="button" className={btn} onClick={() => setDel(row)}>{t("dop:common.delete")}</button>
                        <button
                          type="button"
                          className={btn}
                          title={t("dop:of.testTitle")}
                          onClick={async () => {
                            if (!window.confirm(`${row.reference} als Testdatensatz kennzeichnen? Er verschwindet aus den produktiven Listen und Kennzahlen.`)) return;
                            try { await setTestFlag("quote", row.id, true); await load(); }
                            catch { window.alert(t("dop:of.testDenied")); }
                          }}
                        >
                          {t("dop:of.markTest")}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {download ? <div hidden><QuoteDossier key={`${download.id}-${download.version}`} quote={download} editable={false} autoDownload onDownloaded={(message) => { setDownload(null); if (message) setError(message); }} /></div> : null}

      {open ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-ink/50 p-4">
          <div role="dialog" aria-modal="true" aria-label={open.reference} className="mx-auto max-w-4xl rounded-md border border-line bg-canvas p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="label-mono text-primary">{t("dop:docs.offer")}</p>
                <h2 className="mt-1 text-2xl">{open.reference} · {open.customer_name}</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" className={btn} disabled={open.distance_source === "unconfirmed"} onClick={() => void send(open)}>{t("dop:of.send")}</button>
                <button type="button" className={btnPrimary} disabled={!hasCurrentCustomerAcceptance(open)} title={!hasCurrentCustomerAcceptance(open) ? t("dop:of.convertText") : undefined} onClick={() => void convert(open)}>{t("dop:of.convert")}</button>
                <button type="button" className={btn} onClick={() => setDel(open)}>{t("dop:common.delete")}</button>
                <button type="button" className={btn} onClick={() => setOpen(undefined)}>{t("dop:common.close")}</button>
              </div>
            </div>
            <div className="mt-6">
              <QuoteDossier quote={open} onChanged={load} />
            </div>
          </div>
        </div>
      ) : null}

      {ask ? <ReasonDialog {...ask} onCancel={() => setAsk(null)} onDone={() => setAsk(null)} /> : null}

      {del ? (
        <ConfirmDelete
          label={`${del.reference} · ${del.customer_name ?? ""}`}
          onCancel={() => setDel(null)}
          onConfirm={async () => {
            try {
              await archiveRecord("quote", del.id);
              setDel(null);
              setOpen(undefined);
              await load();
            } catch (e) {
              setError(t("dop:anf.notDeleted", { msg: (e as Error).message }));
            }
          }}
        />
      ) : null}
    </section>
  );
}

function errText(m: string): string {
  const t = (k: string) => i18n.t(k);
  if (m.includes("acceptance_required")) return t("dop:of.convertText");
  if (m.includes("accepted_snapshot_required")) return t("dop:jb.noSnapshot");
  if (m.includes("stage_skip_forbidden")) return t("dop:of.adminOnly");
  if (m.includes("reason_required")) return t("dop:of.needReason");
  if (m.includes("minimum_hours_unverified")) return t("dop:of.minHours");
  return m;
}

function ReasonDialog({ title, text, run, onCancel, onDone }: {
  title: string; text: string; run: (reason: string) => Promise<void>; onCancel: () => void; onDone: () => void;
}) {
  const { t } = useTranslation();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/50 p-4">
      <div role="alertdialog" aria-modal="true" aria-label={title} className="w-full max-w-md rounded-md border border-line bg-canvas p-5">
        <h2 className="text-xl">{title}</h2>
        <p className="mt-2 text-sm text-ink-2">{text}</p>
        <label className="mt-4 block text-sm">
          {i18n.t("dop:of.reasonReq")}
          <textarea className="mt-1 w-full border border-line bg-surface px-3 py-2 text-sm" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
        </label>
        <p className="mt-1 text-xs text-soft">{t("dop:of.auditNote")}</p>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" className={btn} onClick={onCancel}>{t("dop:common.cancel")}</button>
          <button type="button" className={btnPrimary} disabled={busy || !reason.trim()} onClick={async () => {
            setBusy(true);
            await run(reason.trim());
            onDone();
          }}>{t("dop:common.confirm")}</button>
        </div>
      </div>
    </div>
  );
}
