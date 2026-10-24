import { expect, it } from "vitest";
import { withCorrectedContact } from "./contact-overlay";

it("order shows corrected contact details but keeps the accepted price and scope", () => {
  const snap = { customer_name: "Anna Mustr", customer_phone: "079 1", price_total: 1416.68, move_date: "2026-11-10", items: { sofa: 1 } };
  const current = { customer_name: "Anna Muster", customer_phone: "079 2", price_total: 999, move_date: "2026-12-01", items: {} };
  const out = withCorrectedContact(snap, current);
  expect(out.customer_name).toBe("Anna Muster");
  expect(out.customer_phone).toBe("079 2");
  expect(out.price_total).toBe(1416.68);
  expect(out.move_date).toBe("2026-11-10");
  expect(out.items).toEqual({ sofa: 1 });
  expect(snap.customer_name).toBe("Anna Mustr");
});
