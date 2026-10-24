/**
 * Partner Network — stage 4 data access.
 * Every read and write goes through RLS; the internal fields (status, score,
 * classification, account manager, document review, service approval) are
 * written only through the staff-gated SECURITY DEFINER functions.
 */

import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import type { PartnerStatus } from "@/lib/partner-admin";

export type PartnerRow = Tables<"partners">;
export type PartnerServiceRow = Tables<"partner_services">;
export type PartnerContactRow = Tables<"partner_contacts">;
export type PartnerWorkforceRow = Tables<"partner_workforce">;
export type PartnerFleetRow = Tables<"partner_fleet">;
export type PartnerDocumentRow = Tables<"partner_documents">;
export type PartnerNoteRow = Tables<"partner_notes">;
export type PartnerRatingRow = Tables<"partner_ratings">;
export type PartnerHistoryRow = Tables<"partner_status_history">;
export type PartnerCategoryRow = Tables<"partner_categories">;
export type ProfileRow = Tables<"profiles">;

export async function isStaff(): Promise<boolean> {
  const { data, error } = await supabase.rpc("is_staff");
  if (error) throw error;
  return Boolean(data);
}

/**
 * Console access: admin/management plus the operational roles (dispatch,
 * sales, operations, finance). What each of them actually sees inside is
 * still decided by row level security, not by this check.
 */
export async function canOpenConsole(): Promise<boolean> {
  const [staff, dispatch, finance] = await Promise.all([
    supabase.rpc("is_staff"),
    supabase.rpc("is_dispatcher"),
    supabase.rpc("is_finance"),
  ]);
  if (staff.error) throw staff.error;
  return Boolean(staff.data) || Boolean(dispatch.data) || Boolean(finance.data);
}


/* --------------------------------------------------------------------- list */

export type PartnerFilters = {
  status: PartnerStatus | "all";
  categoryId: string;
  city: string;
  country: string;
  search: string;
};

export type PartnerListItem = PartnerRow & {
  partner_services: Array<{ category_id: string }>;
  partner_documents: Array<{ status: string; expires_on: string | null }>;
  partner_internal: Array<{ internal_score: number | null; classification: string | null }>;
  internal_score: number | null;
  submitted_at: string | null;
};

const LIST_SELECT =
  "*, partner_services(category_id), partner_documents(status, expires_on), partner_internal(internal_score, classification)";

export async function fetchPartnerList(filters: PartnerFilters): Promise<PartnerListItem[]> {
  let query = supabase
    .from("partners")
    .select(LIST_SELECT)
    .order("created_at", { ascending: false })
    .limit(300);

  if (filters.status !== "all") query = query.eq("status", filters.status);
  if (filters.city.trim()) query = query.ilike("city", `%${filters.city.trim()}%`);
  if (filters.country.trim()) query = query.eq("country", filters.country.trim().toUpperCase());
  const term = filters.search.trim();
  if (term) {
    const safe = term.replace(/[%,()]/g, " ");
    query = query.or(
      `legal_name.ilike.%${safe}%,trading_name.ilike.%${safe}%,reference.ilike.%${safe}%`,
    );
  }
  if (filters.categoryId) {
    const { data: ids, error: idError } = await supabase
      .from("partner_services")
      .select("partner_id")
      .eq("category_id", filters.categoryId);
    if (idError) throw idError;
    const list = [...new Set((ids ?? []).map((r) => r.partner_id))];
    if (list.length === 0) return [];
    query = query.in("id", list);
  }

  const { data, error } = await query;
  if (error) throw error;
  return ((data ?? []) as unknown as PartnerListItem[]).map((row) => ({
    ...row,
    submitted_at: null,
    internal_score: row.partner_internal?.[0]?.internal_score ?? null,
  }));
}

/** Status counts read from the database, not from a loaded page. */
export async function fetchStatusCounts(): Promise<Record<string, number>> {
  const { data, error } = await supabase.from("partners").select("status").limit(2000);
  if (error) throw error;
  const counts: Record<string, number> = {};
  for (const row of data ?? []) counts[row.status] = (counts[row.status] ?? 0) + 1;
  return counts;
}

export async function fetchCategories(): Promise<PartnerCategoryRow[]> {
  const { data, error } = await supabase
    .from("partner_categories")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

/* ------------------------------------------------------------------- detail */

/** Internal-only assessment fields live in partner_internal (staff-only RLS). */
export type PartnerInternalRow = {
  partner_id: string;
  internal_score: number | null;
  classification: string | null;
  account_manager_id: string | null;
};

export type PartnerDetail = {
  partner: PartnerRow;
  internal: PartnerInternalRow | null;
  contacts: PartnerContactRow[];
  services: PartnerServiceRow[];
  workforce: PartnerWorkforceRow[];
  fleet: PartnerFleetRow[];
  documents: PartnerDocumentRow[];
  notes: PartnerNoteRow[];
  ratings: PartnerRatingRow[];
  history: PartnerHistoryRow[];
  categories: PartnerCategoryRow[];
  staff: ProfileRow[];
};

export async function fetchPartnerDetail(reference: string): Promise<PartnerDetail | null> {
  const { data: partner, error } = await supabase
    .from("partners")
    .select("*")
    .eq("reference", reference)
    .maybeSingle();
  if (error) throw error;
  if (!partner) return null;
  const id = partner.id;

  const [contacts, services, workforce, fleet, documents, notes, ratings, history, categories, staff] =
    await Promise.all([
      supabase.from("partner_contacts").select("*").eq("partner_id", id),
      supabase.from("partner_services").select("*").eq("partner_id", id),
      supabase.from("partner_workforce").select("*").eq("partner_id", id),
      supabase.from("partner_fleet").select("*").eq("partner_id", id),
      supabase.from("partner_documents").select("*").eq("partner_id", id).order("uploaded_at"),
      supabase.from("partner_notes").select("*").eq("partner_id", id).order("created_at", { ascending: false }),
      supabase.from("partner_ratings").select("*").eq("partner_id", id),
      supabase
        .from("partner_status_history")
        .select("*")
        .eq("partner_id", id)
        .order("created_at", { ascending: false }),
      supabase.from("partner_categories").select("*").order("sort_order"),
      supabase.from("profiles").select("*").eq("role", "zuegelwerk_admin"),
    ]);

  const first = [contacts, services, workforce, fleet, documents, notes, ratings, history, categories, staff].find(
    (r) => r.error,
  );
  if (first?.error) throw first.error;

  const { data: internal } = await supabase
    .from("partner_internal")
    .select("partner_id, internal_score, classification, account_manager_id")
    .eq("partner_id", id)
    .maybeSingle();

  return {
    partner,
    internal: (internal as PartnerInternalRow | null) ?? null,
    contacts: contacts.data ?? [],
    services: services.data ?? [],
    workforce: workforce.data ?? [],
    fleet: fleet.data ?? [],
    documents: documents.data ?? [],
    notes: notes.data ?? [],
    ratings: ratings.data ?? [],
    history: history.data ?? [],
    categories: categories.data ?? [],
    staff: staff.data ?? [],
  };
}

/* ---------------------------------------------------------------- mutations */

/** Status changes always go through the function so the audit row is written
 *  in the same transaction. Never UPDATE partners.status from the client. */
export async function changePartnerStatus(
  partnerId: string,
  next: PartnerStatus,
  note: string,
): Promise<void> {
  const { error } = await supabase.rpc("set_partner_status", {
    _partner_id: partnerId,
    _new_status: next,
    _note: note,
  });
  if (error) throw error;
}

export async function reviewDocument(
  documentId: string,
  status: "uploaded" | "under_review" | "approved" | "rejected" | "expired",
  reason: string,
  expiresOn: string | null,
): Promise<void> {
  const { error } = await supabase.rpc("review_partner_document", {
    _document_id: documentId,
    _status: status,
    _reason: reason,
    ...(expiresOn ? { _expires_on: expiresOn } : {}),
  });
  if (error) throw error;
}

export async function saveAssessment(
  partnerId: string,
  ratings: Array<{ criterion: string; score: number; max_score: number; note: string }>,
  classification: string,
): Promise<number> {
  const { data, error } = await supabase.rpc("set_partner_assessment", {
    _partner_id: partnerId,
    _ratings: ratings,
    _classification: classification,
  });
  if (error) throw error;
  return Number(data ?? 0);
}

export async function assignAccountManager(partnerId: string, managerId: string | null) {
  const { error } = await supabase.rpc("set_partner_account_manager", {
    _partner_id: partnerId,
    // null clears the assignment; the generated types omit the nullable variant
    _manager_id: managerId as unknown as string,
  });
  if (error) throw error;
}

export async function setServiceApproval(serviceId: string, approved: boolean, cities: string[]) {
  const { error } = await supabase.rpc("set_partner_service_approval", {
    _service_id: serviceId,
    _approved: approved,
    _cities: cities,
  });
  if (error) throw error;
}

export async function addNote(partnerId: string, body: string, actorId: string) {
  const { error } = await supabase
    .from("partner_notes")
    .insert({ partner_id: partnerId, body, actor_id: actorId });
  if (error) throw error;
}

/** Short-lived signed URL (60s) from the private bucket. Never a public URL. */
export const SIGNED_URL_TTL_SECONDS = 60;

export async function signedDocumentUrl(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from("partner-documents")
    .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);
  if (error) throw error;
  if (!data?.signedUrl) throw new Error("no signed url");
  return data.signedUrl;
}
