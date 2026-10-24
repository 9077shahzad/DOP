/**
 * Official Swiss postcode directory.
 *
 * A postcode decides the town and the canton — the customer never picks a
 * canton that contradicts it. Nothing is guessed: an unknown postcode resolves
 * to nothing at all, and the public wizard may read the directory anonymously
 * because it is published reference data.
 */
import { describe, expect, it } from "vitest";

import { ENV_READY, admin, anonClient } from "./harness";

const d = ENV_READY ? describe : describe.skip;

async function lookup(plz: number) {
  const { data, error } = await anonClient()
    .from("swiss_postcodes")
    .select("plz, locality, canton")
    .eq("plz", plz)
    .order("locality");
  expect(error).toBeFalsy();
  return data ?? [];
}

d("swiss postcode directory", () => {
  it("resolves 8000 to Zürich in canton ZH", async () => {
    const rows = await lookup(8000);
    expect(rows.some((r) => r.locality === "Zürich" && r.canton === "ZH")).toBe(true);
  });

  it("resolves 3000 to Bern in canton BE", async () => {
    const rows = await lookup(3000);
    expect(rows.some((r) => r.locality === "Bern" && r.canton === "BE")).toBe(true);
  });

  it("resolves 3613 to Steffisburg in canton BE", async () => {
    const rows = await lookup(3613);
    expect(rows.some((r) => r.locality === "Steffisburg" && r.canton === "BE")).toBe(true);
  });

  it("returns nothing for a postcode that does not exist", async () => {
    expect(await lookup(9999)).toHaveLength(0);
  });

  it("offers every locality of a shared postcode instead of guessing one", async () => {
    const { data } = await admin()
      .from("swiss_postcodes")
      .select("plz")
      .limit(20000);
    const counts = new Map<number, number>();
    for (const r of data ?? []) counts.set(r.plz, (counts.get(r.plz) ?? 0) + 1);
    const shared = [...counts.entries()].find(([, n]) => n > 1);
    expect(shared).toBeTruthy();
    const rows = await lookup(shared![0]);
    expect(rows.length).toBeGreaterThan(1);
  });

  it("never lets a canton contradict its postcode", async () => {
    const rows = await lookup(3613);
    expect(rows.every((r) => r.canton === "BE")).toBe(true);
  });

  it("is readable anonymously but not writable", async () => {
    const { error } = await anonClient()
      .from("swiss_postcodes")
      .insert({ plz: 1000, locality: "Nirgendwo", canton: "VD", source: "test", dataset_version: "test" });
    expect(error).toBeTruthy();
  });

  it("records the dataset version of every row", async () => {
    const { data } = await anonClient()
      .from("swiss_postcodes")
      .select("dataset_version, source")
      .limit(50);
    expect((data ?? []).every((r) => !!r.dataset_version && !!r.source)).toBe(true);
  });
});

d("route lookup available to the public wizard", () => {
  it("reports external input required while no routing provider is configured", async () => {
    const { data, error } = await anonClient().rpc("public_route_distance", {
      _origin: "Bahnhofstrasse 85, 3613 Steffisburg",
      _destination: "Bundesplatz 1, 3000 Bern",
    });
    expect(error).toBeFalsy();
    const r = data as Record<string, unknown>;
    expect(r["status"]).toBe("external_input_required");
    expect(r["source"]).toBe("unconfirmed");
    // No fabricated kilometres and no fabricated driving time.
    expect(r["km"]).toBeNull();
    expect(r["duration_min"]).toBeNull();
  });
});
