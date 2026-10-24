/**
 * Commercial layer — lead economics, the decision engine and approval limits.
 *
 * Cost and margin never leave the database for a role that may not see them:
 * every figure here comes from a SECURITY DEFINER function that checks
 * can_see_costs(), so a sales payload simply has no cost fields.
 */

import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

/* ----------------------------------------------------------- lead economics */

export type LeadEconomics = {
  costsVisible: boolean;
  expectedSell: number | null;
  expectedCost: number | null;
  expectedMargin: number | null;
  expectedMarginPct: number | null;
  travelCost: number | null;
  acquisitionCost: number | null;
  minMarginPct: number | null;
  flags: string[];
};

function num(value: unknown): number | null {
  return value == null ? null : Number(value);
}

export async function fetchLeadEconomics(leadId: string): Promise<LeadEconomics | null> {
  const { data, error } = await supabase.rpc("lead_economics", { _lead_id: leadId });
  if (error) return null;
  const r = (data ?? {}) as Record<string, unknown>;
  return {
    costsVisible: Boolean(r["costs_visible"]),
    expectedSell: num(r["expected_sell"]),
    expectedCost: num(r["expected_cost"]),
    expectedMargin: num(r["expected_margin"]),
    expectedMarginPct: num(r["expected_margin_pct"]),
    travelCost: num(r["travel_cost"]),
    acquisitionCost: num(r["acquisition_cost"]),
    minMarginPct: num(r["min_margin_pct"]),
    flags: Array.isArray(r["flags"]) ? (r["flags"] as unknown[]).map(String) : [],
  };
}

/**
 * Staff-only entry point. The calculation itself runs automatically on the
 * lead and is not callable by a signed-in customer or partner.
 */
export async function recomputeLeadEconomics(leadId: string): Promise<void> {
  const { error } = await supabase.rpc("recompute_lead_economics", { _lead_id: leadId });
  if (error) throw error;
}

/* ---------------------------------------------------------- decision engine */

export type FulfilmentCandidate = {
  kind: "partner" | "internal_team";
  id: string;
  name: string;
  score: number;
  reasons: string[];
  customerPrice: number | null;
  expectedCost: number | null;
  expectedMargin: number | null;
  expectedMarginPct: number | null;
  travelEstimate: number | null;
  earliestAvailability: string | null;
  rating: number | null;
  /** "highest_margin" | "fastest_availability" | "best_rated" | "" */
  commercialNote: string;
  costsVisible: boolean;
};

/** Ranked by match, never by margin — the trade-off stays with the dispatcher. */
export async function evaluateFulfilment(leadId: string): Promise<FulfilmentCandidate[]> {
  const { data, error } = await supabase.rpc("evaluate_fulfilment", { _lead_id: leadId });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    kind: row.candidate_kind === "internal_team" ? "internal_team" : "partner",
    id: row.candidate_id,
    name: row.candidate_name,
    score: Number(row.score ?? 0),
    reasons: Array.isArray(row.reasons) ? (row.reasons as unknown[]).map(String) : [],
    customerPrice: num(row.customer_price),
    expectedCost: num(row.expected_cost),
    expectedMargin: num(row.expected_margin),
    expectedMarginPct: num(row.expected_margin_pct),
    travelEstimate: num(row.travel_estimate),
    earliestAvailability: row.earliest_availability,
    rating: num(row.rating),
    commercialNote: row.commercial_note ?? "",
    costsVisible: Boolean(row.costs_visible),
  }));
}

/* -------------------------------------------------------- approval requests */

export type ApprovalRequest = Tables<"approval_requests"> & {
  lead: { id: string; reference: string } | null;
  rule: { scope: string; threshold: number; required_role: string } | null;
};

export async function fetchApprovals(status: "pending" | "all" = "pending"): Promise<ApprovalRequest[]> {
  let query = supabase
    .from("approval_requests")
    .select("*, lead:leads!approval_requests_lead_id_fkey(id, reference), rule:approval_rules!approval_requests_rule_id_fkey(scope, threshold, required_role)")
    .order("created_at", { ascending: false })
    .limit(100);
  if (status === "pending") query = query.eq("status", "pending");
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as ApprovalRequest[];
}

export async function decideApproval(id: string, approve: boolean, note: string): Promise<void> {
  const { error } = await supabase.rpc("decide_approval", { _id: id, _approve: approve, _note: note });
  if (error) throw error;
}

export type ApprovalRule = Tables<"approval_rules">;

export async function fetchApprovalRules(): Promise<ApprovalRule[]> {
  const { data, error } = await supabase
    .from("approval_rules")
    .select("*")
    .eq("active", true)
    .order("scope")
    .order("threshold");
  if (error) return [];
  return data ?? [];
}

/* ------------------------------------------------------------ customer quote */

export type CustomerQuoteInput = {
  leadId: string;
  labour: number;
  materials: number;
  transport: number;
  equipment: number;
  disposal: number;
  discountPct: number;
  terms: string;
  approvalId?: string | null;
};

export type CustomerQuoteResult =
  | { status: "created"; quoteId: string; reference: string; total: number; marginPct: number | null }
  | { status: "approval_required"; scope: string; requiredRole: string; requestId: string; value: number | null };

/** The limit lives in the database; this only reports what it decided. */
export async function createCustomerQuote(input: CustomerQuoteInput): Promise<CustomerQuoteResult> {
  const { data, error } = await supabase.rpc("create_customer_quote", {
    ...(input.approvalId ? { _approval: input.approvalId } : {}),
    _lead_id: input.leadId,
    _line_items: [],
    _labour: input.labour,
    _materials: input.materials,
    _transport: input.transport,
    _equipment: input.equipment,
    _disposal: input.disposal,
    _discount_pct: input.discountPct,
    _terms: input.terms,
  });
  if (error) throw error;
  const r = (data ?? {}) as Record<string, unknown>;
  if (r["status"] === "approval_required") {
    return {
      status: "approval_required",
      scope: String(r["scope"] ?? ""),
      requiredRole: String(r["required_role"] ?? ""),
      requestId: String(r["request_id"] ?? ""),
      value: num(r["value"]),
    };
  }
  return {
    status: "created",
    quoteId: String(r["quote_id"] ?? ""),
    reference: String(r["reference"] ?? ""),
    total: Number(r["total"] ?? 0),
    marginPct: num(r["margin_pct"]),
  };
}

/* --------------------------------------------------------- service catalogue */

export type CatalogueEntry = Tables<"service_catalogue">;

export async function fetchCatalogue(): Promise<CatalogueEntry[]> {
  const { data, error } = await supabase
    .from("service_catalogue")
    .select("*")
    .eq("active", true)
    .order("sort_order");
  if (error) return [];
  return data ?? [];
}

export type ResolvedRate = {
  rateId: string;
  scope: string;
  scopeRef: string;
  sellPrice: number | null;
  costPrice: number | null;
  minMarginPct: number | null;
  currency: string;
};

/** Shows a dispatcher why a price is what it is: the winning scope comes back. */
export async function resolveRate(
  catalogueId: string,
  canton: string,
  city: string,
  partnerId: string | null,
): Promise<ResolvedRate | null> {
  const { data, error } = await supabase.rpc("resolve_rate", {
    ...(partnerId ? { _partner_id: partnerId } : {}),
    _catalogue_id: catalogueId,
    _canton: canton,
    _city: city,
  });
  if (error || !data || data.length === 0) return null;
  const row = data[0]!;
  return {
    rateId: row.rate_id,
    scope: row.scope,
    scopeRef: row.scope_ref,
    sellPrice: num(row.sell_price),
    costPrice: num(row.cost_price),
    minMarginPct: num(row.min_margin_pct),
    currency: row.currency,
  };
}

/* --------------------------------------------------- commercial stage labels */

/**
 * The four commercial stages a price passes through. Enum values are database
 * identifiers; only the labels are translated.
 */
export const PRICE_STAGES = ["richtwert", "offerte", "vertragspreis", "rechnung"] as const;
export type PriceStage = (typeof PRICE_STAGES)[number];

export async function setQuoteStage(id: string, stage: PriceStage): Promise<void> {
  const { error } = await supabase.from("quotes").update({ price_stage: stage }).eq("id", id);
  if (error) throw error;
}

export type IssuedQuote = Pick<
  Tables<"quotes_customer">,
  "id" | "reference" | "status" | "price_stage" | "total" | "valid_until" | "created_at" | "lead_id"
>;

/** Issued customer quotes with their commercial stage and lifecycle status. */
export async function fetchIssuedQuotes(): Promise<IssuedQuote[]> {
  const { data, error } = await supabase
    .from("quotes_customer")
    .select("id, reference, status, price_stage, total, valid_until, created_at, lead_id")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data ?? []) as IssuedQuote[];
}

export async function setIssuedQuoteStage(id: string, stage: PriceStage): Promise<void> {
  const { error } = await supabase.from("quotes_customer").update({ price_stage: stage }).eq("id", id);
  if (error) throw error;
}

export type WorkOrderRow = Pick<
  Tables<"work_orders">,
  "id" | "reference" | "service" | "status" | "due_on" | "value" | "created_at" | "note"
>;

export async function fetchWorkOrders(): Promise<WorkOrderRow[]> {
  const { data, error } = await supabase
    .from("work_orders")
    .select("id, reference, service, status, due_on, value, created_at, note")
    .order("due_on", { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data ?? []) as WorkOrderRow[];
}
