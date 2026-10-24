import { field, btn, btnPrimary } from "@/components/system";
/**
 * Allocation panel — ranked recommendations, RFQ dispatch, SLA countdowns and
 * partner quote comparison for one lead.
 *
 * All writes go through the SECURITY DEFINER allocation functions; nothing here
 * inserts or updates partner_opportunities directly.
 */
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { formatCurrency, formatDate } from "@/i18n/format";
import { useActiveLang } from "@/lib/admin-i18n";
import type { Lang } from "@/i18n/config";
import {
  SLA_TONE_CLASS,
  acceptQuote,
  fetchLeadAllocation,
  logAllocationException,
  minutesRemaining,
  sendOpportunities,
  slaMinutes,
  slaTone,
  type LeadAllocation,
} from "@/lib/allocation";
import {
  evaluateFulfilment,
  fetchLeadEconomics,
  type FulfilmentCandidate,
  type LeadEconomics,
} from "@/lib/commercial";


export function AllocationPanel({
  leadId,
  busy,
  onChanged,
}: {
  leadId: string;
  busy: boolean;
  onChanged: () => void;
}) {
  const { t } = useTranslation("admin");
  const lang = useActiveLang();
  const [candidates, setCandidates] = useState<FulfilmentCandidate[] | null>(null);
  const [allocation, setAllocation] = useState<LeadAllocation | null>(null);
  const [economics, setEconomics] = useState<LeadEconomics | null>(null);
  const [sla, setSla] = useState(120);
  const [selected, setSelected] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [, setTick] = useState(0);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [list, alloc, minutes, econ] = await Promise.all([
        evaluateFulfilment(leadId),
        fetchLeadAllocation(leadId),
        slaMinutes(leadId),
        fetchLeadEconomics(leadId),
      ]);
      setCandidates(list);
      setAllocation(alloc);
      setSla(minutes);
      setEconomics(econ);
    } catch (err) {
      console.error(err);
      setCandidates([]);
      setError(t("alloc.loadError"));
    }
  }, [leadId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  // countdown refresh, once a minute
  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const partners = (candidates ?? []).filter((c) => c.kind === "partner");
  const alreadySent = new Set(
    (allocation?.opportunities ?? [])
      .filter((o) => ["sent", "viewed", "accepted"].includes(o.status))
      .map((o) => o.partner_id ?? ""),
  );
  const available = partners.filter((c) => !alreadySent.has(c.id));
  const teams = (candidates ?? []).filter((c) => c.kind === "internal_team");

  async function run(action: () => Promise<void>) {
    setPending(true);
    setError(null);
    try {
      await action();
      await load();
      onChanged();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : t("alloc.actionError"));
    } finally {
      setPending(false);
    }
  }

  const blocked = busy || pending;

  return (
    <section className="border border-line bg-canvas p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="label-mono text-soft">{t("alloc.title")}</h3>
        <p className="label-mono text-soft">{t("alloc.sla", { minutes: sla })}</p>
      </div>

      {economics ? (
        <dl className="mt-3 grid grid-cols-2 gap-px border border-line bg-line sm:grid-cols-4">
          <Metric label={t("econ.sell")} value={money(economics.expectedSell, lang)} />
          {economics.costsVisible ? (
            <>
              <Metric label={t("econ.cost")} value={money(economics.expectedCost, lang)} />
              <Metric label={t("econ.margin")} value={money(economics.expectedMargin, lang)} />
              <Metric
                label={t("econ.marginPct")}
                value={economics.expectedMarginPct == null ? "—" : `${economics.expectedMarginPct.toFixed(1)} %`}
              />
            </>
          ) : (
            <Metric label={t("econ.cost")} value={t("econ.hidden")} />
          )}
        </dl>
      ) : null}

      {economics && economics.flags.length > 0 ? (
        <ul className="mt-2 flex flex-wrap gap-2">
          {economics.flags.map((flag) => (
            <li key={flag} className="label-mono border border-destructive px-2 py-1 text-xs text-destructive">
              {t(`econ.flag.${flag}`, flag)}
            </li>
          ))}
        </ul>
      ) : null}

      {error ? (
        <p role="alert" className="mt-3 border-l-4 border-destructive bg-surface px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {/* ------------------------------------------------------ recommendations */}
      {candidates === null ? (
        <p className="label-mono mt-3 text-soft">{t("common.loading")}</p>
      ) : partners.length === 0 ? (
        <div className="mt-3 border border-destructive bg-surface p-3">
          <p className="text-sm text-destructive">{t("alloc.noCandidates")}</p>
          <button
            type="button"
            disabled={blocked}
            className={`${btn} mt-3`}
            onClick={() =>
              void run(() => logAllocationException(leadId, "no_eligible_partner", t("alloc.exceptionNote")))
            }
          >
            {t("alloc.recordException")}
          </button>
        </div>
      ) : (
        <>
          <ul className="mt-3 space-y-2">
            {available.map((c) => {
              const checked = selected.includes(c.id);
              return (
                <li key={c.id} className="border border-line bg-surface p-3">
                  <label className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) =>
                        setSelected((prev) => (e.target.checked ? [...prev, c.id] : prev.filter((id) => id !== c.id)))
                      }
                      className="mt-1"
                      aria-label={t("alloc.selectPartner", { name: c.name })}
                    />
                    <span className="flex-1">
                      <span className="flex flex-wrap items-baseline justify-between gap-2">
                        <span className="text-sm text-ink">{c.name}</span>
                        <span className="data-mono text-sm text-primary">{c.score.toFixed(1)}</span>
                      </span>
                      <CommercialRow candidate={c} lang={lang} />
                      <ul className="mt-2 space-y-1 text-xs text-soft">
                        {c.reasons.map((reason, index) => (
                          <li key={index}>· {reason}</li>
                        ))}
                      </ul>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>

          {available.length === 0 ? <p className="mt-3 text-sm text-soft">{t("alloc.allSent")}</p> : null}

          {teams.length > 0 ? (
            <div className="mt-4">
              <p className="label-mono text-soft">{t("econ.internalTeams")}</p>
              <ul className="mt-2 space-y-2">
                {teams.map((team) => (
                  <li key={team.id} className="border border-line bg-surface p-3">
                    <span className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="text-sm text-ink">{team.name}</span>
                      <span className="data-mono text-sm text-primary">{team.score.toFixed(1)}</span>
                    </span>
                    <CommercialRow candidate={team} lang={lang} />
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <label className="mt-3 block text-sm">
            <span className="label-mono text-soft">{t("leads.field.note")}</span>
            <input value={note} onChange={(e) => setNote(e.target.value)} className={field} />
          </label>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={blocked || selected.length !== 1}
              className={btnPrimary}
              onClick={() =>
                void run(async () => {
                  const chosen = available.filter((c) => selected.includes(c.id));
                  await sendOpportunities(leadId, chosen, note);
                  setSelected([]);
                  setNote("");
                })
              }
            >
              {t("alloc.sendSingle")}
            </button>
            <button
              type="button"
              disabled={blocked || selected.length < 2}
              className={btn}
              onClick={() =>
                void run(async () => {
                  const chosen = available.filter((c) => selected.includes(c.id));
                  await sendOpportunities(leadId, chosen, note);
                  setSelected([]);
                  setNote("");
                })
              }
            >
              {t("alloc.sendRfq", { count: selected.length })}
            </button>
          </div>
          <p className="mt-2 text-xs text-soft">{t("alloc.sendHint")}</p>
        </>
      )}

      {/* ------------------------------------------------------------ SLA board */}
      {(allocation?.opportunities.length ?? 0) > 0 ? (
        <div className="mt-6">
          <h4 className="label-mono text-soft">{t("alloc.sent")}</h4>
          <ul className="mt-2 space-y-2">
            {allocation?.opportunities.map((o) => {
              const remaining = minutesRemaining(o.respond_by);
              const tone = SLA_TONE_CLASS[slaTone(o.sent_at, o.respond_by)];
              const live = ["sent", "viewed"].includes(o.status);
              return (
                <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 border border-line bg-surface p-3">
                  <span className="text-sm text-ink">
                    {o.partnerName}
                    <span className="label-mono ms-2 text-soft">{t(`alloc.oppStatus.${o.status}`, o.status)}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    {o.match_score != null ? (
                      <span className="data-mono text-xs text-soft">{Number(o.match_score).toFixed(1)}</span>
                    ) : null}
                    {live && remaining != null ? (
                      <span className={`label-mono border px-2 py-1 ${tone}`}>
                        {remaining > 0
                          ? t("alloc.remaining", { hours: Math.floor(remaining / 60), minutes: remaining % 60 })
                          : t("alloc.expired")}
                      </span>
                    ) : null}
                    {o.decline_reason ? <span className="text-xs text-soft">{o.decline_reason}</span> : null}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {/* ---------------------------------------------------------- comparison */}
      {(allocation?.quotes.length ?? 0) > 0 ? (
        <div className="mt-6">
          <h4 className="label-mono text-soft">{t("alloc.comparison")}</h4>
          {!allocation?.costsVisible ? <p className="mt-1 text-xs text-soft">{t("alloc.costsHidden")}</p> : null}
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[36rem] border-collapse text-sm">
              <thead>
                <tr className="border-b border-line text-left">
                  <th scope="col" className="label-mono py-2 text-soft">{t("alloc.col.partner")}</th>
                  <th scope="col" className="label-mono py-2 text-soft">{t("alloc.col.cost")}</th>
                  <th scope="col" className="label-mono py-2 text-soft">{t("alloc.col.availability")}</th>
                  <th scope="col" className="label-mono py-2 text-soft">{t("alloc.col.response")}</th>
                  <th scope="col" className="label-mono py-2 text-soft">{t("alloc.col.performance")}</th>
                  <th scope="col" className="label-mono py-2 text-soft">{t("alloc.col.action")}</th>
                </tr>
              </thead>
              <tbody>
                {allocation?.quotes.map((q) => (
                  <tr key={q.quoteId} className="border-b border-line align-top">
                    <td className="py-2 pe-3 text-ink">
                      {q.partnerName}
                      <span className="label-mono ms-2 text-soft">{t(`alloc.quoteStatus.${q.status}`, q.status)}</span>
                      {q.conditions ? <p className="mt-1 text-xs text-soft">{q.conditions}</p> : null}
                    </td>
                    <td className="data-mono py-2 pe-3">
                      {q.cost == null ? "—" : formatCurrency(q.cost, lang)}
                    </td>
                    <td className="py-2 pe-3 text-ink-2">
                      {q.availabilityDate ? formatDate(q.availabilityDate, lang, { dateStyle: "short" }) : "—"}
                      {q.completionDays != null ? (
                        <span className="label-mono ms-2 text-soft">{t("alloc.days", { count: q.completionDays })}</span>
                      ) : null}
                    </td>
                    <td className="data-mono py-2 pe-3 text-ink-2">
                      {q.responseMinutes == null ? "—" : t("alloc.minutes", { count: q.responseMinutes })}
                    </td>
                    <td className="data-mono py-2 pe-3 text-ink-2">
                      {q.performanceScore == null ? "—" : q.performanceScore.toFixed(1)}
                    </td>
                    <td className="py-2">
                      {q.status === "accepted" ? (
                        <span className="label-mono text-primary">{t("alloc.accepted")}</span>
                      ) : (
                        <button
                          type="button"
                          disabled={blocked || q.status !== "submitted"}
                          className={btnPrimary}
                          onClick={() => void run(() => acceptQuote(q.quoteId, note))}
                        >
                          {t("alloc.accept")}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-soft">{t("alloc.acceptHint")}</p>
        </div>
      ) : null}
    </section>
  );
}

/* ----------------------------------------------------------- small pieces */

function money(value: number | null, lang: Lang): string {
  return value == null ? "—" : formatCurrency(value, lang);
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface px-3 py-2">
      <dt className="label-mono text-soft">{label}</dt>
      <dd className="data-mono mt-1 text-sm text-ink">{value}</dd>
    </div>
  );
}

/** Margin is shown, never used to rank — the dispatcher decides. */
function CommercialRow({ candidate, lang }: { candidate: FulfilmentCandidate; lang: Lang }) {
  const { t } = useTranslation("admin");
  return (
    <span className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-2">
      <span className="data-mono">{t("econ.price")}: {money(candidate.customerPrice, lang)}</span>
      {candidate.costsVisible ? (
        <>
          <span className="data-mono">{t("econ.cost")}: {money(candidate.expectedCost, lang)}</span>
          <span className="data-mono">
            {t("econ.margin")}: {money(candidate.expectedMargin, lang)}
            {candidate.expectedMarginPct == null ? "" : ` (${candidate.expectedMarginPct.toFixed(1)} %)`}
          </span>
        </>
      ) : null}
      <span className="data-mono">
        {t("econ.availability")}: {candidate.earliestAvailability ? formatDate(candidate.earliestAvailability, lang) : "—"}
      </span>
      <span className="data-mono">
        {t("econ.rating")}: {candidate.rating == null ? "—" : candidate.rating.toFixed(1)}
      </span>
      {candidate.commercialNote ? (
        <span className="label-mono border border-primary px-2 py-0.5 text-primary">
          {t(`econ.note.${candidate.commercialNote}`, candidate.commercialNote)}
        </span>
      ) : null}
    </span>
  );
}
