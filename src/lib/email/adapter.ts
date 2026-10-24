/**
 * The provider boundary.
 *
 * Business logic — the inbox, the matching, the CRM links — only ever sees
 * `NormalizedInbound`, `OutboundMessage` and `SendResult`. No provider name,
 * header quirk or payload shape may leak past this file, so swapping Postmark
 * for Mailgun (or anything else) touches adapters only.
 */

export const ADAPTER_IDS = ["none", "postmark", "mailgun"] as const;
export type AdapterId = (typeof ADAPTER_IDS)[number];

export function isAdapterId(value: unknown): value is AdapterId {
  return typeof value === "string" && (ADAPTER_IDS as readonly string[]).includes(value);
}

/** One inbound message, in the only shape the application knows. */
export type NormalizedInbound = {
  account: string;
  from_address: string;
  from_name: string;
  to: string[];
  cc: string[];
  subject: string;
  body_text: string;
  body_html: string;
  message_id: string;
  in_reply_to: string;
  references: string[];
  received_at: string;
  headers: Record<string, unknown>;
  attachments: NormalizedAttachment[];
};

export type NormalizedAttachment = {
  filename: string;
  mime_type: string;
  size_bytes: number;
  /** base64 payload when the provider inlines it; empty when hosted remotely. */
  content_base64: string;
  content_id: string;
  url: string;
};

export type OutboundMessage = {
  from: string;
  fromName: string;
  replyTo: string;
  to: string[];
  cc: string[];
  subject: string;
  text: string;
  html?: string;
  inReplyTo: string;
  references: string[];
};

/** Credentials and addresses resolved from settings, never read by adapters directly. */
export type AdapterConfig = {
  apiKey: string;
  /** Mailgun needs the sending domain; Postmark ignores it. */
  domain: string;
};

export type SendResult = {
  sent: boolean;
  /** Empty on success; a human-readable cause otherwise. */
  reason: string;
  providerMessageId: string;
};

/** A delivery/bounce notification, normalised across providers. */
export type DeliveryEvent = {
  kind: "delivered" | "bounced" | "complained" | "deferred" | "opened" | "unknown";
  providerMessageId: string;
  recipient: string;
  reason: string;
  occurredAt: string;
};

export interface EmailAdapter {
  readonly id: AdapterId;
  readonly label: string;
  /** False for `none`: the mailbox is import-only until a provider exists. */
  readonly canSend: boolean;
  /** DKIM selector the provider publishes, for the DNS check. */
  readonly dkimSelector: string;
  /** What still has to happen on the provider's side before mail flows. */
  readonly setupSteps: string[];
  parseInbound(payload: Record<string, unknown>): NormalizedInbound;
  parseDeliveryEvent(payload: Record<string, unknown>): DeliveryEvent | null;
  send(message: OutboundMessage, config: AdapterConfig): Promise<SendResult>;
}

export const EMPTY_INBOUND: NormalizedInbound = {
  account: "",
  from_address: "",
  from_name: "",
  to: [],
  cc: [],
  subject: "",
  body_text: "",
  body_html: "",
  message_id: "",
  in_reply_to: "",
  references: [],
  received_at: "",
  headers: {},
  attachments: [],
};

/* ---------- shared parsing helpers, used by every adapter ---------- */

export function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function splitAddresses(value: string): string[] {
  return value
    .split(",")
    .map((part) => {
      const match = part.match(/<([^>]+)>/);
      return (match?.[1] ?? part).trim().toLowerCase();
    })
    .filter((address) => address.includes("@"));
}

export function addressList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((entry) =>
        typeof entry === "string"
          ? entry
          : str(
              (entry as Record<string, unknown> | null)?.["Email"] ??
                (entry as Record<string, unknown> | null)?.["email"],
            ),
      )
      .flatMap((entry) => splitAddresses(String(entry)));
  }
  return splitAddresses(str(value));
}

export function nameOf(value: unknown): string {
  const raw = str(value);
  const match = raw.match(/^\s*"?([^"<]*)"?\s*</);
  return match ? (match[1] ?? "").trim() : "";
}

export function isoDate(value: unknown): string {
  const raw = typeof value === "number" ? new Date(value * 1000).toISOString() : str(value);
  if (!raw) return new Date().toISOString();
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

export function refs(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  return str(value).split(/\s+/).filter(Boolean);
}

export function formatFrom(message: OutboundMessage): string {
  return message.fromName ? `${message.fromName} <${message.from}>` : message.from;
}
