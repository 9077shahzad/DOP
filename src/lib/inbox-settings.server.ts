/**
 * Server-only mailbox health resolution.
 *
 * Nothing here is a stored boolean: the provider comes from settings, the DNS
 * state from a live lookup, and the activity figures from the actual message
 * and delivery rows.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";
import { checkEmailDns } from "@/lib/dns.server";
import { resolveAdapter } from "@/lib/email/adapters";
import { TEMPLATE_KEYS } from "@/lib/email/templates";
import { LANGS as EMAIL_LANGS } from "@/lib/email/template-types";
import type { MailboxHealth } from "@/lib/inbox-settings.functions";

type Client = SupabaseClient<Database>;

export async function loadMailboxHealth(db: Client): Promise<MailboxHealth> {
  const { loadSettings, resolveApiKey } = await import("@/lib/notifications.server");
  const settings = await loadSettings();

  const { data: account } = await db
    .from("email_accounts")
    .select("address, display_name, reply_to, inbound_address, domain, dkim_selector, provider, outbound_ready")
    .eq("active", true)
    .order("is_default", { ascending: false })
    .limit(1)
    .maybeSingle();

  const provider = account?.provider?.trim() || settings.provider;
  const adapter = resolveAdapter(provider);
  const senderAddress = settings.from_email.trim() || account?.address || "";
  const domain = account?.domain?.trim() || senderAddress.split("@")[1] || "";
  const dkimSelector = account?.dkim_selector?.trim() || adapter.dkimSelector;
  const apiKey = resolveApiKey(settings);

  const [dns, lastInbound, lastOutbound, failed, pending] = await Promise.all([
    checkEmailDns(domain, dkimSelector),
    db
      .from("email_messages")
      .select("received_at")
      .eq("direction", "inbound")
      .eq("ingest_source", "webhook")
      .order("received_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    db
      .from("email_messages")
      .select("received_at, delivery_status")
      .eq("direction", "outbound")
      .order("received_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    db
      .from("email_messages")
      .select("id", { count: "exact", head: true })
      .eq("direction", "outbound")
      .eq("delivery_status", "failed"),
    db
      .from("email_messages")
      .select("id", { count: "exact", head: true })
      .eq("direction", "outbound")
      .eq("delivery_status", "pending"),
  ]);

  const dnsOk = dns.every((entry) => entry.status === "ok");
  const hasKey = Boolean(apiKey);
  const connection: MailboxHealth["connection"] =
    !adapter.canSend || !hasKey || !senderAddress
      ? "not_configured"
      : dnsOk && settings.enabled
        ? "connected"
        : "partially_configured";

  const connectionDetail = !adapter.canSend
    ? "kein Anbieter verbunden – Postfach ist Import-only"
    : !hasKey
      ? "kein API-Schlüssel hinterlegt"
      : !senderAddress
        ? "keine Absenderadresse konfiguriert"
        : !settings.enabled
          ? "Versand in den Einstellungen deaktiviert"
          : dnsOk
            ? ""
            : "DNS-Einträge unvollständig";

  return {
    provider,
    providerLabel: adapter.label,
    canSend: adapter.canSend,
    setupSteps: adapter.setupSteps,
    senderName: settings.from_name.trim() || account?.display_name || "",
    senderAddress,
    replyTo: settings.reply_to.trim() || account?.reply_to || "",
    inboundAddress: account?.inbound_address || "",
    domain,
    dkimSelector,
    connection,
    connectionDetail,
    webhookSecretSet: Boolean(settings.webhook_secret.trim()),
    dns,
    lastInboundAt: lastInbound.data?.received_at ?? "",
    lastOutboundAt: lastOutbound.data?.received_at ?? "",
    lastOutboundStatus: lastOutbound.data?.delivery_status ?? "",
    failedCount: failed.count ?? 0,
    pendingCount: pending.count ?? 0,
    sendingEnabled: settings.enabled,
    templates: TEMPLATE_KEYS.map((key) => ({ key, languages: [...EMAIL_LANGS] })),
  };
}
