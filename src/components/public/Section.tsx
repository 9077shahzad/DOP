/**
 * Public-site layout furniture.
 *
 * The public pages share one rhythm: a wide shell, generous vertical padding
 * and a heading block with a lot of air. Sections separate by whitespace and
 * background tone, not by 1px rules — the editorial grid is kept for the
 * admin and portal screens where density is the point.
 */
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function Shell({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("shell-x", className)}>{children}</div>;
}

export function Section({
  id,
  tone = "canvas",
  className,
  children,
}: {
  id?: string;
  tone?: "canvas" | "surface" | "ink" | "primary";
  className?: string;
  children: ReactNode;
}) {
  const tones = {
    canvas: "bg-canvas text-ink",
    surface: "bg-surface text-ink",
    ink: "bg-ink text-canvas",
    primary: "bg-primary-subtle text-ink",
  } as const;

  return (
    <section id={id} className={cn("section-y scroll-mt-24", tones[tone], className)}>
      <Shell>{children}</Shell>
    </section>
  );
}

export function SectionHead({
  eyebrow,
  title,
  lead,
  tone = "light",
  align = "start",
  className,
}: {
  eyebrow?: string;
  title: string;
  lead?: string;
  tone?: "light" | "dark";
  align?: "start" | "center";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "max-w-3xl",
        align === "center" ? "mx-auto text-center" : "",
        className,
      )}
    >
      {eyebrow ? (
        <p className={cn("label-mono", tone === "dark" ? "text-primary-light" : "text-primary")}>{eyebrow}</p>
      ) : null}
      <h2 className={cn("type-h1 mt-4", tone === "dark" ? "text-canvas" : "text-ink")}>{title}</h2>
      {lead ? (
        <p className={cn("type-lead mt-5", tone === "dark" ? "text-canvas/75" : "text-ink-2")}>{lead}</p>
      ) : null}
    </div>
  );
}

/** Standard page opener for every public sub-page. */
export function PageHero({
  eyebrow,
  title,
  lead,
  actions,
  aside,
}: {
  eyebrow?: string;
  title: string;
  lead?: string;
  actions?: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <header className="bg-canvas pb-10 pt-12 md:pb-16 md:pt-20">
      <Shell>
        <div className={cn("grid gap-10", aside ? "lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-center" : "")}>
          <div className="max-w-3xl">
            {eyebrow ? <p className="label-mono text-primary">{eyebrow}</p> : null}
            <h1 className="type-h1 mt-4 text-ink">{title}</h1>
            {lead ? <p className="type-lead mt-5 text-ink-2">{lead}</p> : null}
            {actions ? <div className="mt-8 flex flex-wrap gap-3">{actions}</div> : null}
          </div>
          {aside}
        </div>
      </Shell>
    </header>
  );
}

/** A soft, borderless panel — the public replacement for the bordered card. */
export function Panel({
  className,
  tone = "surface",
  children,
}: {
  className?: string;
  tone?: "surface" | "canvas" | "ink";
  children: ReactNode;
}) {
  const tones = {
    surface: "bg-surface text-ink",
    canvas: "bg-canvas text-ink ring-1 ring-line",
    ink: "bg-ink text-canvas",
  } as const;
  return <div className={cn("rounded-2xl p-6 md:p-8", tones[tone], className)}>{children}</div>;
}
