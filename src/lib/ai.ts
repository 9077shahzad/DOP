/**
 * Client-side reads and reviews for AI Assist.
 *
 * The tables carry their own access rules, so the browser reads them directly;
 * only the model calls go through server functions.
 */
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import type { AiFeature, AiStatus } from "@/lib/ai/features";

export type AiSuggestion = Tables<"ai_suggestions">;
export type AiFlag = Tables<"ai_feature_flags">;
export type AiUsageRow = Tables<"ai_usage">;
export type AiConsent = Tables<"ai_media_consent">;

export async function fetchSuggestions(options?: {
  feature?: AiFeature;
  status?: AiStatus;
  subjectId?: string;
  limit?: number;
}): Promise<AiSuggestion[]> {
  let query = supabase.from("ai_suggestions").select("*").order("created_at", { ascending: false });
  if (options?.feature) query = query.eq("feature", options.feature);
  if (options?.status) query = query.eq("status", options.status);
  if (options?.subjectId) query = query.eq("subject_id", options.subjectId);
  const { data, error } = await query.limit(options?.limit ?? 50);
  if (error) throw error;
  return data ?? [];
}

/** Accept, edit or reject. The reviewer and the time are always recorded. */
export async function reviewSuggestion(input: {
  id: string;
  status: Extract<AiStatus, "accepted" | "edited" | "rejected">;
  editedPayload?: Record<string, unknown>;
  rejectReason?: string;
}): Promise<void> {
  const { data: session } = await supabase.auth.getUser();
  const { error } = await supabase
    .from("ai_suggestions")
    .update({
      status: input.status,
      edited_payload: (input.editedPayload ?? null) as never,
      reject_reason: input.rejectReason ?? null,
      reviewed_by: session.user?.id ?? null,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", input.id);
  if (error) throw error;
}

export async function fetchFlags(): Promise<AiFlag[]> {
  const { data, error } = await supabase.from("ai_feature_flags").select("*").order("feature");
  if (error) throw error;
  return data ?? [];
}

export async function saveFlag(feature: string, patch: { enabled?: boolean; monthly_budget_chf?: number }): Promise<void> {
  const { error } = await supabase.from("ai_feature_flags").update(patch).eq("feature", feature);
  if (error) throw error;
}

/** Usage for the running month, grouped per feature. */
export async function fetchUsage(): Promise<Record<string, { calls: number; cost: number; blocked: number }>> {
  const now = new Date();
  const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10);
  const { data, error } = await supabase.from("ai_usage").select("*").gte("day", from);
  if (error) throw error;
  const totals: Record<string, { calls: number; cost: number; blocked: number }> = {};
  for (const row of data ?? []) {
    const entry = totals[row.feature] ?? { calls: 0, cost: 0, blocked: 0 };
    entry.calls += row.calls ?? 0;
    entry.cost += Number(row.cost_estimate ?? 0);
    entry.blocked += row.blocked_count ?? 0;
    totals[row.feature] = entry;
  }
  return totals;
}

/** Records that a photo or recording may be analysed, and when it is deleted. */
export async function recordMediaConsent(input: {
  mediaKind: "photo" | "audio";
  bucket: string;
  path: string;
  subjectType: "lead" | "quote" | "job" | "incident" | "none";
  subjectId: string | null;
  retainDays: number;
  source: string;
}): Promise<void> {
  const retain = new Date(Date.now() + input.retainDays * 86_400_000).toISOString().slice(0, 10);
  const { error } = await supabase.from("ai_media_consent").upsert(
    {
      media_kind: input.mediaKind,
      storage_bucket: input.bucket,
      storage_path: input.path,
      subject_type: input.subjectType,
      subject_id: input.subjectId,
      consent_given: true,
      consent_at: new Date().toISOString(),
      consent_source: input.source,
      retain_until: retain,
    },
    { onConflict: "storage_bucket,storage_path" },
  );
  if (error) throw error;
}

export async function fetchLeadConsent(leadId: string): Promise<AiConsent[]> {
  const { data, error } = await supabase
    .from("ai_media_consent")
    .select("*")
    .eq("subject_type", "lead")
    .eq("subject_id", leadId);
  if (error) throw error;
  return data ?? [];
}
