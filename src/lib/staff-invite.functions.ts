import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const INVITABLE_ROLES = [
  "super_admin",
  "management",
  "ops_manager",
  "dispatcher",
  "sales",
  "surveyor",
  "finance",
  "crew_leader",
  "driver",
  "mover",
  "cleaner",
] as const;

const Input = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  fullName: z.string().trim().min(2).max(120),
  role: z.enum(INVITABLE_ROLES),
  redirectTo: z.string().url().max(300),
});

const ALLOWED_ORIGINS = new Set([
  "https://psumzug.com",
  "https://www.psumzug.com",
  "https://zugegelwerk-swiss-core.lovable.app",
  "https://id-preview--e2ec9b13-8e79-46ed-9e18-a073b85179b4.lovable.app",
  "http://localhost:8080",
]);

/** Super-admin/management only: e-mails an invitation whose link opens /reset-password. */
export const inviteStaff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => Input.parse(data))
  .handler(async ({ data, context }) => {
    const { data: allowed, error: roleError } = await context.supabase.rpc("is_zw_admin");
    if (roleError || allowed !== true) throw new Error("Nur Super-Admin oder Geschäftsleitung dürfen einladen.");
    // Only our own sites may receive the invitation link; anything else falls back to the main site.
    let origin = "https://psumzug.com";
    try {
      const candidate = new URL(data.redirectTo).origin;
      if (ALLOWED_ORIGINS.has(candidate)) origin = candidate;
    } catch {
      /* keep fallback */
    }
    const redirectTo = `${origin}/reset-password`;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: invited, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(data.email, {
      redirectTo,
      data: { full_name: data.fullName },
    });
    if (error || !invited.user) throw new Error(`Einladung fehlgeschlagen: ${error?.message ?? "unbekannt"}`);

    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .upsert({ id: invited.user.id, full_name: data.fullName, role: data.role });
    if (profileError) throw new Error(`Rolle konnte nicht gesetzt werden: ${profileError.message}`);
    return { userId: invited.user.id };
  });
