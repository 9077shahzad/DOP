import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";

import { ForgotPassword } from "@/components/auth/ForgotPassword";
import { supabase } from "@/integrations/supabase/client";

export function PortalSignIn() {
  const { t } = useTranslation("portal");
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setFailed(false);
    const { error } = await supabase.auth.signInWithPassword({
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
    });
    if (error) setFailed(true);
    setBusy(false);
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 md:px-8">
      <form onSubmit={onSubmit} className="max-w-md border border-ink bg-surface p-6 md:p-8">
        <p className="label-mono text-primary">{t("signin.eyebrow")}</p>
        <h1 className="mt-3 text-3xl">{t("signin.title")}</h1>
        <p className="mt-3 text-sm text-ink-2">{t("signin.note")}</p>

        <label className="mt-6 block text-sm">
          <span className="label-mono text-soft">{t("signin.email")}</span>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className="mt-1 w-full border border-line bg-canvas px-3 py-2 text-sm outline-none focus:border-ink"
          />
        </label>
        <label className="mt-4 block text-sm">
          <span className="label-mono text-soft">{t("signin.password")}</span>
          <input
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="mt-1 w-full border border-line bg-canvas px-3 py-2 text-sm outline-none focus:border-ink"
          />
        </label>

        {failed ? (
          <p role="alert" className="mt-4 border-l-4 border-destructive bg-canvas px-3 py-2 text-sm text-destructive">
            {t("signin.error")}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={busy}
          className="mt-6 w-full bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-60"
        >
          {busy ? t("signin.busy") : t("signin.submit")}
        </button>
        <ForgotPassword />
      </form>
    </div>
  );
}
