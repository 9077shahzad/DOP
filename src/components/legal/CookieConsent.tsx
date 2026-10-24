/**
 * Cookie consent manager.
 *
 * In EU markets NO non-essential script runs before consent — analytics
 * included. `useCookieConsent().allows("analytics")` is the only gate other
 * code may use; it returns false until the visitor has actively chosen.
 * Accept and Reject carry the same visual weight, nothing is pre-ticked.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/brand/Button";
import type { Lang } from "@/i18n/config";
import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";

export const CONSENT_VERSION = 1;
const STORAGE_KEY = "mf.cookie-consent.v1";

export const COOKIE_CATEGORIES = ["necessary", "functional", "analytics", "marketing"] as const;
export type CookieCategory = (typeof COOKIE_CATEGORIES)[number];

export type CookieConsentValue = {
  version: number;
  decidedAt: string;
  necessary: true;
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
};

type ContextValue = {
  consent: CookieConsentValue | null;
  allows: (category: CookieCategory) => boolean;
  save: (choice: Omit<CookieConsentValue, "version" | "decidedAt" | "necessary">) => void;
  openPreferences: () => void;
};

const CookieConsentContext = createContext<ContextValue | null>(null);

function read(): CookieConsentValue | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CookieConsentValue;
    if (parsed.version !== CONSENT_VERSION) return null;
    return { ...parsed, necessary: true };
  } catch {
    return null;
  }
}

export function CookieConsentProvider({ children, lang }: { children: ReactNode; lang: Lang }) {
  const [consent, setConsent] = useState<CookieConsentValue | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);

  useEffect(() => {
    setConsent(read());
    setHydrated(true);
  }, []);

  const save = useCallback(
    (choice: Omit<CookieConsentValue, "version" | "decidedAt" | "necessary">) => {
      const value: CookieConsentValue = {
        version: CONSENT_VERSION,
        decidedAt: new Date().toISOString(),
        necessary: true,
        ...choice,
      };
      setConsent(value);
      setPanelOpen(false);
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
      } catch {
        /* storage unavailable */
      }
    },
    [],
  );

  const allows = useCallback(
    (category: CookieCategory) => {
      if (category === "necessary") return true;
      return Boolean(consent?.[category]);
    },
    [consent],
  );

  const value = useMemo(
    () => ({ consent, allows, save, openPreferences: () => setPanelOpen(true) }),
    [consent, allows, save],
  );

  return (
    <CookieConsentContext.Provider value={value}>
      {children}
      {hydrated && (consent === null || panelOpen) ? (
        <ConsentDialog
          lang={lang}
          initial={consent}
          expanded={panelOpen}
          onSave={save}
          onClose={consent ? () => setPanelOpen(false) : undefined}
        />
      ) : null}
    </CookieConsentContext.Provider>
  );
}

export function useCookieConsent(): ContextValue {
  const ctx = useContext(CookieConsentContext);
  return (
    ctx ?? {
      consent: null,
      allows: (category: CookieCategory) => category === "necessary",
      save: () => {},
      openPreferences: () => {},
    }
  );
}

function ConsentDialog({
  lang,
  initial,
  expanded,
  onSave,
  onClose,
}: {
  lang: Lang;
  initial: CookieConsentValue | null;
  expanded: boolean;
  onSave: (choice: { functional: boolean; analytics: boolean; marketing: boolean }) => void;
  onClose?: (() => void) | undefined;
}) {
  const { t } = useTranslation("legal");
  const [manage, setManage] = useState(expanded);
  const [functional, setFunctional] = useState(initial?.functional ?? false);
  const [analytics, setAnalytics] = useState(initial?.analytics ?? false);
  const [marketing, setMarketing] = useState(initial?.marketing ?? false);


  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="cookie-consent-title"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-ink bg-canvas shadow-[0_-1px_0_0_var(--color-line)]"
    >
      <div className="mx-auto max-w-5xl px-4 py-5 md:px-8">
        <h2 id="cookie-consent-title" className="text-lg">
          {t("cookies.title")}
        </h2>
        <p className="mt-2 text-sm text-ink-2">
          {t("cookies.intro")}{" "}
          <Link
            to="/$lang/legal/$docType"
            params={{ lang, docType: "cookies" }}
            className="underline decoration-primary underline-offset-4 hover:text-primary"
          >
            {t("cookies.policyLink")}
          </Link>
        </p>

        {manage ? (
          <ul className="mt-4 grid gap-px bg-line sm:grid-cols-2">
            <CategoryRow
              name="necessary"
              checked
              disabled
              onChange={() => {}}
              label={t("cookies.cat.necessary")}
              description={t("cookies.desc.necessary")}
            />
            <CategoryRow
              name="functional"
              checked={functional}
              onChange={setFunctional}
              label={t("cookies.cat.functional")}
              description={t("cookies.desc.functional")}
            />
            <CategoryRow
              name="analytics"
              checked={analytics}
              onChange={setAnalytics}
              label={t("cookies.cat.analytics")}
              description={t("cookies.desc.analytics")}
            />
            <CategoryRow
              name="marketing"
              checked={marketing}
              onChange={setMarketing}
              label={t("cookies.cat.marketing")}
              description={t("cookies.desc.marketing")}
            />
          </ul>
        ) : null}

        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Button
            variant="primary"
            className="sm:flex-1"
            onClick={() => onSave({ functional: true, analytics: true, marketing: true })}
          >
            {t("cookies.acceptAll")}
          </Button>
          <Button
            variant="dark"
            className="sm:flex-1"
            onClick={() => onSave({ functional: false, analytics: false, marketing: false })}
          >
            {t("cookies.rejectAll")}
          </Button>
          {manage ? (
            <Button
              variant="ghost"
              className="sm:flex-1"
              onClick={() => onSave({ functional, analytics, marketing })}
            >
              {t("cookies.saveSelection")}
            </Button>
          ) : (
            <Button variant="ghost" className="sm:flex-1" onClick={() => setManage(true)}>
              {t("cookies.manage")}
            </Button>
          )}
          {onClose ? (
            <Button variant="ghost" className="sm:flex-none" onClick={onClose}>
              {t("cookies.close")}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function CategoryRow({
  name,
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  name: string;
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
}) {
  const id = `cookie-${name}`;
  return (
    <li className="bg-surface p-4">
      <label htmlFor={id} className={cn("flex gap-3", disabled && "opacity-70")}>
        <input
          id={id}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-1 size-5 shrink-0 accent-[var(--color-primary)]"
        />
        <span>
          <span className="label-mono block text-ink">{label}</span>
          <span className="mt-1 block text-sm text-ink-2">{description}</span>
        </span>
      </label>
    </li>
  );
}
