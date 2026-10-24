/**
 * Allocation, RFQ and SLA — stage 3 data access.
 *
 * Every write goes through a SECURITY DEFINER function so the timeline row is
 * written in the same transaction: opportunities are never inserted directly
 * (there is no INSERT policy on partner_opportunities on purpose), and quote
 * acceptance withdraws the other partners atomically.
 */

import { supabase } from "@/integrations/supabase/client";
import { toneChip } from "@/lib/status-tone";
import type { Tables } from "@/integrations/supabase/types";

export type Candidate = {
  kind: "partner" | "internal_team";
  id: string;
  name: string;
  score: number;
  reasons: string[];
};

export type OpportunityRow = Tables<"partner_opportunities">;
export type PartnerQuoteRow = Tables<"partner_quotes">;

export const DECLINE_REASONS = [
  "no_capacity",
  "outside_area",
  "price",
  "timing",
  "missing_skills",
  "equipment_unavailable",
  "other",
] as const;
export type DeclineReason = (typeof DECLINE_REASONS)[number];

export async function canSeeCosts(): Promise<boolean> {
  const { data, error } = await supabase.rpc("can_see_costs");
  if (error) return false;
  return Boolean(data);
}

export async function scoreCandidates(leadId: string): Promise<Candidate[]> {
  const { data, error } = await supabase.rpc("score_candidates", { _lead_id: leadId });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    kind: row.candidate_kind === "internal_team" ? "internal_team" : "partner",
    id: row.candidate_id,
    name: row.candidate_name,
    score: Number(row.score ?? 0),
    reasons: Array.isArray(row.reasons) ? (row.reasons as unknown[]).map((r) => String(r)) : [],
  }));
}

export async function slaMinutes(leadId: string): Promise<number> {
  const { data, error } = await supabase.rpc("lead_sla_minutes", { _lead_id: leadId });
  if (error) return 120;
  return Number(data ?? 120);
}

/** One opportunity per candidate, all sharing the same respond_by. */
export async function sendOpportunities(leadId: string, candidates: Candidate[], note: string): Promise<number> {
  const payload = candidates
    .filter((c) => c.kind === "partner")
    .map((c) => ({ partner_id: c.id, score: c.score, reasons: c.reasons }));
  const { data, error } = await supabase.rpc("send_lead_opportunities", {
    _lead_id: leadId,
    _candidates: payload,
    _note: note,
  });
  if (error) throw error;
  return Number(data ?? 0);
}

export async function acceptQuote(quoteId: string, note: string): Promise<void> {
  const { error } = await supabase.rpc("accept_partner_quote", { _quote_id: quoteId, _note: note });
  if (error) throw error;
}

/** One sweep outcome, as returned by the database job. */
export type SweepResult = {
  skipped: boolean;
  reason?: string | undefined;
  timed_out: number;
  escalated: number;
  exceptions: number;
  leads_processed: number;
  partners_notified: number;
  duration_ms: number;
  errors: SweepError[];
};

export type SweepError = {
  lead_reference: string;
  opportunity?: string;
  code: string;
  message: string;
};

/**
 * Runs the timeout sweep through the same job the scheduler uses, so a manual
 * run shares the concurrency lock, the history entry and the last-run fields.
 */
export async function processSlaTimeouts(trigger: "manual" | "scheduler" = "manual"): Promise<SweepResult> {
  const { data, error } = await supabase.rpc("run_sla_timeouts_job", { _trigger: trigger });
  if (error) throw error;
  const r = (data ?? {}) as Record<string, unknown>;
  return {
    skipped: Boolean(r["skipped"]),
    reason: typeof r["reason"] === "string" ? r["reason"] : undefined,
    timed_out: Number(r["timed_out"] ?? 0),
    escalated: Number(r["escalated"] ?? 0),
    exceptions: Number(r["exceptions"] ?? 0),
    leads_processed: Number(r["leads_processed"] ?? 0),
    partners_notified: Number(r["partners_notified"] ?? 0),
    duration_ms: Number(r["duration_ms"] ?? 0),
    errors: Array.isArray(r["errors"]) ? (r["errors"] as SweepError[]) : [],
  };
}

/** Most recent sweeps, newest first. */
export type DispatchRun = Tables<"dispatch_runs">;

export async function fetchDispatchRuns(limit = 10): Promise<DispatchRun[]> {
  const { data, error } = await supabase
    .from("dispatch_runs")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(limit);
  if (error) return [];
  return data ?? [];
}


/* ------------------------------------------------- background SLA automation */

export type DispatchAutomation = Tables<"dispatch_automation">;

export async function fetchAutomation(): Promise<DispatchAutomation | null> {
  const { data, error } = await supabase.from("dispatch_automation").select("*").maybeSingle();
  if (error) return null;
  return data;
}

/** Staff-only: schedules or unschedules the background timeout sweep. */
export async function setAutomation(enabled: boolean, minutes: number): Promise<DispatchAutomation> {
  const { data, error } = await supabase.rpc("set_sla_automation", {
    _enabled: enabled,
    _minutes: minutes,
  });
  if (error) throw error;
  return data as unknown as DispatchAutomation;
}

export async function logAllocationException(
  leadId: string,
  reason: "no_eligible_partner" | "all_declined" | "sla_exhausted" | "outside_coverage",
  resolution: string,
): Promise<void> {
  const { error } = await supabase.rpc("log_allocation_exception", {
    _lead_id: leadId,
    _reason: reason,
    _resolution: resolution,
  });
  if (error) throw error;
}

export async function resolveAllocationException(id: string, resolution: string): Promise<void> {
  const { error } = await supabase.rpc("resolve_allocation_exception", { _id: id, _resolution: resolution });
  if (error) throw error;
}

export type OpenException = Tables<"allocation_exceptions"> & {
  lead: { id: string; reference: string; city: string; canton: string } | null;
};

export async function fetchOpenExceptions(): Promise<OpenException[]> {
  const { data, error } = await supabase
    .from("allocation_exceptions")
    .select("*, lead:leads!allocation_exceptions_lead_id_fkey(id, reference, city, canton)")
    .is("resolved_at", null)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []) as unknown as OpenException[];
}

/* --------------------------------------------------------- comparison view */

export type QuoteComparisonRow = {
  quoteId: string;
  opportunityId: string | null;
  partnerId: string;
  partnerName: string;
  /** null when the signed-in role may not see costs. */
  cost: number | null;
  currency: string;
  availabilityDate: string | null;
  completionDays: number | null;
  conditions: string;
  status: PartnerQuoteRow["status"];
  submittedAt: string | null;
  matchScore: number | null;
  performanceScore: number | null;
  responseMinutes: number | null;
};

export type LeadAllocation = {
  opportunities: Array<
    OpportunityRow & { partnerName: string; performanceScore: number | null }
  >;
  quotes: QuoteComparisonRow[];
  costsVisible: boolean;
};

export async function fetchLeadAllocation(leadId: string): Promise<LeadAllocation> {
  const [{ data: opps, error: oppError }, costsVisible] = await Promise.all([
    supabase
      .from("partner_opportunities")
      .select("*, partner:partners!partner_opportunities_partner_id_fkey(legal_name, trading_name)")
      .eq("lead_id", leadId)
      .order("sent_at", { ascending: false }),
    canSeeCosts(),
  ]);
  if (oppError) throw oppError;

  const rows = (opps ?? []) as unknown as Array<
    OpportunityRow & { partner: { legal_name: string; trading_name: string } | null }
  >;
  const partnerIds = Array.from(new Set(rows.map((r) => r.partner_id).filter(Boolean))) as string[];

  const perf = new Map<string, number>();
  if (partnerIds.length > 0) {
    const { data: perfRows } = await supabase
      .from("partner_performance")
      .select("partner_id, score")
      .in("partner_id", partnerIds);
    for (const row of perfRows ?? []) perf.set(row.partner_id, Number(row.score ?? 0));
  }

  const nameOf = (row: { partner_id: string | null; partner: { legal_name: string; trading_name: string } | null }) =>
    row.partner?.trading_name || row.partner?.legal_name || row.partner_id || "—";

  // partner_cost is revoked at column level for every signed-in role; the only
  // way to read it is quote_costs_for_lead(), which re-checks can_see_costs()
  // inside the database. Sales gets the cost-free function instead.
  let quotes: QuoteComparisonRow[] = [];
  if (costsVisible) {
    const { data, error } = await supabase.rpc("quote_costs_for_lead", { _lead_id: leadId });
    if (error) throw error;
    const names = new Map(rows.map((r) => [r.partner_id ?? "", nameOf(r)]));
    quotes = (data ?? []).map((q) => ({
      quoteId: q.quote_id,
      opportunityId: q.opportunity_id,
      partnerId: q.partner_id,
      partnerName: names.get(q.partner_id) ?? q.partner_id,
      cost: q.partner_cost == null ? null : Number(q.partner_cost),
      currency: q.currency,
      availabilityDate: q.availability_date,
      completionDays: q.completion_days,
      conditions: q.conditions,
      status: q.status,
      submittedAt: q.submitted_at,
      matchScore: null,
      performanceScore: perf.get(q.partner_id) ?? null,
      responseMinutes: null,
    }));
  } else {
    const { data, error } = await supabase.rpc("partner_quotes_without_cost", { _lead_id: leadId });
    if (error) throw error;
    const names = new Map(rows.map((r) => [r.partner_id ?? "", nameOf(r)]));
    quotes = (data ?? []).map((q) => ({
      quoteId: q.id,
      opportunityId: q.opportunity_id,
      partnerId: q.partner_id,
      partnerName: names.get(q.partner_id) ?? q.partner_id,
      cost: null,
      currency: q.currency,
      availabilityDate: q.availability_date,
      completionDays: q.completion_days,
      conditions: q.conditions,
      status: q.status,
      submittedAt: q.submitted_at,
      matchScore: null,
      performanceScore: perf.get(q.partner_id) ?? null,
      responseMinutes: null,
    }));
  }

  // enrich quotes with the match score and response time of their opportunity
  const byOpportunity = new Map(rows.map((r) => [r.id, r]));
  quotes = quotes.map((q) => {
    const opp = q.opportunityId ? byOpportunity.get(q.opportunityId) : undefined;
    const minutes =
      opp?.sent_at && q.submittedAt
        ? Math.round((new Date(q.submittedAt).getTime() - new Date(opp.sent_at).getTime()) / 60_000)
        : null;
    return {
      ...q,
      matchScore: opp?.match_score == null ? null : Number(opp.match_score),
      responseMinutes: minutes,
    };
  });

  return {
    opportunities: rows.map((r) => ({
      ...r,
      partnerName: nameOf(r),
      performanceScore: r.partner_id ? (perf.get(r.partner_id) ?? null) : null,
    })),
    quotes,
    costsVisible,
  };
}

/* ------------------------------------------------------------- SLA display */

export type SlaTone = "green" | "amber" | "red";

export function slaTone(sentAt: string | null, respondBy: string | null): SlaTone {
  if (!respondBy) return "green";
  const end = new Date(respondBy).getTime();
  const now = Date.now();
  if (now >= end) return "red";
  const start = sentAt ? new Date(sentAt).getTime() : end - 2 * 3_600_000;
  const total = Math.max(1, end - start);
  return (end - now) / total < 0.25 ? "amber" : "green";
}

/** Countdown chips share the product tone scale — no per-screen colours. */
export const SLA_TONE_CLASS: Record<SlaTone, string> = {
  green: toneChip("success"),
  amber: toneChip("warning"),
  red: toneChip("danger"),
};

/** "2 h 14 min" / "abgelaufen" is decided by the caller; this returns minutes. */
export function minutesRemaining(respondBy: string | null): number | null {
  if (!respondBy) return null;
  return Math.round((new Date(respondBy).getTime() - Date.now()) / 60_000);
}
