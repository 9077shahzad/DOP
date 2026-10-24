/**
 * Controlled correction of customer details after acceptance.
 *
 * Only administrative fields (name spelling, contact, billing address) can be
 * corrected here; the accepted offer and its snapshot stay untouched and every
 * change is written to the history with before/after values. Contractual
 * changes (date, addresses of the move, scope, price, terms) are never done
 * here: they go through a "Nachtrag" on the order, which the customer approves.
 */
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { btn, btnPrimary, field } from "@/components/system";
import { supabase } from "@/integrations/supabase/client";
import { joinName, splitName } from "@/lib/person-name";
import type { QuoteRow } from "@/lib/quotes";

const KEYS = ["customer_company", "customer_phone", "customer_email", "customer_street", "customer_zip", "customer_city", "customer_country"] as const;
const LABEL: Record<(typeof KEYS)[number], string> = {
  customer_company: "corr.company", customer_phone: "corr.phone", customer_email: "corr.email",
  customer_street: "corr.street", customer_zip: "corr.zip", customer_city: "corr.city", customer_country: "corr.country",
};

export function CustomerCorrection({ quote, onSaved }: { quote: QuoteRow; onSaved: () => void }) {
  const { t } = useTranslation("dop");
  const [open, setOpen] = useState(false);
  const initial = splitName(quote.customer_name);
  const [first, setFirst] = useState(initial.first);
  const [last, setLast] = useState(initial.last);
  const [vals, setVals] = useState<Record<string, string>>(() => Object.fromEntries(KEYS.map((k) => [k, String(quote[k] ?? "")])));
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function save() {
    if (!reason.trim()) return setMsg({ ok: false, text: t("corr.needReason") });
    if (!first.trim() || !last.trim()) return setMsg({ ok: false, text: t("corr.needName") });
    const payload: Record<string, string> = {};
    const name = joinName(first, last);
    if (name !== (quote.customer_name ?? "")) payload["customer_name"] = name;
    for (const k of KEYS) if (vals[k]!.trim() !== String(quote[k] ?? "")) payload[k] = vals[k]!.trim();
    if (!Object.keys(payload).length) return setMsg({ ok: false, text: t("corr.noChange") });
    setBusy(true); setMsg(null);
    const { error } = await supabase.rpc("dop_correct_customer", { _quote_id: quote.id, _payload: payload, _reason: reason.trim() });
    setBusy(false);
    if (error) {
      const m = error.message;
      return setMsg({ ok: false, text: m.includes("invalid_email") ? t("corr.invalidEmail") : t("corr.notSaved", { msg: m }) });
    }
    setReason(""); setOpen(false);
    setMsg({ ok: true, text: t("corr.saved") });
    onSaved();
  }

  return (
    <section className="rounded-md border border-line bg-surface p-4" aria-label={t("corr.open")}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="label-mono text-primary">{t("corr.title")}</h3>
        {!open ? <button type="button" className={btn} onClick={() => { setOpen(true); setMsg(null); }}>{t("corr.open")}</button> : null}
      </div>
      {msg ? <p role={msg.ok ? "status" : "alert"} className={`mt-2 text-sm ${msg.ok ? "text-success" : "text-destructive"}`}>{msg.text}</p> : null}
      {open ? (
        <div className="mt-3 space-y-3">
          <p className="text-sm text-ink-2">
            {t("corr.help1")} {t("corr.help2")}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">{t("corr.first")}<input className={field} value={first} onChange={(e) => setFirst(e.target.value)} /></label>
            <label className="text-sm">{t("corr.last")}<input className={field} value={last} onChange={(e) => setLast(e.target.value)} /></label>
            {KEYS.map((k) => (
              <label key={k} className="text-sm">{t(LABEL[k])}
                <input className={field} value={vals[k]} onChange={(e) => setVals({ ...vals, [k]: e.target.value })} />
              </label>
            ))}
          </div>
          <label className="block text-sm">{t("corr.reason")}
            <input className={field} value={reason} onChange={(e) => setReason(e.target.value)} />
          </label>
          <div className="flex gap-3">
            <button type="button" className={btnPrimary} disabled={busy} onClick={() => void save()}>{busy ? t("common.saving") : t("corr.save")}</button>
            <button type="button" className={btn} onClick={() => setOpen(false)}>{t("common.cancel")}</button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
