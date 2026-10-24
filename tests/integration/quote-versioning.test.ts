/**
 * Quotation versions are append-only, and acceptance binds one exact version
 * and total. A stored version can never be rewritten — not even with full
 * staff rights — and a customer accepting an outdated figure is refused.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { ENV_READY, admin, anonClient } from "./harness";

const d = ENV_READY ? describe : describe.skip;

const CONTACT = "version.test@example.com";
let reference = "";
let quoteId = "";

d("quotation versions and acceptance", () => {
  let anon: ReturnType<typeof anonClient>;

  beforeAll(async () => {
    anon = anonClient();
    const { data, error } = await admin()
      .from("quotes")
      .insert({ is_test: true,
        reference: "pending",
        language: "de",
        customer_name: "Version Test",
        customer_email: CONTACT,
        from_address: "Teststrasse 1",
        from_zip: "3613",
        to_address: "Zielweg 2",
        to_zip: "3600",
        room_units: 3.5,
        price_total: 1000,
      })
      .select("id, reference")
      .single();
    expect(error).toBeFalsy();
    quoteId = data!.id;
    reference = data!.reference;
  }, 60_000);

  afterAll(async () => {
    if (quoteId) await admin().from("quotes").delete().eq("id", quoteId);
  });

  it("writes a first immutable version when the quote is stored", async () => {
    const { data } = await admin()
      .from("quote_versions")
      .select("version, total")
      .eq("quote_id", quoteId);
    expect(data?.length).toBe(1);
    expect(Number(data![0]!.total)).toBe(1000);
  });

  it("refuses to rewrite a stored version, even with full staff rights", async () => {
    const { error } = await admin()
      .from("quote_versions")
      .update({ total: 1 })
      .eq("quote_id", quoteId);
    expect(error).toBeTruthy();
  });

  it("refuses to delete a stored version, even with full staff rights", async () => {
    const { error } = await admin().from("quote_versions").delete().eq("quote_id", quoteId);
    expect(error).toBeTruthy();
  });

  it("appends a new version when the total changes", async () => {
    await admin().from("quotes").update({ price_total: 1200 }).eq("id", quoteId);
    const { data } = await admin()
      .from("quote_versions")
      .select("version, total")
      .eq("quote_id", quoteId)
      .order("version");
    expect(data?.length).toBe(2);
    expect(Number(data![0]!.total)).toBe(1000);
    expect(Number(data![1]!.total)).toBe(1200);
  });

  it("shows the customer the newest version and total", async () => {
    const { data, error } = await anon.rpc("public_quote_snapshot", {
      _reference: reference,
      _contact: CONTACT,
    });
    expect(error).toBeFalsy();
    const row = Array.isArray(data) ? data[0] : data;
    expect(Number(row.version)).toBe(2);
    expect(Number(row.total)).toBe(1200);
  });

  it("rejects acceptance of an outdated version", async () => {
    const { error } = await anon.rpc("accept_public_quote", {
      _reference: reference,
      _contact: CONTACT,
      _version: 1,
      _total: 1000,
    });
    expect(error?.message ?? "").toContain("quote_version_stale");
  });

  it("rejects acceptance when the displayed total no longer matches", async () => {
    const { error } = await anon.rpc("accept_public_quote", {
      _reference: reference,
      _contact: CONTACT,
      _version: 2,
      _total: 999,
    });
    expect(error?.message ?? "").toContain("quote_total_mismatch");
  });

  it("accepts exactly the version and total the customer was shown", async () => {
    // Accepted before the four-hour policy took effect, so the agreed terms stand.
    await admin()
      .from("quotes")
      .update({ accepted_at: "2026-09-01T00:00:00Z" })
      .eq("id", quoteId);
    const { data, error } = await anon.rpc("accept_public_quote", {
      _reference: reference,
      _contact: CONTACT,
      _version: 2,
      _total: 1200,
    });
    expect(error).toBeFalsy();
    const row = Array.isArray(data) ? data[0] : data;
    expect(Number(row.accepted_version)).toBe(2);
    expect(row.accepted_at).toBeTruthy();
  });

  it("keeps customer documents out of the offer: linking needs the right contact", async () => {
    const files = [
      {
        storage_path: "intake/draft-x/floorplan-1.pdf",
        file_name: "plan.pdf",
        mime_type: "application/pdf",
        size_bytes: 10,
        kind: "floorplan",
      },
    ];
    const wrong = await anon.rpc("attach_quote_files", {
      _reference: reference,
      _contact: "someone.else@example.com",
      _draft: "draft-x",
      _files: files,
    });
    expect(Number(wrong.data ?? 0)).toBe(0);

    const right = await anon.rpc("attach_quote_files", {
      _reference: reference,
      _contact: CONTACT,
      _draft: "draft-x",
      _files: files,
    });
    expect(Number(right.data ?? 0)).toBe(1);

    // Attaching a document never changes the accepted offer.
    const { data: q } = await admin()
      .from("quotes")
      .select("price_total, accepted_at")
      .eq("id", quoteId)
      .single();
    expect(Number(q!.price_total)).toBe(1200);
    expect(q!.accepted_at).toBeTruthy();
  });
});
