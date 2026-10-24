import { useEffect, useState } from "react";

/**
 * Scroll offset in pixels for layered hero parallax.
 * Returns 0 permanently under `prefers-reduced-motion`, so the layout is
 * simply static rather than degraded.
 */
export function useParallax(strength = 0.12): number {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (motion.matches) return;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setOffset(window.scrollY * strength));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
    };
  }, [strength]);

  return offset;
}
