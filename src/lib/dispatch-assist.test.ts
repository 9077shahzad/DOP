/**
 * The dispatch ranking must be explainable and must never invent a fact.
 */
import { describe, expect, it } from "vitest";

import { jobVolumeM3, recommendForJob, requiredSkills, type DispatchResources } from "@/lib/dispatch-assist";
import type { JobExec } from "@/lib/jobs-exec";

const job = {
  id: "job-1",
  reference: "PSU-J-1",
  service_key: "umzug",
  extras: ["Klaviertransport"],
  inventory: [{ name: "Sofa", volume_m3: 2, quantity: 2 }],
  booking_notes: "",
  crew_note: "",
  origin: { city: "Thun", canton: "BE" },
  destination: {},
  scheduled_start: "2026-10-01T08:00:00.000Z",
  scheduled_end: "2026-10-01T16:00:00.000Z",
  status: "scheduled",
  team_id: null,
  vehicle_id: null,
} as unknown as JobExec;

const resources: DispatchResources = {
  teams: [
    { id: "t1", name: "Crew Thun", city: "Thun", canton: "BE", capacity_per_day: 2, active: true } as never,
    { id: "t2", name: "Crew Bern", city: "Bern", canton: "BE", capacity_per_day: 1, active: true } as never,
  ],
  members: [
    { team_id: "t1", employee_id: "e1" } as never,
    { team_id: "t1", employee_id: "e2" } as never,
    { team_id: "t2", employee_id: "e3" } as never,
  ],
  employees: [
    { id: "e1", full_name: "A", active: true, role: "crew_leader", employment: "full_time", skills: ["piano"] } as never,
    { id: "e2", full_name: "B", active: true, role: "driver", employment: "full_time", skills: ["driving_c1"] } as never,
    { id: "e3", full_name: "C", active: true, role: "mover", employment: "part_time", skills: [] } as never,
  ],
  vehicles: [
    { id: "v1", plate: "BE 1", label: "LKW", capacity_m3: 20, active: true } as never,
    { id: "v2", plate: "BE 2", label: "Bus", capacity_m3: 2, active: true } as never,
  ],
};

describe("dispatch assistant", () => {
  it("derives the required skill from the recorded scope", () => {
    expect(requiredSkills(job)).toContain("piano");
  });

  it("adds up the recorded inventory volume and stays null without one", () => {
    expect(jobVolumeM3(job)).toBe(4);
    expect(jobVolumeM3({ ...job, inventory: [] } as JobExec)).toBeNull();
  });

  it("ranks the qualified crew in the right region first", () => {
    const result = recommendForJob(job, resources, [], [job]);
    expect(result.crews[0]?.teamId).toBe("t1");
    expect(result.crews[1]?.reasons.some((r) => r.key === "skillMissing")).toBe(true);
  });

  it("blocks a crew that is already booked in the window", () => {
    const result = recommendForJob(job, resources, [{ kind: "team", id: "t1", jobReference: "PSU-J-9" }], [job]);
    expect(result.crews.find((c) => c.teamId === "t1")?.blocked).toBe(true);
    expect(result.crews[0]?.teamId).toBe("t2");
  });

  it("prefers the smallest vehicle that still fits the recorded volume", () => {
    const result = recommendForJob(job, resources, [], [job]);
    expect(result.vehicles[0]?.vehicleId).toBe("v1");
    expect(result.vehicles.find((v) => v.vehicleId === "v2")?.reasons.some((r) => r.key === "capacityTooSmall")).toBe(true);
  });

  it("reports an unrecorded volume as an open point instead of guessing", () => {
    const result = recommendForJob({ ...job, inventory: [] } as JobExec, resources, [], [job]);
    expect(result.openPoints.some((p) => p.key === "volumeUnknown")).toBe(true);
    expect(result.volumeM3).toBeNull();
  });
});
