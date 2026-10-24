/**
 * Throwaway operational fixtures for the integration suite.
 *
 * Every row is created with the service key and deleted again in teardown, so
 * the tests can assert real behaviour of the database functions without ever
 * depending on — or disturbing — genuine business records.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import { admin, UAT_TAG } from "./harness";

const leads: string[] = [];
const jobs: string[] = [];
const invoices: string[] = [];
const vehicles: string[] = [];
const teams: string[] = [];
const employees: string[] = [];
const incidents: string[] = [];

export function isoInDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

export function dateInDays(days: number): string {
  return isoInDays(days).slice(0, 10);
}

export async function seedLead(db: SupabaseClient = admin()): Promise<string> {
  const { data, error } = await db
    .from("leads")
    .insert({ is_test: true, customer_name: `UAT ${UAT_TAG}`, customer_email: `uat.${Date.now()}@ps-umzug-test.invalid` })
    .select("id")
    .single();
  if (error) throw new Error(`seedLead: ${error.message}`);
  leads.push(data.id);
  return data.id;
}

/** A job in whatever lifecycle state the test needs. */
export async function seedJob(
  fields: Record<string, unknown> = {},
  db: SupabaseClient = admin(),
): Promise<{ id: string; reference: string; leadId: string }> {
  const leadId = await seedLead(db);
  const reference = `PSU-UAT-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const { data, error } = await db
    .from("jobs_execution")
    .insert({ is_test: true,
      lead_id: leadId,
      reference,
      customer_name: `UAT ${UAT_TAG}`,
      customer_email: `uat.${Date.now()}@ps-umzug-test.invalid`,
      service_key: "umzug",
      ...fields,
    })
    .select("id")
    .single();
  if (error) throw new Error(`seedJob: ${error.message}`);
  jobs.push(data.id);
  return { id: data.id, reference, leadId };
}

export async function seedCompletedJob(
  fields: Record<string, unknown> = {},
): Promise<{ id: string; reference: string; leadId: string }> {
  return seedJob({ status: "completed", completed_at: new Date().toISOString(), job_value: 1200, ...fields });
}

/** An invoice in a chosen state — payments are only meaningful once issued. */
export async function seedInvoice(
  fields: Record<string, unknown> = {},
  db: SupabaseClient = admin(),
): Promise<string> {
  const today = dateInDays(0);
  const { data, error } = await db
    .from("invoices")
    .insert({
      reference: `PSU-INV-UAT-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      customer_name: `UAT ${UAT_TAG}`,
      status: "issued",
      net: 1000,
      vat: 81,
      total: 1081,
      period_start: today,
      period_end: today,
      ...fields,
    })
    .select("id")
    .single();
  if (error) throw new Error(`seedInvoice: ${error.message}`);
  invoices.push(data.id);
  return data.id;
}

export async function seedVehicle(
  fields: Record<string, unknown> = {},
  db: SupabaseClient = admin(),
): Promise<string> {
  const { data, error } = await db
    .from("vehicles")
    .insert({
      plate: `UAT ${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      label: `UAT ${UAT_TAG}`,
      vehicle_type: "truck",
      capacity_m3: 20,
      active: true,
      ...fields,
    })
    .select("id")
    .single();
  if (error) throw new Error(`seedVehicle: ${error.message}`);
  vehicles.push(data.id);
  return data.id;
}

/** A crew with one member, optionally bound to a signed-in test user. */
export async function seedTeamWithMember(
  userId: string | null = null,
  db: SupabaseClient = admin(),
): Promise<{ teamId: string; employeeId: string }> {
  const team = await db
    .from("internal_teams")
    .insert({ name: `UAT crew ${Date.now()}`, city: "Steffisburg", canton: "BE" })
    .select("id")
    .single();
  if (team.error) throw new Error(`seedTeam: ${team.error.message}`);
  teams.push(team.data.id);

  const employee = await db
    .from("employees")
    .insert({
      full_name: `UAT crew member ${Date.now()}`,
      email: `uat.crew.${Date.now()}@ps-umzug-test.invalid`,
      role: "mover",
      active: true,
      ...(userId ? { user_id: userId } : {}),
    })
    .select("id")
    .single();
  if (employee.error) throw new Error(`seedEmployee: ${employee.error.message}`);
  employees.push(employee.data.id);

  const member = await db
    .from("crew_members")
    .insert({ team_id: team.data.id, employee_id: employee.data.id, crew_role: "mover" });
  if (member.error) throw new Error(`seedCrewMember: ${member.error.message}`);

  return { teamId: team.data.id, employeeId: employee.data.id };
}

export function trackIncident(id: string): void {
  incidents.push(id);
}

/** Removes everything the fixtures created, children before parents. */
export async function cleanupFixtures(): Promise<void> {
  const db = admin();
  if (incidents.length) await db.from("incidents").delete().in("id", incidents.splice(0));
  if (invoices.length) {
    const ids = invoices.splice(0);
    await db.from("invoice_events").delete().in("invoice_id", ids);
    await db.from("invoice_lines").delete().in("invoice_id", ids);
    await db.from("invoices").delete().in("id", ids);
  }
  if (jobs.length) {
    const ids = jobs.splice(0);
    await db.from("invoice_events").delete().in("invoice_id", ids);
    await db.from("invoices").delete().in("job_id", ids);
    await db.from("job_reviews").delete().in("job_id", ids);
    await db.from("job_events_exec").delete().in("job_id", ids);
    await db.from("incidents").delete().in("job_id", ids);
    await db.from("jobs_execution").delete().in("id", ids);
  }
  if (teams.length) {
    const ids = teams.splice(0);
    await db.from("crew_members").delete().in("team_id", ids);
    await db.from("internal_teams").delete().in("id", ids);
  }
  if (employees.length) await db.from("employees").delete().in("id", employees.splice(0));
  if (vehicles.length) await db.from("vehicles").delete().in("id", vehicles.splice(0));
  if (leads.length) await db.from("leads").delete().in("id", leads.splice(0));
}
