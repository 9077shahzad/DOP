/**
 * Email workspace data access (staff only — every read and write goes through
 * the RLS-protected `email_*` tables with the signed-in staff session).
 *
 * The lead record stays the source of truth. Everything here is communication
 * attached to a record: a thread may be linked to a lead, account, site, unit,
 * job, work order, partner or contract, but an inquiry never lives only here.
 *
 * Linking is deliberately conservative: `email_ingest()` auto-links only on an
 * exact address that resolves to exactly one record and is not a shared
 * mailbox. Everything else lands in "Nicht zugeordnet" for manual linking.
 */
import { supabase } from "@/integrations/supabase/client";
import type { Database, Json } from "@/integrations/supabase/types";

export type Folder = Database["public"]["Enums"]["email_folder"];
export type Direction = Database["public"]["Enums"]["email_direction"];
export type LinkEntity = Database["public"]["Enums"]["email_link_entity"];
export type DeliveryStatus = Database["public"]["Enums"]["email_delivery_status"];

export type ThreadRow = Database["public"]["Tables"]["email_threads"]["Row"];
export type MessageRow = Database["public"]["Tables"]["email_messages"]["Row"];
export type LinkRow = Database["public"]["Tables"]["email_links"]["Row"];
export type TagRow = Database["public"]["Tables"]["email_tags"]["Row"];
export type AttachmentRow = Database["public"]["Tables"]["email_attachments"]["Row"];

export const FOLDERS: Folder[] = ["inbox", "sent", "drafts", "archived", "unassigned"];

export const LINK_ENTITIES: LinkEntity[] = [
  "lead",
  "account",
  "site",
  "unit",
  "job",
  "work_order",
  "partner",
  "contract",
];

export type ThreadFilters = {
  folder: Folder;
  search: string;
  tag: string;
  assignee: string;
  /** "any" | "linked" | "unlinked" */
  linkState: string;
  /** "any" | "unread" | "read" */
  readState: string;
};

export const EMPTY_FILTERS: ThreadFilters = {
  folder: "inbox",
  search: "",
  tag: "",
  assignee: "",
  linkState: "any",
  readState: "any",
};

export type ThreadView = ThreadRow & { links: LinkRow[]; tags: TagRow[] };

/**
 * Threads for a folder, then narrowed in memory: the search has to cover
 * subject, participants *and* message bodies, which is one join too many for
 * a single PostgREST filter and stays fast at inbox volumes.
 */
export async function listThreads(filters: ThreadFilters): Promise<ThreadView[]> {
  const { data: threads, error } = await supabase
    .from("email_threads")
    .select("*")
    .eq("folder", filters.folder)
    .order("last_message_at", { ascending: false })
    .limit(300);
  if (error) throw new Error(error.message);

  const ids = (threads ?? []).map((t) => t.id);
  if (ids.length === 0) return [];

  const [{ data: links }, { data: tags }] = await Promise.all([
    supabase.from("email_links").select("*").in("thread_id", ids),
    supabase.from("email_tags").select("*").in("thread_id", ids),
  ]);

  let bodyMatches: Set<string> | null = null;
  const term = filters.search.trim();
  if (term) {
    const { data: hits } = await supabase
      .from("email_messages")
      .select("thread_id")
      .in("thread_id", ids)
      .ilike("body_text", `%${term}%`);
    bodyMatches = new Set((hits ?? []).map((h) => h.thread_id));
  }

  const linkFor = (id: string) => (links ?? []).filter((l) => l.thread_id === id);
  const tagFor = (id: string) => (tags ?? []).filter((t) => t.thread_id === id);
  const needle = term.toLowerCase();

  return (threads ?? [])
    .map((thread) => ({ ...thread, links: linkFor(thread.id), tags: tagFor(thread.id) }))
    .filter((thread) => {
      if (term) {
        const inSubject = thread.subject.toLowerCase().includes(needle);
        const inPeople = thread.participants.some((p) => p.toLowerCase().includes(needle));
        const inSnippet = thread.snippet.toLowerCase().includes(needle);
        if (!inSubject && !inPeople && !inSnippet && !bodyMatches?.has(thread.id)) return false;
      }
      if (filters.tag && !thread.tags.some((t) => t.tag === filters.tag)) return false;
      if (filters.assignee && thread.assigned_to !== filters.assignee) return false;
      if (filters.linkState === "linked" && thread.links.length === 0) return false;
      if (filters.linkState === "unlinked" && thread.links.length > 0) return false;
      if (filters.readState === "unread" && thread.unread_count === 0) return false;
      if (filters.readState === "read" && thread.unread_count > 0) return false;
      return true;
    });
}

export type ThreadDetail = {
  thread: ThreadRow;
  messages: MessageRow[];
  links: LinkRow[];
  tags: TagRow[];
  attachments: AttachmentRow[];
};

export async function loadThread(threadId: string): Promise<ThreadDetail | null> {
  const { data: thread } = await supabase.from("email_threads").select("*").eq("id", threadId).maybeSingle();
  if (!thread) return null;

  const [{ data: messages }, { data: links }, { data: tags }] = await Promise.all([
    supabase.from("email_messages").select("*").eq("thread_id", threadId).order("received_at"),
    supabase.from("email_links").select("*").eq("thread_id", threadId),
    supabase.from("email_tags").select("*").eq("thread_id", threadId),
  ]);

  const messageIds = (messages ?? []).map((m) => m.id);
  const { data: attachments } = messageIds.length
    ? await supabase.from("email_attachments").select("*").in("message_id", messageIds)
    : { data: [] as AttachmentRow[] };

  return {
    thread,
    messages: messages ?? [],
    links: links ?? [],
    tags: tags ?? [],
    attachments: attachments ?? [],
  };
}

export async function markThreadRead(threadId: string): Promise<void> {
  const stamp = new Date().toISOString();
  await supabase.from("email_messages").update({ read_at: stamp }).eq("thread_id", threadId).is("read_at", null);
  await supabase.from("email_threads").update({ unread_count: 0 }).eq("id", threadId);
}

export async function setThreadFolder(threadId: string, folder: Folder): Promise<void> {
  const { error } = await supabase.from("email_threads").update({ folder }).eq("id", threadId);
  if (error) throw new Error(error.message);
}

export async function assignThread(threadId: string, assignee: string | null, note = ""): Promise<void> {
  const { data: session } = await supabase.auth.getUser();
  const { error } = await supabase.from("email_threads").update({ assigned_to: assignee }).eq("id", threadId);
  if (error) throw new Error(error.message);
  await supabase.from("email_assignments").insert({
    thread_id: threadId,
    assigned_to: assignee,
    assigned_by: session.user?.id ?? null,
    note,
  });
}

export async function addTag(threadId: string, tag: string): Promise<void> {
  const value = tag.trim().toLowerCase();
  if (!value) return;
  const { data: session } = await supabase.auth.getUser();
  await supabase.from("email_tags").insert({ thread_id: threadId, tag: value, created_by: session.user?.id ?? null });
}

export async function removeTag(tagId: string): Promise<void> {
  await supabase.from("email_tags").delete().eq("id", tagId);
}

/** Manual link. `confidence` is always `manual` — a human made the decision. */
export async function linkThread(
  threadId: string,
  entityType: LinkEntity,
  entityId: string,
  matchedOn = "manual",
): Promise<void> {
  const { data: session } = await supabase.auth.getUser();
  const { error } = await supabase.from("email_links").insert({
    thread_id: threadId,
    entity_type: entityType,
    entity_id: entityId,
    confidence: "manual",
    matched_on: matchedOn,
    linked_by: session.user?.id ?? null,
  });
  if (error) throw new Error(error.message);
  // A linked thread belongs in the inbox, not in "Nicht zugeordnet".
  await supabase.from("email_threads").update({ folder: "inbox" }).eq("id", threadId).eq("folder", "unassigned");
}

export async function unlinkThread(linkId: string): Promise<void> {
  await supabase.from("email_links").delete().eq("id", linkId);
}

export async function unreadThreadCount(): Promise<number> {
  const { count } = await supabase
    .from("email_threads")
    .select("id", { count: "exact", head: true })
    .gt("unread_count", 0)
    .in("folder", ["inbox", "unassigned"]);
  return count ?? 0;
}

export async function folderCounts(): Promise<Record<Folder, number>> {
  const entries = await Promise.all(
    FOLDERS.map(async (folder) => {
      const { count } = await supabase
        .from("email_threads")
        .select("id", { count: "exact", head: true })
        .eq("folder", folder);
      return [folder, count ?? 0] as const;
    }),
  );
  return Object.fromEntries(entries) as Record<Folder, number>;
}

export async function listTags(): Promise<string[]> {
  const { data } = await supabase.from("email_tags").select("tag").limit(500);
  return [...new Set((data ?? []).map((row) => row.tag))].sort();
}

/* ------------------------------------------------------------------ */
/* Link targets                                                        */
/* ------------------------------------------------------------------ */

export type LinkTarget = { entityType: LinkEntity; entityId: string; label: string; hint: string };

/** Search leads, accounts and partners for a manual link. */
export async function searchLinkTargets(term: string): Promise<LinkTarget[]> {
  // Strip filter-syntax characters so the term can never add or alter predicates.
  const value = term.trim().replace(/[,()."'\\*%:]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
  if (value.length < 2) return [];
  const like = `%${value}%`;

  const [leads, accounts, partners] = await Promise.all([
    supabase
      .from("leads")
      .select("id, reference, customer_name, customer_email, status")
      .or(`reference.ilike.${like},customer_name.ilike.${like},customer_email.ilike.${like}`)
      .limit(10),
    supabase
      .from("accounts")
      .select("id, legal_name, trading_name, billing_email")
      .or(`legal_name.ilike.${like},trading_name.ilike.${like},billing_email.ilike.${like}`)
      .limit(10),
    supabase
      .from("partners")
      .select("id, reference, legal_name, trading_name")
      .or(`reference.ilike.${like},legal_name.ilike.${like},trading_name.ilike.${like}`)
      .limit(10),
  ]);

  const out: LinkTarget[] = [];
  for (const lead of leads.data ?? []) {
    out.push({
      entityType: "lead",
      entityId: lead.id,
      label: `${lead.reference} — ${lead.customer_name || lead.customer_email || ""}`.trim(),
      hint: String(lead.status),
    });
  }
  for (const account of accounts.data ?? []) {
    out.push({
      entityType: "account",
      entityId: account.id,
      label: account.trading_name || account.legal_name,
      hint: account.billing_email ?? "",
    });
  }
  for (const partner of partners.data ?? []) {
    out.push({
      entityType: "partner",
      entityId: partner.id,
      label: `${partner.reference} — ${partner.trading_name || partner.legal_name}`,
      hint: String(partner.legal_name ?? ""),
    });
  }
  return out;
}

/** Human labels for the links already on a thread. */
export async function describeLinks(links: LinkRow[]): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  const byType = (type: LinkEntity) => links.filter((l) => l.entity_type === type).map((l) => l.entity_id);

  const leadIds = byType("lead");
  if (leadIds.length) {
    const { data } = await supabase.from("leads").select("id, reference, customer_name").in("id", leadIds);
    for (const row of data ?? []) out[row.id] = `${row.reference} — ${row.customer_name ?? ""}`.trim();
  }
  const accountIds = byType("account");
  if (accountIds.length) {
    const { data } = await supabase.from("accounts").select("id, legal_name, trading_name").in("id", accountIds);
    for (const row of data ?? []) out[row.id] = row.trading_name || row.legal_name;
  }
  const partnerIds = byType("partner");
  if (partnerIds.length) {
    const { data } = await supabase.from("partners").select("id, reference, legal_name, trading_name").in("id", partnerIds);
    for (const row of data ?? []) out[row.id] = `${row.reference} — ${row.trading_name || row.legal_name}`;
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Ingest: .eml import and manual forward                              */
/* ------------------------------------------------------------------ */

export type NormalizedEmail = {
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
  headers: Record<string, string>;
};

export type IngestResult = {
  message_id: string;
  thread_id: string;
  duplicate: boolean;
  folder?: Folder;
  auto_linked?: boolean;
  match_count?: number;
};

export async function ingestEmail(
  email: NormalizedEmail,
  source: Database["public"]["Enums"]["email_ingest_source"],
): Promise<IngestResult> {
  const { data, error } = await supabase.rpc("email_ingest", {
    payload: { ...email, direction: "inbound", source } as unknown as Json,
  });
  if (error) throw new Error(error.message);
  return data as unknown as IngestResult;
}

function decodeHeaderWord(value: string): string {
  // RFC 2047 encoded-words, the two encodings real mail actually uses.
  return value.replace(/=\?([^?]+)\?([bBqQ])\?([^?]*)\?=/g, (_m, _charset, enc, text: string) => {
    try {
      if (String(enc).toLowerCase() === "b") return decodeURIComponent(escape(atob(text)));
      return text.replace(/_/g, " ").replace(/=([0-9A-Fa-f]{2})/g, (_x, hex: string) =>
        String.fromCharCode(parseInt(hex, 16)),
      );
    } catch {
      return text;
    }
  });
}

function decodeBody(body: string, encoding: string, charset: string): string {
  const enc = encoding.toLowerCase();
  try {
    if (enc === "base64") {
      const binary = atob(body.replace(/\s+/g, ""));
      if (charset.toLowerCase().includes("utf-8")) return decodeURIComponent(escape(binary));
      return binary;
    }
    if (enc === "quoted-printable") {
      const joined = body.replace(/=\r?\n/g, "");
      const bytes = joined.replace(/=([0-9A-Fa-f]{2})/g, (_m, hex: string) =>
        String.fromCharCode(parseInt(hex, 16)),
      );
      return charset.toLowerCase().includes("utf-8") ? decodeURIComponent(escape(bytes)) : bytes;
    }
  } catch {
    return body;
  }
  return body;
}

function addressesOf(value: string): string[] {
  return value
    .split(",")
    .map((part) => {
      const match = part.match(/<([^>]+)>/);
      return (match?.[1] ?? part).trim().toLowerCase();
    })
    .filter((a) => a.includes("@"));
}

function displayNameOf(value: string): string {
  const match = value.match(/^\s*"?([^"<]*)"?\s*</);
  return match ? decodeHeaderWord(match[1] ?? "").trim() : "";
}

/**
 * Minimal but honest `.eml` parser: unfolds headers, decodes RFC 2047 subjects
 * and transfer encodings, and picks the text/plain and text/html parts out of
 * a multipart body. Attachments are not extracted here — an imported message
 * carries its text; files are uploaded separately.
 */
export function parseEml(raw: string): NormalizedEmail {
  const normalized = raw.replace(/\r\n/g, "\n");
  const split = normalized.indexOf("\n\n");
  const headerBlock = split === -1 ? normalized : normalized.slice(0, split);
  const bodyBlock = split === -1 ? "" : normalized.slice(split + 2);

  const headers: Record<string, string> = {};
  for (const line of headerBlock.split("\n").reduce<string[]>((acc, line) => {
    if (/^[ \t]/.test(line) && acc.length > 0) acc[acc.length - 1] = `${acc[acc.length - 1] ?? ""} ${line.trim()}`;
    else acc.push(line);
    return acc;
  }, [])) {
    const index = line.indexOf(":");
    if (index === -1) continue;
    headers[line.slice(0, index).trim().toLowerCase()] = line.slice(index + 1).trim();
  }

  const contentType = headers["content-type"] ?? "text/plain";
  const charset = /charset="?([^";]+)"?/i.exec(contentType)?.[1] ?? "utf-8";
  const boundary = /boundary="?([^";]+)"?/i.exec(contentType)?.[1] ?? "";

  let text = "";
  let html = "";
  if (boundary) {
    for (const part of bodyBlock.split(`--${boundary}`)) {
      const partSplit = part.indexOf("\n\n");
      if (partSplit === -1) continue;
      const partHeaders = part.slice(0, partSplit).toLowerCase();
      const partBody = part.slice(partSplit + 2).replace(/\n--$/, "");
      const encoding = /content-transfer-encoding:\s*([^\s;]+)/.exec(partHeaders)?.[1] ?? "7bit";
      const partCharset = /charset="?([^";\s]+)"?/.exec(partHeaders)?.[1] ?? charset;
      const decoded = decodeBody(partBody, encoding, partCharset).trim();
      if (partHeaders.includes("text/html") && !html) html = decoded;
      else if (partHeaders.includes("text/plain") && !text) text = decoded;
    }
  } else {
    const decoded = decodeBody(bodyBlock, headers["content-transfer-encoding"] ?? "7bit", charset).trim();
    if (contentType.toLowerCase().includes("text/html")) html = decoded;
    else text = decoded;
  }

  if (!text && html) text = htmlToText(html);

  const dateHeader = headers["date"] ?? "";
  const parsedDate = dateHeader ? new Date(dateHeader) : new Date();

  return {
    from_address: addressesOf(headers["from"] ?? "")[0] ?? "",
    from_name: displayNameOf(headers["from"] ?? ""),
    to: addressesOf(headers["to"] ?? ""),
    cc: addressesOf(headers["cc"] ?? ""),
    subject: decodeHeaderWord(headers["subject"] ?? ""),
    body_text: text,
    body_html: html,
    message_id: (headers["message-id"] ?? "").trim(),
    in_reply_to: (headers["in-reply-to"] ?? "").trim(),
    references: (headers["references"] ?? "").split(/\s+/).filter(Boolean),
    received_at: Number.isNaN(parsedDate.getTime()) ? new Date().toISOString() : parsedDate.toISOString(),
    headers,
  };
}

/** Strips tags for the plain-text fallback — the HTML itself is never rendered raw. */
export function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Manual forward: a staff member pastes what they received. */
export function manualForward(input: {
  from_address: string;
  from_name: string;
  to: string;
  subject: string;
  body: string;
  received_at?: string;
}): NormalizedEmail {
  return {
    from_address: input.from_address.trim().toLowerCase(),
    from_name: input.from_name.trim(),
    to: addressesOf(input.to),
    cc: [],
    subject: input.subject.trim(),
    body_text: input.body,
    body_html: "",
    message_id: "",
    in_reply_to: "",
    references: [],
    received_at: input.received_at || new Date().toISOString(),
    headers: { "x-import": "manual_forward" },
  };
}

/* ------------------------------------------------------------------ */
/* Reading a message                                                    */
/* ------------------------------------------------------------------ */

/** Splits the new text from the quoted history so quoting can be collapsed. */
export function splitQuoted(body: string): { visible: string; quoted: string } {
  const lines = body.split("\n");
  const markers = [
    /^>\s?/,
    /^-{2,}\s*(Original|Weitergeleitete|Forwarded|Ursprüngliche)/i,
    /^Am .+ schrieb .+:$/i,
    /^On .+ wrote:$/i,
    /^Le .+ a écrit\s*:$/i,
    /^Il .+ ha scritto:$/i,
    /^Von:\s/i,
    /^From:\s/i,
  ];
  const index = lines.findIndex((line) => markers.some((re) => re.test(line.trim())));
  if (index <= 0) return { visible: body.trim(), quoted: "" };
  return { visible: lines.slice(0, index).join("\n").trim(), quoted: lines.slice(index).join("\n").trim() };
}

export function replyRecipients(message: MessageRow, all: boolean, ownAddresses: string[]): { to: string[]; cc: string[] } {
  const mine = new Set(ownAddresses.map((a) => a.toLowerCase()));
  if (message.direction === "outbound") {
    return { to: message.to_addresses, cc: all ? message.cc_addresses.filter((a) => !mine.has(a)) : [] };
  }
  const to = [message.from_address];
  const cc = all
    ? [...message.to_addresses, ...message.cc_addresses].filter((a) => !mine.has(a) && a !== message.from_address)
    : [];
  return { to, cc: [...new Set(cc)] };
}

export function quoteForReply(message: MessageRow): string {
  const header = `\n\nAm ${new Date(message.received_at).toLocaleString("de-CH")} schrieb ${message.from_address}:`;
  return `${header}\n${message.body_text
    .split("\n")
    .map((line) => `> ${line}`)
    .join("\n")}`;
}

export function forwardBody(message: MessageRow): string {
  return [
    "\n\n---------- Weitergeleitete Nachricht ----------",
    `Von: ${message.from_name ? `${message.from_name} <${message.from_address}>` : message.from_address}`,
    `Datum: ${new Date(message.received_at).toLocaleString("de-CH")}`,
    `Betreff: ${message.subject}`,
    `An: ${message.to_addresses.join(", ")}`,
    "",
    message.body_text,
  ].join("\n");
}

/** Signed URL for an attachment in the private bucket. */
export async function attachmentUrl(path: string): Promise<string> {
  const { data } = await supabase.storage.from("email-attachments").createSignedUrl(path, 300);
  return data?.signedUrl ?? "";
}

/* ------------------------------------------------------------------ */
/* Conversion: message -> record                                        */
/* ------------------------------------------------------------------ */

/** What a message can be turned into. Each one creates a real record. */
export const CONVERSIONS = ["inquiry", "quote_request", "support", "partner_issue", "work_order_followup"] as const;
export type Conversion = (typeof CONVERSIONS)[number];

const CONVERSION_FLAG: Record<Conversion, string> = {
  inquiry: "",
  quote_request: "quote_required",
  support: "support",
  partner_issue: "partner_issue",
  work_order_followup: "existing_booking",
};

/**
 * Creates a lead from an email and links the thread to it. The message body
 * and the sender's details are carried across, so the new record reads on its
 * own — the thread stays attached as the communication history.
 */
export async function convertToLead(input: {
  threadId: string;
  message: MessageRow;
  conversion: Conversion;
  customerName: string;
  phone: string;
  language: string;
}): Promise<string> {
  const flag = CONVERSION_FLAG[input.conversion];
  const { data, error } = await supabase.rpc("create_lead", {
    payload: {
      source_key: "email",
      ...(flag ? { flag } : {}),
      customer_name: input.customerName || input.message.from_name || input.message.from_address,
      customer_email: input.message.from_address,
      customer_phone: input.phone,
      preferred_contact: "email",
      description: splitQuoted(input.message.body_text).visible.slice(0, 4000),
      language: input.language,
      service_details: {
        channel: "email",
        conversion: input.conversion,
        subject: input.message.subject,
        thread_id: input.threadId,
        message_id: input.message.id,
      },
    } as unknown as Json,
  });
  if (error) throw new Error(error.message);

  const reference = String(data);
  const { data: lead } = await supabase.from("leads").select("id").eq("reference", reference).maybeSingle();
  if (lead) await linkThread(input.threadId, "lead", lead.id, "converted_from_email");
  return reference;
}

/** Staff for the assignment dropdown. */
export async function listStaffProfiles(): Promise<{ id: string; label: string }[]> {
  const { data } = await supabase.from("profiles").select("id, full_name").order("full_name");
  return (data ?? []).map((row) => ({ id: row.id, label: row.full_name || row.id.slice(0, 8) }));
}

/** Addresses this workspace owns — used to compute reply-all recipients. */
export async function ownAddresses(): Promise<string[]> {
  const { data } = await supabase.from("email_accounts").select("address").eq("active", true);
  return (data ?? []).map((row) => row.address);
}
