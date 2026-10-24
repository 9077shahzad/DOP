/**
 * Service areas.
 * INDICATIVE DATA — response times, surcharges and survey lead times are
 * planning values only, until dispatch scheduling is live.
 *
 * The authoritative, admin-editable list lives in the database table
 * `service_zones`. This list is the public-site fallback and is deliberately
 * limited to the areas PS Umzug AG has confirmed: Steffisburg, Thun, Bern.
 * Do not add areas here without a business decision.
 */
export type Coverage = "core" | "extended";

export type Region = {
  id: string;
  name: string;
  coverage: Coverage;
  /** Response time in hours. */
  responseHours: number;
  /** Travel surcharge in CHF. */
  surchargeChf: number;
  /** Lead time to the next survey, in days. */
  surveyDays: string;
};

export const REGIONS: Region[] = [
  { id: "steffisburg", name: "Steffisburg", coverage: "core", responseHours: 24, surchargeChf: 0, surveyDays: "1–2" },
  { id: "thun", name: "Thun", coverage: "core", responseHours: 24, surchargeChf: 0, surveyDays: "1–2" },
  { id: "bern", name: "Bern", coverage: "core", responseHours: 24, surchargeChf: 0, surveyDays: "1–2" },
];
