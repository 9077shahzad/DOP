/**
 * Admin quote builder — turns a lead into an issued customer quote.
 *
 * Pricing, VAT and the approval limit all live in the database function
 * create_customer_quote(); this form only collects the line values and
 * reports what the database decided (created, or approval required).
 */
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { formatCurrency } from "@/i18n/format";
import { useActiveLang } from "@/lib/admin-i18n";
import { createCustomerQuote, type CustomerQuoteResult } from "@/lib/commercial";
import { supabase } from "@/integrations/supabase/client";

type LeadOption = { id: string; reference: string; customer_name: string | null; status: string };

const LINES = ["labour", "materials", "transport", "equipment", "disposal"] as const;
type LineKey = (typeof LINES)[number];

const inputClass =
  "mt-1 w-full border border-line bg-canvas px-3 py-2 text-sm text-ink outline-none focus:border-ink";
const btn =
  "bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-60";

export function QuoteBuilder({ onCreated }: { onCreated?: () => void }) {
  const { t } = useTranslation("admin");
  const lang = useActiveLang();

  const [leads, setLeads] = useState<LeadOption[] | null>(null);
  const [leadId, setLeadId] = useState("");
  const [values, setValues] = useState<Record<LineKey, string>>({
    labour: "",
    materials: "",
    transport: "",
    equipment: "",
    disposal: "",
  });
  const [discount, setDiscount] = useState("0");
  const [terms, setTerms] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CustomerQuoteResult | null>(null);

  useEffect(() => {
    void (async () => {
      const { data, error: readError } = await supabase
        .from("leads")
        .select("id, reference, customer_name, status")
        .order("created_at", { ascending: false })
        .limit(100);
      if (readError) {
        setLeads([]);
        setError(t("builder.loadError"));
        return;
      }
      setLeads((data ?? []) as LeadOption[]);
    })();
  }, [t]);

  const net = LINES.reduce((sum, key) => sum + (Number(values[key]) || 0), 0);
  const discountPct = Number(discount) || 0;
  const preview = net * (1 - discountPct / 100);

  async function submit() {
    if (!leadId) {
      setError(t("builder.leadRequired"));
      return;
    }
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const created = await createCustomerQuote({
        leadId,
        labour: Number(values.labour) || 0,
        materials: Number(values.materials) || 0,
        transport: Number(values.transport) || 0,
        equipment: Number(values.equipment) || 0,
        disposal: Number(values.disposal) || 0,
        discountPct,
        terms,
      });
      setResult(created);
      if (created.status === "created") onCreated?.();
    } catch {
      setError(t("builder.saveError"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-12 border border-ink bg-surface p-5 md:p-7">
      <p className="label-mono text-primary">{t("builder.eyebrow")}</p>
      <h2 className="mt-2 text-2xl md:text-3xl">{t("builder.title")}</h2>
      <p className="mt-2 max-w-2xl text-sm text-ink-2">{t("builder.intro")}</p>

      {error ? (
        <p role="alert" className="mt-4 border-l-4 border-destructive bg-canvas px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <label className="text-sm md:col-span-3">
          <span className="label-mono text-soft">{t("builder.lead")}</span>
          <select value={leadId} onChange={(e) => setLeadId(e.target.value)} className={inputClass}>
            <option value="">{leads === null ? t("common.loading") : t("builder.leadPlaceholder")}</option>
            {(leads ?? []).map((lead) => (
              <option key={lead.id} value={lead.id}>
                {lead.reference} · {lead.customer_name || "—"}
              </option>
            ))}
          </select>
        </label>

        {LINES.map((key) => (
          <label key={key} className="text-sm">
            <span className="label-mono text-soft">{t(`builder.line.${key}`)}</span>
            <input
              type="number"
              min={0}
              step="0.05"
              value={values[key]}
              onChange={(e) => setValues({ ...values, [key]: e.target.value })}
              className={`${inputClass} data-mono`}
            />
          </label>
        ))}

        <label className="text-sm">
          <span className="label-mono text-soft">{t("builder.discount")}</span>
          <input
            type="number"
            min={0}
            max={100}
            step="0.5"
            value={discount}
            onChange={(e) => setDiscount(e.target.value)}
            className={`${inputClass} data-mono`}
          />
        </label>

        <label className="text-sm md:col-span-3">
          <span className="label-mono text-soft">{t("builder.terms")}</span>
          <textarea rows={2} value={terms} onChange={(e) => setTerms(e.target.value)} className={inputClass} />
        </label>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-4">
        <button type="button" className={btn} disabled={busy} onClick={() => void submit()}>
          {busy ? t("builder.saving") : t("builder.create")}
        </button>
        <p className="data-mono text-sm text-ink-2">
          {t("builder.preview")}: {formatCurrency(preview, lang)}
        </p>
      </div>

      {result ? (
        <p
          role="status"
          className="mt-4 border-l-4 border-primary bg-canvas px-4 py-3 text-sm text-ink"
        >
          {result.status === "created"
            ? t("builder.created", {
                reference: result.reference,
                total: formatCurrency(result.total, lang),
              })
            : t("builder.approvalRequired", { role: result.requiredRole, scope: result.scope })}
        </p>
      ) : null}
    </section>
  );
}
