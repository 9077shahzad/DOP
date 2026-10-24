/**
 * Staff search over the offers list: customer name, phone or reference.
 * Builds a PostgREST `or` filter so the search runs over every permitted
 * record in the database (RLS still decides what the caller may see).
 */

/** Removes characters that would break the PostgREST filter syntax. */
function sanitize(input: string): string {
  return input.replace(/[,()*%\\:"']/g, " ").replace(/\s+/g, " ").trim();
}

/** Digits of a phone query, with +41 / 0041 written as the local 0. */
export function phoneDigits(input: string): string {
  let digits = input.replace(/\D/g, "");
  if (input.trim().startsWith("+41") || digits.startsWith("0041")) {
    digits = "0" + digits.replace(/^(00)?41/, "");
  }
  return digits;
}

/** Null when the query is empty; otherwise the `or` filter string. */
export function offerSearchFilter(raw: string): string | null {
  const text = sanitize(raw);
  if (!text) return null;
  const parts = [`customer_name.ilike.*${text}*`, `reference.ilike.*${text}*`, `customer_email.ilike.*${text}*`];
  const digits = phoneDigits(raw);
  if (digits.length >= 3) {
    // Spaces, dots and dashes between digits are tolerated: 0782183333 matches "078 218 33 33".
    parts.push(`customer_phone.ilike.*${digits.split("").join("*")}*`);
    // Stored international form: +41 78 … for a local 078 … query.
    if (digits.startsWith("0") && digits.length >= 4) {
      parts.push(`customer_phone.ilike.*41*${digits.slice(1).split("").join("*")}*`);
    }
  }
  return parts.join(",");
}
