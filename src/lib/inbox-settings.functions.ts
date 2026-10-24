import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { DnsCheck } from "@/lib/email/dns-types";

export type MailboxHealth = {
  provider: string;
  providerLabel: string;
  canSend: boolean;
  setupSteps: string[];
  senderName: string;
  senderAddress: string;
  replyTo: string;
  inboundAddress: string;
  domain: string;
  dkimSelector: string;
  /** connected only when a provider, a key and a verified sending domain exist. */
  connection: "not_configured" | "partially_configured" | "connected";
  connectionDetail: string;
  webhookSecretSet: boolean;
  dns: DnsCheck[];
  lastInboundAt: string;
  lastOutboundAt: string;
  lastOutboundStatus: string;
  failedCount: number;
  pendingCount: number;
  /** Outbound sending switch from the settings row. */
  sendingEnabled: boolean;
  /** Prepared notification templates and the languages each one renders in. */
  templates: { key: string; languages: string[] }[];
};

export type TestSendResult = { sent: boolean; reason: string };

/** Staff-only mailbox health. Every field is a live read, not a stored flag. */
export const getMailboxHealth = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MailboxHealth> => {
    const { data: staff } = await context.supabase.rpc("is_staff");
    if (!staff) throw new Error("Forbidden");
    const { loadMailboxHealth } = await import("@/lib/inbox-settings.server");
    return loadMailboxHealth(context.supabase);
  });

/** Sends a real test message and reports the real outcome. */
export const sendMailboxTest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { to: string }) => data)
  .handler(async ({ data, context }): Promise<TestSendResult> => {
    const { data: staff } = await context.supabase.rpc("is_staff");
    if (!staff) throw new Error("Forbidden");
    const recipient = String(data.to ?? "").trim();
    if (!recipient.includes("@")) return { sent: false, reason: "ungültige Empfängeradresse" };

    const { sendRawEmail, loadSettings } = await import("@/lib/notifications.server");
    const s = await loadSettings();
    const allowed = [s.test_recipient, s.from_email, s.reply_to, String(context.claims.email ?? "")]
      .map((v) => v.trim().toLowerCase())
      .filter(Boolean);
    if (!allowed.includes(recipient.toLowerCase())) {
      return { sent: false, reason: "Testversand nur an die hinterlegte Testadresse, Absender-/Antwortadresse oder die eigene Adresse." };
    }
    const outcome = await sendRawEmail({
      to: [recipient],
      subject: "PS Umzug – Testnachricht Postfach",
      text: "Diese Testnachricht bestätigt die ausgehende Zustellung des PS Umzug-Postfachs.",
    });
    return { sent: outcome.sent, reason: outcome.sent ? "" : outcome.reason };
  });
