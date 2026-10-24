/**
 * Server functions for the customer chat assistant. The browser never sees a
 * model key, a prompt or a transcript it did not send.
 */
import { createServerFn } from "@tanstack/react-start";
import { getRequestIP } from "@tanstack/react-start/server";

import { DEFAULT_LANG, isLang, type Lang } from "@/i18n/config";
import { CHAT_MAX_INPUT } from "@/lib/chat/guardrails";

function lang(value: unknown): Lang {
  return isLang(value) ? value : DEFAULT_LANG;
}

function visitorIp(): string | undefined {
  try {
    return getRequestIP({ xForwardedFor: true });
  } catch {
    return undefined;
  }
}

export type StartChatResult = { sessionId: string | null; available: boolean };

export const startChat = createServerFn({ method: "POST" })
  .inputValidator((data: { lang: string }) => ({ lang: lang(data?.lang) }))
  .handler(async ({ data }): Promise<StartChatResult> => {
    const { hashIp, startSession } = await import("@/lib/chat/session.server");
    return startSession(data.lang, hashIp(visitorIp()));
  });

export const sendChatMessage = createServerFn({ method: "POST" })
  .inputValidator((data: { sessionId: string; lang: string; message: string }) => ({
    sessionId: String(data?.sessionId ?? "").slice(0, 40),
    lang: lang(data?.lang),
    message: String(data?.message ?? "").slice(0, CHAT_MAX_INPUT),
  }))
  .handler(async ({ data }) => {
    const { hashIp, sendMessage } = await import("@/lib/chat/session.server");
    if (!data.sessionId) return { reply: "", reference: null, state: "closed" as const };
    return sendMessage({ ...data, ipHash: hashIp(visitorIp()) });
  });

export const escalateChat = createServerFn({ method: "POST" })
  .inputValidator((data: { sessionId: string; lang: string; name: string; phone: string; email: string }) => ({
    sessionId: String(data?.sessionId ?? "").slice(0, 40),
    lang: lang(data?.lang),
    name: String(data?.name ?? "").slice(0, 120),
    phone: String(data?.phone ?? "").slice(0, 40),
    email: String(data?.email ?? "").slice(0, 160),
  }))
  .handler(async ({ data }): Promise<{ reference: string | null }> => {
    const { escalate } = await import("@/lib/chat/session.server");
    if (!data.sessionId) return { reference: null };
    return { reference: await escalate(data) };
  });
