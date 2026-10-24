import { useRouterState } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { brandButton } from "@/components/brand/Button";
import { BookNowLink } from "@/components/brand/BookNow";
import { showsStickyBookBar } from "@/lib/booking";
import { useCompany } from "@/components/shell/CompanyContext";
import { telHref } from "@/lib/company";
import type { Lang } from "@/i18n/config";

export function MobileActionBar({ lang }: { lang: Lang }) {
  const { t } = useTranslation("common");
  const company = useCompany();
  const path = useRouterState({ select: (s) => s.location.pathname });

  // Service and detail pages carry the sticky booking bar instead — never two.
  if (showsStickyBookBar(path)) return null;
  // Not on the booking flows themselves: "Jetzt buchen" would point to the same
  // page, and on phones the bar sat on top of the wizard's "Weiter" button.
  if (/\/(planer|anfrage|offerte)(\/|$)/.test(path)) return null;

  return (
    <div className="fixed inset-inline-0 bottom-0 z-50 grid grid-cols-2 gap-px border-t border-line bg-line md:hidden">
      <a
        href={telHref(company)}
        className={`${brandButton({ variant: "dark", size: "md" })} h-14 w-full`}
      >
        {t("cta.call")}
      </a>
      <BookNowLink lang={lang} size="md" block className="h-14" />
    </div>
  );
}
