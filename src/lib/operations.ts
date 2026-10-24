/**
 * Operations resources — employees, vehicles, crews, time tracking,
 * incidents and reviews.
 *
 * Every read and write goes through the browser Supabase client, so row level
 * security decides what a caller sees: staff manage everything, an employee
 * sees their own record, their crews and their own time entries.
 */

import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type Employee = Tables<"employees">;
export type Vehicle = Tables<"vehicles">;
export type CrewMember = Tables<"crew_members">;
export type TimeEntry = Tables<"time_entries">;
export type Incident = Tables<"incidents">;
export type JobReview = Tables<"job_reviews">;
export type InternalTeam = Tables<"internal_teams">;

export const EMPLOYEE_ROLES = [
  "crew_leader",
  "mover",
  "driver",
  "cleaner",
  "surveyor",
  "dispatcher",
  "office",
] as const;

export const SKILLS = [
  "piano",
  "safe",
  "hoist",
  "packing",
  "cleaning",
  "disposal",
  "storage",
  "lift_truck",
  "driving_c1",
] as const;

export const VEHICLE_TYPES = ["van", "truck_3_5t", "truck_7_5t", "truck_18t", "trailer", "car"] as const;

export const INCIDENT_KINDS = ["damage", "delay", "access", "safety", "complaint", "other"] as const;
export const INCIDENT_SEVERITIES = ["low", "medium", "high"] as const;
export const INCIDENT_STATUSES = ["open", "in_review", "resolved", "rejected"] as const;

/* ------------------------------------------------------------- employees */

export async function fetchEmployees(includeInactive = true): Promise<Employee[]> {
  let query = supabase.from("employees").select("*").order("full_name");
  if (!includeInactive) query = query.eq("active", true);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function saveEmployee(input: TablesInsert<"employees"> & { id?: string }): Promise<Employee> {
  if (input.id) {
    const { id, ...rest } = input;
    const { data, error } = await supabase
      .from("employees")
      .update(rest as TablesUpdate<"employees">)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
  const { data, error } = await supabase.from("employees").insert(input).select().single();
  if (error) throw error;
  return data;
}

export async function setEmployeeActive(id: string, active: boolean): Promise<void> {
  const { error } = await supabase.from("employees").update({ active }).eq("id", id);
  if (error) throw error;
}

/** The employee record belonging to the signed-in user, if there is one. */
export async function fetchMyEmployee(): Promise<Employee | null> {
  const { data: session } = await supabase.auth.getUser();
  const uid = session.user?.id;
  if (!uid) return null;
  const { data, error } = await supabase.from("employees").select("*").eq("user_id", uid).maybeSingle();
  if (error) return null;
  return data ?? null;
}

/* -------------------------------------------------------------- vehicles */

export async function fetchVehicles(includeInactive = true): Promise<Vehicle[]> {
  let query = supabase.from("vehicles").select("*").order("plate");
  if (!includeInactive) query = query.eq("active", true);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function saveVehicle(input: TablesInsert<"vehicles"> & { id?: string }): Promise<Vehicle> {
  if (input.id) {
    const { id, ...rest } = input;
    const { data, error } = await supabase
      .from("vehicles")
      .update(rest as TablesUpdate<"vehicles">)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
  const { data, error } = await supabase.from("vehicles").insert(input).select().single();
  if (error) throw error;
  return data;
}

export async function setVehicleActive(id: string, active: boolean): Promise<void> {
  const { error } = await supabase.from("vehicles").update({ active }).eq("id", id);
  if (error) throw error;
}

/* ----------------------------------------------------------------- crews */

export async function fetchTeams(): Promise<InternalTeam[]> {
  const { data, error } = await supabase.from("internal_teams").select("*").order("name");
  if (error) throw error;
  return data ?? [];
}

export async function createTeam(name: string, city: string, canton: string): Promise<InternalTeam> {
  const { data, error } = await supabase
    .from("internal_teams")
    .insert({ name, city, canton })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function fetchCrewMembers(): Promise<CrewMember[]> {
  const { data, error } = await supabase.from("crew_members").select("*");
  if (error) throw error;
  return data ?? [];
}

export async function addCrewMember(teamId: string, employeeId: string, crewRole: string): Promise<void> {
  const { error } = await supabase
    .from("crew_members")
    .insert({ team_id: teamId, employee_id: employeeId, crew_role: crewRole });
  if (error) throw error;
}

export async function removeCrewMember(id: string): Promise<void> {
  const { error } = await supabase.from("crew_members").delete().eq("id", id);
  if (error) throw error;
}

/** Team ids the signed-in employee belongs to. */
export async function fetchMyTeamIds(employeeId: string): Promise<string[]> {
  const { data, error } = await supabase.from("crew_members").select("team_id").eq("employee_id", employeeId);
  if (error) return [];
  return (data ?? []).map((r) => r.team_id);
}

/* --------------------------------------------------------------- dispatch */

/**
 * Dispatch writes go through assign_job_resources(): it checks the caller is a
 * dispatcher, that the crew has members and the vehicle is active, and the
 * database refuses a crew or vehicle already booked in the same window.
 */
export async function assignJobResources(
  jobId: string,
  teamId: string | null,
  vehicleId: string | null,
  scheduledStart: string | null,
  scheduledEnd: string | null = null,
): Promise<void> {
  if (!teamId || !vehicleId) throw new Error("Crew und Fahrzeug sind für die Zuteilung erforderlich.");
  const { error } = await supabase.rpc("assign_job_resources", {
    _job_id: jobId,
    _team_id: teamId,
    _vehicle_id: vehicleId,
    ...(scheduledStart ? { _scheduled_start: scheduledStart } : {}),
    ...(scheduledEnd ? { _scheduled_end: scheduledEnd } : {}),
  });
  if (error) throw error;
}

/* ---------------------------------------------------------- time tracking */

export async function fetchTimeEntries(jobId?: string, employeeId?: string): Promise<TimeEntry[]> {
  let query = supabase.from("time_entries").select("*").order("started_at", { ascending: false }).limit(200);
  if (jobId) query = query.eq("job_id", jobId);
  if (employeeId) query = query.eq("employee_id", employeeId);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function startTimeEntry(employeeId: string, jobId: string | null, note = ""): Promise<TimeEntry> {
  const { data, error } = await supabase
    .from("time_entries")
    .insert({ employee_id: employeeId, job_id: jobId, note })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function stopTimeEntry(id: string): Promise<void> {
  const { data: row, error: readError } = await supabase
    .from("time_entries")
    .select("started_at")
    .eq("id", id)
    .single();
  if (readError) throw readError;
  const ended = new Date();
  const minutes = Math.max(0, Math.round((ended.getTime() - new Date(row.started_at).getTime()) / 60000));
  const { error } = await supabase
    .from("time_entries")
    .update({ ended_at: ended.toISOString(), minutes })
    .eq("id", id);
  if (error) throw error;
}

/* -------------------------------------------------------------- incidents */

export async function fetchIncidents(jobId?: string): Promise<Incident[]> {
  let query = supabase.from("incidents").select("*").order("created_at", { ascending: false }).limit(200);
  if (jobId) query = query.eq("job_id", jobId);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function reportIncident(input: {
  jobId: string | null;
  kind: string;
  severity: string;
  description: string;
  photoPaths?: string[];
}): Promise<Incident> {
  const { data: session } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("incidents")
    .insert({
      job_id: input.jobId,
      kind: input.kind,
      severity: input.severity,
      description: input.description,
      photo_paths: input.photoPaths ?? [],
      reported_by: session.user?.id ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateIncident(
  id: string,
  patch: { status?: string; resolution?: string },
): Promise<void> {
  const { error } = await supabase.from("incidents").update(patch).eq("id", id);
  if (error) throw error;
}

/* ---------------------------------------------------------------- reviews */

export async function fetchReviews(): Promise<JobReview[]> {
  const { data, error } = await supabase
    .from("job_reviews")
    .select("*")
    .order("requested_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return data ?? [];
}

/**
 * Asks the database to create the review invitation for a finished job.
 *
 * The client cannot insert a review row any more: `create_review_request`
 * checks the caller's role, insists the job is completed or verified, derives
 * the job/customer relationship itself, mints the capability token and writes
 * an audit event. Repeating the request returns the same token.
 */
export async function requestReview(jobId: string): Promise<{ token: string; created: boolean; submitted: boolean }> {
  const { data, error } = await supabase.rpc("create_review_request", { _job_id: jobId });
  if (error) throw error;
  const r = (data ?? {}) as Record<string, unknown>;
  return {
    token: String(r["token"] ?? ""),
    created: Boolean(r["created"]),
    submitted: Boolean(r["submitted"]),
  };
}

export type PublicReview = {
  jobReference: string;
  rating: number | null;
  comment: string;
  submittedAt: string | null;
};

export async function fetchReviewByToken(token: string): Promise<PublicReview | null> {
  const { data, error } = await supabase.rpc("review_by_token", { _token: token });
  if (error) return null;
  const row = (data ?? [])[0];
  if (!row) return null;
  return {
    jobReference: row.job_reference,
    rating: row.rating,
    comment: row.comment ?? "",
    submittedAt: row.submitted_at,
  };
}

export async function submitReview(token: string, rating: number, comment: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("submit_review", {
    _token: token,
    _rating: rating,
    _comment: comment,
  });
  if (error) throw error;
  return Boolean(data);
}

/* -------------------------------------------------------------- signature */

/**
 * Stores a captured signature image in the job evidence bucket and returns its
 * path. Access is decided by the bucket policies, which read can_access_job().
 */
export async function uploadSignature(jobId: string, dataUrl: string): Promise<string> {
  const blob = await (await fetch(dataUrl)).blob();
  const path = `${jobId}/signature/${crypto.randomUUID()}.png`;
  const { error } = await supabase.storage.from("job-evidence").upload(path, blob, {
    upsert: false,
    contentType: "image/png",
  });
  if (error) throw error;
  return path;
}

export type PublicReviewSettings = { googleReviewUrl: string; lowRatingThreshold: number };

/**
 * Public review-page settings. The Google link is deliberately readable
 * without a login — it is the same link printed on public material. When no
 * link is stored, the page thanks the customer and shows nothing else.
 */
export async function fetchReviewSettings(): Promise<PublicReviewSettings> {
  const { data } = await supabase
    .from("review_settings")
    .select("google_review_url, low_rating_threshold")
    .eq("id", "default")
    .maybeSingle();
  return {
    googleReviewUrl: (data?.google_review_url ?? "").trim(),
    lowRatingThreshold: Number(data?.low_rating_threshold ?? 4),
  };
}
