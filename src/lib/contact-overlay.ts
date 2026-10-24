/**
 * Order documents print the immutable accepted snapshot, but show the latest
 * corrected customer contact details. Only these administrative fields are
 * taken from the current record — price, scope, dates and terms never are.
 */
export const CORRECTABLE_CONTACT_FIELDS = [
  "customer_name",
  "customer_company",
  "customer_phone",
  "customer_email",
  "customer_street",
  "customer_zip",
  "customer_city",
  "customer_country",
] as const;

export function withCorrectedContact<T extends object>(snapshot: T, current: object | null | undefined): T {
  if (!current) return snapshot;
  const out = { ...snapshot } as Record<string, unknown>;
  const cur = current as Record<string, unknown>;
  for (const k of CORRECTABLE_CONTACT_FIELDS) if (k in cur) out[k] = cur[k];
  return out as T;
}
