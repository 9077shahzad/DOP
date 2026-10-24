import { Outlet, createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

import { ChatWidget } from "@/components/chat/ChatWidget";
import { CookieConsentProvider } from "@/components/legal/CookieConsent";
import { CompanyProvider } from "@/components/shell/CompanyContext";
import { MobileActionBar } from "@/components/shell/MobileActionBar";
import { StickyBookBar } from "@/components/shell/StickyBookBar";
import { SiteFooter } from "@/components/shell/SiteFooter";
import { SiteNav } from "@/components/shell/SiteNav";
import { TopBar } from "@/components/shell/TopBar";
import { fetchCompany, fetchMarkets } from "@/lib/company.functions";
import { DEFAULT_LANG, LOCALES, RTL_LANGS, detectLanguage, isLang, storeLanguage, type Lang } from "@/i18n/config";
import { resolveBareAlias } from "@/lib/legal-aliases";
import "@/i18n/audit";

export const Route = createFileRoute("/$lang")({
  beforeLoad: ({ params }) => {
    if (isLang(params.lang)) return;
    // A single unprefixed segment can still be a conventional legal URL
    // (/impressum, /privacy, /terms) — redirect it before 404ing.
    const detected = typeof window === "undefined" ? DEFAULT_LANG : detectLanguage();
    const target = resolveBareAlias(params.lang, detected);
    if (target) throw redirect({ href: target, statusCode: 301, throw: true });
    throw notFound();
  },

  // Public data: contact block + market flags, read once for the whole shell.
  // Shell chrome must never blank the page when one of these reads fails
  // (aborted client navigation, transient network) — fall back to empty data.
  loader: async () => {
    const [company, markets] = await Promise.all([
      fetchCompany().catch(() => null),
      fetchMarkets().catch(() => []),
    ]);
    return { company, markets };
  },
  component: LangLayout,
});

function LangLayout() {
  const { lang } = Route.useParams();
  const { company, markets } = Route.useLoaderData();
  const { i18n } = useTranslation();
  const active = (isLang(lang) ? lang : "de") as Lang;

  useEffect(() => {
    if (i18n.language !== active) void i18n.changeLanguage(active);
    storeLanguage(active);
    const html = document.documentElement;
    html.lang = LOCALES[active];
    html.dir = RTL_LANGS.includes(active) ? "rtl" : "ltr";
  }, [active, i18n]);

  return (
    <CompanyProvider value={{ company, markets }}>
      <CookieConsentProvider lang={active}>
        <div className="flex min-h-screen flex-col bg-canvas">
          <TopBar />
          <SiteNav lang={active} />
          <main className="flex-1 pb-16 md:pb-0">
            <Outlet />
          </main>
          <SiteFooter lang={active} />
          <MobileActionBar lang={active} />
          <StickyBookBar lang={active} />
          <ChatWidget lang={active} />
        </div>
      </CookieConsentProvider>
    </CompanyProvider>
  );
}
