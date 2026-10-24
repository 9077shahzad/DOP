/**
 * B2B accounts, sites, contracts, schedules, work orders and invoices.
 *
 * Everything here is read/written through RLS: dispatch and staff manage,
 * a linked portal organisation reads only its own account. Internal cost is
 * never selected on the customer-facing paths.
 */
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Account = Database["public"]["Tables"]["accounts"]["Row"];
export type AccountSite = Database["public"]["Tables"]["account_sites"]["Row"];
export type AccountContact = Database["public"]["Tables"]["account_contacts"]["Row"];
export type SiteService = Database["public"]["Tables"]["site_services"]["Row"];
export type AccountService = Database["public"]["Tables"]["account_services"]["Row"];
export type Contract = Database["public"]["Tables"]["contracts"]["Row"];
export type Sla = Database["public"]["Tables"]["slas"]["Row"];
export type ServiceSchedule = Database["public"]["Tables"]["service_schedules"]["Row"];
export type WorkOrder = Database["public"]["Tables"]["work_orders"]["Row"];
export type Invoice = Database["public"]["Tables"]["invoices"]["Row"];
export type InvoiceLine = Database["public"]["Tables"]["invoice_lines"]["Row"];
export type CatalogueItem = Database["public"]["Tables"]["service_catalogue"]["Row"];

export type WorkOrderStatus = Database["public"]["Enums"]["work_order_status"];
export type InvoiceStatus = Database["public"]["Enums"]["invoice_status"];

export const WORK_ORDER_STATUSES: WorkOrderStatus[] = [
  "planned",
  "dispatched",
  "in_progress",
  "completed",
  "verified",
  "on_hold",
  "cancelled",
];

export type EffectiveService = {
  level: string;
  price: number | null;
  price_level: string;
  sla_id: string | null;
  sla_level: string;
  frequency: string;
  frequency_level: string;
  preferred_fulfilment: string;
  fulfilment_level: string;
  preferred_partner_id: string | null;
  preferred_team_id: string | null;
  currency: string;
};

export type InvoiceBuildResult = {
  invoice_id: string;
  reference: string;
  status: string;
  lines: number;
  net: number;
  vat: number;
  total: number;
  skipped: Array<{ work_order: string; reason: string; status?: string; job_status?: string }>;
};

function unwrap<T>(data: T | null, error: { message: string } | null): T {
  if (error) throw new Error(error.message);
  return data as T;
}

export async function fetchAccounts(): Promise<Account[]> {
  const { data, error } = await supabase.from("accounts").select("*").order("legal_name");
  return unwrap(data, error) ?? [];
}

export async function fetchAccount(id: string): Promise<Account | null> {
  const { data, error } = await supabase.from("accounts").select("*").eq("id", id).maybeSingle();
  return unwrap(data, error);
}

export async function fetchSites(accountId?: string): Promise<AccountSite[]> {
  let query = supabase.from("account_sites").select("*").order("name");
  if (accountId) query = query.eq("account_id", accountId);
  const { data, error } = await query;
  return unwrap(data, error) ?? [];
}

export async function fetchContacts(accountId: string): Promise<AccountContact[]> {
  const { data, error } = await supabase
    .from("account_contacts")
    .select("*")
    .eq("account_id", accountId)
    .order("name");
  return unwrap(data, error) ?? [];
}

export async function fetchContracts(accountId: string): Promise<Contract[]> {
  const { data, error } = await supabase
    .from("contracts")
    .select("*")
    .eq("account_id", accountId)
    .order("starts_on", { ascending: false });
  return unwrap(data, error) ?? [];
}

export async function fetchSiteServices(siteIds: string[]): Promise<SiteService[]> {
  if (siteIds.length === 0) return [];
  const { data, error } = await supabase.from("site_services").select("*").in("site_id", siteIds);
  return unwrap(data, error) ?? [];
}

export async function fetchAccountServices(accountId: string): Promise<AccountService[]> {
  const { data, error } = await supabase.from("account_services").select("*").eq("account_id", accountId);
  return unwrap(data, error) ?? [];
}

export async function fetchSchedules(siteServiceIds: string[]): Promise<ServiceSchedule[]> {
  if (siteServiceIds.length === 0) return [];
  const { data, error } = await supabase
    .from("service_schedules")
    .select("*")
    .in("site_service_id", siteServiceIds)
    .order("next_due_on");
  return unwrap(data, error) ?? [];
}

export async function fetchWorkOrders(filter: { accountId?: string; siteId?: string } = {}): Promise<WorkOrder[]> {
  let query = supabase.from("work_orders").select("*").order("due_on", { ascending: true });
  if (filter.accountId) query = query.eq("account_id", filter.accountId);
  if (filter.siteId) query = query.eq("site_id", filter.siteId);
  const { data, error } = await query;
  return unwrap(data, error) ?? [];
}

export async function fetchInvoices(accountId?: string): Promise<Invoice[]> {
  let query = supabase.from("invoices").select("*").order("period_end", { ascending: false });
  if (accountId) query = query.eq("account_id", accountId);
  const { data, error } = await query;
  return unwrap(data, error) ?? [];
}

export async function fetchInvoiceLines(invoiceId: string): Promise<InvoiceLine[]> {
  const { data, error } = await supabase.from("invoice_lines").select("*").eq("invoice_id", invoiceId);
  return unwrap(data, error) ?? [];
}

export async function fetchCatalogue(): Promise<CatalogueItem[]> {
  const { data, error } = await supabase.from("service_catalogue").select("*").eq("active", true).order("sort_order");
  return unwrap(data, error) ?? [];
}

export async function fetchSlas(): Promise<Sla[]> {
  const { data, error } = await supabase.from("slas").select("*").eq("active", true).order("response_minutes");
  return unwrap(data, error) ?? [];
}

export async function resolveSiteService(siteId: string, catalogueId: string): Promise<EffectiveService | null> {
  const { data, error } = await supabase.rpc("resolve_site_service", {
    _site_id: siteId,
    _catalogue_id: catalogueId,
  });
  const rows = unwrap(data, error) as unknown as EffectiveService[] | null;
  return rows?.[0] ?? null;
}

export async function setWorkOrderStatus(id: string, status: WorkOrderStatus): Promise<void> {
  const { error } = await supabase.from("work_orders").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function pauseSchedule(id: string, until: string | null): Promise<void> {
  const { error } = await supabase.from("service_schedules").update({ paused_until: until }).eq("id", id);
  if (error) throw new Error(error.message);
}

/** Generates the work orders that are coming due. Safe to run repeatedly. */
export async function runWorkOrderJob(horizonDays?: number): Promise<{ created?: number; skipped?: boolean; reason?: string }> {
  const args: { _trigger: string; _horizon_days?: number } = { _trigger: "manual" };
  if (typeof horizonDays === "number") args._horizon_days = horizonDays;
  const { data, error } = await supabase.rpc("run_work_order_job", args);
  return unwrap(data, error) as unknown as { created?: number; skipped?: boolean; reason?: string };
}

/** Builds a draft invoice. Never issues it; unbillable work orders come back in `skipped`. */
export async function buildConsolidatedInvoice(
  accountId: string,
  periodStart: string,
  periodEnd: string,
): Promise<InvoiceBuildResult> {
  const { data, error } = await supabase.rpc("build_consolidated_invoice", {
    _account_id: accountId,
    _period_start: periodStart,
    _period_end: periodEnd,
  });
  return unwrap(data, error) as unknown as InvoiceBuildResult;
}

/**
 * Payments are deliberately not writable from here.
 *
 * There is exactly one authoritative payment implementation: the finance
 * screen's `applyInvoicePayment` (`src/lib/finance.ts` → `apply_invoice_payment`),
 * which accumulates part payments, refuses more than the outstanding balance
 * and writes an audit event. The former `recordInvoicePayment` path overwrote
 * the paid amount and left no history; it has been removed from the code and
 * dropped from the database.
 */

