import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { DispatchResult } from "@/lib/operational-mail.server";

/**
 * Confirmation of an inquiry the public site just created. The only input is
 * the lead reference: the recipient, the language and every figure are read
 * from the stored record, so no caller can address a third party.
 */
export const notifyInquiryReceived = createServerFn({ method: "POST" })
  .inputValidator((data: { reference: string }) => ({
    reference: String(data.reference ?? "").slice(0, 40),
  }))
  .handler(async ({ data }): Promise<DispatchResult> => {
    if (!data.reference.trim()) return { status: "skipped", reason: "no reference", recipient: "" };
    const { dispatchOperationalEmail } = await import("@/lib/operational-mail.server");
    return dispatchOperationalEmail({ kind: "inquiry_confirmation", reference: data.reference });
  });

/** Staff sends the offer to the customer. */
export const notifyQuoteSent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { reference: string; force?: boolean }) => ({
    reference: String(data.reference ?? "").slice(0, 40),
    force: Boolean(data.force),
  }))
  .handler(async ({ data, context }): Promise<DispatchResult> => {
    const { data: isStaff } = await context.supabase.rpc("is_staff");
    if (!isStaff) throw new Error("Forbidden");
    const { dispatchOperationalEmail } = await import("@/lib/operational-mail.server");
    return dispatchOperationalEmail(
      { kind: "quote_sent", reference: data.reference },
      { force: data.force },
    );
  });

/** Work-order status change, sent to the customer behind the job's lead. */
export const notifyWorkOrderUpdate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { jobId: string; note?: string }) => ({
    jobId: String(data.jobId ?? ""),
  }))
  .handler(async ({ data, context }): Promise<DispatchResult> => {
    const { data: isStaff } = await context.supabase.rpc("is_staff");
    if (!isStaff) throw new Error("Forbidden");
    const { dispatchOperationalEmail } = await import("@/lib/operational-mail.server");
    // Every status change is its own notice, so this one is never deduplicated.
    return dispatchOperationalEmail(
      { kind: "work_order_update", jobId: data.jobId },
      { force: true },
    );
  });

export const notifyBookingDocuments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { jobId: string }) => ({ jobId: String(data.jobId ?? "") }))
  .handler(async ({ data, context }): Promise<DispatchResult[]> => {
    const { data: isStaff } = await context.supabase.rpc("is_staff");
    if (!isStaff) throw new Error("Forbidden");
    const { dispatchOperationalEmail } = await import("@/lib/operational-mail.server");
    const booking = await dispatchOperationalEmail({ kind: "booking_confirmation", jobId: data.jobId });
    const { data: invoice } = await context.supabase
      .from("invoices")
      .select("id, status")
      .eq("job_id", data.jobId)
      .maybeSingle();
    if (!invoice || invoice.status === "draft") return [booking];
    const bill = await dispatchOperationalEmail({ kind: "invoice", invoiceId: invoice.id });
    return [booking, bill];
  });

export const notifyInvoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { invoiceId: string; force?: boolean }) => ({
    invoiceId: String(data.invoiceId ?? ""),
    force: Boolean(data.force),
  }))
  .handler(async ({ data, context }): Promise<DispatchResult> => {
    const { data: isStaff } = await context.supabase.rpc("is_staff");
    if (!isStaff) throw new Error("Forbidden");
    const { dispatchOperationalEmail } = await import("@/lib/operational-mail.server");
    return dispatchOperationalEmail({ kind: "invoice", invoiceId: data.invoiceId }, { force: data.force });
  });

/**
 * Emails the branded invoice for one quotation. The invoice is resolved from
 * the stored quote — never from a caller-supplied recipient — so staff can
 * bill straight from the offer list. Quotes without an issued invoice are
 * reported back instead of silently doing nothing.
 */
export const notifyInvoiceForQuote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { quoteId: string }) => ({ quoteId: String(data.quoteId ?? "") }))
  .handler(async ({ data, context }): Promise<DispatchResult> => {
    const { data: isStaff } = await context.supabase.rpc("is_staff");
    if (!isStaff) throw new Error("Forbidden");
    if (!data.quoteId) return { status: "skipped", reason: "no_invoice", recipient: "" };

    const direct = await context.supabase
      .from("invoices")
      .select("id, status, created_at")
      .eq("quote_id", data.quoteId)
      .order("created_at", { ascending: false })
      .limit(1);
    let invoice = direct.data?.[0] ?? null;

    if (!invoice) {
      // Invoices created from a booking carry the job, not the quote.
      const { data: job } = await context.supabase
        .from("jobs_execution")
        .select("id")
        .eq("quote_id", data.quoteId)
        .order("created_at", { ascending: false })
        .limit(1);
      const jobId = job?.[0]?.id;
      if (jobId) {
        const byJob = await context.supabase
          .from("invoices")
          .select("id, status, created_at")
          .eq("job_id", jobId)
          .order("created_at", { ascending: false })
          .limit(1);
        invoice = byJob.data?.[0] ?? null;
      }
    }

    if (!invoice) return { status: "skipped", reason: "no_invoice", recipient: "" };
    if (invoice.status === "draft") return { status: "skipped", reason: "invoice_draft", recipient: "" };

    const { dispatchOperationalEmail } = await import("@/lib/operational-mail.server");
    return dispatchOperationalEmail({ kind: "invoice", invoiceId: invoice.id }, { force: true });
  });

/**
 * Review invitation after a job is finished. The recipient, the language and
 * the capability token all come from the stored job, so staff can only invite
 * the customer who actually had the move. Sending stays switched off until the
 * sender domain is verified — the notice is then visibly queued, never "sent".
 */
export const notifyReviewRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { jobId: string; force?: boolean }) => ({
    jobId: String(data.jobId ?? ""),
    force: Boolean(data.force),
  }))
  .handler(async ({ data, context }): Promise<DispatchResult> => {
    const { data: isStaff } = await context.supabase.rpc("is_staff");
    if (!isStaff) throw new Error("Forbidden");
    const { reviewInvitesEnabled } = await import("@/lib/review-settings.server");
    if (!(await reviewInvitesEnabled()))
      return { status: "skipped", reason: "review invitations are switched off", recipient: "" };
    const { dispatchOperationalEmail } = await import("@/lib/operational-mail.server");
    return dispatchOperationalEmail({ kind: "review_request", jobId: data.jobId }, { force: data.force });
  });
