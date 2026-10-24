/**
 * Model adapters for AI Assist.
 *
 * One place holds the provider, the key and the wire format; every feature
 * calls `askModel`, `askModelAboutImages` or `transcribeAudio` and never sees
 * a URL or a key. Chat runs on the gateway Responses API and always streams —
 * a reasoning model can run for minutes, and a buffered request would be cut
 * off by the platform and billed anyway.
 */

export const AI_PROVIDER = "lovable-gateway";
export const AI_TEXT_MODEL = "openai/gpt-6-astra";
export const AI_TRANSCRIBE_MODEL = "google/gemini-3.5-transcribe";

export class AiProviderError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "AiProviderError";
    this.status = status;
  }
}

export function aiKey(): string | null {
  return process.env["LOVABLE_API_KEY"] ?? null;
}

export type AiUsage = { tokensIn: number; tokensOut: number };
export type AiTextResult = { text: string; usage: AiUsage };

type ResponsesContent =
  | { type: "input_text"; text: string }
  | { type: "input_image"; image_url: string };

async function callResponses(
  key: string,
  input: Array<{ role: "user"; content: ResponsesContent[] }>,
  instructions: string,
): Promise<AiTextResult> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": key,
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify({
      model: AI_TEXT_MODEL,
      instructions,
      input,
      stream: true,
      store: false,
      reasoning: { effort: "low" },
    }),
  });

  if (!res.ok || !res.body) {
    const body = await res.text().catch(() => "");
    throw new AiProviderError(res.status, body.slice(0, 400));
  }

  // Streamed server-sent events; we only need the answer text and the usage.
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";
  const usage: AiUsage = { tokensIn: 0, tokensOut: 0 };

  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    buffer += decoder.decode(chunk.value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const raw = line.slice(5).trim();
      if (!raw || raw === "[DONE]") continue;
      try {
        const event = JSON.parse(raw) as {
          type?: string;
          delta?: string;
          response?: { output_text?: string; usage?: { input_tokens?: number; output_tokens?: number } };
        };
        if (event.type === "response.output_text.delta" && typeof event.delta === "string") {
          text += event.delta;
        }
        if (event.type === "response.completed" && event.response) {
          if (!text && typeof event.response.output_text === "string") text = event.response.output_text;
          usage.tokensIn = event.response.usage?.input_tokens ?? 0;
          usage.tokensOut = event.response.usage?.output_tokens ?? 0;
        }
      } catch {
        /* a partial or unknown event is not fatal */
      }
    }
  }

  return { text: text.trim(), usage };
}

/** Plain text in, text out. */
export function askModel(key: string, instructions: string, prompt: string): Promise<AiTextResult> {
  return callResponses(key, [{ role: "user", content: [{ type: "input_text", text: prompt }] }], instructions);
}

/** Same call with photographs attached as data URLs. */
export function askModelAboutImages(
  key: string,
  instructions: string,
  prompt: string,
  imageDataUrls: string[],
): Promise<AiTextResult> {
  const content: ResponsesContent[] = [{ type: "input_text", text: prompt }];
  for (const url of imageDataUrls.slice(0, 12)) content.push({ type: "input_image", image_url: url });
  return callResponses(key, [{ role: "user", content }], instructions);
}

/** Speech to text. The spoken language is detected unless one is given. */
export async function transcribeAudio(
  key: string,
  audio: Blob,
  filename: string,
  language?: string,
): Promise<string> {
  const form = new FormData();
  form.append("model", AI_TRANSCRIBE_MODEL);
  form.append("file", audio, filename);
  if (language) form.append("language", language);

  const res = await fetch("https://ai.gateway.lovable.dev/v1/audio/transcriptions", {
    method: "POST",
    headers: { "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "fetch" },
    body: form,
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new AiProviderError(res.status, body.slice(0, 400));
  }

  const json = (await res.json()) as { text?: string };
  return (json.text ?? "").trim();
}

/** Tolerant JSON extraction: a model that adds prose still yields an object. */
export function parseJsonAnswer<T>(raw: string): T | null {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(raw.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
}
