/**
 * Invoices as the signed-in customer sees them.
 *
 * Row-level security scopes the read to the organisation's own accounts, so
 * the query carries no filter of its own. Drafts are never customer-visible.
 *
 * The payment state shown in the portal is derived from what the office has
 * actually booked — never guessed: `paid` once the invoice is settled,
 * `processing` while a part payment is recorded or a bank entry is still being
 * matched, `unpaid` otherwise.
 */
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type PortalInvoice = {
  id: string;
  reference: string;
  status: Database["public"]["Enums"]["invoice_status"];
  issued_at: string | null;
  due_on: string | null;
  paid_on: string | null;
  total: number;
  amount_paid: number;
  currency: string;
  payment_reference: string;
  /** Office note on how the incoming payment was matched, if any. */
  payment_note: string;
  access_token: string;
};

export type PaymentState = "unpaid" | "processing" | "paid";

export function paymentStateOf(invoice: PortalInvoice): PaymentState {
  if (invoice.status === "paid") return "paid";
  const paid = Number(invoice.amount_paid ?? 0);
  const total = Number(invoice.total ?? 0);
  if (paid > 0 && paid < total) return "processing";
  // Full amount booked but the invoice not yet closed by finance.
  if (total > 0 && paid >= total) return "processing";
  return "unpaid";
}

export function openAmountOf(invoice: PortalInvoice): number {
  return Math.max(0, Number(invoice.total ?? 0) - Number(invoice.amount_paid ?? 0));
}

export async function loadPortalInvoices(): Promise<PortalInvoice[]> {
  const { data, error } = await supabase
    .from("invoices")
    .select(
      "id, reference, status, issued_at, due_on, paid_on, total, amount_paid, currency, payment_reference, payment_note, access_token",
    )
    .neq("status", "draft")
    .order("issued_at", { ascending: false, nullsFirst: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []) as PortalInvoice[];
}
