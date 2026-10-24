import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";

/**
 * Customer documents attached to an existing offer.
 *
 * The files are linked only when the caller presents the contact the offer was
 * requested with. Attaching a file stores the document and nothing else: the
 * offer, its version, its price and its scope stay exactly as they are. Any
 * resulting commercial change goes through the normal staff review and the
 * versioned quotation history.
 */

function publicClient() {
  return createClient<Database>(
    process.env["SUPABASE_URL"]!,
    process.env["SUPABASE_PUBLISHABLE_KEY"]!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

export type QuoteFileInput = {
  storage_path: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  kind: string;
};

export const attachQuoteFiles = createServerFn({ method: "POST" })
  .inputValidator(
    (data: { reference: string; contact: string; draft: string; files: QuoteFileInput[] }) => ({
      reference: String(data.reference ?? "").slice(0, 40),
      contact: String(data.contact ?? "").slice(0, 120),
      draft: String(data.draft ?? "").slice(0, 60),
      files: (Array.isArray(data.files) ? data.files : []).slice(0, 20).map((f) => ({
        storage_path: String(f.storage_path ?? "").slice(0, 300),
        file_name: String(f.file_name ?? "").slice(0, 200),
        mime_type: String(f.mime_type ?? "").slice(0, 100),
        size_bytes: Number(f.size_bytes ?? 0),
        kind: String(f.kind ?? "other").slice(0, 40),
      })),
    }),
  )
  .handler(async ({ data }): Promise<number> => {
    if (data.files.length === 0) return 0;
    const { data: linked, error } = await publicClient().rpc("attach_quote_files", {
      _reference: data.reference,
      _contact: data.contact,
      _draft: data.draft,
      _files: data.files,
    });
    if (error) {
      console.error("attach_quote_files failed", error.message);
      return 0;
    }
    return Number(linked ?? 0);
  });
