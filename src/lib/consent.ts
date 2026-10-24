/**
 * Consent evidence — one append-only row per distinct consent, written at
 * the moment it happens. Marketing consent is always its own record.
 */

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { COUNTRY } from "@/lib/legal";

export type ConsentKind = Database["public"]["Enums"]["consent_kind"];
export type ConsentSubject = Database["public"]["Enums"]["consent_subject_type"];

export type ConsentInput = {
  subjectType: ConsentSubject;
  subjectRef?: string;
  bookingReference?: string;
  partnerReference?: string;
  legalEntityId?: string | null;
  documentType?: string;
  documentVersion?: number | null;
  consentKind: ConsentKind;
  value: boolean;
};

/** Non-reversible fingerprint of the user agent; never the raw string. */
export async function hashUserAgent(): Promise<string> {
  if (typeof window === "undefined" || !window.crypto?.subtle) return "";
  try {
    const bytes = new TextEncoder().encode(window.navigator.userAgent);
    const digest = await window.crypto.subtle.digest("SHA-256", bytes);
    return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch {
    return "";
  }
}

export async function recordConsents(inputs: ConsentInput[]): Promise<void> {
  if (inputs.length === 0) return;
  const userAgentHash = await hashUserAgent();
  const rows = inputs.map((input) => ({
    subject_type: input.subjectType,
    subject_ref: input.subjectRef ?? "",
    booking_reference: input.bookingReference ?? "",
    partner_reference: input.partnerReference ?? "",
    country: COUNTRY,
    legal_entity_id: input.legalEntityId ?? null,
    document_type: input.documentType ?? "",
    document_version: input.documentVersion ?? null,
    consent_kind: input.consentKind,
    value: input.value,
    user_agent_hash: userAgentHash,
  }));
  const { error } = await supabase.from("consent_records").insert(rows);
  if (error) throw new Error(error.message);
}
