import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ReadinessRow = {
  key: string;
  label: string;
  /** live = computed from a real read; attestation = a person confirmed it. */
  kind: "live" | "attestation";
  /**
   * Which kind of work closes the row. Software rows are ours; everything else
   * waits on a person, a business decision or a third party.
   */
  category: "software" | "human_uat" | "business" | "external";
  status: "ok" | "partial" | "missing" | "failed";
  checked: string;
  missing: string;
  fixTo: string;
  fixLabel: string;
  blocking: boolean;
  detail?: string[];
  confirmedBy?: string;
  confirmedAt?: string;
  note?: string;
};

export type CronJobRow = {
  name: string;
  schedule: string;
  active: boolean;
  lastRun: string;
  lastSuccess: string;
  nextRun: string;
  processed24h: number;
  failures24h: number;
  health: "healthy" | "stale" | "failed" | "never";
  message: string;
};

export type SecurityFindingGroup = {
  /** anon = callable without sign-in; authenticated = callable by any signed-in user. */
  key: "anon" | "authenticated";
  label: string;
  count: number;
  /** Why the functions in this group intentionally keep EXECUTE. */
  reason: string;
  items: string[];
};

export type ReadinessReport = {
  rows: ReadinessRow[];
  cron: CronJobRow[];
  ready: boolean;
  blockers: string[];
  headline: string;
  checkedAt: string;
  provisional: string[];
  lastNotificationActivity: string;
  /**
   * Open database-linter security findings, computed live and grouped with
   * their rationale. "Intentional" never removes them from future reviews.
   */
  security: SecurityFindingGroup[];
};

export const getReadinessReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ReadinessReport> => {
    const { data: staff } = await context.supabase.rpc("is_staff");
    if (!staff) throw new Error("Forbidden");
    const { buildReadinessReport } = await import("@/lib/readiness.server");
    return buildReadinessReport(context.supabase);
  });

export const setReadinessAttestation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { key: string; confirmed: boolean; note: string }) => data)
  .handler(async ({ data, context }): Promise<{ ok: boolean }> => {
    const { data: staff } = await context.supabase.rpc("is_staff");
    if (!staff) throw new Error("Forbidden");

    const { data: profile } = await context.supabase
      .from("profiles")
      .select("full_name")
      .eq("id", context.userId)
      .maybeSingle();
    const name = (profile?.full_name || context.claims?.email || "").toString();

    const { error } = await context.supabase.from("readiness_attestations").upsert(
      {
        key: data.key,
        confirmed: data.confirmed,
        confirmed_by: context.userId,
        confirmed_name: data.confirmed ? name : "",
        confirmed_at: data.confirmed ? new Date().toISOString() : null,
        note: data.note,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" },
    );
    if (error) throw error;
    return { ok: true };
  });
