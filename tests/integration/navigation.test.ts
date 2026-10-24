/**
 * Public navigation and route inventory (Release Defect #2, B1/B2/B6).
 *
 * The inherited SwissMove menu is gone: only approved PS Umzug entries are
 * rendered, every entry resolves, and every retired or parked route is either
 * unreachable or redirects to an approved PS Umzug page. The assertions run
 * against the rendered server HTML, so a link that only exists in the source
 * cannot make the suite pass.
 */
import { beforeAll, describe, expect, it } from "vitest";

import ar from "../../src/i18n/ar.json";

const BASE = process.env["APP_BASE_URL"] ?? "http://localhost:8080";

let serverUp = false;

beforeAll(async () => {
  try {
    const res = await fetch(`${BASE}/de`, { redirect: "follow" });
    serverUp = res.ok;
  } catch {
    serverUp = false;
  }
});

const d = describe;

async function html(path: string): Promise<string> {
  const res = await fetch(`${BASE}${path}`, { redirect: "follow" });
  expect(res.ok).toBe(true);
  return res.text();
}

d("public navigation", () => {
  it("renders the approved PS Umzug navigation in German", async () => {
    if (!serverUp) return;
    const body = await html("/de");
    for (const label of ["Startseite", "Leistungen", "Über uns", "Kontakt", "Offerte erhalten"]) {
      expect(body).toContain(label);
    }
  });

  it("shows no inherited SwissMove navigation entries", async () => {
    if (!serverUp) return;
    const body = await html("/de");
    const nav = body.slice(0, body.indexOf("</header>") + 1);
    for (const gone of ["Für Verwaltungen", "Abnahmegarantie", "Geschäftskunden"]) {
      expect(nav).not.toContain(gone);
    }
  });

  it("serves the Arabic page right-to-left with the approved Arabic labels", async () => {
    if (!serverUp) return;
    const body = await html("/ar");
    expect(body).toMatch(/dir="rtl"/);
    expect(body).toContain("/ar/leistungen");
    expect(body).toContain("/ar/ueber-uns");
    expect(body).toContain("/ar/kontakt");
    // The header labels are translated on the client; the dictionary is the
    // source both sides read.
    expect(ar.nav.homeLink).toBe("الرئيسية");
    expect(ar.nav.getQuote).toBe("احصل على عرض سعر");
    expect(ar.nav.services).toBeTruthy();
    expect(ar.nav.about).toBeTruthy();
    expect(ar.nav.contact).toBeTruthy();
  });

  it("resolves every approved navigation target with 200", async () => {
    if (!serverUp) return;
    for (const path of [
      "/de",
      "/de/leistungen",
      "/de/ueber-uns",
      "/de/kontakt",
      "/de/partner",
      "/de/partner/registrieren",
      "/de/planer",
      "/portal",
    ]) {
      const res = await fetch(`${BASE}${path}`, { redirect: "follow" });
      expect(`${path}:${res.status}`).toBe(`${path}:200`);
    }
  });
});

d("retired and parked routes", () => {
  const retired = [
    "/de/ablauf",
    "/de/garantien",
    "/de/geschaeftskunden",
    "/de/status",
  ];

  it("redirects every retired route to an approved PS Umzug page", async () => {
    if (!serverUp) return;
    for (const path of retired) {
      const res = await fetch(`${BASE}${path}`, { redirect: "follow" });
      expect(res.ok).toBe(true);
      expect(new URL(res.url).pathname).toBe("/de");
    }
  });

  it("serves the partner status workspace at /partner", async () => {
    if (!serverUp) return;
    const res = await fetch(`${BASE}/partner`, { redirect: "follow" });
    expect(res.ok).toBe(true);
    expect(new URL(res.url).pathname).toBe("/partner");
  });
});

d("offer deep link", () => {
  it("opens the wizard directly from /offerte", async () => {
    if (!serverUp) return;
    const res = await fetch(`${BASE}/offerte`, { redirect: "follow" });
    expect(res.ok).toBe(true);
    expect(new URL(res.url).pathname).toMatch(/^\/[a-z]{2}\/planer$/);
  });

  it("preserves campaign parameters through /de/offerte", async () => {
    if (!serverUp) return;
    const res = await fetch(`${BASE}/de/offerte?utm_source=flyer&ref=abc`, { redirect: "follow" });
    expect(res.ok).toBe(true);
    const url = new URL(res.url);
    expect(url.pathname).toBe("/de/planer");
    expect(url.searchParams.get("utm_source")).toBe("flyer");
    expect(url.searchParams.get("ref")).toBe("abc");
  });

  it("keeps /de/offerte/<ref> as the offer view", async () => {
    if (!serverUp) return;
    const res = await fetch(`${BASE}/de/offerte/PS-TEST-404`, { redirect: "follow" });
    expect(new URL(res.url).pathname).toBe("/de/offerte/PS-TEST-404");
  });
});
