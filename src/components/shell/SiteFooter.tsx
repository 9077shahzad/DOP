import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { Logo } from "@/components/brand/Logo";
import { useCookieConsent } from "@/components/legal/CookieConsent";
import { useCompany } from "@/components/shell/CompanyContext";
import { addressFull, mailHref, phoneDisplay, telHref } from "@/lib/company";
import type { Lang } from "@/i18n/config";

export function SiteFooter({ lang }: { lang: Lang }) {
  const { t } = useTranslation("common");
  const { t: tl } = useTranslation("legal");
  const { t: tn } = useTranslation("nav");
  const { openPreferences } = useCookieConsent();
  const company = useCompany();


  return (
    <footer className="mt-16">
      <div aria-hidden="true" className="brand-rule h-px w-full" />
      <div className="bg-ink text-canvas">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 md:grid-cols-3 lg:grid-cols-7 md:px-8">
          <div className="md:col-span-3 lg:col-span-2">
            <Logo tone="light" />
            <p className="mt-5 max-w-md text-sm text-line">{t("footer.description")}</p>
          </div>

          {/* Partner / subcontractor marketplace is parked for PS Umzug phase 1.
              The pages and data model stay in place; only the public entry
              points are hidden until the module is reactivated. */}

          <div>
            <h2 className="label-mono text-primary-light">{tn("about")}</h2>
            <ul className="mt-4 space-y-2 text-sm">
              {([
                { to: "/$lang/leistungen", label: tn("services") },
                { to: "/$lang/ueber-uns", label: tn("about") },
                { to: "/$lang/kontakt", label: tn("contact") },
              ] as const).map((item) => (
                <li key={item.to}>
                  <Link to={item.to} params={{ lang }} className="text-line hover:text-primary-light">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="label-mono text-primary-light">{t("footer.servicesTitle")}</h2>
            <ul className="mt-4 space-y-2 text-sm">
              {(["moving", "cleaning", "handover", "disposal", "management"] as const).map((k) => (
                <li key={k}>
                  <Link
                    to="/$lang/planer"
                    params={{ lang }}
                    className="text-line hover:text-primary-light"
                  >
                    {t(`footer.links.${k}`)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="label-mono text-primary-light">{t("footer.contactTitle")}</h2>
            <ul className="mt-4 space-y-2 text-sm text-line">
              {company ? (
                <>
                  <li>
                    <a href={telHref(company)} className="hover:text-primary-light">
                      {phoneDisplay(company)}
                    </a>
                  </li>
                  <li>
                    <a href={mailHref(company)} className="hover:text-primary-light">
                      {company.email}
                    </a>
                  </li>
                  <li>{addressFull(company)}</li>
                </>
              ) : null}
            </ul>
          </div>

          <div>
            <h2 className="label-mono text-primary-light">{tl("index.title")}</h2>
            <ul className="mt-4 space-y-2 text-sm">
              <li>
                <Link to="/$lang/legal" params={{ lang }} className="text-line hover:text-primary-light">
                  {tl("index.title")}
                </Link>
              </li>
              {(["terms", "privacy", "cookies", "legal_notice"] as const).map((doc) => (
                <li key={doc}>
                  <Link
                    to="/$lang/legal/$docType"
                    params={{ lang, docType: doc }}
                    className="text-line hover:text-primary-light"
                  >
                    {tl(`doc.${doc}.title`)}
                  </Link>
                </li>
              ))}
              <li>
                <button
                  type="button"
                  onClick={openPreferences}
                  className="text-line underline-offset-4 hover:text-primary-light hover:underline"
                >
                  {tl("cookies.settings")}
                </button>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-ink-2">
          <p className="label-mono mx-auto max-w-7xl px-4 py-5 text-soft md:px-8">
            {company ? `© ${new Date().getFullYear()} ${company.legal_name} · ${addressFull(company)}` : t("footer.legal")}
          </p>
        </div>
      </div>
    </footer>
  );
}
