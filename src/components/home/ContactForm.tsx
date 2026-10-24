import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/brand/Button";
import { WhatsappHandoff } from "@/components/brand/WhatsappHandoff";
import { isLang, type Lang } from "@/i18n/config";
import { createEnquiry } from "@/lib/quotes";
import { createContactLead } from "@/lib/leads";
import { useCompany } from "@/components/shell/CompanyContext";
import { phoneDisplay, telHref } from "@/lib/company";

const inputClass =
  "mt-1.5 w-full min-h-12 rounded-xl border border-line bg-canvas px-4 py-3 text-sm text-ink outline-none transition-colors motion-fast focus:border-primary focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary";

type Fields = {
  name: string;
  phone: string;
  email: string;
  from: string;
  to: string;
  date: string;
  message: string;
};

const EMPTY: Fields = { name: "", phone: "", email: "", from: "", to: "", date: "", message: "" };

export function ContactForm() {
  const { t, i18n } = useTranslation("home");
  const company = useCompany();
  const [fields, setFields] = useState<Fields>(EMPTY);
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "failed">("idle");
  const [error, setError] = useState(false);
  const [reference, setReference] = useState("");

  function set<K extends keyof Fields>(key: K, value: string) {
    setFields((prev) => ({ ...prev, [key]: value }));
    // A new attempt starts clean; a failed one no longer shows its old banner.
    if (status === "failed") setStatus("idle");
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "sending") return;
    const name = fields.name.trim();
    const phone = fields.phone.trim();
    const email = fields.email.trim();
    if (!name || (!phone && !email)) {
      setError(true);
      return;
    }
    setError(false);
    setStatus("sending");
    try {
      const payload = {
        name,
        phone,
        email,
        fromText: fields.from.trim(),
        toText: fields.to.trim(),
        preferredDate: fields.date.trim() || null,
        message: fields.message.trim(),
        language: (isLang(i18n.language) ? i18n.language : "de") as Lang,
      };
      // The lead is the record of truth; the enquiry row stays as the raw copy.
      const ref = await createContactLead(payload);
      setReference(ref);
      try {
        await createEnquiry(payload);
      } catch (enquiryError) {
        console.error("enquiry_copy_failed", enquiryError);
      }
      setFields(EMPTY);
      setStatus("done");
    } catch (err) {
      console.error(err);
      // The form and its values stay on screen — nothing typed is lost.
      setStatus("failed");
    }
  }

  if (status === "done") {
    return (
      <div className="rounded-2xl bg-surface p-6 md:p-8">
        <p className="label-mono text-primary">{t("contact.form.title")}</p>
        <h3 className="mt-4 type-h2 text-ink">{t("contact.form.sentTitle")}</h3>
        <p className="mt-3 text-sm text-ink-2">{t("contact.form.sentBody")}</p>
        {reference ? <p className="data-mono mt-2 text-sm text-ink">{reference}</p> : null}
        <Button variant="ghost" className="mt-6" onClick={() => setStatus("idle")}>
          {t("contact.form.again")}
        </Button>
      </div>
    );
  }

  return (
    <form noValidate onSubmit={onSubmit} className="rounded-2xl bg-surface p-6 md:p-8">
      <h3 className="mt-3 type-h2 text-ink">{t("contact.form.title")}</h3>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className="text-sm sm:col-span-2">
          <span className="label-mono text-soft">{t("contact.form.name")}</span>
          <input
            name="name"
            autoComplete="name"
            className={inputClass}
            value={fields.name}
            onChange={(e) => set("name", e.target.value)}
          />
        </label>
        <label className="text-sm">
          <span className="label-mono text-soft">{t("contact.form.phone")}</span>
          <input
            name="phone"
            type="tel"
            autoComplete="tel"
            className={inputClass}
            value={fields.phone}
            onChange={(e) => set("phone", e.target.value)}
          />
        </label>
        <label className="text-sm">
          <span className="label-mono text-soft">{t("contact.form.email")}</span>
          <input
            name="email"
            type="email"
            autoComplete="email"
            className={inputClass}
            value={fields.email}
            onChange={(e) => set("email", e.target.value)}
          />
        </label>
        <label className="text-sm">
          <span className="label-mono text-soft">{t("contact.form.from")}</span>
          <input
            name="from"
            className={inputClass}
            value={fields.from}
            onChange={(e) => set("from", e.target.value)}
          />
        </label>
        <label className="text-sm">
          <span className="label-mono text-soft">{t("contact.form.to")}</span>
          <input
            name="to"
            className={inputClass}
            value={fields.to}
            onChange={(e) => set("to", e.target.value)}
          />
        </label>
        <label className="text-sm sm:col-span-2">
          <span className="label-mono text-soft">{t("contact.form.date")}</span>
          <input
            name="date"
            type="date"
            className={`${inputClass} data-mono`}
            value={fields.date}
            onChange={(e) => set("date", e.target.value)}
          />
        </label>
        <label className="text-sm sm:col-span-2">
          <span className="label-mono text-soft">{t("contact.form.message")}</span>
          <textarea
            name="message"
            rows={4}
            className={inputClass}
            value={fields.message}
            onChange={(e) => set("message", e.target.value)}
          />
        </label>
      </div>

      {error ? (
        <p role="alert" className="mt-4 border-l-4 border-destructive bg-canvas px-4 py-3 text-sm text-destructive">
          {t("contact.form.error")}
        </p>
      ) : null}

      {status === "failed" ? (
        <div role="alert" className="mt-4 border-l-4 border-destructive bg-canvas px-4 py-3 text-sm">
          <p className="label-mono text-destructive">{t("contact.form.failTitle")}</p>
          <p className="mt-2 text-ink-2">{t("contact.form.failBody")}</p>
          <p className="label-mono mt-3 flex flex-wrap gap-4 text-primary">
            {company ? (
              <>
                <a href={telHref(company)}>
                  {t("contact.phone")} {phoneDisplay(company)}
                </a>
                <WhatsappHandoff context="home_contact_form_failed">
                  {t("contact.whatsapp")}
                </WhatsappHandoff>
              </>
            ) : null}
          </p>
        </div>
      ) : null}

      <Button type="submit" size="lg" className="mt-6 w-full" disabled={status === "sending"}>
        {status === "sending" ? t("contact.form.sending") : t("contact.form.submit")}
      </Button>
    </form>
  );
}
