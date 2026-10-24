import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { User } from "@supabase/supabase-js";

import { brandButton } from "@/components/brand/Button";
import {
  StepCapacity,
  StepCompany,
  StepContact,
  StepDocuments,
  StepServices,
  StepType,
} from "@/components/partner/Steps";
import { useApplication } from "@/components/partner/useApplication";
import type { Lang } from "@/i18n/config";
import { recordConsents } from "@/lib/consent";
import { DECLARATIONS, PARTNER_CONSENT_DOCS } from "@/lib/partner";

const STEP_KEYS = ["type", "company", "contact", "services", "capacity", "documents"] as const;

export function Wizard({ user, lang }: { user: User; lang: Lang }) {
  const { t } = useTranslation("partner");
  const app = useApplication(user);
  const [step, setStep] = useState(0);
  const [blocked, setBlocked] = useState<string | null>(null);
  const [declarations, setDeclarations] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [reference, setReference] = useState<string | null>(null);

  if (app.loading) {
    return (
      <p className="label-mono mx-auto max-w-3xl px-4 py-16 text-soft md:px-8">{t("apply.loading")}</p>
    );
  }
  if (app.loadError || !app.partner) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 md:px-8">
        <p role="alert" className="rounded-md border-l-4 border-destructive bg-surface px-4 py-3 text-sm text-destructive">
          {t("apply.loadFailed")}
        </p>
      </div>
    );
  }

  if (reference) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 md:px-8">
        <p className="label-mono text-primary">{t("apply.done.eyebrow")}</p>
        <h1 className="mt-3 type-h2 text-ink">{t("apply.done.title")}</h1>
        <p className="mt-3 text-ink-2">{t("apply.done.lead")}</p>
        <p className="label-mono mt-6 inline-block rounded-md border border-primary bg-primary/5 px-4 py-3 text-primary">
          {t("apply.done.reference")}: {reference}
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/" className={brandButton({ variant: "primary" })}>
            {t("apply.done.track")}
          </Link>
          <button type="button" onClick={() => setReference(null)} className={brandButton({ variant: "ghost" })}>
            {t("apply.done.addDocs")}
          </button>
          <Link to="/$lang" params={{ lang }} hash="kontakt" className={brandButton({ variant: "ghost" })}>
            {t("apply.done.support")}
          </Link>
        </div>
      </div>
    );
  }

  function missingFields(index: number): string[] {
    if (index === 1) {
      const missing: string[] = [];
      if (!app.profile.legal_name.trim()) missing.push(t("apply.step2.legalName"));
      if (!app.profile.city.trim()) missing.push(t("apply.step2.city"));
      return missing;
    }
    if (index === 2) {
      const missing: string[] = [];
      if (!app.contact.full_name.trim()) missing.push(t("apply.step3.fullName"));
      if (!app.contact.mobile.trim()) missing.push(t("apply.step3.mobile"));
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(app.contact.email.trim())) missing.push(t("apply.step3.email"));
      return missing;
    }
    return [];
  }

  async function go(next: number) {
    setSubmitError(null);
    if (next > step) {
      const missing = missingFields(step);
      if (missing.length) {
        setBlocked(`${t("apply.errors.complete")}: ${missing.join(", ")}`);
        return;
      }
    }
    setBlocked(null);
    await app.save();
    setStep(Math.max(0, Math.min(STEP_KEYS.length - 1, next)));
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function onSubmit() {
    setBlocked(null);
    setSubmitError(null);
    const missing = [...missingFields(1), ...missingFields(2)];
    if (missing.length) {
      setBlocked(`${t("apply.errors.complete")}: ${missing.join(", ")}`);
      return;
    }
    if (declarations.length !== DECLARATIONS.length) {
      setBlocked(t("apply.errors.declarations"));
      return;
    }
    setSubmitting(true);
    const result = await app.submit();
    setSubmitting(false);
    if (!result.ok) {
      setSubmitError(t("apply.errors.submit"));
      return;
    }
    const ref = result.reference || app.partner?.reference || "";
    setReference(ref);

    // Each partner declaration is its own consent record.
    void recordConsents(
      PARTNER_CONSENT_DOCS.map(({ declaration, documentType }) => ({
        subjectType: "partner" as const,
        subjectRef: user.id,
        partnerReference: ref,
        documentType,
        consentKind:
          declaration === "data_protection"
            ? ("privacy_notice_shown" as const)
            : ("accepted_terms" as const),
        value: declarations.includes(declaration),
      })),
    ).catch((error) => console.error("partner_consent_record_failed", error));
  }

  const savedLabel = app.saveError
    ? t("apply.saveFailed")
    : app.saving
      ? t("apply.saving")
      : app.savedAt
        ? t("apply.saved")
        : t("apply.draft");

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 md:px-8 md:py-14">
      <p className="label-mono text-primary">{t("apply.eyebrow")}</p>
      <h1 className="mt-2 type-h2 text-ink">{t("apply.title")}</h1>
      <p className="mt-2 text-sm text-ink-2">{t("apply.lead")}</p>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
        <p className="label-mono text-soft">
          {t("apply.stepOf", { current: step + 1, total: STEP_KEYS.length })} ·{" "}
          {t(`apply.steps.${STEP_KEYS[step]}`)}
        </p>
        <p
          aria-live="polite"
          className={`label-mono ${app.saveError ? "text-destructive" : "text-primary"}`}
        >
          {savedLabel}
        </p>
      </div>

      <ol className="mt-3 grid grid-cols-6 gap-1" aria-label={t("apply.progress")}>
        {STEP_KEYS.map((key, index) => (
          <li key={key}>
            <button
              type="button"
              onClick={() => void go(index)}
              aria-current={index === step ? "step" : undefined}
              className={`h-1.5 w-full rounded-full ${index <= step ? "bg-primary" : "bg-line"}`}
            >
              <span className="sr-only">{t(`apply.steps.${key}`)}</span>
            </button>
          </li>
        ))}
      </ol>

      <div className="mt-8">
        {step === 0 ? <StepType app={app} /> : null}
        {step === 1 ? <StepCompany app={app} /> : null}
        {step === 2 ? <StepContact app={app} /> : null}
        {step === 3 ? <StepServices app={app} lang={lang} /> : null}
        {step === 4 ? <StepCapacity app={app} lang={lang} /> : null}
        {step === 5 ? (
          <StepDocuments app={app} lang={lang} declarations={declarations} setDeclarations={setDeclarations} />
        ) : null}
      </div>

      {blocked ? (
        <p role="alert" className="mt-6 rounded-md border-l-4 border-destructive bg-surface px-3 py-2 text-sm text-destructive">
          {blocked}
        </p>
      ) : null}
      {submitError ? (
        <p role="alert" className="mt-6 rounded-md border-l-4 border-destructive bg-surface px-3 py-2 text-sm text-destructive">
          {submitError}
        </p>
      ) : null}

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-between">
        <button
          type="button"
          onClick={() => void go(step - 1)}
          disabled={step === 0}
          className={brandButton({ variant: "ghost" })}
        >
          {t("apply.back")}
        </button>
        {step < STEP_KEYS.length - 1 ? (
          <button type="button" onClick={() => void go(step + 1)} className={brandButton({ variant: "primary" })}>
            {t("apply.next")}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void onSubmit()}
            disabled={submitting}
            className={brandButton({ variant: "primary" })}
          >
            {submitting ? t("apply.submitting") : t("apply.submit")}
          </button>
        )}
      </div>
    </div>
  );
}
