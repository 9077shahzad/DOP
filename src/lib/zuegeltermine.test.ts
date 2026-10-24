import { describe, expect, it } from "vitest";

import {
  nearestNonPeakDates,
  nextZuegeltermine,
  officialDates,
  peakWindow,
  toIsoDate,
  zuegelterminInfo,
  zuegelterminInfoFromIso,
} from "@/lib/zuegeltermine";

const d = (iso: string) => {
  const [y, m, day] = iso.split("-").map(Number);
  return new Date(y!, m! - 1, day!);
};

describe("official dates", () => {
  it("are the last days of March, June, September and December", () => {
    expect(officialDates(2026).map(toIsoDate)).toEqual([
      "2026-03-31",
      "2026-06-30",
      "2026-09-30",
      "2026-12-31",
    ]);
  });

  it("respects leap-year-independent month ends", () => {
    expect(toIsoDate(officialDates(2028)[0]!)).toBe("2028-03-31");
  });
});

describe("peak window", () => {
  it("spans three working days either side of the official date", () => {
    // 2026-12-31 is a Thursday.
    const window = peakWindow(d("2026-12-31")).map(toIsoDate);
    expect(window).toContain("2026-12-31");
    expect(window).toContain("2026-12-28"); // three working days before
    expect(window).toContain("2027-01-05"); // three working days after
    expect(window).not.toContain("2026-12-24");
  });

  it("counts weekends as part of the window without consuming working days", () => {
    // 2026-09-30 is a Wednesday; the window reaches Monday 2026-10-05.
    const window = peakWindow(d("2026-09-30")).map(toIsoDate);
    expect(window).toContain("2026-10-03"); // Saturday, inside the span
    expect(window).toContain("2026-10-05"); // third working day after
  });
});

describe("zuegelterminInfo", () => {
  it("flags the official date itself", () => {
    const info = zuegelterminInfo(d("2026-12-31"));
    expect(info.isPeak).toBe(true);
    expect(info.peakLabel).toBe("2026-12-31");
    expect(info.daysToNearestPeak).toBe(0);
  });

  it("flags the first working day of the new term", () => {
    expect(zuegelterminInfo(d("2027-01-04")).isPeak).toBe(true);
  });

  it("flags days just before the end of March", () => {
    expect(zuegelterminInfo(d("2026-03-30")).isPeak).toBe(true);
  });

  it("does not flag an ordinary day and reports the distance", () => {
    const info = zuegelterminInfo(d("2026-05-15"));
    expect(info.isPeak).toBe(false);
    expect(info.peakLabel).toBeUndefined();
    expect(info.daysToNearestPeak).toBeGreaterThan(0);
  });

  it("measures the distance to the nearest window edge, not the official date", () => {
    // Window around 2026-06-30 starts 2026-06-25 (Thu), so 2026-06-22 is 3 days out.
    expect(zuegelterminInfo(d("2026-06-22")).daysToNearestPeak).toBe(3);
  });

  it("looks across the year boundary", () => {
    // Early January is closer to the 31 December window than to end of March.
    expect(zuegelterminInfo(d("2027-01-08")).daysToNearestPeak).toBeLessThan(30);
  });
});

describe("iso helpers", () => {
  it("returns null without a date", () => {
    expect(zuegelterminInfoFromIso(null)).toBeNull();
    expect(zuegelterminInfoFromIso("not-a-date")).toBeNull();
  });

  it("reads a planner ISO date", () => {
    expect(zuegelterminInfoFromIso("2026-12-31")?.isPeak).toBe(true);
  });
});

describe("suggestions", () => {
  it("lists the next official dates", () => {
    expect(nextZuegeltermine(d("2026-10-01"), 2).map(toIsoDate)).toEqual([
      "2026-12-31",
      "2027-03-31",
    ]);
  });

  it("suggests calmer working days outside every window", () => {
    const suggestions = nearestNonPeakDates(d("2026-12-31"), 2);
    expect(suggestions).toHaveLength(2);
    for (const suggestion of suggestions) {
      expect(zuegelterminInfo(suggestion).isPeak).toBe(false);
      expect([0, 6]).not.toContain(suggestion.getDay());
    }
  });

  it("never suggests a date before the given floor", () => {
    const suggestions = nearestNonPeakDates(d("2026-12-31"), 2, d("2026-12-31"));
    for (const suggestion of suggestions) {
      expect(suggestion.getTime()).toBeGreaterThan(d("2026-12-30").getTime());
    }
  });
});
