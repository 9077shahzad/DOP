/**
 * Swiss QR-bill — reference generation and creditor configuration.
 *
 * The payment part is a template. Everything that identifies the creditor —
 * name, address, QR-IBAN — is configuration, and none of it exists yet. The
 * one rule this file exists to enforce: a QR code is produced only from a
 * fully configured, structurally valid creditor. A scannable code carrying an
 * invalid IBAN is worse than no code at all, because someone will pay it.
 */

export const QR_REFERENCE_LENGTH = 27;

/** Mod-10 recursive (Kundenidentifikation / QRR) — the Swiss banking check digit. */
const MOD10_TABLE = [
  [0, 9, 4, 6, 8, 2, 7, 1, 3, 5],
  [9, 4, 6, 8, 2, 7, 1, 3, 5, 0],
  [4, 6, 8, 2, 7, 1, 3, 5, 0, 9],
  [6, 8, 2, 7, 1, 3, 5, 0, 9, 4],
  [8, 2, 7, 1, 3, 5, 0, 9, 4, 6],
  [2, 7, 1, 3, 5, 0, 9, 4, 6, 8],
  [7, 1, 3, 5, 0, 9, 4, 6, 8, 2],
  [1, 3, 5, 0, 9, 4, 6, 8, 2, 7],
  [3, 5, 0, 9, 4, 6, 8, 2, 7, 1],
  [5, 0, 9, 4, 6, 8, 2, 7, 1, 3],
] as const;

export function qrCheckDigit(digits: string): number {
  let carry = 0;
  for (const char of digits) {
    const digit = Number(char);
    if (!Number.isInteger(digit)) throw new Error("qrCheckDigit: digits only");
    carry = MOD10_TABLE[carry]![digit]!;
  }
  return (10 - carry) % 10;
}

/** 26 payload digits (right aligned, zero padded) plus the check digit. */
export function buildQrReference(seed: string): string {
  const digits = seed.replace(/\D/g, "").slice(0, 26).padStart(26, "0");
  return digits + String(qrCheckDigit(digits));
}

export function isValidQrReference(reference: string): boolean {
  const clean = reference.replace(/\s/g, "");
  if (!/^\d{27}$/.test(clean)) return false;
  return qrCheckDigit(clean.slice(0, 26)) === Number(clean.slice(26));
}

/** Printed grouping: two leading digits, then blocks of five. */
export function formatQrReference(reference: string): string {
  const clean = reference.replace(/\s/g, "");
  if (clean.length !== QR_REFERENCE_LENGTH) return clean;
  return `${clean.slice(0, 2)} ${clean.slice(2).replace(/(.{5})/g, "$1 ").trim()}`;
}

export function normalizeIban(value: string): string {
  return (value ?? "").replace(/\s/g, "").toUpperCase();
}

export function formatIban(value: string): string {
  return normalizeIban(value).replace(/(.{4})/g, "$1 ").trim();
}

/** ISO 13616 mod-97. */
export function isValidIban(value: string): boolean {
  const iban = normalizeIban(value);
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(iban)) return false;
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  let remainder = 0;
  for (const char of rearranged) {
    const chunk = /\d/.test(char) ? char : String(char.charCodeAt(0) - 55);
    remainder = Number(String(remainder) + chunk) % 97;
  }
  return remainder === 1;
}

/** A QR-IBAN is a Swiss IBAN whose institution id is in the 30000–31999 range. */
export function isQrIban(value: string): boolean {
  const iban = normalizeIban(value);
  if (!isValidIban(iban)) return false;
  if (!/^(CH|LI)/.test(iban)) return false;
  const iid = Number(iban.slice(4, 9));
  return iid >= 30000 && iid <= 31999;
}

export type CreditorConfig = {
  name: string;
  addressLine: string;
  postalCode: string;
  city: string;
  country: string;
  qrIban: string;
};

export type QrBillState = {
  /** True only when a real QR code may be rendered. */
  configured: boolean;
  /** Machine keys of everything still missing or structurally invalid. */
  missing: string[];
};

/**
 * Which reference type the account supports. A bank-issued QR-IBAN carries the
 * structured QRR reference; an ordinary IBAN is equally valid in the Swiss QR
 * standard, but then the bill must be issued without a structured reference
 * (NON) and the invoice number travels in the message field.
 */
export function qrReferenceMode(iban: string): "QRR" | "NON" | null {
  const clean = normalizeIban(iban);
  if (!isValidIban(clean)) return null;
  return isQrIban(clean) ? "QRR" : "NON";
}

export function qrBillState(config: Partial<CreditorConfig> | null | undefined): QrBillState {
  const missing: string[] = [];
  const c = config ?? {};
  if (!(c.name ?? "").trim()) missing.push("creditor_name");
  if (!(c.addressLine ?? "").trim()) missing.push("creditor_address");
  if (!(c.postalCode ?? "").trim()) missing.push("creditor_postal_code");
  if (!(c.city ?? "").trim()) missing.push("creditor_city");
  if (!(c.country ?? "").trim()) missing.push("creditor_country");
  const iban = normalizeIban(c.qrIban ?? "");
  if (!iban) missing.push("qr_iban");
  else if (!qrReferenceMode(iban)) missing.push("qr_iban_invalid");
  return { configured: missing.length === 0, missing };
}

export type QrBillInput = {
  creditor: Partial<CreditorConfig>;
  amount: number;
  currency: string;
  reference: string;
  debtor?: { name?: string; addressLine?: string; postalCode?: string; city?: string };
  message?: string;
};

/**
 * Swiss Payment Standards SPC payload. Throws unless the creditor is fully
 * configured — callers must render the "not configured" state instead of
 * catching this and emitting a partial code.
 */
export function buildSwissQrPayload(input: QrBillInput): string {
  const state = qrBillState(input.creditor);
  if (!state.configured) {
    throw new Error(`QR bill not configured: ${state.missing.join(", ")}`);
  }
  const c = input.creditor as CreditorConfig;
  const mode = qrReferenceMode(c.qrIban);
  if (mode === "QRR" && !isValidQrReference(input.reference)) {
    throw new Error("QR bill: invalid structured reference");
  }
  const d = input.debtor ?? {};
  // Without a QR-IBAN the standard forbids a structured reference: the invoice
  // number is carried as unstructured information instead.
  const message =
    mode === "QRR"
      ? (input.message ?? "")
      : [input.message, input.reference].map((v) => (v ?? "").trim()).filter(Boolean).join(" · ").slice(0, 140);
  return [
    "SPC",
    "0200",
    "1",
    normalizeIban(c.qrIban),
    "S",
    c.name,
    c.addressLine,
    "",
    c.postalCode,
    c.city,
    c.country,
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    input.amount.toFixed(2),
    input.currency,
    d.name ? "S" : "",
    d.name ?? "",
    d.addressLine ?? "",
    "",
    d.postalCode ?? "",
    d.city ?? "",
    d.name ? "CH" : "",
    mode === "QRR" ? "QRR" : "NON",
    mode === "QRR" ? input.reference.replace(/\s/g, "") : "",
    message,
    "EPD",
  ].join("\n");
}

/** Browser-safe SVG data URL for a validated Swiss QR payload. */
export async function swissQrDataUrl(input: QrBillInput): Promise<string> {
  const QRCode = await import("qrcode");
  return QRCode.toDataURL(buildSwissQrPayload(input), {
    errorCorrectionLevel: "M",
    margin: 0,
    width: 768,
    color: { dark: "#000000", light: "#ffffff" },
  });
}

/** Browser-safe QR code for arbitrary text (quote link, contact card). */
export async function plainQrDataUrl(text: string): Promise<string> {
  const QRCode = await import("qrcode");
  return QRCode.toDataURL(text, {
    errorCorrectionLevel: "M",
    margin: 0,
    width: 512,
    color: { dark: "#19457C", light: "#ffffff" },
  });
}
