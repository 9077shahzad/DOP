/**
 * Chat session handling: storage, rate limits, the model call, the safety
 * filter and the lead that comes out of a conversation.
 *
 * The assistant is an inquiry entry point like any other form: when intent is
 * present the conversation ends in a `create_lead()` row with source
 * `live_chat`, and the transcript is attached to that lead's timeline.
 */
import { createHash } from "node:crypto";

import type { Lang } from "@/i18n/config";
import { buildChatContext } from "@/lib/chat/context.server";
import {
  CHAT_MAX_INPUT,
  CHAT_MAX_MESSAGES,
  CHAT_MAX_MESSAGES_PER_HOUR,
  CHAT_MAX_SESSIONS_PER_HOUR,
  buildSystemPrompt,
  containsPriceClaim,
} from "@/lib/chat/guardrails";
import {
  ChatProviderError,
  parseModelAnswer,
  resolveChatProvider,
  type ChatTurn,
  type ModelAnswer,
} from "@/lib/chat/provider.server";

export type ChatReply = {
  reply: string;
  /** Set when a lead was created from this conversation. */
  reference: string | null;
  /** "ok" | "blocked" | "rate_limited" | "unavailable" | "closed" */
  state: "ok" | "blocked" | "rate_limited" | "unavailable" | "closed";
};

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export function hashIp(ip: string | undefined): string {
  const salt = process.env["SUPABASE_URL"] ?? "ps-umzug";
  return createHash("sha256").update(`${salt}:${ip ?? "unknown"}`).digest("hex").slice(0, 32);
}

/** Opens a conversation. Consent is recorded on the row, not only in the UI. */
export async function startSession(lang: Lang, ipHash: string): Promise<{ sessionId: string | null; available: boolean }> {
  const db = await admin();
  const since = new Date(Date.now() - 3600_000).toISOString();

  const { count } = await db
    .from("chat_sessions")
    .select("id", { count: "exact", head: true })
    .eq("ip_hash", ipHash)
    .gte("created_at", since);

  if ((count ?? 0) >= CHAT_MAX_SESSIONS_PER_HOUR) {
    return { sessionId: null, available: false };
  }

  const provider = resolveChatProvider();
  const { data, error } = await db
    .from("chat_sessions")
    .insert({
      language: lang,
      ip_hash: ipHash,
      consent_at: new Date().toISOString(),
      model: provider?.model ?? "",
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("chat: session insert failed", error?.message);
    return { sessionId: null, available: false };
  }
  return { sessionId: data.id, available: provider !== null };
}

async function overHourlyLimit(ipHash: string): Promise<boolean> {
  const db = await admin();
  const since = new Date(Date.now() - 3600_000).toISOString();
  const { data } = await db
    .from("chat_sessions")
    .select("message_count")
    .eq("ip_hash", ipHash)
    .gte("created_at", since);
  const total = (data ?? []).reduce((sum, row) => sum + (row.message_count ?? 0), 0);
  return total >= CHAT_MAX_MESSAGES_PER_HOUR;
}

function transcriptText(turns: ChatTurn[]): string {
  return turns.map((t) => `${t.role === "user" ? "Customer" : "Assistant"}: ${t.content}`).join("\n");
}

/** Creates the lead for a conversation and links it to the session. */
async function createChatLead(input: {
  sessionId: string;
  lang: Lang;
  collected: ModelAnswer["collected"];
  turns: ChatTurn[];
  escalated: boolean;
}): Promise<string | null> {
  const db = await admin();
  const { collected } = input;

  const { data: reference, error } = await db.rpc("create_lead", {
    payload: {
      source_key: "live_chat",
      customer_name: collected.name,
      customer_phone: collected.phone,
      customer_email: collected.email,
      preferred_contact: collected.phone ? "phone" : "email",
      city: collected.location,
      description: collected.service,
      language: input.lang,
      urgency: input.escalated ? "high" : "normal",
      ...(input.escalated ? { flag: "callback" } : {}),
      status: "quote_required",
      service_details: {
        channel: "chat",
        chat_session_id: input.sessionId,
        service: collected.service,
        location: collected.location,
        timeframe: collected.timeframe,
        escalated: input.escalated,
        // The assistant never prices: whoever picks this up quotes it.
        priced: false,
      },
    } as never,
  });

  if (error || !reference) {
    console.error("chat: create_lead failed", error?.message);
    return null;
  }

  const ref = String(reference);
  const { data: lead } = await db.from("leads").select("id").eq("reference", ref).maybeSingle();
  if (lead?.id) {
    await db.from("chat_sessions").update({ lead_id: lead.id }).eq("id", input.sessionId);
    await db.from("lead_activities").insert({
      lead_id: lead.id,
      kind: "note",
      body: `Chat transcript\n\n${transcriptText(input.turns)}`.slice(0, 8000),
      meta: { channel: "chat", chat_session_id: input.sessionId },
      actor_kind: "system",
    });
  }
  return ref;
}

export async function sendMessage(input: {
  sessionId: string;
  lang: Lang;
  message: string;
  ipHash: string;
}): Promise<ChatReply> {
  const db = await admin();
  const message = input.message.trim().slice(0, CHAT_MAX_INPUT);
  if (!message) return { reply: "", reference: null, state: "ok" };

  const { data: session } = await db
    .from("chat_sessions")
    .select("id, language, message_count, blocked_count, lead_id, closed")
    .eq("id", input.sessionId)
    .maybeSingle();

  if (!session) return { reply: "", reference: null, state: "closed" };
  if (session.closed || session.message_count >= CHAT_MAX_MESSAGES) {
    return { reply: "", reference: null, state: "closed" };
  }
  if (await overHourlyLimit(input.ipHash)) {
    return { reply: "", reference: null, state: "rate_limited" };
  }

  const provider = resolveChatProvider();
  if (!provider) return { reply: "", reference: null, state: "unavailable" };

  await db.from("chat_messages").insert({ session_id: session.id, role: "user", content: message });

  const { data: history } = await db
    .from("chat_messages")
    .select("role, content, blocked")
    .eq("session_id", session.id)
    .order("created_at", { ascending: true })
    .limit(30);

  const turns: ChatTurn[] = (history ?? [])
    .filter((row) => !row.blocked && row.content)
    .map((row) => ({ role: row.role as ChatTurn["role"], content: row.content }));

  let answer: ModelAnswer;
  try {
    const raw = await provider.complete(buildSystemPrompt(input.lang, await buildChatContext(input.lang)), turns);
    answer = parseModelAnswer(raw);
  } catch (error) {
    const status = error instanceof ChatProviderError ? error.status : 0;
    console.error("chat: provider failed", status, (error as Error).message);
    await db
      .from("chat_sessions")
      .update({ message_count: session.message_count + 1 })
      .eq("id", session.id);
    return { reply: "", reference: null, state: status === 429 ? "rate_limited" : "unavailable" };
  }

  // Safety filter: a reply naming money for a service never reaches the customer.
  const check = containsPriceClaim(answer.reply);
  let blockedCountDelta = 0;
  if (check.blocked) {
    blockedCountDelta = 1;
    console.warn("chat: blocked priced reply", { session: session.id, reason: check.reason });
    await db.from("chat_messages").insert({
      session_id: session.id,
      role: "assistant",
      content: answer.reply,
      blocked: true,
      block_reason: check.reason,
    });
  } else {
    await db.from("chat_messages").insert({
      session_id: session.id,
      role: "assistant",
      content: answer.reply,
    });
  }

  let reference: string | null = null;
  const contactable = answer.collected.name && (answer.collected.email || answer.collected.phone);
  if (!session.lead_id && (answer.ready || answer.escalate) && contactable) {
    reference = await createChatLead({
      sessionId: session.id,
      lang: input.lang,
      collected: answer.collected,
      turns: [...turns, { role: "assistant", content: answer.reply }],
      escalated: answer.escalate,
    });
  }

  await db
    .from("chat_sessions")
    .update({
      message_count: session.message_count + 1,
      blocked_count: session.blocked_count + blockedCountDelta,
      language: input.lang,
      model: provider.model,
    })
    .eq("id", session.id);

  if (check.blocked) return { reply: "", reference, state: "blocked" };
  return { reply: answer.reply, reference, state: "ok" };
}

/** Explicit "talk to a person": a callback lead with raised priority. */
export async function escalate(input: {
  sessionId: string;
  lang: Lang;
  name: string;
  phone: string;
  email: string;
}): Promise<string | null> {
  const db = await admin();
  const { data: session } = await db
    .from("chat_sessions")
    .select("id, lead_id")
    .eq("id", input.sessionId)
    .maybeSingle();
  if (!session) return null;

  const { data: history } = await db
    .from("chat_messages")
    .select("role, content, blocked")
    .eq("session_id", session.id)
    .order("created_at", { ascending: true })
    .limit(40);

  const turns: ChatTurn[] = (history ?? [])
    .filter((row) => !row.blocked)
    .map((row) => ({ role: row.role as ChatTurn["role"], content: row.content }));

  const reference = await createChatLead({
    sessionId: session.id,
    lang: input.lang,
    collected: {
      service: "",
      location: "",
      timeframe: "",
      name: input.name,
      email: input.email,
      phone: input.phone,
    },
    turns,
    escalated: true,
  });

  await db.from("chat_sessions").update({ closed: true }).eq("id", session.id);
  return reference;
}
