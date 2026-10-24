/**
 * Sweep: there is exactly ONE runtime pricing source of truth — the published
 * pricing configuration. This test fails if a legacy table, a hardcoded price
 * table or a silent fallback is reintroduced into runtime code.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const ROOT = join(process.cwd(), "src");

/** Runtime files only — fixtures and tests may pin literal prices. */
function runtimeFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      runtimeFiles(full, acc);
      continue;
    }
    if (!/\.(ts|tsx)$/.test(entry)) continue;
    if (/\.test\.tsx?$/.test(entry) || entry.endsWith(".fixture.ts")) continue;
    if (full.includes(join("integrations", "supabase"))) continue; // generated types
    acc.push(full);
  }
  return acc;
}

const FILES = runtimeFiles(ROOT);

const FORBIDDEN: { pattern: RegExp; why: string }[] = [
  { pattern: /framework_rates/, why: "legacy pricing table" },
  { pattern: /PORTAL_ASSUMPTIONS/, why: "hardcoded portal assumptions" },
  { pattern: /\bpriceJob\b/, why: "legacy portal pricing function" },
  { pattern: /\bCONFIG\.(vat|move|pack|clean|disp|bundle|crew|van|boxes|travel)/, why: "hardcoded price CONFIG" },
  { pattern: /export const CONFIG\b/, why: "hardcoded price CONFIG" },
];

describe("one runtime pricing source of truth", () => {
  for (const { pattern, why } of FORBIDDEN) {
    it(`no runtime file contains ${pattern.source} (${why})`, () => {
      const hits = FILES.filter((file) => pattern.test(readFileSync(file, "utf8")));
      expect(hits).toEqual([]);
    });
  }

  it("no runtime pricing fallback: the estimator refuses without a published configuration", () => {
    const source = readFileSync(join(ROOT, "lib", "price-resolution.ts"), "utf8");
    expect(source).toContain('if (!pricing) return { state: "unavailable" };');
    expect(source).toContain("input.bands ?? []");
  });

  it("every planner parameter is read from the published configuration", () => {
    const source = readFileSync(join(ROOT, "lib", "pricing.ts"), "utf8");
    expect(source).toContain('from "@/lib/planner-pricing"');
    // A bare numeric price would be a rate; every rate goes through param().
    expect(source).not.toMatch(/perM3|perKm|vat:\s*0\./);
  });
});
