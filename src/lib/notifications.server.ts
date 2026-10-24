/**
 * Server-only email delivery through Resend.
 *
 * Credentials come from the Company Settings row first (staff configurable in
 * the admin) and fall back to a RESEND_API_KEY environment secret. Every
 * attempt — accepted or refused — is written to notification_log so the admin
 * delivery log can be used for troubleshooting.
 */

import {
  renderEmail,
  asEmailLang,
  type EmailTemplateKey,
  type TemplateData,
} from "@/lib/email/templates";

export type NotificationSettings = {
  provider: string;
  enabled: boolean;
  from_name: string;
  from_email: string;
  reply_to: string;
  test_recipient: string;
  api_key: string;
  webhook_secret: string;
  updated_at: string;
};

export type SendArgs = {
  template: EmailTemplateKey;
  to: string;
  language: string;
  data: TemplateData;
  partnerId?: string | null;
  leadId?: string | null;
  subjectType?: string;
  subjectId?: string | null;
};

export type SendOutcome = { sent: boolean; reason: string; messageId?: string };

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export async function loadSettings(): Promise<NotificationSettings> {
  const db = await admin();
  const { data } = await db
    .from("notification_settings")
    .select(
      "provider, enabled, from_name, from_email, reply_to, test_recipient, api_key, webhook_secret, updated_at",
    )
    .eq("id", "default")
    .maybeSingle();

  return {
    provider: data?.provider ?? "resend",
    enabled: data?.enabled ?? false,
    from_name: data?.from_name ?? "",
    from_email: data?.from_email ?? "",
    reply_to: data?.reply_to ?? "",
    test_recipient: data?.test_recipient ?? "",
    api_key: data?.api_key ?? "",
    webhook_secret: data?.webhook_secret ?? "",
    updated_at: data?.updated_at ?? "",
  };
}

export function resolveApiKey(settings: NotificationSettings): string {
  return settings.api_key.trim() || (process.env["RESEND_API_KEY"] ?? "").trim();
}

async function logDelivery(entry: {
  template: string;
  recipient: string;
  status: string;
  error?: string;
  subject: string;
  language: string;
  providerMessageId?: string;
  partnerId?: string | null;
  leadId?: string | null;
  subjectType?: string;
  subjectId?: string | null;
  details?: Record<string, unknown>;
}): Promise<void> {
  const db = await admin();
  await db.from("notification_log").insert({
    template: entry.template,
    channel: "email",
    recipient: entry.recipient,
    status: entry.status,
    error: entry.error ?? "",
    subject: entry.subject,
    language: entry.language,
    provider: "resend",
    provider_message_id: entry.providerMessageId ?? "",
    partner_id: entry.partnerId ?? null,
    lead_id: entry.leadId ?? null,
    subject_type: entry.subjectType ?? "partner",
    subject_id: entry.subjectId ?? null,
    attempts: 1,
    event_at: new Date().toISOString(),
    details: (entry.details ?? {}) as never,
  });
}

/** Sends one email and records the result. Never throws on provider errors. */
export async function sendNotification(args: SendArgs): Promise<SendOutcome> {
  const settings = await loadSettings();
  const lang = asEmailLang(args.language);
  const rendered = renderEmail(args.template, lang, args.data);
  const recipient = args.to.trim();

  const record = async (
    status: "failed" | "pending",
    reason: string,
    details?: Record<string, unknown>,
  ): Promise<SendOutcome> => {
    await logDelivery({
      template: args.template,
      recipient,
      status,
      error: reason,
      subject: rendered.subject,
      language: lang,
      partnerId: args.partnerId ?? null,
      leadId: args.leadId ?? null,
      subjectType: args.subjectType ?? "partner",
      subjectId: args.subjectId ?? null,
      details: details ?? {},
    });
    return { sent: false, reason };
  };
  const fail = (reason: string, details?: Record<string, unknown>) =>
    record("failed", reason, details);
  /** Configuration gaps are not delivery failures: the notice stays queued. */
  const queue = (reason: string) => record("pending", reason);

  if (!recipient) return { sent: false, reason: "no recipient address" };
  if (!settings.enabled) return queue("email delivery is switched off in company settings");
  if (!settings.from_email.trim()) return queue("no sender address configured");

  const apiKey = resolveApiKey(settings);
  if (!apiKey) return queue("no Resend API key configured");

  const from = settings.from_name.trim()
    ? `${settings.from_name.trim()} <${settings.from_email.trim()}>`
    : settings.from_email.trim();

  let response: Response;
  try {
    response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        from,
        to: [recipient],
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
        ...(settings.reply_to.trim() ? { reply_to: settings.reply_to.trim() } : {}),
        tags: [{ name: "template", value: args.template }],
      }),
    });
  } catch (error) {
    return fail(`provider unreachable: ${error instanceof Error ? error.message : String(error)}`);
  }

  const bodyText = await response.text();
  if (!response.ok) {
    console.error(`[notifications] Resend request failed [${response.status}]: ${bodyText}`);
    return fail(`Resend ${response.status}: ${bodyText.slice(0, 400)}`);
  }

  let messageId = "";
  try {
    messageId = (JSON.parse(bodyText) as { id?: string }).id ?? "";
  } catch {
    messageId = "";
  }

  await logDelivery({
    template: args.template,
    recipient,
    status: "sent",
    subject: rendered.subject,
    language: lang,
    providerMessageId: messageId,
    partnerId: args.partnerId ?? null,
    leadId: args.leadId ?? null,
    subjectType: args.subjectType ?? "partner",
    subjectId: args.subjectId ?? null,
  });

  return { sent: true, reason: "accepted by provider", messageId };
}

/** Records a provider webhook event (delivered, bounced, deferred, complaint). */
export async function recordDeliveryEvent(payload: {
  type: string;
  messageId: string;
  recipient: string;
  detail: Record<string, unknown>;
}): Promise<void> {
  const db = await admin();
  const status = payload.type.replace(/^email\./, "");

  if (payload.messageId) {
    const { data: existing } = await db
      .from("notification_log")
      .select("id, template, subject, language, partner_id, lead_id, subject_type, subject_id")
      .eq("provider_message_id", payload.messageId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (existing) {
      await db.from("notification_log").insert({
        template: existing.template,
        channel: "email",
        recipient: payload.recipient || "",
        status,
        error:
          typeof payload.detail["reason"] === "string" ? (payload.detail["reason"] as string) : "",
        subject: existing.subject ?? "",
        language: existing.language ?? "de",
        provider: "resend",
        provider_message_id: payload.messageId,
        partner_id: existing.partner_id,
        lead_id: existing.lead_id,
        subject_type: existing.subject_type,
        subject_id: existing.subject_id,
        event_at: new Date().toISOString(),
        details: payload.detail as never,
      });
      return;
    }
  }

  await db.from("notification_log").insert({
    template: "unknown",
    channel: "email",
    recipient: payload.recipient || "",
    status,
    provider: "resend",
    provider_message_id: payload.messageId,
    subject_type: "provider_event",
    event_at: new Date().toISOString(),
    details: payload.detail as never,
  });
}

/**
 * Free-form outbound message (an inbox reply), sent through the same
 * provider-agnostic layer as the templated notifications.
 *
 * It never claims success it cannot prove: with no provider configured the
 * call resolves `{ sent: false }` with the reason, and the caller stores the
 * message as pending. Nothing is ever displayed as sent that was not sent.
 */
export async function sendRawEmail(args: {
  to: string[];
  cc?: string[];
  subject: string;
  text: string;
  html?: string;
  inReplyTo?: string;
  references?: string[];
  leadId?: string | null;
  /** Base64 payloads (no data: prefix), e.g. the generated quotation PDF. */
  attachments?: { filename: string; contentBase64: string }[];
  /** Overrides the generic template label in the delivery log. */
  template?: string;
  subjectType?: string;
  subjectId?: string | null;
}): Promise<SendOutcome> {

  const settings = await loadSettings();
  const recipients = args.to.map((a) => a.trim()).filter(Boolean);
  const log = (status: string, error: string, providerMessageId?: string) =>
    logDelivery({
      template: args.template ?? "inbox_reply",
      recipient: recipients[0] ?? "",
      status,
      error,
      subject: args.subject,
      language: "de",
      providerMessageId: providerMessageId ?? "",
      leadId: args.leadId ?? null,
      subjectType: args.subjectType ?? "email",
      subjectId: args.subjectId ?? null,
      details: { to: recipients, cc: args.cc ?? [] },
    });


  if (recipients.length === 0) return { sent: false, reason: "no recipient address" };
  if (!settings.enabled) {
    await log("pending", "kein Anbieter verbunden");
    return { sent: false, reason: "kein Anbieter verbunden" };
  }
  const apiKey = resolveApiKey(settings);
  if (!apiKey || !settings.from_email.trim()) {
    await log("pending", "kein Anbieter verbunden");
    return { sent: false, reason: "kein Anbieter verbunden" };
  }

  // Anything other than the legacy Resend path goes through the EmailAdapter
  // interface, so the provider can be swapped without touching the inbox.
  if (settings.provider !== "resend") {
    const { resolveAdapter } = await import("@/lib/email/adapters");
    const adapter = resolveAdapter(settings.provider);
    const result = await adapter.send(
      {
        from: settings.from_email.trim(),
        fromName: settings.from_name.trim(),
        replyTo: settings.reply_to.trim(),
        to: recipients,
        cc: args.cc ?? [],
        subject: args.subject,
        text: args.text,
        ...(args.html ? { html: args.html } : {}),
        inReplyTo: args.inReplyTo ?? "",
        references: args.references ?? [],
      },
      { apiKey, domain: settings.from_email.split("@")[1] ?? "" },
    );
    await log(
      result.sent ? "sent" : result.reason === "kein Anbieter verbunden" ? "pending" : "failed",
      result.sent ? "" : result.reason,
      result.providerMessageId,
    );
    return result.sent
      ? { sent: true, reason: "accepted by provider", messageId: result.providerMessageId }
      : { sent: false, reason: result.reason };
  }

  const from = settings.from_name.trim()
    ? `${settings.from_name.trim()} <${settings.from_email.trim()}>`
    : settings.from_email.trim();

  let response: Response;
  try {
    response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        from,
        to: recipients,
        ...(args.cc && args.cc.length > 0 ? { cc: args.cc } : {}),
        subject: args.subject,
        text: args.text,
        ...(args.html ? { html: args.html } : {}),
        ...(settings.reply_to.trim() ? { reply_to: settings.reply_to.trim() } : {}),
        ...(args.attachments && args.attachments.length > 0
          ? {
              attachments: args.attachments.map((a) => ({
                filename: a.filename,
                content: a.contentBase64,
              })),
            }
          : {}),

        ...(args.inReplyTo || (args.references && args.references.length > 0)
          ? {
              headers: {
                ...(args.inReplyTo ? { "In-Reply-To": args.inReplyTo } : {}),
                ...(args.references && args.references.length > 0
                  ? { References: args.references.join(" ") }
                  : {}),
              },
            }
          : {}),
      }),
    });
  } catch (error) {
    const reason = `provider unreachable: ${error instanceof Error ? error.message : String(error)}`;
    await log("failed", reason);
    return { sent: false, reason };
  }

  const bodyText = await response.text();
  if (!response.ok) {
    const reason = `Resend ${response.status}: ${bodyText.slice(0, 400)}`;
    await log("failed", reason);
    return { sent: false, reason };
  }

  let messageId = "";
  try {
    messageId = (JSON.parse(bodyText) as { id?: string }).id ?? "";
  } catch {
    messageId = "";
  }
  await log("sent", "", messageId);
  return { sent: true, reason: "accepted by provider", messageId };
}
