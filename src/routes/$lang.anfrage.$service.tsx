/**
 * /:lang/anfrage/:service — service-specific request for the trades that need
 * a survey before anyone can quote (Unterhalt, HVAC, Elektro, Sanitär, Maler).
 *
 * This is a real intake: it creates a lead through `create_lead()` with the
 * service carried in `service_details`, honeypot + timing guard, UTM
 * attribution and queue routing. Values are never cleared on an error.
 * Services that can be priced online are redirected to the planner instead —
 * the booking action must never land on a form that cannot take the booking.
 */
import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/brand/Button";
import { useIntakeGuard } from "@/components/brand/IntakeGuard";
import { WhatsappHandoff } from "@/components/brand/WhatsappHandoff";
import { useCompany } from "@/components/shell/CompanyContext";
import { isLang, type Lang } from "@/i18n/config";
import { bookingKind } from "@/lib/booking";
import { mailHref, phoneDisplay, telHref } from "@/lib/company";
import { createServiceRequestLead, RateLimitedError } from "@/lib/leads";
import { langOf, publicHead } from "@/lib/seo";
import { isServiceId, type ServiceId } from "@/lib/services";

export const Route = createFileRoute("/$lang/anfrage/$service")({
  beforeLoad: ({ params }) => {
    if (!isServiceId(params.service)) throw notFound();
    if (bookingKind(params.service) === "planner") {
      throw redirect({ to: "/$lang/planer", params: { lang: langOf(params.lang) } });
    }
  },
  head: ({ params }) => publicHead(langOf(params.lang), "serviceRequest", `/anfrage/${params.service}`),
  component: ServiceRequestPage,
});

const inputClass =
  "mt-1.5 w-full min-h-12 rounded-xl border border-line bg-canvas px-4 py-3 text-sm text-ink outline-none transition-colors motion-fast focus:border-primary focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary";

const PROPERTY_TYPES = ["apartment", "house", "office", "commercial", "other"] as const;
const URGENCIES = ["normal", "high", "urgent"] as const;

type Fields = {
  name: string;
  company: string;
  phone: string;
  email: string;
  postcode: string;
  address: string;
  propertyType: string;
  preferredDate: string;
  urgency: string;
  message: string;
};

const EMPTY: Fields = {
  name: "",
  company: "",
  phone: "",
  email: "",
  postcode: "",
  address: "",
  propertyType: "apartment",
  preferredDate: "",
  urgency: "normal",
  message: "",
};

function ServiceRequestPage() {
  const params = Route.useParams();
  const service = params.service as ServiceId;
  const { t, i18n } = useTranslation(["intake", "svc"]);
  const company = useCompany();
  const { guard, HoneypotField } = useIntakeGuard();
  const [fields, setFields] = useState<Fields>(EMPTY);
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
    const email = fields.email.trim();
    if (!name || (!phone && !email)) {
      setError(true);
      return;
    }
    setError(false);
    setStatus("sending");
    try {
      const ref = await createServiceRequestLead({
        service,
        name,
        company: fields.company.trim(),
        phone,
        email,
        postcode: fields.postcode.trim(),
        address: fields.address.trim(),
        propertyType: fields.propertyType,
        preferredDate: fields.preferredDate,
        urgency: fields.urgency,
        message: fields.message.trim(),
        guard: guard(),
        language: (isLang(i18n.language) ? i18n.language : "de") as Lang,
      });
      setReference(ref);
      setFields(EMPTY);
      setStatus("done");
    } catch (err) {
      console.error("service_request_lead_failed", err);
      setStatus(err instanceof RateLimitedError ? "throttled" : "failed");
    }
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 md:grid-cols-2 md:px-8">
      <div>
        <p className="label-mono text-primary">{t("intake:request.eyebrow")}</p>
        <h1 className="mt-3 type-h1 text-ink">{t(`svc:${service}.title`)}</h1>
        <p className="mt-3 text-sm text-ink-2">{t("intake:request.subtitle")}</p>
        <p className="mt-6 border-l-4 border-primary bg-card px-4 py-3 text-sm text-ink-2">
          {t("intake:request.surveyNote")}
        </p>

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
            <div>
              <dt className="label-mono text-soft">{t("intake:contact.email")}</dt>
              <dd>
                <a className="text-primary" href={mailHref(company)}>
                  {company.email}
                </a>
              </dd>
            </div>
          </dl>
        ) : null}

        <div className="mt-6">
          <WhatsappHandoff context={`service_request_${service}`}>{t("intake:contact.whatsapp")}</WhatsappHandoff>
        </div>
      </div>

      {status === "done" ? (
        <div className="rounded-2xl bg-surface p-6 md:p-8">
          <h2 className="type-h2 text-ink">{t("intake:sent.title")}</h2>
          <p className="mt-3 text-sm text-ink-2">{t("intake:request.sentBody")}</p>
          <p className="data-mono mt-2 text-sm text-ink">{reference}</p>
          <Button variant="ghost" className="mt-6" onClick={() => setStatus("idle")}>
            {t("intake:sent.again")}
          </Button>
        </div>
      ) : (
        <form noValidate onSubmit={onSubmit} className="rounded-2xl bg-surface p-6 md:p-8">
          <h2 className="type-h2 text-ink">{t("intake:request.formTitle")}</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <label className="text-sm">
              <span className="label-mono text-soft">{t("intake:field.name")}</span>
              <input
                autoComplete="name"
                className={inputClass}
                value={fields.name}
                onChange={(e) => set("name", e.target.value)}
              />
            </label>
            <label className="text-sm">
              <span className="label-mono text-soft">{t("intake:field.company")}</span>
              <input
                autoComplete="organization"
                className={inputClass}
                value={fields.company}
                onChange={(e) => set("company", e.target.value)}
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
              <span className="label-mono text-soft">{t("intake:field.postcode")}</span>
              <input
                inputMode="numeric"
                autoComplete="postal-code"
                className={inputClass}
                value={fields.postcode}
                onChange={(e) => set("postcode", e.target.value)}
              />
            </label>
            <label className="text-sm">
              <span className="label-mono text-soft">{t("intake:field.address")}</span>
              <input
                autoComplete="street-address"
                className={inputClass}
                value={fields.address}
                onChange={(e) => set("address", e.target.value)}
              />
            </label>
            <label className="text-sm">
              <span className="label-mono text-soft">{t("intake:field.propertyType")}</span>
              <select
                className={inputClass}
                value={fields.propertyType}
                onChange={(e) => set("propertyType", e.target.value)}
              >
                {PROPERTY_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {t(`intake:propertyType.${type}`)}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="label-mono text-soft">{t("intake:field.urgency")}</span>
              <select className={inputClass} value={fields.urgency} onChange={(e) => set("urgency", e.target.value)}>
                {URGENCIES.map((level) => (
                  <option key={level} value={level}>
                    {t(`intake:urgency.${level}`)}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm sm:col-span-2">
              <span className="label-mono text-soft">{t("intake:field.preferredDate")}</span>
              <input
                type="date"
                className={inputClass}
                value={fields.preferredDate}
                onChange={(e) => set("preferredDate", e.target.value)}
              />
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
              {t("intake:error.requestRequired")}
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
              {t("intake:error.send")}
            </p>
          ) : null}

          <Button type="submit" className="mt-6" disabled={status === "sending"}>
            {status === "sending" ? t("intake:sending") : t("intake:request.submit")}
          </Button>
        </form>
      )}
    </div>
  );
}
