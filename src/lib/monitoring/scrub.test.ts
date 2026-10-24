import { describe, expect, it } from "vitest";

import { buildEventPayload, parseDsn } from "./sentry";
import { REDACTED, scrubPayload, scrubText, scrubValue } from "./scrub";

describe("scrubText", () => {
  it("removes e-mail addresses, phone numbers and IBANs", () => {
    const out = scrubText(
      "Lead failed for shehzad_falak@yahoo.com, phone +41 78 323 88 76, IBAN CH93 0076 2011 6238 5295 7",
    );
    expect(out).not.toContain("shehzad_falak");
    expect(out).not.toContain("323 88 76");
    expect(out).not.toContain("6238");
    expect(out).toContain("[email]");
    expect(out).toContain("[phone]");
    expect(out).toContain("[iban]");
  });

  it("removes bearer tokens and provider keys", () => {
    const out = scrubText(
      "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.abcdef sb_secret_abcdefgh1234",
    );
    expect(out).not.toContain("eyJhbGciOiJIUzI1NiJ9");
    expect(out).not.toContain("sb_secret_abcdefgh1234");
  });

  it("removes street addresses and localities", () => {
    const out = scrubText("Abholung Bahnhofstrasse 12, 8005 Zürich");
    expect(out).not.toContain("Bahnhofstrasse 12");
    expect(out).not.toContain("8005 Zürich");
  });

  it("redacts explicitly supplied names", () => {
    const out = scrubText("Quote failed for Muhammad Shehzad", ["Muhammad Shehzad"]);
    expect(out).toBe(`Quote failed for ${REDACTED}`);
  });
});

describe("scrubValue", () => {
  it("drops values under personal, commercial and credential keys", () => {
    const out = scrubValue({
      customer_name: "Muhammad Shehzad",
      contact_email: "a@b.ch",
      phone: "+41780000000",
      address_line: "Bahnhofstrasse 12",
      partner_cost: 1200,
      margin_pct: 22,
      access_token: "abc",
      lead_reference: "MF-LEAD-2026-XXXX",
      job_name: "mf-sla-timeouts",
    }) as Record<string, unknown>;

    for (const key of [
      "customer_name",
      "contact_email",
      "phone",
      "address_line",
      "partner_cost",
      "margin_pct",
      "access_token",
    ]) {
      expect(out[key], key).toBe(REDACTED);
    }
    // Non-identifying operational data survives — otherwise the tracker is useless.
    expect(out["lead_reference"]).toBe("MF-LEAD-2026-XXXX");
    expect(out["job_name"]).toBe("mf-sla-timeouts");
  });

  it("scrubs nested structures and arrays", () => {
    const out = scrubValue({ rows: [{ customer: { name: "X" }, note: "call a@b.ch" }] }) as {
      rows: Array<{ customer: string; note: string }>;
    };
    expect(out.rows[0]!.customer).toBe(REDACTED);
    expect(out.rows[0]!.note).toContain("[email]");
  });
});

describe("outbound payload", () => {
  it("never transmits a customer identity", () => {
    const payload = buildEventPayload(
      new Error("Failed to create quote for Muhammad Shehzad (shehzad_falak@yahoo.com, +41783238876)"),
      {
        source: "server_fn",
        extra: { customer_name: "Muhammad Shehzad", lead_reference: "MF-LEAD-2026-ABC" },
        sensitiveTerms: ["Muhammad Shehzad"],
      },
    );
    const wire = JSON.stringify(payload);
    expect(wire).not.toContain("Muhammad");
    expect(wire).not.toContain("shehzad_falak");
    expect(wire).not.toContain("41783238876");
    expect(payload.tags["source"]).toBe("server_fn");
    expect(payload.extra["lead_reference"]).toBe("MF-LEAD-2026-ABC");
  });

  it("keeps the payload shape stable when nothing is sensitive", () => {
    const payload = scrubPayload({
      type: "Error",
      message: "boom",
      extra: { attempt: 2 },
      tags: { source: "job" },
    });
    expect(payload).toEqual({
      type: "Error",
      message: "boom",
      extra: { attempt: 2 },
      tags: { source: "job" },
    });
  });
});

describe("DSN", () => {
  it("parses a Sentry DSN", () => {
    expect(parseDsn("https://abc123@o42.ingest.sentry.io/7")).toMatchObject({
      publicKey: "abc123",
      host: "o42.ingest.sentry.io",
      projectId: "7",
    });
  });

  it("treats an absent or malformed DSN as unconfigured", () => {
    expect(parseDsn("")).toBeNull();
    expect(parseDsn("not-a-dsn")).toBeNull();
  });
});
