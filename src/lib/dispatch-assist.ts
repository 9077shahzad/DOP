/**
 * Dispatch assistant — deterministic crew and vehicle recommendations.
 *
 * The assistant never assigns anything. It reads the resources that already
 * exist (crews, their members, employee skills and working restrictions,
 * vehicle capacity and roadworthiness) and the jobs already booked in the same
 * window, then ranks the combinations and states the reason for every point it
 * gives or withholds. A dispatcher reads the reasons and approves the
 * assignment; the database rules still apply on the write.
 *
 * Nothing here invents data: a fact that is not recorded (volume, access,
 * canton) becomes an open note, never an assumption.
 */

import { supabase } from "@/integrations/supabase/client";
import { fetchBusyResources, type BusyResource } from "@/lib/bookings";
import { fetchCrewMembers, fetchEmployees, fetchTeams, fetchVehicles } from "@/lib/operations";
import type { Employee, CrewMember, InternalTeam, Vehicle } from "@/lib/operations";
import type { JobExec } from "@/lib/jobs-exec";

/** A reason is a translation key plus its values — never a finished sentence. */
export type DispatchReason = { key: string; values?: Record<string, string | number> };

export type CrewOption = {
  teamId: string;
  name: string;
  score: number;
  headcount: number;
  blocked: boolean;
  reasons: DispatchReason[];
};

export type VehicleOption = {
  vehicleId: string;
  label: string;
  score: number;
  blocked: boolean;
  reasons: DispatchReason[];
};

export type DispatchRecommendation = {
  jobId: string;
  requiredSkills: string[];
  volumeM3: number | null;
  region: string;
  crews: CrewOption[];
  vehicles: VehicleOption[];
  /** Everything the recommendation could not verify from recorded data. */
  openPoints: DispatchReason[];
};

export type DispatchResources = {
  teams: InternalTeam[];
  members: CrewMember[];
  employees: Employee[];
  vehicles: Vehicle[];
};

const SKILL_TRIGGERS: Array<{ match: RegExp; skill: string }> = [
  { match: /klavier|piano|flügel|fluegel/i, skill: "piano" },
  { match: /tresor|safe/i, skill: "safe" },
  { match: /lift|hebe|möbellift|moebellift|hoist/i, skill: "hoist" },
  { match: /pack/i, skill: "packing" },
  { match: /reinig|clean|putz/i, skill: "cleaning" },
  { match: /entsorg|räumung|raeumung|disposal/i, skill: "disposal" },
  { match: /lager|storage|einlager/i, skill: "storage" },
];

function text(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

/** Skills the recorded scope actually demands. Unknown scope adds nothing. */
export function requiredSkills(job: JobExec): string[] {
  const haystack = [job.service_key, text(job.extras), text(job.inventory), job.booking_notes, job.crew_note]
    .filter(Boolean)
    .join(" ");
  const found = new Set<string>();
  for (const trigger of SKILL_TRIGGERS) if (trigger.match.test(haystack)) found.add(trigger.skill);
  return [...found];
}

/** Recorded transport volume in m³, or null when the inventory carries none. */
export function jobVolumeM3(job: JobExec): number | null {
  const list = Array.isArray(job.inventory) ? (job.inventory as unknown[]) : [];
  let total = 0;
  let seen = false;
  for (const entry of list) {
    const row = record(entry);
    const volume = Number(row["volume_m3"] ?? row["m3"] ?? row["volume"] ?? NaN);
    if (!Number.isFinite(volume)) continue;
    const qty = Number(row["quantity"] ?? row["qty"] ?? 1);
    total += volume * (Number.isFinite(qty) && qty > 0 ? qty : 1);
    seen = true;
  }
  return seen ? Math.round(total * 10) / 10 : null;
}

/** The place the job starts, as recorded. Empty when the address carries none. */
export function jobRegion(job: JobExec): { city: string; canton: string } {
  const origin = record(job.origin);
  return {
    city: String(origin["city"] ?? origin["ort"] ?? "").trim(),
    canton: String(origin["canton"] ?? origin["kanton"] ?? "").trim(),
  };
}

function sameDay(a: string | null, b: string | null): boolean {
  return Boolean(a && b && a.slice(0, 10) === b.slice(0, 10));
}

/**
 * Ranks crews and vehicles for one job.
 *
 * Blocked options stay in the list with their reason: a dispatcher must see
 * why a crew is unavailable, not merely that it is absent.
 */
export function recommendForJob(
  job: JobExec,
  resources: DispatchResources,
  busy: BusyResource[],
  allJobs: JobExec[],
): DispatchRecommendation {
  const skills = requiredSkills(job);
  const volume = jobVolumeM3(job);
  const region = jobRegion(job);
  const openPoints: DispatchReason[] = [];
  if (volume == null) openPoints.push({ key: "volumeUnknown" });
  if (!region.city && !region.canton) openPoints.push({ key: "regionUnknown" });
  if (!job.scheduled_start) openPoints.push({ key: "dateUnknown" });

  const employeeById = new Map(resources.employees.map((e) => [e.id, e]));
  const day = job.scheduled_start;

  const crews: CrewOption[] = resources.teams.map((team) => {
    const reasons: DispatchReason[] = [];
    let score = 0;
    let blocked = false;

    const members = resources.members
      .filter((m) => m.team_id === team.id)
      .map((m) => employeeById.get(m.employee_id))
      .filter((e): e is Employee => Boolean(e));
    const available = members.filter((e) => e.active);

    if (available.length === 0) {
      blocked = true;
      reasons.push({ key: "crewEmpty" });
    } else {
      score += Math.min(available.length, 4) * 5;
      reasons.push({ key: "crewHeadcount", values: { count: available.length } });
    }
    if (members.length > available.length) {
      reasons.push({ key: "crewInactiveMembers", values: { count: members.length - available.length } });
    }
    if (!team.active) {
      blocked = true;
      reasons.push({ key: "crewInactive" });
    }

    // Skills — only skills recorded on the employee records count.
    const covered = new Set<string>();
    for (const employee of available) for (const skill of employee.skills ?? []) covered.add(skill);
    for (const skill of skills) {
      if (covered.has(skill)) {
        score += 15;
        reasons.push({ key: "skillCovered", values: { skill } });
      } else {
        score -= 20;
        reasons.push({ key: "skillMissing", values: { skill } });
      }
    }

    // Working restrictions taken from the employment type on the record.
    const restricted = available.filter((e) => /teil|part|aushilf|temp|student|lehr/i.test(e.employment ?? ""));
    if (restricted.length > 0) {
      score -= restricted.length * 2;
      reasons.push({ key: "restrictedEmployment", values: { count: restricted.length } });
    }
    const leaders = available.filter((e) => e.role === "crew_leader").length;
    if (leaders > 0) score += 6;
    else reasons.push({ key: "noCrewLeader" });
    const drivers = available.filter((e) => e.role === "driver" || (e.skills ?? []).includes("driving_c1")).length;
    if (drivers === 0) reasons.push({ key: "noDriver" });
    else score += 4;

    // Capacity for the day, measured against the jobs already booked.
    const load = allJobs.filter((j) => j.id !== job.id && j.team_id === team.id && sameDay(j.scheduled_start, day)).length;
    const capacity = Number(team.capacity_per_day ?? 0);
    if (capacity > 0) {
      if (load >= capacity) {
        blocked = true;
        reasons.push({ key: "capacityReached", values: { load, capacity } });
      } else {
        score += 8;
        reasons.push({ key: "capacityFree", values: { load, capacity } });
      }
    }

    // Routing: base against the recorded origin.
    if (region.city && team.city && region.city.toLowerCase() === team.city.toLowerCase()) {
      score += 12;
      reasons.push({ key: "sameCity", values: { city: team.city } });
    } else if (region.canton && team.canton && region.canton.toLowerCase() === team.canton.toLowerCase()) {
      score += 6;
      reasons.push({ key: "sameCanton", values: { canton: team.canton } });
    } else if (region.city || region.canton) {
      reasons.push({ key: "otherRegion", values: { base: [team.city, team.canton].filter(Boolean).join(", ") } });
    }

    if (busy.some((b) => b.kind === "team" && b.id === team.id)) {
      blocked = true;
      reasons.push({ key: "crewBusy" });
    }

    return { teamId: team.id, name: team.name, score: blocked ? -1000 + score : score, headcount: available.length, blocked, reasons };
  });

  const vehicles: VehicleOption[] = resources.vehicles.map((vehicle) => {
    const reasons: DispatchReason[] = [];
    let score = 0;
    let blocked = false;

    if (!vehicle.active) {
      blocked = true;
      reasons.push({ key: "vehicleInactive" });
    }
    const dayDate = day ? day.slice(0, 10) : null;
    if (dayDate) {
      if (vehicle.insurance_expiry && vehicle.insurance_expiry <= dayDate) {
        blocked = true;
        reasons.push({ key: "insuranceExpired", values: { date: vehicle.insurance_expiry } });
      }
      if (vehicle.inspection_due && vehicle.inspection_due <= dayDate) {
        blocked = true;
        reasons.push({ key: "inspectionDue", values: { date: vehicle.inspection_due } });
      }
      if (vehicle.service_due && vehicle.service_due <= dayDate) {
        blocked = true;
        reasons.push({ key: "serviceDue", values: { date: vehicle.service_due } });
      }
    }

    const capacity = Number(vehicle.capacity_m3 ?? 0);
    if (volume != null && capacity > 0) {
      if (capacity < volume) {
        score -= 30;
        reasons.push({ key: "capacityTooSmall", values: { capacity, volume } });
      } else {
        // The closest sufficient vehicle wins; a far larger one is wasteful.
        score += 20 - Math.min(19, Math.round(capacity - volume));
        reasons.push({ key: "capacityFits", values: { capacity, volume } });
      }
    } else if (capacity > 0) {
      reasons.push({ key: "capacityOnly", values: { capacity } });
    }

    if (busy.some((b) => b.kind === "vehicle" && b.id === vehicle.id)) {
      blocked = true;
      reasons.push({ key: "vehicleBusy" });
    }

    const label = `${vehicle.plate}${vehicle.label ? ` (${vehicle.label})` : ""}`;
    return { vehicleId: vehicle.id, label, score: blocked ? -1000 + score : score, blocked, reasons };
  });

  const bySore = (a: { score: number }, b: { score: number }) => b.score - a.score;
  return {
    jobId: job.id,
    requiredSkills: skills,
    volumeM3: volume,
    region: [region.city, region.canton].filter(Boolean).join(", "),
    crews: crews.sort(bySore),
    vehicles: vehicles.sort(bySore),
    openPoints,
  };
}

export async function fetchDispatchResources(): Promise<DispatchResources> {
  const [teams, members, employees, vehicles] = await Promise.all([
    fetchTeams(),
    fetchCrewMembers(),
    fetchEmployees(true),
    fetchVehicles(true),
  ]);
  return { teams, members, employees, vehicles };
}

/** Loads what the ranking needs for one job and returns the recommendation. */
export async function recommendDispatch(
  job: JobExec,
  allJobs: JobExec[],
  resources?: DispatchResources,
): Promise<DispatchRecommendation> {
  const data = resources ?? (await fetchDispatchResources());
  const busy = job.scheduled_start
    ? await fetchBusyResources(job.scheduled_start, job.scheduled_end, job.id)
    : [];
  return recommendForJob(job, data, busy, allJobs);
}

/** Records the dispatcher's decision on a recommendation for the audit trail. */
export async function logDispatchDecision(input: {
  jobId: string;
  teamId: string;
  vehicleId: string;
  accepted: boolean;
  recommendation: DispatchRecommendation;
}): Promise<void> {
  const { data: session } = await supabase.auth.getUser();
  await supabase.from("ai_suggestions").insert({
    feature: "dispatch_recommendation",
    subject_type: "job",
    subject_id: input.jobId,
    language: "de",
    status: input.accepted ? "accepted" : "rejected",
    input_summary: `Job ${input.jobId}`,
    payload: {
      crews: input.recommendation.crews.slice(0, 5),
      vehicles: input.recommendation.vehicles.slice(0, 5),
      chosen: { team_id: input.teamId, vehicle_id: input.vehicleId },
      source: "deterministic",
    } as never,
    created_by: session.user?.id ?? null,
    reviewed_by: session.user?.id ?? null,
    reviewed_at: new Date().toISOString(),
  } as never);
}
