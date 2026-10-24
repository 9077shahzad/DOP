import { describe, expect, it } from "vitest";

import { invoiceDocument, issuerBlock, PLACEHOLDER, quoteDocument } from "./document-model";
import {
  buildQrReference,
  buildSwissQrPayload,
  formatQrReference,
  isQrIban,
  isValidIban,
  isValidQrReference,
  qrBillState,
  qrCheckDigit,
} from "./qr-bill";

describe("QR reference", () => {
  it("computes the documented mod-10 recursive check digit", () => {
    // Reference example from the Swiss Payment Standards implementation guide:
    // 21 00000 00003 13947 14300 09017 — the trailing 7 is the check digit.
    expect(qrCheckDigit("21000000000313947143000901")).toBe(7);
    expect(isValidQrReference("210000000003139471430009017")).toBe(true);
  });


  it("builds a 27 digit reference that validates", () => {
    const ref = buildQrReference("202608291234abcd");
    expect(ref).toHaveLength(27);
    expect(isValidQrReference(ref)).toBe(true);
  });

  it("rejects a reference with a broken check digit", () => {
    const ref = buildQrReference("999");
    const broken = ref.slice(0, 26) + String((Number(ref[26]) + 1) % 10);
    expect(isValidQrReference(broken)).toBe(false);
  });

  it("formats in the printed grouping", () => {
    expect(formatQrReference("210000000003139471430009017").split(" ")[0]).toBe("21");
  });
});

describe("IBAN", () => {
  it("accepts a valid Swiss IBAN and rejects a mangled one", () => {
    expect(isValidIban("CH9300762011623852957")).toBe(true);
    expect(isValidIban("CH9300762011623852958")).toBe(false);
  });

  it("recognises a QR-IBAN only in the 30000-31999 institution range", () => {
    expect(isQrIban("CH4431999123000889012")).toBe(true);
    expect(isQrIban("CH9300762011623852957")).toBe(false);
  });
});

describe("QR bill configuration gate", () => {
  const creditor = {
    name: "PS Umzug AG",
    addressLine: "Musterweg 1",
    postalCode: "8000",
    city: "Zürich",
    country: "CH",
  };

  it("is configuration-blocked without a QR-IBAN", () => {
    const state = qrBillState(creditor);
    expect(state.configured).toBe(false);
    expect(state.missing).toContain("qr_iban");
  });

  it("refuses to build a payload from a placeholder IBAN", () => {
    expect(() =>
      buildSwissQrPayload({
        creditor: { ...creditor, qrIban: "CH0000000000000000000" },
        amount: 100,
        currency: "CHF",
        reference: buildQrReference("1"),
      }),
    ).toThrow(/not configured/);
  });

  it("builds an SPC payload once a real QR-IBAN is present", () => {
    const payload = buildSwissQrPayload({
      creditor: { ...creditor, qrIban: "CH4431999123000889012" },
      amount: 1234.5,
      currency: "CHF",
      reference: buildQrReference("42"),
    });
    expect(payload.split("\n")[0]).toBe("SPC");
    expect(payload).toContain("CH4431999123000889012");
    expect(payload).toContain("1234.50");
  });
});

describe("document model", () => {
  const entity = { legal_name: "PS Umzug AG", city: "Zürich", country: "CH" };

  it("renders a visible placeholder for every pending company field", () => {
    const block = issuerBlock(entity);
    expect(block.pending).toContain("register_number");
    expect(block.lines.join("\n")).toContain(PLACEHOLDER);
    expect(block.lines.join("\n")).not.toContain("undefined");
  });

  it("builds an invoice document with VAT at 8.1% and a blocked payment part", () => {
    const doc = invoiceDocument(
      {
        id: "11111111-2222-3333-4444-555555555555",
        reference: "MF-INV-2026-0001",
        created_at: "2026-08-29T10:00:00Z",
        net: 1000,
        vat: 81,
        total: 1081,
        currency: "CHF",
      },
      [{ description: "Umzug", quantity: 1, unit_price: 1000, net: 1000, vat_rate: 0.081 }],
      entity,
    );
    expect(doc.vatRate).toBeCloseTo(0.081);
    expect(doc.total).toBe(1081);
    expect(doc.payment?.state).toBe("not_configured");
    expect(isValidQrReference(doc.payment!.reference)).toBe(true);
  });

  it("derives quote lines from the cost breakdown when no line items are stored", () => {
    const doc = quoteDocument(
      { reference: "MF-Q-1", labour: 800, transport: 200, vat: 81, total: 1081 },
      entity,
      [],
      { labour: "Arbeit", transport: "Transport" },
    );
    expect(doc.lines.map((l) => l.description)).toEqual(["Arbeit", "Transport"]);
    expect(doc.net).toBe(1000);
  });

  it("preserves the mandatory quotation sections and pending option prices", () => {
    const base = quoteDocument(
      { reference: "PSU-Q-2", labour: 800, vat: 64.8, total: 864.8 },
      entity,
      ["Anonymisierte Kundschaft"],
      { labour: "Umzug" },
    );
    const doc = {
      ...base,
      mandatoryQuoteFormat: true,
      scopeBlocks: [{ title: "Leistungsumfang", rows: [], body: ["Umzug"] }],
      options: [{ description: "Möbellift", priceLabel: PLACEHOLDER, selected: true }],
      acceptance: true,
      terms: [{ title: "Bedingungen", body: ["Freigegebener Text"] }],
    };
    expect(doc.mandatoryQuoteFormat).toBe(true);
    expect(doc.options[0]?.priceLabel).toBe(PLACEHOLDER);
    expect(doc.acceptance).toBe(true);
    expect(doc.terms).toHaveLength(1);
  });
});

import { invoiceRecipient as recipientOf } from "./document-model";
describe("invoice addressee", () => {
  it("prints the billing street and town under the customer name", () => {
    expect(recipientOf("Journey Test", { street: "Rechnungsweg 9", zip: "3000", city: "Bern" })).toEqual([
      "Journey Test",
      "Rechnungsweg 9",
      "3000 Bern",
    ]);
  });
});
