import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import type { ReviewSubmission } from "@/lib/quote-review.server";

/**
 * Customer submission of an indicative quotation for review.
 *
 * The reference alone grants nothing: the caller must present the e-mail
 * address or phone number the quotation was requested with. Repeated calls
 * are safe — the request is created once and each e-mail is sent once.
 */
export const submitQuoteReview = createServerFn({ method: "POST" })
  .inputValidator((data: { reference: string; contact: string; pdfBase64?: string }) => ({
    reference: String(data.reference ?? "").slice(0, 40),
    contact: String(data.contact ?? "").slice(0, 120),
    // A quotation PDF well beyond this size is not a quotation PDF.
    pdfBase64: String(data.pdfBase64 ?? "").slice(0, 8_000_000),
  }))
  .handler(async ({ data }): Promise<ReviewSubmission> => {
    const { submitQuoteForReview } = await import("@/lib/quote-review.server");
    return submitQuoteForReview({
      reference: data.reference,
      contact: data.contact,
      ...(data.pdfBase64 ? { pdfBase64: data.pdfBase64 } : {}),
    });
  });

/** Whether this quotation was already submitted — gates the PDF copy. */
export const fetchQuoteReviewState = createServerFn({ method: "POST" })
  .inputValidator((data: { reference: string; contact: string }) => ({
    reference: String(data.reference ?? "").slice(0, 40),
    contact: String(data.contact ?? "").slice(0, 120),
  }))
  .handler(async ({ data }): Promise<ReviewSubmission> => {
    const { reviewState } = await import("@/lib/quote-review.server");
    return reviewState(data);
  });

/**
 * Staff retry of a submission whose e-mails did not go out. Idempotent: an
 * already delivered notice is never sent twice, and no second request appears.
 */
export const retryQuoteReviewNotifications = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { reference: string }) => ({
    reference: String(data.reference ?? "").slice(0, 40),
  }))
  .handler(async ({ data, context }): Promise<ReviewSubmission> => {
    const { data: staff } = await context.supabase.rpc("is_staff");
    if (!staff) throw new Error("Forbidden");
    const { submitQuoteForReview } = await import("@/lib/quote-review.server");
    return submitQuoteForReview({ reference: data.reference, contact: "", trusted: true });
  });
