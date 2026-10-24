import { useNavigate, useRouterState } from "@tanstack/react-router";
import { Globe } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { UI_LANGS, storeLanguage, type Lang } from "@/i18n/config";
import { cn } from "@/lib/utils";

/**
 * `tone="dark"` renders the control for the ink portal header.
 * `onSelect` replaces the default URL-prefix navigation — the portal has no
 * language segment in its paths, it stores the choice on the profile instead.
 */
export function LanguageSwitcher({
  current,
  tone = "light",
  onSelect,
}: {
  current: Lang;
  tone?: "light" | "dark";
  onSelect?: (lang: Lang) => void;
}) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const searchStr = useRouterState({ select: (s) => s.location.searchStr });
  const hash = useRouterState({ select: (s) => s.location.hash });
  const { t } = useTranslation("common");
  const dark = tone === "dark";
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function switchTo(lang: Lang) {
    setOpen(false);
    if (lang === current) return;
    storeLanguage(lang);
    if (onSelect) {
      onSelect(lang);
      return;
    }
    // Keep the equivalent route: only the language segment changes, query and
    // hash (active planner step, anchors) survive so no flow is reset.
    const segments = pathname.split("/").filter(Boolean);
    segments[0] = lang;
    const href = `/${segments.join("/")}${searchStr ?? ""}${hash ? `#${hash}` : ""}`;
    void navigate({ href, replace: false });
  }

  // A single interface language leaves nothing to switch between.
  if (UI_LANGS.length < 2) return null;

  return (
    <div className="flex items-center">
      {/* Wide screens: segmented control, no flags — languages are not countries */}
      <div
        role="group"
        aria-label={t("language.switch")}
        className={cn("hidden overflow-hidden rounded-md border md:flex", dark ? "border-primary-light/40" : "border-line")}
      >
        {UI_LANGS.map((lang, i) => (
          <button
            key={lang}
            type="button"
            lang={lang}
            aria-current={lang === current ? "true" : undefined}
            onClick={() => switchTo(lang)}
            className={cn(
              "label-mono px-2.5 py-2 transition-colors",
              i > 0 && (dark ? "border-s border-primary-light/40" : "border-s border-line"),
              lang === current
                ? dark
                  ? "bg-primary text-primary-foreground"
                  : "bg-primary text-primary-foreground"
                : dark
                  ? "text-line hover:text-primary-light"
                  : "text-ink hover:bg-primary-subtle hover:text-primary",
            )}
          >
            {lang.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Narrow screens: globe + current code, opens a compact 4-language menu.
          Absolutely positioned panel so the header never shifts or overlaps. */}
      <div ref={menuRef} className="relative md:hidden">
        <button
          type="button"
          aria-label={t("language.switch")}
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className={cn(
            "label-mono flex min-h-11 shrink-0 items-center gap-1.5 rounded-md border px-2.5",
            dark ? "border-primary-light/40 text-primary-light" : "border-line text-ink",
          )}
        >
          <Globe aria-hidden="true" className="h-4 w-4 shrink-0" />
          <span>{current.toUpperCase()}</span>
        </button>

        {open ? (
          <div
            role="menu"
            aria-label={t("language.switch")}
            className={cn(
              "absolute end-0 top-[calc(100%+0.375rem)] z-50 min-w-[5.5rem] overflow-hidden rounded-md border shadow-lg",
              dark ? "border-primary-light/40 bg-primary" : "border-line bg-canvas",
            )}
          >
            {UI_LANGS.map((lang) => (
              <button
                key={lang}
                type="button"
                role="menuitemradio"
                aria-checked={lang === current}
                lang={lang}
                onClick={() => switchTo(lang)}
                className={cn(
                  "label-mono flex min-h-11 w-full items-center px-3 text-start transition-colors",
                  lang === current
                    ? "bg-primary text-primary-foreground"
                    : dark
                      ? "text-line hover:text-primary-light"
                      : "text-ink hover:bg-primary-subtle hover:text-primary",
                )}
              >
                {lang.toUpperCase()}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
