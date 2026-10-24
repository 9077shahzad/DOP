import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { Lang } from "@/i18n/config";
import { COUNTRY, docLanguage, type DocType } from "@/lib/legal";

export type LegalEntity = Database["public"]["Tables"]["legal_entities"]["Row"];
export type LegalDocument = Database["public"]["Tables"]["legal_documents"]["Row"];

/**
 * Public-facing company data. Banking columns (iban, qr_iban, bank_name) are
 * deliberately absent: the table itself is staff-only and the public site reads
 * the imprint fields through `public_legal_entity()`.
 */
export type PublicLegalEntity = Pick<
  LegalEntity,
  | "id"
  | "country"
  | "legal_name"
  | "register_number"
  | "vat_number"
  | "address_line"
  | "postal_code"
  | "city"
  | "canton"
  | "email"
  | "phone"
  | "currency"
  | "status"
>;

/** The single Swiss legal entity as shown publicly — imprint fields only. */
export async function fetchLegalEntity(): Promise<PublicLegalEntity | null> {
  const { data, error } = await supabase.rpc("public_legal_entity", { _country: COUNTRY });
  if (error) throw new Error(error.message);
  const rows = (data as unknown as PublicLegalEntity[] | null) ?? [];
  return rows[0] ?? null;
}

/** Full row including banking details — staff only, enforced by RLS. */
export async function fetchLegalEntityAdmin(): Promise<LegalEntity | null> {
  const { data, error } = await supabase
    .from("legal_entities")
    .select("*")
    .eq("country", COUNTRY)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}


/**
 * Newest published version. Drafts are never served publicly: translated
 * drafts await content approval, and until then the German published text
 * stands in.
 */
function pick(rows: LegalDocument[]): LegalDocument | null {
  const published = rows
    .filter((r) => r.status === "published")
    .sort((a, b) => b.version - a.version);
  return published[0] ?? null;
}

export async function fetchDocument(lang: Lang, docType: DocType): Promise<LegalDocument | null> {
  const language = docLanguage(lang);
  const { data, error } = await supabase
    .from("legal_documents")
    .select("*")
    .eq("country", COUNTRY)
    .eq("doc_type", docType)
    .in("language", [language, "de"]);
  if (error) throw new Error(error.message);
  const rows = data ?? [];
  return pick(rows.filter((r) => r.language === language)) ?? pick(rows);
}

export async function fetchDocumentIndex(lang: Lang): Promise<LegalDocument[]> {
  const language = docLanguage(lang);
  const { data, error } = await supabase
    .from("legal_documents")
    .select("*")
    .eq("country", COUNTRY)
    .in("language", [language, "de"])
    .order("doc_type");
  if (error) throw new Error(error.message);
  const byType = new Map<string, LegalDocument>();
  for (const row of data ?? []) {
    if (row.status !== "published") continue;
    const current = byType.get(row.doc_type);
    const better =
      !current ||
      (row.language === language && current.language !== language) ||
      (row.language === current.language && row.version > current.version);
    if (better) byType.set(row.doc_type, row);
  }
  return [...byType.values()];
}


export async function saveLegalEntity(
  id: string,
  patch: Database["public"]["Tables"]["legal_entities"]["Update"],
): Promise<void> {
  const { error } = await supabase.from("legal_entities").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
}
