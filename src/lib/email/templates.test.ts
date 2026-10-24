import { describe, expect, it } from "vitest";

import { LANGS } from "./template-types";
import { OPERATIONAL_TEMPLATE_KEYS } from "./templates-operational";
import { renderEmail, TEMPLATE_KEYS } from "./templates";

const FULL = {
  name: "Anna Meier",
  reference: "MF-2026-9ZFDFXQA",
  status: "In Arbeit",
  note: "Zusatzinformation",
  actionUrl: "https://ps-umzug.ch/de/offerte/MF-2026-9ZFDFXQA",
  dueDate: "31.08.2026",
  amount: "CHF 1'240.00",
  scheduledFor: "02.09.2026, 08:00",
  location: "Bahnhofstrasse 1, 8001 Zürich",
  items: ["3.5 Zimmer", "Endreinigung mit Abnahmegarantie"],
};

describe("notification templates", () => {
  it("covers every operational notification the workflow needs", () => {
    for (const key of [
      "inquiry_confirmation",
      "quote_sent",
      "booking_confirmation",
      "change_order",
      "work_order_update",
      "job_completion",
      "invoice",
      "ops_notification",
    ]) {
      expect(OPERATIONAL_TEMPLATE_KEYS).toContain(key);
      expect(TEMPLATE_KEYS).toContain(key);
    }
  });

  it("renders every template in every language with real content", () => {
    for (const key of TEMPLATE_KEYS) {
      for (const lang of LANGS) {
        const mail = renderEmail(key, lang, FULL);
        expect(mail.subject.trim(), `${key}/${lang} subject`).not.toBe("");
        expect(mail.html).toContain("<html");
        expect(mail.text.trim()).not.toBe("");
        expect(`${mail.subject} ${mail.text}`).not.toMatch(/undefined|\[object Object\]/);
      }
    }
  });

  it("omits optional lines instead of printing empty labels", () => {
    for (const key of TEMPLATE_KEYS) {
      const mail = renderEmail(key, "de", { name: null });
      expect(mail.text).not.toMatch(/:\s*$/m);
      expect(mail.text).not.toContain("null");
    }
  });

  it("escapes user supplied values in the HTML body", () => {
    const mail = renderEmail("inquiry_confirmation", "de", { name: '<script>alert("x")</script>' });
    expect(mail.html).not.toContain("<script>");
    expect(mail.html).toContain("&lt;script&gt;");
  });
});
