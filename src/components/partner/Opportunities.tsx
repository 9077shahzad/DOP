import { field, btn, btnPrimary } from "@/components/system";
/**
 * Partner opportunity inbox — redacted until accepted, then contact details.
 */
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { formatCurrency, formatDate } from "@/i18n/format";
import { detectLanguage, type Lang } from "@/i18n/config";
import {
  fetchOpportunityFeed,
  fetchOwnQuotes,
  respondToOpportunity,
  submitOpportunityQuote,
  type OpportunityFeedRow,
  type OwnQuoteRow,
} from "@/lib/partner-opportunities";
import { DECLINE_REASONS, SLA_TONE_CLASS, minutesRemaining, slaTone } from "@/lib/allocation";


export function Opportunities() {
  const { t, i18n } = useTranslation("partner");
  const lang = ((i18n.language as Lang) ?? detectLanguage()) as Lang;
  const [rows, setRows] = useState<OpportunityFeedRow[] | null>(null);
  const [quotes, setQuotes] = useState<OwnQuoteRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [, setTick] = useState(0);

  const load = useCallback(async () => {
    try {
      const [feed, own] = await Promise.all([fetchOpportunityFeed(), fetchOwnQuotes()]);
      setRows(feed);
      setQuotes(own);
    } catch (err) {
      console.error(err);
      setRows([]);
      setError(t("opps.loadError"));
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), 60_000);
    return () => window.clearInterval(id);
  }, []);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      await load();
    } catch (err) {
      console.error(err);
      // A second partner accepting the same request is normal, not a fault.
      const raw = err instanceof Error ? err.message : "";
      setError(
        /already_allocated|55006/.test(raw) ? t("opps.alreadyTaken") : raw || t("opps.actionError"),
      );
      await load();
    } finally {
      setBusy(false);
    }
  }

  if (rows === null) return <p className="label-mono text-soft">{t("apply.loading")}</p>;

  return (
    <div>
      <h2 className="text-2xl">{t("opps.title")}</h2>
      <p className="mt-2 text-sm text-ink-2">{t("opps.lead")}</p>

      {error ? (
        <p role="alert" className="mt-4 rounded-md border-l-4 border-destructive bg-surface px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {rows.length === 0 ? (
        <p className="mt-6 rounded-md rounded-2xl bg-surface p-4 text-sm text-ink-2">{t("opps.empty")}</p>
      ) : (
        <ul className="mt-6 space-y-4">
          {rows.map((row) => (
            <OpportunityCard
              key={row.opportunityId}
              row={row}
              lang={lang}
              busy={busy}
              quote={quotes.find((q) => q.opportunityId === row.opportunityId) ?? null}
              onRespond={(response, reason) => void run(() => respondToOpportunity(row.opportunityId, response, reason))}
              onQuote={(draft) => void run(() => submitOpportunityQuote(row.opportunityId, draft))}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function OpportunityCard({
  row,
  lang,
  busy,
  quote,
  onRespond,
  onQuote,
}: {
  row: OpportunityFeedRow;
  lang: Lang;
  busy: boolean;
  quote: OwnQuoteRow | null;
  onRespond: (response: "viewed" | "accepted" | "declined", reason?: string) => void;
  onQuote: (draft: { partnerCost: number; availabilityDate: string; completionDays: number | null; conditions: string; notes: string }) => void;
}) {
  const { t } = useTranslation("partner");
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState<string>(DECLINE_REASONS[0]);
  const [detail, setDetail] = useState("");
  const [cost, setCost] = useState("");
  const [date, setDate] = useState("");
  const [days, setDays] = useState("");
  const [conditions, setConditions] = useState("");

  const remaining = minutesRemaining(row.respondBy);
  const live = ["sent", "viewed"].includes(row.status);
  const tone = SLA_TONE_CLASS[slaTone(row.sentAt, row.respondBy)];

  return (
    <li className="rounded-md rounded-2xl bg-surface p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="data-mono text-ink">{row.leadReference}</span>
        <span className="flex items-center gap-2">
          <span className="label-mono text-soft">{t(`opps.status.${row.status}`, row.status)}</span>
          {live && remaining != null ? (
            <span className={`label-mono rounded-md border px-2 py-1 ${tone}`}>
              {remaining > 0
                ? t("opps.remaining", { hours: Math.floor(remaining / 60), minutes: remaining % 60 })
                : t("opps.expired")}
            </span>
          ) : null}
        </span>
      </div>

      <dl className="mt-3 grid gap-3 sm:grid-cols-2">
        <Row label={t("opps.field.area")} value={`${row.postcodePrefix}··· ${row.city} ${row.canton}`.trim()} />
        <Row label={t("opps.field.window")} value={row.dateWindow} />
        <Row
          label={t("opps.field.value")}
          value={row.approxValue ? t("opps.approx", { value: formatCurrency(row.approxValue, lang) }) : "—"}
        />
        <Row label={t("opps.field.sent")} value={row.sentAt ? formatDate(row.sentAt, lang, { dateStyle: "short", timeStyle: "short" }) : "—"} />
      </dl>

      {row.description ? <p className="mt-3 text-sm text-ink-2">{row.description}</p> : null}

      {row.status === "accepted" ? (
        <dl className="mt-3 grid gap-3 rounded-md border border-primary bg-canvas p-3 sm:grid-cols-2">
          <Row label={t("opps.field.customer")} value={row.customerName ?? "—"} />
          <Row label={t("opps.field.phone")} value={row.customerPhone ?? "—"} />
          <Row label={t("opps.field.email")} value={row.customerEmail ?? "—"} />
          <Row label={t("opps.field.address")} value={row.serviceAddress ?? "—"} />
        </dl>
      ) : (
        <p className="mt-3 text-xs text-soft">{t("opps.redacted")}</p>
      )}

      {live ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" disabled={busy} className={btnPrimary} onClick={() => onRespond("accepted")}>
            {t("opps.accept")}
          </button>
          <button type="button" disabled={busy} className={btn} onClick={() => setDeclining((v) => !v)}>
            {t("opps.decline")}
          </button>
        </div>
      ) : null}

      {declining ? (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            <span className="label-mono text-soft">{t("opps.declineReason")}</span>
            <select value={reason} onChange={(e) => setReason(e.target.value)} className={field}>
              {DECLINE_REASONS.map((r) => (
                <option key={r} value={r}>
                  {t(`opps.reason.${r}`)}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="label-mono text-soft">{t("opps.declineDetail")}</span>
            <input value={detail} onChange={(e) => setDetail(e.target.value)} className={field} />
          </label>
          <button
            type="button"
            disabled={busy}
            className={`${btn} sm:col-span-2 sm:justify-self-start`}
            onClick={() => onRespond("declined", `${t(`opps.reason.${reason}`)}${detail ? ` — ${detail}` : ""}`)}
          >
            {t("opps.declineConfirm")}
          </button>
        </div>
      ) : null}

      {row.status === "accepted" ? (
        quote ? (
          <p className="mt-4 text-sm text-ink-2">
            {t("opps.quoteSubmitted", { value: formatCurrency(quote.partnerCost, lang) })}{" "}
            <span className="label-mono text-soft">{t(`opps.quoteStatus.${quote.status}`, quote.status)}</span>
          </p>
        ) : (
          <div className="mt-4 grid gap-3 border-t border-line pt-4 sm:grid-cols-2">
            <p className="label-mono text-soft sm:col-span-2">{t("opps.quoteTitle")}</p>
            <label className="text-sm">
              <span className="label-mono text-soft">{t("opps.field.cost")}</span>
              <input type="number" min={0} step="0.05" value={cost} onChange={(e) => setCost(e.target.value)} className={field} />
            </label>
            <label className="text-sm">
              <span className="label-mono text-soft">{t("opps.field.availability")}</span>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={field} />
            </label>
            <label className="text-sm">
              <span className="label-mono text-soft">{t("opps.field.days")}</span>
              <input type="number" min={0} value={days} onChange={(e) => setDays(e.target.value)} className={field} />
            </label>
            <label className="text-sm">
              <span className="label-mono text-soft">{t("opps.field.conditions")}</span>
              <input value={conditions} onChange={(e) => setConditions(e.target.value)} className={field} />
            </label>
            <button
              type="button"
              disabled={busy || !cost}
              className={`${btnPrimary} sm:col-span-2 sm:justify-self-start`}
              onClick={() =>
                onQuote({
                  partnerCost: Number(cost),
                  availabilityDate: date,
                  completionDays: days ? Number(days) : null,
                  conditions,
                  notes: "",
                })
              }
            >
              {t("opps.quoteSubmit")}
            </button>
          </div>
        )
      ) : null}
    </li>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="label-mono text-soft">{label}</dt>
      <dd className="mt-1 text-sm text-ink">{value}</dd>
    </div>
  );
}
