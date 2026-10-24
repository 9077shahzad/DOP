import { describe, expect, it } from "vitest";
import { isArabicText, mirrorAlign, mirrorX } from "./pdf-rtl";

describe("Arabic PDF layout", () => {
  it("detects Arabic text and leaves Latin text alone", () => {
    expect(isArabicText("عرض سعر")).toBe(true);
    expect(isArabicText("Reinigungsgasse 5, 3613 Steffisburg")).toBe(false);
  });
  it("mirrors positions across the A4 page", () => {
    expect(mirrorX(18, 210)).toBe(192);
    expect(mirrorX(18, 210, 40)).toBe(152);
  });
  it("flips text alignment for right-to-left", () => {
    expect(mirrorAlign(undefined)).toBe("right");
    expect(mirrorAlign("right")).toBe("left");
    expect(mirrorAlign("center")).toBe("center");
  });
});
