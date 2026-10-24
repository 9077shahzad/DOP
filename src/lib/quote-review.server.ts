/**
 * Submission of an indicative quotation ("Richtofferte") for review.
 *
 * Server only. The sequence is fixed and never claims more than happened:
 *
 *   1. the stored quotation is marked as submitted for review,
 *   2. the internal notice goes to the PS Umzug review mailbox,
 *   3. only once the provider accepted that notice does the customer copy go
 *      out with the PDF attached.
 *
 * Every step is idempotent: a repeated call never creates a second request and
 * never sends a message twice. A step that could not run is recorded with its
 * real reason so staff can retry it without duplicating anything.
 */

import { asEmailLang, type EmailLang } from "@/lib/email/templates";

/** The customer copy also speaks Arabic, which the operational templates do not. */
type MailLang = EmailLang | "ar";

function asMailLang(value: string | null | undefined): MailLang {
  return value?.trim().toLowerCase().startsWith("ar") ? "ar" : asEmailLang(value);
}
import { siteUrl } from "@/lib/site";

export type NotifyState = "sent" | "pending" | "failed" | "not_started";

export type ReviewSubmission = {
  ok: boolean;
  /** Present when the reference/contact pair did not match a stored quote. */
  reason: string;
  reference: string;
  submittedAt: string;
  internal: NotifyState;
  internalReason: string;
  customer: NotifyState;
  customerReason: string;
  /** True when this call did not change anything (already submitted). */
  duplicate: boolean;
};

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/** The mailbox the review request goes to. Nothing is invented here. */
export async function reviewMailbox(): Promise<{ address: string; missing: string[] }> {
  const db = await admin();
  const { loadSettings, resolveApiKey } = await import("@/lib/notifications.server");
  const settings = await loadSettings();

  const { data: account } = await db
    .from("email_accounts")
    .select("address")
    .eq("active", true)
    .order("is_default", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: entity } = await db
    .from("legal_entities")
    .select("email")
    .eq("country", "CH")
    .maybeSingle();

  const address = (
    settings.reply_to.trim() ||
    account?.address?.trim() ||
    entity?.email?.trim() ||
    ""
  ).toLowerCase();

  const missing: string[] = [];
  if (!address) missing.push("review_mailbox");
  if (!settings.enabled) missing.push("email_delivery_disabled");
  if (!settings.from_email.trim()) missing.push("verified_sender_address");
  if (!resolveApiKey(settings)) missing.push("provider_api_key");
  return { address, missing };
}

type Copy = { subject: string; text: string };

/**
 * Mirrors the SQL gate public.quote_contact_matches: e-mail compares case
 * insensitively, phone numbers compare on digits only with the Swiss trunk
 * "0" / country code "41" stripped and a suffix match.
 */
export function contactMatches(contact: string, email: string | null, phone: string | null): boolean {
  const c = (contact ?? "").trim();
  if (!c) return false;
  if (c.includes("@")) return c.toLowerCase() === (email ?? "").trim().toLowerCase();

  let digits = c.replace(/\D/g, "");
  if (digits.length >= 9 && digits.startsWith("0")) digits = digits.slice(1);
  else if (digits.length >= 11 && digits.startsWith("41")) digits = digits.slice(2);

  const stored = (phone ?? "").replace(/\D/g, "");
  if (digits.length < 6 || stored.length < 6) {
    // Fall back to a plain comparison so non-phone, non-email proofs still work.
    return c.toLowerCase() === (email ?? "").trim().toLowerCase() || c.toLowerCase() === (phone ?? "").trim().toLowerCase();
  }
  return stored.endsWith(digits);
}

function customerCopy(
  lang: MailLang,
  d: { name: string; reference: string; link: string },
  hasPdf: boolean,
): Copy {
  const attach: Record<MailLang, string> = {
    de: hasPdf
      ? " Im Anhang finden Sie eine Kopie als PDF."
      : " Die Kopie als PDF können Sie jederzeit über den untenstehenden Link herunterladen.",
    fr: hasPdf
      ? " Vous trouverez une copie en PDF en pièce jointe."
      : " Vous pouvez télécharger la copie en PDF à tout moment via le lien ci-dessous.",
    it: hasPdf
      ? " In allegato trova una copia in PDF."
      : " Può scaricare la copia in PDF in qualsiasi momento tramite il link qui sotto.",
    en: hasPdf
      ? " A PDF copy is attached."
      : " You can download the PDF copy at any time using the link below.",
    ar: hasPdf
      ? " ونسخة PDF مرفقة."
      : " ويمكنكم تنزيل نسخة PDF في أي وقت عبر الرابط أدناه.",
  };
  const a = attach[lang];
  const by: Record<MailLang, Copy> = {
    de: {
      subject: `Ihre Richtofferte ${d.reference} — zur Prüfung eingereicht`,
      text: `Guten Tag${d.name ? ` ${d.name}` : ""}\n\nVielen Dank. Ihre Richtofferte ${d.reference} wurde zur Prüfung bei PS Umzug AG eingereicht.${a}\n\nDer berechnete Betrag ist eine Richtofferte und noch kein verbindlicher Preis: Unser Team prüft Ihre Angaben und meldet sich mit der Bestätigung oder mit Rückfragen.\n\nIhre Richtofferte online: ${d.link}\n\nFreundliche Grüsse\nPS Umzug AG`,
    },
    fr: {
      subject: `Votre devis indicatif ${d.reference} — soumis pour examen`,
      text: `Bonjour${d.name ? ` ${d.name}` : ""}\n\nMerci. Votre devis indicatif ${d.reference} a été soumis à PS Umzug AG pour examen.${a}\n\nLe montant calculé est un devis indicatif et non un prix ferme : notre équipe vérifie vos indications et vous répond.\n\nVotre devis en ligne : ${d.link}\n\nCordialement\nPS Umzug AG`,
    },
    it: {
      subject: `La sua offerta indicativa ${d.reference} — inviata per verifica`,
      text: `Buongiorno${d.name ? ` ${d.name}` : ""}\n\nGrazie. La sua offerta indicativa ${d.reference} è stata inviata a PS Umzug AG per verifica.${a}\n\nL'importo calcolato è un'offerta indicativa e non un prezzo vincolante: il nostro team verifica i dati e la ricontatta.\n\nLa sua offerta online: ${d.link}\n\nCordiali saluti\nPS Umzug AG`,
    },
    en: {
      subject: `Your indicative quotation ${d.reference} — submitted for review`,
      text: `Hello${d.name ? ` ${d.name}` : ""}\n\nThank you. Your indicative quotation ${d.reference} has been submitted to PS Umzug AG for review.${a}\n\nThe calculated amount is an indicative quotation, not a binding price: our team reviews your details and gets back to you.\n\nYour quotation online: ${d.link}\n\nKind regards\nPS Umzug AG`,
    },
    ar: {
      subject: `عرضكم الاسترشادي ${d.reference} — تم إرساله للمراجعة`,
      text: `مرحباً${d.name ? ` ${d.name}` : ""}\n\nشكراً لكم. تم إرسال عرضكم الاسترشادي ${d.reference} إلى PS Umzug AG للمراجعة.${a}\n\nالمبلغ المحتسب هو عرض استرشادي وليس سعراً نهائياً: يراجع فريقنا بياناتكم ويعود إليكم.\n\nالعرض عبر الإنترنت: ${d.link}\n\nمع التحية\nPS Umzug AG`,
    },
  };
  return by[lang];
}


/**
 * Marks the stored quotation as submitted, notifies the review mailbox and
 * only then sends the customer copy. Safe to call repeatedly.
 */
export async function submitQuoteForReview(input: {
  reference: string;
  contact: string;
  pdfBase64?: string;
  /** Staff retry: the caller is already authenticated, no contact proof needed. */
  trusted?: boolean;
}): Promise<ReviewSubmission> {
  const db = await admin();
  const empty: ReviewSubmission = {
    ok: false,
    reason: "not_found",
    reference: input.reference,
    submittedAt: "",
    internal: "not_started",
    internalReason: "",
    customer: "not_started",
    customerReason: "",
    duplicate: false,
  };

  const contact = input.contact.trim().toLowerCase();
  if (!contact && !input.trusted) return empty;

  const { data: quote } = await db
    .from("quotes")
    .select(
      "id, reference, language, customer_name, customer_email, customer_phone, from_address, from_zip, to_address, to_zip, move_date, price_total, price_low, price_high, price_list_number, version, services, review_submitted_at, review_status, internal_notified_at, internal_notify_error, customer_notified_at, customer_notify_error",
    )
    .eq("reference", input.reference)
    .maybeSingle();

  // The reference alone is not a key: the caller must know the e-mail address
  // or phone number the quotation was requested with. Matching is as lenient
  // as the public viewing gate (quote_contact_matches).
  if (
    !quote ||
    (!input.trusted && !contactMatches(contact, quote.customer_email, quote.customer_phone))
  )
    return empty;


  const lang = asMailLang(quote.language ?? "de");
  const link = `${siteUrl()}/${lang}/offerte/${quote.reference}`;
  const alreadySubmitted = Boolean(quote.review_submitted_at);
  // A staff retry only repeats what the customer started; it never submits.
  if (input.trusted && !alreadySubmitted) return { ...empty, reason: "not_submitted" };
  const submittedAt = quote.review_submitted_at ?? new Date().toISOString();

  if (!alreadySubmitted) {
    await db
      .from("quotes")
      .update({ review_submitted_at: submittedAt, review_status: "submitted" })
      .eq("id", quote.id)
      .is("review_submitted_at", null);
  }

  const { sendRawEmail } = await import("@/lib/notifications.server");

  // ---- 1. internal notice -------------------------------------------------
  let internal: NotifyState = quote.internal_notified_at ? "sent" : "not_started";
  let internalReason = quote.internal_notified_at ? "" : quote.internal_notify_error;
  let internalAt = quote.internal_notified_at ?? "";

  if (internal !== "sent") {
    const mailbox = await reviewMailbox();
    if (!mailbox.address) {
      internal = "pending";
      internalReason = "Kein Prüf-Postfach konfiguriert";
    } else {
      const amount =
        quote.price_total == null
          ? "—"
          : `CHF ${new Intl.NumberFormat("de-CH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(quote.price_total))}`;
      const summary = [
        `Richtofferte ${quote.reference} wurde zur Prüfung eingereicht.`,
        "",
        `Kunde: ${quote.customer_name || "—"}`,
        `E-Mail: ${quote.customer_email || "—"}`,
        `Telefon: ${quote.customer_phone || "—"}`,
        `Sprache: ${lang}`,
        `Von: ${[quote.from_address, quote.from_zip].filter(Boolean).join(", ") || "—"}`,
        `Nach: ${[quote.to_address, quote.to_zip].filter(Boolean).join(", ") || "—"}`,
        `Umzugsdatum: ${quote.move_date ?? "—"}`,
        `Richtofferte total: ${amount}`,
        `Preisliste: ${quote.price_list_number ?? "—"} · Version ${quote.version ?? 1}`,
        "",
        `Offerte öffnen: ${link}`,
      ].join("\n");

      const outcome = await sendRawEmail({
        to: [mailbox.address],
        subject: `Richtofferte ${quote.reference} zur Prüfung — ${quote.customer_name || "Kunde"}`,
        text: summary,
        template: "quote_review_internal",
        subjectType: "quote",
        subjectId: quote.id,
        ...(input.pdfBase64
          ? {
              attachments: [
                { filename: `${quote.reference}.pdf`, contentBase64: input.pdfBase64 },
              ],
            }
          : {}),
      });

      if (outcome.sent) {
        internal = "sent";
        internalReason = "";
        internalAt = new Date().toISOString();
      } else {
        internal = /kein Anbieter|Postfach|switched off|no Resend/i.test(outcome.reason)
          ? "pending"
          : "failed";
        internalReason = outcome.reason;
      }
    }

    await db
      .from("quotes")
      .update({
        ...(internal === "sent" ? { internal_notified_at: internalAt } : {}),
        internal_notify_error: internal === "sent" ? "" : internalReason,
        review_status: internal === "sent" ? "submitted" : "submitted_internal_pending",
      })
      .eq("id", quote.id);
  }

  // ---- 2. customer copy — never before the internal notice was accepted ----
  let customer: NotifyState = quote.customer_notified_at ? "sent" : "not_started";
  let customerReason = quote.customer_notified_at ? "" : quote.customer_notify_error;

  if (internal === "sent" && customer !== "sent") {
    const to = (quote.customer_email ?? "").trim();
    if (!to) {
      customer = "failed";
      customerReason = "no customer e-mail address on record";
    } else {
      const copy = customerCopy(
        lang,
        {
          name: quote.customer_name ?? "",
          reference: quote.reference,
          link,
        },
        Boolean(input.pdfBase64),
      );

      const outcome = await sendRawEmail({
        to: [to],
        subject: copy.subject,
        text: copy.text,
        template: "quote_review_customer",
        subjectType: "quote",
        subjectId: quote.id,
        ...(input.pdfBase64
          ? {
              attachments: [
                { filename: `${quote.reference}.pdf`, contentBase64: input.pdfBase64 },
              ],
            }
          : {}),
      });
      customer = outcome.sent
        ? "sent"
        : /kein Anbieter|switched off|no Resend/i.test(outcome.reason)
          ? "pending"
          : "failed";
      customerReason = outcome.sent ? "" : outcome.reason;
    }

    await db
      .from("quotes")
      .update({
        ...(customer === "sent" ? { customer_notified_at: new Date().toISOString() } : {}),
        customer_notify_error: customer === "sent" ? "" : customerReason,
      })
      .eq("id", quote.id);
  }

  return {
    ok: true,
    reason: "",
    reference: quote.reference,
    submittedAt,
    internal,
    internalReason,
    customer,
    customerReason,
    duplicate: alreadySubmitted,
  };
}

/** Read-only state, used to decide whether the PDF copy may be handed out. */
export async function reviewState(input: {
  reference: string;
  contact: string;
}): Promise<ReviewSubmission> {
  const db = await admin();
  const contact = input.contact.trim().toLowerCase();
  const { data: quote } = await db
    .from("quotes")
    .select(
      "reference, customer_email, customer_phone, review_submitted_at, internal_notified_at, internal_notify_error, customer_notified_at, customer_notify_error",
    )
    .eq("reference", input.reference)
    .maybeSingle();

  if (!quote || !contactMatches(contact, quote.customer_email, quote.customer_phone)) {

    return {
      ok: false,
      reason: "not_found",
      reference: input.reference,
      submittedAt: "",
      internal: "not_started",
      internalReason: "",
      customer: "not_started",
      customerReason: "",
      duplicate: false,
    };
  }

  return {
    ok: true,
    reason: "",
    reference: quote.reference,
    submittedAt: quote.review_submitted_at ?? "",
    internal: quote.internal_notified_at
      ? "sent"
      : quote.internal_notify_error
        ? "pending"
        : "not_started",
    internalReason: quote.internal_notify_error ?? "",
    customer: quote.customer_notified_at
      ? "sent"
      : quote.customer_notify_error
        ? "pending"
        : "not_started",
    customerReason: quote.customer_notify_error ?? "",
    duplicate: Boolean(quote.review_submitted_at),
  };
}
