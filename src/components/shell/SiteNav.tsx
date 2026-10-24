import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { Logo } from "@/components/brand/Logo";
import { BookNowLink } from "@/components/brand/BookNow";
import { LanguageSwitcher } from "@/components/shell/LanguageSwitcher";
import { buttonVariants } from "@/components/system";
import type { Lang } from "@/i18n/config";
import { cn } from "@/lib/utils";

/**
 * Public header — approved PS Umzug navigation.
 *
 * Startseite · Dienstleistungen · Über uns · Partner · Kontakt · Offerte erhalten.
 *
 * "Partner" points at the PS Umzug partner information page (apply, process,
 * compensation models, status lookup).
 *
 * Desktop keeps the links inline; below `lg` everything except the booking
 * action collapses into one panel.
 */
export function SiteNav({ lang }: { lang: Lang }) {
  const { t } = useTranslation(["nav", "common"]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const pages = [
    { to: "/$lang" as const, label: t("nav:homeLink"), exact: true },
    { to: "/$lang/leistungen" as const, label: t("nav:services"), exact: false },
    { to: "/$lang/ueber-uns" as const, label: t("nav:about"), exact: false },
    { to: "/$lang/partner" as const, label: t("nav:becomePartner"), exact: false },
    { to: "/$lang/kontakt" as const, label: t("nav:contact"), exact: false },
  ];

  const linkClass = "label-mono whitespace-nowrap text-ink transition-colors hover:text-primary";

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-canvas/85 backdrop-blur-md">
      <nav
        aria-label={t("nav:primary")}
        className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3.5 md:px-8"
      >
        <Link to="/$lang" params={{ lang }} className="shrink-0" onClick={() => setOpen(false)}>
          <Logo />
        </Link>

        <div className="flex min-w-0 items-center gap-1.5 sm:gap-2 xl:gap-4">
          <ul className="hidden items-center gap-4 lg:flex">
            {pages.map((p) => (
              <li key={p.to}>
                <Link
                  to={p.to}
                  params={{ lang }}
                  activeOptions={{ exact: p.exact }}
                  activeProps={{ className: "label-mono whitespace-nowrap text-primary" }}
                  className={linkClass}
                >
                  {p.label}
                </Link>
              </li>
            ))}
          </ul>

          {/* Secondary access to the customer portal — PS Umzug wording. */}
          <Link
            to="/portal"
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "hidden lg:inline-flex")}
          >
            {t("common:cta.portal")}
          </Link>

          <LanguageSwitcher current={lang} />

          {/* Below 480px the bar carries logo + language + menu only; the offer
              action stays reachable through the persistent mobile action bar. */}
          <BookNowLink
            lang={lang}
            size="sm"
            withIcon={false}
            label={t("nav:getQuote")}
            className="hidden shrink-0 min-[480px]:inline-flex"
          />

          <button
            type="button"
            aria-expanded={open}
            aria-controls="site-menu"
            aria-label={t("nav:primary")}
            onClick={() => setOpen((v) => !v)}
            className="grid size-11 shrink-0 place-items-center rounded-lg text-ink transition-colors hover:bg-surface lg:hidden"
          >
            {open ? <X aria-hidden="true" className="size-5" /> : <Menu aria-hidden="true" className="size-5" />}
          </button>
        </div>
      </nav>

      {open ? (
        <div id="site-menu" className="border-t border-line bg-canvas lg:hidden">
          <ul className="mx-auto max-w-7xl px-4 py-3 md:px-8">
            {pages.map((p) => (
              <li key={p.to}>
                <Link
                  to={p.to}
                  params={{ lang }}
                  onClick={() => setOpen(false)}
                  className="flex min-h-13 items-center text-[1.0625rem] text-ink"
                >
                  {p.label}
                </Link>
              </li>
            ))}
            <li>
              <BookNowLink
                lang={lang}
                size="sm"
                withIcon={false}
                label={t("nav:getQuote")}
                onClick={() => setOpen(false)}
                className="my-3 w-full justify-center"
              />
            </li>
            <li>
              <Link
                to="/portal"
                onClick={() => setOpen(false)}
                className="flex min-h-13 items-center text-[1.0625rem] text-ink"
              >
                {t("common:cta.portal")}
              </Link>
            </li>
          </ul>
        </div>
      ) : null}
    </header>
  );
}
