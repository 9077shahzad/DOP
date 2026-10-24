/**
 * The single booking action. Same component on the header, the mobile bar, the
 * service cards, the service pages and the portal — so the label, the icon and
 * the destination can never drift apart.
 */
import { Link } from "@tanstack/react-router";
import { CalendarCheck } from "lucide-react";
import { useTranslation } from "react-i18next";

import { buttonVariants } from "@/components/system";
import { bookingLabelKey, bookingTarget } from "@/lib/booking";
import type { Lang } from "@/i18n/config";
import type { ServiceId } from "@/lib/services";
import { cn } from "@/lib/utils";

type Variant = "primary" | "dark" | "outline" | "ghost" | "ghostLight";
type Size = "sm" | "md" | "lg" | "touch";

export function BookNowLink({
  lang,
  service,
  variant = "primary",
  size = "md",
  block = false,
  withIcon = true,
  label: labelOverride,
  onClick,
  className,
}: {
  lang: Lang;
  /** Omit for the generic action (header, home, mobile bar). */
  service?: ServiceId | undefined;
  variant?: Variant;
  size?: Size;
  block?: boolean;
  withIcon?: boolean;
  /** Overrides the default booking label (e.g. the header's "Offerte erhalten"). */
  label?: string;
  onClick?: () => void;
  className?: string;
}) {
  const { t } = useTranslation("common");
  const target = bookingTarget(service ?? null);
  const label = labelOverride ?? t(bookingLabelKey(service ?? null));
  const classes = cn(buttonVariants({ variant, size, block }), className);
  const icon = withIcon ? <CalendarCheck aria-hidden="true" className="size-4 shrink-0" strokeWidth={1.75} /> : null;

  if (target.kind === "request") {
    return (
      <Link to="/$lang/anfrage/$service" params={{ lang, service: target.service }} onClick={onClick} className={classes}>
        {icon}
        {label}
      </Link>
    );
  }

  return (
    <Link to="/$lang/planer" params={{ lang }} onClick={onClick} className={classes}>
      {icon}
      {label}
    </Link>
  );
}
