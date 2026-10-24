import { useEffect, useRef, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

export const inputClass =
  "w-full min-h-12 rounded-xl border border-line bg-canvas px-4 py-3 text-ink outline-none transition-colors motion-fast placeholder:text-soft hover:border-line-soft focus:border-primary focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary";

export function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="label-mono block pb-2 text-soft">{label}</span>
      {children}
    </label>
  );
}

export function Segmented<T extends string | number>({
  id,
  label,
  value,
  options,
  onChange,
  className,
}: {
  id?: string;
  label: string;
  /** null when nothing is selected yet — a placeholder, not a default. */
  value: T | null;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div className={className}>
      <span className="label-mono block pb-2 text-soft">{label}</span>
      <div role="group" aria-label={label} className="flex flex-wrap border border-ink">
        {options.map((o, i) => (
          <button
            key={String(o.value)}
            id={i === 0 ? id : undefined}
            type="button"
            aria-pressed={o.value === value}
            onClick={() => onChange(o.value)}
            className={cn(
              "data-mono flex-1 whitespace-nowrap px-3 py-2.5 text-sm transition-colors",
              i > 0 && "border-s border-ink",
              o.value === value
                ? "bg-ink text-canvas"
                : "bg-surface text-ink hover:bg-ink hover:text-canvas",
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function CheckRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 border bg-surface p-4 transition-colors",
        checked ? "border-ink" : "border-line hover:border-soft",
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 size-4 accent-[var(--primary)]"
      />
      <span>
        <span className="block font-medium text-ink">{label}</span>
        {description ? <span className="mt-1 block text-sm text-soft">{description}</span> : null}
      </span>
    </label>
  );
}

export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

/** Smoothly counts to a new value; jumps instantly when motion is reduced. */
export function CountUp({
  value,
  format,
  className,
}: {
  value: number;
  format: (value: number) => string;
  className?: string;
}) {
  const reduced = usePrefersReducedMotion();
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    if (reduced) {
      setDisplay(value);
      fromRef.current = value;
      return;
    }
    const from = fromRef.current;
    const start = performance.now();
    const duration = 420;

    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      const current = from + (value - from) * eased;
      setDisplay(current);
      fromRef.current = current;
      if (p < 1) frameRef.current = requestAnimationFrame(tick);
      else fromRef.current = value;
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [value, reduced]);

  return <span className={cn("data-mono", className)}>{format(display)}</span>;
}
