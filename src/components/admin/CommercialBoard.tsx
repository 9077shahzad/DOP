/**
 * Commercial stages of the order book: issued customer quotes and the work
 * orders they turn into. The stage (Richtwert → Offerte → Vertragspreis →
 * Rechnung) is the commercial label; the status is the lifecycle state.
 */
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { formatCurrency, formatDate } from "@/i18n/format";
import { useActiveLang } from "@/lib/admin-i18n";
import {
  PRICE_STAGES,
  fetchIssuedQuotes,
  fetchWorkOrders,
  setIssuedQuoteStage,
  type IssuedQuote,
  type PriceStage,
  type WorkOrderRow,
} from "@/lib/commercial";

export function CommercialBoard() {
  const { t } = useTranslation("admin");
  const lang = useActiveLang();
  const [quotes, setQuotes] = useState<IssuedQuote[] | null>(null);
  const [orders, setOrders] = useState<WorkOrderRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const [q, w] = await Promise.all([fetchIssuedQuotes(), fetchWorkOrders()]);
        setQuotes(q);
        setOrders(w);
      } catch {
        setError(t("commercial.loadError"));
        setQuotes([]);
        setOrders([]);
      }
    })();
  }, [t]);

  async function changeStage(id: string, stage: PriceStage) {
    setQuotes((prev) => prev?.map((q) => (q.id === id ? { ...q, price_stage: stage } : q)) ?? prev);
    try {
      await setIssuedQuoteStage(id, stage);
    } catch {
      setError(t("commercial.saveError"));
    }
  }

  return (
    <section className="mt-12">
      <p className="label-mono text-primary">{t("commercial.eyebrow")}</p>
      <h2 className="mt-2 text-2xl md:text-3xl">{t("commercial.title")}</h2>

      {error ? (
        <p role="alert" className="mt-4 border-l-4 border-destructive bg-surface px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <h3 className="label-mono mt-8 text-soft">{t("commercial.quotes")}</h3>
      {quotes === null ? (
        <p className="label-mono mt-3 text-soft">{t("common.loading")}</p>
      ) : quotes.length === 0 ? (
        <p className="mt-3 text-ink-2">{t("commercial.emptyQuotes")}</p>
      ) : (
        <div className="mt-3 overflow-x-auto border border-line bg-surface">
          <table className="w-full min-w-[48rem] text-start text-sm">
            <thead>
              <tr className="border-b border-line">
                {["reference", "date", "total", "validUntil", "status", "stage"].map((h) => (
                  <th key={h} scope="col" className="label-mono px-4 py-3 text-start text-soft">
                    {t(`commercial.col.${h}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {quotes.map((row) => (
                <tr key={row.id} className="border-b border-line last:border-b-0">
                  <td className="data-mono px-4 py-3 text-ink">{row.reference}</td>
                  <td className="data-mono px-4 py-3 text-soft">{formatDate(row.created_at, lang)}</td>
                  <td className="data-mono px-4 py-3 text-ink">
                    {formatCurrency(Number(row.total ?? 0), lang)}
                  </td>
                  <td className="data-mono px-4 py-3 text-soft">
                    {row.valid_until ? formatDate(row.valid_until, lang) : "—"}
                  </td>
                  <td className="px-4 py-3 text-ink-2">
                    {t(`commercial.quoteStatus.${row.status}`, row.status)}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      aria-label={t("commercial.stageAria", { reference: row.reference })}
                      value={row.price_stage}
                      onChange={(e) => void changeStage(row.id, e.target.value as PriceStage)}
                      className="data-mono border border-line bg-canvas px-2 py-1 text-xs"
                    >
                      {PRICE_STAGES.map((s) => (
                        <option key={s} value={s}>
                          {t(`commercial.stage.${s}`)}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h3 className="label-mono mt-10 text-soft">{t("commercial.workOrders")}</h3>
      {orders === null ? (
        <p className="label-mono mt-3 text-soft">{t("common.loading")}</p>
      ) : orders.length === 0 ? (
        <p className="mt-3 text-ink-2">{t("commercial.emptyWorkOrders")}</p>
      ) : (
        <div className="mt-3 overflow-x-auto border border-line bg-surface">
          <table className="w-full min-w-[48rem] text-start text-sm">
            <thead>
              <tr className="border-b border-line">
                {["reference", "service", "due", "value", "status"].map((h) => (
                  <th key={h} scope="col" className="label-mono px-4 py-3 text-start text-soft">
                    {t(`commercial.col.${h}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.map((row) => (
                <tr key={row.id} className="border-b border-line last:border-b-0">
                  <td className="data-mono px-4 py-3 text-ink">{row.reference}</td>
                  <td className="px-4 py-3 text-ink-2">{row.service}</td>
                  <td className="data-mono px-4 py-3 text-soft">
                    {row.due_on ? formatDate(row.due_on, lang) : "—"}
                  </td>
                  <td className="data-mono px-4 py-3 text-ink">
                    {row.value == null ? "—" : formatCurrency(Number(row.value), lang)}
                  </td>
                  <td className="px-4 py-3 text-ink-2">
                    {t(`commercial.workStatus.${row.status}`, row.status)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
