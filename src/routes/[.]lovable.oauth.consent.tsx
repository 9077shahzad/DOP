import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type OAuthNamespace = {
  getAuthorizationDetails: (id: string) => Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>;
  approveAuthorization: (id: string) => Promise<{ data: AuthorizationRedirect | null; error: { message: string } | null }>;
  denyAuthorization: (id: string) => Promise<{ data: AuthorizationRedirect | null; error: { message: string } | null }>;
};

type AuthorizationDetails = {
  client?: { name?: string | null } | null;
  redirect_url?: string | null;
  redirect_to?: string | null;
};

type AuthorizationRedirect = { redirect_url?: string | null; redirect_to?: string | null };

function oauthApi(): OAuthNamespace {
  return (supabase.auth as unknown as { oauth: OAuthNamespace }).oauth;
}

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s['authorization_id'] === "string" ? s['authorization_id'] : "",
  }),
  loader: async ({ location }) => {
    const authorizationId = new URLSearchParams(location.search).get("authorization_id") ?? "";
    if (!authorizationId) throw new Error("Missing authorization_id");
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) return null;
    const { data, error } = await oauthApi().getAuthorizationDetails(authorizationId);
    if (error) throw error;
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) throw redirect({ href: immediate });
    return data;
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <main className="mx-auto max-w-md px-6 py-16">
      <h1 className="text-xl font-semibold text-foreground">Autorisierung nicht möglich</h1>
      <p className="mt-2 text-sm text-muted-foreground">{String((error as Error)?.message ?? error)}</p>
    </main>
  ),
});

function Consent() {
  const details = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [signedIn, setSignedIn] = useState(details !== null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [client, setClient] = useState<string>(details?.client?.name ?? "");

  useEffect(() => {
    if (!signedIn) return;
    if (client) return;
    void oauthApi()
      .getAuthorizationDetails(authorization_id)
      .then(({ data }) => setClient(data?.client?.name ?? ""));
  }, [signedIn, client, authorization_id]);

  async function signIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError(null);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
    });
    setBusy(false);
    if (signInError) {
      setError(signInError.message);
      return;
    }
    setSignedIn(true);
  }

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    const api = oauthApi();
    const { data, error: decisionError } = approve
      ? await api.approveAuthorization(authorization_id)
      : await api.denyAuthorization(authorization_id);
    if (decisionError) {
      setBusy(false);
      setError(decisionError.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("Der Autorisierungsserver hat keine Weiterleitung zurückgegeben.");
      return;
    }
    window.location.href = target;
  }

  if (!signedIn) {
    return (
      <main className="mx-auto max-w-md px-6 py-16">
        <h1 className="text-xl font-semibold text-foreground">Anmelden</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Melden Sie sich mit Ihrem PS Umzug Konto an, um die Verbindung zu bestätigen.
        </p>
        {error ? <p role="alert" className="mt-4 text-sm text-destructive">{error}</p> : null}
        <form className="mt-6 space-y-3" onSubmit={signIn}>
          <input
            name="email"
            type="email"
            required
            placeholder="E-Mail"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
          <input
            name="password"
            type="password"
            required
            placeholder="Passwort"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            Anmelden
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <h1 className="text-xl font-semibold text-foreground">
        {client || "Eine Anwendung"} mit Ihrem Konto verbinden
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Damit kann {client || "die Anwendung"} in Ihrem Namen auf die PS Umzug Plattform zugreifen – mit genau Ihren
        Berechtigungen.
      </p>
      {error ? <p role="alert" className="mt-4 text-sm text-destructive">{error}</p> : null}
      <div className="mt-6 flex gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={() => decide(true)}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
        >
          Zulassen
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => decide(false)}
          className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground disabled:opacity-60"
        >
          Ablehnen
        </button>
      </div>
    </main>
  );
}
