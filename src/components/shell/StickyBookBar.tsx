/**
 * Sticky booking bar for service and detail pages.
 *
 * Deliberately unobtrusive:
 *  - it only appears once the hero has scrolled out of view
 *  - it reserves its own height at the bottom of the document while visible,
 *    so it can never sit on top of the last line of content
 *  - it disappears the moment any form control takes focus, and stays away
 *    until focus leaves the form again
 *  - it is removed entirely for users who reached the bottom of a form
 */
import { useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { BookNowLink } from "@/components/brand/BookNow";
import { useCompany } from "@/components/shell/CompanyContext";
import { buttonVariants } from "@/components/system";
import { telHref } from "@/lib/company";
import { serviceOfPath } from "@/lib/booking";
import type { Lang } from "@/i18n/config";

const BAR_HEIGHT = 68;

function isFormControl(node: EventTarget | null): boolean {
  if (!(node instanceof HTMLElement)) return false;
  const tag = node.tagName.toLowerCase();
  return tag === "input" || tag === "textarea" || tag === "select" || node.isContentEditable;
}

export function StickyBookBar({ lang }: { lang: Lang }) {
  const { t } = useTranslation(["common", "svc"]);
  const company = useCompany();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const service = serviceOfPath(path);

  const [scrolledPastHero, setScrolledPastHero] = useState(false);
  const [formFocused, setFormFocused] = useState(false);

  useEffect(() => {
    // Reset on navigation: a new page starts with its hero on screen.
    setScrolledPastHero(false);
    setFormFocused(false);
  }, [path]);

  useEffect(() => {
    const onScroll = () => {
      const threshold = Math.max(320, Math.round(window.innerHeight * 0.6));
      setScrolledPastHero(window.scrollY > threshold);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [path]);

  useEffect(() => {
    const onFocusIn = (event: FocusEvent) => {
      if (isFormControl(event.target)) setFormFocused(true);
    };
    const onFocusOut = (event: FocusEvent) => {
      if (!isFormControl(event.relatedTarget)) setFormFocused(false);
    };
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    return () => {
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
    };
  }, []);

  // Never on the booking flows themselves: there it only links back to the same
  // page and, on phones, covers the wizard's own "Weiter" button.
  const onBookingFlow = /\/(planer|anfrage|offerte)(\/|$)/.test(path);
  const visible = scrolledPastHero && !formFocused && !onBookingFlow;

  // Reserve the bar's height in the document flow, never overlap the last line.
  useEffect(() => {
    const previous = document.body.style.paddingBottom;
    document.body.style.paddingBottom = visible ? `${BAR_HEIGHT}px` : previous || "";
    return () => {
      document.body.style.paddingBottom = previous;
    };
  }, [visible]);

  return (
    <div
      aria-hidden={!visible}
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 backdrop-blur-sm transition-transform motion-fast ${
        visible ? "translate-y-0" : "pointer-events-none translate-y-full"
      }`}
      style={{ minHeight: BAR_HEIGHT }}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 md:px-8">
        <p className="hidden min-w-0 flex-1 truncate text-sm text-ink-2 sm:block">
          {service ? t(`svc:${service}.short`) : t("common:bookBar.lead")}
        </p>
        <div className="flex flex-1 items-center justify-end gap-2 sm:flex-none">
          {company ? (
            <a
              href={telHref(company)}
              tabIndex={visible ? 0 : -1}
              className={`${buttonVariants({ variant: "ghost", size: "md" })} hidden sm:inline-flex`}
            >
              {t("common:cta.call")}
            </a>
          ) : null}
          <BookNowLink
            lang={lang}
            service={service ?? undefined}
            size="md"
            block
            className="sm:w-auto"
          />
        </div>
      </div>
    </div>
  );
}
