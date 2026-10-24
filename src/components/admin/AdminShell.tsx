import { ForgotPassword } from "@/components/auth/ForgotPassword";
import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { User } from "@supabase/supabase-js";

import { Logo } from "@/components/brand/Logo";
import { useAdminLanguage } from "@/components/admin/useAdminLanguage";
import { LanguageSwitcher } from "@/components/shell/LanguageSwitcher";
import { supabase } from "@/integrations/supabase/client";
import type { Lang } from "@/i18n/config";
import { canOpenConsole } from "@/lib/partner-admin-data";
import { unreadThreadCount } from "@/lib/inbox";

const TABS = [
  { to: "/admin", key: "dashboard", match: "/admin" },
  // DOP workflow: Neue Anfragen → Offerten → Aufträge (incl. Zuteilung).
  { to: "/admin/anfragen", key: "anfragen", match: "/admin/anfragen" },
  { to: "/admin/offerten", key: "offerten", match: "/admin/offerten" },
  { to: "/admin/auftraege", key: "auftraege", match: "/admin/auftraege" },
  { to: "/admin/team", key: "team", match: "/admin/team" },
  { to: "/admin/vorfaelle", key: "vorfaelle", match: "/admin/vorfaelle" },
  { to: "/admin/kunden", key: "kunden", match: "/admin/kunden" },
  { to: "/admin/postfach", key: "postfach", match: "/admin/postfach" },

  { to: "/admin/freigaben", key: "freigaben", match: "/admin/freigaben" },
  { to: "/admin/partner", key: "partner", match: "/admin/partner" },
  { to: "/admin/preise", key: "preise", match: "/admin/preise" },
  { to: "/admin/inventar", key: "inventar", match: "/admin/inventar" },
  { to: "/admin/finanzen", key: "finanzen", match: "/admin/finanzen" },
  { to: "/admin/zahlungen", key: "zahlungen", match: "/admin/zahlungen" },
  { to: "/admin/qr-rechnung", key: "qrRechnung", match: "/admin/qr-rechnung" },
  { to: "/admin/ai-assist", key: "aiAssist", match: "/admin/ai-assist" },
  { to: "/admin/analytics", key: "analytics", match: "/admin/analytics" },
  { to: "/admin/legal/company", key: "legal", match: "/admin/legal" },
  {
    to: "/admin/produktionsbereitschaft",
    key: "produktionsbereitschaft",
    match: "/admin/produktionsbereitschaft",
  },
  { to: "/admin/einstellungen", key: "einstellungen", match: "/admin/einstellungen" },
] as const;


type Gate = "loading" | "signed-out" | "no-access" | "ok";

export function AdminShell({ children }: { children: ReactNode }) {
  const { t } = useTranslation("admin");
  const [user, setUser] = useState<User | null>(null);
  const [gate, setGate] = useState<Gate>("loading");
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { active, setLanguage } = useAdminLanguage(user?.id ?? null);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let alive = true;
    async function evaluate(current: User | null) {
      if (!alive) return;
      setUser(current);
      if (!current) {
        setGate("signed-out");
        return;
      }
      try {
        setGate((await canOpenConsole()) ? "ok" : "no-access");
      } catch {
        setGate("no-access");
      }
    }
    void supabase.auth.getSession().then(({ data }) => void evaluate(data.session?.user ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setGate("loading");
      void evaluate(session?.user ?? null);
    });
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Unread mail is an operational signal, so the badge refreshes on a timer
  // rather than only on navigation.
  useEffect(() => {
    if (gate !== "ok") return;
    let alive = true;
    const load = () => void unreadThreadCount().then((n) => alive && setUnread(n)).catch(() => undefined);
    load();
    const timer = setInterval(load, 60_000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [gate, path]);

  return (
    <div className="min-h-screen bg-canvas">
      <header className="bg-ink">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 md:px-8">
          <Logo tone="light" />
          <div className="flex items-center gap-3 md:gap-4">
            <p className="label-mono hidden text-primary-light lg:block">{user?.email ?? t("header.brand")}</p>
            <LanguageSwitcher current={active} tone="dark" onSelect={(lang: Lang) => setLanguage(lang)} />
            {user ? (
              <button
                type="button"
                onClick={() => void supabase.auth.signOut()}
                className="label-mono border border-primary-light px-3 py-2 text-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-light"
              >
                {t("header.signOut")}
              </button>
            ) : null}
          </div>
        </div>
        {gate === "ok" ? (
          <nav aria-label={t("header.nav")} className="mx-auto max-w-7xl overflow-x-auto px-4 md:px-8">
            <ul className="flex min-w-max gap-1">
              {TABS.map((tab) => {
                const activeTab = tab.match === "/admin" ? path === "/admin" || path === "/admin/" : path.startsWith(tab.match);
                return (
                  <li key={tab.to}>
                    <Link
                      to={tab.to}
                      className={`label-mono block border-b-2 px-4 py-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-light ${
                        activeTab ? "border-primary text-surface" : "border-transparent text-primary-light"
                      }`}
                    >
                      {t(`header.tabs.${tab.key}`)}
                      {tab.key === "postfach" && unread > 0 ? (
                        <span className="data-mono ml-2 inline-block bg-primary px-1.5 py-0.5 text-[0.65rem] text-primary-foreground">
                          {unread}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        ) : null}
      </header>
      <div aria-hidden="true" className="brand-rule h-px w-full" />
      <main className="mx-auto max-w-7xl px-4 py-10 md:px-8">
        {gate === "loading" ? (
          <p className="label-mono text-soft">{t("gate.loading")}</p>
        ) : gate === "signed-out" ? (
          <AdminSignIn />
        ) : gate === "no-access" ? (
          <section className="max-w-xl border border-line bg-surface p-6">
            <p className="label-mono text-primary">{t("gate.noAccessEyebrow")}</p>
            <h1 className="mt-3 text-2xl">{t("gate.noAccessTitle")}</h1>
            <p className="mt-3 text-sm text-ink-2">{t("gate.noAccessBody")}</p>
          </section>
        ) : (
          children
        )}
      </main>
    </div>
  );
}

function AdminSignIn() {
  const { t } = useTranslation("admin");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setError(null);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: String(data.get("email") ?? ""),
      password: String(data.get("password") ?? ""),
    });
    if (signInError) setError(t("signIn.failed"));
    setBusy(false);
  }

  return (
    <form onSubmit={onSubmit} className="max-w-md border border-ink bg-surface p-6">
      <p className="label-mono text-primary">{t("signIn.eyebrow")}</p>
      <h1 className="mt-3 text-3xl">{t("signIn.title")}</h1>
      <label className="mt-6 block text-sm">
        <span className="label-mono text-soft">{t("signIn.email")}</span>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          className="mt-1 w-full border border-line bg-canvas px-3 py-2 text-sm outline-none focus:border-primary"
        />
      </label>
      <label className="mt-4 block text-sm">
        <span className="label-mono text-soft">{t("signIn.password")}</span>
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="mt-1 w-full border border-line bg-canvas px-3 py-2 text-sm outline-none focus:border-primary"
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
        {busy ? t("signIn.busy") : t("signIn.submit")}
      </button>
      <ForgotPassword />
    </form>
  );
}
