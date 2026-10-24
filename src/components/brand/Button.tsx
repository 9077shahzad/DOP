import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

export const brandButton = cva(
  "inline-flex items-center justify-center gap-2 rounded-md text-sm font-semibold leading-none whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2 disabled:opacity-50 disabled:pointer-events-none",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground hover:bg-primary-hover",
        dark: "bg-ink text-canvas hover:bg-ink-2",
        ghost: "border border-ink/25 text-ink hover:border-primary hover:text-primary",
        ghostLight: "border border-canvas/40 text-canvas hover:border-primary-light hover:text-primary-light",
      },
      size: {
        sm: "h-9 px-3",
        md: "h-11 px-5",
        lg: "h-13 px-7 text-base",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export type BrandButtonProps = VariantProps<typeof brandButton>;

export function Button({
  className,
  variant,
  size,
  ...props
}: ComponentProps<"button"> & BrandButtonProps) {
  return <button className={cn(brandButton({ variant, size }), className)} {...props} />;
}
