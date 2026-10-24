import { describe, expect, it } from "vitest";

import { dayKeyOf, groupByDay, progressOf, shiftAnchor, startOfWeek, visibleDays } from "./dispatch-calendar";

describe("dispatch calendar", () => {
  it("starts the week on Monday", () => {
    // Sunday 2026-09-13 belongs to the week beginning Monday 2026-09-07.
    expect(dayKeyOf(startOfWeek(new Date(2026, 8, 13)))).toBe("2026-09-07");
    expect(dayKeyOf(startOfWeek(new Date(2026, 8, 7)))).toBe("2026-09-07");
  });

  it("shows one day, seven days or whole weeks", () => {
    const anchor = new Date(2026, 8, 10);
    expect(visibleDays("day", anchor)).toHaveLength(1);
    expect(visibleDays("week", anchor)).toHaveLength(7);
    const month = visibleDays("month", anchor);
    expect(month.length % 7).toBe(0);
    expect(dayKeyOf(month[0]!)).toBe("2026-08-31");
  });

  it("moves the anchor by one view", () => {
    const a = new Date(2026, 8, 10);
    expect(dayKeyOf(shiftAnchor("day", a, 1))).toBe("2026-09-11");
    expect(dayKeyOf(shiftAnchor("week", a, -1))).toBe("2026-09-03");
    expect(dayKeyOf(shiftAnchor("month", a, 1))).toBe("2026-10-01");
  });

  it("groups jobs by local day, earliest first, and skips unplanned ones", () => {
    const rows = [
      { id: "b", scheduled_start: "2026-09-10T13:00:00" },
      { id: "a", scheduled_start: "2026-09-10T08:00:00" },
      { id: "c", scheduled_start: null },
    ];
    const grouped = groupByDay(rows);
    expect(grouped.get("2026-09-10")?.map((r) => r.id)).toEqual(["a", "b"]);
    expect(grouped.size).toBe(1);
  });

  it("folds transitional statuses into the visible progress line", () => {
    expect(progressOf("scheduled")).toBe(0);
    expect(progressOf("completed")).toBe(1);
    expect(progressOf("verified")).toBe(1);
    expect(progressOf("loading")).toBe(progressOf("in_progress"));
    expect(progressOf("unloading")).toBe(progressOf("in_progress"));
  });

  it("treats an unknown status as no progress", () => {
    expect(progressOf("cancelled")).toBe(0);
    expect(progressOf("whatever")).toBe(0);
  });
});
