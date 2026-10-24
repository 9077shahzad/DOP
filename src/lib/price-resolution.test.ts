import { describe, expect, it } from "vitest";

import {
  CLEANING_BANDS,
  discountTiers,
  auditBands,
  bundleDiscountRate,
  matchBand,
  resolvePortalPrice,
  type RateRow,
  type Band,
} from "@/lib/price-resolution";

const rates: RateRow[] = [
  { service: "clean", unit_type: "1.5-2.5", price: 520 },
  { service: "clean", unit_type: "2.5-3.5", price: 640 },
  { service: "clean", unit_type: "3.5", price: 740 },
  { service: "clean", unit_type: "4.5", price: 880 },
  { service: "clearance", unit_type: "per_m3", price: 95 },
  { service: "repairs", unit_type: "per_hour", price: 110 },
  { service: "clearance", unit_type: "m3_per_room", price: 2.2 },
  { service: "repairs", unit_type: "hours_per_job", price: 2 },
  { service: "handover", unit_type: "flat", price: 180 },
  { service: "engine", unit_type: "vat_rate", price: 0.081 },
  { service: "engine", unit_type: "bundle_two", price: 0.05 },
  { service: "engine", unit_type: "bundle_three", price: 0.08 },
];

/** Portal resolution always receives published bands; the fixture supplies them. */
const price = (input: Omit<Parameters<typeof resolvePortalPrice>[0], "bands"> & { bands?: Band[] }) =>
  resolvePortalPrice({ bands: CLEANING_BANDS, ...input });

describe("band contiguity", () => {
  it("has no gap and no overlap across cleaning bands", () => {
    const audit = auditBands(CLEANING_BANDS);
    expect(audit.gaps).toEqual([]);
    expect(audit.overlaps).toEqual([]);
  });

  // below / exactly at / immediately above every boundary
  const boundaries = [1.5, 2.5, 3.5, 4.5, 5.5];
  for (const b of boundaries) {
    it(`boundary ${b}: below, at, above each match at most one band`, () => {
      for (const v of [b - 0.01, b, b + 0.01]) {
        const hits = CLEANING_BANDS.filter((band) => v >= band.min && v < band.max);
        expect(hits.length).toBeLessThanOrEqual(1);
      }
    });
  }

  it("matches the lower band at an exact boundary, never the neighbour", () => {
    expect(matchBand(CLEANING_BANDS, 2.5)!.id).toBe("2.5-3.5");
    expect(matchBand(CLEANING_BANDS, 2.49)!.id).toBe("1.5-2.5");
    expect(matchBand(CLEANING_BANDS, 3.5)!.id).toBe("3.5");
    expect(matchBand(CLEANING_BANDS, 4.5)!.id).toBe("4.5");
  });

  it("is quotation-only outside the configured range", () => {
    expect(matchBand(CLEANING_BANDS, 1.49)).toBeNull();
    expect(matchBand(CLEANING_BANDS, 1.0)).toBeNull();
    expect(matchBand(CLEANING_BANDS, 5.5)).toBeNull();
    expect(matchBand(CLEANING_BANDS, 6)).toBeNull();
    expect(matchBand(CLEANING_BANDS, null)).toBeNull();
  });
});

describe("discount tiers", () => {
  it("steps exactly at the tier boundaries", () => {
    expect(bundleDiscountRate(1, rates)).toBe(0);
    expect(bundleDiscountRate(2, rates)).toBe(discountTiers(rates)[1]!.rate);
    expect(bundleDiscountRate(3, rates)).toBe(discountTiers(rates)[0]!.rate);
    expect(bundleDiscountRate(4, rates)).toBe(discountTiers(rates)[0]!.rate);
  });
});

describe("portal price resolution", () => {
  it("shows no price before a unit is chosen", () => {
    const r = price({
      unitId: null,
      rooms: 3.5,
      services: { clean: true },
      rates,
      discountRate: 0,
    });
    expect(r.state).toBe("incomplete");
    expect(r.state === "incomplete" && r.missing).toContain("unit");
  });

  it("shows no price when no service is selected", () => {
    const r = price({ unitId: "u1", rooms: 3.5, services: {}, rates, discountRate: 0 });
    expect(r.state).toBe("incomplete");
  });

  it("prices the selected unit's own room count", () => {
    const r = price({
      unitId: "u1",
      rooms: 2.5,
      services: { clean: true },
      rates,
      discountRate: 0,
    });
    expect(r.state).toBe("priced");
    if (r.state !== "priced") return;
    expect(r.subtotal).toBe(640);
    expect(r.lines[0]!.rule).toBe("clean:2.5-3.5");
    expect(r.stage).toBe("vertragspreis");
  });

  it("requires a quotation for an out-of-band unit", () => {
    const r = price({
      unitId: "u1",
      rooms: 6,
      services: { clean: true },
      rates,
      discountRate: 0,
    });
    expect(r.state).toBe("quotation");
  });

  it("requires a quotation when the room count is unrecorded", () => {
    const r = price({
      unitId: "u1",
      rooms: null,
      services: { clean: true },
      rates,
      discountRate: 0,
    });
    expect(r.state).toBe("quotation");
    expect(r.state === "quotation" && r.detail['rooms']).toBe("—");
  });

  it("prefers a unit override over a property override and the framework rate", () => {
    const base = {
      unitId: "u1",
      rooms: 3.5,
      services: { clean: true },
      rates,
      discountRate: 0,
    } as const;
    const property = price({
      ...base,
      overrides: [{ service: "clean", unit_type: "3.5", price: 700, property_id: "p1" }],
    });
    expect(property.state === "priced" && property.subtotal).toBe(700);
    const unit = price({
      ...base,
      overrides: [
        { service: "clean", unit_type: "3.5", price: 700, property_id: "p1" },
        { service: "clean", unit_type: "3.5", price: 610, unit_id: "u1" },
      ],
    });
    expect(unit.state === "priced" && unit.subtotal).toBe(610);
    expect(unit.state === "priced" && unit.scope).toBe("unit_override");
  });

  it("applies VAT to the discounted net", () => {
    const r = price({
      unitId: "u1",
      rooms: 3.5,
      services: { clean: true, handover: true },
      rates,
      discountRate: 0.05,
    });
    if (r.state !== "priced") throw new Error("expected a price");
    expect(r.subtotal).toBe(920);
    expect(r.discount).toBe(46);
    expect(r.net).toBe(874);
    expect(r.total).toBe(Math.round((874 + 874 * 0.081) * 100) / 100);
  });
});
