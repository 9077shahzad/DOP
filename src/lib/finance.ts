/**
 * Finance layer — invoices raised from completed jobs, their payment
 * lifecycle and the management figures.
 *
 * Every write goes through a SECURITY DEFINER function that checks the
 * caller's role in the database, so nothing here relies on the UI hiding a
 * button. An invoice can only be issued when the company's legal and banking
 * configuration is complete: the refusal comes back as a machine code and is
 * translated in the screen, never invented here.
 */

import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Invoice = Tables<"invoices">;
export type InvoiceLine = Tables<"invoice_lines">;
export type InvoiceEvent = Tables<"invoice_events">;

/** Derived lifecycle state: the database keeps `partially paid` implicit. */
export type PaymentState =
  | "draft"
  | "issued"
  | "partially_paid"
  | "paid"
  | "overdue"
  | "cancelled";

export function paymentState(invoice: Pick<Invoice, "status" | "amount_paid" | "total">): PaymentState {
  const paid = Number(invoice.amount_paid ?? 0);
  const total = Number(invoice.total ?? 0);
  if (invoice.status === "paid") return "paid";
  if (invoice.status === "cancelled") return "cancelled";
  if (invoice.status === "draft") return "draft";
  if (paid > 0 && paid < total) return "partially_paid";
  return invoice.status === "overdue" ? "overdue" : "issued";
}

export function openAmount(invoice: Pick<Invoice, "amount_paid" | "total" | "status">): number {
  if (invoice.status === "cancelled") return 0;
  return Math.max(0, Number(invoice.total ?? 0) - Number(invoice.amount_paid ?? 0));
}

/* --------------------------------------------------------------- reading */

export async function fetchInvoices(includeTest = false): Promise<Invoice[]> {
  let q = supabase.from("invoices").select("*");
  // Test invoices (is_test) stay out of the operational list unless "Testdaten anzeigen" is on.
  if (!includeTest) q = q.eq("is_test", false);
  const { data, error } = await q.order("created_at", { ascending: false }).limit(200);
  if (error) throw error;
  return data ?? [];
}

export async function fetchInvoiceLines(invoiceId: string): Promise<InvoiceLine[]> {
  const { data, error } = await supabase
    .from("invoice_lines")
    .select("*")
    .eq("invoice_id", invoiceId)
    .order("created_at");
  if (error) throw error;
  return data ?? [];
}

export async function fetchInvoiceEvents(invoiceId: string): Promise<InvoiceEvent[]> {
  const { data, error } = await supabase
    .from("invoice_events")
    .select("*")
    .eq("invoice_id", invoiceId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export type InvoiceConfigState = { complete: boolean; missing: string[] };

/** Which legally required company values are still unset. */
export async function fetchInvoiceConfigState(): Promise<InvoiceConfigState> {
  const { data, error } = await supabase.rpc("invoice_config_state");
  if (error) throw error;
  const r = (data ?? {}) as Record<string, unknown>;
  return {
    complete: Boolean(r["complete"]),
    missing: Array.isArray(r["missing"]) ? (r["missing"] as unknown[]).map(String) : [],
  };
}

/** Completed jobs that do not have an invoice yet. */
export type BillableJob = {
  id: string;
  reference: string;
  customerName: string;
  serviceKey: string;
  completedAt: string | null;
  quoteId: string | null;
  jobValue: number | null;
};

export async function fetchBillableJobs(): Promise<BillableJob[]> {
  const [jobs, invoices] = await Promise.all([
    supabase
      .from("jobs_execution")
      .select("id, reference, customer_name, service_key, completed_at, quote_id, job_value")
      .in("status", ["completed", "verified"])
      .order("completed_at", { ascending: false })
      .limit(200),
    supabase.from("invoices").select("job_id").not("job_id", "is", null),
  ]);
  if (jobs.error) throw jobs.error;
  const billed = new Set((invoices.data ?? []).map((row) => row.job_id));
  return (jobs.data ?? [])
    .filter((j) => !billed.has(j.id))
    .map((j) => ({
      id: j.id,
      reference: j.reference ?? "",
      customerName: j.customer_name ?? "",
      serviceKey: j.service_key ?? "",
      completedAt: j.completed_at,
      quoteId: j.quote_id,
      jobValue: j.job_value == null ? null : Number(j.job_value),
    }));
}

/* --------------------------------------------------------------- writing */

/** Machine codes the database can refuse with; the screen translates them. */
export const FINANCE_ERROR_CODES = [
  "not_authorised",
  "job_not_found",
  "job_not_completed",
  "pricing_required",
  "invoice_not_found",
  "invoice_not_draft",
  "invoice_not_payable",
  "invoice_not_cancellable",
  "invalid_amount",
  "amount_exceeds_outstanding",
  "reason_required",
] as const;
export type FinanceErrorCode = (typeof FINANCE_ERROR_CODES)[number];

export function financeErrorCode(error: unknown): FinanceErrorCode | null {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return (FINANCE_ERROR_CODES.find((code) => message.includes(code)) ?? null) as FinanceErrorCode | null;
}

export async function createInvoiceFromJob(jobId: string): Promise<string> {
  const { data, error } = await supabase.rpc("create_invoice_from_job", { _job_id: jobId });
  if (error) throw error;
  return String(data);
}

export type IssueResult =
  | { status: "issued" }
  | { status: "config_incomplete"; missing: string[] };

export async function issueInvoice(id: string): Promise<IssueResult> {
  const { data, error } = await supabase.rpc("issue_invoice", { _id: id });
  if (error) throw error;
  const r = (data ?? {}) as Record<string, unknown>;
  if (r["status"] === "config_incomplete") {
    return {
      status: "config_incomplete",
      missing: Array.isArray(r["missing"]) ? (r["missing"] as unknown[]).map(String) : [],
    };
  }
  return { status: "issued" };
}

export async function applyInvoicePayment(input: {
  id: string;
  amount: number;
  paidOn: string;
  method: string;
  reference: string;
  note: string;
}): Promise<{ amountPaid: number; outstanding: number; settled: boolean; partiallyPaid: boolean }> {
  const { data, error } = await supabase.rpc("apply_invoice_payment", {
    _id: input.id,
    _amount: input.amount,
    _paid_on: input.paidOn,
    _method: input.method,
    _reference: input.reference,
    _note: input.note,
  });
  if (error) throw error;
  const r = (data ?? {}) as Record<string, unknown>;
  return {
    amountPaid: Number(r["amount_paid"] ?? 0),
    outstanding: Number(r["outstanding"] ?? 0),
    settled: Boolean(r["settled"]),
    partiallyPaid: Boolean(r["partially_paid"]),
  };
}

export async function cancelInvoice(id: string, reason: string): Promise<void> {
  const { error } = await supabase.rpc("cancel_invoice", { _id: id, _reason: reason });
  if (error) throw error;
}

export async function markOverdueInvoices(): Promise<number> {
  const { data, error } = await supabase.rpc("mark_overdue_invoices");
  if (error) throw error;
  return Number(data ?? 0);
}

/* ------------------------------------------------- customer document link */

export type PublicInvoice = {
  invoice: {
    id: string;
    reference: string;
    status: string;
    created_at: string;
    issued_at: string | null;
    due_on: string | null;
    net: number;
    vat: number;
    total: number;
    currency: string;
    amount_paid: number;
    qr_reference: string;
    customer_name: string;
    customer_language: string;
  };
  lines: Array<{ description: string; quantity: number; unit_price: number; net: number; vat_rate: number }>;
  entity: Record<string, string | null>;
};

export async function fetchInvoiceByToken(token: string): Promise<PublicInvoice | null> {
  const { data, error } = await supabase.rpc("invoice_by_token", { _token: token });
  if (error || !data) return null;
  return data as unknown as PublicInvoice;
}

/* ------------------------------------------------------- management KPIs */

export type ManagementKpis = {
  leads: number;
  leadsWon: number;
  leadsLost: number;
  quotes: number;
  quotesAccepted: number;
  quotesSent: number;
  dopCases: number;
  quotesValue: number;
  jobs: number;
  jobsByStatus: Record<string, number>;
  jobsCompleted: number;
  jobsCancelled: number;
  incidents: number;
  reviews: number;
  ratingAvg: number | null;
  invoicedTotal: number;
  paidTotal: number;
  openTotal: number;
  overdueCount: number;
  crewHours: number;
};

export async function fetchManagementKpis(from: string, to: string, includeTest = false): Promise<ManagementKpis> {
  const { data, error } = await supabase.rpc("management_kpis", { _from: from, _to: to, _include_test: includeTest });
  if (error) throw error;
  const r = (data ?? {}) as Record<string, unknown>;
  const n = (key: string) => Number(r[key] ?? 0);
  return {
    leads: n("leads"),
    leadsWon: n("leads_won"),
    leadsLost: n("leads_lost"),
    quotes: n("quotes"),
    quotesAccepted: n("quotes_accepted"),
    quotesSent: n("quotes_sent"),
    dopCases: n("dop_cases"),
    quotesValue: n("quotes_value"),
    jobs: n("jobs"),
    jobsByStatus: (r["jobs_by_status"] ?? {}) as Record<string, number>,
    jobsCompleted: n("jobs_completed"),
    jobsCancelled: n("jobs_cancelled"),
    incidents: n("incidents"),
    reviews: n("reviews"),
    ratingAvg: r["rating_avg"] == null ? null : Number(r["rating_avg"]),
    invoicedTotal: n("invoiced_total"),
    paidTotal: n("paid_total"),
    openTotal: n("open_total"),
    overdueCount: n("overdue_count"),
    crewHours: n("crew_hours"),
  };
}

/** Conversion is only meaningful when the denominator exists. */
export function conversionRate(won: number, total: number): number | null {
  return total > 0 ? Math.round((won / total) * 1000) / 10 : null;
}

export type KpiRange = "today" | "week" | "month" | "quarter" | "custom";

export function rangeDates(range: Exclude<KpiRange, "custom">, today = new Date()): { from: string; to: string } {
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const end = new Date(today);
  const start = new Date(today);
  if (range === "week") start.setDate(start.getDate() - 6);
  if (range === "month") start.setDate(start.getDate() - 29);
  if (range === "quarter") start.setDate(start.getDate() - 89);
  return { from: iso(start), to: iso(end) };
}
