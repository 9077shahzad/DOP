import { describe, expect, it } from "vitest";
import { containsPriceClaim } from "@/lib/chat/guardrails";
describe("chat guardrail", () => {
  it("blocks quoted amounts", () => {
    for (const s of ["roughly CHF 800", "about 1'200 CHF", "€450", "circa 950.- Franken", "Kosten: Fr. 300"]) {
      expect(containsPriceClaim(s).blocked, s).toBe(true);
    }
  });
  it("allows non-money text and the zero-cost guarantee", () => {
    for (const s of ["Cost to you: CHF 0.–", "We serve 11 regions since 2026", "3.5 rooms, 24 h rectification"]) {
      expect(containsPriceClaim(s).blocked, s).toBe(false);
    }
  });
});
