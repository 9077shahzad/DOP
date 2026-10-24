import { field, btn, btnPrimary } from "@/components/system";
/**
 * Lead drawer — work the queue without leaving the inbox.
 * Escape closes it and focus returns to the card that opened it.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { formatCurrency, formatDate } from "@/i18n/format";
import { AllocationPanel } from "@/components/admin/AllocationPanel";
import { rowLabel } from "@/lib/i18n-label";
import { categoryLabel, useActiveLang } from "@/lib/admin-i18n";

import {
  ALL_STATUSES,
  CUSTOMER_TYPES,
  PRIORITIES,
  PRIORITY_TONE,
  TEMPERATURES,
  TEMPERATURE_TONE,
  acquireLock,
  addLeadNote,
  ageInDays,
  assignLead,
  fetchLeadDetail,
  isOverdue,
  markLost,
  mergeLeads,
  releaseLock,
  saveQualification,
  setLeadStatus,
  setNextAction,
  signedAttachmentUrl,
  uploadAttachment,
  type LeadCustomerType,
  type LeadDetail,
  type LeadOptions,
  type LeadPriority,
  type LeadStatus,
  type LeadTemperature,
} from "@/lib/leads-admin";


export function LeadDrawer({
  leadId,
  options,
  onClose,
  onChanged,
}: {
  leadId: string;
  options: LeadOptions;
  onClose: () => void;
  onChanged: () => void;
}) {
  const { t } = useTranslation("admin");
  const lang = useActiveLang();
  const panelRef = useRef<HTMLDivElement>(null);
  const [detail, setDetail] = useState<LeadDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await fetchLeadDetail(leadId);
      setDetail(data);
      if (!data) setError(t("leads.drawer.notFound"));
    } catch {
      setError(t("leads.loadError"));
    }
  }, [leadId, t]);

  useEffect(() => {
    setDetail(null);
    setError(null);
    void load();
  }, [load]);

  // Advisory lock, taken on open and released on close.
  useEffect(() => {
    void acquireLock(leadId).catch(() => undefined);
    return () => {
      void releaseLock(leadId).catch(() => undefined);
    };
  }, [leadId]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    panelRef.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      await load();
      onChanged();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : t("leads.drawer.actionError"));
    } finally {
      setBusy(false);
    }
  }

  const lead = detail?.lead;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label={t("common.cancel")}
        onClick={onClose}
        className="flex-1 bg-ink/40"
        tabIndex={-1}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={t("leads.drawer.title")}
        tabIndex={-1}
        className="h-full w-full max-w-2xl overflow-y-auto border-s border-line bg-surface p-5 outline-none md:p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="label-mono text-primary">{t("leads.drawer.title")}</p>
            <h2 className="data-mono mt-1 text-2xl">{lead?.reference ?? "…"}</h2>
          </div>
          <button type="button" onClick={onClose} className={btn}>
            {t("leads.drawer.close")}
          </button>
        </div>

        {error ? (
          <p role="alert" className="mt-4 border-l-4 border-destructive bg-canvas px-4 py-3 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        {!lead ? (
          <p className="label-mono mt-8 text-soft">{t("common.loading")}</p>
        ) : (
          <div className="mt-5 space-y-6">
            {/* header chips */}
            <div className="flex flex-wrap items-center gap-2">
              <Chip>{t(`leadStatus.${lead.status}`)}</Chip>
              <Chip className={PRIORITY_TONE[lead.priority]}>{t(`priority.${lead.priority}`)}</Chip>
              <Chip className={TEMPERATURE_TONE[lead.temperature]}>{t(`temperature.${lead.temperature}`)}</Chip>
              <Chip>
                {lead.estimated_value != null ? formatCurrency(Number(lead.estimated_value), lang) : "—"}
              </Chip>
              <Chip>{t("leads.card.age", { count: ageInDays(lead.created_at) })}</Chip>
              {isOverdue(lead) ? <Chip className="border-destructive text-destructive">{t("leads.card.overdue")}</Chip> : null}
            </div>

            {detail?.lockHolder ? (
              <p className="border border-primary bg-canvas px-4 py-3 text-sm text-ink-2">
                {t("leads.drawer.lockedBy", {
                  name: detail.lockHolder,
                  since: lead.locked_at ? formatDate(lead.locked_at, lang, { dateStyle: "short", timeStyle: "short" }) : "",
                })}{" "}
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void run(() => acquireLock(lead.id))}
                  className="underline underline-offset-2"
                >
                  {t("leads.drawer.takeOver")}
                </button>
              </p>
            ) : null}

            {detail && detail.duplicates.length > 0 ? (
              <section className="border border-destructive bg-canvas p-4">
                <p className="label-mono text-destructive">{t("leads.drawer.duplicateTitle")}</p>
                <ul className="mt-2 space-y-2 text-sm">
                  {detail.duplicates.map((dup) => (
                    <li key={dup.id} className="flex flex-wrap items-center gap-3">
                      <span className="data-mono">{dup.reference}</span>
                      <span className="text-ink-2">
                        {dup.customer_name} · {formatDate(dup.created_at, lang, { dateStyle: "short" })}
                      </span>
                      <button
                        type="button"
                        disabled={busy}
                        className={btn}
                        onClick={() =>
                          void run(() => mergeLeads(dup.id, lead.id, t("leads.drawer.mergeNote", { reference: dup.reference })))
                        }
                      >
                        {t("leads.drawer.merge")}
                      </button>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-soft">{t("leads.drawer.mergeHint")}</p>
              </section>
            ) : null}

            <Section title={t("leads.drawer.customer")}>
              <dl className="grid gap-3 sm:grid-cols-2">
                <Row label={t("leads.field.name")} value={lead.customer_name} />
                <Row label={t("leads.field.phone")} value={lead.customer_phone} />
                <Row label={t("leads.field.email")} value={lead.customer_email} />
                <Row label={t("leads.field.customerType")} value={t(`customerType.${lead.customer_type}`)} />
                <Row label={t("leads.field.address")} value={lead.service_address} />
                <Row label={t("leads.field.place")} value={`${lead.postcode} ${lead.city} ${lead.canton}`.trim()} />
                <Row
                  label={t("leads.field.category")}
                  value={categoryLabel(
                    options.categories.find((c) => c.id === lead.category_id),
                    lang,
                    "—",
                  )}
                />
                <Row
                  label={t("leads.field.preferredDate")}
                  value={lead.preferred_date ? formatDate(lead.preferred_date, lang) : "—"}
                />
                <Row label={t("leads.field.preferredTime")} value={lead.preferred_time || "—"} />
                <Row label={t("leads.field.urgency")} value={lead.urgency || "—"} />
                <Row label={t("leads.field.source")} value={lead.source?.key ? t(`leadSource.${lead.source.key}`, lead.source.key) : "—"} />
                <Row label={t("leads.field.language")} value={lead.language.toUpperCase()} />
              </dl>
              {lead.description ? (
                <p className="mt-3 whitespace-pre-wrap text-sm text-ink-2">{lead.description}</p>
              ) : null}
              <ServiceDetails details={lead.service_details} />
            </Section>

            <Qualify lead={lead} options={options} busy={busy} onSave={(patch) => void run(() => saveQualification(lead.id, patch))} />

            <StatusActions
              status={lead.status}
              busy={busy}
              lossReasons={options.lossReasons}
              onStatus={(next, note) => void run(() => setLeadStatus(lead.id, next, note))}
              onLost={(reasonId, note) => void run(() => markLost(lead.id, reasonId, note))}
            />

            <AllocationPanel leadId={lead.id} busy={busy} onChanged={() => void load().then(onChanged)} />

            <AssignPanel
              options={options}
              busy={busy}
              current={{ partner: lead.assigned_partner_id, team: lead.assigned_team_id }}
              onAssign={(fulfilment, partnerId, teamId, note) =>
                void run(() => assignLead(lead.id, fulfilment, partnerId, teamId, note))
              }
            />


            <NextAction
              busy={busy}
              current={lead.next_action_at}
              onSave={(due, channel, template) => void run(() => setNextAction(lead.id, due, channel, template))}
            />

            <Attachments
              rows={detail?.attachments ?? []}
              busy={busy}
              onUpload={(file) => void run(() => uploadAttachment(lead.id, file))}
            />

            <Notes rows={detail?.notes ?? []} busy={busy} onAdd={(body) => void run(() => addLeadNote(lead.id, body))} />

            <Section title={t("leads.drawer.timeline")}>
              {(detail?.activities ?? []).length === 0 ? (
                <p className="text-sm text-soft">{t("leads.drawer.timelineEmpty")}</p>
              ) : (
                <ol className="space-y-3">
                  {(detail?.activities ?? []).map((activity) => (
                    <li key={activity.id} className="border-s-2 border-line ps-3">
                      <p className="label-mono text-soft">
                        {formatDate(activity.created_at, lang, { dateStyle: "short", timeStyle: "short" })} ·{" "}
                        {t(`activityKind.${activity.kind}`)} · {t(`actorKind.${activity.actor_kind}`)}
                      </p>
                      {activity.body ? <p className="mt-1 text-sm text-ink">{activity.body}</p> : null}
                    </li>
                  ))}
                </ol>
              )}
            </Section>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ pieces */

function Chip({ children, className = "border-line text-ink-2" }: { children: React.ReactNode; className?: string }) {
  return <span className={`label-mono border px-2 py-1 ${className}`}>{children}</span>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border border-line bg-canvas p-4">
      <h3 className="label-mono text-primary">{title}</h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="label-mono text-soft">{label}</dt>
      <dd className="text-sm text-ink">{value || "—"}</dd>
    </div>
  );
}

function ServiceDetails({ details }: { details: unknown }) {
  const { t } = useTranslation("admin");
  const entries = details && typeof details === "object" ? Object.entries(details as Record<string, unknown>) : [];
  if (entries.length === 0) return null;
  return (
    <div className="mt-4">
      <p className="label-mono text-soft">{t("leads.drawer.serviceDetails")}</p>
      <dl className="mt-2 grid gap-2 sm:grid-cols-2">
        {entries.map(([key, value]) => (
          <div key={key} className="flex justify-between gap-3 border-b border-line py-1 text-sm">
            <dt className="text-soft">{key}</dt>
            <dd className="text-ink">
              {typeof value === "object" && value !== null ? JSON.stringify(value) : String(value)}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function Qualify({
  lead,
  options,
  busy,
  onSave,
}: {
  lead: LeadDetail["lead"];
  options: LeadOptions;
  busy: boolean;
  onSave: (patch: Record<string, unknown>) => void;
}) {
  const { t } = useTranslation("admin");
  const lang = useActiveLang();
  const [temperature, setTemperature] = useState<LeadTemperature>(lead.temperature);
  const [priority, setPriority] = useState<LeadPriority>(lead.priority);
  const [customerType, setCustomerType] = useState<LeadCustomerType>(lead.customer_type);
  const [categoryId, setCategoryId] = useState(lead.category_id ?? "");
  const [value, setValue] = useState(lead.estimated_value == null ? "" : String(lead.estimated_value));

  return (
    <Section title={t("leads.drawer.qualification")}>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          <span className="label-mono text-soft">{t("leads.field.temperature")}</span>
          <select value={temperature} onChange={(e) => setTemperature(e.target.value as LeadTemperature)} className={field}>
            {TEMPERATURES.map((x) => (
              <option key={x} value={x}>
                {t(`temperature.${x}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="label-mono text-soft">{t("leads.field.priority")}</span>
          <select value={priority} onChange={(e) => setPriority(e.target.value as LeadPriority)} className={field}>
            {PRIORITIES.map((x) => (
              <option key={x} value={x}>
                {t(`priority.${x}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="label-mono text-soft">{t("leads.field.customerType")}</span>
          <select value={customerType} onChange={(e) => setCustomerType(e.target.value as LeadCustomerType)} className={field}>
            {CUSTOMER_TYPES.map((x) => (
              <option key={x} value={x}>
                {t(`customerType.${x}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="label-mono text-soft">{t("leads.field.category")}</span>
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={field}>
            <option value="">—</option>
            {options.categories.map((c) => (
              <option key={c.id} value={c.id}>
                {categoryLabel(c, lang, c.key)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="label-mono text-soft">{t("leads.field.estimatedValue")}</span>
          <input inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} className={`${field} data-mono`} />
        </label>
      </div>
      <button
        type="button"
        disabled={busy}
        className={`${btnPrimary} mt-3`}
        onClick={() =>
          onSave({
            temperature,
            priority,
            customer_type: customerType,
            category_id: categoryId || null,
            estimated_value: value.trim() === "" ? null : Number(value),
          })
        }
      >
        {busy ? t("common.saving") : t("leads.drawer.saveQualification")}
      </button>
    </Section>
  );
}

function StatusActions({
  status,
  busy,
  lossReasons,
  onStatus,
  onLost,
}: {
  status: LeadStatus;
  busy: boolean;
  lossReasons: LeadOptions["lossReasons"];
  onStatus: (next: LeadStatus, note: string) => void;
  onLost: (reasonId: string, note: string) => void;
}) {
  const { t } = useTranslation("admin");
  const lang = useActiveLang();
  const [next, setNext] = useState<LeadStatus>(status);
  const [note, setNote] = useState("");
  const [reason, setReason] = useState("");

  const label = (row: LeadOptions["lossReasons"][number]) =>
    rowLabel(row, lang, row.label_de);

  return (
    <Section title={t("leads.drawer.statusChange")}>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          <span className="label-mono text-soft">{t("leads.field.status")}</span>
          <select value={next} onChange={(e) => setNext(e.target.value as LeadStatus)} className={field}>
            {ALL_STATUSES.map((s) => (
              <option key={s} value={s}>
                {t(`leadStatus.${s}`)}
              </option>
            ))}
          </select>
        </label>
        {next === "lost" ? (
          <label className="text-sm">
            <span className="label-mono text-soft">{t("leads.field.lossReason")}</span>
            <select value={reason} onChange={(e) => setReason(e.target.value)} className={field}>
              <option value="">—</option>
              {lossReasons.map((r) => (
                <option key={r.id} value={r.id}>
                  {label(r)}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <label className="text-sm sm:col-span-2">
          <span className="label-mono text-soft">{t("leads.field.note")}</span>
          <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} className={field} />
        </label>
      </div>
      <button
        type="button"
        disabled={busy || (next === "lost" && !reason)}
        className={`${btnPrimary} mt-3`}
        onClick={() => (next === "lost" ? onLost(reason, note) : onStatus(next, note))}
      >
        {t("leads.drawer.applyStatus")}
      </button>
    </Section>
  );
}

function AssignPanel({
  options,
  busy,
  current,
  onAssign,
}: {
  options: LeadOptions;
  busy: boolean;
  current: { partner: string | null; team: string | null };
  onAssign: (
    fulfilment: "internal" | "partner" | "rfq" | "mixed",
    partnerId: string | null,
    teamId: string | null,
    note: string,
  ) => void;
}) {
  const { t } = useTranslation("admin");
  const [partnerId, setPartnerId] = useState(current.partner ?? "");
  const [teamId, setTeamId] = useState(current.team ?? "");
  const [note, setNote] = useState("");

  return (
    <Section title={t("leads.drawer.assignment")}>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          <span className="label-mono text-soft">{t("leads.field.partner")}</span>
          <select
            value={partnerId}
            onChange={(e) => {
              setPartnerId(e.target.value);
              if (e.target.value) setTeamId("");
            }}
            className={field}
          >
            <option value="">—</option>
            {options.partners.map((p) => (
              <option key={p.id} value={p.id}>
                {p.legal_name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="label-mono text-soft">{t("leads.field.team")}</span>
          <select
            value={teamId}
            onChange={(e) => {
              setTeamId(e.target.value);
              if (e.target.value) setPartnerId("");
            }}
            className={field}
          >
            <option value="">—</option>
            {options.teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm sm:col-span-2">
          <span className="label-mono text-soft">{t("leads.field.note")}</span>
          <input value={note} onChange={(e) => setNote(e.target.value)} className={field} />
        </label>
      </div>
      <button
        type="button"
        disabled={busy || (!partnerId && !teamId)}
        className={`${btnPrimary} mt-3`}
        onClick={() => onAssign(partnerId ? "partner" : "internal", partnerId || null, teamId || null, note)}
      >
        {t("leads.drawer.assign")}
      </button>
      <p className="mt-2 text-xs text-soft">{t("leads.drawer.assignHint")}</p>
    </Section>
  );
}

function NextAction({
  busy,
  current,
  onSave,
}: {
  busy: boolean;
  current: string | null;
  onSave: (dueAt: string, channel: string, templateKey: string) => void;
}) {
  const { t } = useTranslation("admin");
  const lang = useActiveLang();
  const [due, setDue] = useState("");
  const [channel, setChannel] = useState("phone");

  return (
    <Section title={t("leads.drawer.nextAction")}>
      {current ? (
        <p className="label-mono text-soft">
          {t("leads.drawer.nextActionCurrent", {
            date: formatDate(current, lang, { dateStyle: "short", timeStyle: "short" }),
          })}
        </p>
      ) : null}
      <div className="mt-2 grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          <span className="label-mono text-soft">{t("leads.field.dueAt")}</span>
          <input type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)} className={`${field} data-mono`} />
        </label>
        <label className="text-sm">
          <span className="label-mono text-soft">{t("leads.field.channel")}</span>
          <select value={channel} onChange={(e) => setChannel(e.target.value)} className={field}>
            {["phone", "email", "whatsapp", "sms"].map((c) => (
              <option key={c} value={c}>
                {t(`leads.channel.${c}`)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <button
        type="button"
        disabled={busy || !due}
        className={`${btnPrimary} mt-3`}
        onClick={() => onSave(due, channel, "followup")}
      >
        {t("leads.drawer.saveNextAction")}
      </button>
    </Section>
  );
}

function Attachments({
  rows,
  busy,
  onUpload,
}: {
  rows: LeadDetail["attachments"];
  busy: boolean;
  onUpload: (file: File) => void;
}) {
  const { t } = useTranslation("admin");
  const lang = useActiveLang();
  const [error, setError] = useState<string | null>(null);

  async function open(path: string) {
    try {
      const url = await signedAttachmentUrl(path);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      setError(t("leads.drawer.signedUrlError"));
    }
  }

  return (
    <Section title={t("leads.drawer.attachments")}>
      {rows.length === 0 ? <p className="text-sm text-soft">{t("leads.drawer.attachmentsEmpty")}</p> : null}
      <ul className="space-y-2">
        {rows.map((row) => (
          <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-line py-2 text-sm">
            <span className="text-ink">{row.file_name}</span>
            <span className="label-mono text-soft">{formatDate(row.created_at, lang, { dateStyle: "short" })}</span>
            <button type="button" className={btn} onClick={() => void open(row.storage_path)}>
              {t("leads.drawer.openFile")}
            </button>
          </li>
        ))}
      </ul>
      <label className="mt-3 block text-sm">
        <span className="label-mono text-soft">{t("leads.drawer.upload")}</span>
        <input
          type="file"
          disabled={busy}
          className="mt-1 block w-full text-sm"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onUpload(file);
            e.target.value = "";
          }}
        />
      </label>
      <p className="mt-1 text-xs text-soft">{t("leads.drawer.uploadHint")}</p>
      {error ? (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </Section>
  );
}

function Notes({
  rows,
  busy,
  onAdd,
}: {
  rows: LeadDetail["notes"];
  busy: boolean;
  onAdd: (body: string) => void;
}) {
  const { t } = useTranslation("admin");
  const lang = useActiveLang();
  const [body, setBody] = useState("");

  return (
    <Section title={t("leads.drawer.notes")}>
      <p className="label-mono text-soft">{t("leads.drawer.notesInternal")}</p>
      {rows.length === 0 ? <p className="mt-2 text-sm text-soft">{t("leads.drawer.notesEmpty")}</p> : null}
      <ul className="mt-2 space-y-2">
        {rows.map((note) => (
          <li key={note.id} className="border border-line bg-surface p-3 text-sm">
            <p className="label-mono text-soft">{formatDate(note.created_at, lang, { dateStyle: "short", timeStyle: "short" })}</p>
            <p className="mt-1 whitespace-pre-wrap text-ink">{note.body}</p>
          </li>
        ))}
      </ul>
      <textarea rows={2} value={body} onChange={(e) => setBody(e.target.value)} className={`${field} mt-3`} />
      <button
        type="button"
        disabled={busy || !body.trim()}
        className={`${btn} mt-2`}
        onClick={() => {
          onAdd(body.trim());
          setBody("");
        }}
      >
        {t("leads.drawer.addNote")}
      </button>
    </Section>
  );
}
