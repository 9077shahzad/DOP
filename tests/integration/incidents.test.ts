/**
 * Incident reporting, end to end.
 *
 * A crew member on the job reports damage with a note and photo evidence; the
 * incident carries the right job and customer; dispatch sees it and resolves
 * it; an unrelated crew member cannot see or touch it, even knowing its id.
 */
import { afterAll, describe, expect, it } from "vitest";

import { admin, cleanupUsers, ENV_READY, makeUser } from "./harness";
import { cleanupFixtures, isoInDays, seedJob, seedTeamWithMember, trackIncident } from "./seed";

const suite = ENV_READY ? describe : describe.skip;

suite("incident reporting", () => {
  afterAll(async () => {
    await cleanupFixtures();
    await cleanupUsers();
  });

  it("crew reports evidence, dispatch resolves it, unrelated crew is blind to it", async () => {
    const crew = await makeUser({ role: null, label: "inc-crew" });
    const other = await makeUser({ role: null, label: "inc-other" });
    const dispatcher = await makeUser({ role: "ops_manager", label: "inc-dispatch" });

    const { teamId } = await seedTeamWithMember(crew.id);
    const otherTeam = await seedTeamWithMember(other.id);
    expect(otherTeam.teamId).not.toBe(teamId);

    const job = await seedJob({
      status: "in_progress",
      team_id: teamId,
      scheduled_start: isoInDays(0),
      customer_name: "UAT Kundschaft",
    });

    // the crew member sees only the job they are on
    const mine = await crew.client.from("jobs_execution").select("id").eq("id", job.id);
    expect(mine.data?.length).toBe(1);
    const notMine = await other.client.from("jobs_execution").select("id").eq("id", job.id);
    expect(notMine.data?.length ?? 0).toBe(0);

    const reported = await crew.client
      .from("incidents")
      .insert({
        job_id: job.id,
        kind: "damage",
        severity: "high",
        description: "UAT: Kratzer an der Wand im Treppenhaus",
        photo_paths: [`${job.id}/uat-evidence.jpg`],
        reported_by: crew.id,
      })
      .select("id")
      .single();
    expect(reported.error).toBeNull();
    const incidentId = reported.data!.id as string;
    trackIncident(incidentId);

    // the linkage is real, not asserted by the client
    const stored = await admin()
      .from("incidents")
      .select("job_id, reported_by, photo_paths, severity, status")
      .eq("id", incidentId)
      .single();
    expect(stored.data?.job_id).toBe(job.id);
    expect(stored.data?.reported_by).toBe(crew.id);
    expect((stored.data?.photo_paths as string[]).length).toBe(1);
    expect(stored.data?.status).toBe("open");

    const jobRow = await admin().from("jobs_execution").select("customer_name").eq("id", job.id).single();
    expect(jobRow.data?.customer_name).toBe("UAT Kundschaft");

    // the reporter sees their own report
    const own = await crew.client.from("incidents").select("id").eq("id", incidentId);
    expect(own.data?.length).toBe(1);

    // an unrelated crew member cannot read it by id, nor change it
    const peek = await other.client.from("incidents").select("id").eq("id", incidentId);
    expect(peek.data?.length ?? 0).toBe(0);
    const tamper = await other.client.from("incidents").update({ status: "closed" }).eq("id", incidentId).select("id");
    expect(tamper.data?.length ?? 0).toBe(0);

    // dispatch sees it and closes it out
    const seen = await dispatcher.client.from("incidents").select("id, description").eq("id", incidentId);
    expect(seen.data?.length).toBe(1);
    const resolved = await dispatcher.client
      .from("incidents")
      .update({ status: "closed", resolution: "UAT: behoben" })
      .eq("id", incidentId)
      .select("status")
      .single();
    expect(resolved.data?.status).toBe("closed");

    const after = await admin().from("incidents").select("status, resolution").eq("id", incidentId).single();
    expect(after.data?.status).toBe("closed");
    expect(after.data?.resolution).toContain("behoben");
  });
});
