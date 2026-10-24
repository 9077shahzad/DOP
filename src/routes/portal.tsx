import { Link, Outlet, createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { User } from "@supabase/supabase-js";

import { Logo } from "@/components/brand/Logo";
import { PortalProvider, signOut } from "@/components/portal/PortalContext";
import { PortalSignIn } from "@/components/portal/PortalSignIn";
import { usePortalLanguage } from "@/components/portal/usePortalLanguage";
import { LanguageSwitcher } from "@/components/shell/LanguageSwitcher";
import { supabase } from "@/integrations/supabase/client";
import type { Lang } from "@/i18n/config";
import { privateHead } from "@/lib/seo";
import "@/i18n/audit";

export const Route = createFileRoute("/portal")({
  ssr: false,
  head: () => privateHead("de", "portalOverview"),
  component: PortalLayout,
});

const TABS = [
  { to: "/portal", key: "overview", exact: true },
  { to: "/portal/neuer-auftrag", key: "newJob" },
  { to: "/portal/auftraege", key: "jobs" },
  { to: "/portal/abnahmeprotokoll", key: "handover" },
  { to: "/portal/rahmenpreise", key: "rates" },
  { to: "/portal/liegenschaften", key: "portfolio" },
  { to: "/portal/standorte", key: "sites" },

  { to: "/portal/rechnungen", key: "invoices" },
  { to: "/portal/anliegen", key: "support" },
] as const;

function PortalLayout() {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const { t } = useTranslation("portal");
  const { active, setLanguage } = usePortalLanguage(user?.id ?? null);

  useEffect(() => {
    let alive = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      setUser(data.session?.user ?? null);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <header className="bg-ink">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 md:px-8">
          <Logo tone="light" />
          <div className="flex items-center gap-3 md:gap-4">
            <p className="label-mono hidden text-primary-light lg:block">{t("header.brand")}</p>
            <LanguageSwitcher current={active} tone="dark" onSelect={(lang: Lang) => setLanguage(lang)} />
            {user ? (
              <button
                type="button"
                onClick={() => void signOut()}
                className="label-mono rounded-md border border-primary-light/40 px-3 py-2 text-line hover:border-primary-light hover:text-primary-light"
              >
                {t("header.signOut")}
              </button>
            ) : null}
          </div>
        </div>

        {user ? (
          <nav aria-label={t("header.nav")} className="mx-auto max-w-7xl px-4 md:px-8">
            <ul className="scroll-x flex flex-nowrap gap-px overflow-x-auto bg-ink-2 md:flex-wrap">
              {TABS.map((tab) => (
                <li key={tab.to}>
                  <Link
                    to={tab.to}
                    activeOptions={{ exact: "exact" in tab ? tab.exact : false }}
                    activeProps={{ className: "bg-primary text-primary-foreground" }}
                    inactiveProps={{ className: "bg-ink text-line hover:text-primary-light" }}
                    className="label-mono block px-4 py-3"
                  >
                    {t(`nav.${tab.key}`)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}
      </header>
      <div aria-hidden="true" className="brand-rule h-px w-full" />

      <main className="flex-1">
        {!ready ? (
          <p className="label-mono mx-auto max-w-7xl px-4 py-12 text-soft md:px-8">{t("loading")}</p>
        ) : user ? (
          <PortalProvider user={user}>
            <Outlet />
          </PortalProvider>
        ) : (
          <PortalSignIn />
        )}
      </main>

      <div aria-hidden="true" className="brand-rule mt-16 h-px w-full" />
      <footer className="bg-ink">
        <p className="label-mono mx-auto max-w-7xl px-4 py-5 text-soft md:px-8">
          {t("footer", { year: new Date().getFullYear() })} ·{" "}
          <Link to="/$lang" params={{ lang: active }} className="text-line hover:text-primary-light">
            ps-umzug.ch
          </Link>
        </p>
      </footer>
    </div>
  );
}
