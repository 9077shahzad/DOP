import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";

import { INVITABLE_ROLES, inviteStaff } from "@/lib/staff-invite.functions";

const LABEL: Record<(typeof INVITABLE_ROLES)[number], string> = {
  super_admin: "Super-Admin",
  management: "Geschäftsleitung",
  ops_manager: "Betriebsleitung",
  dispatcher: "Disposition",
  sales: "Verkauf",
  surveyor: "Besichtigung",
  finance: "Finanzen",
  crew_leader: "Teamleiter",
  driver: "Fahrer",
  mover: "Möbelmonteur",
  cleaner: "Reinigung",
};

/** Sends a sign-up invitation; the person sets their own password via the e-mailed link. */
export function InviteStaffCard() {
  const invite = useServerFn(inviteStaff);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<(typeof INVITABLE_ROLES)[number]>("sales");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function send() {
    setBusy(true);
    setMsg(null);
    try {
      await invite({ data: { email, fullName, role, redirectTo: `${window.location.origin}/reset-password` } });
      setMsg({ ok: true, text: `Einladung an ${email} gesendet.` });
      setEmail("");
      setFullName("");
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Einladung fehlgeschlagen." });
    } finally {
      setBusy(false);
    }
  }

  const field = "mt-1 w-full border border-line bg-canvas px-3 py-2 text-sm outline-none focus:border-primary";
  return (
    <section className="mb-6 border border-line bg-surface p-4">
      <h2 className="text-lg font-semibold">Zugang einladen</h2>
      <p className="mt-1 text-sm text-ink-2">Die Person erhält eine E-Mail und legt ihr Passwort selbst fest.</p>
      <div className="mt-3 grid gap-3 md:grid-cols-4">
        <label className="text-sm"><span className="label-mono text-soft">Name</span>
          <input className={field} value={fullName} onChange={(e) => setFullName(e.target.value)} /></label>
        <label className="text-sm"><span className="label-mono text-soft">E-Mail</span>
          <input type="email" className={field} value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <label className="text-sm"><span className="label-mono text-soft">Rolle</span>
          <select className={field} value={role} onChange={(e) => setRole(e.target.value as typeof role)}>
            {INVITABLE_ROLES.map((r) => <option key={r} value={r}>{LABEL[r]}</option>)}
          </select></label>
        <button type="button" disabled={busy || !email.includes("@") || fullName.trim().length < 2} onClick={() => void send()}
          className="self-end bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">
          {busy ? "Wird gesendet …" : "Einladung senden"}
        </button>
      </div>
      {msg ? <p role={msg.ok ? "status" : "alert"} className={`mt-3 text-sm ${msg.ok ? "text-ink-2" : "text-destructive"}`}>{msg.text}</p> : null}
    </section>
  );
}
