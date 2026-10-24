/**
 * Fleet and compliance data is operational information, not general reading.
 *
 * Plates, insurance, inspection and service dates are visible to the people
 * who dispatch the fleet, and to a crew member only for the van on their own
 * job. Everyone else — customers, partners, unrelated staff — sees nothing,
 * including when they ask for a specific vehicle id.
 */
import { afterAll, describe, expect, it } from "vitest";

import { admin, cleanupUsers, ENV_READY, makeUser } from "./harness";
import { cleanupFixtures, dateInDays, isoInDays, seedJob, seedTeamWithMember, seedVehicle } from "./seed";

const suite = ENV_READY ? describe : describe.skip;

suite("fleet visibility", () => {
  afterAll(async () => {
    await cleanupFixtures();
    await cleanupUsers();
  });

  async function compliantVehicle() {
    return seedVehicle({
      insurance_expiry: dateInDays(300),
      inspection_due: dateInDays(300),
      service_due: dateInDays(300),
    });
  }

  it("shows the fleet to a dispatcher", async () => {
    const vehicleId = await compliantVehicle();
    const user = await makeUser({ role: "ops_manager", label: "fleet-dispatch" });
    const { data, error } = await user.client.from("vehicles").select("id, plate, insurance_expiry").eq("id", vehicleId);
    expect(error).toBeFalsy();
    expect((data ?? []).map((r) => r.id)).toContain(vehicleId);
  });

  it("shows the fleet to administration", async () => {
    const vehicleId = await compliantVehicle();
    const user = await makeUser({ role: "zuegelwerk_admin", label: "fleet-admin" });
    const { data, error } = await user.client.from("vehicles").select("id, plate").eq("id", vehicleId);
    expect(error).toBeFalsy();
    expect((data ?? []).map((r) => r.id)).toContain(vehicleId);
  });

  it("gives an assigned crew member only the vehicle on their job", async () => {
    const assigned = await compliantVehicle();
    const other = await compliantVehicle();
    const driver = await makeUser({ role: "driver", label: "fleet-driver" });
    const { teamId } = await seedTeamWithMember(driver.id);
    const job = await seedJob({ status: "scheduled", scheduled_start: isoInDays(10) });
    await admin().from("jobs_execution").update({ team_id: teamId, vehicle_id: assigned }).eq("id", job.id);

    const { data } = await driver.client.from("vehicles").select("id");
    const ids = (data ?? []).map((r) => r.id as string);
    expect(ids).toContain(assigned);
    expect(ids).not.toContain(other);

    const direct = await driver.client.from("vehicles").select("id, plate").eq("id", other);
    expect(direct.data ?? []).toHaveLength(0);
  });

  it("hides the fleet from an unrelated crew member", async () => {
    const vehicleId = await compliantVehicle();
    const crew = await makeUser({ role: "crew_leader", label: "fleet-unrelated" });
    await seedTeamWithMember(crew.id);
    const { data } = await crew.client.from("vehicles").select("id");
    expect(data ?? []).toHaveLength(0);
    const direct = await crew.client.from("vehicles").select("id").eq("id", vehicleId);
    expect(direct.data ?? []).toHaveLength(0);
  });

  it("hides the fleet from a customer", async () => {
    const vehicleId = await compliantVehicle();
    const customer = await makeUser({ role: "manager", label: "fleet-customer" });
    const { data } = await customer.client.from("vehicles").select("id, plate, insurance_expiry");
    expect(data ?? []).toHaveLength(0);
    const direct = await customer.client.from("vehicles").select("id").eq("id", vehicleId);
    expect(direct.data ?? []).toHaveLength(0);
  });

  it("hides the fleet from a partner by default", async () => {
    const vehicleId = await compliantVehicle();
    const partner = await makeUser({ role: null, label: "fleet-partner" });
    const { data } = await partner.client.from("vehicles").select("id");
    expect(data ?? []).toHaveLength(0);
    const direct = await partner.client.from("vehicles").select("id").eq("id", vehicleId);
    expect(direct.data ?? []).toHaveLength(0);
  });

  it("still assigns a compliant vehicle after the visibility change", async () => {
    const vehicleId = await compliantVehicle();
    const dispatcher = await makeUser({ role: "ops_manager", label: "fleet-assign" });
    const { teamId } = await seedTeamWithMember();
    const job = await seedJob({ status: "scheduled", scheduled_start: isoInDays(20) });
    const { error } = await dispatcher.client.rpc("assign_job_resources", {
      _job_id: job.id,
      _team_id: teamId,
      _vehicle_id: vehicleId,
      _scheduled_start: isoInDays(20),
      _scheduled_end: isoInDays(20),
    });
    expect(error).toBeFalsy();
  });

  it("still refuses an expired vehicle after the visibility change", async () => {
    const vehicleId = await seedVehicle({ insurance_expiry: dateInDays(-1) });
    const dispatcher = await makeUser({ role: "ops_manager", label: "fleet-assign-bad" });
    const { teamId } = await seedTeamWithMember();
    const job = await seedJob({ status: "scheduled", scheduled_start: isoInDays(20) });
    const { error } = await dispatcher.client.rpc("assign_job_resources", {
      _job_id: job.id,
      _team_id: teamId,
      _vehicle_id: vehicleId,
      _scheduled_start: isoInDays(20),
      _scheduled_end: isoInDays(20),
    });
    expect(error?.message).toContain("vehicle_insurance_expired");
  });
});
