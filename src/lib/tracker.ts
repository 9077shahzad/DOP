/**
 * Public status tracker.
 *
 * A customer sees the state of their own inquiry only by proving they own it:
 * the reference plus the e-mail address or phone number used on the form. The
 * database function returns a redacted projection — no address, no value, no
 * internal owner — and the SLA deadlines come from the queue the lead was
 * routed to, so the countdown a customer sees is the same clock the team runs on.
 */
import { supabase } from "@/integrations/supabase/client";
import { rowLabel } from "@/lib/i18n-label";
import type { Lang } from "@/i18n/config";

export type TrackerRow = {
  reference: string;
  stage: string;
  source_key: string;
  queue_key: string;
  label_de: string;
  label_fr: string;
  label_it: string;
  label_en: string;
  language: string;
  created_at: string;
  updated_at: string;
  first_review_at: string | null;
  first_contact_at: string | null;
  quoted_at: string | null;
  review_due_at: string | null;
  contact_due_at: string | null;
  quote_due_at: string | null;
};

/** Customer-visible workflow, in order. `stage` from the database maps into it. */
export const TRACKER_STEPS = [
  "received",
  "under_review",
  "offer_sent",
  "confirmed",
  "scheduled",
  "in_progress",
  "completed",
] as const;

export type TrackerStep = (typeof TRACKER_STEPS)[number];

export function stepIndex(stage: string): number {
  if (stage === "closed") return TRACKER_STEPS.length;
  const index = (TRACKER_STEPS as readonly string[]).indexOf(stage);
  return index < 0 ? 0 : index;
}

export function queueLabel(row: TrackerRow, lang: Lang): string {
  return rowLabel(row, lang, row.label_de || row.queue_key);
}

export type SlaClock = {
  key: "review" | "contact" | "quote";
  dueAt: string | null;
  doneAt: string | null;
  /** Minutes left; negative when overdue. Null when there is no deadline. */
  minutesLeft: number | null;
  state: "done" | "due" | "soon" | "overdue" | "none";
};

export function slaClocks(row: TrackerRow, now = Date.now()): SlaClock[] {
  const build = (
    key: SlaClock["key"],
    dueAt: string | null,
    doneAt: string | null,
  ): SlaClock => {
    if (doneAt) return { key, dueAt, doneAt, minutesLeft: null, state: "done" };
    if (!dueAt) return { key, dueAt, doneAt, minutesLeft: null, state: "none" };
    const minutesLeft = Math.round((new Date(dueAt).getTime() - now) / 60_000);
    const state: SlaClock["state"] =
      minutesLeft < 0 ? "overdue" : minutesLeft <= 30 ? "soon" : "due";
    return { key, dueAt, doneAt, minutesLeft, state };
  };
  return [
    build("review", row.review_due_at, row.first_review_at),
    build("contact", row.contact_due_at, row.first_contact_at),
    build("quote", row.quote_due_at, row.quoted_at),
  ];
}

/** Human countdown, e.g. `2 h 05` or `-14 min`. Locale words come from i18n. */
export function countdownParts(minutes: number): { hours: number; minutes: number; overdue: boolean } {
  const overdue = minutes < 0;
  const abs = Math.abs(minutes);
  return { hours: Math.floor(abs / 60), minutes: abs % 60, overdue };
}

export async function fetchTracker(reference: string, contact: string): Promise<TrackerRow | null> {
  const { data, error } = await supabase.rpc("lead_tracker", {
    _reference: reference.trim(),
    _contact: contact.trim(),
  });
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as unknown as TrackerRow[];
  return rows[0] ?? null;
}
