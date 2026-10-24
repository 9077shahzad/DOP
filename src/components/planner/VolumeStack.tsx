/**
 * Volume visualisation — the one place in the product where depth does real
 * work: a customer reads "34 m³" as a number, but reads a stack of cardboard
 * boxes next to one or two vans as the size of their move.
 *
 * Pure CSS: `transform-style: preserve-3d` on a handful of divs. No 3D
 * library, no canvas, no WebGL — the whole effect is a few hundred bytes.
 *
 * Degradation, in order of severity:
 *  - narrow screens: static isometric, no idle drift, no drag
 *  - `prefers-reduced-motion`: the global `[data-depth]` rule strips every
 *    transform, so the stack renders as a flat grid of squares
 *  - no transform support at all: same flat grid
 *  - the figures underneath are always present as text, so nothing is
 *    conveyed by the visualisation alone
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import type { Lang } from "@/i18n/config";
import { ITEMS, itemName } from "@/lib/pricing";
import { formatNumber } from "@/i18n/format";
import { cn } from "@/lib/utils";

/** One drawn box stands for this many m³ — keeps the stack readable at 60 m³. */
const M3_PER_BOX = 1.5;
const MIN_BOXES = 4;
const MAX_BOXES = 36;
const PER_ROW = 4;
const PER_LAYER = PER_ROW * 3;

export function VolumeStack({
  m3,
  vans,
  boxes,
  items,
  lang,
  className,
}: {
  m3: number;
  vans: number;
  boxes: number;
  /** Real inventory selections — silhouettes only appear for chosen items. */
  items?: Record<string, number>;
  lang: Lang;
  className?: string;
}) {
  const { t } = useTranslation("planer");
  const [angle, setAngle] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [canDrag, setCanDrag] = useState(false);
  const drag = useRef<{ x: number; start: number } | null>(null);

  // Drag rotation is a desktop pointer affordance only: on a touch screen the
  // gesture competes with scrolling the wizard.
  useEffect(() => {
    const query = window.matchMedia("(min-width: 1024px) and (pointer: fine)");
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setCanDrag(query.matches && !motion.matches);
    update();
    query.addEventListener("change", update);
    motion.addEventListener("change", update);
    return () => {
      query.removeEventListener("change", update);
      motion.removeEventListener("change", update);
    };
  }, []);

  // Furniture silhouettes mirror the inventory step: one silhouette per
  // selected item type, capped so the scene stays readable.
  const chosen = ITEMS.filter((i) => i.id !== "box" && (items?.[i.id] ?? 0) > 0).slice(0, 6);

  const count = Math.max(MIN_BOXES, Math.min(MAX_BOXES, Math.round(m3 / M3_PER_BOX) || MIN_BOXES));
  const capped = Math.round(m3 / M3_PER_BOX) > MAX_BOXES;

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!canDrag) return;
      drag.current = { x: event.clientX, start: angle };
      setDragging(true);
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [angle, canDrag],
  );

  const onPointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    const delta = (event.clientX - drag.current.x) * 0.4;
    setAngle(Math.max(-70, Math.min(70, drag.current.start + delta)));
  }, []);

  // Keyboard parity with the drag gesture: the control is a slider, so arrow
  // keys nudge, Page keys jump, Home recentres — the same contract a sighted
  // mouse user gets from dragging.
  const onKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    const step = event.key === "PageUp" || event.key === "PageDown" ? 15 : 5;
    let delta = 0;
    if (event.key === "ArrowLeft" || event.key === "ArrowDown" || event.key === "PageDown") delta = -step;
    else if (event.key === "ArrowRight" || event.key === "ArrowUp" || event.key === "PageUp") delta = step;
    else if (event.key === "Home") {
      event.preventDefault();
      setAngle(0);
      return;
    } else return;
    event.preventDefault();
    setAngle((current) => Math.max(-70, Math.min(70, current + delta)));
  }, []);

  const endDrag = useCallback(() => {
    drag.current = null;
    setDragging(false);
  }, []);

  const label = t("stack.aria", {
    volume: formatNumber(m3, lang, { maximumFractionDigits: 1 }),
    boxes: Math.round(boxes),
    vans,
  });

  return (
    <figure className={cn("border-t border-line px-4 py-4", className)}>
      <figcaption className="label-mono flex items-baseline justify-between gap-2 text-soft">
        <span>{t("stack.title")}</span>
        {canDrag ? <span className="text-soft">{t("stack.dragHint")}</span> : null}
      </figcaption>

      <div
        data-depth="volume"
        role={canDrag ? "slider" : "img"}
        aria-label={canDrag ? `${label} — ${t("stack.rotateLabel")}` : label}
        {...(canDrag
          ? {
              tabIndex: 0,
              "aria-valuemin": -70,
              "aria-valuemax": 70,
              "aria-valuenow": Math.round(angle),
              "aria-valuetext": t("stack.rotateValue", { deg: Math.round(angle) }),
              "aria-orientation": "horizontal" as const,
              onKeyDown: onKeyDown,
            }
          : {})}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className={cn(
          "mt-3 flex h-44 items-end justify-center overflow-hidden rounded-md bg-canvas",
          "[perspective:900px]",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
          canDrag && (dragging ? "cursor-grabbing" : "cursor-grab"),
        )}
        style={{ touchAction: "pan-y" }}
      >
        <div
          className={cn(
            "iso-scene relative mb-4",
            !dragging && canDrag && "iso-drift",
          )}
          style={{ ["--iso-angle" as string]: `${angle}deg` }}
        >
          {/* Vans: capacity outlines the stack is measured against. */}
          <div className="iso-floor" aria-hidden="true">
            <span className="iso-van" />
            {vans >= 2 ? <span className="iso-van iso-van-2" /> : null}
          </div>

          {/* Grid flow, not absolute transforms: when transforms are stripped
              the same markup renders as a flat grid of cardboard squares. */}
          <div className="iso-stack" aria-hidden="true">
            {Array.from({ length: count }, (_, i) => (
              <span key={i} className="iso-box" style={{ ["--layer" as string]: Math.floor(i / PER_LAYER) }}>
                <span className="iso-face iso-top" />
                <span className="iso-face iso-left" />
                <span className="iso-face iso-right" />
              </span>
            ))}
          </div>

          {chosen.length > 0 ? (
            <div className="iso-stack mt-1" aria-hidden="true">
              {chosen.map((item) => (
                <span key={item.id} className="iso-item" title={itemName(item, lang)} />
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <p className="type-caption mt-2">
        {capped ? t("stack.capped", { count: MAX_BOXES }) : t("stack.legend", { m3: M3_PER_BOX })}
      </p>
    </figure>
  );
}
