import { describe, expect, it } from "vitest";

import { groupLines, lineGroup } from "@/lib/line-groups";
import { offerSearchFilter, phoneDigits } from "@/lib/offer-search";
import { isEstimateDocument } from "@/lib/quote-disclaimer";

describe("Notiz 8 – position grouping", () => {
  it("puts moving items together, then cleaning, then disposal", () => {
    const engine = ["move", "clean", "disp_volume", "disp_labour", "clean_balcony", "clean_lamellen", "clean_dowel_holes", "clean_windows_normal", "clean_windows_large", "extra_furniture_assembly"];
    const ids = groupLines(engine.map((id) => ({ id }))).map((l) => l.id);
    expect(ids).toEqual(["move", "extra_furniture_assembly", "clean", "clean_balcony", "clean_lamellen", "clean_dowel_holes", "clean_windows_normal", "clean_windows_large", "disp_volume", "disp_labour"]);
  });
  it("never classifies disposal as moving or cleaning", () => {
    expect(lineGroup("disp_volume")).toBe("disp");
    expect(lineGroup("disp_labour")).toBe("disp");
  });
  it("keeps the sum unchanged", () => {
    const lines = [{ id: "clean", amount: 670 }, { id: "move", amount: 1885.38 }, { id: "disp_volume", amount: 200 }];
    const sum = (xs: { amount: number }[]) => xs.reduce((s, x) => s + x.amount, 0);
    expect(sum(groupLines(lines))).toBe(sum(lines));
  });
});

describe("Notiz 8 – offer search", () => {
  it("normalises Swiss phone formats", () => {
    expect(phoneDigits("+41 78 218 33 33")).toBe("0782183333");
    expect(phoneDigits("078-218.33.33")).toBe("0782183333");
  });
  it("searches name, reference and spaced phone digits", () => {
    const f = offerSearchFilter("0782183333")!;
    expect(f).toContain("customer_phone.ilike.*0*7*8*2*1*8*3*3*3*3*");
    expect(offerSearchFilter("MF-2026-W6DV")).toContain("reference.ilike.*MF-2026-W6DV*");
    expect(offerSearchFilter("Adamec")).toContain("customer_name.ilike.*Adamec*");
  });
  it("ignores empty input and strips filter syntax", () => {
    expect(offerSearchFilter("   ")).toBeNull();
    expect(offerSearchFilter("a,b)")).not.toMatch(/[()]/);
  });
});

describe("Notiz 8 – estimate sentence", () => {
  it("only appears on unreviewed planner estimates", () => {
    expect(isEstimateDocument({ documentKind: "quote" })).toBe(true);
    expect(isEstimateDocument({ documentKind: "quote", status: "new" })).toBe(true);
    expect(isEstimateDocument({ documentKind: "quote", status: "sent", version: 2 })).toBe(false);
    expect(isEstimateDocument({ documentKind: "quote", status: "draft", version: 2 })).toBe(false);
    expect(isEstimateDocument({ documentKind: "order" })).toBe(false);
  });
});
