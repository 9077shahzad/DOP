/**
 * Internal queue view (MF Team Zürich / Kundendienst and the other queues).
 *
 * One query, RLS-scoped: staff see the leads the inbox already grants them.
 * The SLA clock is derived from the queue the lead was routed to, so the
 * countdown on this screen, the customer tracker and the SLA cron all read the
 * same deadlines instead of three different definitions of "late".
 */
import { supabase } from "@/integrations/supabase/client";
import type { Lang } from "@/i18n/config";
import { rowLabel } from "@/lib/i18n-label";
import type { Tables } from "@/integrations/supabase/types";

export type QueueRow = Tables<"lead_queues">;
export type TeamRow = Tables<"internal_teams">;
export type ProfileRow = Tables<"profiles">;
export type NotificationRow = Tables<"notification_log">;

export type QueueLead = {
  id: string;
  reference: string;
  status: string;
  priority: string;
  urgency: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_type: string;
  city: string;
  canton: string;
  language: string;
  description: string;
  service_details: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  first_review_at: string | null;
  first_contact_at: string | null;
  quoted_at: string | null;
  lead_owner_id: string | null;
  assigned_team_id: string | null;
  queue_id: string | null;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  gclid: string;
  landing_page: string;
  queue: { key: string; label_de: string; label_fr: string; label_it: string; label_en: string;
    sla_first_review_minutes: number; sla_first_contact_minutes: number; sla_quote_minutes: number } | null;
  team: { name: string } | null;
  source: { key: string } | null;
};

const SELECT = `id, reference, status, priority, urgency, customer_name, customer_email, customer_phone,
  customer_type, city, canton, language, description, service_details, created_at, updated_at,
  first_review_at, first_contact_at, quoted_at, lead_owner_id, assigned_team_id, queue_id,
  utm_source, utm_medium, utm_campaign, gclid, landing_page,
  queue:lead_queues!leads_queue_id_fkey(key, label_de, label_fr, label_it, label_en,
    sla_first_review_minutes, sla_first_contact_minutes, sla_quote_minutes),
  team:internal_teams!leads_assigned_team_id_fkey(name),
  source:lead_sources!leads_source_id_fkey(key)`;

export type QueueFilters = {
  queueId: string;
  teamId: string;
  ownerId: string;
  state: "open" | "overdue" | "unowned" | "all";
  from: string;
  to: string;
  q: string;
};

export const EMPTY_QUEUE_FILTERS: QueueFilters = {
  queueId: "",
  teamId: "",
  ownerId: "",
  state: "open",
  from: "",
  to: "",
  q: "",
};

/** Statuses that no longer need queue attention. */
const CLOSED = ["won", "completed", "lost", "unqualified", "cancelled", "spam_review"];

export async function fetchQueueLeads(filters: QueueFilters): Promise<QueueLead[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = supabase
    .from("leads")
    .select(SELECT)
    .order("created_at", { ascending: false })
    .limit(500);

  if (filters.queueId) query = query.eq("queue_id", filters.queueId);
  if (filters.teamId) query = query.eq("assigned_team_id", filters.teamId);
  if (filters.ownerId) query = query.eq("lead_owner_id", filters.ownerId);
  if (filters.state !== "all") query = query.not("status", "in", `(${CLOSED.join(",")})`);
  if (filters.state === "unowned") query = query.is("lead_owner_id", null);
  if (filters.from) query = query.gte("created_at", `${filters.from}T00:00:00Z`);
  if (filters.to) query = query.lte("created_at", `${filters.to}T23:59:59Z`);
  const term = filters.q.trim().replace(/[%,()]/g, " ");
  if (term) {
    query = query.or(
      [
        `reference.ilike.%${term}%`,
        `customer_name.ilike.%${term}%`,
        `customer_email.ilike.%${term}%`,
        `customer_phone.ilike.%${term}%`,
      ].join(","),
    );
  }

  const { data, error } = await query;
  if (error) throw error;
  const rows = (data ?? []) as unknown as QueueLead[];
  return filters.state === "overdue" ? rows.filter((row) => slaState(row).state === "overdue") : rows;
}

export type QueueMeta = { queues: QueueRow[]; teams: TeamRow[]; staff: ProfileRow[] };

export async function fetchQueueMeta(): Promise<QueueMeta> {
  const [queues, teams, staff] = await Promise.all([
    supabase.from("lead_queues").select("*").eq("active", true).order("sort_order"),
    supabase.from("internal_teams").select("*").eq("active", true).order("name"),
    supabase.from("profiles").select("*").order("full_name"),
  ]);
  const failed = [queues, teams, staff].find((r) => r.error);
  if (failed?.error) throw failed.error;
  return { queues: queues.data ?? [], teams: teams.data ?? [], staff: staff.data ?? [] };
}

/* --------------------------------------------------------------- SLA clock */

export type QueueSla = {
  key: "review" | "contact" | "quote" | "none";
  dueAt: string | null;
  minutesLeft: number;
  state: "ok" | "soon" | "overdue" | "met";
};

/** The next open deadline: first review, then first contact, then the quote. */
export function slaState(row: QueueLead, now = Date.now()): QueueSla {
  const q = row.queue;
  if (!q) return { key: "none", dueAt: null, minutesLeft: 0, state: "met" };
  const base = new Date(row.created_at).getTime();
  const stages: Array<{ key: QueueSla["key"]; minutes: number; done: string | null }> = [
    { key: "review", minutes: q.sla_first_review_minutes, done: row.first_review_at },
    { key: "contact", minutes: q.sla_first_contact_minutes, done: row.first_contact_at },
    { key: "quote", minutes: q.sla_quote_minutes, done: row.quoted_at },
  ];
  for (const stage of stages) {
    if (stage.done || !stage.minutes) continue;
    const dueAt = new Date(base + stage.minutes * 60_000);
    const minutesLeft = Math.round((dueAt.getTime() - now) / 60_000);
    return {
      key: stage.key,
      dueAt: dueAt.toISOString(),
      minutesLeft,
      state: minutesLeft < 0 ? "overdue" : minutesLeft <= 30 ? "soon" : "ok",
    };
  }
  return { key: "none", dueAt: null, minutesLeft: 0, state: "met" };
}

export function queueLabelOf(queue: QueueLead["queue"] | QueueRow | null, lang: Lang): string {
  if (!queue) return "—";
  return rowLabel(queue, lang, queue.label_de || "");
}

/* ------------------------------------------------------------ quick actions */

export async function setLeadOwner(leadId: string, ownerId: string | null, note: string): Promise<void> {
  const { error } = await supabase.rpc("set_lead_owner", {
    _lead_id: leadId,
    // the RPC accepts NULL to clear the owner; generated types narrow it to string
    _owner_id: ownerId as unknown as string,
    _note: note,
  });
  if (error) throw new Error(error.message);
}

/** Contact note: an internal note plus the visible activity entry. */
export async function addContactNote(leadId: string, body: string): Promise<void> {
  const trimmed = body.trim();
  if (!trimmed) return;
  const { error } = await supabase.from("lead_notes").insert({ lead_id: leadId, body: trimmed });
  if (error) throw new Error(error.message);
  await supabase.from("lead_activities").insert({
    lead_id: leadId,
    kind: "communication",
    body: trimmed,
    actor_kind: "staff",
  });
}

/* ------------------------------------------------------------ notifications */

export async function fetchNotificationLog(filters: {
  template: string;
  from: string;
  to: string;
}): Promise<NotificationRow[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = supabase
    .from("notification_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1000);
  if (filters.template) query = query.eq("template", filters.template);
  if (filters.from) query = query.gte("created_at", `${filters.from}T00:00:00Z`);
  if (filters.to) query = query.lte("created_at", `${filters.to}T23:59:59Z`);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as NotificationRow[];
}
