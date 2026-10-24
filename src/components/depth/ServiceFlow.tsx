/**
 * Service network / decision engine.
 *
 * A plain inline SVG of the dispatch model: Anfrage → PS Umzug →
 * Entscheidung → Internes Team / Partner → Einsatz → Abschluss. A marker
 * travels the path as the section scrolls into view; the path, labels and
 * ordered list underneath carry the whole message without the animation, and
 * the marker is not rendered under `prefers-reduced-motion`.
 */
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

const NODES = [
  { id: "anfrage", x: 60, y: 90 },
  { id: "psumzug", x: 190, y: 90 },
  { id: "entscheidung", x: 320, y: 90 },
  { id: "intern", x: 450, y: 40 },
  { id: "partner", x: 450, y: 140 },
  { id: "einsatz", x: 580, y: 90 },
  { id: "abschluss", x: 700, y: 90 },
] as const;

const MAIN_PATH =
  "M 60 90 H 320 C 360 90 380 40 450 40 C 520 40 540 90 580 90 H 700";
const PARTNER_PATH =
  "M 320 90 C 360 90 380 140 450 140 C 520 140 540 90 580 90";

export function ServiceFlow({ highlight }: { highlight?: "intern" | "partner" }) {
  const { t } = useTranslation("svc");
  const ref = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (motion.matches) return;
    setAnimate(true);
    const onScroll = () => {
      const box = ref.current?.getBoundingClientRect();
      if (!box) return;
      const seen = (window.innerHeight - box.top) / (window.innerHeight + box.height);
      setProgress(Math.max(0, Math.min(1, seen)));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div ref={ref}>
      <svg
        viewBox="0 0 760 190"
        role="img"
        aria-label={t("flow.aria")}
        className="w-full"
        preserveAspectRatio="xMidYMid meet"
      >
        <path d={MAIN_PATH} fill="none" stroke="currentColor" strokeWidth="1.5" className="text-line" />
        <path d={PARTNER_PATH} fill="none" stroke="currentColor" strokeWidth="1.5" className="text-line" />

        {animate ? (
          <circle r="6" className="fill-primary">
            <animateMotion dur="0.001s" fill="freeze" keyPoints={`${progress};${progress}`} keyTimes="0;1" calcMode="linear">
              <mpath href="#mf-flow-main" />
            </animateMotion>
          </circle>
        ) : null}
        <path id="mf-flow-main" d={MAIN_PATH} fill="none" stroke="none" />

        {NODES.map((node) => {
          const isHighlight = highlight === node.id;
          return (
            <g key={node.id}>
              <rect
                x={node.x - 52}
                y={node.y - 18}
                width="104"
                height="36"
                className={isHighlight ? "fill-primary stroke-primary" : "fill-card stroke-ink"}
                strokeWidth="1"
              />
              <text
                x={node.x}
                y={node.y + 4}
                textAnchor="middle"
                className={`text-[11px] uppercase tracking-wide ${
                  isHighlight ? "fill-primary-foreground" : "fill-ink"
                }`}
              >
                {t(`flow.${node.id}`)}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Text equivalent: the model reads without the diagram. */}
      <ol className="mt-6 grid gap-px border border-line bg-line sm:grid-cols-3 lg:grid-cols-7">
        {NODES.map((node, index) => (
          <li key={node.id} className="bg-card px-4 py-3">
            <span className="label-mono text-soft">{String(index + 1).padStart(2, "0")}</span>
            <span className="mt-1 block text-sm text-ink">{t(`flow.${node.id}`)}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
