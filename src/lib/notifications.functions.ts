import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type SettingsView = {
  provider: string;
  enabled: boolean;
  from_name: string;
  from_email: string;
  reply_to: string;
  test_recipient: string;
  api_key_set: boolean;
  api_key_source: "settings" | "environment" | "none";
  webhook_secret_set: boolean;
  updated_at: string;
};

export type SettingsInput = {
  enabled: boolean;
  from_name: string;
  from_email: string;
  reply_to: string;
  test_recipient: string;
  /** Empty string keeps the stored key; "__clear__" removes it. */
  api_key: string;
  webhook_secret: string;
};

export type DeliveryRow = {
  id: string;
  created_at: string;
  event_at: string;
  template: string;
  recipient: string;
  status: string;
  subject: string;
  language: string;
  error: string;
  provider_message_id: string;
};

export const getNotificationSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SettingsView> => {
    const { data: isStaff } = await context.supabase.rpc("is_staff");
    if (!isStaff) throw new Error("Forbidden");
    const { loadSettings } = await import("@/lib/notifications.server");
    const s = await loadSettings();
    const envKey = (process.env["RESEND_API_KEY"] ?? "").trim();
    return {
      provider: s.provider,
      enabled: s.enabled,
      from_name: s.from_name,
      from_email: s.from_email,
      reply_to: s.reply_to,
      test_recipient: s.test_recipient,
      api_key_set: Boolean(s.api_key.trim() || envKey),
      api_key_source: s.api_key.trim() ? "settings" : envKey ? "environment" : "none",
      webhook_secret_set: Boolean(s.webhook_secret.trim()),
      updated_at: s.updated_at,
    };
  });

export const saveNotificationSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: SettingsInput) => input)
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { data: isStaff } = await context.supabase.rpc("is_staff");
    if (!isStaff) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch: Record<string, string | boolean | null> = {
      enabled: data.enabled,
      from_name: data.from_name.trim(),
      from_email: data.from_email.trim(),
      reply_to: data.reply_to.trim(),
      test_recipient: data.test_recipient.trim(),
      updated_at: new Date().toISOString(),
      updated_by: context.userId,
    };
    if (data.api_key === "__clear__") patch["api_key"] = "";
    else if (data.api_key.trim()) patch["api_key"] = data.api_key.trim();
    if (data.webhook_secret === "__clear__") patch["webhook_secret"] = "";
    else if (data.webhook_secret.trim()) patch["webhook_secret"] = data.webhook_secret.trim();

    const { error } = await supabaseAdmin.from("notification_settings").update(patch as never).eq("id", "default");
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const sendTestNotification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { to: string; language: string }) => input)
  .handler(async ({ data, context }): Promise<{ sent: boolean; reason: string; messageId?: string }> => {
    const { data: isStaff } = await context.supabase.rpc("is_staff");
    if (!isStaff) throw new Error("Forbidden");
    const { sendNotification, loadSettings } = await import("@/lib/notifications.server");
    const s = await loadSettings();
    const to = String(data.to ?? "").trim().toLowerCase();
    const allowed = [s.test_recipient, s.from_email, s.reply_to, String(context.claims.email ?? "")]
      .map((v) => v.trim().toLowerCase())
      .filter(Boolean);
    if (!allowed.includes(to)) {
      return { sent: false, reason: "Testversand nur an die hinterlegte Testadresse, Absender-/Antwortadresse oder die eigene Adresse." };
    }
    return sendNotification({
      template: "test_notification",
      to: data.to,
      language: data.language,
      subjectType: "test",
      data: { note: "Testversand aus dem Adminbereich." },
    });
  });

export const listDeliveryLog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { status?: string; search?: string; limit?: number }) => input)
  .handler(async ({ data, context }): Promise<DeliveryRow[]> => {
    const { data: isStaff } = await context.supabase.rpc("is_staff");
    if (!isStaff) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let query = supabaseAdmin
      .from("notification_log")
      .select("id, created_at, event_at, template, recipient, status, subject, language, error, provider_message_id")
      .order("event_at", { ascending: false })
      .limit(Math.min(Math.max(data.limit ?? 100, 1), 200));

    if (data.status && data.status !== "all") query = query.eq("status", data.status);
    if (data.search?.trim()) query = query.ilike("recipient", `%${data.search.trim()}%`);

    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return (rows ?? []) as DeliveryRow[];
  });
