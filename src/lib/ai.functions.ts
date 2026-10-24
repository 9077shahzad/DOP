/**
 * Server functions for AI Assist.
 *
 * The browser never sees a model key, a prompt or a photo it is not already
 * allowed to open: the caller is authenticated, the role is checked against the
 * same rules the tables use, and only the reviewable suggestion comes back.
 */
import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { AiRun } from "@/lib/ai/features";

const MAX_AUDIO_BASE64 = 12 * 1024 * 1024;

type AuthedContext = { supabase: { rpc: RpcCall }; userId: string };
type RpcCall = (fn: "is_staff" | "is_dispatcher") => PromiseLike<{ data: unknown }>;

async function isOfficeUser(supabase: AuthedContext["supabase"]): Promise<boolean> {
  const [staff, dispatcher] = await Promise.all([supabase.rpc("is_staff"), supabase.rpc("is_dispatcher")]);
  return staff.data === true || dispatcher.data === true;
}

export const aiLeadTriage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { leadId: string }) => ({ leadId: String(data?.leadId ?? "").slice(0, 40) }))
  .handler(async ({ data, context }) => {
    if (!data.leadId) return { ok: false as const, reason: "no_input" as const };
    if (!(await isOfficeUser(context.supabase))) throw new Error("Forbidden");
    const { runLeadTriage } = await import("@/lib/ai/assist.server");
    return runLeadTriage(data.leadId, context.userId);
  });

export const aiPhotoInventory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { leadId: string }) => ({ leadId: String(data?.leadId ?? "").slice(0, 40) }))
  .handler(async ({ data, context }) => {
    if (!data.leadId) return { ok: false as const, reason: "no_input" as const };
    if (!(await isOfficeUser(context.supabase))) throw new Error("Forbidden");
    const { runPhotoInventory } = await import("@/lib/ai/assist.server");
    return runPhotoInventory(data.leadId, context.userId);
  });

export const aiCrewBriefing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { jobId: string }) => ({ jobId: String(data?.jobId ?? "").slice(0, 40) }))
  .handler(async ({ data, context }) => {
    if (!data.jobId) return { ok: false as const, reason: "no_input" as const };
    const office = await isOfficeUser(context.supabase);
    if (!office) {
      const { data: crew } = await (
        context.supabase as unknown as {
          rpc: (fn: string, args: Record<string, string>) => PromiseLike<{ data: unknown }>;
        }
      ).rpc("is_crew_of_job", { _job_id: data.jobId });
      if (crew !== true) throw new Error("Forbidden");
    }
    const { runCrewBriefing } = await import("@/lib/ai/assist.server");
    return runCrewBriefing(data.jobId, context.userId);
  });

export const aiCrewVoiceNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: { jobId: string; audioBase64: string; filename: string; mimeType: string; spokenLanguage?: string }) => ({
      jobId: String(data?.jobId ?? "").slice(0, 40),
      audioBase64: String(data?.audioBase64 ?? "").slice(0, MAX_AUDIO_BASE64),
      filename: String(data?.filename ?? "recording.wav").slice(0, 120),
      mimeType: String(data?.mimeType ?? "audio/wav").slice(0, 60),
      spokenLanguage: data?.spokenLanguage ? String(data.spokenLanguage).slice(0, 8) : undefined,
    }),
  )
  .handler(async ({ data, context }) => {
    if (!data.jobId || !data.audioBase64) return { ok: false as const, reason: "no_input" as const };
    const office = await isOfficeUser(context.supabase);
    if (!office) {
      const { data: crew } = await context.supabase.rpc("is_crew_of_job", { _job_id: data.jobId });
      if (crew !== true) throw new Error("Forbidden");
    }
    const { runCrewVoiceNote } = await import("@/lib/ai/assist.server");
    return runCrewVoiceNote({
      jobId: data.jobId,
      audioBase64: data.audioBase64,
      filename: data.filename,
      mimeType: data.mimeType,
      ...(data.spokenLanguage ? { spokenLanguage: data.spokenLanguage } : {}),
      userId: context.userId,
    });
  });

export type AiRunResult<T> = AiRun<T>;
