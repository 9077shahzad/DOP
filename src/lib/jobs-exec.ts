/**
 * Job execution — stage B data access.
 *
 * Every write goes through a SECURITY DEFINER function: the status timeline,
 * the change-order audit row and the cancellation calculation are written in
 * the same transaction as the change itself, and cost figures are only present
 * in the payload when can_see_costs() allows it.
 */

import { supabase } from "@/integrations/supabase/client";
import type { Enums, Tables } from "@/integrations/supabase/types";

export type JobExec = Tables<"jobs_execution">;
export type JobStatus = Enums<"job_exec_status">;
export type JobEvent = Tables<"job_events_exec">;
export type JobPhoto = Tables<"job_photos">;
export type PhotoPhase = Enums<"job_photo_phase">;
export type CancelActor = Enums<"cancel_actor">;

export const JOB_STATUSES: JobStatus[] = [
  "scheduled",
  "assigned",
  "en_route",
  "on_site",
  "in_progress",
  "loading",
  "in_transit",
  "unloading",
  "paused",
  "completed",
  "verified",
  "cancelled",
];

/** What the crew may do next — the database enforces the same transitions. */
export const NEXT_STATUS: Partial<Record<JobStatus, JobStatus[]>> = {
  scheduled: ["en_route", "on_site"],
  assigned: ["en_route", "on_site"],
  en_route: ["on_site"],
  on_site: ["in_progress"],
  in_progress: ["loading", "paused", "completed"],
  loading: ["in_transit", "paused"],
  in_transit: ["unloading", "paused"],
  unloading: ["completed", "paused"],
  paused: ["in_progress", "loading", "in_transit", "unloading", "completed"],
  completed: ["verified"],
};

/** German labels — the enum values themselves stay database identifiers. */
export const JOB_STATUS_LABEL: Record<JobStatus, string> = {
  scheduled: "Geplant",
  assigned: "Zugeteilt",
  en_route: "Unterwegs",
  on_site: "Angekommen",
  in_progress: "Einsatz gestartet",
  loading: "Beladen",
  in_transit: "Transport",
  unloading: "Entladen",
  paused: "Pause",
  completed: "Abgeschlossen",
  verified: "Freigegeben",
  cancelled: "Storniert",
};

export type MaterialRow = {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  supplierCost: number | null;
  customerPrice: number | null;
  photoPath: string;
  status: Enums<"job_material_status">;
  changeOrderId: string | null;
  createdAt: string;
  costsVisible: boolean;
};

export type ChangeOrderRow = {
  id: string;
  reference: string;
  description: string;
  reason: string;
  estimatedHours: number | null;
  estimatedMaterials: number | null;
  partnerCost: number | null;
  customerPrice: number | null;
  status: Enums<"change_order_status">;
  decisionChannel: string;
  decidedName: string;
  customerDecidedAt: string | null;
  approvalRequestId: string | null;
  publicToken: string;
  tokenExpiresAt: string | null;
  createdAt: string;
  costsVisible: boolean;
};

function num(value: unknown): number | null {
  return value == null ? null : Number(value);
}

/* --------------------------------------------------------------- job reads */

export async function fetchJobs(scope: "open" | "all" | "archived" = "open", includeTest = false): Promise<JobExec[]> {
  if (scope === "archived") {
    const { data, error } = await supabase.from("jobs_execution").select("*")
      .not("archived_at", "is", null).order("archived_at", { ascending: false }).limit(200);
    if (error) throw error;
    return data ?? [];
  }
  let query = supabase
    .from("jobs_execution")
    .select("*")
    .order("scheduled_start", { ascending: true })
    .limit(200)
    // Deleted (archived) orders leave every operational list.
    .is("archived_at", null);
  // Test rows stay out of operational lists unless an admin opts in (visibility only).
  if (!includeTest) query = query.eq("is_test", false);
  if (scope === "open") query = query.not("status", "in", "(verified,cancelled)");
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function fetchJob(id: string): Promise<JobExec | null> {
  const { data, error } = await supabase
    .from("jobs_execution")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export async function fetchJobEvents(jobId: string): Promise<JobEvent[]> {
  const { data, error } = await supabase
    .from("job_events_exec")
    .select("*")
    .eq("job_id", jobId)
    .order("created_at", { ascending: true });
  if (error) return [];
  return data ?? [];
}

export async function fetchJobPhotos(jobId: string): Promise<JobPhoto[]> {
  const { data, error } = await supabase
    .from("job_photos")
    .select("*")
    .eq("job_id", jobId)
    .order("created_at", { ascending: true });
  if (error) return [];
  return data ?? [];
}

export async function fetchMaterials(jobId: string): Promise<MaterialRow[]> {
  const { data, error } = await supabase.rpc("job_materials_for", { _job_id: jobId });
  if (error) return [];
  return (data ?? []).map((r) => ({
    id: r.id,
    description: r.description,
    quantity: Number(r.quantity ?? 0),
    unit: r.unit,
    supplierCost: num(r.supplier_cost),
    customerPrice: num(r.customer_price),
    photoPath: r.photo_path ?? "",
    status: r.status,
    changeOrderId: r.change_order_id,
    createdAt: r.created_at,
    costsVisible: Boolean(r.costs_visible),
  }));
}

export async function fetchChangeOrders(jobId: string): Promise<ChangeOrderRow[]> {
  const { data, error } = await supabase.rpc("change_orders_for", { _job_id: jobId });
  if (error) return [];
  return (data ?? []).map((r) => ({
    id: r.id,
    reference: r.reference,
    description: r.description,
    reason: r.reason ?? "",
    estimatedHours: num(r.estimated_hours),
    estimatedMaterials: num(r.estimated_materials),
    partnerCost: num(r.partner_cost),
    customerPrice: num(r.customer_price),
    status: r.status,
    decisionChannel: r.decision_channel ?? "",
    decidedName: r.decided_name ?? "",
    customerDecidedAt: r.customer_decided_at,
    approvalRequestId: r.approval_request_id,
    publicToken: r.public_token ?? "",
    tokenExpiresAt: r.token_expires_at,
    createdAt: r.created_at,
    costsVisible: Boolean(r.costs_visible),
  }));
}

/* -------------------------------------------------------------- job writes */

export async function createJobFromLead(
  leadId: string,
  scheduledStart: string | null,
): Promise<JobExec> {
  const { data, error } = await supabase.rpc("create_job_from_lead", {
    ...(scheduledStart ? { _scheduled_start: scheduledStart } : {}),
    _lead_id: leadId,
  });
  if (error) throw error;
  return data as unknown as JobExec;
}

export async function setJobStatus(jobId: string, status: JobStatus, note = ""): Promise<JobExec> {
  const { data, error } = await supabase.rpc("set_job_status", {
    _job_id: jobId,
    _status: status,
    _note: note,
  });
  if (error) throw error;
  // Customer notice is best effort — the status change itself already stands.
  void import("@/lib/operational-mail.functions")
    .then(({ notifyWorkOrderUpdate }) => notifyWorkOrderUpdate({ data: { jobId, note } }))
    .catch(() => undefined);
  return data as unknown as JobExec;
}

export async function recordConfirmation(
  jobId: string,
  kind: Enums<"job_confirmation_kind">,
  name: string,
  signaturePath = "",
  code = "",
): Promise<JobExec> {
  const { data, error } = await supabase.rpc("record_job_confirmation", {
    _job_id: jobId,
    _kind: kind,
    _name: name,
    _signature_path: signaturePath,
    _code: code,
  });
  if (error) throw error;
  return data as unknown as JobExec;
}

export type MaterialInput = {
  description: string;
  quantity: number;
  unit: string;
  supplierCost: number | null;
  customerPrice: number | null;
  photoPath?: string;
};

/** Above the admin-editable threshold this returns an awaiting-customer change order. */
export async function recordMaterial(
  jobId: string,
  input: MaterialInput,
): Promise<{ status: string; changeOrderId: string | null }> {
  const { data, error } = await supabase.rpc("record_job_material", {
    ...(input.supplierCost != null ? { _supplier_cost: input.supplierCost } : {}),
    ...(input.customerPrice != null ? { _customer_price: input.customerPrice } : {}),
    ...(input.photoPath ? { _photo_path: input.photoPath } : {}),
    _job_id: jobId,
    _description: input.description,
    _quantity: input.quantity,
    _unit: input.unit,
  });
  if (error) throw error;
  const r = (data ?? {}) as Record<string, unknown>;
  return {
    status: String(r["status"] ?? ""),
    changeOrderId: (r["change_order"] as string) ?? null,
  };
}

export type ChangeOrderInput = {
  description: string;
  reason: string;
  estimatedHours: number | null;
  estimatedMaterials: number | null;
  partnerCost: number | null;
  customerPrice: number | null;
};

export async function createChangeOrder(jobId: string, input: ChangeOrderInput): Promise<string> {
  const { data, error } = await supabase.rpc("create_change_order", {
    ...(input.estimatedHours != null ? { _estimated_hours: input.estimatedHours } : {}),
    ...(input.estimatedMaterials != null ? { _estimated_materials: input.estimatedMaterials } : {}),
    ...(input.partnerCost != null ? { _partner_cost: input.partnerCost } : {}),
    ...(input.customerPrice != null ? { _customer_price: input.customerPrice } : {}),
    _job_id: jobId,
    _description: input.description,
    _reason: input.reason,
  });
  if (error) throw error;
  return (data as unknown as { id: string }).id;
}

export type SendResult =
  | { status: "sent"; token: string; reference: string }
  | { status: "approval_required"; requestId: string; requiredRole: string };

/** Over the limit the record stays put and an approval request is created. */
export async function sendChangeOrder(
  id: string,
  customerPrice: number | null,
): Promise<SendResult> {
  const { data, error } = await supabase.rpc("send_change_order", {
    ...(customerPrice != null ? { _customer_price: customerPrice } : {}),
    _id: id,
  });
  if (error) throw error;
  const r = (data ?? {}) as Record<string, unknown>;
  if (r["status"] === "approval_required") {
    return {
      status: "approval_required",
      requestId: String(r["request_id"] ?? ""),
      requiredRole: String(r["required_role"] ?? ""),
    };
  }
  return {
    status: "sent",
    token: String(r["token"] ?? ""),
    reference: String(r["reference"] ?? ""),
  };
}

export async function decideChangeOrderStaff(
  id: string,
  approve: boolean,
  channel: string,
  name: string,
): Promise<void> {
  const { error } = await supabase.rpc("decide_change_order_staff", {
    _id: id,
    _approve: approve,
    _channel: channel,
    _name: name,
  });
  if (error) throw error;
}

export type CancellationOutcome = {
  band: string;
  ruleId: string | null;
  baseValue: number | null;
  customerCharge: number | null;
  partnerCompensation: number | null;
  manualReview: boolean;
};

export async function cancelJob(
  jobId: string,
  who: CancelActor,
  reason: string,
): Promise<CancellationOutcome> {
  const { data, error } = await supabase.rpc("cancel_job", {
    _job_id: jobId,
    _who: who,
    _reason: reason,
  });
  if (error) throw error;
  const r = (data ?? {}) as Record<string, unknown>;
  return {
    band: String(r["band"] ?? ""),
    ruleId: (r["rule_id"] as string) ?? null,
    baseValue: num(r["base_value"]),
    customerCharge: num(r["customer_charge"]),
    partnerCompensation: num(r["partner_compensation"]),
    manualReview: Boolean(r["manual_review"]),
  };
}

/* ------------------------------------------------------------ job evidence */

const ALLOWED_EVIDENCE = ["jpg", "jpeg", "png", "heic", "webp", "pdf"];

/** Photos live under <job id>/<phase>/, which is what the storage policy checks. */
export async function uploadJobPhoto(
  jobId: string,
  phase: PhotoPhase,
  file: File,
  caption = "",
): Promise<void> {
  const ext = (file.name.split(".").pop() ?? "").toLowerCase();
  if (!ALLOWED_EVIDENCE.includes(ext)) throw new Error("unsupported_file_type");
  if (file.size > 10 * 1024 * 1024) throw new Error("file_too_large");
  const path = `${jobId}/${phase}/${crypto.randomUUID()}.${ext}`;
  const { error: uploadError } = await supabase.storage
    .from("job-evidence")
    .upload(path, file, { upsert: false });
  if (uploadError) throw uploadError;
  const { error } = await supabase.from("job_photos").insert({
    job_id: jobId,
    phase,
    storage_path: path,
    caption,
  });
  if (error) throw error;
}

export async function signedEvidenceUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from("job-evidence").createSignedUrl(path, 60);
  if (error) return null;
  return data?.signedUrl ?? null;
}

/* ------------------------------------------------------- customer decision */

export type PublicChangeOrder = {
  reference: string;
  description: string;
  reason: string;
  customerPrice: number | null;
  currency: string;
  status: Enums<"change_order_status">;
  expiresAt: string | null;
  jobReference: string;
  decidedAt: string | null;
};

export async function fetchChangeOrderByToken(token: string): Promise<PublicChangeOrder | null> {
  const { data, error } = await supabase.rpc("change_order_by_token", { _token: token });
  if (error || !data || data.length === 0) return null;
  const r = data[0]!;
  return {
    reference: r.reference,
    description: r.description,
    reason: r.reason ?? "",
    customerPrice: num(r.customer_price),
    currency: r.currency ?? "CHF",
    status: r.status,
    expiresAt: r.expires_at,
    jobReference: r.job_reference ?? "",
    decidedAt: r.decided_at,
  };
}

export async function respondChangeOrder(
  token: string,
  accept: boolean,
  name: string,
): Promise<void> {
  const { error } = await supabase.rpc("respond_change_order_token", {
    _token: token,
    _accept: accept,
    _name: name,
  });
  if (error) throw error;
}
