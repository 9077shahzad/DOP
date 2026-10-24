import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { User } from "@supabase/supabase-js";

import { brandButton } from "@/components/brand/Button";
import { Logo } from "@/components/brand/Logo";
import { PartnerAuth } from "@/components/partner/PartnerAuth";
import { Opportunities } from "@/components/partner/Opportunities";
import { PartnerJobs } from "@/components/partner/Jobs";

import { LanguageSwitcher } from "@/components/shell/LanguageSwitcher";
import { supabase } from "@/integrations/supabase/client";
import { detectLanguage, type Lang } from "@/i18n/config";


export const Route = createFileRoute("/partner")({
  ssr: false,
  component: PartnerArea,
});

/** Stage 3 will host the partner workspace here; today it confirms the state. */
function PartnerArea() {
  const { t, i18n } = useTranslation("partner");
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [partner, setPartner] = useState<{ reference: string; status: string } | null>(null);
  const [tab, setTab] = useState<"overview" | "opportunities" | "jobs">("overview");
  const lang = (i18n.language as Lang) ?? detectLanguage();


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

  useEffect(() => {
    if (!user) {
      setPartner(null);
      return;
    }
    void supabase
      .from("partners")
      .select("reference, status")
      .eq("created_by", user.id)
      .limit(1)
      .then(({ data }) => setPartner((data?.[0] as { reference: string; status: string }) ?? null));
  }, [user]);

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <header className="bg-ink">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 md:px-8">
          <Logo tone="light" />
          <div className="flex items-center gap-3">
            <p className="label-mono hidden text-primary-light lg:block">{t("area.brand")}</p>
            <LanguageSwitcher current={lang} tone="dark" onSelect={(next: Lang) => void i18n.changeLanguage(next)} />
            {user ? (
              <button
                type="button"
                onClick={() => void supabase.auth.signOut()}
                className="label-mono rounded-md border border-primary-light/40 px-3 py-2 text-line hover:border-primary-light hover:text-primary-light"
              >
                {t("area.signOut")}
              </button>
            ) : null}
          </div>
        </div>
      </header>

      <main className="flex-1">
        {!ready ? (
          <p className="label-mono mx-auto max-w-3xl px-4 py-16 text-soft md:px-8">{t("apply.loading")}</p>
        ) : !user ? (
          <PartnerAuth defaultMode="signin" />
        ) : (
          <div className="mx-auto max-w-4xl px-4 py-16 md:px-8">
            <p className="label-mono text-primary">{t("area.eyebrow")}</p>
            <h1 className="mt-2 text-3xl md:text-4xl">{t("area.title")}</h1>
            <p className="mt-3 text-ink-2">{t("area.lead")}</p>

            <div role="tablist" aria-label={t("area.tabsLabel")} className="mt-8 flex flex-wrap gap-2">
              {(["overview", "opportunities", "jobs"] as const).map((key) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={tab === key}
                  onClick={() => setTab(key)}
                  className={`label-mono rounded-md border px-3 py-2 ${
                    tab === key ? "border-primary bg-primary text-primary-foreground" : "border-line bg-surface text-ink-2"
                  }`}
                >
                  {t(`area.tab.${key}`)}
                </button>
              ))}
            </div>

            <div className="mt-8">
              {tab === "opportunities" ? (
                <Opportunities />
              ) : tab === "jobs" ? (
                <PartnerJobs />

              ) : (
                <>
                  {partner ? (
                    <dl className="grid gap-px overflow-hidden rounded-md border border-line bg-line sm:grid-cols-2">
                      <div className="bg-surface p-4">
                        <dt className="label-mono text-soft">{t("area.reference")}</dt>
                        <dd className="mt-1 font-mono text-ink">{partner.reference}</dd>
                      </div>
                      <div className="bg-surface p-4">
                        <dt className="label-mono text-soft">{t("area.status")}</dt>
                        <dd className="mt-1 text-ink">{t(`status.${partner.status}`)}</dd>
                      </div>
                    </dl>
                  ) : (
                    <p className="rounded-md border border-line bg-surface p-4 text-sm text-ink-2">
                      {t("area.noApplication")}
                    </p>
                  )}
                  <div className="mt-8 flex flex-wrap gap-3">
                    <Link
                      to="/$lang/partner/registrieren"
                      params={{ lang }}
                      className={brandButton({ variant: "primary" })}
                    >
                      {partner ? t("area.continue") : t("area.start")}
                    </Link>
                    <Link to="/$lang/partner" params={{ lang }} className={brandButton({ variant: "ghost" })}>
                      {t("area.backToLanding")}
                    </Link>
                  </div>
                </>
              )}
            </div>
          </div>

        )}
      </main>
    </div>
  );
}
