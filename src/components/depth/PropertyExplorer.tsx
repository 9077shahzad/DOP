/**
 * Interactive property explorer.
 *
 * An isometric building where each zone is a real `<Link>` to the matching
 * service page. The 3D is presentation layered over working navigation: with
 * CSS disabled, transforms unsupported or `prefers-reduced-motion` set, the
 * same markup is a plain list of service links.
 *
 * Keyboard: the zones form a single roving list — arrow keys move between
 * them, Enter follows the focused link (native anchor behaviour).
 */
import { Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import type { Lang } from "@/i18n/config";
import { ZONES } from "@/lib/services";
import { cn } from "@/lib/utils";

export function PropertyExplorer({ lang }: { lang: Lang }) {
  const { t } = useTranslation(["svc", "home"]);
  const [active, setActive] = useState<string>(ZONES[ZONES.length - 1]!.id);
  const refs = useRef<Record<string, HTMLAnchorElement | null>>({});

  const move = (index: number, delta: number) => {
    const next = ZONES[(index + delta + ZONES.length) % ZONES.length]!;
    setActive(next.id);
    refs.current[next.id]?.focus();
  };

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-center">
      <div className="flex justify-center overflow-hidden py-6 sm:py-10 [perspective:1100px]">
        <ul
          aria-label={t("svc:explorer.label")}
          className="bld-scene grid w-[300px] grid-cols-4 gap-2 sm:w-[360px]"
        >
          {ZONES.map((zone, index) => (
            <li
              key={zone.id}
              style={{
                gridColumn: `${zone.col} / span ${zone.span}`,
                gridRow: ZONES.length - zone.floor,
                ["--floor" as string]: zone.floor,
              }}
              className="bld-zone"
            >
              <Link
                ref={(node) => {
                  refs.current[zone.id] = node;
                }}
                to="/$lang/leistungen/$service"
                params={{ lang, service: zone.id }}
                data-active={active === zone.id}
                onFocus={() => setActive(zone.id)}
                onMouseEnter={() => setActive(zone.id)}
                onKeyDown={(event) => {
                  if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
                    event.preventDefault();
                    move(index, -1);
                  } else if (event.key === "ArrowDown" || event.key === "ArrowRight") {
                    event.preventDefault();
                    move(index, 1);
                  }
                }}
                className={cn(
                  "label-mono flex h-14 items-center justify-center border px-2 text-center",
                  active === zone.id
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-line bg-card text-ink",
                )}
              >
                <span className="bld-label">{t(`svc:${zone.id}.short`)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div aria-live="polite" className="rounded-2xl bg-surface p-5 elev-raised">
        <p className="label-mono text-primary">{t(`svc:${active}.short`)}</p>
        <h3 className="mt-3 text-xl text-ink">{t(`svc:${active}.title`)}</h3>
        <p className="mt-3 text-sm text-ink-2">{t(`svc:${active}.lead`)}</p>
        <Link
          to="/$lang/leistungen/$service"
          params={{ lang, service: active }}
          className="label-mono mt-5 inline-block text-primary underline underline-offset-4"
        >
          {t("svc:explorer.open")}
        </Link>
      </div>
    </div>
  );
}
