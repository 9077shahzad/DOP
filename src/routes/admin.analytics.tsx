import { btn, btnPrimary, numField as num, headClass as th } from "@/components/system";
/**
 * /admin/analytics — fairness, source ROI, customer value and retention.
 *
 * Spend-derived metrics show "—" when no spend has been entered: we have no ad
 * accounts connected, and an implied zero cost would be a lie.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { ManagementKpis } from "@/components/admin/ManagementKpis";
import i18n from "@/i18n/config";
import { formatCurrency, formatDate } from "@/i18n/format";
import { useActiveLang } from "@/lib/admin-i18n";
import { langOf, privateHead } from "@/lib/seo";
import {
  fetchAllocationStats,
  fetchCustomerValue,
  fetchFairnessRules,
  fetchRetentionRules,
  fetchRetentionRuns,
  fetchSourcePerformance,
  runRetention,
  saveFairnessRule,
  saveRetentionRule,
  type AllocationStatRow,
  type CustomerValueRow,
  type FairnessRule,
  type RetentionItem,
  type RetentionRule,
  type RetentionRun,
  type SourcePerformanceRow,
} from "@/lib/insights";

export const Route = createFileRoute("/admin/analytics")({
  ssr: false,
  head: () => privateHead(langOf(i18n.language), "admin"),
  component: Analytics,
});


function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function Analytics() {
  const { t } = useTranslation("admin");
  const lang = useActiveLang();
  const [from, setFrom] = useState(isoDaysAgo(90));
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const [sources, setSources] = useState<SourcePerformanceRow[] | null>(null);
  const [customers, setCustomers] = useState<CustomerValueRow[] | null>(null);
  const [fairness, setFairness] = useState<FairnessRule[]>([]);
  const [stats, setStats] = useState<AllocationStatRow[]>([]);
  const [retention, setRetention] = useState<RetentionRule[]>([]);
  const [runs, setRuns] = useState<RetentionRun[]>([]);
  const [dry, setDry] = useState<RetentionItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [s, c, f, st, r, ru] = await Promise.all([
        fetchSourcePerformance(from, to),
        fetchCustomerValue(),
        fetchFairnessRules(),
        fetchAllocationStats(),
        fetchRetentionRules(),
        fetchRetentionRuns(),
      ]);
      setSources(s);
      setCustomers(c);
      setFairness(f);
      setStats(st);
      setRetention(r);
      setRuns(ru);
    } catch (err) {
      console.error(err);
      setSources([]);
      setCustomers([]);
      setError(t("insights.loadError"));
    }
  }, [from, to, t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function retentionRun(dryRun: boolean) {
    setBusy(true);
    setError(null);
    try {
      setDry(await runRetention(dryRun));
      setRuns(await fetchRetentionRuns());
    } catch (err) {
      console.error(err);
      setError(t("insights.retentionError"));
    } finally {
      setBusy(false);
    }
  }

  const money = (v: number | null) => (v === null ? "—" : formatCurrency(v, lang));

  return (
    <section>
      <p className="label-mono text-primary">{t("insights.eyebrow")}</p>
      <h1 className="mt-2 text-3xl md:text-4xl">{t("insights.title")}</h1>

      {error ? (
        <p role="alert" className="mt-6 border-l-4 border-destructive bg-surface px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {/* management figures, counted from real records */}
      <div className="mt-8">
        <ManagementKpis />
      </div>



      {/* fairness */}
      <h2 className="mt-10 text-2xl">{t("insights.fairnessTitle")}</h2>
      <p className="mt-2 max-w-2xl text-sm text-ink-2">{t("insights.fairnessBody")}</p>
      <div className="mt-4 overflow-x-auto border border-line bg-surface p-4">
        <table className="min-w-full text-sm">
          <thead>
            <tr>
              <th className={th}>{t("insights.col.parameter")}</th>
              <th className={th}>{t("insights.col.value")}</th>
              <th className={th}>{t("insights.col.active")}</th>
            </tr>
          </thead>
          <tbody>
            {fairness.map((rule) => (
              <tr key={rule.id} className="border-t border-line">
                <td className="py-2 pr-4">{t(`insights.fairness.${rule.key}`, rule.label)}</td>
                <td className="py-2 pr-4">
                  <label className="flex items-center gap-2">
                    <span className="sr-only">{t("insights.col.value")}</span>
                    <input
                      type="number"
                      defaultValue={Number(rule.value)}
                      className={num}
                      onBlur={(e) => {
                        const next = Number(e.target.value);
                        if (Number.isFinite(next) && next !== Number(rule.value)) {
                          void saveFairnessRule(rule.id, { value: next }).then(load).catch(() => setError(t("insights.saveError")));
                        }
                      }}
                    />
                    <span className="label-mono text-soft">{t(`insights.unit.${rule.unit}`, rule.unit)}</span>
                  </label>
                </td>
                <td className="py-2 pr-4">
                  <input
                    type="checkbox"
                    aria-label={t("insights.col.active")}
                    defaultChecked={rule.active}
                    onChange={(e) =>
                      void saveFairnessRule(rule.id, { active: e.target.checked })
                        .then(load)
                        .catch(() => setError(t("insights.saveError")))
                    }
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 className="mt-6 text-xl">{t("insights.statsTitle")}</h3>
      <div className="mt-2 overflow-x-auto border border-line bg-surface p-4">
        {stats.length === 0 ? (
          <p className="label-mono text-soft">{t("insights.statsEmpty")}</p>
        ) : (
          <table className="min-w-full text-sm">
            <thead>
              <tr>
                <th className={th}>{t("insights.col.partner")}</th>
                <th className={th}>{t("insights.col.period")}</th>
                <th className={th}>{t("insights.col.canton")}</th>
                <th className={th}>{t("insights.col.offered")}</th>
                <th className={th}>{t("insights.col.accepted")}</th>
                <th className={th}>{t("insights.col.explored")}</th>
                <th className={th}>{t("insights.col.saturatedOut")}</th>
                <th className={th}>{t("insights.col.skipped")}</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((row) => (
                <tr key={row.id} className="border-t border-line">
                  <td className="py-2 pr-4">{row.partner?.trading_name || row.partner?.legal_name || "—"}</td>
                  <td className="data-mono py-2 pr-4">{row.period_start}</td>
                  <td className="data-mono py-2 pr-4">{row.canton || "—"}</td>
                  <td className="data-mono py-2 pr-4">{row.offered}</td>
                  <td className="data-mono py-2 pr-4">{row.accepted}</td>
                  <td className="data-mono py-2 pr-4">{row.explored}</td>
                  <td className="data-mono py-2 pr-4">{row.saturated_out}</td>
                  <td className="data-mono py-2 pr-4">{row.skipped}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* source ROI */}
      <h2 className="mt-10 text-2xl">{t("insights.sourcesTitle")}</h2>
      <p className="mt-2 max-w-2xl text-sm text-ink-2">{t("insights.sourcesBody")}</p>
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="label-mono text-soft">{t("insights.from")}</span>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={`${num} w-40`} />
        </label>
        <label className="text-sm">
          <span className="label-mono text-soft">{t("insights.to")}</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={`${num} w-40`} />
        </label>
      </div>
      <div className="mt-4 overflow-x-auto border border-line bg-surface p-4">
        {sources === null ? (
          <p className="label-mono text-soft">{t("common.loading")}</p>
        ) : (
          <table className="min-w-full text-sm">
            <thead>
              <tr>
                <th className={th}>{t("insights.col.source")}</th>
                <th className={th}>{t("insights.col.leads")}</th>
                <th className={th}>{t("insights.col.qualified")}</th>
                <th className={th}>{t("insights.col.won")}</th>
                <th className={th}>{t("insights.col.conversion")}</th>
                <th className={th}>{t("insights.col.revenue")}</th>
                <th className={th}>{t("insights.col.margin")}</th>
                <th className={th}>{t("insights.col.spend")}</th>
                <th className={th}>{t("insights.col.cpl")}</th>
                <th className={th}>{t("insights.col.cpql")}</th>
                <th className={th}>{t("insights.col.cac")}</th>
                <th className={th}>{t("insights.col.roas")}</th>
              </tr>
            </thead>
            <tbody>
              {sources.map((row) => (
                <tr key={row.source_id} className="border-t border-line">
                  <td className="py-2 pr-4">{t(`leadSource.${row.source_key}`, row.source_key)}</td>
                  <td className="data-mono py-2 pr-4">{row.leads}</td>
                  <td className="data-mono py-2 pr-4">{row.qualified}</td>
                  <td className="data-mono py-2 pr-4">{row.won}</td>
                  <td className="data-mono py-2 pr-4">{row.conversion}%</td>
                  <td className="data-mono py-2 pr-4">{formatCurrency(Number(row.revenue), lang)}</td>
                  <td className="data-mono py-2 pr-4">{formatCurrency(Number(row.gross_margin), lang)}</td>
                  <td className="data-mono py-2 pr-4">{money(row.spend === null ? null : Number(row.spend))}</td>
                  <td className="data-mono py-2 pr-4">{money(row.cost_per_lead === null ? null : Number(row.cost_per_lead))}</td>
                  <td className="data-mono py-2 pr-4">{money(row.cost_per_qualified === null ? null : Number(row.cost_per_qualified))}</td>
                  <td className="data-mono py-2 pr-4">{money(row.cac === null ? null : Number(row.cac))}</td>
                  <td className="data-mono py-2 pr-4">{row.roas === null ? "—" : Number(row.roas)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <p className="label-mono mt-2 text-soft">{t("insights.trackingNote")}</p>

      {/* customer value */}
      <h2 className="mt-10 text-2xl">{t("insights.customersTitle")}</h2>
      <p className="mt-2 max-w-2xl text-sm text-ink-2">{t("insights.customersBody")}</p>
      <div className="mt-4 overflow-x-auto border border-line bg-surface p-4">
        {customers === null ? (
          <p className="label-mono text-soft">{t("common.loading")}</p>
        ) : customers.length === 0 ? (
          <p className="label-mono text-soft">{t("insights.customersEmpty")}</p>
        ) : (
          <table className="min-w-full text-sm">
            <thead>
              <tr>
                <th className={th}>{t("insights.col.customer")}</th>
                <th className={th}>{t("insights.col.jobs")}</th>
                <th className={th}>{t("insights.col.revenue")}</th>
                <th className={th}>{t("insights.col.margin")}</th>
                <th className={th}>{t("insights.col.ticket")}</th>
                <th className={th}>{t("insights.col.complaints")}</th>
                <th className={th}>{t("insights.col.firstJob")}</th>
                <th className={th}>{t("insights.col.lastJob")}</th>
                <th className={th}>{t("insights.col.repeat")}</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((row) => (
                <tr key={row.contact_key} className="border-t border-line">
                  <td className="py-2 pr-4">{row.customer_name || row.customer_email || row.customer_phone || "—"}</td>
                  <td className="data-mono py-2 pr-4">{row.jobs}</td>
                  <td className="data-mono py-2 pr-4">{formatCurrency(Number(row.revenue), lang)}</td>
                  <td className="data-mono py-2 pr-4">{formatCurrency(Number(row.gross_margin), lang)}</td>
                  <td className="data-mono py-2 pr-4">{formatCurrency(Number(row.average_ticket), lang)}</td>
                  <td className="data-mono py-2 pr-4">{row.complaints}</td>
                  <td className="data-mono py-2 pr-4">{row.first_job ? formatDate(row.first_job, lang) : "—"}</td>
                  <td className="data-mono py-2 pr-4">{row.last_job ? formatDate(row.last_job, lang) : "—"}</td>
                  <td className="py-2 pr-4">{row.repeat_customer ? t("insights.repeatYes") : t("insights.repeatNo")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* retention */}
      <h2 className="mt-10 text-2xl">{t("insights.retentionTitle")}</h2>
      <p className="mt-2 max-w-2xl text-sm text-ink-2">{t("insights.retentionBody")}</p>
      <div className="mt-4 overflow-x-auto border border-line bg-surface p-4">
        <table className="min-w-full text-sm">
          <thead>
            <tr>
              <th className={th}>{t("insights.col.entity")}</th>
              <th className={th}>{t("insights.col.action")}</th>
              <th className={th}>{t("insights.col.days")}</th>
              <th className={th}>{t("insights.col.active")}</th>
            </tr>
          </thead>
          <tbody>
            {retention.map((rule) => (
              <tr key={rule.id} className="border-t border-line">
                <td className="py-2 pr-4">{t(`insights.entity.${rule.entity}`, rule.label)}</td>
                <td className="py-2 pr-4">{t(`insights.action.${rule.action}`, rule.action)}</td>
                <td className="py-2 pr-4">
                  <label className="flex items-center gap-2">
                    <span className="sr-only">{t("insights.col.days")}</span>
                    <input
                      type="number"
                      defaultValue={rule.retention_days}
                      className={num}
                      onBlur={(e) => {
                        const next = Number(e.target.value);
                        if (Number.isFinite(next) && next !== rule.retention_days) {
                          void saveRetentionRule(rule.id, { retention_days: next })
                            .then(load)
                            .catch(() => setError(t("insights.saveError")));
                        }
                      }}
                    />
                  </label>
                </td>
                <td className="py-2 pr-4">
                  <input
                    type="checkbox"
                    aria-label={t("insights.col.active")}
                    defaultChecked={rule.active}
                    onChange={(e) =>
                      void saveRetentionRule(rule.id, { active: e.target.checked })
                        .then(load)
                        .catch(() => setError(t("insights.saveError")))
                    }
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className={btn} disabled={busy} onClick={() => void retentionRun(true)}>
          {t("insights.dryRun")}
        </button>
        <button
          type="button"
          className={btnPrimary}
          disabled={busy || dry === null}
          onClick={() => {
            if (window.confirm(t("insights.applyConfirm"))) void retentionRun(false);
          }}
        >
          {t("insights.apply")}
        </button>
      </div>

      {dry ? (
        <div className="mt-4 border border-line bg-surface p-4">
          <p className="label-mono text-soft">{t("insights.dryResult")}</p>
          <ul className="mt-2 space-y-1 text-sm text-ink-2">
            {dry.map((item) => (
              <li key={item.entity}>
                <span className="data-mono">{item.affected}</span>{" "}
                {t(`insights.entity.${item.entity}`, item.entity)} ·{" "}
                {t(`insights.action.${item.action}`, item.action)} ·{" "}
                {t("insights.protected", { count: item.skipped_protected })}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <h3 className="mt-6 text-xl">{t("insights.runsTitle")}</h3>
      <ul className="mt-2 space-y-1 text-sm text-ink-2">
        {runs.length === 0 ? <li className="label-mono text-soft">{t("insights.runsEmpty")}</li> : null}
        {runs.map((run) => (
          <li key={run.id}>
            <span className="data-mono">{formatDate(run.ran_at, lang)}</span> ·{" "}
            {run.dry_run ? t("insights.dryRun") : t("insights.apply")}
          </li>
        ))}
      </ul>
    </section>
  );
}
