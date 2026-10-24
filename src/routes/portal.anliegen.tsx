/**
 * /portal/anliegen — support and other requests from the customer portal.
 * Creates a lead routed to the Customer Support queue (or, when a booking
 * reference is given, the existing-booking support rule) with the queue SLA
 * and an intended-send notification logged against the record.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";

import { usePortal } from "@/components/portal/PortalContext";
import { Button, Card, Field, Input, Select, Textarea } from "@/components/system";
import i18n, { isLang, type Lang } from "@/i18n/config";
import { useIntakeGuard } from "@/components/brand/IntakeGuard";
import { createSupportLead, RateLimitedError } from "@/lib/leads";
import { langOf, privateHead } from "@/lib/seo";

export const Route = createFileRoute("/portal/anliegen")({
  ssr: false,
  head: () => privateHead(langOf(i18n.language), "portalSupport"),
  component: SupportPage,
});

const TOPICS = ["booking_change", "quality", "invoice", "access", "other"] as const;
const URGENCIES = ["normal", "high", "urgent"] as const;

type Fields = {
  name: string;
  phone: string;
  email: string;
  topic: string;
  bookingReference: string;
  urgency: string;
  message: string;
};

const EMPTY: Fields = {
  name: "",
  phone: "",
  email: "",
  topic: "booking_change",
  bookingReference: "",
  urgency: "normal",
  message: "",
};

function SupportPage() {
  const { data, user } = usePortal();
  const { t, i18n: inst } = useTranslation(["portal", "intake"]);
  const [fields, setFields] = useState<Fields>({
    ...EMPTY,
    name: data.profile?.full_name ?? "",
    email: user?.email ?? "",
  });
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
    const message = fields.message.trim();
    const email = fields.email.trim();
    if (!name || !message || (!email && !fields.phone.trim())) {
      setError(true);
      return;
    }
    setError(false);
    setStatus("sending");
    try {
      const ref = await createSupportLead({
        name,
        phone: fields.phone.trim(),
        email,
        topic: fields.topic,
        bookingReference: fields.bookingReference.trim(),
        urgency: fields.urgency,
        organization: data.organization?.name ?? "",
        message,
        guard: guard(),
        language: (isLang(inst.language) ? inst.language : "de") as Lang,
      });
      setReference(ref);
      setFields({ ...EMPTY, name, email });
      setStatus("done");
    } catch (err) {
      console.error("support_lead_failed", err);
      // Values are never cleared on failure — the form keeps what was typed.
      setStatus(err instanceof RateLimitedError ? "throttled" : "failed");
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 md:px-8">
      <p className="label-mono text-primary">{t("intake:support.eyebrow")}</p>
      <h1 className="mt-3 text-4xl md:text-5xl">{t("intake:support.title")}</h1>
      <p className="mt-2 text-sm text-ink-2">{t("intake:support.subtitle")}</p>

      {status === "done" ? (
        <Card className="mt-8 p-6">
          <h2 className="text-2xl text-ink">{t("intake:sent.title")}</h2>
          <p className="mt-3 text-sm text-ink-2">{t("intake:support.sentBody")}</p>
          <p className="data-mono mt-2 text-sm text-ink">{reference}</p>
          <Button variant="ghost" className="mt-6" onClick={() => setStatus("idle")}>
            {t("intake:sent.again")}
          </Button>
        </Card>
      ) : (
        <form noValidate onSubmit={onSubmit} className="mt-8">
          <Card className="p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("intake:field.name")}>
                {(p) => <Input {...p} value={fields.name} onChange={(e) => set("name", e.target.value)} />}
              </Field>
              <Field label={t("intake:field.phone")}>
                {(p) => <Input {...p} type="tel" value={fields.phone} onChange={(e) => set("phone", e.target.value)} />}
              </Field>
              <Field label={t("intake:field.email")}>
                {(p) => (
                  <Input {...p} type="email" value={fields.email} onChange={(e) => set("email", e.target.value)} />
                )}
              </Field>
              <Field label={t("intake:field.bookingReference")}>
                {(p) => (
                  <Input
                    {...p}
                    className="data-mono"
                    value={fields.bookingReference}
                    onChange={(e) => set("bookingReference", e.target.value)}
                  />
                )}
              </Field>
              <Field label={t("intake:field.topic")}>
                {(p) => (
                  <Select {...p} value={fields.topic} onChange={(e) => set("topic", e.target.value)}>
                    {TOPICS.map((topic) => (
                      <option key={topic} value={topic}>
                        {t(`intake:supportTopic.${topic}`)}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <Field label={t("intake:field.urgency")}>
                {(p) => (
                  <Select {...p} value={fields.urgency} onChange={(e) => set("urgency", e.target.value)}>
                    {URGENCIES.map((level) => (
                      <option key={level} value={level}>
                        {t(`intake:urgency.${level}`)}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
            </div>
            <div className="mt-4">
              <Field label={t("intake:field.message")}>
                {(p) => (
                  <Textarea {...p} rows={5} value={fields.message} onChange={(e) => set("message", e.target.value)} />
                )}
              </Field>
            </div>

            {error ? (
              <p role="alert" className="mt-4 border-l-4 border-destructive bg-canvas px-4 py-3 text-sm text-destructive">
                {t("intake:error.supportRequired")}
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

            <Button type="submit" variant="primary" className="mt-6" disabled={status === "sending"}>
              {status === "sending" ? t("intake:sending") : t("intake:support.submit")}
            </Button>
          </Card>
        </form>
      )}
    </div>
  );
}
