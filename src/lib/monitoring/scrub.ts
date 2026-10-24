/**
 * Error payload scrubbing.
 *
 * An error tracker that ships customer data off-site is a data-protection
 * incident wearing an observability badge. Nothing leaves this file unless it
 * survives both filters: keys that are known to carry personal or commercial
 * data are dropped outright, and every remaining string is pattern-scrubbed.
 *
 * Known limit: a customer name sitting free-form inside a message cannot be
 * recognised by pattern. Callers that hold a name must pass it through
 * `sensitiveTerms` so it is redacted literally.
 */

export const REDACTED = "[redacted]";

/** Dropped whatever the value looks like. Matched case-insensitively as substrings. */
const SENSITIVE_KEY_PARTS = [
  "name",
  "email",
  "mail",
  "phone",
  "tel",
  "mobile",
  "address",
  "street",
  "strasse",
  "postal",
  "plz",
  "city",
  "ort",
  "contact",
  "customer",
  "debtor",
  "iban",
  "cost",
  "margin",
  "purchase_price",
  "partner_price",
  "token",
  "authorization",
  "auth",
  "apikey",
  "api_key",
  "secret",
  "password",
  "passwd",
  "cookie",
  "session",
  "jwt",
  "dsn",
];

/** Keys allowed through even though they contain a sensitive substring. */
const KEY_ALLOWLIST = ["job_name", "queue_name", "component_name", "table_name", "function_name"];

const PATTERNS: Array<[RegExp, string]> = [
  // e-mail
  [/[\w.+-]+@[\w-]+\.[\w.-]+/g, "[email]"],
  // bearer / JWT-shaped tokens and provider keys
  [/\beyJ[\w-]{10,}\.[\w-]{5,}\.[\w-]{5,}\b/g, "[token]"],
  [/\b(?:Bearer|Basic)\s+[\w\-._~+/=]{8,}/gi, "[token]"],
  [/\bsb_(?:publishable|secret)_[\w-]{8,}\b/g, "[token]"],
  [/\b(?:sk|pk|re)_[A-Za-z0-9]{12,}\b/g, "[token]"],
  // IBAN
  [/\b[A-Z]{2}\d{2}(?:[ ]?[A-Z0-9]{4}){2,7}\b/g, "[iban]"],
  // Swiss / international phone numbers
  [/(?:\+|00)\d[\d\s()./-]{7,}\d/g, "[phone]"],
  [/\b0\d{2}[\s./-]?\d{3}[\s./-]?\d{2}[\s./-]?\d{2}\b/g, "[phone]"],
  // "8005 Zürich" — postcode plus locality
  [/\b\d{4}\s+[A-ZÄÖÜ][\p{L}.-]+(?:\s[A-ZÄÖÜ][\p{L}.-]+)?/gu, "[locality]"],
  // "Bahnhofstrasse 12" — street plus house number
  [/\b[\p{L}.-]{3,}(?:strasse|straße|str\.|weg|gasse|platz|allee|rue|via|street)\s*\d+[a-z]?\b/giu, "[address]"],
  // Money — a partner cost or margin must never leave in a message string.
  [/\b(?:CHF|EUR|USD)\s?-?\d[\d'’.,\s]*\d?\b/gi, "[amount]"],
];


export function scrubText(value: string, sensitiveTerms: string[] = []): string {
  let out = value;
  for (const term of sensitiveTerms) {
    const clean = term.trim();
    if (clean.length < 3) continue;
    out = out.replaceAll(new RegExp(escapeRegExp(clean), "gi"), REDACTED);
  }
  for (const [pattern, replacement] of PATTERNS) out = out.replace(pattern, replacement);
  return out;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function isSensitiveKey(key: string): boolean {
  const lower = key.toLowerCase();
  if (KEY_ALLOWLIST.includes(lower)) return false;
  return SENSITIVE_KEY_PARTS.some((part) => lower.includes(part));
}

const MAX_DEPTH = 6;
const MAX_ARRAY = 50;

export function scrubValue(value: unknown, sensitiveTerms: string[] = [], depth = 0): unknown {
  if (value == null) return value;
  if (depth > MAX_DEPTH) return REDACTED;
  if (typeof value === "string") return scrubText(value, sensitiveTerms);
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) {
    return value.slice(0, MAX_ARRAY).map((item) => scrubValue(item, sensitiveTerms, depth + 1));
  }
  if (value instanceof Error) {
    return {
      name: value.name,
      message: scrubText(value.message, sensitiveTerms),
      stack: value.stack ? scrubText(value.stack, sensitiveTerms) : undefined,
    };
  }
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      out[key] = isSensitiveKey(key) ? REDACTED : scrubValue(entry, sensitiveTerms, depth + 1);
    }
    return out;
  }
  return REDACTED;
}

export type ErrorEnvelopePayload = {
  message: string;
  type: string;
  stack?: string;
  extra: Record<string, unknown>;
  tags: Record<string, string>;
};

/** The single place every outbound error payload passes through. */
export function scrubPayload(
  payload: ErrorEnvelopePayload,
  sensitiveTerms: string[] = [],
): ErrorEnvelopePayload {
  const stack = payload.stack ? scrubText(payload.stack, sensitiveTerms) : undefined;
  return {
    type: payload.type,
    message: scrubText(payload.message, sensitiveTerms),
    ...(stack !== undefined && { stack }),
    extra: scrubValue(payload.extra, sensitiveTerms) as Record<string, unknown>,
    tags: Object.fromEntries(
      Object.entries(payload.tags).map(([key, value]) => [
        key,
        isSensitiveKey(key) ? REDACTED : scrubText(String(value), sensitiveTerms),
      ]),
    ),
  };
}
