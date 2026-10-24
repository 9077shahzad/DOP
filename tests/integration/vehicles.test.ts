/**
 * Vehicle compliance is judged on the planned job date.
 *
 * A van whose insurance, inspection or service lapses between today and the
 * day of the move must not be assignable, and an inactive van never is. The
 * refusal is raised by the database, so hiding the option in the interface is
 * not what protects the operation.
 */
import { afterAll, describe, expect, it } from "vitest";

import de from "../../src/i18n/de.json";
import ar from "../../src/i18n/ar.json";
import en from "../../src/i18n/en.json";
import fr from "../../src/i18n/fr.json";
import it_ from "../../src/i18n/it.json";
import { admin, cleanupUsers, ENV_READY, makeUser } from "./harness";
import { cleanupFixtures, dateInDays, isoInDays, seedJob, seedTeamWithMember, seedVehicle } from "./seed";

const suite = ENV_READY ? describe : describe.skip;

const CODES = [
  "vehicle_inactive",
  "vehicle_insurance_expired",
  "vehicle_inspection_due",
  "vehicle_service_due",
] as const;

describe("vehicle refusal reasons are translated", () => {
  it("every refusal code has a sentence in all five languages", () => {
    for (const dict of [de, fr, it_, en, ar] as Array<Record<string, never>>) {
      const errors = (dict as unknown as { ops: { dispatch: { errors: Record<string, string> } } }).ops.dispatch
        .errors;
      for (const code of CODES) expect(errors[code]?.length ?? 0).toBeGreaterThan(0);
    }
  });
});

suite("vehicle compliance on assignment", () => {
  afterAll(async () => {
    await cleanupFixtures();
    await cleanupUsers();
  });

  async function context(label: string) {
    const dispatcher = await makeUser({ role: "ops_manager", label });
    const { teamId } = await seedTeamWithMember();
    const job = await seedJob({ status: "scheduled", scheduled_start: isoInDays(30) });
    return { dispatcher, teamId, job };
  }

  it("a compliant vehicle is assigned", async () => {
    const { dispatcher, teamId, job } = await context("veh-ok");
    const vehicle = await seedVehicle({
      insurance_expiry: dateInDays(200),
      inspection_due: dateInDays(200),
      service_due: dateInDays(200),
    });
    const { error } = await dispatcher.client.rpc("assign_job_resources", {
      _job_id: job.id,
      _team_id: teamId,
      _vehicle_id: vehicle,
      _scheduled_start: isoInDays(30),
    });
    expect(error).toBeNull();
    const row = await admin().from("jobs_execution").select("vehicle_id, team_id, status").eq("id", job.id).single();
    expect(row.data?.vehicle_id).toBe(vehicle);
    expect(row.data?.status).toBe("assigned");
  });

  it("an inactive vehicle is refused", async () => {
    const { dispatcher, teamId, job } = await context("veh-inactive");
    const vehicle = await seedVehicle({ active: false });
    const { error } = await dispatcher.client.rpc("assign_job_resources", {
      _job_id: job.id,
      _team_id: teamId,
      _vehicle_id: vehicle,
      _scheduled_start: isoInDays(30),
    });
    expect(error?.message).toContain("vehicle_inactive");
  });

  it("insurance that lapses before the job date is refused, even though it is valid today", async () => {
    const { dispatcher, teamId, job } = await context("veh-insurance");
    const vehicle = await seedVehicle({
      insurance_expiry: dateInDays(10),
      inspection_due: dateInDays(200),
      service_due: dateInDays(200),
    });
    const { error } = await dispatcher.client.rpc("assign_job_resources", {
      _job_id: job.id,
      _team_id: teamId,
      _vehicle_id: vehicle,
      _scheduled_start: isoInDays(30),
    });
    expect(error?.message).toContain("vehicle_insurance_expired");
  });

  it("an inspection due by the job date is refused", async () => {
    const { dispatcher, teamId, job } = await context("veh-inspection");
    const vehicle = await seedVehicle({
      insurance_expiry: dateInDays(200),
      inspection_due: dateInDays(5),
      service_due: dateInDays(200),
    });
    const { error } = await dispatcher.client.rpc("assign_job_resources", {
      _job_id: job.id,
      _team_id: teamId,
      _vehicle_id: vehicle,
      _scheduled_start: isoInDays(30),
    });
    expect(error?.message).toContain("vehicle_inspection_due");
  });

  it("a service due by the job date is refused", async () => {
    const { dispatcher, teamId, job } = await context("veh-service");
    const vehicle = await seedVehicle({
      insurance_expiry: dateInDays(200),
      inspection_due: dateInDays(200),
      service_due: dateInDays(5),
    });
    const { error } = await dispatcher.client.rpc("assign_job_resources", {
      _job_id: job.id,
      _team_id: teamId,
      _vehicle_id: vehicle,
      _scheduled_start: isoInDays(30),
    });
    expect(error?.message).toContain("vehicle_service_due");
  });

  it("callers without dispatch rights cannot assign anything", async () => {
    const outsider = await makeUser({ role: null, label: "veh-outsider" });
    const { teamId } = await seedTeamWithMember();
    const job = await seedJob({ status: "scheduled", scheduled_start: isoInDays(30) });
    const vehicle = await seedVehicle({ insurance_expiry: dateInDays(200) });
    const { error } = await outsider.client.rpc("assign_job_resources", {
      _job_id: job.id,
      _team_id: teamId,
      _vehicle_id: vehicle,
      _scheduled_start: isoInDays(30),
    });
    expect(error).not.toBeNull();
  });
});
