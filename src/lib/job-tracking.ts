/**
 * Public job tracking.
 *
 * The tracking token is the capability: it names exactly one job and the
 * database function returns only the few fields a customer may see — no
 * prices, no internal notes, no addresses beyond the town names.
 */

import { supabase } from "@/integrations/supabase/client";
import type { JobStatus } from "@/lib/jobs-exec";

export type TrackingStep = { status: string; at: string };

export type JobTracking = {
  reference: string;
  status: JobStatus;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  arrivedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  teamName: string | null;
  originCity: string | null;
  destinationCity: string | null;
  contactPhone: string | null;
  timeline: TrackingStep[];
};

/** The visible progress line — the crew statuses a customer cares about. */
export const TRACKING_STEPS: JobStatus[] = ["scheduled", "assigned", "en_route", "on_site", "in_progress", "completed"];

/** How far along the visible progress line a status sits; -1 when off the line. */
export function trackingStepIndex(status: JobStatus): number {
  switch (status) {
    case "loading":
    case "in_transit":
    case "unloading":
    case "paused":
      return TRACKING_STEPS.indexOf("in_progress");
    case "verified":
      return TRACKING_STEPS.indexOf("completed");
    default:
      return TRACKING_STEPS.indexOf(status);
  }
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

export async function fetchJobTracking(token: string): Promise<JobTracking | null> {
  const { data, error } = await supabase.rpc("job_tracking_by_token", { _token: token });
  if (error) throw error;
  if (!data || typeof data !== "object") return null;
  const row = data as Record<string, unknown>;
  if (!row["reference"]) return null;
  const rawTimeline = Array.isArray(row["timeline"]) ? (row["timeline"] as Record<string, unknown>[]) : [];
  return {
    reference: String(row["reference"]),
    status: String(row["status"] ?? "scheduled") as JobStatus,
    scheduledStart: str(row["scheduled_start"]),
    scheduledEnd: str(row["scheduled_end"]),
    arrivedAt: str(row["arrived_at"]),
    startedAt: str(row["started_at"]),
    completedAt: str(row["completed_at"]),
    cancelledAt: str(row["cancelled_at"]),
    teamName: str(row["team_name"]),
    originCity: str(row["origin_city"]),
    destinationCity: str(row["destination_city"]),
    contactPhone: str(row["contact_phone"]),
    timeline: rawTimeline
      .map((e) => ({ status: String(e["status"] ?? ""), at: String(e["at"] ?? "") }))
      .filter((e) => e.status && e.at),
  };
}

/** The link a customer receives; built from the site origin at call time. */
export function trackingUrl(origin: string, lang: string, token: string): string {
  return `${origin.replace(/\/$/, "")}/${lang}/auftrag/${token}`;
}
