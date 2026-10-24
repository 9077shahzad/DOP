/**
 * Partner job screen — designed for a phone on site, one-handed, in poor light,
 * often with gloves on.
 *
 * Consequences of that, deliberately:
 *  - every target is at least 48px; the primary action bar is 56px and sticky
 *    at the bottom of the viewport, inside thumb reach
 *  - a photo is two taps: phase, then the camera opens directly
 *  - a status change paints immediately and announces itself; the network
 *    round trip happens behind the already-updated chip
 *  - no decorative motion anywhere on this screen — nothing may delay an action
 *  - the layout is a single column and works at 360px
 *
 * Cost figures a partner may not see are absent from the payload.
 */
import { Camera } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  Button,
  Chip,
  EmptyState,
  ErrorState,
  Field,
  Input,
  LoadingState,
  NoticeState,
} from "@/components/system";
import { detectLanguage, type Lang } from "@/i18n/config";
import { formatCurrency, formatDate } from "@/i18n/format";
import {
  fetchChangeOrders,
  fetchJobEvents,
  fetchJobPhotos,
  fetchJobs,
  fetchMaterials,
  recordConfirmation,
  recordMaterial,
  setJobStatus,
  uploadJobPhoto,
  NEXT_STATUS,
  type ChangeOrderRow,
  type JobEvent,
  type JobExec,
  type JobPhoto,
  type MaterialRow,
  type PhotoPhase,
} from "@/lib/jobs-exec";

const PHASES = ["before", "during", "after", "damage"] as const;

export function PartnerJobs() {
  const { t, i18n } = useTranslation("jobs");
  const lang = ((i18n.language as Lang) ?? detectLanguage()) as Lang;
  const [rows, setRows] = useState<JobExec[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setRows(await fetchJobs("all"));
    } catch (err) {
      console.error(err);
      setRows([]);
      setError(t("errors.load"));
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  if (rows === null) return <LoadingState label={t("common.loading")} />;

  return (
    <div>
      <h2 className="type-h1 text-ink">{t("partner.title")}</h2>
      <p className="type-body mt-2 text-ink-2">{t("partner.lead")}</p>
      {error ? <ErrorState className="mt-4" message={error} /> : null}
      {rows.length === 0 ? (
        <EmptyState className="mt-6" title={t("partner.empty")} />
      ) : (
        <ul className="mt-6 space-y-5">
          {rows.map((job) => (
            <JobCard key={job.id} job={job} lang={lang} onChanged={() => void load()} />
          ))}
        </ul>
      )}
    </div>
  );
}

function JobCard({ job, lang, onChanged }: { job: JobExec; lang: Lang; onChanged: () => void }) {
  const { t } = useTranslation("jobs");
  const [events, setEvents] = useState<JobEvent[]>([]);
  const [photos, setPhotos] = useState<JobPhoto[]>([]);
  const [materials, setMaterials] = useState<MaterialRow[]>([]);
  const [orders, setOrders] = useState<ChangeOrderRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  /** Painted before the request resolves so the crew sees the change instantly. */
  const [optimistic, setOptimistic] = useState<JobExec["status"] | null>(null);

  const camera = useRef<HTMLInputElement>(null);
  const pendingPhase = useRef<PhotoPhase>("before");
  const [uploading, setUploading] = useState(false);

  // material draft
  const [desc, setDesc] = useState("");
  const [qty, setQty] = useState("1");
  const [unit, setUnit] = useState("Stk");
  const [price, setPrice] = useState("");
  const [signer, setSigner] = useState("");

  const load = useCallback(async () => {
    const [e, p, m, c] = await Promise.all([
      fetchJobEvents(job.id),
      fetchJobPhotos(job.id),
      fetchMaterials(job.id),
      fetchChangeOrders(job.id),
    ]);
    setEvents(e);
    setPhotos(p);
    setMaterials(m);
    setOrders(c);
  }, [job.id]);

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
      setOptimistic(null);
      const raw = err instanceof Error ? err.message : "";
      setError(/unsupported_file_type|file_too_large/.test(raw) ? t(`errors.${raw}`) : raw || t("errors.action"));
    } finally {
      setBusy(false);
    }
  }

  function advance(status: JobExec["status"]) {
    setOptimistic(status);
    setNotice(t("partner.updated", { status: t(`status.${status}`, status) }));
    void run(() => setJobStatus(job.id, status).then(() => undefined));
  }

  function capture(phase: PhotoPhase) {
    pendingPhase.current = phase;
    camera.current?.click();
  }

  const status = optimistic ?? job.status;
  const next = (NEXT_STATUS[status] ?? []).filter((s) => s !== "verified");
  const primary = next[0];
  const secondary = next.slice(1);
  const live = status !== "cancelled" && status !== "verified";

  return (
    <li className="overflow-hidden rounded-md rounded-2xl bg-surface elev-raised">
      <div>
        <div className="border-b border-line px-4 py-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="data-mono text-base text-ink">{job.reference}</span>
            <Chip status={status}>{t(`status.${status}`, status)}</Chip>
          </div>
          <p className="type-body mt-2 text-ink-2">
            {job.scheduled_start ? formatDate(job.scheduled_start, lang, { dateStyle: "full", timeStyle: "short" }) : "—"}
          </p>
        </div>

        <div className="px-4 py-4">
          {error ? <ErrorState className="mb-4" message={error} /> : null}
          {notice ? <NoticeState className="mb-4" message={notice} /> : null}

          {live ? (
            <>
              <section aria-labelledby={`photos-${job.id}`}>
                <h3 id={`photos-${job.id}`} className="label-mono text-soft">
                  {t("photos.title")}
                </h3>
                {/* Two taps: choose the phase, the camera opens immediately. */}
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {PHASES.map((phase) => (
                    <Button
                      key={phase}
                      type="button"
                      variant="outline"
                      size="touch"
                      block
                      disabled={busy}
                      onClick={() => capture(phase)}
                    >
                      <Camera aria-hidden="true" className="size-5" />
                      {t(`photos.phase.${phase}`)}
                    </Button>
                  ))}
                </div>
                <input
                  ref={camera}
                  type="file"
                  accept="image/*,application/pdf"
                  capture="environment"
                  className="sr-only"
                  tabIndex={-1}
                  aria-hidden="true"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (file) void run(() => uploadWithNotice(file));
                  }}
                />
                <p className="type-caption mt-2">{t("photos.hint")}</p>
                {/* Same four upload states as the registration wizard: idle,
                    uploading, stored, failed — only the chrome is smaller. */}
                <p className="mt-2 flex flex-wrap items-center gap-2" aria-live="polite">
                  {uploading ? (
                    <Chip tone="info">{t("photos.uploading")}</Chip>
                  ) : photos.length > 0 ? (
                    <Chip tone="success">{t("photos.count", { count: photos.length })}</Chip>
                  ) : (
                    <Chip tone="neutral">{t("photos.none")}</Chip>
                  )}
                </p>
              </section>

              <section aria-labelledby={`materials-${job.id}`} className="mt-6 border-t border-line pt-4">
                <h3 id={`materials-${job.id}`} className="label-mono text-soft">
                  {t("materials.title")}
                </h3>
                <div className="mt-3 space-y-3">
                  <Field label={t("materials.col.description")}>
                    {(p) => <Input touch value={desc} onChange={(e) => setDesc(e.target.value)} {...p} />}
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label={t("materials.col.quantity")}>
                      {(p) => (
                        <Input
                          touch
                          type="number"
                          inputMode="decimal"
                          min={0}
                          step="0.5"
                          value={qty}
                          onChange={(e) => setQty(e.target.value)}
                          {...p}
                        />
                      )}
                    </Field>
                    <Field label={t("materials.unit")}>
                      {(p) => <Input touch value={unit} onChange={(e) => setUnit(e.target.value)} {...p} />}
                    </Field>
                  </div>
                  <Field label={t("materials.col.price")}>
                    {(p) => (
                      <Input
                        touch
                        type="number"
                        inputMode="decimal"
                        min={0}
                        step="0.05"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        {...p}
                      />
                    )}
                  </Field>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="touch"
                  block
                  className="mt-3"
                  disabled={busy || !desc.trim()}
                  onClick={() =>
                    void run(async () => {
                      const result = await recordMaterial(job.id, {
                        description: desc,
                        quantity: Number(qty || 1),
                        unit,
                        supplierCost: null,
                        customerPrice: price ? Number(price) : null,
                      });
                      setDesc("");
                      setPrice("");
                      setNotice(
                        result.status === "approval_required" ? t("materials.approvalRequired") : t("materials.recorded"),
                      );
                    })
                  }
                >
                  {t("materials.add")}
                </Button>
                {materials.length > 0 ? (
                  <ul className="mt-4 space-y-2">
                    {materials.map((m) => (
                      <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-2">
                        <span className="type-small text-ink">
                          {m.description} · <span className="data-mono">{m.quantity} {m.unit}</span>
                        </span>
                        <Chip status={m.status}>{t(`materials.status.${m.status}`, m.status)}</Chip>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </section>

              {orders.length > 0 ? (
                <section aria-labelledby={`orders-${job.id}`} className="mt-6 border-t border-line pt-4">
                  <h3 id={`orders-${job.id}`} className="label-mono text-soft">
                    {t("changeOrder.title")}
                  </h3>
                  <ul className="mt-3 space-y-2">
                    {orders.map((o) => (
                      <li key={o.id} className="flex flex-wrap items-center justify-between gap-2">
                        <span className="type-small text-ink">
                          <span className="data-mono">{o.reference}</span> · {o.description}
                        </span>
                        <span className="flex items-center gap-2">
                          <span className="data-mono text-sm text-ink">
                            {o.customerPrice == null ? "—" : formatCurrency(o.customerPrice, lang)}
                          </span>
                          <Chip status={o.status}>{t(`changeOrder.status.${o.status}`, o.status)}</Chip>
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </>
          ) : null}

          {status === "completed" && job.customer_confirmation === "none" ? (
            <section aria-labelledby={`confirm-${job.id}`} className="mt-6 border-t border-line pt-4">
              <h3 id={`confirm-${job.id}`} className="label-mono text-soft">
                {t("confirm.title")}
              </h3>
              <p className="type-caption mt-1">{t("confirm.hint")}</p>
              <Field className="mt-3" label={t("confirm.name")}>
                {(p) => <Input touch value={signer} onChange={(e) => setSigner(e.target.value)} {...p} />}
              </Field>
              <div className="mt-3 space-y-2">
                <Button
                  type="button"
                  size="touch"
                  block
                  disabled={busy || !signer.trim()}
                  onClick={() => void run(() => recordConfirmation(job.id, "signature", signer).then(() => undefined))}
                >
                  {t("confirm.signature")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="touch"
                  block
                  disabled={busy}
                  onClick={() => void run(() => recordConfirmation(job.id, "none", "").then(() => undefined))}
                >
                  {t("confirm.none")}
                </Button>
              </div>
            </section>
          ) : null}

          {job.signed_at ? (
            <p className="type-body mt-4 text-ink-2">
              {t("confirm.signed", {
                name: job.signed_by_name || "—",
                date: formatDate(job.signed_at, lang, { dateStyle: "short", timeStyle: "short" }),
              })}
            </p>
          ) : null}

          {events.length > 0 ? (
            <details className="mt-5">
              <summary className="label-mono flex min-h-11 cursor-pointer items-center text-soft">
                {t("timeline.title")}
              </summary>
              <ol className="mt-2 space-y-1.5">
                {events.map((e) => (
                  <li key={e.id} className="type-small text-ink-2">
                    <span className="label-mono text-soft">
                      {formatDate(e.created_at, lang, { dateStyle: "short", timeStyle: "short" })} ·{" "}
                      {t(`timeline.kind.${e.kind}`, e.kind)}
                    </span>
                    {e.body ? ` — ${e.body}` : ""}
                  </li>
                ))}
              </ol>
            </details>
          ) : null}
        </div>

        {/* Thumb zone: the next step is always the last thing on the card and
            sticks to the bottom of the viewport while the card is on screen. */}
        {primary ? (
          <div className="sticky bottom-0 z-10 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur-none">
            <Button
              type="button"
              block
              disabled={busy}
              className="min-h-14 text-base"
              onClick={() => advance(primary)}
            >
              {t(`action.${primary}`, t(`status.${primary}`, primary))}
            </Button>
            {secondary.length > 0 ? (
              <div className="mt-2 grid gap-2" style={{ gridTemplateColumns: `repeat(${secondary.length}, minmax(0, 1fr))` }}>
                {secondary.map((s) => (
                  <Button key={s} type="button" variant="outline" size="touch" block disabled={busy} onClick={() => advance(s)}>
                    {t(`action.${s}`, t(`status.${s}`, s))}
                  </Button>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </li>
  );

  async function uploadWithNotice(file: File) {
    setUploading(true);
    try {
      await uploadJobPhoto(job.id, pendingPhase.current, file);
      setNotice(t("photos.saved", { phase: t(`photos.phase.${pendingPhase.current}`) }));
    } finally {
      setUploading(false);
    }
  }
}
