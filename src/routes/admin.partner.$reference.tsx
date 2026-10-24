import { Link, createFileRoute, useParams } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { formatDate } from "@/i18n/format";
import i18n from "@/i18n/config";
import { langOf, privateHead } from "@/lib/seo";
import { supabase } from "@/integrations/supabase/client";
import { categoryLabel, useActiveLang } from "@/lib/admin-i18n";
import {
  EDITABLE_STATUSES,
  NOTIFIED_STATUSES,
  PARTNER_STATUS_TONE,
  PARTNER_TRANSITIONS,
  RATING_CRITERIA,
  RATING_MAX,
  RATING_TOTAL_MAX,
  classificationFor,
  expiryLabelKey,
  expiryState,
  type PartnerAction,
  type PartnerStatus,
} from "@/lib/partner-admin";
import {
  SIGNED_URL_TTL_SECONDS,
  addNote,
  assignAccountManager,
  changePartnerStatus,
  fetchPartnerDetail,
  reviewDocument,
  saveAssessment,
  setServiceApproval,
  signedDocumentUrl,
  type PartnerDetail,
} from "@/lib/partner-admin-data";
import { notifyPartnerStatus } from "@/lib/partner-notify.functions";

export const Route = createFileRoute("/admin/partner/$reference")({
  ssr: false,
  head: () => privateHead(langOf(i18n.language), "admin"),
  component: PartnerReview,
});

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border border-line bg-surface p-5">
      <h2 className="label-mono text-primary">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[10rem_1fr] gap-3 border-b border-line py-2 last:border-b-0">
      <span className="label-mono text-soft">{label}</span>
      <span className="text-sm text-ink">{value ?? "—"}</span>
    </div>
  );
}

function PartnerReview() {
  const { t } = useTranslation("admin");
  const lang = useActiveLang();
  const { reference } = useParams({ from: "/admin/partner/$reference" });
  const [detail, setDetail] = useState<PartnerDetail | null | "missing">(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const data = await fetchPartnerDetail(reference);
      setDetail(data ?? "missing");
    } catch {
      setError(t("review.loadError"));
    }
  }, [reference, t]);

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
    void reload();
  }, [reload]);

  if (detail === null) return <p className="label-mono text-soft">{t("common.loading")}</p>;
  if (detail === "missing")
    return (
      <section className="border border-line bg-surface p-6">
        <h1 className="text-2xl">{t("review.notFoundTitle")}</h1>
        <p className="mt-2 text-sm text-ink-2">{t("review.notFoundBody", { reference })}</p>
        <Link to="/admin/partner" className="label-mono mt-4 inline-block border border-ink px-3 py-2">
          {t("review.back")}
        </Link>
      </section>
    );

  const p = detail.partner;
  const status = p.status as PartnerStatus;
  const editable = EDITABLE_STATUSES.includes(status);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link to="/admin/partner" className="label-mono text-primary underline underline-offset-2">
            ← {t("review.backShort")}
          </Link>
          <h1 className="mt-2 text-3xl md:text-4xl">{p.legal_name}</h1>
          <p className="data-mono mt-1 text-soft">
            {p.reference} · {t(`entityType.${p.entity_type}`)} · {p.city}, {p.country}
          </p>
        </div>
        <div className="text-end">
          <span className={`label-mono border px-2 py-1 ${PARTNER_STATUS_TONE[status]}`}>
            {t(`status.${status}`)}
          </span>
          <p className="label-mono mt-2 text-soft">
            {editable ? t("review.editable") : t("review.locked")}
          </p>
        </div>
      </div>

      {error ? (
        <p role="alert" className="border-l-4 border-destructive bg-surface px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {message ? (
        <p role="status" className="border-l-4 border-primary bg-surface px-4 py-3 text-sm text-ink-2">
          {message}
        </p>
      ) : null}

      <StatusActions
        status={status}
        partnerId={p.id}
        language={detail.contacts[0]?.preferred_language ?? "de"}
        email={detail.contacts[0]?.email ?? null}
        reference={p.reference}
        onDone={(note) => {
          setMessage(note);
          void reload();
        }}
        onError={setError}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title={t("review.company.title")}>
          <Row label={t("review.company.legalName")} value={p.legal_name} />
          <Row label={t("review.company.tradingName")} value={p.trading_name || "—"} />
          <Row label={t("review.company.address")} value={p.address} />
          <Row label={t("review.company.founded")} value={p.year_established ?? "—"} />
          <Row label={t("review.company.register")} value={p.registration_number || "—"} />
          <Row label={t("review.company.vat")} value={p.vat_number || "—"} />
          <Row label={t("review.company.website")} value={p.website || "—"} />
          <Row label={t("review.company.areas")} value={(p.areas_served ?? []).join(", ") || "—"} />
        </Card>

        <Card title={t("review.contacts.title")}>
          {detail.contacts.length === 0 ? (
            <p className="text-sm text-ink-2">{t("review.contacts.empty")}</p>
          ) : (
            detail.contacts.map((c) => (
              <div key={c.id} className="border-b border-line py-2 last:border-b-0">
                <p className="text-sm text-ink">
                  {c.full_name} · <span className="text-ink-2">{c.position}</span>
                  {c.is_primary ? <span className="label-mono ml-2 text-primary">{t("review.contacts.primary")}</span> : null}
                </p>
                <p className="data-mono text-soft">
                  {c.mobile || "—"} · {c.email || "—"} · {c.preferred_language.toUpperCase()}
                </p>
              </div>
            ))
          )}
        </Card>

        <Card title={t("review.services.title")}>
          {detail.services.length === 0 ? (
            <p className="text-sm text-ink-2">{t("review.services.empty")}</p>
          ) : (
            detail.services.map((s) => {
              const cat = detail.categories.find((c) => c.id === s.category_id);
              return (
                <div key={s.id} className="border-b border-line py-3 last:border-b-0">
                  <p className="text-sm text-ink">{categoryLabel(cat, lang, s.category_id)}</p>
                  <p className="data-mono text-soft">
                    {t(`pricing.${s.pricing_method}`)} ·{" "}
                    {s.hourly_rate ?? s.daily_rate ?? s.callout_charge ?? "—"} · {t("review.services.cities")}:{" "}
                    {(s.coverage_cities ?? []).join(", ") || "—"}
                  </p>
                  <label className="mt-2 flex items-center gap-2 text-sm text-ink-2">
                    <input
                      type="checkbox"
                      checked={s.approved}
                      onChange={async (e) => {
                        try {
                          await setServiceApproval(
                            s.id,
                            e.target.checked,
                            e.target.checked ? (s.coverage_cities ?? []) : [],
                          );
                          await reload();
                        } catch {
                          setError(t("review.services.approveError"));
                        }
                      }}
                    />
                    {t("review.services.approve")}
                    {s.approved && s.approved_cities.length > 0 ? (
                      <span className="label-mono text-success">{s.approved_cities.join(", ")}</span>
                    ) : null}
                  </label>
                </div>
              );
            })
          )}
        </Card>

        <Card title={t("review.capacity.title")}>
          {detail.workforce.map((w) => (
            <Row
              key={w.id}
              label={w.category}
              value={`${t("review.capacity.people", { count: w.worker_count })} · ${t(
                `skill.${w.skill_level}`,
              )} · ${t("review.capacity.mobilisation", { days: w.mobilisation_days ?? "—" })}`}
            />
          ))}
          {detail.fleet.map((f) => (
            <Row
              key={f.id}
              label={f.vehicle_type}
              value={`${f.vehicle_count} × ${f.capacity ?? "—"} · ${t(`ownership.${f.ownership}`)} · ${f.coverage_area}`}
            />
          ))}
          {detail.workforce.length === 0 && detail.fleet.length === 0 ? (
            <p className="text-sm text-ink-2">{t("review.capacity.empty")}</p>
          ) : null}
        </Card>
      </div>

      <Documents detail={detail} onDone={reload} onError={setError} />

      <div className="grid gap-6 lg:grid-cols-2">
        <Assessment detail={detail} onDone={reload} onError={setError} />
        <div className="space-y-6">
          <AccountManager detail={detail} onDone={reload} onError={setError} />
          <Notes detail={detail} userId={userId} onDone={reload} onError={setError} />
        </div>
      </div>

      <Card title={t("review.history.title")}>
        {detail.history.length === 0 ? (
          <p className="text-sm text-ink-2">{t("review.history.empty")}</p>
        ) : (
          <ol className="space-y-3">
            {detail.history.map((h) => (
              <li key={h.id} className="border-s-2 border-primary ps-3">
                <p className="data-mono text-soft">{formatDate(h.created_at, lang)}</p>
                <p className="text-sm text-ink">
                  {h.from_status ? t(`status.${h.from_status as PartnerStatus}`) : "—"} →{" "}
                  {t(`status.${h.to_status as PartnerStatus}`)}
                </p>
                {h.note ? <p className="text-sm text-ink-2">{h.note}</p> : null}
              </li>
            ))}
          </ol>
        )}
      </Card>
    </div>
  );
}

function StatusActions({
  status,
  partnerId,
  reference,
  language,
  email,
  onDone,
  onError,
}: {
  status: PartnerStatus;
  partnerId: string;
  reference: string;
  language: string;
  email: string | null;
  onDone: (message: string) => void;
  onError: (message: string) => void;
}) {
  const { t } = useTranslation("admin");
  const [open, setOpen] = useState<PartnerAction | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const actions = PARTNER_TRANSITIONS[status];

  async function run(action: PartnerAction) {
    if (action.noteRequired && !note.trim()) {
      onError(t("review.noteRequired"));
      return;
    }
    setBusy(true);
    try {
      await changePartnerStatus(partnerId, action.to, note.trim());
      // The status change is already committed; a notification problem must
      // never roll the screen back or claim the transition failed.
      let suffix = "";
      if (NOTIFIED_STATUSES.includes(action.to)) {
        try {
          const result = await notifyPartnerStatus({
            data: { reference, status: action.to, language, email, note: note.trim() },
          });
          suffix = result.sent
            ? ` ${t("review.notifySent")}`
            : ` ${t("review.notifyFailed", { reason: result.reason })}`;
        } catch {
          suffix = ` ${t("review.notifyFailed", { reason: t("review.notifyServerError") })}`;
        }
      }
      onDone(`${t("review.statusSet", { status: t(`status.${action.to}`) })}${suffix}`);
      setOpen(null);
      setNote("");
    } catch {
      onError(t("review.statusFailed"));
    } finally {
      setBusy(false);
    }
  }

  if (actions.length === 0) return null;

  return (
    <section className="border border-line bg-surface p-5">
      <h2 className="label-mono text-primary">{t("review.decision")}</h2>
      <div className="mt-3 flex flex-wrap gap-2">
        {actions.map((a) => (
          <button
            key={a.to + a.labelKey}
            type="button"
            onClick={() => {
              setOpen(a);
              setNote("");
            }}
            className={`label-mono border px-3 py-2 ${
              a.destructive ? "border-destructive text-destructive" : "border-ink text-ink"
            }`}
          >
            {t(`action.${a.labelKey}`)}
          </button>
        ))}
      </div>
      {open ? (
        <div className="mt-4 border border-line bg-canvas p-4">
          <label className="block text-sm">
            <span className="label-mono text-soft">{t(`actionNote.${open.noteKey}`)}</span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              className="mt-1 w-full border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </label>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void run(open)}
              className="bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              {busy ? t("common.saving") : t(`action.${open.labelKey}`)}
            </button>
            <button type="button" onClick={() => setOpen(null)} className="label-mono border border-line px-3 py-2">
              {t("common.cancel")}
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function Documents({
  detail,
  onDone,
  onError,
}: {
  detail: PartnerDetail;
  onDone: () => Promise<void>;
  onError: (m: string) => void;
}) {
  const { t } = useTranslation("admin");
  const [links, setLinks] = useState<Record<string, string>>({});

  return (
    <Card title={t("review.documents.title", { seconds: SIGNED_URL_TTL_SECONDS })}>
      {detail.documents.length === 0 ? (
        <p className="text-sm text-ink-2">{t("review.documents.empty")}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[48rem] text-start text-sm">
            <thead>
              <tr className="border-b border-line">
                {(["type", "file", "status", "expiry", "actions"] as const).map((h) => (
                  <th key={h} scope="col" className="label-mono px-3 py-2 text-start text-soft">
                    {t(`review.documents.col.${h}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {detail.documents.map((d) => {
                const exp = expiryState(d.expires_on);
                return (
                  <tr key={d.id} className="border-b border-line align-top last:border-b-0">
                    <td className="px-3 py-3 text-ink">{t(`docType.${d.doc_type}`)}</td>
                    <td className="px-3 py-3">
                      <span className="data-mono text-ink-2">{d.file_name}</span>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const url = await signedDocumentUrl(d.storage_path);
                            setLinks((prev) => ({ ...prev, [d.id]: url }));
                            window.open(url, "_blank", "noopener");
                          } catch {
                            onError(t("review.documents.linkError"));
                          }
                        }}
                        className="label-mono ms-2 border border-line px-2 py-1"
                      >
                        {t("review.documents.open")}
                      </button>
                      {links[d.id] ? (
                        <span className="label-mono block text-soft">{t("review.documents.linkCreated", { seconds: SIGNED_URL_TTL_SECONDS })}</span>
                      ) : null}
                    </td>
                    <td className="px-3 py-3">
                      <span className="label-mono text-ink-2">{t(`docStatus.${d.status}`)}</span>
                      {d.rejection_reason ? (
                        <span className="block text-xs text-destructive">{d.rejection_reason}</span>
                      ) : null}
                    </td>
                    <td className="px-3 py-3">
                      <span className={`label-mono ${exp.kind === "expired" ? "text-destructive" : "text-soft"}`}>
                        {t(expiryLabelKey(exp).key, { days: expiryLabelKey(exp).days })}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <DocumentActions document={d} onDone={onDone} onError={onError} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function DocumentActions({
  document: d,
  onDone,
  onError,
}: {
  document: PartnerDetail["documents"][number];
  onDone: () => Promise<void>;
  onError: (m: string) => void;
}) {
  const { t } = useTranslation("admin");
  const [expires, setExpires] = useState(d.expires_on ?? "");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  async function act(status: "approved" | "rejected" | "under_review") {
    if (status === "rejected" && !reason.trim()) {
      onError(t("review.documents.reasonRequired"));
      return;
    }
    setBusy(true);
    try {
      await reviewDocument(d.id, status, reason.trim(), expires || null);
      await onDone();
    } catch {
      onError(t("review.documents.error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <input
        type="date"
        aria-label={t("review.documents.expiryAria", { file: d.file_name })}
        value={expires}
        onChange={(e) => setExpires(e.target.value)}
        className="data-mono w-40 border border-line bg-canvas px-2 py-1 text-xs"
      />
      <input
        aria-label={t("review.documents.reasonAria", { file: d.file_name })}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder={t("review.documents.reasonPlaceholder")}
        className="w-full border border-line bg-canvas px-2 py-1 text-xs"
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void act("under_review")}
          className="label-mono border border-line px-2 py-1"
        >
          {t("review.documents.review")}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void act("approved")}
          className="label-mono border border-success px-2 py-1 text-success"
        >
          {t("review.documents.approve")}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void act("rejected")}
          className="label-mono border border-destructive px-2 py-1 text-destructive"
        >
          {t("review.documents.reject")}
        </button>
      </div>
    </div>
  );
}

function Assessment({
  detail,
  onDone,
  onError,
}: {
  detail: PartnerDetail;
  onDone: () => Promise<void>;
  onError: (m: string) => void;
}) {
  const { t } = useTranslation("admin");
  const [scores, setScores] = useState<Record<string, number>>(() =>
    Object.fromEntries(
      RATING_CRITERIA.map((c) => [c.key, Number(detail.ratings.find((r) => r.criterion === c.key)?.score ?? 0)]),
    ),
  );
  const [busy, setBusy] = useState(false);
  const total = Object.values(scores).reduce((a, b) => a + b, 0);
  const classification = classificationFor(total);

  return (
    <Card title={t("review.assessment.title")}>
      <div className="space-y-3">
        {RATING_CRITERIA.map((c) => (
          <label key={c.key} className="grid grid-cols-[9rem_1fr_2.5rem] items-center gap-3 text-sm">
            <span className="label-mono text-soft">{t(`rating.${c.key}`)}</span>
            <input
              type="range"
              min={0}
              max={RATING_MAX}
              value={scores[c.key] ?? 0}
              onChange={(e) => setScores((s) => ({ ...s, [c.key]: Number(e.target.value) }))}
            />
            <span className="data-mono text-ink">{scores[c.key] ?? 0}</span>
          </label>
        ))}
      </div>
      <p className="data-mono mt-4 text-ink">
        {total} / {RATING_TOTAL_MAX} · <span className="text-primary">{t(`classification.${classification}`)}</span>
      </p>
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await saveAssessment(
              detail.partner.id,
              RATING_CRITERIA.map((c) => ({
                criterion: c.key,
                score: scores[c.key] ?? 0,
                max_score: RATING_MAX,
                note: "",
              })),
              classification,
            );
            await onDone();
          } catch {
            onError(t("review.assessment.error"));
          } finally {
            setBusy(false);
          }
        }}
        className="mt-4 bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
      >
        {busy ? t("common.saving") : t("review.assessment.save")}
      </button>
    </Card>
  );
}

function AccountManager({
  detail,
  onDone,
  onError,
}: {
  detail: PartnerDetail;
  onDone: () => Promise<void>;
  onError: (m: string) => void;
}) {
  const { t } = useTranslation("admin");
  return (
    <Card title={t("review.accountManager.title")}>
      <label className="block text-sm">
        <span className="label-mono text-soft">{t("review.accountManager.label")}</span>
        <select
          value={detail.internal?.account_manager_id ?? ""}
          onChange={async (e) => {
            try {
              await assignAccountManager(detail.partner.id, e.target.value || null);
              await onDone();
            } catch {
              onError(t("review.accountManager.error"));
            }
          }}
          className="mt-1 w-full border border-line bg-canvas px-3 py-2 text-sm outline-none focus:border-primary"
        >
          <option value="">{t("review.accountManager.unassigned")}</option>
          {detail.staff.map((s) => (
            <option key={s.id} value={s.id}>
              {s.full_name || s.id}
            </option>
          ))}
        </select>
      </label>
    </Card>
  );
}

function Notes({
  detail,
  userId,
  onDone,
  onError,
}: {
  detail: PartnerDetail;
  userId: string | null;
  onDone: () => Promise<void>;
  onError: (m: string) => void;
}) {
  const { t } = useTranslation("admin");
  const lang = useActiveLang();
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <Card title={t("review.notes.title")}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!body.trim() || !userId) return;
          setBusy(true);
          try {
            await addNote(detail.partner.id, body.trim(), userId);
            setBody("");
            await onDone();
          } catch {
            onError(t("review.notes.error"));
          } finally {
            setBusy(false);
          }
        }}
      >
        <textarea
          aria-label={t("review.notes.aria")}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          className="w-full border border-line bg-canvas px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <button
          type="submit"
          disabled={busy || !body.trim()}
          className="label-mono mt-2 border border-ink px-3 py-2 disabled:opacity-60"
        >
          {t("review.notes.save")}
        </button>
      </form>
      <ul className="mt-4 space-y-3">
        {detail.notes.map((n) => (
          <li key={n.id} className="border-b border-line pb-2 last:border-b-0">
            <p className="data-mono text-soft">{formatDate(n.created_at, lang)}</p>
            <p className="text-sm text-ink">{n.body}</p>
          </li>
        ))}
      </ul>
    </Card>
  );
}
