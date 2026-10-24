/**
 * Live job journey.
 *
 * A stepped path from the customer's actual record: Angefragt → Qualifiziert
 * → Offeriert → Freigegeben → Terminiert → Unterwegs → Vor Ort → In Arbeit →
 * Abgeschlossen. Stages after the current one are explicitly marked as not
 * reached — no speculative progress is drawn, and if the status is unknown
 * nothing is shown as done.
 */
import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";

export const JOURNEY_STAGES = [
  "requested",
  "qualified",
  "quoted",
  "approved",
  "scheduled",
  "enroute",
  "onsite",
  "working",
  "done",
] as const;

export type JourneyStage = (typeof JOURNEY_STAGES)[number];

/** Maps stored lead/quote/job statuses onto the customer-facing journey. */
export function stageFromStatus(status: string | null | undefined): JourneyStage | null {
  switch (status) {
    case "new":
    case "draft":
      return "requested";
    case "qualified":
    case "quote_required":
      return "qualified";
    case "quote_sent":
    case "sent":
    case "negotiation":
      return "quoted";
    case "accepted":
    case "won":
    case "quote_approved":
      return "approved";
    case "scheduled":
    case "crew_assigned":
      return "scheduled";
    case "en_route":
      return "enroute";
    case "on_site":
      return "onsite";
    case "in_progress":
      return "working";
    case "completed":
    case "verified":
    case "handover_done":
      return "done";
    default:
      return null;
  }
}

export function JobJourney({ status }: { status: string | null | undefined }) {
  const { t } = useTranslation("svc");
  const current = stageFromStatus(status);
  const index = current ? JOURNEY_STAGES.indexOf(current) : -1;

  return (
    <section aria-label={t("journey.title")} className="rounded-2xl bg-surface">
      <p className="label-mono border-b border-line px-5 py-3 text-soft">{t("journey.title")}</p>
      <ol className="grid gap-px bg-line sm:grid-cols-3 lg:grid-cols-9">
        {JOURNEY_STAGES.map((stage, i) => {
          const done = index >= 0 && i < index;
          const active = index === i;
          const reached = done || active;
          return (
            <li
              key={stage}
              aria-current={active ? "step" : undefined}
              className={cn(
                "bg-card px-4 py-4",
                active && "border-l-4 border-primary",
                !reached && "opacity-60",
              )}
            >
              <span className="label-mono text-soft">{String(i + 1).padStart(2, "0")}</span>
              <span className={cn("mt-1 block text-sm", reached ? "text-ink" : "text-soft")}>
                {t(`journey.${stage}`)}
              </span>
              <span className="label-mono mt-2 block text-soft">
                {done ? t("journey.done") : active ? t("journey.current") : t("journey.pending")}
              </span>
            </li>
          );
        })}
      </ol>
      {index < 0 ? <p className="type-caption px-5 py-3">{t("journey.unknown")}</p> : null}
    </section>
  );
}
