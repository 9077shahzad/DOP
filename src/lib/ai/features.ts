/**
 * AI Assist — the feature register (client-safe).
 *
 * Every AI call belongs to exactly one feature. The feature id is the key for
 * the admin flag, the budget, the usage counter and the audit row, so nothing
 * can run without being switched on, counted and reviewable.
 */

export const AI_FEATURES = [
  "lead_triage",
  "crew_voice_note",
  "photo_inventory",
  "crew_briefing",
  "owner_assistant",
  "translation",
  "completion_protocol",
  "quote_followup",
  "faq_assistant",
  "dispatch_recommendation",
] as const;

export type AiFeature = (typeof AI_FEATURES)[number];

/** Features implemented so far. The rest exist as flags only. */
export const AI_LIVE_FEATURES: AiFeature[] = ["lead_triage", "crew_voice_note", "photo_inventory", "crew_briefing"];

export type AiStatus = "proposed" | "accepted" | "edited" | "rejected" | "expired";
export type AiSubjectType = "lead" | "quote" | "job" | "incident" | "none";

export function isAiFeature(value: unknown): value is AiFeature {
  return typeof value === "string" && (AI_FEATURES as readonly string[]).includes(value);
}

/**
 * Why an AI call did not produce a suggestion. The screens always keep working
 * without AI, so every one of these is a plain notice, never an error page.
 */
export type AiUnavailable =
  | "disabled"
  | "budget"
  | "no_provider"
  | "rate_limited"
  | "provider_error"
  | "no_input";

export type AiRun<T> = { ok: true; suggestionId: string; result: T } | { ok: false; reason: AiUnavailable };
