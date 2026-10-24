/**
 * Partner Network — shared client-side model for the public application flow.
 * Mirrors the stage 1 schema; adds no tables and requires no extra privileges.
 */

export const PARTNER_GROUPS = [
  "manpower",
  "maintenance",
  "cleaning",
  "transport",
  "specialist",
] as const;
export type PartnerGroup = (typeof PARTNER_GROUPS)[number];

export type EntityType = "company" | "individual";

export const PRICING_METHODS = [
  "fixed",
  "hourly",
  "daily",
  "monthly",
  "per_job",
  "per_trip",
  "per_km",
  "quotation",
] as const;
export type PricingMethod = (typeof PRICING_METHODS)[number];

export const SKILL_LEVELS = ["skilled", "semi_skilled", "unskilled"] as const;
export type SkillLevel = (typeof SKILL_LEVELS)[number];

export const OWNERSHIPS = ["owned", "leased"] as const;
export type Ownership = (typeof OWNERSHIPS)[number];

export const VEHICLE_TYPES = [
  "sedan",
  "suv",
  "van",
  "minibus",
  "bus",
  "pickup",
  "truck_1t",
  "truck_3t",
  "truck_5t",
  "truck_10t",
  "trailer",
  "recovery",
  "refrigerated",
  "moving_truck",
] as const;
export type VehicleType = (typeof VEHICLE_TYPES)[number];

export const WORKFORCE_CATEGORIES = [
  "general_labour",
  "drivers",
  "technicians",
  "cleaners",
  "supervisors",
  "movers",
] as const;

export const COMPANY_SIZES = ["1-4", "5-19", "20-49", "50-199", "200+"] as const;

export const DOCUMENT_STATUSES = [
  "uploaded",
  "under_review",
  "approved",
  "rejected",
  "expired",
] as const;
export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number];

/** Rate field shown per pricing method. "quotation" shows none. */
export const RATE_FIELDS: Record<PricingMethod, readonly string[]> = {
  fixed: ["callout_charge"],
  hourly: ["hourly_rate", "callout_charge"],
  daily: ["daily_rate", "callout_charge"],
  monthly: ["monthly_rate"],
  per_job: ["callout_charge"],
  per_trip: ["transport_rate"],
  per_km: ["transport_rate"],
  quotation: [],
};

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export const ALLOWED_EXTENSIONS = [
  "pdf",
  "jpg",
  "jpeg",
  "png",
  "doc",
  "docx",
  "xls",
  "xlsx",
] as const;

export function extensionOf(name: string) {
  const parts = name.toLowerCase().split(".");
  return parts.length > 1 ? parts[parts.length - 1]! : "";
}

export function isAllowedFile(file: File) {
  return (ALLOWED_EXTENSIONS as readonly string[]).includes(extensionOf(file.name));
}

/** Document types requested per partner group; the base set applies to everyone. */
const BASE_DOCS = ["identity", "insurance", "bank_details"] as const;
const COMPANY_DOCS = ["trade_licence", "vat_certificate"] as const;
const GROUP_DOCS: Record<PartnerGroup, readonly string[]> = {
  manpower: ["labour_compliance", "safety_policy"],
  maintenance: ["qualification_proof", "safety_policy"],
  cleaning: ["safety_policy"],
  transport: ["vehicle_registration", "transport_permit"],
  specialist: ["qualification_proof"],
};
/** Swiss documents. Requirements key off country + partner type + service category. */
const COUNTRY_DOCS: Record<string, readonly string[]> = {
  CH: ["social_insurance"],
};

export function requiredDocuments(
  groups: readonly PartnerGroup[],
  entityType: EntityType,
  country: string,
): string[] {
  const set = new Set<string>(BASE_DOCS);
  if (entityType === "company") COMPANY_DOCS.forEach((d) => set.add(d));
  groups.forEach((g) => GROUP_DOCS[g]?.forEach((d) => set.add(d)));
  (COUNTRY_DOCS[country.toUpperCase()] ?? []).forEach((d) => set.add(d));
  return [...set];
}

export const DECLARATIONS = [
  "accuracy",
  "authority",
  "labour_law",
  "health_safety",
  "confidentiality",
  "code_of_conduct",
  "anti_bribery",
  "data_protection",
  "partner_terms",
] as const;

/** Policy placeholder pages that the declaration links to. */
export const POLICY_SLUGS = [
  "verhaltenskodex",
  "antikorruption",
  "datenschutz",
  "partnerbedingungen",
] as const;
export type PolicySlug = (typeof POLICY_SLUGS)[number];

export const DECLARATION_POLICY: Partial<Record<(typeof DECLARATIONS)[number], PolicySlug>> = {
  code_of_conduct: "verhaltenskodex",
  anti_bribery: "antikorruption",
  data_protection: "datenschutz",
  partner_terms: "partnerbedingungen",
};

/** Switzerland only — the company contracts and operates in Switzerland. */
export const COUNTRIES = ["CH"] as const;

/** Declaration -> legal document whose acceptance is recorded as evidence. */
export const PARTNER_CONSENT_DOCS = [
  { declaration: "partner_terms", documentType: "partner_terms" },
  { declaration: "code_of_conduct", documentType: "partner_code_of_conduct" },
  { declaration: "data_protection", documentType: "partner_privacy" },
  { declaration: "health_safety", documentType: "partner_health_safety" },
] as const;
