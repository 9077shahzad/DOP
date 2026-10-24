/**
 * Scheduled bank-payment sweep.
 *
 * A scheduler (pg_cron or any external cron) posts the payments booked on the
 * company account. Each entry is matched against the open invoices by QR or
 * invoice reference; a full match settles the invoice and moves the booking to
 * "paid", a partial match records the part payment. Nothing is invented: a
 * payment that matches no single invoice is stored as unmatched for staff.
 *
 * Authorisation uses BANK_FEED_SECRET, falling back to SLA_CRON_SECRET so the
 * existing scheduler credential keeps working.
 */
import { createFileRoute } from "@tanstack/react-router";

type Payment = {
  external_id?: string;
  amount?: number | string;
  currency?: string;
  booked_on?: string;
  reference?: string;
  payer_name?: string;
  account_iban?: string;
};

const norm = (v: string) => v.replace(/\s/g, "").toUpperCase();

export const Route = createFileRoute("/api/public/cron/bank-payments")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["BANK_FEED_SECRET"] ?? process.env["SLA_CRON_SECRET"];
        const header = request.headers.get("authorization") ?? "";
        if (!secret || header !== `Bearer ${secret}`) {
          return new Response("Unauthorized", { status: 401 });
        }

        let body: { provider?: string; payments?: Payment[] };
        try {
          body = (await request.json()) as typeof body;
        } catch {
          return new Response(JSON.stringify({ ok: false, error: "invalid_json" }), {
            status: 400,
            headers: { "content-type": "application/json" },
          });
        }

        const provider = String(body.provider ?? "bank_feed").slice(0, 40);
        const payments = Array.isArray(body.payments) ? body.payments.slice(0, 200) : [];
        if (payments.length === 0) {
          return new Response(JSON.stringify({ ok: true, processed: 0, results: [] }), {
            headers: { "content-type": "application/json" },
          });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Only payments on the company's own account may settle invoices.
        const { data: entity } = await supabaseAdmin
          .from("legal_entities")
          .select("iban, qr_iban")
          .limit(1)
          .maybeSingle();
        const own = [entity?.iban, entity?.qr_iban]
          .map((v) => norm(String(v ?? "")))
          .filter(Boolean);
        if (own.length === 0) {
          return new Response(JSON.stringify({ ok: false, error: "bank_account_not_configured" }), {
            status: 409,
            headers: { "content-type": "application/json" },
          });
        }

        const results: Array<Record<string, unknown>> = [];
        for (const p of payments) {
          const account = norm(String(p.account_iban ?? own[0]));
          if (!own.includes(account)) {
            results.push({ external_id: p.external_id ?? null, status: "foreign_account" });
            continue;
          }
          const amount = Number(p.amount);
          if (!p.external_id || !Number.isFinite(amount) || amount <= 0) {
            results.push({ external_id: p.external_id ?? null, status: "invalid" });
            continue;
          }
          const { data, error } = await supabaseAdmin.rpc("import_bank_payment", {
            _provider: provider,
            _external_id: String(p.external_id).slice(0, 120),
            _account_iban: account,
            _amount: amount,
            _currency: String(p.currency ?? "CHF"),
            _booked_on: String(p.booked_on ?? new Date().toISOString().slice(0, 10)),
            _reference: String(p.reference ?? "").slice(0, 120),
            _payer_name: String(p.payer_name ?? "").slice(0, 200),
            _raw_payload: JSON.parse(JSON.stringify(p)),
          });
          results.push(
            error
              ? { external_id: p.external_id, status: "error", detail: error.message }
              : { external_id: p.external_id, ...(data as Record<string, unknown>) },
          );
        }

        return new Response(JSON.stringify({ ok: true, processed: results.length, results }), {
          headers: { "content-type": "application/json" },
        });
      },
    },
  },
});
