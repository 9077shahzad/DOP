import { useCallback, useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";
import {
  PARTNER_GROUPS,
  type EntityType,
  type Ownership,
  type PartnerGroup,
  type PricingMethod,
  type SkillLevel,
} from "@/lib/partner";

export type CategoryRow = {
  id: string;
  key: string;
  group: PartnerGroup;
  label_de: string;
  label_fr: string;
  label_it: string;
  label_en: string;
  sort_order: number;
};

export type ProfileForm = {
  entity_type: EntityType;
  legal_name: string;
  trading_name: string;
  country: string;
  city: string;
  areas_served: string[];
  year_established: string;
  website: string;
  company_size: string;
  employee_count: string;
  technician_count: string;
  vehicle_count: string;
  registration_number: string;
  vat_number: string;
  address: string;
  workforce_notes: string;
};

export type ContactForm = {
  id: string | null;
  full_name: string;
  position: string;
  mobile: string;
  whatsapp: string;
  email: string;
  alternative_contact: string;
  preferred_language: string;
};

export type ServiceForm = {
  category_id: string;
  coverage_cities: string[];
  available_manpower: string;
  emergency_available: boolean;
  available_24_7: boolean;
  pricing_method: PricingMethod;
  callout_charge: string;
  hourly_rate: string;
  daily_rate: string;
  monthly_rate: string;
  transport_rate: string;
  notes: string;
};

export type WorkforceForm = {
  category: string;
  worker_count: string;
  skill_level: SkillLevel;
  mobilisation_days: string;
  accommodation_provided: boolean;
  transport_provided: boolean;
  ppe_provided: boolean;
};

export type FleetForm = {
  vehicle_type: string;
  vehicle_count: string;
  capacity: string;
  model_year_from: string;
  model_year_to: string;
  ownership: Ownership;
  driver_included: boolean;
  coverage_area: string;
  intercity: boolean;
  available_24_7: boolean;
  gps_tracking: boolean;
};

export type DocumentRow = {
  id: string;
  doc_type: string;
  file_name: string;
  storage_path: string;
  size_bytes: number;
  status: string;
  expires_on: string | null;
};

export type PartnerRow = {
  id: string;
  reference: string;
  status: string;
};

const num = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
};
const int = (value: string) => {
  const parsed = num(value);
  return parsed === null ? null : Math.round(parsed);
};
const str = (value: number | null | undefined) => (value === null || value === undefined ? "" : String(value));

export const emptyProfile: ProfileForm = {
  entity_type: "company",
  legal_name: "",
  trading_name: "",
  country: "CH",
  city: "",
  areas_served: [],
  year_established: "",
  website: "",
  company_size: "",
  employee_count: "",
  technician_count: "",
  vehicle_count: "",
  registration_number: "",
  vat_number: "",
  address: "",
  workforce_notes: "",
};

const emptyContact: ContactForm = {
  id: null,
  full_name: "",
  position: "",
  mobile: "",
  whatsapp: "",
  email: "",
  alternative_contact: "",
  preferred_language: "de",
};

function groupsKey(partnerId: string) {
  return `mf.partner.groups.${partnerId}`;
}

/**
 * Loads the caller's draft row, creating it once. Deduplicated per user so a
 * double-mounted effect (StrictMode, remount) can never insert two drafts.
 */
const draftRequests = new Map<
  string,
  Promise<{ rows: Record<string, unknown>[] | null; error: string | null }>
>();

function ensureDraft(userId: string) {
  const pending = draftRequests.get(userId);
  if (pending) return pending;

  const request = (async () => {
    const existing = await supabase
      .from("partners")
      .select("*")
      .eq("created_by", userId)
      .order("created_at", { ascending: true })
      .limit(1);
    if (existing.error) return { rows: null, error: existing.error.message };
    if (existing.data && existing.data.length > 0) {
      return { rows: existing.data as Record<string, unknown>[], error: null };
    }

    const insert = await supabase
      .from("partners")
      .insert({ created_by: userId, legal_name: "", country: "CH" })
      .select("*")
      .limit(1);
    if (insert.error) return { rows: null, error: insert.error.message };
    return { rows: insert.data as Record<string, unknown>[], error: null };
  })();

  draftRequests.set(userId, request);
  return request;
}

export function useApplication(user: User) {

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [partner, setPartner] = useState<PartnerRow | null>(null);
  const [categories, setCategories] = useState<CategoryRow[]>([]);

  const [groups, setGroups] = useState<PartnerGroup[]>([]);
  const [profile, setProfile] = useState<ProfileForm>(emptyProfile);
  const [contact, setContact] = useState<ContactForm>(emptyContact);
  const [services, setServices] = useState<ServiceForm[]>([]);
  const [workforce, setWorkforce] = useState<WorkforceForm[]>([]);
  const [fleet, setFleet] = useState<FleetForm[]>([]);
  const [documents, setDocuments] = useState<DocumentRow[]>([]);

  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [saveError, setSaveError] = useState(false);

  const state = useRef({ groups, profile, contact, services, workforce, fleet, partner });
  state.current = { groups, profile, contact, services, workforce, fleet, partner };

  const loadDocuments = useCallback(async (partnerId: string) => {

    const { data } = await supabase
      .from("partner_documents")
      .select("id, doc_type, file_name, storage_path, size_bytes, status, expires_on")
      .eq("partner_id", partnerId)
      .order("uploaded_at", { ascending: true });
    setDocuments((data ?? []) as DocumentRow[]);
  }, []);

  useEffect(() => {
    let alive = true;

    async function boot() {
      setLoading(true);
      setLoadError(null);

      const { data: cats } = await supabase
        .from("partner_categories")
        .select("id, key, group, label_de, label_fr, label_it, label_en, sort_order")
        .eq("active", true)
        .order("sort_order");
      if (alive) setCategories((cats ?? []) as CategoryRow[]);

      const { rows, error } = await ensureDraft(user.id);

      if (error) {
        if (alive) {
          setLoadError(error);
          setLoading(false);
        }
        return;
      }


      const row = rows?.[0] as Record<string, unknown> | undefined;
      if (!row || !alive) return;

      const partnerId = row["id"] as string;
      setPartner({
        id: partnerId,
        reference: row["reference"] as string,
        status: row["status"] as string,
      });
      setProfile({
        entity_type: (row["entity_type"] as EntityType) ?? "company",
        legal_name: (row["legal_name"] as string) ?? "",
        trading_name: (row["trading_name"] as string) ?? "",
        country: (row["country"] as string) || "CH",
        city: (row["city"] as string) ?? "",
        areas_served: ((row["areas_served"] as string[]) ?? []).filter(Boolean),
        year_established: str(row["year_established"] as number | null),
        website: (row["website"] as string) ?? "",
        company_size: (row["company_size"] as string) ?? "",
        employee_count: str(row["employee_count"] as number | null),
        technician_count: str(row["technician_count"] as number | null),
        vehicle_count: str(row["vehicle_count"] as number | null),
        registration_number: (row["registration_number"] as string) ?? "",
        vat_number: (row["vat_number"] as string) ?? "",
        address: (row["address"] as string) ?? "",
        workforce_notes: (row["workforce_notes"] as string) ?? "",
      });

      const [contactRes, serviceRes, workforceRes, fleetRes] = await Promise.all([
        supabase.from("partner_contacts").select("*").eq("partner_id", partnerId).limit(1),
        supabase.from("partner_services").select("*").eq("partner_id", partnerId),
        supabase.from("partner_workforce").select("*").eq("partner_id", partnerId),
        supabase.from("partner_fleet").select("*").eq("partner_id", partnerId),
      ]);
      if (!alive) return;

      const c = contactRes.data?.[0] as Record<string, unknown> | undefined;
      setContact(
        c
          ? {
              id: c["id"] as string,
              full_name: (c["full_name"] as string) ?? "",
              position: (c["position"] as string) ?? "",
              mobile: (c["mobile"] as string) ?? "",
              whatsapp: (c["whatsapp"] as string) ?? "",
              email: (c["email"] as string) ?? user.email ?? "",
              alternative_contact: (c["alternative_contact"] as string) ?? "",
              preferred_language: (c["preferred_language"] as string) ?? "de",
            }
          : { ...emptyContact, email: user.email ?? "" },
      );

      const serviceRows = (serviceRes.data ?? []) as Record<string, unknown>[];
      setServices(
        serviceRows.map((s) => ({
          category_id: s["category_id"] as string,
          coverage_cities: ((s["coverage_cities"] as string[]) ?? []).filter(Boolean),
          available_manpower: str(s["available_manpower"] as number | null),
          emergency_available: Boolean(s["emergency_available"]),
          available_24_7: Boolean(s["available_24_7"]),
          pricing_method: (s["pricing_method"] as PricingMethod) ?? "quotation",
          callout_charge: str(s["callout_charge"] as number | null),
          hourly_rate: str(s["hourly_rate"] as number | null),
          daily_rate: str(s["daily_rate"] as number | null),
          monthly_rate: str(s["monthly_rate"] as number | null),
          transport_rate: str(s["transport_rate"] as number | null),
          notes: (s["notes"] as string) ?? "",
        })),
      );

      setWorkforce(
        ((workforceRes.data ?? []) as Record<string, unknown>[]).map((w) => ({
          category: (w["category"] as string) ?? "",
          worker_count: str(w["worker_count"] as number | null),
          skill_level: (w["skill_level"] as SkillLevel) ?? "skilled",
          mobilisation_days: str(w["mobilisation_days"] as number | null),
          accommodation_provided: Boolean(w["accommodation_provided"]),
          transport_provided: Boolean(w["transport_provided"]),
          ppe_provided: Boolean(w["ppe_provided"]),
        })),
      );

      setFleet(
        ((fleetRes.data ?? []) as Record<string, unknown>[]).map((f) => ({
          vehicle_type: (f["vehicle_type"] as string) ?? "van",
          vehicle_count: str(f["vehicle_count"] as number | null),
          capacity: (f["capacity"] as string) ?? "",
          model_year_from: str(f["model_year_from"] as number | null),
          model_year_to: str(f["model_year_to"] as number | null),
          ownership: (f["ownership"] as Ownership) ?? "owned",
          driver_included: Boolean(f["driver_included"]),
          coverage_area: (f["coverage_area"] as string) ?? "",
          intercity: Boolean(f["intercity"]),
          available_24_7: Boolean(f["available_24_7"]),
          gps_tracking: Boolean(f["gps_tracking"]),
        })),
      );

      // Groups are derived from the saved services; the local hint only helps
      // before any service has been chosen.
      const catById = new Map((cats ?? []).map((k) => [k.id as string, k.group as PartnerGroup]));
      const derived = new Set<PartnerGroup>();
      serviceRows.forEach((s) => {
        const g = catById.get(s["category_id"] as string);
        if (g) derived.add(g);
      });
      if (derived.size === 0 && typeof window !== "undefined") {
        try {
          const stored = window.localStorage.getItem(groupsKey(partnerId));
          (JSON.parse(stored ?? "[]") as string[]).forEach((g) => {
            if ((PARTNER_GROUPS as readonly string[]).includes(g)) derived.add(g as PartnerGroup);
          });
        } catch {
          /* ignore */
        }
      }
      setGroups([...derived]);

      await loadDocuments(partnerId);
      if (alive) setLoading(false);
    }

    void boot();
    return () => {
      alive = false;
    };
  }, [user.id, user.email, loadDocuments]);

  const setGroupsPersisted = useCallback(
    (next: PartnerGroup[]) => {
      setGroups(next);
      const id = state.current.partner?.id;
      if (id && typeof window !== "undefined") {
        try {
          window.localStorage.setItem(groupsKey(id), JSON.stringify(next));
        } catch {
          /* ignore */
        }
      }
    },
    [],
  );

  /** Writes the whole draft back to the partner row and its child tables. */
  const save = useCallback(async () => {
    const current = state.current;
    if (!current.partner) return false;
    const partnerId = current.partner.id;
    setSaving(true);
    setSaveError(false);

    const p = current.profile;
    const individual = p.entity_type === "individual";

    const { error } = await supabase
      .from("partners")
      .update({
        entity_type: p.entity_type,
        legal_name: p.legal_name,
        trading_name: p.trading_name,
        country: p.country,
        city: p.city,
        areas_served: p.areas_served,
        year_established: int(p.year_established),
        website: p.website,
        company_size: individual ? "" : p.company_size,
        employee_count: individual ? null : int(p.employee_count),
        technician_count: int(p.technician_count),
        vehicle_count: int(p.vehicle_count),
        registration_number: individual ? "" : p.registration_number,
        vat_number: individual ? "" : p.vat_number,
        address: p.address,
        workforce_notes: p.workforce_notes,
      })
      .eq("id", partnerId);

    if (error) {
      setSaving(false);
      setSaveError(true);
      return false;
    }

    const c = current.contact;
    const contactPayload = {
      partner_id: partnerId,
      full_name: c.full_name,
      position: c.position,
      mobile: c.mobile || null,
      whatsapp: c.whatsapp || null,
      email: c.email || null,
      alternative_contact: c.alternative_contact || null,
      preferred_language: c.preferred_language,
      is_primary: true,
    };
    const contactRes = c.id
      ? await supabase.from("partner_contacts").update(contactPayload).eq("id", c.id)
      : await supabase.from("partner_contacts").insert(contactPayload).select("id").limit(1);
    if (contactRes.error) {
      setSaving(false);
      setSaveError(true);
      return false;
    }
    if (!c.id && "data" in contactRes) {
      const newId = (contactRes.data?.[0] as { id: string } | undefined)?.id ?? null;
      if (newId) setContact((prev) => ({ ...prev, id: newId }));
    }

    const results = await Promise.all([
      supabase.from("partner_services").delete().eq("partner_id", partnerId),
      supabase.from("partner_workforce").delete().eq("partner_id", partnerId),
      supabase.from("partner_fleet").delete().eq("partner_id", partnerId),
    ]);
    if (results.some((r) => r.error)) {
      setSaving(false);
      setSaveError(true);
      return false;
    }

    const inserts: PromiseLike<{ error: unknown }>[] = [];
    if (current.services.length) {
      inserts.push(
        supabase.from("partner_services").insert(
          current.services.map((s) => ({
            partner_id: partnerId,
            category_id: s.category_id,
            coverage_cities: s.coverage_cities,
            available_manpower: int(s.available_manpower),
            emergency_available: s.emergency_available,
            available_24_7: s.available_24_7,
            pricing_method: s.pricing_method,
            callout_charge: num(s.callout_charge),
            hourly_rate: num(s.hourly_rate),
            daily_rate: num(s.daily_rate),
            monthly_rate: num(s.monthly_rate),
            transport_rate: num(s.transport_rate),
            notes: s.notes,
          })),
        ),
      );
    }
    if (current.workforce.length) {
      inserts.push(
        supabase.from("partner_workforce").insert(
          current.workforce.map((w) => ({
            partner_id: partnerId,
            category: w.category,
            worker_count: int(w.worker_count) ?? 0,
            skill_level: w.skill_level,
            mobilisation_days: int(w.mobilisation_days),
            accommodation_provided: w.accommodation_provided,
            transport_provided: w.transport_provided,
            ppe_provided: w.ppe_provided,
          })),
        ),
      );
    }
    if (current.fleet.length) {
      inserts.push(
        supabase.from("partner_fleet").insert(
          current.fleet.map((f) => ({
            partner_id: partnerId,
            vehicle_type: f.vehicle_type,
            vehicle_count: int(f.vehicle_count) ?? 0,
            capacity: f.capacity || null,
            model_year_from: int(f.model_year_from),
            model_year_to: int(f.model_year_to),
            ownership: f.ownership,
            driver_included: f.driver_included,
            coverage_area: f.coverage_area,
            intercity: f.intercity,
            available_24_7: f.available_24_7,
            gps_tracking: f.gps_tracking,
          })),
        ),
      );
    }

    const insertResults = await Promise.all(inserts);
    setSaving(false);
    if (insertResults.some((r) => r.error)) {
      setSaveError(true);
      return false;
    }
    setSavedAt(Date.now());
    return true;
  }, []);

  const submit = useCallback(async () => {
    const partnerId = state.current.partner?.id;
    if (!partnerId) return { ok: false as const, message: "no draft" };
    const saved = await save();
    if (!saved) return { ok: false as const, message: "save failed" };
    const { error } = await supabase.rpc("submit_partner_application", { _note: "" });
    if (error) return { ok: false as const, message: error.message };
    const { data } = await supabase
      .from("partners")
      .select("id, reference, status")
      .eq("id", partnerId)
      .limit(1);
    const row = data?.[0] as PartnerRow | undefined;
    if (row) setPartner(row);
    return { ok: true as const, reference: row?.reference ?? "" };
  }, [save]);

  return {
    loading,
    loadError,
    partner,
    categories,
    groups,
    setGroups: setGroupsPersisted,
    profile,
    setProfile,
    contact,
    setContact,
    services,
    setServices,
    workforce,
    setWorkforce,
    fleet,
    setFleet,
    documents,
    reloadDocuments: () => (partner ? loadDocuments(partner.id) : Promise.resolve()),
    save,
    submit,
    saving,
    savedAt,
    saveError,
  };
}

export type Application = ReturnType<typeof useApplication>;
