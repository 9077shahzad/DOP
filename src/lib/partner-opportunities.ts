/**
 * Partner opportunity inbox.
 *
 * Partner-facing lead data comes only from partner_opportunity_feed(); the
 * function redacts customer identity and address until the partner accepted.
 */

import { supabase } from "@/integrations/supabase/client";

export type OpportunityFeedRow = {
  opportunityId: string;
  leadReference: string;
  status: string;
  sentAt: string | null;
  respondBy: string | null;
  categoryId: string | null;
  city: string;
  canton: string;
  postcodePrefix: string;
  dateWindow: string;
  approxValue: number | null;
  description: string;
  customerName: string | null;
  customerPhone: string | null;
  customerEmail: string | null;
  serviceAddress: string | null;
  matchScore: number | null;
  matchReasons: string[];
};

export async function fetchOpportunityFeed(): Promise<OpportunityFeedRow[]> {
  const { data, error } = await supabase.rpc("partner_opportunity_feed");
  if (error) throw error;
  return (data ?? []).map((row) => ({
    opportunityId: row.opportunity_id,
    leadReference: row.lead_reference,
    status: row.status,
    sentAt: row.sent_at,
    respondBy: row.respond_by,
    categoryId: row.category_id,
    city: row.city,
    canton: row.canton,
    postcodePrefix: row.postcode_prefix,
    dateWindow: row.date_window,
    approxValue: row.approx_value == null ? null : Number(row.approx_value),
    description: row.description ?? "",
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    customerEmail: row.customer_email,
    serviceAddress: row.service_address,
    matchScore: row.match_score == null ? null : Number(row.match_score),
    matchReasons: Array.isArray(row.match_reasons) ? (row.match_reasons as unknown[]).map(String) : [],
  }));
}

export async function respondToOpportunity(
  opportunityId: string,
  response: "viewed" | "accepted" | "declined",
  reason = "",
): Promise<void> {
  const { error } = await supabase.rpc("record_partner_response", {
    _opportunity_id: opportunityId,
    _response: response,
    _reason: reason,
  });
  if (error) throw error;
}

export type QuoteDraft = {
  partnerCost: number;
  availabilityDate: string;
  completionDays: number | null;
  conditions: string;
  notes: string;
};

export async function submitOpportunityQuote(opportunityId: string, draft: QuoteDraft): Promise<void> {
  const { data: partnerId, error: idError } = await supabase.rpc("current_partner_id");
  if (idError) throw idError;
  if (!partnerId) throw new Error("no partner record");

  const { error } = await supabase.from("partner_quotes").insert({
    opportunity_id: opportunityId,
    partner_id: partnerId,
    partner_cost: draft.partnerCost,
    currency: "CHF",
    availability_date: draft.availabilityDate || null,
    completion_days: draft.completionDays,
    conditions: draft.conditions,
    notes: draft.notes,
    status: "submitted",
  });
  if (error) throw error;
}

export type OwnQuoteRow = {
  id: string;
  opportunityId: string | null;
  partnerCost: number;
  currency: string;
  status: string;
  submittedAt: string | null;
};

export async function fetchOwnQuotes(): Promise<OwnQuoteRow[]> {
  // partner_cost is column-revoked; my_partner_quotes() scopes to the caller's
  // own partner id inside the database.
  const { data, error } = await supabase.rpc("my_partner_quotes");
  if (error) throw error;
  return (data ?? []).map((q) => ({
    id: q.quote_id,
    opportunityId: q.opportunity_id,
    partnerCost: Number(q.partner_cost ?? 0),
    currency: q.currency,
    status: q.status,
    submittedAt: q.submitted_at,
  }));
}
