import { cn } from "@/lib/utils";

/**
 * PS Umzug AG logo lockup — official vectorised artwork (SEKA production proof).
 *
 * Source files live in /public:
 *  - ps-umzug-logo.svg        navy wordmark, for light backgrounds
 *  - ps-umzug-logo-light.svg  white wordmark, for navy/dark bands
 *  - ps-umzug-mark.svg        standalone mark (favicon / PWA icons)
 */
export function Logo({
  className,
  tone = "dark",
  title,
}: {
  className?: string;
  /** "dark" = navy wordmark for light backgrounds, "light" = white wordmark for dark bands. */
  tone?: "dark" | "light";
  title?: string;
}) {
  const label = title ?? "PS Umzug AG";

  return (
    <img
      src={tone === "light" ? "/ps-umzug-logo-light.svg" : "/ps-umzug-logo.svg"}
      alt={label}
      width={416}
      height={255}
      className={cn("inline-block h-12 w-auto", className)}
      loading="eager"
      decoding="async"
    />
  );
}
