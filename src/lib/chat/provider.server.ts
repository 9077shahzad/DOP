/**
 * Provider-agnostic model adapter for the chat assistant.
 *
 * The route talks to `ChatProvider` only. Swapping provider means adding an
 * adapter here; nothing above this file knows which model answered. When no
 * provider is configured the resolver returns null and the widget falls back
 * to the plain contact form.
 */
export type ChatTurn = { role: "user" | "assistant"; content: string };

export type ChatProvider = {
  id: string;
  model: string;
  complete(system: string, turns: ChatTurn[]): Promise<string>;
};

/** Lovable AI Gateway (OpenAI-compatible chat completions). */
function lovableGateway(apiKey: string): ChatProvider {
  const model = "google/gemini-3.7-flash";
  return {
    id: "lovable-gateway",
    model,
    async complete(system, turns) {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Lovable-API-Key": apiKey,
          "X-Lovable-AIG-SDK": "fetch",
        },
        body: JSON.stringify({
          model,
          response_format: { type: "json_object" },
          messages: [{ role: "system", content: system }, ...turns],
        }),
      });

      if (!res.ok) {
        const body = await res.text();
        throw new ChatProviderError(res.status, body.slice(0, 400));
      }

      const json = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      return json.choices?.[0]?.message?.content ?? "";
    },
  };
}

export class ChatProviderError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ChatProviderError";
    this.status = status;
  }
}

export function resolveChatProvider(): ChatProvider | null {
  const key = process.env["LOVABLE_API_KEY"];
  if (key) return lovableGateway(key);
  return null;
}

export type ModelAnswer = {
  reply: string;
  intent: boolean;
  escalate: boolean;
  ready: boolean;
  collected: {
    service: string;
    location: string;
    timeframe: string;
    name: string;
    email: string;
    phone: string;
  };
};

const EMPTY_COLLECTED: ModelAnswer["collected"] = {
  service: "",
  location: "",
  timeframe: "",
  name: "",
  email: "",
  phone: "",
};

/** Tolerant parse: a model that answers in prose still produces a usable reply. */
export function parseModelAnswer(raw: string): ModelAnswer {
  const fallback: ModelAnswer = {
    reply: raw.trim(),
    intent: false,
    escalate: false,
    ready: false,
    collected: { ...EMPTY_COLLECTED },
  };

  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) return fallback;

  try {
    const parsed = JSON.parse(raw.slice(start, end + 1)) as Partial<ModelAnswer>;
    const collected = (parsed.collected ?? {}) as Partial<ModelAnswer["collected"]>;
    const str = (value: unknown) => (typeof value === "string" ? value.trim() : "");
    return {
      reply: str(parsed.reply) || fallback.reply,
      intent: parsed.intent === true,
      escalate: parsed.escalate === true,
      ready: parsed.ready === true,
      collected: {
        service: str(collected.service),
        location: str(collected.location),
        timeframe: str(collected.timeframe),
        name: str(collected.name),
        email: str(collected.email),
        phone: str(collected.phone),
      },
    };
  } catch {
    return fallback;
  }
}
