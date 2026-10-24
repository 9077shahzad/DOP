/**
 * Calendar arithmetic for the dispatch board.
 *
 * Pure date maths only — no data access. The office works in Swiss weeks, so a
 * week starts on Monday and a month grid always shows whole weeks.
 */

export type CalendarMode = "day" | "week" | "month";

/** Local calendar day key, YYYY-MM-DD — never UTC, or an evening job slips a day. */
export function dayKeyOf(value: Date | string): string {
  const d = typeof value === "string" ? new Date(value) : value;
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Monday of the week the date falls in. */
export function startOfWeek(d: Date): Date {
  const s = startOfDay(d);
  const shift = (s.getDay() + 6) % 7;
  s.setDate(s.getDate() - shift);
  return s;
}

/** The days the given view shows, in order. */
export function visibleDays(mode: CalendarMode, anchor: Date): Date[] {
  if (mode === "day") return [startOfDay(anchor)];
  if (mode === "week") {
    const first = startOfWeek(anchor);
    return Array.from({ length: 7 }, (_, i) => new Date(first.getFullYear(), first.getMonth(), first.getDate() + i));
  }
  const first = startOfWeek(new Date(anchor.getFullYear(), anchor.getMonth(), 1));
  const lastOfMonth = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
  const days: Date[] = [];
  for (let cur = first; cur <= lastOfMonth || days.length % 7 !== 0; cur = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate() + 1)) {
    days.push(cur);
    if (days.length > 42) break;
  }
  return days;
}

/** Moves the anchor one view forward or back. */
export function shiftAnchor(mode: CalendarMode, anchor: Date, direction: -1 | 1): Date {
  if (mode === "day") return new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() + direction);
  if (mode === "week") return new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() + 7 * direction);
  return new Date(anchor.getFullYear(), anchor.getMonth() + direction, 1);
}

/** Groups anything with a scheduled start into local day buckets. */
export function groupByDay<T extends { scheduled_start: string | null }>(items: T[]): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    if (!item.scheduled_start) continue;
    const key = dayKeyOf(item.scheduled_start);
    map.set(key, [...(map.get(key) ?? []), item]);
  }
  for (const [key, list] of map) {
    map.set(
      key,
      [...list].sort((a, b) => String(a.scheduled_start).localeCompare(String(b.scheduled_start))),
    );
  }
  return map;
}

/** Share of the visible progress line a job has completed, 0…1. */
export function progressOf(status: string): number {
  const order = ["scheduled", "assigned", "en_route", "on_site", "in_progress", "completed"];
  const folded =
    status === "loading" || status === "in_transit" || status === "unloading" || status === "paused"
      ? "in_progress"
      : status === "verified"
        ? "completed"
        : status;
  const index = order.indexOf(folded);
  if (index < 0) return 0;
  return index / (order.length - 1);
}
