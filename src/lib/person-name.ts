/**
 * First and last name are asked separately but stored as one customer name
 * ("Vorname Nachname"), so quotes, PDFs, orders and history stay unchanged.
 */
export function joinName(first: string, last: string): string {
  return [first.trim(), last.trim()].filter(Boolean).join(" ");
}

/** Best-effort split of an older single-field name: last word = last name. */
export function splitName(full: string | null | undefined): { first: string; last: string } {
  const parts = (full ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return { first: parts[0] ?? "", last: "" };
  return { first: parts.slice(0, -1).join(" "), last: parts[parts.length - 1]! };
}
