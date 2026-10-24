import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";

/**
 * Customer-side quotation acceptance.
 *
 * Acceptance is bound to one exact stored snapshot: reference plus the
 * contact the offer was requested with, and the version, options and total
 * the customer actually saw. A price or option change in between produces a
 * new version, and the stale submission is refused rather than silently
 * accepting different figures.
 */

function publicClient() {
  return createClient<Database>(
    process.env["SUPABASE_URL"]!,
    process.env["SUPABASE_PUBLISHABLE_KEY"]!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

export type QuoteSnapshot = {
  version: number;
  total: number;
  acceptedAt: string | null;
  /** Only the version PS Umzug actually sent can be accepted. */
  acceptable: boolean;
};

/** The exact version the customer is being asked to accept. */
export const fetchQuoteSnapshot = createServerFn({ method: "POST" })
  .inputValidator((data: { reference: string; contact: string }) => ({
    reference: String(data.reference ?? "").slice(0, 40),
    contact: String(data.contact ?? "").slice(0, 120),
  }))
  .handler(async ({ data }): Promise<QuoteSnapshot | null> => {
    if (!data.contact.trim()) return null;
    const { data: rows, error } = await publicClient().rpc("public_quote_snapshot", {
      _reference: data.reference,
      _contact: data.contact,
    });
    if (error) {
      console.error("public_quote_snapshot failed", error.message);
      return null;
    }
    const row = Array.isArray(rows) ? rows[0] : rows;
    if (!row) return null;
    return {
      version: Number(row.version),
      total: Number(row.total),
      acceptedAt: row.accepted_at ?? null,
      acceptable: Boolean(row.acceptable),
    };
  });

export type AcceptResult =
  | { ok: true; version: number; acceptedAt: string | null }
  | { ok: false; reason: "stale" | "mismatch" | "not_found" | "failed" | "minimum" | "notReleased" };

/** Records acceptance, or refuses when the offer has changed meanwhile. */
export const acceptQuote = createServerFn({ method: "POST" })
  .inputValidator(
    (data: { reference: string; contact: string; version: number; total: number; name: string }) => ({
      reference: String(data.reference ?? "").slice(0, 40),
      contact: String(data.contact ?? "").slice(0, 120),
      version: Number(data.version),
      total: Number(data.total),
      name: String(data.name ?? "").slice(0, 120),
    }),
  )
  .handler(async ({ data }): Promise<AcceptResult> => {
    const name = data.name.trim();
    const { data: rows, error } = await publicClient().rpc("accept_public_quote", {
      _reference: data.reference,
      _contact: data.contact,
      _version: data.version,
      _total: data.total,
      ...(name ? { _accepted_by_name: name } : {}),
    });

    if (error) {
      const message = error.message || "";
      // The four-hour minimum could not be demonstrated — a commercial block,
      // not a technical failure, so the customer is told exactly that.
      if (message.includes("minimum_hours_unverified")) return { ok: false, reason: "minimum" };
      if (message.includes("quote_not_released")) return { ok: false, reason: "notReleased" };
      if (message.includes("quote_version_stale")) return { ok: false, reason: "stale" };
      if (message.includes("quote_total_mismatch")) return { ok: false, reason: "mismatch" };
      if (message.includes("quote_not_found") || message.includes("quote_version_missing")) {
        return { ok: false, reason: "not_found" };
      }
      console.error("accept_public_quote failed", message);
      return { ok: false, reason: "failed" };
    }

    const row = Array.isArray(rows) ? rows[0] : rows;
    if (!row) return { ok: false, reason: "failed" };
    // Office notice to the PS Umzug mailbox. Never blocks the acceptance itself.
    try {
      await notifyOfficeOfAcceptance({
        reference: data.reference,
        version: Number(row.accepted_version),
        total: data.total,
        name,
        acceptedAt: row.accepted_at ?? new Date().toISOString(),
      });
    } catch (cause) {
      console.error("acceptance office notice failed", cause instanceof Error ? cause.message : cause);
    }
    return { ok: true, version: Number(row.accepted_version), acceptedAt: row.accepted_at ?? null };
  });

/** Fixed recipient: the PS Umzug office mailbox. */
const OFFICE_MAILBOX = "info@ps-umzug.ch";

async function notifyOfficeOfAcceptance(d: {
  reference: string;
  version: number;
  total: number;
  name: string;
  acceptedAt: string;
}) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: quote } = await supabaseAdmin
    .from("quotes")
    .select("id, customer_name, customer_email, customer_phone, move_date, from_address, to_address, is_test")
    .eq("reference", d.reference)
    .maybeSingle();
  const { sendRawEmail } = await import("@/lib/notifications.server");
  const { siteUrl } = await import("@/lib/site");
  const amount = `CHF ${new Intl.NumberFormat("de-CH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(d.total)}`;
  const when = new Date(d.acceptedAt).toLocaleString("de-CH", { timeZone: "Europe/Zurich" });
  const text = [
    `Die Offerte ${d.reference} wurde vom Kunden online bestätigt.`,
    "",
    `Bestätigt durch: ${d.name || "—"}`,
    `Zeitpunkt: ${when}`,
    `Version: ${d.version}`,
    `Betrag inkl. MWST: ${amount}`,
    "",
    `Kunde: ${quote?.customer_name || "—"}`,
    `E-Mail: ${quote?.customer_email || "—"}`,
    `Telefon: ${quote?.customer_phone || "—"}`,
    `Umzugsdatum: ${quote?.move_date ?? "—"}`,
    `Von: ${quote?.from_address || "—"}`,
    `Nach: ${quote?.to_address || "—"}`,
    "",
    `Im DOP öffnen: ${siteUrl()}/admin/offerten`,
  ].join("\n");
  const outcome = await sendRawEmail({
    to: [OFFICE_MAILBOX],
    subject: `${quote?.is_test ? "[TEST] " : ""}Offerte ${d.reference} bestätigt — ${quote?.customer_name || d.name || "Kunde"}`,
    text,
    template: "quote_accepted_office",
    subjectType: "quote",
    subjectId: quote?.id ?? null,
  });
  if (!outcome.sent) console.error("acceptance office notice not sent", outcome.reason);
}
