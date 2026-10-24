/**
 * /:lang/kontakt — contact page with the callback request form.
 * The callback creates a lead (source `website_form`) routed to the
 * Sales / Dispatch queue; entered values survive validation and send errors.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/brand/Button";
import { WhatsappHandoff } from "@/components/brand/WhatsappHandoff";
import { useCompany } from "@/components/shell/CompanyContext";
import { isLang, type Lang } from "@/i18n/config";
import {
  addressFull,
  mailHref,
  mobileHref,
  openingHoursLines,
  phoneDisplay,
  telHref,
} from "@/lib/company";
import { useIntakeGuard } from "@/components/brand/IntakeGuard";
import { createCallbackLead, RateLimitedError } from "@/lib/leads";
import { langOf, publicHead } from "@/lib/seo";

export const Route = createFileRoute("/$lang/kontakt")({
  head: ({ params }) => publicHead(langOf(params.lang), "contact", "/kontakt"),
  component: ContactPage,
});

const inputClass =
  "mt-1.5 w-full min-h-12 rounded-xl border border-line bg-canvas px-4 py-3 text-sm text-ink outline-none transition-colors motion-fast focus:border-primary focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary";

const SLOTS = ["morning", "midday", "afternoon", "evening"] as const;
const TOPICS = ["move", "cleaning", "handover", "existing", "other"] as const;

type Fields = { name: string; phone: string; email: string; timeSlot: string; topic: string; message: string };

const EMPTY: Fields = { name: "", phone: "", email: "", timeSlot: "morning", topic: "move", message: "" };

function ContactPage() {
  const { t, i18n } = useTranslation(["intake", "home"]);
  const company = useCompany();
  const [fields, setFields] = useState<Fields>(EMPTY);
  const { guard, HoneypotField } = useIntakeGuard();
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "failed" | "throttled">("idle");
  const [error, setError] = useState(false);
  const [reference, setReference] = useState("");

  function set<K extends keyof Fields>(key: K, value: string) {
    setFields((prev) => ({ ...prev, [key]: value }));
    if (status === "failed") setStatus("idle");
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "sending") return;
    const name = fields.name.trim();
    const phone = fields.phone.trim();
    if (!name || !phone) {
      setError(true);
      return;
    }
    setError(false);
    setStatus("sending");
    try {
      const ref = await createCallbackLead({
        name,
        phone,
        email: fields.email.trim(),
        timeSlot: fields.timeSlot,
        topic: fields.topic,
        message: fields.message.trim(),
        guard: guard(),
        language: (isLang(i18n.language) ? i18n.language : "de") as Lang,
      });
      setReference(ref);
      setFields(EMPTY);
      setStatus("done");
    } catch (err) {
      console.error("callback_lead_failed", err);
      // Values are never cleared on failure — the form keeps what was typed.
      setStatus(err instanceof RateLimitedError ? "throttled" : "failed");
    }
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 md:grid-cols-2 md:px-8">
      <div>
        <p className="label-mono text-primary">{t("intake:callback.eyebrow")}</p>
        <h1 className="mt-3 type-h1 text-ink">{t("intake:callback.title")}</h1>
        <p className="mt-3 text-sm text-ink-2">{t("intake:callback.subtitle")}</p>

        {company ? (
          <dl className="mt-8 space-y-4 text-sm">
            <div>
              <dt className="label-mono text-soft">{t("intake:contact.phone")}</dt>
              <dd>
                <a className="text-primary" href={telHref(company)}>
                  {phoneDisplay(company)}
                </a>
              </dd>
            </div>
            {company.mobile_phone ? (
              <div>
                <dt className="label-mono text-soft">{t("intake:contact.mobile")}</dt>
                <dd>
                  <a className="text-primary" href={mobileHref(company)}>
                    {company.mobile_phone}
                  </a>
                </dd>
              </div>
            ) : null}
            <div>
              <dt className="label-mono text-soft">{t("intake:contact.email")}</dt>
              <dd>
                <a className="text-primary" href={mailHref(company)}>
                  {company.email}
                </a>
              </dd>
            </div>
            <div>
              <dt className="label-mono text-soft">{t("intake:contact.address")}</dt>
              <dd className="text-ink-2">{addressFull(company)}</dd>
            </div>
            {openingHoursLines(company).length > 0 ? (
              <div>
                <dt className="label-mono text-soft">{t("intake:contact.hours")}</dt>
                <dd className="text-ink-2">
                  {openingHoursLines(company).map((line) => (
                    <span key={line} className="block">
                      {line}
                    </span>
                  ))}
                </dd>
              </div>
            ) : null}
          </dl>
        ) : null}

        <div className="mt-6">
          <WhatsappHandoff context="contact_page">{t("intake:contact.whatsapp")}</WhatsappHandoff>
        </div>
      </div>

      {status === "done" ? (
        <div className="rounded-2xl bg-surface p-6 md:p-8">
          <h2 className="type-h2 text-ink">{t("intake:sent.title")}</h2>
          <p className="mt-3 text-sm text-ink-2">{t("intake:callback.sentBody")}</p>
          <p className="data-mono mt-2 text-sm text-ink">{reference}</p>
          <Button variant="ghost" className="mt-6" onClick={() => setStatus("idle")}>
            {t("intake:sent.again")}
          </Button>
        </div>
      ) : (
        <form noValidate onSubmit={onSubmit} className="rounded-2xl bg-surface p-6 md:p-8">
          <h2 className="type-h2 text-ink">{t("intake:callback.formTitle")}</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <label className="text-sm sm:col-span-2">
              <span className="label-mono text-soft">{t("intake:field.name")}</span>
              <input
                autoComplete="name"
                className={inputClass}
                value={fields.name}
                onChange={(e) => set("name", e.target.value)}
              />
            </label>
            <label className="text-sm">
              <span className="label-mono text-soft">{t("intake:field.phone")}</span>
              <input
                type="tel"
                autoComplete="tel"
                className={inputClass}
                value={fields.phone}
                onChange={(e) => set("phone", e.target.value)}
              />
            </label>
            <label className="text-sm">
              <span className="label-mono text-soft">{t("intake:field.email")}</span>
              <input
                type="email"
                autoComplete="email"
                className={inputClass}
                value={fields.email}
                onChange={(e) => set("email", e.target.value)}
              />
            </label>
            <label className="text-sm">
              <span className="label-mono text-soft">{t("intake:field.timeSlot")}</span>
              <select className={inputClass} value={fields.timeSlot} onChange={(e) => set("timeSlot", e.target.value)}>
                {SLOTS.map((slot) => (
                  <option key={slot} value={slot}>
                    {t(`intake:slot.${slot}`)}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="label-mono text-soft">{t("intake:field.topic")}</span>
              <select className={inputClass} value={fields.topic} onChange={(e) => set("topic", e.target.value)}>
                {TOPICS.map((topic) => (
                  <option key={topic} value={topic}>
                    {t(`intake:topic.${topic}`)}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm sm:col-span-2">
              <span className="label-mono text-soft">{t("intake:field.message")}</span>
              <textarea
                rows={4}
                className={inputClass}
                value={fields.message}
                onChange={(e) => set("message", e.target.value)}
              />
            </label>
          </div>

          {error ? (
            <p role="alert" className="mt-4 border-l-4 border-destructive bg-canvas px-4 py-3 text-sm text-destructive">
              {t("intake:error.callbackRequired")}
            </p>
          ) : null}
          <HoneypotField />
          {status === "throttled" ? (
            <p role="alert" className="mt-4 border-l-4 border-destructive bg-canvas px-4 py-3 text-sm text-destructive">
              {t("intake:error.throttled")}
            </p>
          ) : null}
          {status === "failed" ? (
            <p role="alert" className="mt-4 border-l-4 border-destructive bg-canvas px-4 py-3 text-sm text-destructive">
              {t("intake:error.failed")}
            </p>
          ) : null}

          <Button type="submit" className="mt-6" disabled={status === "sending"}>
            {status === "sending" ? t("intake:sending") : t("intake:callback.submit")}
          </Button>
        </form>
      )}
    </div>
  );
}
