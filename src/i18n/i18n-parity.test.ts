/**
 * Translation parity is a build gate: every UI language carries exactly the
 * German key set, with no empty values. A missing key means a user sees a raw
 * key or German text in a French, Italian, English or Arabic session.
 */
import { describe, expect, it } from "vitest";

import { auditTranslations } from "./audit";
import { DEFAULT_LANG, SUPPORTED_LANGS, UI_LANGS } from "./config";

describe("i18n parity", () => {
  const report = auditTranslations();
  // A handful of keys are deliberately blank in German too (unused slots); a
  // translation may only be empty where the German source is empty as well.
  const blankInGerman = new Set(report[DEFAULT_LANG].empty);

  it("offers five interface languages including Arabic", () => {
    expect(UI_LANGS).toEqual(["de", "fr", "it", "en", "ar"]);
  });

  for (const lang of SUPPORTED_LANGS) {
    it(`${lang} has no missing, extra or empty keys`, () => {
      const { missing, extra, empty } = report[lang];
      expect({ lang, missing, extra, empty: empty.filter((k) => !blankInGerman.has(k)) }).toEqual({
        lang,
        missing: [],
        extra: [],
        empty: [],
      });
    });
  }
});
