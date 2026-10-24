import { AlertOctagon, AlertTriangle, Info } from "lucide-react";
import { Chip } from "@/components/system";
import { TONE_ACCENT, type Tone } from "@/lib/status-tone";
import { btn, field } from "@/components/system";
/**
 * /admin — the management exception view.
 *
 * Not a metrics wall: it lists only what needs intervention, with the number
 * that triggered it, so a manager can judge rather than obey. An empty list is
 * a good outcome and says so.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import i18n from "@/i18n/config";
import { formatDate } from "@/i18n/format";
import { useActiveLang } from "@/lib/admin-i18n";
import { langOf, privateHead } from "@/lib/seo";
import {
  SEVERITY_ORDER,
  fetchExceptionRules,
  fetchExceptions,
  groupBySeverity,
  saveExceptionRule,
  type ExceptionRow,
  type ExceptionRule,
  type Severity,
} from "@/lib/insights";

export const Route = createFileRoute("/admin/")({
  ssr: false,
  head: () => privateHead(langOf(i18n.language), "admin"),
  component: ExceptionDashboard,
});


/** Severity resolves through the single status→tone map; the icon carries the
 *  meaning too, so colour is never the only signal. */
const SEVERITY_TONE: Record<Severity, Tone> = { critical: "danger", warning: "warning", info: "info" };
const SEVERITY_ICON: Record<Severity, typeof AlertTriangle> = {
  critical: AlertOctagon,
  warning: AlertTriangle,
  info: Info,
};

function ExceptionDashboard() {
  const { t } = useTranslation("admin");
  const lang = useActiveLang();
  const [rows, setRows] = useState<ExceptionRow[] | null>(null);
  const [rules, setRules] = useState<ExceptionRule[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showRules, setShowRules] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [items, ruleRows] = await Promise.all([fetchExceptions(), fetchExceptionRules()]);
      setRows(items);
      setRules(ruleRows);
    } catch (err) {
      console.error(err);
      setRows([]);
      setError(t("dash.loadError"));
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const grouped = groupBySeverity(rows ?? []);

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label-mono text-primary">{t("dash.eyebrow")}</p>
          <h1 className="mt-2 text-3xl md:text-4xl">{t("dash.title")}</h1>
          <p className="mt-2 max-w-2xl text-sm text-ink-2">{t("dash.lead")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={btn} onClick={() => void load()}>
            {t("dash.refresh")}
          </button>
          <button type="button" className={btn} aria-expanded={showRules} onClick={() => setShowRules((v) => !v)}>
            {t("dash.thresholds")}
          </button>
          <Link to="/admin/analytics" className={btn}>
            {t("dash.toAnalytics")}
          </Link>
        </div>
      </div>

      {error ? (
        <p role="alert" className="mt-6 border-l-4 border-destructive bg-surface px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {showRules ? <Thresholds rules={rules} onSaved={load} onError={() => setError(t("dash.saveError"))} /> : null}

      {rows === null ? (
        <p className="label-mono mt-8 text-soft">{t("common.loading")}</p>
      ) : rows.length === 0 ? (
        <div className="mt-8 border border-line bg-surface p-8">
          <p className="label-mono text-primary">{t("dash.clearTitle")}</p>
          <p className="mt-2 text-sm text-ink-2">{t("dash.clearBody")}</p>
        </div>
      ) : (
        <div className="mt-8 grid gap-px bg-line">
          {SEVERITY_ORDER.map((sev) =>
            grouped[sev].length === 0 ? null : (
              <section key={sev} className="bg-surface p-4">
                <div className="flex items-center gap-2">
                  <span aria-hidden="true" className={`h-6 w-1 rounded-full ${TONE_ACCENT[SEVERITY_TONE[sev]]}`} />
                  <Chip tone={SEVERITY_TONE[sev]}>
                    {(() => {
                      const Icon = SEVERITY_ICON[sev];
                      return <Icon aria-hidden="true" className="size-3.5" />;
                    })()}
                    {t(`dash.severity.${sev}`)} · {grouped[sev].length}
                  </Chip>
                </div>
                <ul className="mt-3 grid gap-px bg-line">
                  {grouped[sev].map((row, i) => (
                    <li key={`${row.rule_key}-${row.entity_id ?? i}`} className="bg-surface p-3">
                      <div className="flex flex-wrap items-baseline justify-between gap-3">
                        <p className="text-sm text-ink">
                          <span className="label-mono text-soft">{t(`dash.rule.${row.rule_key}`, row.rule_key)}</span>
                          {" · "}
                          {row.link ? (
                            <a href={row.link} className="data-mono underline underline-offset-2">
                              {row.reference ?? t("dash.noReference")}
                            </a>
                          ) : (
                            <span className="data-mono">{row.reference ?? t("dash.noReference")}</span>
                          )}
                        </p>
                        <p className="data-mono text-sm text-ink">
                          {row.metric === null ? "—" : row.metric}
                          {row.unit ? ` ${t(`dash.unit.${row.unit}`, row.unit)}` : ""}
                        </p>
                      </div>
                      <p className="mt-1 text-sm text-ink-2">{row.detail}</p>
                      <p className="label-mono mt-1 text-soft">
                        {row.occurred_at ? formatDate(row.occurred_at, lang) : "—"}
                      </p>
                    </li>
                  ))}
                </ul>
              </section>
            ),
          )}
        </div>
      )}
    </section>
  );
}

function Thresholds({
  rules,
  onSaved,
  onError,
}: {
  rules: ExceptionRule[];
  onSaved: () => Promise<void> | void;
  onError: () => void;
}) {
  const { t } = useTranslation("admin");
  const [busy, setBusy] = useState(false);

  async function save(id: string, patch: { threshold_value?: number; active?: boolean }) {
    setBusy(true);
    try {
      await saveExceptionRule(id, patch);
      await onSaved();
    } catch (err) {
      console.error(err);
      onError();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-6 border border-line bg-surface p-4">
      <p className="label-mono text-soft">{t("dash.thresholdsTitle")}</p>
      <p className="mt-1 text-sm text-ink-2">{t("dash.thresholdsBody")}</p>
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left">
              <th className="label-mono py-2 pr-4 text-soft">{t("dash.col.rule")}</th>
              <th className="label-mono py-2 pr-4 text-soft">{t("dash.col.severity")}</th>
              <th className="label-mono py-2 pr-4 text-soft">{t("dash.col.threshold")}</th>
              <th className="label-mono py-2 pr-4 text-soft">{t("dash.col.active")}</th>
            </tr>
          </thead>
          <tbody>
            {rules.map((rule) => (
              <tr key={rule.id} className="border-t border-line">
                <td className="py-2 pr-4">{t(`dash.rule.${rule.key}`, rule.label)}</td>
                <td className="py-2 pr-4">{t(`dash.severity.${rule.severity}`, rule.severity)}</td>
                <td className="py-2 pr-4">
                  <label className="flex items-center gap-2">
                    <span className="sr-only">{t("dash.col.threshold")}</span>
                    <input
                      type="number"
                      defaultValue={Number(rule.threshold_value)}
                      disabled={busy}
                      className={field}
                      onBlur={(e) => {
                        const next = Number(e.target.value);
                        if (Number.isFinite(next) && next !== Number(rule.threshold_value)) {
                          void save(rule.id, { threshold_value: next });
                        }
                      }}
                    />
                    <span className="label-mono text-soft">{t(`dash.unit.${rule.threshold_unit}`, rule.threshold_unit)}</span>
                  </label>
                </td>
                <td className="py-2 pr-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      defaultChecked={rule.active}
                      disabled={busy}
                      onChange={(e) => void save(rule.id, { active: e.target.checked })}
                    />
                    <span className="label-mono text-soft">{t("dash.col.active")}</span>
                  </label>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
