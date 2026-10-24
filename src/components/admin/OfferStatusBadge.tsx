/**
 * Colour-coded offer status: pending = blue, accepted = green,
 * rejected = red, converted to order = solid dark "Auftrag" mark.
 */
import { useTranslation } from "react-i18next";

import type { QuoteRow } from "@/lib/quotes";

export type OfferTone = "pending" | "accepted" | "rejected" | "order";

export function offerTone(row: Pick<QuoteRow, "workflow_stage" | "accepted_at" | "job_id">): OfferTone {
  if (row.job_id || row.workflow_stage === "order" || row.workflow_stage === "closed") return "order";
  if (row.workflow_stage === "offer_rejected") return "rejected";
  if (row.accepted_at || row.workflow_stage === "offer_accepted") return "accepted";
  return "pending";
}

const CLASS: Record<OfferTone, string> = {
  pending: "border-primary bg-primary/10 text-primary",
  accepted: "border-success bg-success/10 text-success",
  rejected: "border-destructive bg-destructive/10 text-destructive",
  order: "border-ink bg-ink text-canvas",
};

export function OfferStatusBadge({ tone }: { tone: OfferTone }) {
  const { t } = useTranslation("dop");
  return (
    <span data-tone={tone} className={`label-mono inline-flex items-center gap-1 rounded-md border px-2 py-0.5 ${CLASS[tone]}`}>
      <span aria-hidden="true">{tone === "accepted" || tone === "order" ? "✓" : tone === "rejected" ? "✕" : "●"}</span>
      {t(`status.${tone}`)}
    </span>
  );
}
