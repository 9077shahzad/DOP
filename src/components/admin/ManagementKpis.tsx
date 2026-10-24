/**
 * Management figures — counted from real records only.
 *
 * Every number below is a database count or sum for the chosen range. Where
 * nothing has happened yet the figure is zero and the average rating is shown
 * as "—": no target, no forecast and no filler value is displayed.
 */
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button, Card, CardHeader, ErrorState, Field, Input, LoadingState } from "@/components/system";
import { formatCurrency } from "@/i18n/format";
import { useActiveLang } from "@/lib/admin-i18n";
import {
  conversionRate,
  fetchManagementKpis,
  rangeDates,
  type KpiRange,
  type ManagementKpis as Kpis,
} from "@/lib/finance";

const RANGES: Array<Exclude<KpiRange, "custom">> = ["today", "week", "month", "quarter"];

export function ManagementKpis() {
  const { t } = useTranslation("ops");
  const lang = useActiveLang();
  const [range, setRange] = useState<KpiRange>("month");
  const [from, setFrom] = useState(rangeDates("month").from);
  const [to, setTo] = useState(rangeDates("month").to);
  const [data, setData] = useState<Kpis | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Test-suite data never counts by default; admins can opt in for technical checks.
  const [includeTest, setIncludeTest] = useState(false);

  useEffect(() => {
    setData(null);
    fetchManagementKpis(from, to, includeTest)
      .then((k) => {
        setData(k);
        setError(null);
      })
      .catch(() => setError(t("common.loadFailed")));
  }, [from, to, includeTest, t]);

  function pick(next: Exclude<KpiRange, "custom">) {
    const d = rangeDates(next);
    setRange(next);
    setFrom(next === "today" ? d.to : d.from);
    setTo(d.to);
  }

  const tiles = useMemo(() => {
    if (!data) return [];
    const conv = conversionRate(data.leadsWon, data.leads);
    const quoteConv = conversionRate(data.quotesAccepted, data.quotesSent);
    const offerRate = conversionRate(data.quotes, data.dopCases);
    return [
      { key: "leads", value: String(data.leads) },
      { key: "leadsWon", value: String(data.leadsWon) },
      { key: "conversion", value: conv === null ? "—" : `${conv}%` },
      { key: "quotes", value: String(data.quotes) },
      { key: "offerRate", value: offerRate === null ? "—" : `${offerRate}%` },
      { key: "quotesSent", value: String(data.quotesSent) },
      { key: "quotesAccepted", value: String(data.quotesAccepted) },
      { key: "quoteConversion", value: quoteConv === null ? "—" : `${quoteConv}%` },
      { key: "quotesValue", value: formatCurrency(data.quotesValue, lang, 2) },
      { key: "jobs", value: String(data.jobs) },
      { key: "jobsCompleted", value: String(data.jobsCompleted) },
      { key: "jobsCancelled", value: String(data.jobsCancelled) },
      { key: "crewHours", value: String(data.crewHours) },
      { key: "incidents", value: String(data.incidents) },
      { key: "reviews", value: String(data.reviews) },
      { key: "ratingAvg", value: data.ratingAvg === null ? "—" : String(data.ratingAvg) },
      { key: "invoicedTotal", value: formatCurrency(data.invoicedTotal, lang, 2) },
      { key: "paidTotal", value: formatCurrency(data.paidTotal, lang, 2) },
      { key: "openTotal", value: formatCurrency(data.openTotal, lang, 2), currentPosition: true },
      { key: "overdueCount", value: String(data.overdueCount), currentPosition: true },
    ];
  }, [data, lang]);

  function exportCsv() {
    if (!data) return;
    const rows = [["metric", "value"], ...tiles.map((tile) => [t(`kpi.${tile.key}`), tile.value])];
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(";")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `psu-kpi-${from}-${to}.csv`;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <Card>
      <CardHeader
        eyebrow={t("common.eyebrow")}
        title={t("kpi.title")}
        action={
          <Button size="sm" variant="outline" disabled={!data} onClick={exportCsv}>
            {t("kpi.export")}
          </Button>
        }
      />
      <div className="mt-4 flex flex-wrap gap-2">
        {RANGES.map((key) => (
          <Button
            key={key}
            size="sm"
            variant={range === key ? "primary" : "outline"}
            onClick={() => pick(key)}
          >
            {t(`kpi.range.${key}`)}
          </Button>
        ))}
        <label className="ms-auto flex items-center gap-2 text-sm text-muted-foreground">
          <input type="checkbox" checked={includeTest} onChange={(e) => setIncludeTest(e.target.checked)} />
          {t("kpi.includeTest", { defaultValue: "Testdaten anzeigen" })}
        </label>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 md:grid-cols-4">
        <Field label={t("kpi.from")}>
          {(p) => (
            <Input
              {...p}
              type="date"
              value={from}
              onChange={(e) => {
                setRange("custom");
                setFrom(e.target.value);
              }}
            />
          )}
        </Field>
        <Field label={t("kpi.to")}>
          {(p) => (
            <Input
              {...p}
              type="date"
              value={to}
              onChange={(e) => {
                setRange("custom");
                setTo(e.target.value);
              }}
            />
          )}
        </Field>
      </div>

      {error ? <ErrorState className="mt-4" message={error} /> : null}
      {!data && !error ? (
        <LoadingState label={t("common.loading")} />
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tiles.map((tile) => (
            <div key={tile.key} className="border border-line bg-canvas p-4">
              <p className="label-mono text-soft">{t(`kpi.${tile.key}`)}</p>
              <p className="data-mono mt-2 text-xl">{tile.value}</p>
              {"currentPosition" in tile && tile.currentPosition ? (
                <p className="type-small mt-2 text-ink-2">{t("kpi.currentPosition")}</p>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
