import { useEffect, useState, type FormEvent } from "react";

import { supabase } from "@/integrations/supabase/client";

/**
 * Blocking first-login password change.
 *
 * Accounts created with a temporary password carry
 * `user_metadata.must_change_password = true`. Until the user sets their own
 * password the flag stays set and this overlay covers the app.
 */
export function PasswordChangeGate() {
  const [required, setRequired] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const check = async () => {
      const { data } = await supabase.auth.getUser();
      if (!active) return;
      setRequired(Boolean(data.user?.user_metadata?.["must_change_password"]));
    };

    void check();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        void check();
      }
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  if (!required) return null;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const repeat = String(form.get("repeat") ?? "");
    setError(null);

    if (password.length < 10) {
      setError("Das neue Passwort muss mindestens 10 Zeichen haben.");
      return;
    }
    if (password !== repeat) {
      setError("Die beiden Passwörter stimmen nicht überein.");
      return;
    }

    setBusy(true);
    const { error: updateError } = await supabase.auth.updateUser({
      password,
      data: { must_change_password: false },
    });
    setBusy(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setRequired(false);
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/70 p-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md border border-ink bg-surface p-6 md:p-8"
        aria-labelledby="pw-change-title"
      >
        <p className="label-mono text-primary">Erste Anmeldung</p>
        <h2 id="pw-change-title" className="mt-3 text-2xl">
          Bitte neues Passwort setzen
        </h2>
        <p className="mt-3 text-sm text-ink-2">
          Ihr Zugang wurde mit einem temporären Passwort erstellt. Bitte legen Sie jetzt ein
          eigenes Passwort fest, um fortzufahren.
        </p>

        <label className="mt-6 block text-sm">
          <span className="label-mono text-soft">Neues Passwort</span>
          <input
            name="password"
            type="password"
            required
            autoComplete="new-password"
            className="mt-1 w-full border border-line bg-canvas px-3 py-2 text-sm outline-none focus:border-ink"
          />
        </label>
        <label className="mt-4 block text-sm">
          <span className="label-mono text-soft">Passwort wiederholen</span>
          <input
            name="repeat"
            type="password"
            required
            autoComplete="new-password"
            className="mt-1 w-full border border-line bg-canvas px-3 py-2 text-sm outline-none focus:border-ink"
          />
        </label>

        {error ? (
          <p role="alert" className="mt-4 border-l-4 border-destructive bg-canvas px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={busy}
          className="mt-6 w-full bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-60"
        >
          {busy ? "Wird gespeichert …" : "Passwort speichern"}
        </button>
      </form>
    </div>
  );
}
