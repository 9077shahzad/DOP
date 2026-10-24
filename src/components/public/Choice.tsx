/**
 * Big tappable choice cards — the public site's replacement for `<select>`.
 *
 * Why cards and not a dropdown: on a phone a native select hides every option
 * behind a modal, costs two taps and gives no room for a hint. A card grid
 * shows the whole answer space at once, has a 56px+ target and can carry an
 * icon plus one line of reassurance.
 *
 * Semantics:
 *  - `ChoiceGroup` is a radiogroup; each `ChoiceCard` is a `radio` button.
 *  - `MultiChoiceGroup` is a plain group of `aria-pressed` toggles.
 *  - Nothing is ever pre-selected. `value === null` means "not answered yet",
 *    never a default — the pricing engine depends on that distinction.
 */
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

const base = cn(
  "group relative flex w-full min-h-14 cursor-pointer items-start gap-3 rounded-xl border bg-canvas px-4 py-4 text-left",
  "transition-[border-color,background-color,box-shadow,transform] motion-base",
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
);

const unselected = "border-line hover:border-primary/50 hover:bg-surface";
const selected = "border-primary bg-primary-subtle shadow-[inset_0_0_0_1px_var(--primary)]";

export function ChoiceGroup({
  label,
  hint,
  id,
  columns = 2,
  className,
  children,
}: {
  label: string;
  hint?: string;
  id?: string;
  columns?: 1 | 2 | 3 | 4;
  className?: string;
  children: ReactNode;
}) {
  const cols =
    columns === 1
      ? "grid-cols-1"
      : columns === 2
        ? "grid-cols-1 sm:grid-cols-2"
        : columns === 3
          ? "grid-cols-2 sm:grid-cols-3"
          : "grid-cols-2 sm:grid-cols-4";

  return (
    <div className={className}>
      <p className="type-h3 text-ink">{label}</p>
      {hint ? <p className="type-small mt-1.5 text-soft">{hint}</p> : null}
      <div id={id} role="radiogroup" aria-label={label} className={cn("mt-5 grid gap-3", cols)}>
        {children}
      </div>
    </div>
  );
}

export function ChoiceCard({
  id,
  title,
  description,
  icon,
  selected: isSelected,
  onSelect,
  role = "radio",
  className,
}: {
  id?: string;
  title: string;
  description?: string;
  icon?: ReactNode;
  selected: boolean;
  onSelect: () => void;
  role?: "radio" | "button";
  className?: string;
}) {
  const ariaProps =
    role === "radio" ? { role: "radio" as const, "aria-checked": isSelected } : { "aria-pressed": isSelected };

  return (
    <button
      {...ariaProps}
      id={id}
      type="button"
      onClick={onSelect}
      className={cn(base, isSelected ? selected : unselected, className)}
    >
      {icon ? (
        <span
          aria-hidden="true"
          className={cn("mt-0.5 shrink-0 transition-colors motion-fast", isSelected ? "text-primary" : "text-soft")}
        >
          {icon}
        </span>
      ) : null}
      <span className="min-w-0 flex-1">
        <span className={cn("block text-[0.9375rem] font-semibold", isSelected ? "text-primary" : "text-ink")}>
          {title}
        </span>
        {description ? <span className="type-small mt-1 block text-soft">{description}</span> : null}
      </span>
      <span
        aria-hidden="true"
        className={cn(
          "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border transition-colors motion-fast",
          isSelected ? "border-primary bg-primary" : "border-line-soft bg-surface group-hover:border-primary/40",
        )}
      >
        <span className={cn("size-2 rounded-full bg-canvas transition-opacity", isSelected ? "opacity-100" : "opacity-0")} />
      </span>
    </button>
  );
}

/** Multi-select variant: same surface, checkbox semantics. */
export function MultiChoiceGroup({
  label,
  hint,
  id,
  columns = 2,
  className,
  children,
}: {
  label: string;
  hint?: string;
  id?: string;
  columns?: 1 | 2 | 3 | 4;
  className?: string;
  children: ReactNode;
}) {
  const cols =
    columns === 1 ? "grid-cols-1" : columns === 3 ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-1 sm:grid-cols-2";
  return (
    <div className={className}>
      <p className="type-h3 text-ink">{label}</p>
      {hint ? <p className="type-small mt-1.5 text-soft">{hint}</p> : null}
      <div id={id} tabIndex={-1} role="group" aria-label={label} className={cn("mt-5 grid gap-3", cols)}>
        {children}
      </div>
    </div>
  );
}

export function MultiChoiceCard(props: Omit<Parameters<typeof ChoiceCard>[0], "role">) {
  return <ChoiceCard {...props} role="button" />;
}
