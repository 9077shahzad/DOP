import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";

import { brandButton } from "@/components/brand/Button";
import { supabase } from "@/integrations/supabase/client";

/** Account gate in front of the application: the draft row needs an auth.uid(). */
export function PartnerAuth({ defaultMode = "signup" }: { defaultMode?: "signup" | "signin" }) {
  const { t } = useTranslation("partner");
  const [mode, setMode] = useState<"signup" | "signin">(defaultMode);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    setBusy(true);
    setError(null);
    setNotice(null);

    if (mode === "signup") {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.href },
      });
      if (signUpError) setError(signUpError.message);
      else if (!data.session) setNotice(t("auth.confirmEmail"));
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) setError(t("auth.signInFailed"));
    }
    setBusy(false);
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12 md:px-8">
      <p className="label-mono text-primary">{t("auth.eyebrow")}</p>
      <h1 className="mt-2 text-3xl">{mode === "signup" ? t("auth.signUpTitle") : t("auth.signInTitle")}</h1>
      <p className="mt-2 text-sm text-ink-2">{t("auth.lead")}</p>

      <form onSubmit={onSubmit} className="mt-6 rounded-md rounded-2xl bg-surface p-5">
        <label className="block text-sm">
          <span className="label-mono text-soft">{t("auth.email")}</span>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            inputMode="email"
            className="mt-1 w-full rounded-md border border-line bg-canvas px-3 py-3 text-base outline-none focus:border-primary md:text-sm"
          />
        </label>
        <label className="mt-4 block text-sm">
          <span className="label-mono text-soft">{t("auth.password")}</span>
          <input
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            className="mt-1 w-full rounded-md border border-line bg-canvas px-3 py-3 text-base outline-none focus:border-primary md:text-sm"
          />
        </label>

        {error ? (
          <p role="alert" className="mt-4 rounded-md border-l-4 border-destructive bg-canvas px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}
        {notice ? (
          <p role="status" className="mt-4 rounded-md border-l-4 border-primary bg-canvas px-3 py-2 text-sm text-ink-2">
            {notice}
          </p>
        ) : null}

        <button type="submit" disabled={busy} className={`${brandButton({ variant: "primary" })} mt-6 w-full`}>
          {busy ? t("auth.busy") : mode === "signup" ? t("auth.signUp") : t("auth.signIn")}
        </button>

        <button
          type="button"
          onClick={() => {
            setMode(mode === "signup" ? "signin" : "signup");
            setError(null);
            setNotice(null);
          }}
          className="label-mono mt-4 w-full text-primary hover:underline"
        >
          {mode === "signup" ? t("auth.haveAccount") : t("auth.noAccount")}
        </button>
      </form>
    </div>
  );
}
