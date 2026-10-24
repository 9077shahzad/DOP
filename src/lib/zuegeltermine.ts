/**
 * Swiss moving dates (Zügeltermine).
 *
 * Swiss rental terminations cluster on the official quarterly dates — end of
 * March, June, September and above all 31 December / 1 January. Demand and
 * therefore prices peak in the days around them.
 *
 * Pure module: no i18n, no pricing, no dates from the network. The peak
 * SURCHARGE itself is a published pricing parameter, never a constant here.
 */

/** Months (1-based) that carry an official moving date, on their last day. */
const PEAK_MONTHS = [3, 6, 9, 12] as const;

/** Working days before and after the official date that still count as peak. */
const WINDOW_WORKING_DAYS = 3;

export type PeakInfo = {
  isPeak: boolean;
  /** ISO date of the official Zügeltermin the day belongs to, when in a window. */
  peakLabel?: string;
  /** Calendar days to the nearest peak day — 0 while inside a window. */
  daysToNearestPeak: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function atMidnight(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function toIsoDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function parseIsoDate(iso: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

function isWorkingDay(date: Date): boolean {
  const day = date.getDay();
  return day !== 0 && day !== 6;
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function lastDayOfMonth(year: number, month1: number): Date {
  return new Date(year, month1, 0);
}

/** The official moving dates of a year, in calendar order. */
export function officialDates(year: number): Date[] {
  return PEAK_MONTHS.map((month) => lastDayOfMonth(year, month));
}

/**
 * Every day of the peak window around one official date: the date itself, the
 * three working days before it, and the three working days after it — which
 * always includes the first working day of the new term.
 */
export function peakWindow(anchor: Date): Date[] {
  const days = [atMidnight(anchor)];

  let cursor = anchor;
  for (let taken = 0; taken < WINDOW_WORKING_DAYS; ) {
    cursor = addDays(cursor, -1);
    days.push(atMidnight(cursor));
    if (isWorkingDay(cursor)) taken += 1;
  }

  cursor = anchor;
  for (let taken = 0; taken < WINDOW_WORKING_DAYS; ) {
    cursor = addDays(cursor, 1);
    days.push(atMidnight(cursor));
    if (isWorkingDay(cursor)) taken += 1;
  }

  return days.sort((a, b) => a.getTime() - b.getTime());
}

/** Official dates whose window can reach the given day (previous/next year included). */
function anchorsAround(date: Date): Date[] {
  const year = date.getFullYear();
  return [...officialDates(year - 1), ...officialDates(year), ...officialDates(year + 1)];
}

export function zuegelterminInfo(date: Date): PeakInfo {
  const day = atMidnight(date);

  let nearest = Number.POSITIVE_INFINITY;
  for (const anchor of anchorsAround(day)) {
    for (const peakDay of peakWindow(anchor)) {
      const distance = Math.round((peakDay.getTime() - day.getTime()) / DAY_MS);
      if (distance === 0) {
        return { isPeak: true, peakLabel: toIsoDate(anchor), daysToNearestPeak: 0 };
      }
      nearest = Math.min(nearest, Math.abs(distance));
    }
  }

  return { isPeak: false, daysToNearestPeak: nearest };
}

/** Convenience wrapper for planner state, which stores an ISO date or null. */
export function zuegelterminInfoFromIso(iso: string | null | undefined): PeakInfo | null {
  if (!iso) return null;
  const date = parseIsoDate(iso);
  return date ? zuegelterminInfo(date) : null;
}

/** The next official moving dates on or after `from`. */
export function nextZuegeltermine(from: Date, count = 2): Date[] {
  const day = atMidnight(from);
  const candidates = [
    ...officialDates(day.getFullYear()),
    ...officialDates(day.getFullYear() + 1),
  ].filter((d) => d.getTime() >= day.getTime());
  return candidates.slice(0, count);
}

/**
 * The nearest calmer dates around a peak day — quieter alternatives to offer
 * the customer, searched outwards from the chosen date.
 */
export function nearestNonPeakDates(date: Date, count = 2, notBefore?: Date): Date[] {
  const day = atMidnight(date);
  const floor = notBefore ? atMidnight(notBefore) : null;
  const found: Date[] = [];
  for (let offset = 1; offset <= 45 && found.length < count; offset += 1) {
    for (const candidate of [addDays(day, -offset), addDays(day, offset)]) {
      if (found.length >= count) break;
      if (floor && candidate.getTime() < floor.getTime()) continue;
      if (!zuegelterminInfo(candidate).isPeak && isWorkingDay(candidate)) found.push(candidate);
    }
  }
  return found.sort((a, b) => a.getTime() - b.getTime());
}
