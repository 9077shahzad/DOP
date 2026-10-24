import { expect, it } from "vitest";
import { joinName, splitName } from "./person-name";

it("stores first and last name as one customer name", () => {
  expect(joinName(" Anna ", "Muster")).toBe("Anna Muster");
  expect(joinName("Anna", "")).toBe("Anna");
});

it("splits an older single name with the last word as last name", () => {
  expect(splitName("Anna Maria Muster")).toEqual({ first: "Anna Maria", last: "Muster" });
  expect(splitName("Anna")).toEqual({ first: "Anna", last: "" });
  expect(splitName(null)).toEqual({ first: "", last: "" });
});
