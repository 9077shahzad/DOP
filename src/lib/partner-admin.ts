/**
 * Partner Network — stage 4 admin model.
 * Internal screens are translated through the `admin` i18n namespace; this
 * module holds only stable keys, pipeline rules and thresholds.
 */

import { statusTone, toneChip } from "@/lib/status-tone";




export const PARTNER_STATUSES = [
  "draft",
  "submitted",
  "under_review",
  "more_info_required",
  "approved",
  "suspended",
  "rejected",
] as const;
export type PartnerStatus = (typeof PARTNER_STATUSES)[number];

/** Statuses shown as queue tabs, in pipeline order. `draft` is not a queue. */
export const QUEUE_STATUSES: readonly PartnerStatus[] = [
  "submitted",
  "under_review",
  "more_info_required",
  "approved",
  "suspended",
  "rejected",
];

/** Labels live in the `admin` i18n namespace; the enum value IS the key:
 *  t(`admin.status.${status}`). Never translate the value itself. */

/** Chip classes come from the single product-wide status→tone map. */
export const PARTNER_STATUS_TONE: Record<PartnerStatus, string> = Object.fromEntries(
  PARTNER_STATUSES.map((s) => [s, toneChip(statusTone(s))]),
) as Record<PartnerStatus, string>;

export type PartnerAction = {
  /** Target status passed to set_partner_status(). */
  to: PartnerStatus;
  /** Key under `admin.action` — the visible label is translated at render time. */
  labelKey: string;
  /** A note is mandatory — a bare status flip is a useless audit row. */
  noteRequired: boolean;
  /** Key under `admin.actionNote`. */
  noteKey: string;
  /** Rendered as the emphasised action in the dialog. */
  destructive?: boolean;
};

const ACTION: Record<string, PartnerAction> = {
  review: { to: "under_review", labelKey: "review", noteRequired: false, noteKey: "optional" },
  moreInfo: { to: "more_info_required", labelKey: "moreInfo", noteRequired: true, noteKey: "missing" },
  approve: { to: "approved", labelKey: "approve", noteRequired: false, noteKey: "optional" },
  reject: { to: "rejected", labelKey: "reject", noteRequired: true, noteKey: "reason", destructive: true },
  suspend: { to: "suspended", labelKey: "suspend", noteRequired: true, noteKey: "reason", destructive: true },
  reactivate: { to: "under_review", labelKey: "reactivate", noteRequired: true, noteKey: "reason" },
};

/** Which transitions a staff user may trigger from the current state. */
export const PARTNER_TRANSITIONS: Record<PartnerStatus, readonly PartnerAction[]> = {
  draft: [],
  submitted: [ACTION["review"]!, ACTION["moreInfo"]!, ACTION["approve"]!, ACTION["reject"]!],
  under_review: [ACTION["moreInfo"]!, ACTION["approve"]!, ACTION["reject"]!],
  more_info_required: [ACTION["review"]!, ACTION["reject"]!],
  approved: [ACTION["suspend"]!],
  suspended: [ACTION["reactivate"]!, ACTION["reject"]!],
  rejected: [ACTION["review"]!],
};

/** Statuses in which the partner may still edit the application. */
export const EDITABLE_STATUSES: readonly PartnerStatus[] = ["draft", "more_info_required"];

/** Status changes the partner is notified about, in their preferred language. */
export const NOTIFIED_STATUSES: readonly PartnerStatus[] = [
  "more_info_required",
  "approved",
  "rejected",
];







/* ---------------------------------------------------------------- assessment */

/** Criterion keys; labels come from `admin.rating.<key>`. */
export const RATING_CRITERIA = [
  { key: "experience" },
  { key: "capacity" },
  { key: "coverage" },
  { key: "price" },
  { key: "certifications" },
  { key: "compliance" },
  { key: "responsiveness" },
  { key: "insurance" },
] as const;

export const RATING_MAX = 10;
export const RATING_TOTAL_MAX = RATING_CRITERIA.length * RATING_MAX;

/** Single source of truth for classification thresholds (percent of maximum). */
export const CLASSIFICATION_THRESHOLDS = [
  { min: 0.85, key: "strategic" },
  { min: 0.7, key: "approved" },
  { min: 0.5, key: "conditional" },
  { min: 0, key: "review" },
] as const;

/** Returns the classification KEY. It is stored on the partner row as a stable
 *  identifier and translated for display through `admin.classification.<key>`. */
export function classificationFor(total: number): string {
  const ratio = RATING_TOTAL_MAX > 0 ? total / RATING_TOTAL_MAX : 0;
  return (
    CLASSIFICATION_THRESHOLDS.find((t) => ratio >= t.min)?.key ??
    CLASSIFICATION_THRESHOLDS[CLASSIFICATION_THRESHOLDS.length - 1]!.key
  );
}

/* ------------------------------------------------------------------- expiry */

export type ExpiryState = { kind: "none" | "valid" | "soon" | "expired"; days: number | null };

export const EXPIRY_WARNING_DAYS = 30;

export function expiryState(expiresOn: string | null | undefined, now = new Date()): ExpiryState {
  if (!expiresOn) return { kind: "none", days: null };
  const due = new Date(`${expiresOn}T00:00:00Z`);
  const days = Math.floor((due.getTime() - now.getTime()) / 86_400_000);
  if (days < 0) return { kind: "expired", days };
  if (days <= EXPIRY_WARNING_DAYS) return { kind: "soon", days };
  return { kind: "valid", days };
}

/** Translation key + interpolation values for an expiry state. */
export function expiryLabelKey(state: ExpiryState): { key: string; days: number } {
  return { key: `expiry.${state.kind}`, days: Math.abs(state.days ?? 0) };
}

/** A document counts as valid when it is approved and not past its expiry. */
export function isDocumentValid(status: string, expiresOn: string | null | undefined): boolean {
  return status === "approved" && expiryState(expiresOn).kind !== "expired";
}
