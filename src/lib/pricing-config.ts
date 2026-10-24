/**
 * Admin-editable, versioned pricing configuration.
 *
 * Bands and prices live in the database, not in code. A configuration is
 * versioned like a legal document: a published version is never overwritten,
 * an effective date decides which one applies, and a quote keeps the version
 * it was priced under (`quotes.pricing_configuration_id`).
 *
 * `auditBands` is a permanent publish gate. A proposed set containing an
 * overlap — or a gap that is not explicitly marked intentional — cannot be
 * activated. Validation always runs against the FULL proposed set, never
 * against the single row being edited.
 */

import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";
import { auditBands, type Band } from "@/lib/price-resolution";

export type PricingConfiguration = Tables<"pricing_configurations">;
export type PricingRule = Tables<"pricing_rules">;
export type PricingRuleDraft = TablesInsert<"pricing_rules">;

/* ------------------------------------------------------------- fixtures */

/**
 * Automated regression fixtures live in the same table as the real price
 * lists. They must stay in place — tests depend on them — but they are never
 * offered as a selectable version in the admin UI.
 */
const FIXTURE_MARKERS = [/integration test/i, /regressionsfixture/i];

export function isTestFixture(
  config: Pick<PricingConfiguration, "name" | "notes">,
): boolean {
  const text = `${config.name ?? ""} ${config.notes ?? ""}`;
  return FIXTURE_MARKERS.some((re) => re.test(text));
}

/** The versions an administrator may see and select. */
export function operationalConfigurations(
  rows: PricingConfiguration[],
): PricingConfiguration[] {
  return rows.filter((c) => !isTestFixture(c));
}

/* ---------------------------------------------------------------- grouping */

/** Rules that carry a room range participate in band contiguity. */
export function isBandRule(rule: Pick<PricingRule, "room_min" | "room_max">): boolean {
  return rule.room_min != null && rule.room_max != null;
}

export function groupKey(rule: Pick<PricingRule, "service" | "property_type">): string {
  return `${rule.service}|${rule.property_type}`;
}

export function toBand(rule: PricingRule): Band {
  return { id: rule.band_id || rule.id, min: Number(rule.room_min), max: Number(rule.room_max) };
}

/* -------------------------------------------------------------- publish gate */

export type ValidationIssue =
  | { kind: "overlap"; group: string; a: string; b: string; from: number; to: number }
  | { kind: "gap"; group: string; after: string; before: string; from: number; to: number }
  | { kind: "invalid"; group: string; a: string; from: number; to: number }
  | { kind: "empty"; group: string; a: string; b: string; from: number; to: number };

/**
 * Validates a whole proposed rule set. Returns every conflict, each naming the
 * conflicting bands and the affected value range.
 */
export function validateRuleSet(rules: PricingRule[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (rules.length === 0) {
    issues.push({ kind: "empty", group: "-", a: "-", b: "-", from: 0, to: 0 });
    return issues;
  }

  const groups = new Map<string, PricingRule[]>();
  for (const rule of rules) {
    if (!isBandRule(rule)) continue;
    const key = groupKey(rule);
    groups.set(key, [...(groups.get(key) ?? []), rule]);
  }

  for (const [group, groupRules] of groups) {
    for (const rule of groupRules) {
      const min = Number(rule.room_min);
      const max = Number(rule.room_max);
      if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) {
        issues.push({ kind: "invalid", group, a: rule.band_id || rule.id, from: min, to: max });
      }
    }

    const sorted = [...groupRules].sort((a, b) => Number(a.room_min) - Number(b.room_min));
    const audit = auditBands(sorted.map(toBand));

    for (const overlap of audit.overlaps) {
      issues.push({ kind: "overlap", group, a: overlap.a, b: overlap.b, from: overlap.from, to: overlap.to });
    }

    // A gap is only acceptable when the band before it says so explicitly.
    for (const gap of audit.gaps) {
      const previous = sorted.find((r) => (r.band_id || r.id) === gap.after);
      if (previous?.gap_after_intentional) continue;
      const next = sorted.find((r) => Number(r.room_min) === gap.to);
      issues.push({
        kind: "gap",
        group,
        after: gap.after,
        before: next ? next.band_id || next.id : "-",
        from: gap.from,
        to: gap.to,
      });
    }
  }

  return issues;
}

export function canPublish(rules: PricingRule[]): boolean {
  return validateRuleSet(rules).length === 0;
}

/** Rules whose price has never been signed off commercially. */
export function unreviewedRules(rules: PricingRule[]): PricingRule[] {
  return rules.filter((rule) => rule.requires_commercial_review);
}

/** The bands of the configuration in force, for the pricing state machine. */
export function bandsFromRules(rules: PricingRule[], service = "clean", propertyType = "any"): Band[] {
  return rules
    .filter((rule) => rule.service === service && rule.property_type === propertyType && isBandRule(rule))
    .sort((a, b) => Number(a.room_min) - Number(b.room_min))
    .map(toBand);
}

/** Bands of the published configuration in force today, or null when none is. */
export async function fetchActiveBands(market = "CH"): Promise<Band[] | null> {
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await supabase
    .from("pricing_configurations")
    .select("id")
    .eq("market", market)
    .eq("status", "published")
    .lte("effective_from", today)
    .order("effective_from", { ascending: false })
    .limit(1);
  const id = data?.[0]?.id;
  if (!id) return null;
  return bandsFromRules(await fetchRules(id));
}

/* ------------------------------------------------------------------- reads */

export async function fetchConfigurations(): Promise<PricingConfiguration[]> {
  const { data, error } = await supabase
    .from("pricing_configurations")
    .select("*")
    .order("market")
    .order("version", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchRules(configurationId: string): Promise<PricingRule[]> {
  const { data, error } = await supabase
    .from("pricing_rules")
    .select("*")
    .eq("configuration_id", configurationId)
    .order("service")
    .order("sort_order");
  if (error) throw error;
  return data ?? [];
}

/* ------------------------------------------------------------------ writes */

export async function createDraftFrom(source: PricingConfiguration): Promise<PricingConfiguration> {
  const { data: versions } = await supabase
    .from("pricing_configurations")
    .select("version")
    .eq("market", source.market)
    .order("version", { ascending: false })
    .limit(1);
  const nextVersion = Number(versions?.[0]?.version ?? 0) + 1;

  const { data: created, error } = await supabase
    .from("pricing_configurations")
    .insert({
      market: source.market,
      name: source.name,
      version: nextVersion,
      status: "draft",
      effective_from: new Date().toISOString().slice(0, 10),
      notes: "",
    })
    .select("*")
    .single();
  if (error) throw error;

  const rules = await fetchRules(source.id);
  if (rules.length > 0) {
    const copies: PricingRuleDraft[] = rules.map((rule) => ({
      configuration_id: created.id,
      service: rule.service,
      property_type: rule.property_type,
      band_id: rule.band_id,
      room_min: rule.room_min,
      room_max: rule.room_max,
      price: rule.price,
      currency: rule.currency,
      unit_type: rule.unit_type,
      gap_after_intentional: rule.gap_after_intentional,
      requires_commercial_review: rule.requires_commercial_review,
      sort_order: rule.sort_order,
    }));
    const { error: copyError } = await supabase.from("pricing_rules").insert(copies);
    if (copyError) throw copyError;
  }
  return created;
}

export async function updateConfiguration(
  id: string,
  patch: Partial<Pick<PricingConfiguration, "name" | "effective_from" | "notes">>,
): Promise<void> {
  const { error } = await supabase.from("pricing_configurations").update(patch).eq("id", id);
  if (error) throw error;
}

export async function saveRule(rule: PricingRuleDraft & { id?: string }): Promise<void> {
  const { id, ...values } = rule;
  const { error } = id
    ? await supabase.from("pricing_rules").update(values).eq("id", id)
    : await supabase.from("pricing_rules").insert(values);
  if (error) throw error;
}

export async function deleteRule(id: string): Promise<void> {
  const { error } = await supabase.from("pricing_rules").delete().eq("id", id);
  if (error) throw error;
}

/**
 * Rollback: restores an archived version by cloning it into a NEW published
 * version with today's effective date. A published version is never rewritten
 * and quotes keep the version they were priced under.
 */
export async function rollbackConfiguration(id: string): Promise<PricingConfiguration> {
  const { data, error } = await supabase.rpc("rollback_pricing_configuration", { _id: id });
  if (error) throw error;
  return data as unknown as PricingConfiguration;
}

export type PublishResult =
  | { status: "published"; configuration: PricingConfiguration }
  | { status: "refused"; issues: ValidationIssue[] };

/**
 * The gate. Validation runs on the full set that is about to go live; only a
 * clean set reaches the database, which then locks the version for good.
 */
export async function publishConfiguration(id: string): Promise<PublishResult> {
  const rules = await fetchRules(id);
  const issues = validateRuleSet(rules);
  if (issues.length > 0) return { status: "refused", issues };
  const { data, error } = await supabase.rpc("publish_pricing_configuration", { _id: id });
  if (error) throw error;
  return { status: "published", configuration: data as unknown as PricingConfiguration };
}
