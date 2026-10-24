import { expect, it } from "vitest";
import { formatCalendarDate } from "./format";

it("displays the requested European calendar date without changing the stored day", () => {
  expect(formatCalendarDate("2026-10-15")).toBe("15-10-2026");
  expect(formatCalendarDate("2026-01-01")).toBe("01-01-2026");
  expect(formatCalendarDate(null)).toBe("—");
  expect(formatCalendarDate("15-10-2026")).toBe("15-10-2026");
});
it("shows timestamps as day-month-year in Swiss local time", async () => {
  const { formatDayMonthYear } = await import("./format");
  expect(formatDayMonthYear("2026-10-15T06:00:00Z")).toBe("15-10-2026");
  expect(formatDayMonthYear("2026-11-10T07:00:00Z", true)).toBe("10-11-2026 08:00");
  expect(formatDayMonthYear("2026-12-31T23:30:00Z")).toBe("01-01-2027");
});
