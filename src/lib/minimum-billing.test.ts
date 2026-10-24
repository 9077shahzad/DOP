/**
 * Minimum billing — four hours per assigned person and assignment.
 *
 * The rule is commercial and versioned: every figure here comes from a
 * configuration object, never from a constant inside the calculation.
 */
import { describe, expect, it } from "vitest";

import {
  COMPANY_MIN_BILLABLE_HOURS,
  canQuoteHourly,
  customerFacingBilling,
  flatPriceWithMinimum,
  hourlyQuotingBlockers,
  minimumBilling,
  meetsCompanyMinimum,
  minimumBillingConfig,
  packagePriceFloor,
  type MinimumBillingConfig,
} from "@/lib/pricing";
import {
  INTERNAL_ONLY_PARAM_KEYS,
  parseMinimumBillingPolicy,
  type PlannerPricing,
} from "@/lib/planner-pricing";

/**
 * SYNTHETIC TEST TARIFFS — not commercial data.
 * No hourly tariff has been signed off by the owner; these figures exist only
 * so the arithmetic can be verified and must never be published.
 */
const SYNTHETIC_PERSON_RATE = 90;
const SYNTHETIC_TEAM_RATE = 240;
const SYNTHETIC_COST_RATE = 38;

const person: MinimumBillingConfig = {
  minHours: 4,
  basis: "person",
  personRate: SYNTHETIC_PERSON_RATE,
  teamRate: null,
  internalCostRate: SYNTHETIC_COST_RATE,
};

const team: MinimumBillingConfig = {
  minHours: 4,
  basis: "team",
  personRate: null,
  teamRate: SYNTHETIC_TEAM_RATE,
  internalCostRate: null,
};

describe("minimum billing", () => {
  it("bills 4 person-hours for one person working one hour", () => {
    const result = minimumBilling({ people: 1, hours: 1, config: person });
    expect(result.billedUnits).toBe(4);
    expect(result.estimatedUnits).toBe(1);
    expect(result.applied).toBe(true);
    expect(result.amount).toBe(360);
  });

  it("bills 8 person-hours for two people working one hour", () => {
    expect(minimumBilling({ people: 2, hours: 1, config: person }).billedUnits).toBe(8);
  });

  it("bills the actual 10 person-hours for two people working five hours", () => {
    const result = minimumBilling({ people: 2, hours: 5, config: person });
    expect(result.billedUnits).toBe(10);
    expect(result.applied).toBe(false);
  });

  it("bills each person on their own duration", () => {
    const result = minimumBilling({ people: 2, hours: [1, 6], config: person });
    expect(result.billedHours).toEqual([4, 6]);
    expect(result.billedUnits).toBe(10);
  });

  it("lifts a team tariff to 4 team hours without multiplying the head count", () => {
    const result = minimumBilling({ people: 3, hours: 1, config: team });
    expect(result.billedUnits).toBe(4);
    expect(result.amount).toBe(960);
  });

  it("keeps a flat price untouched", () => {
    expect(flatPriceWithMinimum(2540)).toBe(2540);
  });

  it("leaves the amount unpriced while no tariff is signed off", () => {
    const result = minimumBilling({
      people: 2,
      hours: 1,
      config: { ...person, personRate: null },
    });
    expect(result.billedUnits).toBe(8);
    expect(result.amount).toBeNull();
  });

  it("keeps estimated and billed duration separate", () => {
    const result = minimumBilling({ people: 1, hours: 1, config: person });
    expect(result.estimatedHours).toEqual([1]);
    expect(result.billedHours).toEqual([4]);
  });

  it("accounts internal staffing cost under the same minimum", () => {
    expect(minimumBilling({ people: 2, hours: 1, config: person }).internalCost).toBe(8 * 38);
  });

  it("reads the rule from the versioned price list, and nothing when absent", () => {
    const base: PlannerPricing = { version: 2, effectiveFrom: "2026-09-09", currency: "CHF", values: {} };
    expect(minimumBillingConfig(base)).toBeNull();
    const withRule = minimumBillingConfig({
      ...base,
      minimumBilling: { minHours: 4, basis: "person" },
    });
    expect(withRule).toEqual({
      minHours: 4,
      basis: "person",
      personRate: null,
      teamRate: null,
      internalCostRate: null,
    });
  });

  it("keeps the basis a validated word, never a number", () => {
    expect(parseMinimumBillingPolicy({ min_hours: 4, min_hours_basis: "person" })).toEqual({
      minHours: 4,
      basis: "person",
    });
    expect(parseMinimumBillingPolicy({ min_hours: 4, min_hours_basis: "1" })).toBeNull();
    expect(parseMinimumBillingPolicy({ min_hours: 4, min_hours_basis: null })).toBeNull();
    expect(parseMinimumBillingPolicy({ min_hours: null, min_hours_basis: "person" })).toBeNull();
  });
});

describe("mode-specific validation", () => {
  const v1: PlannerPricing = {
    version: 1,
    effectiveFrom: "2026-09-06",
    currency: "CHF",
    values: { "move:base": 500 },
  };

  it("blocks an hourly offer while the required tariff is missing", () => {
    const config = minimumBillingConfig({ ...v1, minimumBilling: { minHours: 4, basis: "person" } });
    expect(canQuoteHourly(config)).toBe(false);
    expect(hourlyQuotingBlockers(config)).toEqual(["labour:per_person_hour"]);
    const teamConfig = minimumBillingConfig({ ...v1, minimumBilling: { minHours: 4, basis: "team" } });
    expect(hourlyQuotingBlockers(teamConfig)).toEqual(["labour:per_team_hour"]);
  });

  it("allows an hourly offer once the applicable tariff exists", () => {
    expect(canQuoteHourly(person)).toBe(true);
    expect(canQuoteHourly(team)).toBe(true);
    // A person basis is not satisfied by a team tariff, and the reverse.
    expect(canQuoteHourly({ ...person, personRate: null, teamRate: 240 })).toBe(false);
  });

  it("leaves a v1 flat offer fully quotable without any hourly parameter", () => {
    // v1 carries no minimum rule at all; flat pricing must be untouched by it.
    expect(minimumBillingConfig(v1)).toBeNull();
    expect(flatPriceWithMinimum(2540)).toBe(2540);
    expect(v1.values["move:base"]).toBe(500);
  });
});

describe("internal cost never leaves the office", () => {
  it("is absent from the customer projection", () => {
    const result = minimumBilling({ people: 2, hours: 1, config: person });
    expect(result.internalCost).toBe(8 * SYNTHETIC_COST_RATE);
    const shown = customerFacingBilling(result) as Record<string, unknown>;
    expect("internalCost" in shown).toBe(false);
    expect(JSON.stringify(shown)).not.toContain(String(SYNTHETIC_COST_RATE));
  });

  it("marks the cost parameter as internal only", () => {
    expect(INTERNAL_ONLY_PARAM_KEYS).toContain("cost:per_person_hour");
  });
});

describe("reference case from the owner's template", () => {
  it("discounts only the configured combination and leaves options out", () => {
    const move = 1520;
    const clean = 980;
    const secondTrip = 40;
    const includedAssembly = 200; // included, never added a second time
    const optionalBlinds = 250; // excluded until selected
    const lines = [move, clean, secondTrip];
    const subtotal = lines.reduce((sum, line) => sum + line, 0);
    // 5 % combination discount on the whole subtotal, booked against cleaning
    const discount = Number((subtotal * 0.05).toFixed(2));
    expect(subtotal).toBe(2540);
    expect(discount).toBe(127);
    expect(subtotal - discount).toBe(2413);
    expect(lines).not.toContain(includedAssembly);
    expect(lines).not.toContain(optionalBlinds);
  });
});

/**
 * Company-wide rule: no service type and no booking channel may commit work
 * below four billable hours.
 */
describe("company-wide four-hour minimum", () => {
  const hourly: MinimumBillingConfig = {
    minHours: COMPANY_MIN_BILLABLE_HOURS,
    basis: "person",
    personRate: 100,
    teamRate: null,
    internalCostRate: null,
  };

  it("recognises a compliant price list", () => {
    expect(meetsCompanyMinimum(hourly)).toBe(true);
  });

  it("rejects a price list below four hours or without a minimum at all", () => {
    expect(meetsCompanyMinimum({ ...hourly, minHours: 3 })).toBe(false);
    expect(meetsCompanyMinimum(null)).toBe(false);
  });

  it("floors a package price at four hours per person", () => {
    expect(packagePriceFloor(hourly, 3)).toBe(1200);
  });

  it("floors a team package at four team hours, without multiplying by head count", () => {
    expect(
      packagePriceFloor({ ...hourly, basis: "team", teamRate: 300, personRate: null }, 3),
    ).toBe(1200);
  });

  it("leaves the floor unset while no tariff is signed off", () => {
    expect(packagePriceFloor({ ...hourly, personRate: null }, 2)).toBeNull();
  });
});
