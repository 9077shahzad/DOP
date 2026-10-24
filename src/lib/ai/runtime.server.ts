/**
 * Flags, budget, usage counting and the audit row.
 *
 * Nothing in AI Assist calls a model directly: every feature goes through
 * `guardFeature` first and through `recordSuggestion` afterwards, so a switched
 * off feature, an exhausted budget or a provider outage all end in the same
 * quiet "unavailable" answer instead of a broken screen.
 */
import type { AiFeature, AiStatus, AiSubjectType, AiUnavailable } from "@/lib/ai/features";
import { AI_PROVIDER, AI_TEXT_MODEL, aiKey, type AiUsage } from "@/lib/ai/gateway.server";

/** Indicative CHF per million tokens — a budget guide, not an invoice. */
const COST_IN_PER_MTOK = 1.5;
const COST_OUT_PER_MTOK = 12;

export function estimateCost(usage: AiUsage): number {
  const chf = (usage.tokensIn / 1_000_000) * COST_IN_PER_MTOK + (usage.tokensOut / 1_000_000) * COST_OUT_PER_MTOK;
  return Math.round(chf * 10_000) / 10_000;
}

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

function monthStart(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10);
}

export type FeatureGate = { ok: true; key: string } | { ok: false; reason: AiUnavailable };

/** Checks the admin switch, the monthly budget and the provider key. */
export async function guardFeature(feature: AiFeature): Promise<FeatureGate> {
  const db = await admin();
  const { data: flag } = await db
    .from("ai_feature_flags")
    .select("enabled, monthly_budget_chf")
    .eq("feature", feature)
    .maybeSingle();

  if (!flag?.enabled) {
    await bumpBlocked(feature);
    return { ok: false, reason: "disabled" };
  }

  const budget = Number(flag.monthly_budget_chf ?? 0);
  if (budget > 0) {
    const { data: usage } = await db
      .from("ai_usage")
      .select("cost_estimate")
      .eq("feature", feature)
      .gte("day", monthStart());
    const spent = (usage ?? []).reduce((sum, row) => sum + Number(row.cost_estimate ?? 0), 0);
    if (spent >= budget) {
      await bumpBlocked(feature);
      return { ok: false, reason: "budget" };
    }
  }

  const key = aiKey();
  if (!key) {
    await bumpBlocked(feature);
    return { ok: false, reason: "no_provider" };
  }
  return { ok: true, key };
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

async function usageRow(feature: AiFeature) {
  const db = await admin();
  const day = today();
  const { data } = await db
    .from("ai_usage")
    .select("id, calls, tokens_in, tokens_out, cost_estimate, blocked_count")
    .eq("feature", feature)
    .eq("day", day)
    .maybeSingle();
  if (data) return data;
  const { data: created } = await db
    .from("ai_usage")
    .insert({ feature, day })
    .select("id, calls, tokens_in, tokens_out, cost_estimate, blocked_count")
    .single();
  return created ?? null;
}

async function bumpBlocked(feature: AiFeature): Promise<void> {
  const db = await admin();
  const row = await usageRow(feature);
  if (!row) return;
  await db
    .from("ai_usage")
    .update({ blocked_count: (row.blocked_count ?? 0) + 1 })
    .eq("id", row.id);
}

export async function recordUsage(feature: AiFeature, usage: AiUsage, cost: number): Promise<void> {
  const db = await admin();
  const row = await usageRow(feature);
  if (!row) return;
  await db
    .from("ai_usage")
    .update({
      calls: (row.calls ?? 0) + 1,
      tokens_in: Number(row.tokens_in ?? 0) + usage.tokensIn,
      tokens_out: Number(row.tokens_out ?? 0) + usage.tokensOut,
      cost_estimate: Number(row.cost_estimate ?? 0) + cost,
    })
    .eq("id", row.id);
}

export type SuggestionInput = {
  feature: AiFeature;
  subjectType: AiSubjectType;
  subjectId: string | null;
  language: string;
  inputSummary: string;
  payload: Record<string, unknown>;
  outputText: string;
  usage: AiUsage;
  createdBy: string;
  promptVersion: string;
  status?: AiStatus;
};

/** Writes the reviewable audit row and returns its id. */
export async function recordSuggestion(input: SuggestionInput): Promise<string> {
  const db = await admin();
  const cost = estimateCost(input.usage);
  await recordUsage(input.feature, input.usage, cost);

  const { data, error } = await db
    .from("ai_suggestions")
    .insert({
      feature: input.feature,
      status: input.status ?? "proposed",
      subject_type: input.subjectType,
      subject_id: input.subjectId,
      language: input.language,
      input_summary: input.inputSummary.slice(0, 2000),
      payload: input.payload as never,
      output_text: input.outputText.slice(0, 20_000),
      provider: AI_PROVIDER,
      model: AI_TEXT_MODEL,
      model_version: AI_TEXT_MODEL,
      prompt_version: input.promptVersion,
      tokens_in: input.usage.tokensIn,
      tokens_out: input.usage.tokensOut,
      cost_estimate: cost,
      created_by: input.createdBy,
    })
    .select("id")
    .single();

  if (error || !data) throw new Error(`ai suggestion insert failed: ${error?.message ?? "unknown"}`);
  return data.id;
}
