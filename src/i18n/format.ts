import { LOCALES, type Lang } from "./config";

export function localeOf(lang: Lang): string {
  return LOCALES[lang] ?? LOCALES.de;
}

/** CHF 1'480 — Swiss formatting via Intl, apostrophe thousands separator. */
export function formatCurrency(value: number, lang: Lang, fractionDigits = 0): string {
  return new Intl.NumberFormat(localeOf(lang), {
    style: "currency",
    currency: "CHF",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

export function formatNumber(value: number, lang: Lang, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(localeOf(lang), options).format(value);
}

export function formatDate(
  value: Date | number | string,
  lang: Lang,
  options: Intl.DateTimeFormatOptions = { dateStyle: "long" },
): string {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat(localeOf(lang), options).format(date);
}

/** Date + time in the active locale — used wherever an SLA deadline is shown. */
export function formatDateTime(value: Date | number | string, lang: Lang): string {
  return formatDate(value, lang, { dateStyle: "medium", timeStyle: "short" });
}

/** Calendar dates only: retain the stored day, with no timezone conversion. */
export function formatCalendarDate(value: string | null | undefined): string {
  if (!value) return "—";
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : value;
}

/** Timestamps shown as DD-MM-YYYY (Swiss local day), optionally with HH:MM. */
export function formatDayMonthYear(value: string | Date | null | undefined, withTime = false): string {
  if (!value) return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("de-CH", { timeZone: "Europe/Zurich", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
      .formatToParts(d).map((x) => [x.type, x.value]),
  );
  return `${p["day"]}-${p["month"]}-${p["year"]}${withTime ? ` ${p["hour"]}:${p["minute"]}` : ""}`;
}
