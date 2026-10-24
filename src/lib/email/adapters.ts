/**
 * Concrete providers behind the `EmailAdapter` interface.
 *
 * `none` is the honest default: it parses nothing and sends nothing, so the
 * workspace stays fully usable through imports while reporting the truth
 * about outbound mail.
 */
import {
  EMPTY_INBOUND,
  addressList,
  formatFrom,
  isoDate,
  nameOf,
  refs,
  splitAddresses,
  str,
  type AdapterConfig,
  type AdapterId,
  type DeliveryEvent,
  type EmailAdapter,
  type NormalizedAttachment,
  type NormalizedInbound,
  type OutboundMessage,
} from "./adapter";

/** The application's own normalised shape — used by .eml import and manual forwards. */
export function nativeInbound(p: Record<string, unknown>): NormalizedInbound {
  return {
    ...EMPTY_INBOUND,
    account: str(p["account"]).toLowerCase(),
    from_address: str(p["from_address"]).toLowerCase(),
    from_name: str(p["from_name"]),
    to: addressList(p["to"]),
    cc: addressList(p["cc"]),
    subject: str(p["subject"]),
    body_text: typeof p["body_text"] === "string" ? p["body_text"] : "",
    body_html: typeof p["body_html"] === "string" ? p["body_html"] : "",
    message_id: str(p["message_id"]),
    in_reply_to: str(p["in_reply_to"]),
    references: refs(p["references"]),
    received_at: isoDate(p["received_at"]),
    headers: (p["headers"] as Record<string, unknown>) ?? {},
    attachments: Array.isArray(p["attachments"]) ? (p["attachments"] as NormalizedAttachment[]) : [],
  };
}

const noneAdapter: EmailAdapter = {
  id: "none",
  label: "Kein Anbieter",
  canSend: false,
  dkimSelector: "",
  setupSteps: [
    "Domain ps-umzug.ch registrieren und DNS-Zugriff sicherstellen.",
    "Anbieter (Postmark oder Mailgun) wählen und Absenderdomain verifizieren.",
    "MX, SPF, DKIM und DMARC setzen.",
    "Inbound-Webhook auf /api/public/inbound-email?adapter=<anbieter> zeigen lassen.",
    "API-Schlüssel in den Benachrichtigungseinstellungen hinterlegen.",
  ],
  parseInbound: nativeInbound,
  parseDeliveryEvent: () => null,
  async send() {
    return { sent: false, reason: "kein Anbieter verbunden", providerMessageId: "" };
  },
};

/* ------------------------------ Postmark ------------------------------ */

const postmarkAdapter: EmailAdapter = {
  id: "postmark",
  label: "Postmark",
  canSend: true,
  dkimSelector: "20240101", // set per server in Postmark; overridden by the account setting
  setupSteps: [
    "Postmark-Server anlegen und Sender Signature / Domain verifizieren.",
    "DKIM- und Return-Path-Records aus Postmark im DNS eintragen.",
    "Inbound-Stream aktivieren, MX auf inbound.postmarkapp.com richten.",
    "Inbound-Webhook auf /api/public/inbound-email?adapter=postmark setzen, mit Header x-webhook-secret.",
    "Server-API-Token als Anbieter-Schlüssel hinterlegen.",
  ],
  parseInbound(p) {
    const from = (p["FromFull"] as Record<string, unknown>) ?? {};
    const headers = Array.isArray(p["Headers"]) ? (p["Headers"] as Record<string, unknown>[]) : [];
    const header = (name: string) =>
      str(headers.find((h) => String(h["Name"]).toLowerCase() === name.toLowerCase())?.["Value"]);
    const files = Array.isArray(p["Attachments"]) ? (p["Attachments"] as Record<string, unknown>[]) : [];

    return {
      account: str(p["OriginalRecipient"]).toLowerCase(),
      from_address: str(from["Email"] ?? p["From"]).toLowerCase(),
      from_name: str(from["Name"]) || nameOf(p["From"]),
      to: addressList(p["ToFull"] ?? p["To"]),
      cc: addressList(p["CcFull"] ?? p["Cc"]),
      subject: str(p["Subject"]),
      body_text: typeof p["TextBody"] === "string" ? p["TextBody"] : "",
      body_html: typeof p["HtmlBody"] === "string" ? p["HtmlBody"] : "",
      message_id: header("Message-ID") || str(p["MessageID"]),
      in_reply_to: header("In-Reply-To"),
      references: refs(header("References")),
      received_at: isoDate(p["Date"]),
      headers: { provider: "postmark" },
      attachments: files.map((file) => ({
        filename: str(file["Name"]),
        mime_type: str(file["ContentType"]) || "application/octet-stream",
        size_bytes: Number(file["ContentLength"] ?? 0),
        content_base64: typeof file["Content"] === "string" ? file["Content"] : "",
        content_id: str(file["ContentID"]),
        url: "",
      })),
    };
  },
  parseDeliveryEvent(p) {
    const type = str(p["RecordType"]).toLowerCase();
    const kind: DeliveryEvent["kind"] =
      type === "delivery"
        ? "delivered"
        : type === "bounce"
          ? String(p["Type"]).toLowerCase().includes("soft")
            ? "deferred"
            : "bounced"
          : type === "spamcomplaint"
            ? "complained"
            : type === "open"
              ? "opened"
              : "unknown";
    if (kind === "unknown") return null;
    return {
      kind,
      providerMessageId: str(p["MessageID"]),
      recipient: str(p["Recipient"] ?? p["Email"]).toLowerCase(),
      reason: str(p["Details"] ?? p["Description"]),
      occurredAt: isoDate(p["DeliveredAt"] ?? p["BouncedAt"] ?? p["ReceivedAt"]),
    };
  },
  async send(message, config) {
    if (!config.apiKey) return { sent: false, reason: "kein API-Schlüssel hinterlegt", providerMessageId: "" };
    try {
      const response = await fetch("https://api.postmarkapp.com/email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-Postmark-Server-Token": config.apiKey,
        },
        body: JSON.stringify({
          From: formatFrom(message),
          To: message.to.join(", "),
          ...(message.cc.length > 0 ? { Cc: message.cc.join(", ") } : {}),
          ...(message.replyTo ? { ReplyTo: message.replyTo } : {}),
          Subject: message.subject,
          TextBody: message.text,
          ...(message.html ? { HtmlBody: message.html } : {}),
          Headers: mailHeaders(message),
          MessageStream: "outbound",
        }),
      });
      const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
      if (!response.ok) {
        return { sent: false, reason: `Postmark ${response.status}: ${str(body["Message"])}`, providerMessageId: "" };
      }
      return { sent: true, reason: "", providerMessageId: str(body["MessageID"]) };
    } catch (error) {
      return {
        sent: false,
        reason: `Anbieter nicht erreichbar: ${error instanceof Error ? error.message : String(error)}`,
        providerMessageId: "",
      };
    }
  },
};

/* ------------------------------- Mailgun ------------------------------ */

const mailgunAdapter: EmailAdapter = {
  id: "mailgun",
  label: "Mailgun",
  canSend: true,
  dkimSelector: "mailo",
  setupSteps: [
    "Domain in Mailgun anlegen und verifizieren (SPF, DKIM).",
    "MX auf mxa/mxb.mailgun.org richten.",
    "Receiving-Route „store and notify“ auf /api/public/inbound-email?adapter=mailgun setzen.",
    "Webhooks für delivered/bounced/complained auf /api/public/email-events setzen.",
    "Private API-Key als Anbieter-Schlüssel hinterlegen.",
  ],
  parseInbound(p) {
    const headers = (p["message-headers"] as unknown[]) ?? [];
    const header = (name: string) => {
      const hit = headers.find((h) => Array.isArray(h) && String(h[0]).toLowerCase() === name.toLowerCase());
      return Array.isArray(hit) ? str(hit[1]) : "";
    };
    const files = Array.isArray(p["attachments"]) ? (p["attachments"] as Record<string, unknown>[]) : [];

    return {
      account: str(p["recipient"]).toLowerCase(),
      from_address: str(p["sender"]).toLowerCase(),
      from_name: nameOf(p["from"]),
      to: addressList(p["To"] ?? p["recipient"]),
      cc: addressList(p["Cc"]),
      subject: str(p["subject"] ?? p["Subject"]),
      body_text: typeof p["body-plain"] === "string" ? p["body-plain"] : "",
      body_html: typeof p["body-html"] === "string" ? p["body-html"] : "",
      message_id: header("Message-Id") || str(p["Message-Id"]),
      in_reply_to: header("In-Reply-To"),
      references: refs(header("References")),
      received_at: isoDate(p["Date"] ?? header("Date")),
      headers: { provider: "mailgun" },
      attachments: files.map((file) => ({
        filename: str(file["name"]),
        mime_type: str(file["content-type"]) || "application/octet-stream",
        size_bytes: Number(file["size"] ?? 0),
        content_base64: "",
        content_id: "",
        url: str(file["url"]),
      })),
    };
  },
  parseDeliveryEvent(p) {
    const data = ((p["event-data"] as Record<string, unknown>) ?? p) as Record<string, unknown>;
    const event = str(data["event"]).toLowerCase();
    const severity = str(data["severity"]).toLowerCase();
    const kind: DeliveryEvent["kind"] =
      event === "delivered"
        ? "delivered"
        : event === "failed"
          ? severity === "temporary"
            ? "deferred"
            : "bounced"
          : event === "complained"
            ? "complained"
            : event === "opened"
              ? "opened"
              : "unknown";
    if (kind === "unknown") return null;
    const message = (data["message"] as Record<string, unknown>) ?? {};
    const headers = (message["headers"] as Record<string, unknown>) ?? {};
    const recipientRaw = data["recipient"];
    return {
      kind,
      providerMessageId: str(headers["message-id"]),
      recipient: str(recipientRaw).toLowerCase(),
      reason: str((data["delivery-status"] as Record<string, unknown>)?.["message"] ?? data["reason"]),
      occurredAt: isoDate(data["timestamp"]),
    };
  },
  async send(message, config) {
    if (!config.apiKey) return { sent: false, reason: "kein API-Schlüssel hinterlegt", providerMessageId: "" };
    if (!config.domain) return { sent: false, reason: "keine Absenderdomain konfiguriert", providerMessageId: "" };
    const form = new URLSearchParams();
    form.set("from", formatFrom(message));
    for (const address of message.to) form.append("to", address);
    for (const address of message.cc) form.append("cc", address);
    if (message.replyTo) form.set("h:Reply-To", message.replyTo);
    form.set("subject", message.subject);
    form.set("text", message.text);
    if (message.html) form.set("html", message.html);
    for (const [name, value] of Object.entries(mailHeaders(message))) form.set(`h:${name}`, value);

    try {
      const response = await fetch(`https://api.mailgun.net/v3/${config.domain}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${btoa(`api:${config.apiKey}`)}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: form,
      });
      const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
      if (!response.ok) {
        return { sent: false, reason: `Mailgun ${response.status}: ${str(body["message"])}`, providerMessageId: "" };
      }
      return { sent: true, reason: "", providerMessageId: str(body["id"]) };
    } catch (error) {
      return {
        sent: false,
        reason: `Anbieter nicht erreichbar: ${error instanceof Error ? error.message : String(error)}`,
        providerMessageId: "",
      };
    }
  },
};

function mailHeaders(message: OutboundMessage): Record<string, string> {
  const headers: Record<string, string> = {};
  if (message.inReplyTo) headers["In-Reply-To"] = message.inReplyTo;
  if (message.references.length > 0) headers["References"] = message.references.join(" ");
  return headers;
}

const REGISTRY: Record<AdapterId, EmailAdapter> = {
  none: noneAdapter,
  postmark: postmarkAdapter,
  mailgun: mailgunAdapter,
};

/** The only way business logic reaches a provider. */
export function resolveAdapter(id: string): EmailAdapter {
  return REGISTRY[(id in REGISTRY ? id : "none") as AdapterId];
}

export function listAdapters(): EmailAdapter[] {
  return Object.values(REGISTRY);
}

export { splitAddresses };
export type { AdapterConfig, DeliveryEvent, EmailAdapter, NormalizedInbound, OutboundMessage };
