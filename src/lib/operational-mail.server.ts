/**
 * Operational customer mail — server only.
 *
 * One path for every customer-facing notice (inquiry confirmation, quote,
 * work-order update). Each notice is
 *
 *   1. written into the email workspace as an outbound message, so the thread
 *      shows the full conversation and the lead timeline carries it, and
 *   2. handed to the provider layer.
 *
 * Without a connected provider the message stays visibly `pending` — it is
 * never displayed as sent. Nothing is invented: a notice is skipped when the
 * record carries no e-mail address, and it is sent only once per record and
 * template.
 */

import type { Json } from "@/integrations/supabase/types";
import { asEmailLang, renderEmail, type TemplateData } from "@/lib/email/templates";
import { siteUrl } from "@/lib/site";


export type OperationalEvent =
  | { kind: "inquiry_confirmation"; reference: string }
  | { kind: "quote_sent"; reference: string }
  | { kind: "work_order_update"; jobId: string; note?: string }
  | { kind: "booking_confirmation"; jobId: string }
  | { kind: "review_request"; jobId: string }
  | { kind: "invoice"; invoiceId: string }
  | { kind: "order_document"; jobId: string; documentUrl: string };

export type DispatchResult = {
  status: "sent" | "queued" | "skipped" | "failed";
  reason: string;
  recipient: string;
};

type Resolved = {
  template:
    | "inquiry_confirmation"
    | "quote_sent"
    | "work_order_update"
    | "booking_confirmation"
    | "review_request"
    | "invoice"
    | "order_document";
  to: string;
  language: string;
  data: TemplateData;
  leadId: string | null;
  subjectType: string;
  subjectId: string | null;
};

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

function chf(value: number | null | undefined): string | null {
  if (value == null) return null;
  return `CHF ${new Intl.NumberFormat("de-CH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)}`;
}

async function resolve(event: OperationalEvent): Promise<Resolved | null> {
  const db = await admin();

  if (event.kind === "inquiry_confirmation") {
    const { data: lead } = await db
      .from("leads")
      .select(
        "id, reference, customer_name, customer_email, language, service_address, preferred_date, status",
      )
      .eq("reference", event.reference)
      .maybeSingle();
    if (!lead) return null;
    // Parked spam is recorded but never notified.
    if (lead.status === "spam_review") return null;
    return {
      template: "inquiry_confirmation",
      to: lead.customer_email ?? "",
      language: lead.language ?? "de",
      leadId: lead.id,
      subjectType: "lead",
      subjectId: lead.id,
      data: {
        name: lead.customer_name || null,
        reference: lead.reference,
        location: lead.service_address || null,
        scheduledFor: lead.preferred_date ?? null,
        actionUrl: `${siteUrl()}/${asEmailLang(lead.language)}/status`,
      },
    };
  }

  if (event.kind === "quote_sent") {
    const { data: quote } = await db
      .from("quotes")
      .select(
        "id, reference, customer_name, customer_email, language, price_low, price_high, price_total, move_date, from_address",
      )
      .eq("reference", event.reference)
      .maybeSingle();
    if (!quote) return null;
    const lang = asEmailLang(quote.language);
    const amount =
      quote.price_total != null
        ? chf(Number(quote.price_total))
        : quote.price_low != null && quote.price_high != null
          ? `${chf(Number(quote.price_low))} – ${chf(Number(quote.price_high))}`
          : null;
    return {
      template: "quote_sent",
      to: quote.customer_email ?? "",
      language: quote.language ?? "de",
      leadId: null,
      subjectType: "quote",
      subjectId: quote.id,
      data: {
        name: quote.customer_name || null,
        reference: quote.reference,
        amount,
        scheduledFor: quote.move_date ?? null,
        location: quote.from_address || null,
        actionUrl: `${siteUrl()}/${lang}/offerte/${quote.reference}`,
      },
    };
  }

  if (event.kind === "invoice") {
    const { data: invoice } = await db
      .from("invoices")
      .select("id, reference, status, customer_name, customer_email, customer_language, total, currency, due_on, access_token, lead_id")
      .eq("id", event.invoiceId)
      .maybeSingle();
    if (!invoice || invoice.status === "draft" || invoice.status === "cancelled") return null;
    const lang = asEmailLang(invoice.customer_language);
    return {
      template: "invoice",
      to: invoice.customer_email ?? "",
      language: invoice.customer_language ?? "de",
      leadId: invoice.lead_id,
      subjectType: "invoice",
      subjectId: invoice.id,
      data: {
        name: invoice.customer_name || null,
        reference: invoice.reference,
        amount: chf(Number(invoice.total)),
        dueDate: invoice.due_on,
        actionUrl: `${siteUrl()}/${lang}/rechnung/${invoice.access_token}`,
      },
    };
  }

  if (event.kind === "booking_confirmation") {
    const { data: job } = await db
      .from("jobs_execution")
      .select("id, reference, customer_name, customer_email, customer_language, scheduled_start, job_value, origin, lead_id")
      .eq("id", event.jobId)
      .maybeSingle();
    if (!job) return null;
    return {
      template: "booking_confirmation",
      to: job.customer_email ?? "",
      language: job.customer_language ?? "de",
      leadId: job.lead_id,
      subjectType: "job",
      subjectId: job.id,
      data: {
        name: job.customer_name || null,
        reference: job.reference,
        amount: chf(job.job_value == null ? null : Number(job.job_value)),
        scheduledFor: job.scheduled_start,
        location: typeof job.origin === "object" && job.origin ? String((job.origin as Record<string, unknown>)["address"] ?? "") : null,
        actionUrl: `${siteUrl()}/${asEmailLang(job.customer_language)}/status`,
      },
    };
  }

  if (event.kind === "order_document") {
    const { data: job } = await db
      .from("jobs_execution")
      .select("id, reference, customer_name, customer_email, customer_language, scheduled_start, job_value, lead_id")
      .eq("id", event.jobId)
      .maybeSingle();
    if (!job) return null;
    return {
      template: "order_document",
      to: job.customer_email ?? "",
      language: job.customer_language ?? "de",
      leadId: job.lead_id,
      subjectType: "job",
      subjectId: job.id,
      data: {
        name: job.customer_name || null,
        reference: job.reference,
        amount: chf(job.job_value == null ? null : Number(job.job_value)),
        scheduledFor: job.scheduled_start,
        actionUrl: event.documentUrl,
      },
    };
  }

  if (event.kind === "review_request") {
    const { data: job } = await db
      .from("jobs_execution")
      .select("id, reference, status, customer_name, customer_email, customer_language, scheduled_end, scheduled_start, lead_id")
      .eq("id", event.jobId)
      .maybeSingle();
    if (!job) return null;
    // Only a finished job may ask for a review — nothing is invited early.
    if (job.status !== "completed" && job.status !== "verified") return null;

    // The capability token already exists when staff requested a review by
    // hand; otherwise it is minted here, once per job.
    const { data: existing } = await db
      .from("job_reviews")
      .select("token, submitted_at")
      .eq("job_id", job.id)
      .maybeSingle();
    if (existing?.submitted_at) return null;
    let token = existing?.token ?? "";
    if (!token) {
      const { data: created } = await db
        .from("job_reviews")
        .insert({ job_id: job.id } as never)
        .select("token")
        .maybeSingle();
      token = created?.token ?? "";
    }
    if (!token) return null;

    const lang = asEmailLang(job.customer_language);
    return {
      template: "review_request",
      to: job.customer_email ?? "",
      language: job.customer_language ?? "de",
      leadId: job.lead_id,
      subjectType: "job",
      subjectId: job.id,
      data: {
        name: job.customer_name || null,
        reference: job.reference,
        scheduledFor: job.scheduled_end ?? job.scheduled_start ?? null,
        actionUrl: `${siteUrl()}/${lang}/bewertung/${token}`,
      },
    };
  }


  const { data: job } = await db
    .from("jobs_execution")
    .select("id, reference, status, scheduled_start, lead_id, crew_note")
    .eq("id", event.jobId)
    .maybeSingle();
  if (!job) return null;

  const { data: lead } = job.lead_id
    ? await db
        .from("leads")
        .select("id, reference, customer_name, customer_email, language, service_address")
        .eq("id", job.lead_id)
        .maybeSingle()
    : { data: null };

  return {
    template: "work_order_update",
    to: lead?.customer_email ?? "",
    language: lead?.language ?? "de",
    leadId: job.lead_id,
    subjectType: "job",
    subjectId: job.id,
    data: {
      name: lead?.customer_name || null,
      reference: job.reference,
      status: String(job.status),
      note: event.note?.trim() || job.crew_note || null,
      scheduledFor: job.scheduled_start ?? null,
      location: lead?.service_address || null,
      actionUrl: lead?.reference ? `${siteUrl()}/${asEmailLang(lead.language)}/status` : null,
    },
  };
}

/**
 * Sends one operational notice, records it in the inbox and returns what
 * really happened. `queued` means the message exists and is waiting for a
 * connected provider.
 */
export async function dispatchOperationalEmail(
  event: OperationalEvent,
  options: { force?: boolean } = {},
): Promise<DispatchResult> {
  const db = await admin();
  const resolved = await resolve(event);
  if (!resolved) return { status: "skipped", reason: "record not found", recipient: "" };

  const recipient = resolved.to.trim().toLowerCase();
  if (!recipient)
    return { status: "skipped", reason: "no e-mail address on record", recipient: "" };

  // Once per record and template, unless a staff member explicitly resends.
  if (!options.force && resolved.subjectId) {
    const { data: earlier } = await db
      .from("notification_log")
      .select("id")
      .eq("template", resolved.template)
      .eq("subject_id", resolved.subjectId)
      .in("status", ["sent", "pending"])
      .limit(1)
      .maybeSingle();
    if (earlier) return { status: "skipped", reason: "already notified", recipient };
  }

  const { loadSettings } = await import("@/lib/notifications.server");
  const settings = await loadSettings();
  const lang = asEmailLang(resolved.language);
  const rendered = renderEmail(resolved.template, lang, {
    ...resolved.data,
    companyName: settings.from_name || "PS Umzug AG",
  });

  const from = settings.from_email.trim() || (await defaultAccountAddress());
  let messageRowId = "";
  let threadId = "";

  if (from) {
    const { data: ingested, error } = await db.rpc("email_ingest", {
      payload: {
        direction: "outbound",
        source: "outbound",
        account: from,
        from_address: from,
        from_name: settings.from_name || "PS Umzug AG",
        to: [recipient],
        subject: rendered.subject,
        body_text: rendered.text,
        body_html: rendered.html,
        received_at: new Date().toISOString(),
      } as unknown as Json,
    });
    if (error) {
      console.error("[operational-mail] inbox write failed", error.message);
    } else {
      const out = ingested as unknown as { message_id?: string; thread_id?: string };
      messageRowId = out.message_id ? String(out.message_id) : "";
      threadId = out.thread_id ? String(out.thread_id) : "";
      if (threadId && resolved.leadId) {
        await db.from("email_links").upsert(
          {
            thread_id: threadId,
            entity_type: "lead",
            entity_id: resolved.leadId,
            confidence: "high",
            matched_on: "operational_notification",
          } as never,
          { onConflict: "thread_id,entity_type,entity_id" },
        );
      }
    }
  }

  const { sendNotification } = await import("@/lib/notifications.server");
  const outcome = await sendNotification({
    template: resolved.template,
    to: recipient,
    language: lang,
    data: { ...resolved.data, companyName: settings.from_name || "PS Umzug AG" },
    leadId: resolved.leadId,
    subjectType: resolved.subjectType,
    subjectId: resolved.subjectId,
  });

  const queued =
    !outcome.sent && /switched off|no sender address|no Resend API key/i.test(outcome.reason);
  const status: DispatchResult["status"] = outcome.sent ? "sent" : queued ? "queued" : "failed";

  if (messageRowId) {
    await db
      .from("email_messages")
      .update({
        delivery_status: outcome.sent ? "sent" : queued ? "pending" : "failed",
        delivery_reason: outcome.sent ? "" : outcome.reason,
        provider_message_id: outcome.messageId ?? "",
      })
      .eq("id", messageRowId);
  }

  return { status, reason: outcome.reason, recipient };
}

async function defaultAccountAddress(): Promise<string> {
  const db = await admin();
  const { data } = await db
    .from("email_accounts")
    .select("address")
    .eq("active", true)
    .order("is_default", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.address ?? "";
}
