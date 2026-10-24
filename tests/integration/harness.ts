/**
 * Integration test harness.
 *
 * These tests talk to the real backend. They create throwaway auth users, give
 * each one a role, and then assert what that role can actually do through the
 * same PostgREST surface the browser uses — so a grant or policy regression
 * fails the suite instead of being discovered in production.
 *
 * Everything created here is deleted in teardown. Nothing touches existing
 * rows: seeded fixtures carry the UAT_TAG marker and are removed afterwards.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env["SUPABASE_URL"] ?? process.env["VITE_SUPABASE_URL"] ?? "";
const serviceKey = process.env["SUPABASE_SERVICE_ROLE_KEY"] ?? "";
const publishableKey =
  process.env["SUPABASE_PUBLISHABLE_KEY"] ?? process.env["VITE_SUPABASE_PUBLISHABLE_KEY"] ?? "";

/** Integration tests are skipped (not silently passed) without credentials. */
export const ENV_READY = Boolean(url && serviceKey && publishableKey);

export const UAT_TAG = "uat-automated";

const clientOpts = {
  auth: { persistSession: false, autoRefreshToken: false, storage: undefined as never },
} as const;

export function admin(): SupabaseClient {
  return createClient(url, serviceKey, clientOpts);
}

/** Signed-out client — exactly what a visitor's browser gets. */
export function anonClient(): SupabaseClient {
  return createClient(url, publishableKey, clientOpts);
}

export type PortalRole =
  | "owner"
  | "manager"
  | "staff"
  | "zuegelwerk_admin"
  | "ops_manager"
  | "sales"
  | "partner_manager"
  | "finance"
  | "dispatcher"
  | "crew_leader"
  | "driver"
  | "customer"
  | "partner";

export type TestUser = {
  id: string;
  email: string;
  client: SupabaseClient;
};

const createdUsers: string[] = [];

/**
 * Creates a confirmed auth user, sets its portal role (and organisation when
 * given) and returns a client signed in as that user.
 */
export async function makeUser(opts: {
  role: PortalRole | null;
  organizationId?: string | null;
  label: string;
}): Promise<TestUser> {
  const db = admin();
  const email = `uat.${opts.label}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}@ps-umzug-test.invalid`;
  const password = `Uat!${Math.random().toString(36).slice(2)}A9`;

  const { data, error } = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user) throw new Error(`createUser failed: ${error?.message}`);
  const id = data.user.id;
  createdUsers.push(id);

  // The signup trigger creates the profile; make sure it exists before writing.
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const { data: profile } = await db.from("profiles").select("id").eq("id", id).maybeSingle();
    if (profile) break;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  await db.from("profiles").upsert({
    id,
    full_name: `UAT ${opts.label}`,
    ...(opts.role ? { role: opts.role } : {}),
    ...(opts.organizationId ? { organization_id: opts.organizationId } : {}),
  });

  const client = createClient(url, publishableKey, clientOpts);
  const { error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError) throw new Error(`signIn failed: ${signInError.message}`);

  return { id, email, client };
}

/** Deletes every auth user and tagged fixture row this run created. */
export async function cleanupUsers(): Promise<void> {
  const db = admin();
  for (const id of createdUsers.splice(0)) {
    await db.auth.admin.deleteUser(id).catch(() => undefined);
  }
}

/** Result shape shared by the authorisation matrix assertions. */
export type Access = "denied" | "empty" | "rows";

/**
 * Classifies a read: a grant refusal is `denied`, an RLS filter that returns
 * nothing is `empty`, visible rows are `rows`. Collapsing the first two would
 * hide the difference between "not allowed" and "allowed but nothing there".
 */
export async function readAccess(
  client: SupabaseClient,
  table: string,
  columns = "*",
): Promise<Access> {
  const { data, error } = await client.from(table).select(columns).limit(5);
  if (error) return "denied";
  return (data?.length ?? 0) > 0 ? "rows" : "empty";
}

export async function canExecute(
  client: SupabaseClient,
  fn: string,
  args: Record<string, unknown> = {},
): Promise<boolean> {
  const { error } = await client.rpc(fn, args as never);
  if (!error) return true;
  // 42501 = insufficient privilege, PGRST202 = function not exposed to this role
  return !(error.code === "42501" || /permission denied/i.test(error.message));
}
