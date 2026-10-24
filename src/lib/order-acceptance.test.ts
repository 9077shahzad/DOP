import { describe, expect, it } from "vitest";
import { hasCurrentCustomerAcceptance } from "./order-acceptance";

describe("customer acceptance required for orders", () => {
  it("refuses a staff-created order without actual customer acceptance", () => {
    expect(hasCurrentCustomerAcceptance({ accepted_at: null, accepted_version: null, version: 2 })).toBe(false);
  });
  it("refuses acceptance of an older quotation version", () => {
    expect(hasCurrentCustomerAcceptance({ accepted_at: "2026-10-10T10:00:00Z", accepted_version: 1, version: 2 })).toBe(false);
  });
  it("allows the genuinely accepted current version", () => {
    expect(hasCurrentCustomerAcceptance({ accepted_at: "2026-10-10T10:00:00Z", accepted_version: 2, version: 2 })).toBe(true);
  });
});