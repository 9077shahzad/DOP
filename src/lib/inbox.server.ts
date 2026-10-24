/**
 * Outbound side of the email workspace, server-only.
 *
 * A reply is written to the thread first (so the conversation is complete and
 * auditable), then handed to the provider-agnostic notification layer. With no
 * provider connected the message stays `pending` with the reason
 * "kein Anbieter verbunden" — it is never shown as sent.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Json } from "@/integrations/supabase/types";

export type ReplyInput = {
  threadId: string;
  to: string[];
  cc: string[];
  subject: string;
  bodyText: string;
  inReplyTo: string;
  references: string[];
};

export type ReplyResult = {
  messageRowId: string;
  status: "sent" | "pending" | "failed";
  reason: string;
};

type Client = SupabaseClient<Database>;

export async function composeReply(db: Client, input: ReplyInput): Promise<ReplyResult> {
  const { data: account } = await db
    .from("email_accounts")
    .select("address, display_name, outbound_ready")
    .eq("active", true)
    .order("is_default", { ascending: false })
    .limit(1)
    .maybeSingle();

  const from = account?.address ?? "";
  if (!from) throw new Error("no email account configured");

  const { data: ingested, error } = await db.rpc("email_ingest", {
    payload: {
      direction: "outbound",
      source: "outbound",
      account: from,
      from_address: from,
      from_name: account?.display_name ?? "",
      to: input.to,
      cc: input.cc,
      subject: input.subject,
      body_text: input.bodyText,
      in_reply_to: input.inReplyTo,
      references: input.references,
      received_at: new Date().toISOString(),
    } as unknown as Json,
  });
  if (error) throw new Error(error.message);

  const messageRowId = String((ingested as unknown as { message_id: string }).message_id);

  // The thread this reply belongs to may be linked to a lead — carry that
  // through so the delivery log points back at the same record.
  const { data: leadLink } = await db
    .from("email_links")
    .select("entity_id")
    .eq("thread_id", input.threadId)
    .eq("entity_type", "lead")
    .limit(1)
    .maybeSingle();

  const { sendRawEmail } = await import("@/lib/notifications.server");
  const outcome = await sendRawEmail({
    to: input.to,
    cc: input.cc,
    subject: input.subject,
    text: input.bodyText,
    inReplyTo: input.inReplyTo,
    references: input.references,
    leadId: leadLink?.entity_id ?? null,
  });

  const status: ReplyResult["status"] = outcome.sent
    ? "sent"
    : outcome.reason === "kein Anbieter verbunden"
      ? "pending"
      : "failed";

  await db
    .from("email_messages")
    .update({
      delivery_status: status === "sent" ? "sent" : status === "pending" ? "pending" : "failed",
      delivery_reason: outcome.sent ? "" : outcome.reason,
      provider_message_id: outcome.messageId ?? "",
    })
    .eq("id", messageRowId);

  return { messageRowId, status, reason: outcome.reason };
}
