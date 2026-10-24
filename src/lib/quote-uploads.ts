/**
 * Browser side of the customer document area on an offer page.
 *
 * Files go into the private attachment bucket under this session's own folder
 * (`intake/<draftId>/…`). Nobody can read that bucket without staff rights.
 * Only PDF, JPG and PNG are accepted, and only up to the intake size limit.
 */

import { supabase } from "@/integrations/supabase/client";
import { MAX_UPLOAD_BYTES, UploadRejected, newDraftId } from "@/lib/intake-uploads";
import type { QuoteFileInput } from "@/lib/quote-uploads.functions";

const BUCKET = "lead-attachments";

/** What a customer may attach to an offer. Rental contracts are not asked for. */
export const QUOTE_UPLOAD_KINDS = ["photo", "inventory"] as const;
export type QuoteUploadKind = (typeof QUOTE_UPLOAD_KINDS)[number];

export const QUOTE_ACCEPTED_TYPES = ["application/pdf", "image/jpeg", "image/png"];
export const QUOTE_ACCEPT_ATTR = ".pdf,.jpg,.jpeg,.png";

export { MAX_UPLOAD_BYTES, UploadRejected, newDraftId };

function safeName(name: string): string {
  return name.replace(/[^\w.-]+/g, "_").slice(-80);
}

export async function uploadQuoteFile(
  draftId: string,
  kind: QuoteUploadKind,
  file: File,
): Promise<QuoteFileInput> {
  if (file.size > MAX_UPLOAD_BYTES) throw new UploadRejected("too_large");
  if (!QUOTE_ACCEPTED_TYPES.includes(file.type)) throw new UploadRejected("type");

  const path = `intake/${draftId}/${kind}-${Date.now()}-${safeName(file.name)}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) throw error;

  return {
    storage_path: path,
    file_name: file.name,
    mime_type: file.type,
    size_bytes: file.size,
    kind,
  };
}
