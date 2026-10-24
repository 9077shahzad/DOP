/**
 * Full offer as the customer submitted it — the same preview, calculation and
 * PDF the customer sees, fed from the stored snapshot (never recalculated).
 * Staff additionally see the workflow history, attachments and the audited
 * manual price change.
 */
import { useEffect, useMemo, useState } from "react";
import { I18nextProvider, useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { useActiveLang } from "@/lib/admin-i18n";
import { useQuery } from "@tanstack/react-query";

import { QuotePreview } from "@/components/planner/QuotePreview";
import { btn, btnPrimary, field } from "@/components/system";
import i18n, { LOCALES, isLang, type Lang } from "@/i18n/config";
import { formatCalendarDate, formatCurrency, formatDateTime } from "@/i18n/format";
import { supabase } from "@/integrations/supabase/client";
import { EVENT_LABEL, STAGE_LABEL, adjustPrice, fetchHistory, type WorkflowEvent } from "@/lib/dop";
import { fetchPlannerPricing } from "@/lib/planner-pricing";
import { fetchInventory } from "@/lib/inventory";
import { buildPlans } from "@/lib/pricing";
import { OfferEditor } from "@/components/admin/OfferEditor";
import { CustomerCorrection } from "@/components/admin/CustomerCorrection";
import { blockingInventory } from "@/lib/price-resolution";
import { rowToCalculation, rowToState, type PublicQuote, type QuoteRow } from "@/lib/quotes";

export function QuoteDossier({
  quote,
  extraIds = [],
  onChanged,
  editable = true,
  documentKind = "quote",
  orderJobId,
  autoDownload = false,
  onDownloaded,
}: {
  quote: QuoteRow;
  extraIds?: string[];
  onChanged?: () => void;
  editable?: boolean;
  documentKind?: "quote" | "order";
  orderJobId?: string;
  autoDownload?: boolean;
  onDownloaded?: (error?: string) => void;
}) {
  const { t } = useTranslation("dop");
  const uiLang = useActiveLang();
  const lang = (isLang(quote.language) ? quote.language : "de") as Lang;
  // Customer documents (quote and order) always print in the customer's language.
  const scoped = useMemo(() => i18n.cloneInstance({ lng: lang }), [lang]);
  const pricing = useQuery({ queryKey: ["planner-pricing", "CH"], queryFn: () => fetchPlannerPricing("CH"), staleTime: 300_000 }).data ?? null;
  const catalogue = useQuery({ queryKey: ["inventory-catalogue", "all"], queryFn: () => fetchInventory(true) });
  const inventoryNames = useMemo(() => new Map((catalogue.data ?? []).map((item) => [item.key, item.name_de])), [catalogue.data]);
  const orderVersionMatches = documentKind !== "order" || Boolean(quote.accepted_at && quote.accepted_version != null && quote.accepted_version === quote.version);
  const [history, setHistory] = useState<WorkflowEvent[]>([]);
  const [editing, setEditing] = useState(false);
  const [editMsg, setEditMsg] = useState<string | null>(null);
  const volumes = useMemo(() => Object.fromEntries((catalogue.data ?? []).map((i) => [i.key, Number(i.m3)])), [catalogue.data]);
  const blocking = useMemo(() => blockingInventory((quote.items ?? {}) as Record<string, number>, volumes), [quote.items, volumes]);
  const [files, setFiles] = useState<{ id: string; file_name: string; storage_path: string; mime_type: string | null; bucket: string }[]>([]);

  const reload = () => {
    void fetchHistory([quote.id, quote.lead_id ?? "", quote.job_id ?? "", ...extraIds]).then(setHistory).catch(() => setHistory([]));
  };
  useEffect(reload, [quote.id, quote.version]);
  useEffect(() => {
    void Promise.all([
      quote.lead_id
        ? supabase.from("lead_attachments").select("id, file_name, storage_path, mime_type").eq("lead_id", quote.lead_id)
        : Promise.resolve({ data: [] }),
      supabase.from("quote_attachments").select("id, file_name, storage_path, mime_type").eq("quote_id", quote.id),
    ]).then(([lead, offer]) => setFiles([
      ...(lead.data ?? []).map((f) => ({ ...f, bucket: "lead-attachments" })),
      ...(offer.data ?? []).map((f) => ({ ...f, bucket: "lead-attachments" })),
    ])).catch(() => setFiles([]));
  }, [quote.id, quote.lead_id]);

  const state = useMemo(() => {
    const base = rowToState(quote as unknown as PublicQuote);
    return {
      ...base,
      name: quote.customer_name ?? "",
      company: quote.customer_company ?? "",
      phone: quote.customer_phone ?? "",
      email: quote.customer_email ?? "",
      customerStreet: quote.customer_street ?? "",
      customerZip: quote.customer_zip ?? "",
      customerCity: quote.customer_city ?? "",
      customerCountry: quote.customer_country ?? "",
      fromAddress: quote.from_address ?? "",
      toAddress: quote.to_address ?? "",
      notes: quote.customer_notes ?? "",
      contactLanguage: lang,
    };
  }, [quote, lang]);
  const calc = useMemo(() => rowToCalculation(quote as unknown as PublicQuote, state, pricing), [quote, state, pricing]);
  const plans = useMemo(
    () => (state.roomUnits == null ? [] : buildPlans({ ...state, roomUnits: state.roomUnits }, calc)),
    [state, calc],
  );

  async function openFile(path: string, bucket: string, downloadName?: string) {
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 300, downloadName ? { download: downloadName } : undefined);
    if (error) throw error;
    if (data?.signedUrl) window.open(data.signedUrl, "_blank", "noopener");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="label-mono rounded-md border border-primary px-2 py-1 text-primary">
          {STAGE_LABEL[quote.workflow_stage] ?? "—"}
        </span>
        <span className="data-mono text-soft">{t("hist.version", { v: quote.version ?? 1 })}</span>
        {quote.accepted_at ? <span className="label-mono text-soft">{t("qd.frozen")}</span> : null}
      </div>

      <section className="rounded-md border border-line bg-surface p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="label-mono text-primary">{t("qd.customer")}</p>
          {editable && !quote.accepted_at && !quote.job_id && quote.workflow_stage !== "order" ? (
            <button type="button" className={btn} onClick={() => setEditing(true)}>{t("qd.editCustomer")}</button>
          ) : null}
        </div>
        <dl className="mt-2 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-[10rem_1fr]">
          {[
            [t("qd.fullName"), quote.customer_name],
            [t("corr.company"), quote.customer_company],
            [t("corr.phone"), quote.customer_phone],
            [t("corr.email"), quote.customer_email],
            [t("key.customer_address"), [quote.customer_street, [quote.customer_zip, quote.customer_city].filter(Boolean).join(" ")].filter(Boolean).join(", ")],
            [t("key.from"), quote.from_address],
            [t("key.to"), quote.to_address],
            [t("qd.notes"), quote.customer_notes],
          ].map(([k, v]) => (
            <div key={k as string} className="contents">
              <dt className="text-soft">{k}</dt>
              <dd className="whitespace-pre-wrap text-ink">{(v as string | null) || "—"}</dd>
            </div>
          ))}
        </dl>
      </section>

      {blocking.length > 0 && catalogue.data ? (
        <p role="alert" className="rounded-md border-l-4 border-destructive bg-surface px-4 py-3 text-sm text-ink">
          {t("qd.blocked")} <strong>{blocking.map((k) => inventoryNames.get(k) ?? k).join(", ")}</strong> — {t("qd.noVolume")}{" "}
          <a className="text-primary underline" href="/admin/inventar">{t("qd.maintainInv")}</a>
        </p>
      ) : null}
      {editMsg ? <p role="status" className="rounded-md border-l-4 border-primary bg-surface px-4 py-3 text-sm">{editMsg}</p> : null}
      {editable && !quote.accepted_at && !quote.job_id && quote.workflow_stage !== "order" ? (
        editing
          ? <OfferEditor quote={quote} onClose={() => setEditing(false)} onSaved={(m) => { setEditing(false); setEditMsg(m); reload(); onChanged?.(); }} />
          : <button type="button" className={btnPrimary} onClick={() => setEditing(true)}>{t("ed.title")}</button>
      ) : null}

      {editable && (quote.accepted_at || quote.job_id || quote.workflow_stage === "order") ? (
        <CustomerCorrection key={quote.id} quote={quote} onSaved={() => { reload(); onChanged?.(); }} />
      ) : null}

      <JobFacts quote={quote} inventoryNames={inventoryNames} />

      {!orderVersionMatches ? <p role="alert" className="text-danger">{t("qd.orderLocked")}</p> : <I18nextProvider i18n={scoped} defaultNS="common">
        <QuotePreview
          documentKind={documentKind}
          autoDownload={autoDownload}
          {...(onDownloaded ? { onDownloaded } : {})}
          {...(orderJobId ? { orderJobId } : {})}
          calc={calc}
          lang={lang}
          reference={quote.reference}
          email={quote.customer_email ?? ""}
          state={state}
          plans={plans}
          version={quote.version ?? 1}
          status={quote.status}
          {...(Number(quote.manual_adjustment ?? 0) !== 0
            ? {
                adjustment: {
                  amount: Number(quote.manual_adjustment),
                  customerNote: quote.manual_adjustment_customer_note ?? null,
                },
              }
            : {})}
        />
      </I18nextProvider>}

      <section className="rounded-md border border-line bg-surface p-4">
        <h3 className="label-mono text-soft">{t("qd.files")}</h3>
        {files.length === 0 ? (
          <p className="mt-2 text-sm text-ink-2">{t("qd.noUploads")}</p>
        ) : (
          <ul className="mt-2 space-y-1 text-sm">
            {files.map((f) => (
              <li key={f.id}>
                <button type="button" className="text-primary underline" onClick={() => void openFile(f.storage_path, f.bucket)}>
                  {f.file_name}
                </button>
                {" · "}<button type="button" className="text-primary underline" onClick={() => void openFile(f.storage_path, f.bucket, f.file_name)}>{t("common.download")}</button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {editable && !quote.accepted_at && quote.workflow_stage !== "order" ? (
        <PriceChange quote={quote} onSaved={() => { reload(); onChanged?.(); }} />
      ) : null}

      <section className="rounded-md border border-line bg-surface p-4">
        <h3 className="label-mono text-soft">{t("qd.history")}</h3>
        <ol className="mt-2 space-y-1 text-sm">
          <li className="text-ink-2">
            <span className="data-mono text-soft">{formatDateTime(quote.created_at, uiLang)}</span> · {t("qd.created", { ref: quote.reference })}
          </li>
          {history.map((h) => (
            <li key={h.id} className="text-ink-2">
              <span className="data-mono text-soft">{formatDateTime(h.created_at, uiLang)}</span> · {EVENT_LABEL[h.action] ?? h.action}
              {h.reference ? ` (${h.reference})` : ""}
              {describe(h, t)}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

/* Move facts read straight from the stored offer (the order's source of truth). */
function JobFacts({ quote, inventoryNames }: { quote: QuoteRow; inventoryNames: Map<string, string> }) {
  const { t } = useTranslation("dop");
  const lang = useActiveLang();
  const q = quote as unknown as Record<string, unknown>;
  const svc = (q["services"] ?? {}) as {
    places?: { fromCity?: string; toCity?: string; fromCanton?: string; toCanton?: string };
    access?: { liftOut?: string; liftIn?: string; hoistIn?: boolean; permitIn?: boolean; carryIn?: number; narrowStairsIn?: boolean; parkingOut?: number; parkingIn?: number };
    clean_date?: string; start_time?: string; lamp_count?: number; team_plan?: string;
    disposal?: { m3?: number | null; hours?: number | null; notes?: string } | null; extras?: string[];
    confirmed_distance_km?: number; planning_distance_km?: number;
    discount?: { rate?: number; amount?: number; reason?: string } | null;
    move?: boolean; clean?: boolean; disp?: boolean; pack?: boolean;
  };
  const p = svc.places ?? {};
  const a = svc.access ?? {};
  const yes = (v: unknown) => (v ? t("rr.yes") : t("rr.no"));
  const place = (street: unknown, zip: unknown, city?: string, canton?: string) =>
    [street, [zip, city].filter(Boolean).join(" "), canton].filter(Boolean).join(", ");
  const rawItems = (q["items"] ?? {}) as Record<string, number> | unknown[];
  const items = Array.isArray(rawItems)
    ? t("rr.positions", { n: rawItems.length })
    : Object.entries(rawItems).filter(([, n]) => Number(n) > 0).map(([k, n]) => `${n}× ${inventoryNames.get(k) ?? k}`).join(", ") || "—";
  const lift = (v: unknown) => (["none", "small", "ok", "large"].includes(String(v)) ? t(`jf.lift.${String(v)}`) : "—");
  const prop = (v: unknown) => (["flat", "house", "office"].includes(String(v)) ? t(`ed.prop.${String(v)}`) : String(v ?? "—"));
  const services = [svc.move && t("ed.move"), svc.clean && t("ed.clean"), svc.disp && t("ed.disp"), svc.pack && t("ed.pack")].filter(Boolean).join(", ");
  const cleaningOnly = Boolean(svc.clean && !svc.move && !svc.disp && !svc.pack);
  const disposalOnly = Boolean(svc.disp && !svc.move && !svc.clean && !svc.pack);
  const access = (floor: unknown, l: unknown, carry: unknown, narrow: unknown, hoist: unknown, permit: unknown, parking: unknown) =>
    t("jf.access", { floor: floor ?? "—", lift: lift(l), carry: carry ?? "—", narrow: yes(narrow), hoist: yes(hoist), permit: yes(permit), parking: parking ?? "—" });
  const reasonLabel = svc.discount?.reason === "bundle" ? t("jf.bundle") : svc.discount?.reason === "location" ? t("jf.location") : svc.discount?.reason ?? "";
  const rows: [string, string][] = cleaningOnly ? [
    [t("jf.service"), t("ed.clean")],
    [t("f.address"), place(q["from_address"], q["from_zip"], p.fromCity, p.fromCanton)],
    [t("ed.cleanDate"), formatCalendarDate(svc.clean_date ?? String(q["move_date"] ?? "—"))],
    [t("key.discount"), svc.discount?.amount ? `${Math.round((svc.discount.rate ?? 0) * 100)}% · −${formatCurrency(svc.discount.amount, lang, 2)}` : "—"],
  ] : [
    [t("ed.services"), services || "—"],
    [t("jf.out"), place(q["from_address"], q["from_zip"], p.fromCity, p.fromCanton)],
    [t("jf.accessOut"), access(q["floor_out"], a.liftOut ?? q["lift"], q["carry"], q["narrow_stairs"], q["hoist"], q["permit"], a.parkingOut ?? q["parking"])],
    // Disposal-only (like the PDF): no move-in access, cleaning date or distance.
    ...(disposalOnly ? [] : [
      [t("ed.to"), place(q["to_address"], q["to_zip"], p.toCity, p.toCanton)],
      [t("jf.accessIn"), access(q["floor_in"], a.liftIn, a.carryIn, a.narrowStairsIn, a.hoistIn, a.permitIn, a.parkingIn)],
    ] as [string, string][]),
    [t("jf.propRooms"), t("jf.propRoomsVal", { prop: prop(q["property_type"]), rooms: q["room_units"] ?? "—" })],
    [t("jf.moveDate"), [formatCalendarDate(q["move_date"] == null ? null : String(q["move_date"])), svc.start_time].filter(Boolean).join(", ")],
    ...(disposalOnly ? [] : [
      [t("key.clean_date"), formatCalendarDate(svc.clean_date)],
      [t("jf.distance"), svc.confirmed_distance_km != null ? t("jf.kmConfirmed", { km: svc.confirmed_distance_km }) : q["distance_km"] != null ? t("jf.kmUnconfirmed", { km: q["distance_km"] }) : "—"],
    ] as [string, string][]),
    [t("jf.invLamps"), t("jf.invLampsVal", { items, n: svc.lamp_count ?? 0 })],
    [t("key.discount"), svc.discount?.amount ? `${Math.round((svc.discount.rate ?? 0) * 100)}% (${reasonLabel}) · −${formatCurrency(svc.discount.amount, lang, 2)}` : "—"],
    [t("ed.disp"), svc.disposal ? `${svc.disposal.m3 ?? "—"} m³ · ${svc.disposal.hours ?? "—"} h${svc.disposal.notes ? ` · ${svc.disposal.notes}` : ""}` : "—"],
    [t("ed.extras"), (svc.extras ?? []).map((x) => t(`ed.extra.${x}`, { defaultValue: x })).join(", ") || "—"],
    [t("jf.team"), [q["crew"] != null ? t("jf.crew", { n: q["crew"] }) : "", svc.team_plan ?? ""].filter(Boolean).join(" · ") || "—"],
    [t("jf.acceptedVersion"), q["accepted_version"] != null ? `V${q["accepted_version"]}${q["accepted_at"] ? ` · ${formatDateTime(String(q["accepted_at"]), lang)}` : ""}` : "—"],
  ];
  return (
    <section className="rounded-md border border-line bg-surface p-4">
      <p className="label-mono text-primary">{t("jf.title")}</p>
      <dl className="mt-2 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-[10rem_1fr]">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-soft">{k}</dt>
            <dd className="text-ink">{v || "—"}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function describe(h: WorkflowEvent, t: TFunction): string {
  const d = (h.detail ?? {}) as Record<string, unknown>;
  const parts: string[] = [];
  if (d['new_km'] != null) parts.push(t("hist.distance", { old: d['old_km'] != null ? `${Number(d['old_km'])} km` : "—", km: Number(d['new_km']), src: d['source'] === "routing" ? t("hist.routing") : t("hist.manual") }) + (d['planning_km'] != null ? t("hist.plzEstimate", { km: Number(d['planning_km']) }) : ""));
  if (d['new_km'] != null && d['old_total'] != null && d['new_total'] != null) parts.push(`CHF ${Number(d['old_total']).toFixed(2)} → CHF ${Number(d['new_total']).toFixed(2)}`);
  if (d['delta'] != null) parts.push(t("hist.adjustment", { sign: Number(d['delta']) < 0 ? "-" : "+", amount: Math.abs(Number(d['delta'])).toFixed(2) }));
  if (d['by']) parts.push(t("hist.by", { who: d['by'] }));
  if (d['override']) parts.push(t("hist.override"));
  if (d['old'] != null && d['new'] != null) parts.push(`CHF ${Number(d['old']).toFixed(2)} → CHF ${Number(d['new']).toFixed(2)}`);
  if (d['version'] != null) parts.push(t("hist.version", { v: d['version'] }));
  if (d['recipient']) parts.push(t("hist.to", { who: d['recipient'] }));
  if (d['status']) parts.push(d['status'] === "sent" ? t("hist.delivered") : d['status'] === "pending" || d['status'] === "queued" ? t("hist.pending") : t("hist.failed"));
  if (d['job']) parts.push(t("hist.job", { job: d['job'] }));
  if (d['reason']) parts.push(t("hist.reason", { reason: d['reason'] }));
  return parts.length ? ` — ${parts.join(" · ")}` : "";
}

function PriceChange({ quote, onSaved }: { quote: QuoteRow; onSaved: () => void }) {
  const { t } = useTranslation("dop");
  const lang = useActiveLang();
  const current = Number(quote.manual_adjustment ?? 0);
  const calculated = Number(quote.calculated_total ?? Number(quote.price_total ?? 0) - current);
  const [delta, setDelta] = useState("");
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const d = Number(delta);
  return (
    <section className="rounded-md border border-line bg-surface p-4">
      <h3 className="label-mono text-soft">{t("pc.title")}</h3>
      <p className="mt-1 text-sm text-ink-2">
        {t("pc.calculated", { total: formatCurrency(calculated, lang, 2) })}
        {current !== 0 ? ` · ${t("pc.current", { sign: current < 0 ? "-" : "+", amount: formatCurrency(Math.abs(current), lang, 2) })}` : ""}.{" "}
        {t("pc.help")}
      </p>
      {current !== 0 ? (
        <p className="mt-1 text-sm text-ink-2">
          {t("pc.internal")} {quote.manual_adjustment_reason ?? "–"}
          {quote.manual_adjustment_by ? ` · ${quote.manual_adjustment_by}` : ""}
          {quote.manual_adjustment_at ? ` · ${new Date(quote.manual_adjustment_at).toLocaleString(LOCALES[lang], { timeZone: "Europe/Zurich" })}` : ""}
          {` · ${t("hist.version", { v: quote.version ?? 1 })}`}
          {quote.manual_adjustment_customer_note ? ` · ${t("pc.custNote", { note: quote.manual_adjustment_customer_note })}` : ` · ${t("pc.noCustNote")}`}
        </p>
      ) : null}
      <div className="mt-3 grid gap-3 sm:grid-cols-[10rem_1fr_auto] sm:items-end">
        <label className="text-sm">
          {t("pc.amount")}
          <input className={field} type="number" step="0.05" value={delta} onChange={(e) => setDelta(e.target.value)} />
        </label>
        <label className="text-sm">
          {t("pc.reason")}
          <input className={field} value={reason} onChange={(e) => setReason(e.target.value)} />
        </label>
        <label className="text-sm sm:col-span-2 sm:row-start-2">
          {t("pc.note")}
          <input className={field} value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
        <button
          type="button"
          className={btnPrimary}
          disabled={busy || delta.trim() === "" || !Number.isFinite(d) || !reason.trim()}
          onClick={async () => {
            setBusy(true);
            setMsg(null);
            try {
              const v = await adjustPrice(quote.id, d, reason, note);
              setMsg(t("pc.saved", { v, total: formatCurrency(calculated + d, lang, 2) }));
              setDelta("");
              setReason("");
              setNote("");
              onSaved();
            } catch (e) {
              setMsg(t("corr.notSaved", { msg: (e as Error).message }));
            } finally {
              setBusy(false);
            }
          }}
        >
          {t("common.save")}
        </button>
      </div>
      {msg ? <p role="status" className="mt-2 text-sm text-ink-2">{msg}</p> : null}
    </section>
  );
}
