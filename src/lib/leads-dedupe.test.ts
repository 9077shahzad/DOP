/**
 * Double-submit protection at the entry point.
 *
 * A double click, a re-mounted form or an impatient tap must not create two
 * inquiries. The guard sits in src/lib/leads.ts, so it is tested there with a
 * stubbed client rather than against the database.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc: (...args: unknown[]) => rpc(...args) },
}));

vi.mock("@/lib/attribution", () => ({ readAttribution: () => ({ utm_source: "test" }) }));

vi.mock("@/components/brand/IntakeGuard", () => ({
  isRateLimited: () => false,
  recordSubmission: () => undefined,
}));

const payload = {
  name: "Testkunde",
  phone: "+41790000000",
  email: "test@ps-umzug-test.invalid",
  timeSlot: "morning",
  topic: "umzug",
  message: "Bitte zurückrufen",
  language: "de" as const,
};

describe("intake double-submit guard", () => {
  beforeEach(() => {
    rpc.mockReset();
    let n = 0;
    rpc.mockImplementation(async () => {
      n += 1;
      await new Promise((resolve) => setTimeout(resolve, 20));
      return { data: `lead-${n}`, error: null };
    });
  });

  it("sends one request for two simultaneous submissions", async () => {
    const { createCallbackLead } = await import("@/lib/leads");
    const [a, b] = await Promise.all([createCallbackLead(payload), createCallbackLead(payload)]);
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(a).toBe(b);
  });

  it("carries the UTM attribution into every submission", async () => {
    const { createCallbackLead } = await import("@/lib/leads");
    await createCallbackLead({ ...payload, message: "attribution" });
    const args = rpc.mock.calls[0]![1] as { payload: Record<string, unknown> };
    expect(args.payload["utm_source"]).toBe("test");
    expect(args.payload["source_key"]).toBe("website_form");
  });

  it("surfaces a rate limit as a typed error rather than a silent failure", async () => {
    rpc.mockResolvedValue({ data: null, error: { code: "MF429", message: "too many requests" } });
    const { createB2BLead, RateLimitedError } = await import("@/lib/leads");
    await expect(
      createB2BLead({
        company: "UAT AG",
        contactName: "Test",
        phone: "+41790000009",
        email: "b2b@ps-umzug-test.invalid",
        accountType: "property_manager",
        canton: "ZH",
        city: "Zürich",
        postcode: "8000",
        address: "Teststrasse 1",
        unitsPerYear: "20",
        services: ["clean"],
        preferredContact: "email",
        message: "rate limit",
        language: "de",
      }),
    ).rejects.toBeInstanceOf(RateLimitedError);
  });
});
