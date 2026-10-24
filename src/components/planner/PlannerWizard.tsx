import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { BlockerList } from "@/components/planner/BlockerList";
import { BookingLegal, type BookingConsent } from "@/components/planner/BookingLegal";
import { LivePanel } from "@/components/planner/LivePanel";
import { QuotePreview } from "@/components/planner/QuotePreview";
import {
  QAccess,
  QAccessIn,
  QAccessOut,
  QCleaning,
  QContact,
  QNotes,
  QDate,
  QDisposal,
  QExtras,
  QInventory,
  QProperty,
  QRooms,
  QRoute,
  QServices,
  QSummary,
  QUploads,
} from "@/components/planner/Steps";
import { Timeline } from "@/components/planner/Timeline";
import { attachUploads } from "@/lib/intake-uploads";
import { usePlanner } from "@/components/planner/usePlanner";
import { Shell } from "@/components/public/Section";
import { Button } from "@/components/system";
import type { Lang } from "@/i18n/config";
import { recordConsents, type ConsentInput } from "@/lib/consent";
import { fetchDocumentIndex, fetchLegalEntity } from "@/lib/legal-data";
import {
  buildPlans,
  effectiveCleaning,
  planningDistanceHeuristic,
  quoteReference,
  type PricedPlannerState,
} from "@/lib/pricing";
import { resolvePlannerPrice } from "@/lib/price-resolution";
import { fetchPlannerPricing } from "@/lib/planner-pricing";
import { fetchInventory } from "@/lib/inventory";
import { estimateBlockers, requiredBlockers, type Blocker } from "@/lib/planner-blockers";
import { createQuote } from "@/lib/quotes";
import { createPlannerLead } from "@/lib/leads";
import { cn } from "@/lib/utils";
import { useCompany } from "@/components/shell/CompanyContext";
import { phoneDisplay, telHref } from "@/lib/company";
import { WhatsappHandoff } from "@/components/brand/WhatsappHandoff";

/**
 * One question per view. Nine short steps beat six crowded ones on a phone:
 * a single decision fills the screen, the progress bar shows how little is
 * left, and the answer cards are thumb-sized.
 *
 * Step 7 (inventory) is explicitly optional and can be skipped — it refines
 * the estimate, it is never required for one.
 */
export function PlannerWizard({ lang }: { lang: Lang }) {
  const company = useCompany();
  const { t } = useTranslation("planer");
  const { t: tl } = useTranslation("legal");
  const navigate = useNavigate();
  const { state, patch, setItem, toggleService, steps, stepId, setStepId, reset } = usePlanner();
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<"none" | "server">("none");
  const [attempted, setAttempted] = useState(false);
  /** Reference of an inquiry sent without a price — a request for an offer. */
  const [sentUnpriced, setSentUnpriced] = useState<string | null>(null);
  /** Files attached to the created lead, reported back to the customer. */
  const [attached, setAttached] = useState<number | null>(null);
  const [uploadWarning, setUploadWarning] = useState(false);
  const [consent, setConsent] = useState<BookingConsent>({
    acceptedTerms: false,
    marketing: false,
  });

  // One resolver, recomputed from state: a changed input invalidates the old
  // figure in the same render, so a stale number can never survive an edit.
  // The published pricing configuration — the same source the portal reads.
  const pricingQuery = useQuery({
    queryKey: ["planner-pricing", "CH"],
    queryFn: () => fetchPlannerPricing("CH"),
    staleTime: 5 * 60 * 1000,
  });
  const pricing = pricingQuery.data ?? null;
  const inventoryQuery = useQuery({ queryKey: ["inventory-catalogue", "all"], queryFn: () => fetchInventory(true) });
  const inventoryVolumes = useMemo(() => Object.fromEntries((inventoryQuery.data ?? []).map((item) => [item.key, Number(item.m3)])), [inventoryQuery.data]);

  const resolution = useMemo(() => resolvePlannerPrice(state, inventoryQuery.isSuccess ? pricing : null, inventoryQuery.isSuccess ? inventoryVolumes : undefined), [state, pricing, inventoryQuery.isSuccess, inventoryVolumes]);
  const calc = resolution.state === "priced" ? resolution.calc : null;
  const missing = resolution.state === "incomplete" ? resolution.missing : [];
  // Moving and cleaning are separate dated plans, never one long day.
  const plans = useMemo(
    () => (calc ? buildPlans(state as PricedPlannerState, calc) : []),
    [state, calc],
  );
  const distance = useMemo(
    () => (pricing ? planningDistanceHeuristic(state.fromZip, state.toZip, pricing) : { km: 0, minutes: 0 }),
    [state.fromZip, state.toZip, pricing],
  );
  const reference = useMemo(() => quoteReference(state), [state]);

  // Derived every render: an error can never outlive the condition that caused
  // it, and no field that is already filled is ever named as a problem.
  const required = useMemo(
    () => requiredBlockers(state, consent.acceptedTerms),
    [state, consent.acceptedTerms],
  );
  const estimateGaps = useMemo(() => estimateBlockers(state, inventoryQuery.isSuccess ? inventoryVolumes : undefined), [state, inventoryQuery.isSuccess, inventoryVolumes]);

  function jumpTo(blocker: Blocker) {
    setStepId(blocker.step);
    requestAnimationFrame(() => {
      const el = document.getElementById(blocker.fieldId);
      el?.scrollIntoView({ block: "center", behavior: "smooth" });
      (el as HTMLElement | null)?.focus?.();
    });
  }

  const docs = useQuery({
    queryKey: ["legal-index", lang],
    queryFn: () => fetchDocumentIndex(lang),
  });
  const entity = useQuery({
    queryKey: ["legal-entity"],
    queryFn: () => fetchLegalEntity(),
  });

  function versionOf(docType: string): number | null {
    return docs.data?.find((d) => d.doc_type === docType)?.version ?? null;
  }

  async function submit() {
    setAttempted(true);
    if (required.length > 0) {
      jumpTo(required[0]!);
      return;
    }
    setFailure("none");
    setSaving(true);
    try {
      // A missing price never stops the inquiry: without one the record is a
      // request for an offer, with the unset inputs written down for follow-up.
      const ref = calc ? await createQuote(state as PricedPlannerState, calc, lang) : null;

      // A quote request is a lead: it belongs in the inbox alongside the rest.
      let leadRef: string | null = null;
      try {
        const created = await createPlannerLead({
          name: state.name,
          phone: state.phone,
          email: state.email,
          company: state.company,
          fromAddress: state.fromAddress,
          fromZip: state.fromZip,
          toAddress: state.toAddress,
          toZip: state.toZip,
          date: state.date || null,
          estimatedValue: calc ? calc.total : null,
          quoteReference: ref,
          language: lang,
          missing: estimateGaps.map((b) => b.id),
          city: state.fromCity,
          canton: state.fromCanton,
            preferredTime: state.startTime,
            contactLanguage: state.contactLanguage,
            details: {
              from: `${state.fromAddress}, ${state.fromZip} ${state.fromCity} ${state.fromCanton}`.trim(),
              to: state.services.move
                ? `${state.toAddress}, ${state.toZip} ${state.toCity} ${state.toCanton}`.trim()
                : "",
              origin: {
                street: state.fromAddress,
                zip: state.fromZip,
                city: state.fromCity,
                canton: state.fromCanton,
                floor: state.floorOut,
                lift: state.liftOut,
                parking: state.parkingOut,
                carry: state.carry,
                narrow_stairs: state.narrowStairs,
                permit: state.permit,
                hoist: state.hoist,
              },
              ...(state.services.move
                ? {
                    destination: {
                      street: state.toAddress,
                      zip: state.toZip,
                      city: state.toCity,
                      canton: state.toCanton,
                      floor: state.floorIn,
                      lift: state.liftIn,
                      parking: state.parkingIn,
                      carry: state.carryIn,
                      narrow_stairs: state.narrowStairsIn,
                      permit: state.permitIn,
                      hoist: state.hoistIn,
                    },
                  }
                : {}),
              propertyType: state.propertyType,
              roomUnits: state.roomUnits,
              services: state.services,
              extras: state.extras,
              lamp_count: state.extras.includes("lamp_installation") ? state.lampCount : 0,
              ...(state.extras.includes("packing_material")
                ? { packing_material_option: state.packingMaterialOption }
                : {}),
              ...(state.notes.trim() ? { notes: state.notes.trim().slice(0, 4000) } : {}),
              // Invoice address of the customer, distinct from the work places.
              customer_address: {
                street: state.customerStreet || state.fromAddress,
                zip: state.customerZip || state.fromZip,
                city: state.customerCity || state.fromCity,
                country: state.customerCountry,
              },
              items: state.services.move ? state.items : {},
              ...(state.services.clean ? { cleaning: effectiveCleaning(state.services.move
                ? { ...state.cleaning, propertyType: state.propertyType, roomUnits: state.roomUnits }
                : state.cleaning) } : {}),
              ...(state.services.disp ? { disposal: state.disposal } : {}),
              clean_date: state.cleanDate,
              start_time: state.startTime,
              contact_language: state.contactLanguage,
              uploads: state.uploads.length,
              ...(calc
                ? {
                    volume_m3: Number(calc.m3.toFixed(1)),
                    // Internal planning heuristic only — never the billed distance.
                    planning_distance_km_heuristic: calc.km,
                    crew: calc.crew,
                    vans: calc.vans,
                    boxes: calc.boxes,
                    total_chf: Math.round(calc.total),
                    ...(calc.discountReason
                      ? { discount: { reason: calc.discountReason, rate: calc.discountRate, amount: Number(calc.discount.toFixed(2)) } }
                      : {}),
                    ...(calc.disposal
                      ? {
                          disposal_m3: calc.disposal.m3,
                          disposal_team_hours: calc.disposal.billedHours,
                        }
                      : {}),
                  }
                : {}),
            },
          });
        leadRef = created;
      } catch (leadError) {
        // A failed lead write must be visible, not silent.
        console.error("lead_create_failed", leadError);
        if (!ref) throw leadError;
      }

      // Link the customer's uploads to the freshly created lead.
      const attachRef = leadRef ?? ref;
      if (state.uploads.length > 0 && attachRef) {
        try {
          setAttached(await attachUploads(attachRef, state.draftId, state.uploads));
        } catch (attachError) {
          console.error("lead_attach_failed", attachError);
          setUploadWarning(true);
        }
      }

      // One append-only row per distinct consent, recorded at the moment it happens.
      const base = {
        subjectType: "customer" as const,
        subjectRef: state.email || state.phone,
        bookingReference: ref ?? leadRef ?? reference,
        legalEntityId: entity.data?.id ?? null,
      };
      const rows: ConsentInput[] = [
        {
          ...base,
          documentType: "terms",
          documentVersion: versionOf("terms"),
          consentKind: "accepted_terms",
          value: true,
        },
        {
          ...base,
          documentType: "privacy",
          documentVersion: versionOf("privacy"),
          consentKind: "privacy_notice_shown",
          value: true,
        },
        {
          ...base,
          documentType: "",
          documentVersion: null,
          consentKind: "marketing_optin",
          value: consent.marketing,
        },
      ];
      rows.push({
        ...base,
        documentType: "cancellation",
        documentVersion: versionOf("cancellation"),
        consentKind: "cancellation_policy_shown",
        value: true,
      });
      try {
        await recordConsents(rows);
      } catch (consentError) {
        // The booking exists; a failed evidence write must be visible, not silent.
        console.error("consent_record_failed", consentError);
      }

      if (ref) {
        await navigate({ to: "/$lang/offerte/$ref", params: { lang, ref } });
      } else {
        setSentUnpriced(leadRef ?? reference);
      }
    } catch (error) {
      console.error(error);
      setFailure("server");
    } finally {
      setSaving(false);
    }
  }

  const index = Math.max(0, steps.indexOf(stepId));
  const total = steps.length;
  const isLast = stepId === "contact";
  const isUploads = stepId === "uploads";
  const pricePanel = (
    <LivePanel
      calc={calc}
      missing={missing}
      state={state}
      lang={lang}
      reference={reference}
      unavailable={resolution.state === "unavailable"}
      compact={isUploads}
    />
  );

  function go(nextIndex: number) {
    const clamped = Math.min(total - 1, Math.max(0, nextIndex));
    setStepId(steps[clamped] ?? "services");
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const navRow = (extra: string) => (
    <div className={cn("grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:flex sm:justify-between", extra)}>
                  <Button variant="quiet" size="touch" onClick={() => go(index - 1)} disabled={index === 0}>
                    <ArrowLeft aria-hidden="true" className="size-4" />
                    {t("back")}
                  </Button>
                  <div className="flex items-center gap-2">
                    {isLast ? (
                      <Button variant="primary" size="touch" onClick={() => void submit()} disabled={saving}>
                        {saving ? t("submit.sending") : tl("booking.submitCh")}
                      </Button>
                    ) : (
                      <Button variant="primary" size="touch" onClick={() => go(index + 1)}>
                        {t("ui.continue")}
                        <ArrowRight aria-hidden="true" className="size-4" />
                      </Button>
                    )}
                  </div>
                </div>
  );

  return (
    <div className="bg-surface pb-20 pt-8 md:pb-24 md:pt-12">
      <Shell>
        <div className="mx-auto max-w-5xl">
          <p className="label-mono text-primary">{t("eyebrow")}</p>
          <h1 className="type-h1 mt-3 text-ink">{t("title")}</h1>

          {/* Progress — only the steps the chosen services actually need. */}
          <div className="mt-8">
            <div className="flex items-baseline justify-between gap-4">
              <p className="label-mono text-soft">{t("ui.progress", { current: index + 1, total })}</p>
              <p className="label-mono text-ink">{t(`flow.${stepId}.name`)}</p>
            </div>
            <div
              role="progressbar"
              aria-valuemin={1}
              aria-valuemax={total}
              aria-valuenow={index + 1}
              aria-label={t("title")}
              className="mt-3 flex gap-1"
            >
              {steps.map((id, n) => (
                <span
                  key={id}
                  className={cn(
                    "h-1 flex-1 rounded-full transition-colors motion-base",
                    n <= index ? "bg-primary" : "bg-line",
                  )}
                />
              ))}
            </div>
          </div>

          <div className={cn("mt-6 grid grid-cols-[minmax(0,1fr)] items-start gap-8", !isUploads && "lg:grid-cols-[minmax(0,1fr)_21rem]")}>
            <div className="min-w-0">
              {isUploads ? <div className="mb-5">{pricePanel}</div> : null}
              <section className="rounded-3xl bg-canvas p-5 md:p-9">
                {/* Without a move there is one work address, so the route and
                    access steps are worded for that single address. */}
                {(() => {
                  const key =
                    !state.services.move && (stepId === "route" || stepId === "accessOut")
                      ? `flowSingle.${stepId}`
                      : `flow.${stepId}`;
                  return (
                    <>
                      <h2 className="type-h2 text-ink">{t(`${key}.title`)}</h2>
                      {t(`${key}.hint`) && stepId !== "services" ? (
                        <p className="type-small mt-3 max-w-xl text-soft">{t(`${key}.hint`)}</p>
                      ) : null}
                    </>
                  );
                })()}

                <div className="mt-8">
                  {stepId === "services" ? <QServices state={state} toggleService={toggleService} /> : null}
                  {stepId === "route" ? <QRoute state={state} patch={patch} lang={lang} /> : null}
                  {stepId === "size" ? (
                    <div className="space-y-10">
                      <QRooms state={state} patch={patch} lang={lang} />
                      <QProperty state={state} patch={patch} lang={lang} />
                    </div>
                  ) : null}
                  {stepId === "accessOut" ? (
                    <div className="space-y-10">
                      <QAccessOut state={state} patch={patch} />
                      <QAccess state={state} patch={patch} />
                    </div>
                  ) : null}
                  {stepId === "accessIn" ? <QAccessIn state={state} patch={patch} /> : null}
                  {stepId === "inventory" ? <QInventory state={state} setItem={setItem} /> : null}
                  {stepId === "cleaning" ? <QCleaning state={state} patch={patch} /> : null}
                  {stepId === "disposal" ? <QDisposal state={state} patch={patch} /> : null}
                  {stepId === "extras" ? <QExtras state={state} patch={patch} /> : null}
                  {stepId === "dates" ? <QDate state={state} patch={patch} lang={lang} /> : null}
                  {stepId === "uploads" ? <QUploads state={state} patch={patch} /> : null}
                  {stepId === "contact" ? (
                    <>
                      <QContact state={state} patch={patch} lang={lang} />
                      <QNotes state={state} patch={patch} />
                      <QSummary state={state} onEdit={setStepId} />
                      <BookingLegal
                        lang={lang}
                        consent={consent}
                        patch={(next) => setConsent((prev) => ({ ...prev, ...next }))}
                        priceLow={calc?.rangeLow}
                        priceHigh={calc?.rangeHigh}
                      />
                    </>
                  ) : null}
                </div>

                {isLast && sentUnpriced ? (
                  <div role="status" className="mt-6 rounded-xl bg-primary-subtle px-4 py-4 text-sm text-ink">
                    <p className="font-semibold">{t("submit.sentUnpricedTitle")}</p>
                    <p className="mt-1 text-ink-2">{t("submit.sentUnpricedBody")}</p>
                    <p className="data-mono mt-2 text-primary">{sentUnpriced}</p>
                    {attached !== null && attached > 0 ? (
                      <p className="mt-1 text-ink-2">{t("submit.filesAttached", { count: attached })}</p>
                    ) : null}
                    {uploadWarning ? <p className="mt-1 text-danger">{t("submit.filesFailed")}</p> : null}
                    <p className="mt-3">
                      <button type="button" className="text-primary underline" onClick={reset}>
                        {t("submit.newInquiry")}
                      </button>
                    </p>
                  </div>
                ) : null}

                {isLast && !sentUnpriced ? (
                  <>
                    <BlockerList
                      blockers={attempted ? required : []}
                      tone="blocking"
                      title={t("blockers.blockingTitle")}
                      onJump={jumpTo}
                    />
                    <BlockerList
                      blockers={estimateGaps}
                      tone="info"
                      title={t("blockers.estimateTitle")}
                      onJump={jumpTo}
                    />
                    <p className="type-caption mt-4">{t("micro.submit")}</p>
                  </>
                ) : null}

                {isLast && failure !== "none" ? (
                  <div role="alert" className="mt-6 rounded-xl bg-danger-subtle px-4 py-3.5 text-sm text-ink">
                    <p>{t("submit.error")}</p>
                    {company ? (
                      <p className="label-mono mt-2 flex flex-wrap gap-4 text-primary">
                        <a href={telHref(company)}>
                          {t("submit.call")} {phoneDisplay(company)}
                        </a>
                        <WhatsappHandoff context="planner_submit_failed">{t("submit.whatsapp")}</WhatsappHandoff>
                      </p>
                    ) : null}
                  </div>
                ) : null}

                {navRow("mt-9")}
              </section>

              {calc ? (
                <div className="mt-8 space-y-8">
                  {plans.map((plan) => (
                    <Timeline key={plan.id} plan={plan} lang={lang} />
                  ))}
                  <QuotePreview
                    calc={calc}
                    lang={lang}
                    reference={reference}
                    email={state.email}
                    state={state}
                    plans={plans}
                  />
                </div>
              ) : null}
            </div>

            {!isUploads ? pricePanel : null}
            {/* Phones: the price sits below the step, so the buttons repeat under it. */}
            {!isUploads ? navRow("lg:hidden") : null}
          </div>
        </div>
      </Shell>
    </div>
  );
}
