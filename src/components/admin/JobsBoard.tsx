import { field, btn, btnPrimary } from "@/components/system";
/**
 * Admin job execution board — schedule, live status, proof of service,
 * change orders and cancellation. Cost figures come from the role-gated
 * helpers, so a sales user simply has no cost fields in the payload.
 */
import { OfferStatusBadge } from "@/components/admin/OfferStatusBadge";
import { withCorrectedContact } from "@/lib/contact-overlay";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { siteHref } from "@/lib/site";
import { ConfirmDelete } from "@/components/admin/ConfirmDelete";
import { QuoteDossier } from "@/components/admin/QuoteDossier";
import { archiveRecord, fetchQuoteByReference } from "@/lib/dop";
import { supabase } from "@/integrations/supabase/client";
import type { QuoteRow } from "@/lib/quotes";

import { useActiveLang } from "@/lib/admin-i18n";
import { notifyReviewRequest } from "@/lib/operational-mail.functions";
import { formatCurrency, formatDate, formatDayMonthYear } from "@/i18n/format";
import {
  cancelJob,
  createChangeOrder,
  decideChangeOrderStaff,
  fetchChangeOrders,
  fetchJob,
  fetchJobEvents,
  fetchJobPhotos,
  fetchJobs,
  fetchMaterials,
  sendChangeOrder,
  setJobStatus,
  signedEvidenceUrl,
  NEXT_STATUS,
  type CancelActor,
  type ChangeOrderRow,
  type JobEvent,
  type JobExec,
  type JobPhoto,
  type MaterialRow,
} from "@/lib/jobs-exec";


export function JobsBoard() {
  const { t } = useTranslation("jobs");
  const lang = useActiveLang();
  const [scope, setScope] = useState<"open" | "all" | "archived">("open");
  const [includeTest, setIncludeTest] = useState(false);
  const [rows, setRows] = useState<JobExec[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [del, setDel] = useState<JobExec | null>(null);
  const [doc, setDoc] = useState<QuoteRow | null>(null);
  const [docJob, setDocJob] = useState<string | null>(null);
  const [download, setDownload] = useState<{ quote: QuoteRow; jobId: string; original?: boolean } | null>(null);

  /**
   * Orders print the immutable accepted-offer snapshot captured at customer
   * acceptance (carried onto the job at conversion). Later offer edits can never
   * change what the order shows.
   */
  async function linkedQuote(job: JobExec, original = false): Promise<QuoteRow | null> {
    // Latest corrected contact details (audited via dop_correct_customer) are
    // shown on top of the accepted snapshot; price/scope/terms stay as accepted.
    const q = job.quote_reference ? await fetchQuoteByReference(job.quote_reference).catch(() => null) : null;
    const overlay = original ? null : q;
    const jobSnap = (job.accepted_snapshot ?? null) as { quote?: QuoteRow; source?: string } | null;
    if (jobSnap?.quote && jobSnap.source !== "conversion" && jobSnap.quote.accepted_at) return withCorrectedContact(jobSnap.quote, overlay);
    if (!job.quote_reference) {
      setError(t("dop:jb.noQuote"));
      return null;
    }
    const qSnap = (q as unknown as { accepted_snapshot?: { quote?: QuoteRow } | null } | null)?.accepted_snapshot;
    if (qSnap?.quote?.accepted_at) return withCorrectedContact(qSnap.quote, overlay);
    // No customer acceptance: staff may still get the plain quotation PDF,
    // rendered as an offer (never as an order or accepted document).
    if (original && q) return q;
    setError(t("dop:jb.noSnapshot"));
    return null;
  }

  const load = useCallback(async () => {
    try {
      setRows(await fetchJobs(scope, includeTest));
    } catch (err) {
      console.error(err);
      setRows([]);
      setError(t("errors.load"));
    }
  }, [scope, includeTest, t]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="label-mono text-primary">{t("admin.eyebrow")}</p>
          <h1 className="mt-2 text-3xl">{t("admin.title")}</h1>
          <p className="mt-2 max-w-2xl text-sm text-ink-2">{t("admin.lead")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
        {scope !== "archived" ? (
          <label className="flex items-center gap-2 text-sm text-ink-2">
            <input type="checkbox" checked={includeTest} onChange={(e) => setIncludeTest(e.target.checked)} />
            {t("dop:common.showTest")}
          </label>
        ) : null}
        <div role="group" aria-label={t("admin.scopeLabel")} className="flex gap-2">
          {(["open", "all", "archived"] as const).map((key) => (
            <button
              key={key}
              type="button"
              aria-pressed={scope === key}
              onClick={() => setScope(key)}
              className={`label-mono rounded-md border px-3 py-2 ${
                scope === key ? "border-primary bg-primary text-primary-foreground" : "border-line bg-surface text-ink-2"
              }`}
            >
              {key === "archived" ? t("dop:jb.archive") : t(`admin.scope.${key}`)}
            </button>
          ))}
        </div>
        </div>
      </div>

      {error ? (
        <p role="alert" className="mt-4 rounded-md border-l-4 border-destructive bg-surface px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p role="status" className="mt-4 rounded-md border-l-4 border-primary bg-surface px-4 py-3 text-sm text-ink-2">{notice}</p>
      ) : null}

      {rows === null ? (
        <p className="label-mono mt-8 text-soft">{t("common.loading")}</p>
      ) : rows.length === 0 ? (
        <p className="mt-8 rounded-md border border-line bg-surface p-4 text-sm text-ink-2">{t("admin.empty")}</p>
      ) : (
        <div className="mt-8 rounded-md border border-line md:overflow-x-auto">
          <table className="w-full border-collapse md:min-w-[42rem] block md:table bg-surface text-sm">
            <caption className="sr-only">{t("admin.tableCaption")}</caption>
            <thead className="hidden md:table-header-group">
              <tr className="border-b border-line text-left">
                <th scope="col" className="label-mono px-3 py-2 text-soft">{t("admin.col.reference")}</th>
                <th scope="col" className="label-mono px-3 py-2 text-soft">{t("dop:of.col.customer")}</th>
                <th scope="col" className="label-mono px-3 py-2 text-soft">{t("admin.col.status")}</th>
                <th scope="col" className="label-mono px-3 py-2 text-soft">{t("admin.col.scheduled")}</th>
                <th scope="col" className="label-mono px-3 py-2 text-soft">{t("admin.col.value")}</th>
                <th scope="col" className="px-3 py-2"><span className="sr-only">{t("admin.col.actions")}</span></th>
              </tr>
            </thead>
            <tbody className="block md:table-row-group">
              {rows.map((job) => (
                <tr key={job.id} className="grid grid-cols-2 gap-x-3 gap-y-2 p-4 md:table-row md:p-0 border-b border-line last:border-0">
                  <td data-label={t("admin.col.reference")} className="data-mono md:px-3 md:py-2 text-ink before:block before:font-mono before:text-[0.65rem] before:uppercase before:tracking-widest before:text-soft before:content-[attr(data-label)] md:before:hidden">{job.reference}{job.is_test ? <span className="label-mono ml-2 rounded border border-line px-1 text-soft">{t("dop:common.test")}</span> : null}<span className="label-mono block text-soft">{job.quote_reference ?? ""}</span>{job.quote_reference ? <span className="mt-1 block"><OfferStatusBadge tone="order" /></span> : null}</td>
                  <td data-label={t("dop:of.col.customer")} className="md:px-3 md:py-2 text-ink col-span-2 before:block before:font-mono before:text-[0.65rem] before:uppercase before:tracking-widest before:text-soft before:content-[attr(data-label)] md:before:hidden">{job.customer_name || "—"}</td>
                  <td data-label={t("admin.col.status")} className="md:px-3 md:py-2 col-span-2 before:block before:font-mono before:text-[0.65rem] before:uppercase before:tracking-widest before:text-soft before:content-[attr(data-label)] md:before:hidden">
                    {job.archived_at ? <span className="label-mono me-2 rounded-md border border-destructive px-2 py-0.5 text-destructive">{t("dop:common.archived")}</span> : null}
                    {t(`status.${job.status}`, job.status)}
                  </td>
                  <td data-label={t("admin.col.scheduled")} className="md:px-3 md:py-2 before:block before:font-mono before:text-[0.65rem] before:uppercase before:tracking-widest before:text-soft before:content-[attr(data-label)] md:before:hidden">
                    {job.scheduled_start ? formatDayMonthYear(job.scheduled_start, true) : <span className="label-mono rounded-md border border-warning px-2 py-0.5 text-warning">{t("field.datePending")}</span>}
                  </td>
                  <td data-label={t("admin.col.value")} className="data-mono md:px-3 md:py-2 before:block before:font-mono before:text-[0.65rem] before:uppercase before:tracking-widest before:text-soft before:content-[attr(data-label)] md:before:hidden">
                    {job.job_value == null ? "—" : formatCurrency(Number(job.job_value), lang)}
                  </td>
                  <td className="md:px-3 md:py-2 md:text-right col-span-2 before:block before:font-mono before:text-[0.65rem] before:uppercase before:tracking-widest before:text-soft before:content-[attr(data-label)] md:before:hidden">
                    <div className="flex flex-wrap justify-start gap-2 md:justify-end">
                      {job.archived_at ? (
                        <button type="button" className={btn} onClick={async () => {
                          try { await archiveRecord("job", job.id, true); setNotice(`${job.reference} wiederhergestellt.`); await load(); }
                          catch (e) { setError(`Nicht wiederhergestellt: ${(e as Error).message}`); }
                        }}>{t("dop:common.restore")}</button>
                      ) : (<>
                      <button type="button" className={btn} onClick={() => setSelected(job.id)}>{t("dop:common.edit")}</button>
                      <button type="button" className={btn} onClick={async () => { const q = await linkedQuote(job); if (q) { setDocJob(job.id); setDoc(q); } }}>{t("dop:jb.orderPdfSend")}</button>
                      <button type="button" className={btn} disabled={download !== null} onClick={async () => { setError(null); const q = await linkedQuote(job); if (q) setDownload({ quote: q, jobId: job.id }); }}>{t("dop:of.downloadPdf")}</button>
                      <button type="button" className={btn} disabled={download !== null} title={t("dop:jb.originalTitle")} onClick={async () => { setError(null); const q = await linkedQuote(job, true); if (q) setDownload({ quote: q, jobId: job.id, original: true }); }}>{t("dop:jb.original")}</button>
                      <button type="button" className={btn} onClick={() => setDel(job)}>{t("dop:common.delete")}</button>
                      </>)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {download ? <div hidden><QuoteDossier key={`${download.jobId}-${download.original ? "o" : "a"}`} quote={download.quote} editable={false} {...(download.original ? {} : { documentKind: "order" as const, orderJobId: download.jobId })} autoDownload onDownloaded={(message) => { setDownload(null); if (message) setError(message); }} /></div> : null}

      {selected ? (
        <JobDetail
          jobId={selected}
          onClose={() => setSelected(null)}
          onChanged={() => void load()}
        />
      ) : null}

      {doc ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-ink/50 p-4">
          <div role="dialog" aria-modal="true" aria-label={doc.reference} className="mx-auto max-w-4xl rounded-md border border-line bg-canvas p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="label-mono text-primary">{t("dop:jb.docs")}</p>
                <p className="mt-1 text-sm text-ink-2">{t("dop:jb.docsHelp")}</p>
              </div>
              <button type="button" className={btn} onClick={() => setDoc(null)}>{t("dop:common.close")}</button>
            </div>
            <div className="mt-6"><QuoteDossier quote={doc} editable={false} documentKind="order" {...(docJob ? { orderJobId: docJob } : {})} /></div>
          </div>
        </div>
      ) : null}

      {del ? (
        <ConfirmDelete
          label={`${del.reference} · ${del.customer_name ?? ""}`}
          onCancel={() => setDel(null)}
          onConfirm={async () => {
            try {
              await archiveRecord("job", del.id);
              setDel(null);
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

function JobDetail({ jobId, onClose, onChanged }: { jobId: string; onClose: () => void; onChanged: () => void }) {
  const { t } = useTranslation("jobs");
  const lang = useActiveLang();
  const [job, setJob] = useState<JobExec | null>(null);
  const [events, setEvents] = useState<JobEvent[]>([]);
  const [photos, setPhotos] = useState<JobPhoto[]>([]);
  const [materials, setMaterials] = useState<MaterialRow[]>([]);
  const [orders, setOrders] = useState<ChangeOrderRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [j, e, p, m, c] = await Promise.all([
      fetchJob(jobId),
      fetchJobEvents(jobId),
      fetchJobPhotos(jobId),
      fetchMaterials(jobId),
      fetchChangeOrders(jobId),
    ]);
    setJob(j);
    setEvents(e);
    setPhotos(p);
    setMaterials(m);
    setOrders(c);
  }, [jobId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await action();
      await load();
      onChanged();
    } catch (err) {
      console.error(err);
      const m = err instanceof Error ? err.message : "";
      setError(m.includes("move_date_required") ? t("errors.moveDateRequired") : m || t("errors.action"));
    } finally {
      setBusy(false);
    }
  }

  if (!job) return null;
  const next = NEXT_STATUS[job.status] ?? [];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-ink/50 p-4">
      <div role="dialog" aria-modal="true" aria-label={job.reference} className="mx-auto max-w-3xl rounded-md border border-line bg-surface p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="data-mono text-ink">{job.reference}</p>
            <p className="label-mono mt-1 text-soft">{t(`status.${job.status}`, job.status)}</p>
          </div>
          <button type="button" className={btn} onClick={onClose}>
            {t("common.close")}
          </button>
        </div>

        {error ? (
          <p role="alert" className="mt-4 rounded-md border-l-4 border-destructive bg-canvas px-4 py-3 text-sm text-destructive">{error}</p>
        ) : null}
        {notice ? (
          <p role="status" className="mt-4 rounded-md border-l-4 border-primary bg-canvas px-4 py-3 text-sm text-ink-2">{notice}</p>
        ) : null}

        <dl className="mt-5 grid gap-px overflow-hidden rounded-md border border-line bg-line sm:grid-cols-2">
          <Cell label={t("field.scheduled")} value={formatDayMonthYear(job.scheduled_start, true)} />
          <Cell label={t("field.arrived")} value={job.arrived_at ? formatDate(job.arrived_at, lang, { timeStyle: "short" }) : "—"} />
          <Cell label={t("field.started")} value={job.started_at ? formatDate(job.started_at, lang, { timeStyle: "short" }) : "—"} />
          <Cell label={t("field.completed")} value={job.completed_at ? formatDate(job.completed_at, lang, { timeStyle: "short" }) : "—"} />
          <Cell label={t("field.pause")} value={t("field.minutes", { count: job.total_pause_minutes ?? 0 })} />
          <Cell label={t("field.value")} value={job.job_value == null ? "—" : formatCurrency(Number(job.job_value), lang)} />
          <Cell label={t("field.confirmation")} value={t(`confirmation.${job.customer_confirmation}`, job.customer_confirmation)} />
          <Cell label={t("field.signedBy")} value={job.signed_by_name || "—"} />
        </dl>

        {job.tracking_token ? (
          <TrackingLink token={job.tracking_token} lang={lang} label={t("tracking.label")} copy={t("tracking.copy")} copied={t("tracking.copied")} />
        ) : null}

        {next.length > 0 ? (
          <div className="mt-5 flex flex-wrap gap-2">
            {next.map((status) => (
              <button
                key={status}
                type="button"
                disabled={busy}
                className={btnPrimary}
                onClick={() =>
                  void run(async () => {
                    await setJobStatus(jobId, status);
                    // A verified job is finished business: the review invitation
                    // goes out once, and only if the office switched it on.
                    if (status === "verified") {
                      const result = await notifyReviewRequest({ data: { jobId } });
                      if (result.status === "sent") setNotice(t("review.sent"));
                      else if (result.status === "queued") setNotice(t("review.queued"));
                      else if (result.status === "skipped") setNotice(t("review.skipped", { reason: result.reason }));
                    }
                  })
                }
              >

                {t(`action.${status}`, t(`status.${status}`, status))}
              </button>
            ))}
          </div>
        ) : null}

        <LinkedOffer reference={job.quote_reference} />

        <Materials rows={materials} lang={lang} />
        <ChangeOrders
          rows={orders}
          lang={lang}
          busy={busy}
          onSend={(id, price) =>
            void run(async () => {
              const result = await sendChangeOrder(id, price);
              setNotice(
                result.status === "approval_required"
                  ? t("changeOrder.approvalRequired", { role: t(`role.${result.requiredRole}`, result.requiredRole) })
                  : t("changeOrder.sent", { reference: result.reference }),
              );
            })
          }
          onDecide={(id, approve, name) => void run(() => decideChangeOrderStaff(id, approve, "phone", name))}
          onCreate={(input) => void run(() => createChangeOrder(jobId, input).then(() => undefined))}
        />
        <Photos rows={photos} lang={lang} />
        <Timeline rows={events} lang={lang} />

        {job.status !== "cancelled" ? (
          <CancelBox
            busy={busy}
            job={job}
            lang={lang}
            onCancel={(who, reason) =>
              void run(async () => {
                const outcome = await cancelJob(jobId, who, reason);
                setNotice(
                  outcome.manualReview
                    ? t("cancel.manualReview", { band: t(`cancel.band.${outcome.band}`, outcome.band) })
                    : t("cancel.done", {
                        band: t(`cancel.band.${outcome.band}`, outcome.band),
                        charge: outcome.customerCharge == null ? "—" : formatCurrency(outcome.customerCharge, lang),
                      }),
                );
              })
            }
          />
        ) : null}
      </div>
    </div>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface p-3">
      <dt className="label-mono text-soft">{label}</dt>
      <dd className="mt-1 text-sm text-ink">{value}</dd>
    </div>
  );
}

function Materials({ rows, lang }: { rows: MaterialRow[]; lang: ReturnType<typeof useActiveLang> }) {
  const { t } = useTranslation("jobs");
  const showCost = rows.some((r) => r.costsVisible);
  return (
    <section className="mt-6">
      <h2 className="text-lg">{t("materials.title")}</h2>
      {rows.length === 0 ? (
        <p className="mt-2 text-sm text-ink-2">{t("materials.empty")}</p>
      ) : (
        <div className="mt-2 overflow-x-auto rounded-md border border-line">
          <table className="w-full min-w-[32rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-line text-left">
                <th scope="col" className="label-mono px-3 py-2 text-soft">{t("materials.col.description")}</th>
                <th scope="col" className="label-mono px-3 py-2 text-soft">{t("materials.col.quantity")}</th>
                {showCost ? <th scope="col" className="label-mono px-3 py-2 text-soft">{t("materials.col.cost")}</th> : null}
                <th scope="col" className="label-mono px-3 py-2 text-soft">{t("materials.col.price")}</th>
                <th scope="col" className="label-mono px-3 py-2 text-soft">{t("materials.col.status")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-line last:border-0">
                  <td className="px-3 py-2">{row.description}</td>
                  <td className="data-mono px-3 py-2">{row.quantity} {row.unit}</td>
                  {showCost ? (
                    <td className="data-mono px-3 py-2">{row.supplierCost == null ? "—" : formatCurrency(row.supplierCost, lang)}</td>
                  ) : null}
                  <td className="data-mono px-3 py-2">{row.customerPrice == null ? "—" : formatCurrency(row.customerPrice, lang)}</td>
                  <td className="px-3 py-2">{t(`materials.status.${row.status}`, row.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function ChangeOrders({
  rows,
  lang,
  busy,
  onSend,
  onDecide,
  onCreate,
}: {
  rows: ChangeOrderRow[];
  lang: ReturnType<typeof useActiveLang>;
  busy: boolean;
  onSend: (id: string, price: number | null) => void;
  onDecide: (id: string, approve: boolean, name: string) => void;
  onCreate: (input: { description: string; reason: string; estimatedHours: number | null; estimatedMaterials: number | null; partnerCost: number | null; customerPrice: number | null }) => void;
}) {
  const { t } = useTranslation("jobs");
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [reason, setReason] = useState("");
  const [price, setPrice] = useState("");
  const [name, setName] = useState("");

  return (
    <section className="mt-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg">{t("changeOrder.title")}</h2>
        <button type="button" className={btn} onClick={() => setOpen((v) => !v)}>
          {t("changeOrder.new")}
        </button>
      </div>

      {open ? (
        <div className="mt-3 grid gap-3 rounded-md border border-line bg-canvas p-3 sm:grid-cols-2">
          <label className="text-sm">
            <span className="label-mono text-soft">{t("changeOrder.field.description")}</span>
            <input value={description} onChange={(e) => setDescription(e.target.value)} className={field} />
          </label>
          <label className="text-sm">
            <span className="label-mono text-soft">{t("changeOrder.field.reason")}</span>
            <input value={reason} onChange={(e) => setReason(e.target.value)} className={field} />
          </label>
          <label className="text-sm">
            <span className="label-mono text-soft">{t("changeOrder.field.price")}</span>
            <input type="number" min={0} step="0.05" value={price} onChange={(e) => setPrice(e.target.value)} className={field} />
          </label>
          <button
            type="button"
            disabled={busy || !description.trim()}
            className={`${btnPrimary} sm:col-span-2 sm:justify-self-start`}
            onClick={() => {
              onCreate({
                description,
                reason,
                estimatedHours: null,
                estimatedMaterials: null,
                partnerCost: null,
                customerPrice: price ? Number(price) : null,
              });
              setDescription("");
              setReason("");
              setPrice("");
              setOpen(false);
            }}
          >
            {t("changeOrder.create")}
          </button>
        </div>
      ) : null}

      {rows.length === 0 ? (
        <p className="mt-2 text-sm text-ink-2">{t("changeOrder.empty")}</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {rows.map((row) => (
            <li key={row.id} className="rounded-md border border-line bg-canvas p-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="data-mono text-ink">{row.reference}</span>
                <span className="label-mono text-soft">{t(`changeOrder.status.${row.status}`, row.status)}</span>
              </div>
              <p className="mt-2 text-sm text-ink">{row.description}</p>
              <p className="data-mono mt-1 text-sm text-ink-2">
                {row.customerPrice == null ? "—" : formatCurrency(row.customerPrice, lang)}
              </p>
              {row.customerDecidedAt ? (
                <p className="mt-1 text-xs text-soft">
                  {t("changeOrder.decided", {
                    name: row.decidedName || "—",
                    channel: t(`changeOrder.channel.${row.decisionChannel}`, row.decisionChannel || "—"),
                    date: formatDate(row.customerDecidedAt, lang, { dateStyle: "short", timeStyle: "short" }),
                  })}
                </p>
              ) : null}
              {row.status === "draft" ? (
                <button type="button" disabled={busy} className={`${btnPrimary} mt-3`} onClick={() => onSend(row.id, row.customerPrice)}>
                  {t("changeOrder.send")}
                </button>
              ) : null}
              {row.status === "awaiting_customer" ? (
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {row.publicToken ? (
                    <p className="label-mono break-all text-soft sm:col-span-2">
                      {t("changeOrder.link")}: {siteHref(`/de/freigabe/${row.publicToken}`)}
                    </p>
                  ) : null}
                  <label className="text-sm">
                    <span className="label-mono text-soft">{t("changeOrder.field.decidedBy")}</span>
                    <input value={name} onChange={(e) => setName(e.target.value)} className={field} />
                  </label>
                  <div className="flex items-end gap-2">
                    <button type="button" disabled={busy || !name.trim()} className={btnPrimary} onClick={() => onDecide(row.id, true, name)}>
                      {t("changeOrder.approvePhone")}
                    </button>
                    <button type="button" disabled={busy || !name.trim()} className={btn} onClick={() => onDecide(row.id, false, name)}>
                      {t("changeOrder.rejectPhone")}
                    </button>
                  </div>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Photos({ rows, lang }: { rows: JobPhoto[]; lang: ReturnType<typeof useActiveLang> }) {
  const { t } = useTranslation("jobs");
  const [urls, setUrls] = useState<Record<string, string>>({});

  async function reveal(id: string, path: string) {
    const url = await signedEvidenceUrl(path);
    if (url) setUrls((prev) => ({ ...prev, [id]: url }));
  }

  return (
    <section className="mt-6">
      <h2 className="text-lg">{t("photos.title")}</h2>
      {rows.length === 0 ? (
        <p className="mt-2 text-sm text-ink-2">{t("photos.empty")}</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {rows.map((row) => (
            <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-line bg-canvas p-3 text-sm">
              <span>
                {t(`photos.phase.${row.phase}`, row.phase)} · {formatDate(row.created_at, lang, { dateStyle: "short", timeStyle: "short" })}
                {row.caption ? ` · ${row.caption}` : ""}
              </span>
              {urls[row.id] ? (
                <a href={urls[row.id]} target="_blank" rel="noreferrer" className="label-mono text-primary underline">
                  {t("photos.open")}
                </a>
              ) : (
                <button type="button" className={btn} onClick={() => void reveal(row.id, row.storage_path)}>
                  {t("photos.reveal")}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Timeline({ rows, lang }: { rows: JobEvent[]; lang: ReturnType<typeof useActiveLang> }) {
  const { t } = useTranslation("jobs");
  return (
    <section className="mt-6">
      <h2 className="text-lg">{t("timeline.title")}</h2>
      <ol className="mt-2 space-y-2">
        {rows.map((row) => (
          <li key={row.id} className="rounded-md border border-line bg-canvas p-3 text-sm">
            <span className="label-mono text-soft">
              {formatDate(row.created_at, lang, { dateStyle: "short", timeStyle: "short" })} ·{" "}
              {t(`timeline.kind.${row.kind}`, row.kind)} · {t(`actor.${row.actor_kind}`, row.actor_kind)}
            </span>
            {row.body ? <p className="mt-1 text-ink">{row.body}</p> : null}
          </li>
        ))}
      </ol>
    </section>
  );
}

function CancelBox({
  busy,
  job,
  lang,
  onCancel,
}: {
  busy: boolean;
  job: JobExec;
  lang: ReturnType<typeof useActiveLang>;
  onCancel: (who: CancelActor, reason: string) => void;
}) {
  const { t } = useTranslation("jobs");
  const [who, setWho] = useState<CancelActor>("customer");
  const [reason, setReason] = useState("");

  return (
    <section className="mt-6 rounded-md border border-line bg-canvas p-3">
      <h2 className="text-lg">{t("cancel.title")}</h2>
      <p className="mt-1 text-xs text-soft">{t("cancel.note")}</p>
      {job.cancellation_customer_charge != null ? (
        <p className="data-mono mt-2 text-sm text-ink">
          {formatCurrency(Number(job.cancellation_customer_charge), lang)}
        </p>
      ) : null}
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          <span className="label-mono text-soft">{t("cancel.who")}</span>
          <select value={who} onChange={(e) => setWho(e.target.value as CancelActor)} className={field}>
            {(["customer", "partner"] as const).map((k) => (
              <option key={k} value={k}>
                {t(`cancel.actor.${k}`, k)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="label-mono text-soft">{t("cancel.reason")}</span>
          <input value={reason} onChange={(e) => setReason(e.target.value)} className={field} />
        </label>
      </div>
      <button type="button" disabled={busy || !reason.trim()} className={`${btn} mt-3 border-destructive text-destructive`} onClick={() => onCancel(who, reason)}>
        {t("cancel.submit")}
      </button>
    </section>
  );
}

/** The customer-facing tracking link for one job; read-only, copy to share. */
function TrackingLink({ token, lang, label, copy, copied }: { token: string; lang: string; label: string; copy: string; copied: string }) {
  const [done, setDone] = useState(false);
  const url = siteHref(`/${lang}/auftrag/${token}`);
  return (
    <div className="mt-4 flex flex-wrap items-center gap-3">
      <span className="label-mono text-soft">{label}</span>
      <a className="data-mono break-all text-sm text-primary underline" href={url} target="_blank" rel="noreferrer">
        {url}
      </a>
      <button
        type="button"
        className={btn}
        onClick={() => {
          void navigator.clipboard?.writeText(url).then(() => {
            setDone(true);
            window.setTimeout(() => setDone(false), 2000);
          });
        }}
      >
        {done ? copied : copy}
      </button>
    </div>
  );
}

/** Original customer, inventory, service, price and upload data of the order. */
function LinkedOffer({ reference }: { reference: string | null }) {
  const { t } = useTranslation("dop");
  const [quote, setQuote] = useState<QuoteRow | null>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (reference) void fetchQuoteByReference(reference).then(setQuote).catch(() => setQuote(null));
  }, [reference]);
  if (!quote) return null;
  return (
    <section className="mt-5 rounded-md border border-line p-3">
      <button type="button" className={btn} onClick={() => setOpen((v) => !v)}>
        {open ? t("jb.hideOffer") : t("jb.showOffer", { ref: quote.reference })}
      </button>
      {open ? <div className="mt-4">
        {quote.accepted_at || quote.job_id || quote.workflow_stage === "order" ? <p className="mb-4 text-sm text-ink-2">{t("jb.immutable")}</p> : null}
        <QuoteDossier quote={quote} onChanged={() => { if (reference) void fetchQuoteByReference(reference).then(setQuote); }} />
      </div> : null}
    </section>
  );
}
