/**
 * One meaning, one colour — everywhere.
 *
 * Before this module each screen carried its own tone map, so "warning" was
 * amber on the dispatch board and brand indigo in partner review. Every status
 * in the product now resolves through `statusTone()` to one of five semantic
 * tones, and every chip renders through `toneChip()`. Never write status
 * colours inline again; add the status here instead.
 */

export type Tone = "success" | "warning" | "danger" | "info" | "neutral";

/** Chip classes per tone. Text colours are the AA-safe `-ink` tokens. */
export const TONE_CHIP: Record<Tone, string> = {
  success: "border-success/45 bg-success-subtle text-success-ink",
  warning: "border-warning/45 bg-warning-subtle text-warning-ink",
  danger: "border-danger/45 bg-danger-subtle text-danger-ink",
  info: "border-primary/45 bg-primary-subtle text-info-ink",
  neutral: "border-line bg-neutral-subtle text-neutral-ink",
};

/** Border-only variant, for chips sitting on already tinted rows. */
export const TONE_OUTLINE: Record<Tone, string> = {
  success: "border-success text-success-ink",
  warning: "border-warning text-warning-ink",
  danger: "border-danger text-danger-ink",
  info: "border-primary text-info-ink",
  neutral: "border-line text-neutral-ink",
};

/** Solid accent — progress bars, severity rails, active markers. */
export const TONE_ACCENT: Record<Tone, string> = {
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  info: "bg-primary",
  neutral: "bg-neutral",
};

export function toneChip(tone: Tone): string {
  return TONE_CHIP[tone];
}

/**
 * The complete status vocabulary of the product, mapped once.
 * Unknown values fall back to `neutral` rather than throwing — a new enum
 * value must never break a screen.
 */
const TONES: Record<string, Tone> = {
  /* lead pipeline */
  new: "info",
  qualified: "info",
  quote_required: "warning",
  quote_sent: "info",
  negotiation: "warning",
  won: "success",
  scheduled: "info",
  in_progress: "info",
  completed: "success",
  lost: "danger",
  cancelled: "neutral",

  /* lead priority */
  critical: "danger",
  high: "warning",
  normal: "neutral",
  low: "neutral",

  /* lead temperature */
  hot: "danger",
  warm: "warning",
  cold: "neutral",

  /* partner lifecycle */
  draft: "neutral",
  submitted: "info",
  under_review: "info",
  more_info_required: "warning",
  approved: "success",
  suspended: "warning",
  rejected: "danger",

  /* job execution */
  en_route: "info",
  on_site: "info",
  paused: "warning",
  verified: "success",

  /* materials, change orders, approvals */
  proposed: "info",
  approval_required: "warning",
  purchased: "info",
  installed: "success",
  awaiting_customer: "warning",
  pending: "warning",
  accepted: "success",
  declined: "danger",
  withdrawn: "neutral",
  expired: "danger",

  /* invoices and work orders */
  issued: "info",
  paid: "success",
  overdue: "danger",
  planned: "neutral",
  dispatched: "info",
  on_hold: "warning",

  /* inquiry queue stages */
  unqualified: "neutral",
  site_visit_required: "info",
  ready_for_allocation: "info",
  assigned_internal: "info",
  sent_to_partners: "info",
  spam_review: "danger",

  /* dashboard severity */
  info: "info",
  warning: "warning",
  danger: "danger",
  success: "success",
  neutral: "neutral",
};

export function statusTone(status: string | null | undefined): Tone {
  if (!status) return "neutral";
  return TONES[status] ?? "neutral";
}

/** Countdown tone: green while there is room, warning near the deadline, danger past it. */
export function deadlineTone(remainingRatio: number): Tone {
  if (remainingRatio <= 0) return "danger";
  return remainingRatio < 0.25 ? "warning" : "success";
}
