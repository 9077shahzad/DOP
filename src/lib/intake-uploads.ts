/**
 * Uploads from the public quotation wizard.
 *
 * The lead does not exist yet while the customer is filling in the form, so
 * files go into the private attachment bucket under a folder that belongs to
 * this submission (`intake/<draftId>/…`). Nobody can read that bucket without
 * staff rights. After the lead is created, attach_lead_files() links exactly
 * the files that live under that folder — nothing else can be claimed.
 */

import { supabase } from "@/integrations/supabase/client";
import type { UploadKind, UploadRef } from "@/lib/pricing";

const BUCKET = "lead-attachments";
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
export const ACCEPTED_UPLOADS = "image/*,video/*,application/pdf";

export function newDraftId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `d${Date.now()}${Math.random().toString(36).slice(2, 10)}`;
}

/** Thrown when a file is refused before it leaves the browser. */
export class UploadRejected extends Error {
  constructor(public reason: "too_large" | "type") {
    super(reason);
    this.name = "UploadRejected";
  }
}

function safeName(name: string): string {
  return name.replace(/[^\w.-]+/g, "_").slice(-80);
}

export async function uploadIntakeFile(draftId: string, kind: UploadKind, file: File): Promise<UploadRef> {
  if (file.size > MAX_UPLOAD_BYTES) throw new UploadRejected("too_large");
  const ok = file.type.startsWith("image/") || file.type.startsWith("video/") || file.type === "application/pdf";
  if (!ok) throw new UploadRejected("type");

  const path = `intake/${draftId}/${kind}-${Date.now()}-${safeName(file.name)}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type || "application/octet-stream",
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

/** Links the uploaded files to the created lead. Returns how many were linked. */
export async function attachUploads(reference: string, draftId: string, uploads: UploadRef[]): Promise<number> {
  if (uploads.length === 0) return 0;
  const { data, error } = await supabase.rpc("attach_lead_files", {
    _reference: reference,
    _draft: draftId,
    _files: uploads as never,
  });
  if (error) throw error;
  return Number(data ?? 0);
}
