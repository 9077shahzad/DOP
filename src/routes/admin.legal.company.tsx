import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { User } from "@supabase/supabase-js";

import { Button } from "@/components/brand/Button";
import { supabase } from "@/integrations/supabase/client";
import { langOf, privateHead } from "@/lib/seo";
import { BANK_FIELDS, COMPANY_FIELDS, CONTACT_FIELDS, CURRENCY } from "@/lib/legal";
import { fetchLegalEntityAdmin, saveLegalEntity, type LegalEntity } from "@/lib/legal-data";
import { formatIban, isValidIban, normalizeIban } from "@/lib/documents/qr-bill";
import { detectLanguage } from "@/i18n/config";

export const Route = createFileRoute("/admin/legal/company")({
  ssr: false,
  head: () => privateHead(langOf(detectLanguage()), "legalCompany"),
  component: LegalCompanyAdmin,
});

type OpeningHoursRow = { days: string; from: string; to: string };

function LegalCompanyAdmin() {
  const { t } = useTranslation("legal");
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [row, setRow] = useState<LegalEntity | null>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) =>
      setUser(session?.user ?? null),
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    void fetchLegalEntityAdmin()
      .then(setRow)
      .catch(() => setStatus("error"));
  }, [user]);

  function patch(field: string, value: string) {
    setRow((prev) => (prev ? { ...prev, [field]: value } : prev));
  }

  /** Opening-hours rows are stored as [{ days, from, to }] on the entity. */
  function hourRows(entity: LegalEntity): OpeningHoursRow[] {
    return Array.isArray(entity.opening_hours) ? (entity.opening_hours as OpeningHoursRow[]) : [];
  }

  function patchHours(index: number, key: keyof OpeningHoursRow, value: string) {
    setRow((prev) => {
      if (!prev) return prev;
      const rows = hourRows(prev).map((r, i) => (i === index ? { ...r, [key]: value } : r));
      return { ...prev, opening_hours: rows };
    });
  }

  function addHourRow() {
    setRow((prev) =>
      prev ? { ...prev, opening_hours: [...hourRows(prev), { days: "", from: "", to: "" }] } : prev,
    );
  }

  function removeHourRow(index: number) {
    setRow((prev) =>
      prev ? { ...prev, opening_hours: hourRows(prev).filter((_, i) => i !== index) } : prev,
    );
  }

  async function save(entity: LegalEntity) {
    setStatus("saving");
    try {
      const complete = COMPANY_FIELDS.every((f) => String(entity[f] ?? "").trim().length > 0);
      const iban = normalizeIban(entity.iban);
      const qrIban = normalizeIban(entity.qr_iban);
      if (iban && !isValidIban(iban)) throw new Error("invalid_iban");
      // The payment account may be a bank-issued QR-IBAN (structured QRR
      // reference) or an ordinary IBAN (NON reference, invoice number in the
      // message). Both are valid Swiss QR bills; only a malformed IBAN is not.
      if (qrIban && !isValidIban(qrIban)) throw new Error("invalid_qr_iban");
      await saveLegalEntity(entity.id, {
        legal_name: entity.legal_name,
        register_number: entity.register_number,
        vat_number: entity.vat_number,
        address_line: entity.address_line,
        postal_code: entity.postal_code,
        city: entity.city,
        canton: entity.canton,
        email: entity.email,
        phone: entity.phone,
        mobile_phone: entity.mobile_phone,
        website: entity.website,
        opening_hours: entity.opening_hours,
        bank_name: entity.bank_name.trim(),
        iban,
        qr_iban: qrIban,
        status: complete ? "complete" : "pending",
      });
      setRow({ ...entity, status: complete ? "complete" : "pending" });
      setStatus("saved");
    } catch {
      setStatus("error");
    }
  }

  if (!ready) return <p className="label-mono p-8 text-soft">{t("loading")}</p>;
  if (!user) return <p className="mx-auto max-w-3xl p-8 text-ink-2">{t("admin.signInRequired")}</p>;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 md:px-8">
      <h1 className="text-3xl">{t("admin.title")}</h1>
      <p className="mt-3 max-w-2xl text-ink-2">{t("admin.lead")}</p>
      {status === "error" ? (
        <p role="alert" className="mt-4 border-s-4 border-destructive bg-surface p-3 text-ink">
          {t("admin.error")}
        </p>
      ) : null}
      {status === "saved" ? (
        <p role="status" className="label-mono mt-4 text-success">
          {t("admin.saved")}
        </p>
      ) : null}

      {row ? (
        <section className="mt-8 border border-line bg-surface p-5">
          <header className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="text-xl">{t("country")}</h2>
            <p className="label-mono flex gap-3 text-soft">
              <span>{CURRENCY}</span>
              <span>{t("regime.swiss")}</span>
              <span className={row.status === "complete" ? "text-success" : "text-warning"}>
                {t(`entityStatus.${row.status}`)}
              </span>
            </p>
          </header>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {COMPANY_FIELDS.map((field) => {
              const id = `entity-${field}`;
              return (
                <div key={field}>
                  <label htmlFor={id} className="label-mono block text-soft">
                    {t(`fields.${field}`)}
                  </label>
                  <input
                    id={id}
                    value={String(row[field] ?? "")}
                    placeholder={t("pending")}
                    inputMode={field === "phone" ? "tel" : undefined}
                    onChange={(e) => patch(field, e.target.value)}
                    className="mt-1 h-11 w-full border border-line bg-canvas px-3 text-ink focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
                  />
                </div>
              );
            })}
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {CONTACT_FIELDS.map((field) => {
              const id = `entity-${field}`;
              return (
                <div key={field}>
                  <label htmlFor={id} className="label-mono block text-soft">
                    {t(`fields.${field}`)}
                  </label>
                  <input
                    id={id}
                    value={String(row[field] ?? "")}
                    placeholder={t("pending")}
                    inputMode={field === "mobile_phone" ? "tel" : "url"}
                    onChange={(e) => patch(field, e.target.value)}
                    className="mt-1 h-11 w-full border border-line bg-canvas px-3 text-ink focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
                  />
                </div>
              );
            })}
          </div>

          <fieldset className="mt-6 border border-line p-4">
            <legend className="label-mono px-2 text-soft">{t("admin.bankTitle")}</legend>
            <p className="type-small text-ink-2">{t("admin.bankLead")}</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {BANK_FIELDS.map((field) => {
                const id = `entity-${field}`;
                const value = String(row[field] ?? "");
                const invalid = field === "iban"
                  ? Boolean(value && !isValidIban(value))
                  : field === "qr_iban"
                    ? Boolean(value && !isValidIban(value))
                    : false;
                return (
                  <div key={field}>
                    <label htmlFor={id} className="label-mono block text-soft">{t(`fields.${field}`)}</label>
                    <input
                      id={id}
                      value={field === "bank_name" ? value : formatIban(value)}
                      placeholder={t("pending")}
                      aria-invalid={invalid}
                      onChange={(e) => patch(field, e.target.value)}
                      className="mt-1 h-11 w-full border border-line bg-canvas px-3 text-ink focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
                    />
                    {invalid ? <p className="mt-1 text-sm text-destructive">{t(`admin.${field}Invalid`)}</p> : null}
                  </div>
                );
              })}
            </div>
          </fieldset>

          <fieldset className="mt-6 border border-line p-4">
            <legend className="label-mono px-2 text-soft">{t("fields.opening_hours")}</legend>
            <div className="space-y-3">
              {hourRows(row).map((hours, index) => (
                <div key={index} className="flex flex-wrap items-end gap-3">
                  <label className="flex-1">
                    <span className="label-mono block text-soft">{t("fields.hoursDays")}</span>
                    <input
                      value={hours.days}
                      onChange={(e) => patchHours(index, "days", e.target.value)}
                      className="mt-1 h-11 w-full border border-line bg-canvas px-3 text-ink focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
                    />
                  </label>
                  <label>
                    <span className="label-mono block text-soft">{t("fields.hoursFrom")}</span>
                    <input
                      type="time"
                      value={hours.from}
                      onChange={(e) => patchHours(index, "from", e.target.value)}
                      className="mt-1 h-11 border border-line bg-canvas px-3 text-ink focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
                    />
                  </label>
                  <label>
                    <span className="label-mono block text-soft">{t("fields.hoursTo")}</span>
                    <input
                      type="time"
                      value={hours.to}
                      onChange={(e) => patchHours(index, "to", e.target.value)}
                      className="mt-1 h-11 border border-line bg-canvas px-3 text-ink focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
                    />
                  </label>
                  <Button variant="ghost" onClick={() => removeHourRow(index)}>
                    {t("admin.removeRow")}
                  </Button>
                </div>
              ))}
              <Button variant="ghost" onClick={addHourRow}>
                {t("admin.addRow")}
              </Button>
            </div>
          </fieldset>

          <div className="mt-5">
            <Button variant="primary" onClick={() => void save(row)} disabled={status === "saving"}>
              {status === "saving" ? t("admin.saving") : t("admin.save")}
            </Button>
          </div>
        </section>
      ) : (
        <p className="label-mono mt-8 text-soft">{t("loading")}</p>
      )}
    </div>
  );
}
