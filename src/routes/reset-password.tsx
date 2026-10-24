import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";

import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Passwort festlegen – PS Umzug" },
      { name: "description", content: "Neues Passwort für Ihr PS Umzug Konto festlegen." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Passwort festlegen – PS Umzug" },
      { property: "og:description", content: "Neues Passwort für Ihr PS Umzug Konto festlegen." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const [ready, setReady] = useState(false);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const repeat = String(form.get("repeat") ?? "");
    setError(null);
    if (password.length < 10) return setError("Das Passwort muss mindestens 10 Zeichen haben.");
    if (password !== repeat) return setError("Die beiden Passwörter stimmen nicht überein.");
    setBusy(true);
    const { error: err } = await supabase.auth.updateUser({ password, data: { must_change_password: false } });
    setBusy(false);
    if (err) return setError(err.message);
    setDone(true);
  }

  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <div className="border border-ink bg-surface p-6 md:p-8">
        <p className="label-mono text-primary">PS Umzug Zugang</p>
        <h1 className="mt-3 text-2xl">Passwort festlegen</h1>
        {done ? (
          <>
            <p role="status" className="mt-4 text-sm text-ink-2">Ihr Passwort wurde gespeichert.</p>
            <div className="mt-6 flex flex-wrap gap-3 text-sm">
              <a className="font-semibold text-primary underline" href="/admin">Zur Verwaltung</a>
              <a className="font-semibold text-primary underline" href="/crew">Zur Crew-App</a>
              <a className="font-semibold text-primary underline" href="/portal">Zum Kundenportal</a>
            </div>
          </>
        ) : !ready ? (
          <p className="mt-4 text-sm text-ink-2">
            Dieser Link ist ungültig oder abgelaufen. Bitte fordern Sie auf der Anmeldeseite über „Passwort vergessen?“ einen neuen Link an.
          </p>
        ) : (
          <form onSubmit={onSubmit}>
            <label className="mt-6 block text-sm">
              <span className="label-mono text-soft">Neues Passwort</span>
              <input name="password" type="password" required autoComplete="new-password" className="mt-1 w-full border border-line bg-canvas px-3 py-2 text-sm outline-none focus:border-ink" />
            </label>
            <label className="mt-4 block text-sm">
              <span className="label-mono text-soft">Passwort wiederholen</span>
              <input name="repeat" type="password" required autoComplete="new-password" className="mt-1 w-full border border-line bg-canvas px-3 py-2 text-sm outline-none focus:border-ink" />
            </label>
            {error ? <p role="alert" className="mt-4 border-l-4 border-destructive bg-canvas px-3 py-2 text-sm text-destructive">{error}</p> : null}
            <button type="submit" disabled={busy} className="mt-6 w-full bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-60">
              {busy ? "Wird gespeichert …" : "Passwort speichern"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
