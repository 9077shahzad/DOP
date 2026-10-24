import { describe, expect, it } from "vitest";

import { TRACKING_STEPS, trackingStepIndex, trackingUrl } from "./job-tracking";

describe("job tracking progress", () => {
  it("maps the visible steps in order", () => {
    expect(TRACKING_STEPS).toEqual(["scheduled", "assigned", "en_route", "on_site", "in_progress", "completed"]);
    expect(trackingStepIndex("scheduled")).toBe(0);
    expect(trackingStepIndex("on_site")).toBe(3);
  });

  it("folds the in-between crew statuses into the running step", () => {
    for (const status of ["loading", "in_transit", "unloading", "paused"] as const) {
      expect(trackingStepIndex(status)).toBe(TRACKING_STEPS.indexOf("in_progress"));
    }
  });

  it("treats an office-verified job as completed and a cancelled job as off the line", () => {
    expect(trackingStepIndex("verified")).toBe(TRACKING_STEPS.indexOf("completed"));
    expect(trackingStepIndex("cancelled")).toBe(-1);
  });

  it("builds the customer link without a double slash", () => {
    expect(trackingUrl("https://example.ch/", "de", "abc")).toBe("https://example.ch/de/auftrag/abc");
  });
});
