/**
 * Stage D data access: management exceptions, fairness, risk, source ROI,
 * customer value and retention.
 *
 * Every read goes through a role-checked SECURITY DEFINER function or a table
 * whose RLS restricts it to dispatch roles — the client never widens access.
 */

import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type ExceptionRow = {
  rule_key: string;
  severity: string;
  entity: string;
  entity_id: string | null;
  reference: string | null;
  metric: number | null;
  unit: string | null;
  detail: string | null;
  link: string | null;
  occurred_at: string | null;
};

export type ExceptionRule = Tables<"exception_rules">;
export type FairnessRule = Tables<"fairness_rules">;
export type RetentionRule = Tables<"retention_rules">;
export type RetentionRun = Tables<"retention_runs">;
export type AllocationStat = Tables<"partner_allocation_stats">;
export type RiskSignal = Tables<"lead_risk_signals">;
export type SourceCost = Tables<"source_costs">;

export const SEVERITY_ORDER = ["critical", "warning", "info"] as const;
export type Severity = (typeof SEVERITY_ORDER)[number];

export async function fetchExceptions(): Promise<ExceptionRow[]> {
  // Dispatch exceptions plus inquiry SLA breaches — one dashboard, one list.
  const [ops, inquiry] = await Promise.all([
    supabase.rpc("management_exceptions"),
    supabase.rpc("inquiry_sla_exceptions"),
  ]);
  if (ops.error) throw ops.error;
  if (inquiry.error) throw inquiry.error;
  return [...((ops.data ?? []) as ExceptionRow[]), ...((inquiry.data ?? []) as ExceptionRow[])];
}

export function groupBySeverity(rows: ExceptionRow[]): Record<Severity, ExceptionRow[]> {
  const out: Record<Severity, ExceptionRow[]> = { critical: [], warning: [], info: [] };
  for (const row of rows) {
    const key = (SEVERITY_ORDER as readonly string[]).includes(row.severity)
      ? (row.severity as Severity)
      : "info";
    out[key].push(row);
  }
  return out;
}

export async function fetchExceptionRules(): Promise<ExceptionRule[]> {
  const { data, error } = await supabase
    .from("exception_rules")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function saveExceptionRule(id: string, patch: { threshold_value?: number; active?: boolean }) {
  const { error } = await supabase.from("exception_rules").update(patch).eq("id", id);
  if (error) throw error;
}

export async function fetchFairnessRules(): Promise<FairnessRule[]> {
  const { data, error } = await supabase.from("fairness_rules").select("*").order("key", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function saveFairnessRule(id: string, patch: { value?: number; active?: boolean }) {
  const { error } = await supabase.from("fairness_rules").update(patch).eq("id", id);
  if (error) throw error;
}

export type AllocationStatRow = AllocationStat & { partner?: { legal_name: string; trading_name: string | null } | null };

export async function fetchAllocationStats(): Promise<AllocationStatRow[]> {
  const { data, error } = await supabase
    .from("partner_allocation_stats")
    .select("*, partner:partners(legal_name, trading_name)")
    .order("period_start", { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []) as AllocationStatRow[];
}

export async function fetchRiskSignals(leadId: string): Promise<RiskSignal[]> {
  const { data, error } = await supabase
    .from("lead_risk_signals")
    .select("*")
    .eq("lead_id", leadId)
    .order("weight", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function clearLeadRisk(leadId: string, note: string) {
  const { error } = await supabase.rpc("clear_lead_risk", { _lead_id: leadId, _note: note });
  if (error) throw error;
}

export type SourcePerformanceRow = {
  source_id: string;
  source_key: string;
  leads: number;
  qualified: number;
  won: number;
  conversion: number;
  revenue: number;
  gross_margin: number;
  spend: number | null;
  cost_per_lead: number | null;
  cost_per_qualified: number | null;
  cac: number | null;
  roas: number | null;
};

export async function fetchSourcePerformance(from: string, to: string): Promise<SourcePerformanceRow[]> {
  const { data, error } = await supabase.rpc("source_performance", { _from: from, _to: to });
  if (error) throw error;
  return (data ?? []) as SourcePerformanceRow[];
}

export type CustomerValueRow = {
  contact_key: string;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  jobs: number;
  revenue: number;
  gross_margin: number;
  average_ticket: number;
  complaints: number;
  first_job: string | null;
  last_job: string | null;
  repeat_customer: boolean;
};

export async function fetchCustomerValue(): Promise<CustomerValueRow[]> {
  const { data, error } = await supabase.rpc("customer_value");
  if (error) throw error;
  return (data ?? []) as CustomerValueRow[];
}

export async function fetchRetentionRules(): Promise<RetentionRule[]> {
  const { data, error } = await supabase.from("retention_rules").select("*").order("entity", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function saveRetentionRule(id: string, patch: { retention_days?: number; active?: boolean }) {
  const { error } = await supabase.from("retention_rules").update(patch).eq("id", id);
  if (error) throw error;
}

export type RetentionItem = {
  entity: string;
  action: string;
  retention_days: number;
  affected: number;
  skipped_protected: number;
};

export async function runRetention(dryRun: boolean): Promise<RetentionItem[]> {
  const { data, error } = await supabase.rpc("apply_retention", { _dry_run: dryRun });
  if (error) throw error;
  const payload = data as { items?: RetentionItem[] } | null;
  return payload?.items ?? [];
}

export async function fetchRetentionRuns(): Promise<RetentionRun[]> {
  const { data, error } = await supabase
    .from("retention_runs")
    .select("*")
    .order("ran_at", { ascending: false })
    .limit(20);
  if (error) throw error;
  return data ?? [];
}
