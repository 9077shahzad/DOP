/**
 * Sends the Auftrag (order) document to the customer of one job.
 *
 * Fixed template (`order_document`), fixed recipient (the job's customer),
 * and the only document is the order PDF stored under the job's own folder.
 * This path never reads or sends an offer. Every attempt is recorded in the
 * job history, including blocked and failed ones.
 */
import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type OrderSendResult = { status: "sent" | "queued" | "skipped" | "failed"; reason: string; recipient: string };

export const sendOrderDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { jobId: string; pdfBase64: string }) => {
    const jobId = String(data.jobId ?? "");
    const pdfBase64 = String(data.pdfBase64 ?? "");
    if (!/^[0-9a-f-]{36}$/i.test(jobId)) throw new Error("invalid job");
    if (pdfBase64.length < 100 || pdfBase64.length > 12_000_000) throw new Error("invalid document");
    return { jobId, pdfBase64 };
  })
  .handler(async ({ data, context }): Promise<OrderSendResult> => {
    // Only management / super-admin may send the order document to a customer.
    const { data: isAdmin } = await context.supabase.rpc("is_zw_admin");
    if (isAdmin !== true) throw new Error("Nur Super-Admin oder Geschäftsleitung dürfen Auftragsdokumente senden.");

    const log = (recipient: string, status: string, detail: Record<string, unknown>) =>
      context.supabase.rpc("dop_log_order_send" as never, { _job_id: data.jobId, _recipient: recipient, _status: status, _detail: detail } as never);

    const { data: job } = await context.supabase
      .from("jobs_execution")
      .select("id, reference, customer_email, quote_reference, accepted_snapshot")
      .eq("id", data.jobId)
      .maybeSingle();
    if (!job) throw new Error("job not found");

    const bytes = Buffer.from(data.pdfBase64, "base64");
    if (bytes.subarray(0, 5).toString("latin1") !== "%PDF-") {
      await log(job.customer_email ?? "", "failed", { reason: "not a pdf" });
      return { status: "failed", reason: "Kein gültiges PDF", recipient: job.customer_email ?? "" };
    }

    // The order prints the immutable accepted-offer snapshot, never later edits.
    const snap = (job.accepted_snapshot ?? null) as { quote?: { accepted_version?: number | null; accepted_at?: string | null } } | null;
    const acceptedVersion = snap?.quote?.accepted_version ?? null;
    if (!snap?.quote?.accepted_at || acceptedVersion == null) {
      await log(job.customer_email ?? "", "blocked", { reason: "accepted_snapshot_missing" });
      return { status: "failed", reason: "Kein Annahme-Snapshot vorhanden", recipient: job.customer_email ?? "" };
    }
    const q = { accepted_version: acceptedVersion };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const path = `orders/${job.id}/${job.reference}-Auftrag-V${q.accepted_version}-${Date.now()}.pdf`;
    const up = await supabaseAdmin.storage.from("lead-attachments").upload(path, bytes, { contentType: "application/pdf", upsert: false });
    if (up.error) {
      await log(job.customer_email ?? "", "failed", { reason: "storage" });
      return { status: "failed", reason: "PDF konnte nicht gespeichert werden", recipient: job.customer_email ?? "" };
    }
    const signed = await supabaseAdmin.storage.from("lead-attachments").createSignedUrl(path, 60 * 60 * 24 * 14);
    if (signed.error || !signed.data?.signedUrl) {
      await log(job.customer_email ?? "", "failed", { reason: "link", path });
      return { status: "failed", reason: "Link konnte nicht erstellt werden", recipient: job.customer_email ?? "" };
    }

    const { dispatchOperationalEmail } = await import("@/lib/operational-mail.server");
    const result = await dispatchOperationalEmail(
      { kind: "order_document", jobId: job.id, documentUrl: signed.data.signedUrl },
      { force: true },
    );
    await log(result.recipient || job.customer_email || "", result.status, {
      reason: result.reason, path, accepted_version: q.accepted_version, template: "order_document",
    });
    return result;
  });
