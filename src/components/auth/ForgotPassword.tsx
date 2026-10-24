import { useState } from "react";

import { supabase } from "@/integrations/supabase/client";

/** "Passwort vergessen?" — sends a reset link that lands on /reset-password. */
export function ForgotPassword() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "sent" | "error">("idle");

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="label-mono mt-4 text-primary hover:underline">
        Passwort vergessen?
      </button>
    );
  }

  async function send() {
    setState("busy");
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setState(error ? "error" : "sent");
  }

  return (
    <div className="mt-4 border-t border-line pt-4 text-sm">
      {state === "sent" ? (
        <p role="status" className="text-ink-2">
          Falls ein Konto mit dieser Adresse besteht, erhalten Sie in Kürze einen Link zum Zurücksetzen.
        </p>
      ) : (
        <>
          <label className="block">
            <span className="label-mono text-soft">E-Mail für Passwort-Link</span>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full border border-line bg-canvas px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </label>
          {state === "error" ? (
            <p role="alert" className="mt-2 text-destructive">Link konnte nicht gesendet werden. Bitte später erneut versuchen.</p>
          ) : null}
          <button
            type="button"
            disabled={state === "busy" || !email.includes("@")}
            onClick={() => void send()}
            className="mt-3 w-full border border-ink px-4 py-2 font-semibold disabled:opacity-60"
          >
            {state === "busy" ? "Wird gesendet …" : "Link senden"}
          </button>
        </>
      )}
    </div>
  );
}
