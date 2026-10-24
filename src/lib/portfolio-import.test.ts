/**
 * Portfolio import: what the preview shows is exactly what would be written.
 * Nothing is guessed into a price, and a row that cannot be placed is
 * reported rather than silently dropped.
 */
import { describe, expect, it } from "vitest";

import { buildImportRows, guessMapping, parseDelimited } from "@/lib/portal";

const CSV = [
  "Adresse;PLZ;Ort;Wohnung;Zimmer;Etage;Fläche",
  "Bahnhofstrasse 1;8001;Zürich;A1;3.5;2;78",
  "Bahnhofstrasse 1;8001;Zürich;A2;2,5;3;61",
  ";8001;Zürich;B1;4.5;1;95",
].join("\r\n");

describe("portfolio import", () => {
  const sheet = parseDelimited(CSV);
  const mapping = guessMapping(sheet.headers);
  const rows = buildImportRows(sheet, mapping);

  it("reads the header and every data row", () => {
    expect(sheet.headers).toHaveLength(7);
    expect(sheet.rows).toHaveLength(3);
  });

  it("guesses the German column headers", () => {
    expect(mapping).toEqual(["address", "zip", "city", "label", "rooms", "floor", "size_m2"]);
  });

  it("keeps the Swiss room ladder, comma decimals included", () => {
    expect(rows[0]!.unit?.rooms).toBe(3.5);
    expect(rows[1]!.unit?.rooms).toBe(2.5);
  });

  it("never invents a room count", () => {
    const noRooms = buildImportRows(parseDelimited("Adresse;Wohnung\nSeeweg 4;C1"), ["address", "label"]);
    expect(noRooms[0]!.unit?.rooms).toBeNull();
  });

  it("flags a row without an address instead of importing it", () => {
    expect(rows[2]!.problems).toContain("address");
    expect(rows[0]!.problems).toEqual([]);
  });

  it("honours quoted fields containing the delimiter", () => {
    const quoted = parseDelimited('Adresse;Ort\n"Weg 1; Hinterhaus";Bern');
    expect(quoted.rows[0]).toEqual(["Weg 1; Hinterhaus", "Bern"]);
  });

  it("reads comma-separated files too", () => {
    const comma = parseDelimited("Adresse,Ort\nSeeweg 4,Thun");
    expect(comma.rows[0]).toEqual(["Seeweg 4", "Thun"]);
  });
});
