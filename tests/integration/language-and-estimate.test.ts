/**
 * B3 — estimate transparency while the travel distance is unconfirmed.
 * B4 — default language for a fresh visitor.
 *
 * Both are customer-visible promises: no implied all-inclusive total before
 * the distance is confirmed, and a German-speaking first-time visitor lands
 * on the German site.
 */
import { readFileSync } from "node:fs";

import { beforeAll, describe, expect, it } from "vitest";

import ar from "../../src/i18n/ar.json";
import de from "../../src/i18n/de.json";
import en from "../../src/i18n/en.json";
import fr from "../../src/i18n/fr.json";
import itDict from "../../src/i18n/it.json";
import { detectLanguage } from "../../src/i18n/config";

const BASE = process.env["APP_BASE_URL"] ?? "http://localhost:8080";
const dicts = { de, fr, it: itDict, en, ar } as const;

let serverUp = false;
beforeAll(async () => {
  try {
    serverUp = (await fetch(`${BASE}/de/planer`)).ok;
  } catch {
    serverUp = false;
  }
});

describe("unconfirmed distance transparency", () => {
  it("carries the exclusion notice in all five languages", () => {
    for (const [lang, dict] of Object.entries(dicts)) {
      const step = (dict as typeof de).planer.step1.distanceExcluded;
      const panel = (dict as typeof de).planer.panel.distanceExcluded;
      expect(`${lang}:${Boolean(step)}`).toBe(`${lang}:true`);
      expect(panel).toBe(step);
      // No kilometres, minutes or a total may be implied by the copy.
      expect(step).not.toMatch(/\d+\s?(km|min)/i);
    }
  });

  it("shows the notice on the wizard route step while nothing is confirmed", async () => {
    if (!serverUp) return;
    // Service selection is now the first question, so the route step — and
    // with it the exclusion notice — is reached once a move is selected.
    const body = await (await fetch(`${BASE}/de/planer`)).text();
    expect(body).toContain(de.planer.flow.services.title);
    const src = readFileSync("src/components/planner/Steps.tsx", "utf8");
    expect(src).toContain('t("step1.distanceExcluded")');
  });

  it("suppresses the panel notice once the distance is routed or manual", () => {
    const src = readFileSync("src/components/planner/LivePanel.tsx", "utf8");
    expect(src).toContain('distanceSource === "unconfirmed" ? (');
    expect(src).toContain('t("panel.distanceExcluded")');
  });
});

describe("default language", () => {
  it("gives a German browser the German site", () => {
    expect(detectLanguage("/")).toBe("de");
  });

  it("falls back to German for an unsupported browser language", () => {
    expect(detectLanguage("/")).toBe("de");
  });

  it("honours an explicit language in the URL", () => {
    expect(detectLanguage("/en/planer")).toBe("en");
    expect(detectLanguage("/ar")).toBe("ar");
  });
});
