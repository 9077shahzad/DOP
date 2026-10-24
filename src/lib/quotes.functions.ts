import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";
import type { PublicQuote } from "@/lib/quotes";

/**
 * Public, single-row quote lookup. The reference alone is not enough: the
 * caller must also present the e-mail address or phone number the offer was
 * requested with. The database function returns at most one row, within 30
 * days of creation, and only the minimised customer-facing projection.
 */
export const fetchQuote = createServerFn({ method: "POST" })
  .inputValidator((data: { reference: string; contact: string }) => ({
    reference: String(data.reference ?? "").slice(0, 40),
    contact: String(data.contact ?? "").slice(0, 120),
  }))
  .handler(async ({ data }): Promise<PublicQuote | null> => {
    if (!data.contact.trim()) return null;

    const supabase = createClient<Database>(
      process.env["SUPABASE_URL"]!,
      process.env["SUPABASE_PUBLISHABLE_KEY"]!,
      { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
    );

    const { data: rows, error } = await supabase.rpc("get_public_quote", {
      _reference: data.reference,
      _contact: data.contact,
    });

    if (error) {
      console.error("get_public_quote failed", error.message);
      return null;
    }
    const row = Array.isArray(rows) ? rows[0] : rows;
    return (row as PublicQuote | undefined) ?? null;
  });
