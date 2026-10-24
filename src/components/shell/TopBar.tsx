import { useTranslation } from "react-i18next";

import { useCompany } from "@/components/shell/CompanyContext";
import { phoneDisplay, telHref } from "@/lib/company";

export function TopBar() {
  const { t } = useTranslation("common");
  const company = useCompany();

  return (
    <aside aria-label={t("topbar.label")}>
      <div className="bg-ink text-canvas">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-2 md:px-8">
          <p className="label-mono text-line">{t("topbar.promise")}</p>
          {company ? (
            <a
              href={telHref(company)}
              aria-label={t("topbar.phoneLabel")}
              className="label-mono text-primary-light hover:underline"
            >
              {phoneDisplay(company)}
            </a>
          ) : null}
        </div>
      </div>
      <div aria-hidden="true" className="brand-rule h-px w-full" />
    </aside>
  );
}
