/**
 * Lead & Dispatch — stage 2 data access for the inbox.
 *
 * Every read and write goes through the stage-1 RLS policies. Status changes
 * and assignments always go through the SECURITY DEFINER functions so the
 * append-only activity row is written in the same transaction; merging goes
 * through merge_leads() for the same reason. Never UPDATE leads.status.
 */

import { supabase } from "@/integrations/supabase/client";
import { statusTone, toneChip } from "@/lib/status-tone";
import type { Tables } from "@/integrations/supabase/types";

export type LeadRow = Tables<"leads">;
export type LeadActivityRow = Tables<"lead_activities">;
export type LeadNoteRow = Tables<"lead_notes">;
export type LeadAttachmentRow = Tables<"lead_attachments">;
export type LeadFollowupRow = Tables<"lead_followups">;
export type LeadSourceRow = Tables<"lead_sources">;
export type LossReasonRow = Tables<"lead_loss_reasons">;
export type CategoryRow = Tables<"partner_categories">;
export type TeamRow = Tables<"internal_teams">;
export type ProfileRow = Tables<"profiles">;

export type LeadStatus = LeadRow["status"];
export type LeadPriority = LeadRow["priority"];
export type LeadTemperature = LeadRow["temperature"];
export type LeadCustomerType = LeadRow["customer_type"];

/** Pipeline order; the two closed states are collapsed at the end. */
/** Existing stages keep their order and meaning; the new ones slot in around them. */
export const PIPELINE_STATUSES = [
  "new",
  "qualified",
  "site_visit_required",
  "quote_required",
  "quote_sent",
  "awaiting_customer",
  "negotiation",
  "ready_for_allocation",
  "sent_to_partners",
  "assigned_internal",
  "won",
  "scheduled",
  "in_progress",
  "completed",
] as const satisfies readonly LeadStatus[];

export const CLOSED_STATUSES = [
  "lost",
  "unqualified",
  "spam_review",
  "cancelled",
] as const satisfies readonly LeadStatus[];

export const ALL_STATUSES = [...PIPELINE_STATUSES, ...CLOSED_STATUSES] as readonly LeadStatus[];

export const PRIORITIES = ["critical", "high", "normal", "low"] as const satisfies readonly LeadPriority[];
export const TEMPERATURES = ["hot", "warm", "cold"] as const satisfies readonly LeadTemperature[];
export const CUSTOMER_TYPES = ["private", "b2b"] as const satisfies readonly LeadCustomerType[];

/** Chip classes come from the single product-wide status→tone map. */
export const PRIORITY_TONE: Record<LeadPriority, string> = Object.fromEntries(
  PRIORITIES.map((p) => [p, toneChip(statusTone(p))]),
) as Record<LeadPriority, string>;

export const TEMPERATURE_TONE: Record<LeadTemperature, string> = Object.fromEntries(
  TEMPERATURES.map((v) => [v, toneChip(statusTone(v))]),
) as Record<LeadTemperature, string>;

/** Advisory lock: expires after 15 minutes of inactivity. */
export const LOCK_TTL_MINUTES = 15;

export function lockIsActive(row: Pick<LeadRow, "locked_by" | "locked_at">): boolean {
  if (!row.locked_by || !row.locked_at) return false;
  return Date.now() - new Date(row.locked_at).getTime() < LOCK_TTL_MINUTES * 60_000;
}

export function ageInDays(iso: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000));
}

export function isOverdue(row: Pick<LeadRow, "next_action_at">): boolean {
  return Boolean(row.next_action_at && new Date(row.next_action_at).getTime() < Date.now());
}

/* -------------------------------------------------------------------- query */

export type LeadFilters = {
  status: LeadStatus | "all";
  canton: string;
  city: string;
  categoryId: string;
  sourceId: string;
  priority: LeadPriority | "all";
  temperature: LeadTemperature | "all";
  customerType: LeadCustomerType | "all";
  partnerId: string;
  teamId: string;
  ownerId: string;
  queueId: string;
  from: string;
  to: string;
  q: string;
};

export const EMPTY_FILTERS: LeadFilters = {
  status: "all",
  canton: "",
  city: "",
  categoryId: "",
  sourceId: "",
  priority: "all",
  temperature: "all",
  customerType: "all",
  partnerId: "",
  teamId: "",
  ownerId: "",
  queueId: "",
  from: "",
  to: "",
  q: "",
};

export type LeadListItem = LeadRow & {
  partner: { legal_name: string; trading_name: string } | null;
  team: { name: string } | null;
  source: { key: string } | null;
  queue: { key: string; label_de: string } | null;
};

/**
 * Explicit column list: cost and margin columns are not granted to signed-in
 * roles at all — they are read through lead_economics(), which checks the role.
 */
export const LEAD_COLUMNS =
  "id, reference, source_id, campaign, customer_name, customer_phone, customer_email, preferred_contact, country, canton, city, postcode, service_address, category_id, service_details, preferred_date, preferred_time, urgency, description, property_type, customer_type, status, temperature, priority, estimated_value, lead_owner_id, fulfilment_type, assigned_partner_id, assigned_team_id, locked_by, locked_at, last_activity_at, next_action_at, lost_reason_id, language, created_at, updated_at, expected_sell, min_margin_pct, economics_flags, queue_id, utm_source, utm_medium, utm_campaign, utm_term, utm_content, gclid, referrer, landing_page, first_review_at, first_contact_at, quoted_at, awaiting_since";

const LIST_SELECT = `${LEAD_COLUMNS}, partner:partners!leads_assigned_partner_id_fkey(legal_name, trading_name), team:internal_teams!leads_assigned_team_id_fkey(name), source:lead_sources!leads_source_id_fkey(key), queue:lead_queues!leads_queue_id_fkey(key, label_de)`;

function applyFilters<T>(query: T, filters: LeadFilters, withStatus: boolean): T {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q = query as any;
  if (withStatus && filters.status !== "all") q = q.eq("status", filters.status);
  if (filters.canton.trim()) q = q.eq("canton", filters.canton.trim().toUpperCase());
  if (filters.city.trim()) q = q.ilike("city", `%${filters.city.trim()}%`);
  if (filters.categoryId) q = q.eq("category_id", filters.categoryId);
  if (filters.sourceId) q = q.eq("source_id", filters.sourceId);
  if (filters.priority !== "all") q = q.eq("priority", filters.priority);
  if (filters.temperature !== "all") q = q.eq("temperature", filters.temperature);
  if (filters.customerType !== "all") q = q.eq("customer_type", filters.customerType);
  if (filters.partnerId) q = q.eq("assigned_partner_id", filters.partnerId);
  if (filters.teamId) q = q.eq("assigned_team_id", filters.teamId);
  if (filters.ownerId) q = q.eq("lead_owner_id", filters.ownerId);
  if (filters.queueId) q = q.eq("queue_id", filters.queueId);
  if (filters.from) q = q.gte("created_at", `${filters.from}T00:00:00Z`);
  if (filters.to) q = q.lte("created_at", `${filters.to}T23:59:59Z`);
  const term = filters.q.trim();
  if (term) {
    const safe = term.replace(/[%,()]/g, " ");
    q = q.or(
      [
        `reference.ilike.%${safe}%`,
        `customer_name.ilike.%${safe}%`,
        `customer_phone.ilike.%${safe}%`,
        `customer_email.ilike.%${safe}%`,
        `service_address.ilike.%${safe}%`,
      ].join(","),
    );
  }
  return q as T;
}

export async function fetchLeads(filters: LeadFilters): Promise<LeadListItem[]> {
  const base = supabase.from("leads").select(LIST_SELECT).order("created_at", { ascending: false }).limit(500);
  const { data, error } = await applyFilters(base, filters, true);
  if (error) throw error;
  return (data ?? []) as unknown as LeadListItem[];
}

/** Counts per status, computed in the database over the same filter set. */
export async function fetchStatusCounts(filters: LeadFilters): Promise<Record<string, number>> {
  const base = supabase.from("leads").select("status").limit(5000);
  const { data, error } = await applyFilters(base, filters, false);
  if (error) throw error;
  const counts: Record<string, number> = {};
  for (const row of (data ?? []) as unknown as Array<{ status: string }>) {
    counts[row.status] = (counts[row.status] ?? 0) + 1;
  }
  return counts;
}

export type LeadOptions = {
  sources: LeadSourceRow[];
  categories: CategoryRow[];
  teams: TeamRow[];
  partners: Array<{ id: string; legal_name: string }>;
  staff: ProfileRow[];
  lossReasons: LossReasonRow[];
  queues: Array<Tables<"lead_queues">>;
};

export async function fetchLeadOptions(): Promise<LeadOptions> {
  const [sources, categories, teams, partners, staff, lossReasons, queues] = await Promise.all([
    supabase.from("lead_sources").select("*").eq("active", true).order("sort_order"),
    supabase.from("partner_categories").select("*").order("sort_order"),
    supabase.from("internal_teams").select("*").order("name"),
    supabase.from("partners").select("id, legal_name").eq("status", "approved").order("legal_name"),
    supabase.from("profiles").select("*").order("full_name"),
    supabase.from("lead_loss_reasons").select("*").eq("active", true).order("sort_order"),
    supabase.from("lead_queues").select("*").eq("active", true).order("sort_order"),
  ]);
  const failed = [sources, categories, teams, partners, staff, lossReasons, queues].find((r) => r.error);
  if (failed?.error) throw failed.error;
  return {
    sources: sources.data ?? [],
    categories: categories.data ?? [],
    teams: teams.data ?? [],
    partners: partners.data ?? [],
    staff: staff.data ?? [],
    lossReasons: lossReasons.data ?? [],
    queues: queues.data ?? [],
  };
}

/* ------------------------------------------------------------------- detail */

export type LeadDetail = {
  lead: LeadListItem;
  activities: LeadActivityRow[];
  notes: LeadNoteRow[];
  attachments: LeadAttachmentRow[];
  followups: LeadFollowupRow[];
  duplicates: LeadRow[];
  lockHolder: string | null;
};

export async function fetchLeadDetail(leadId: string): Promise<LeadDetail | null> {
  const { data: lead, error } = await supabase.from("leads").select(LIST_SELECT).eq("id", leadId).maybeSingle();
  if (error) throw error;
  if (!lead) return null;
  const row = lead as unknown as LeadListItem;

  const [activities, notes, attachments, followups] = await Promise.all([
    supabase.from("lead_activities").select("*").eq("lead_id", leadId).order("created_at", { ascending: false }),
    supabase.from("lead_notes").select("*").eq("lead_id", leadId).order("created_at", { ascending: false }),
    supabase.from("lead_attachments").select("*").eq("lead_id", leadId).order("created_at", { ascending: false }),
    supabase.from("lead_followups").select("*").eq("lead_id", leadId).order("due_at", { ascending: true }),
  ]);
  const failed = [activities, notes, attachments, followups].find((r) => r.error);
  if (failed?.error) throw failed.error;

  const [duplicates, lockHolder] = await Promise.all([findDuplicates(row), resolveLockHolder(row)]);

  return {
    lead: row,
    activities: activities.data ?? [],
    notes: notes.data ?? [],
    attachments: attachments.data ?? [],
    followups: followups.data ?? [],
    duplicates,
    lockHolder,
  };
}

async function resolveLockHolder(row: LeadRow): Promise<string | null> {
  if (!lockIsActive(row) || !row.locked_by) return null;
  const { data } = await supabase.from("profiles").select("full_name").eq("id", row.locked_by).maybeSingle();
  return data?.full_name ?? row.locked_by;
}

/** Same phone or e-mail, or same address + category, within the last 30 days. */
export async function findDuplicates(lead: LeadRow): Promise<LeadRow[]> {
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const clauses: string[] = [];
  const phone = lead.customer_phone.trim();
  const email = lead.customer_email.trim();
  const address = lead.service_address.trim();
  if (phone) clauses.push(`customer_phone.eq.${phone.replace(/[,()]/g, "")}`);
  if (email) clauses.push(`customer_email.eq.${email.replace(/[,()]/g, "")}`);
  if (address) clauses.push(`service_address.eq.${address.replace(/[,()]/g, " ")}`);
  if (clauses.length === 0) return [];

  const { data, error } = await supabase
    .from("leads")
    .select(LEAD_COLUMNS)
    .neq("id", lead.id)
    .gte("created_at", since)
    .or(clauses.join(","))
    .limit(10);
  if (error) throw error;
  return ((data ?? []) as unknown as LeadRow[]).filter((candidate) => {
    if (phone && candidate.customer_phone.trim() === phone) return true;
    if (email && candidate.customer_email.trim() === email) return true;
    return Boolean(
      address &&
        candidate.service_address.trim() === address &&
        candidate.category_id === lead.category_id,
    );
  });
}

/* ---------------------------------------------------------------- mutations */

export async function setLeadStatus(leadId: string, next: LeadStatus, note: string): Promise<void> {
  const { error } = await supabase.rpc("set_lead_status", {
    _lead_id: leadId,
    _new_status: next,
    _note: note,
  });
  if (error) throw error;
}

export async function assignLead(
  leadId: string,
  fulfilment: NonNullable<LeadRow["fulfilment_type"]>,
  partnerId: string | null,
  teamId: string | null,
  note: string,
): Promise<void> {
  const { error } = await supabase.rpc("assign_lead", {
    _lead_id: leadId,
    _fulfilment: fulfilment,
    _partner_id: partnerId as unknown as string,
    _team_id: teamId as unknown as string,
    _note: note,
  });
  if (error) throw error;
}

export async function mergeLeads(sourceId: string, targetId: string, note: string): Promise<void> {
  const { error } = await supabase.rpc("merge_leads", {
    _source: sourceId,
    _target: targetId,
    _note: note,
  });
  if (error) throw error;
}

/** Ordinary column updates — qualification only, never status or assignment. */
export type Qualification = Partial<
  Pick<LeadRow, "temperature" | "priority" | "estimated_value" | "customer_type" | "category_id" | "lead_owner_id">
>;

export async function saveQualification(leadId: string, patch: Qualification): Promise<void> {
  const { error } = await supabase
    .from("leads")
    .update({ ...patch, last_activity_at: new Date().toISOString() })
    .eq("id", leadId);
  if (error) throw error;
}

export async function markLost(leadId: string, lossReasonId: string, note: string): Promise<void> {
  const { error } = await supabase.from("leads").update({ lost_reason_id: lossReasonId }).eq("id", leadId);
  if (error) throw error;
  await setLeadStatus(leadId, "lost", note);
}

/* ---------------------------------------------------------------- lead lock */

export async function acquireLock(leadId: string): Promise<void> {
  const { data } = await supabase.auth.getUser();
  const uid = data.user?.id;
  if (!uid) return;
  const { error } = await supabase
    .from("leads")
    .update({ locked_by: uid, locked_at: new Date().toISOString() })
    .eq("id", leadId);
  if (error) throw error;
}

export async function releaseLock(leadId: string): Promise<void> {
  const { data } = await supabase.auth.getUser();
  const uid = data.user?.id;
  if (!uid) return;
  // Advisory: only clear our own lock, so we never steal someone else's.
  await supabase.from("leads").update({ locked_by: null, locked_at: null }).eq("id", leadId).eq("locked_by", uid);
}

/* ------------------------------------------------------- notes / next action */

export async function addLeadNote(leadId: string, body: string): Promise<void> {
  const { data } = await supabase.auth.getUser();
  const uid = data.user?.id ?? null;
  const { error } = await supabase.from("lead_notes").insert({ lead_id: leadId, body, actor_id: uid });
  if (error) throw error;
}

export async function setNextAction(
  leadId: string,
  dueAt: string,
  channel: string,
  templateKey: string,
): Promise<void> {
  const { data } = await supabase.auth.getUser();
  const uid = data.user?.id ?? null;
  const iso = new Date(dueAt).toISOString();
  const { error } = await supabase
    .from("leads")
    .update({ next_action_at: iso, last_activity_at: new Date().toISOString() })
    .eq("id", leadId);
  if (error) throw error;
  const { error: followupError } = await supabase.from("lead_followups").insert({
    lead_id: leadId,
    due_at: iso,
    channel,
    template_key: templateKey,
    status: "pending",
    actor_id: uid,
  });
  if (followupError) throw followupError;
}

/* -------------------------------------------------------------- attachments */

export const SIGNED_URL_TTL_SECONDS = 60;
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

export async function uploadAttachment(leadId: string, file: File): Promise<void> {
  if (file.size > MAX_ATTACHMENT_BYTES) throw new Error("file_too_large");
  const { data } = await supabase.auth.getUser();
  const uid = data.user?.id ?? null;
  const safeName = file.name.replace(/[^\w.-]+/g, "_").slice(-80);
  const path = `${leadId}/${Date.now()}-${safeName}`;
  const { error: uploadError } = await supabase.storage.from("lead-attachments").upload(path, file, {
    upsert: false,
    contentType: file.type || "application/octet-stream",
  });
  if (uploadError) throw uploadError;
  const { error } = await supabase.from("lead_attachments").insert({
    lead_id: leadId,
    storage_path: path,
    file_name: file.name,
    mime_type: file.type || "application/octet-stream",
    size_bytes: file.size,
    uploaded_by: uid,
  });
  if (error) throw error;
}

export async function signedAttachmentUrl(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from("lead-attachments")
    .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);
  if (error) throw error;
  if (!data?.signedUrl) throw new Error("no_signed_url");
  return data.signedUrl;
}

/* -------------------------------------------------------- manual lead entry */

export type StaffLeadInput = {
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  canton: string;
  city: string;
  postcode: string;
  service_address: string;
  category_id: string;
  preferred_date: string;
  description: string;
  customer_type: LeadCustomerType;
  language: string;
};

export async function createStaffLead(input: StaffLeadInput): Promise<string> {
  const { data, error } = await supabase.rpc("create_lead", {
    payload: { ...input, source_key: "staff_entry" },
  });
  if (error) throw error;
  return String(data);
}
