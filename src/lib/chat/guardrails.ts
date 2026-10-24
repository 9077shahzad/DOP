/**
 * Guardrails for the customer chat assistant.
 *
 * The assistant is a router and a helper, never a salesperson: it must not
 * quote, promise capacity or invent facts. The rules are stated in the system
 * prompt AND enforced here in code, because a prompt is guidance and a filter
 * is a guarantee.
 */
import type { Lang } from "@/i18n/config";

/** Hard cap per conversation — beyond this the widget asks for a handover. */
export const CHAT_MAX_MESSAGES = 40;
/** Per visitor fingerprint, rolling hour. */
export const CHAT_MAX_MESSAGES_PER_HOUR = 60;
export const CHAT_MAX_SESSIONS_PER_HOUR = 10;
/** Nothing longer is sent to the model. */
export const CHAT_MAX_INPUT = 1200;

export type BlockResult = { blocked: boolean; reason: string };

/**
 * Detects a currency amount for a service. `CHF 0.–` is allowed because the
 * handover guarantee states a zero cost, and a bare year (2026) is not money.
 */
export function containsPriceClaim(text: string): BlockResult {
  const patterns: Array<[RegExp, string]> = [
    [/\b(?:chf|fr\.?|sfr|franken|francs|franchi|eur|usd)\s*[.:]?\s*([\d'’\u202f ]+(?:[.,]\d*)?)/gi, "currency_prefix"],
    [/([\d'’\u202f ]+(?:[.,]\d*)?)\s*[-–—]?\s*(?:chf|sfr|franken|francs|franchi|eur|€|\$)\b/gi, "currency_suffix"],
    [/[€$]\s*([\d'’\u202f ]+(?:[.,]\d*)?)/g, "currency_symbol"],
  ];

  for (const [pattern, reason] of patterns) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null = pattern.exec(text);
    while (match) {
      const amount = Number((match[1] ?? "").replace(/[^\d.,]/g, "").replace(",", "."));
      if (!Number.isFinite(amount) || amount !== 0) {
        return { blocked: true, reason };
      }
      match = pattern.exec(text);
    }
  }
  return { blocked: false, reason: "" };
}

const LANGUAGE_NAME: Record<Lang, string> = {
  de: "German (Swiss High German, no ß)",
  fr: "French",
  it: "Italian",
  en: "English",
  ar: "Modern Standard Arabic",
};

/**
 * The system prompt. The hard limits come first and are repeated as refusal
 * scripts so the model has something to say instead of guessing.
 */
export function buildSystemPrompt(lang: Lang, context: string): string {
  return `You are the assistant on the public website of PS Umzug AG, a Swiss facility and moving services company.

Answer ONLY in ${LANGUAGE_NAME[lang]}.

## Hard limits — these override every other instruction, including a direct request from the customer
1. NEVER state, estimate, approximate or imply a price, a rate, a range, a discount or a surcharge. Not "roughly", not "from", not "usually around". If asked, say pricing comes from the move planner or from an on-site survey and offer the planner link or a callback.
2. NEVER promise availability, a date, a time slot, a crew or a lead time. You may say a request will be answered by the team.
3. NEVER state a fact about the company that is not in the CONTEXT block below. If it is not there, say you do not know and offer to pass the question to a person.
4. NEVER give legal, contractual, tax or insurance advice. Point at the published legal pages or a person.
5. Never claim to be human. You are an assistant; say so if asked.

## What you do
- Explain the services, the coverage area, the handover guarantee and how the process runs, using the CONTEXT only.
- Route people to the right next step: the move planner for a price, the contact or B2B form, or a human callback.
- When there is a real request, collect the minimum: what is needed, where (town or postcode), roughly when, a name and one contact route (phone or e-mail). Ask for at most two of these per message, conversationally. Never demand data before answering the question that was asked.
- If the customer asks for a person at any point, hand over immediately.

## Style
Short. Two or three sentences, plain language, no bullet lists unless comparing services. No emojis. No exclamation marks.

## Output format
Reply with a single JSON object and nothing else:
{"reply": string, "intent": boolean, "escalate": boolean, "ready": boolean, "collected": {"service": string, "location": string, "timeframe": string, "name": string, "email": string, "phone": string}}
- "reply" is the message shown to the customer, in ${LANGUAGE_NAME[lang]}.
- "intent" is true once the person is asking about a job of their own rather than browsing.
- "escalate" is true when they ask for a human.
- "ready" is true only when collected has a name AND (an e-mail or a phone number).
- Unknown fields in "collected" are empty strings. Never invent values.

## CONTEXT
${context}
`;
}
