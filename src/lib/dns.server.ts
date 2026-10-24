/**
 * Real DNS lookups over DNS-over-HTTPS.
 *
 * The settings page reports what is actually published, never a stored
 * boolean. Until the domain exists every check resolves to `missing`, and
 * that is the correct, honest output.
 */

import type { DnsCheck } from "@/lib/email/dns-types";

export type { DnsCheck };

const DOH = "https://cloudflare-dns.com/dns-query";

async function query(name: string, type: "MX" | "TXT"): Promise<{ records: string[]; error: string }> {
  try {
    const response = await fetch(`${DOH}?name=${encodeURIComponent(name)}&type=${type}`, {
      headers: { accept: "application/dns-json" },
    });
    if (!response.ok) return { records: [], error: `DNS ${response.status}` };
    const body = (await response.json()) as { Answer?: { data?: string; type?: number }[] };
    const records = (body.Answer ?? [])
      .map((answer) => (answer.data ?? "").trim())
      .map((value) => (value.startsWith('"') ? value.replace(/"\s*"/g, "").replace(/^"|"$/g, "") : value))
      .filter(Boolean);
    return { records, error: "" };
  } catch (error) {
    return { records: [], error: error instanceof Error ? error.message : String(error) };
  }
}

function check(
  label: string,
  hostname: string,
  type: "MX" | "TXT",
  result: { records: string[]; error: string },
  matches: (record: string) => boolean,
  missingDetail: string,
): DnsCheck {
  if (result.error) {
    return { label, hostname, type, status: "error", records: [], detail: result.error };
  }
  const hits = result.records.filter(matches);
  return hits.length > 0
    ? { label, hostname, type, status: "ok", records: hits, detail: "" }
    : { label, hostname, type, status: "missing", records: result.records, detail: missingDetail };
}

/** MX, SPF, DKIM and DMARC for one sending domain. */
export async function checkEmailDns(domain: string, dkimSelector: string): Promise<DnsCheck[]> {
  const clean = domain.trim().toLowerCase();
  if (!clean) {
    return [
      { label: "MX", hostname: "—", type: "MX", status: "missing", records: [], detail: "keine Domain konfiguriert" },
      { label: "SPF", hostname: "—", type: "TXT", status: "missing", records: [], detail: "keine Domain konfiguriert" },
      { label: "DKIM", hostname: "—", type: "TXT", status: "missing", records: [], detail: "keine Domain konfiguriert" },
      { label: "DMARC", hostname: "—", type: "TXT", status: "missing", records: [], detail: "keine Domain konfiguriert" },
    ];
  }

  const selector = dkimSelector.trim();
  const dkimHost = selector ? `${selector}._domainkey.${clean}` : `_domainkey.${clean}`;

  const [mx, spf, dkim, dmarc] = await Promise.all([
    query(clean, "MX"),
    query(clean, "TXT"),
    query(dkimHost, "TXT"),
    query(`_dmarc.${clean}`, "TXT"),
  ]);

  return [
    check("MX", clean, "MX", mx, () => true, "kein MX-Eintrag – eingehende E-Mail ist nicht möglich"),
    check("SPF", clean, "TXT", spf, (r) => r.toLowerCase().startsWith("v=spf1"), "kein SPF-Eintrag veröffentlicht"),
    check(
      "DKIM",
      dkimHost,
      "TXT",
      dkim,
      (r) => r.toLowerCase().includes("v=dkim1") || r.toLowerCase().includes("p="),
      selector ? "kein DKIM-Eintrag für diesen Selector" : "kein DKIM-Selector konfiguriert",
    ),
    check(
      "DMARC",
      `_dmarc.${clean}`,
      "TXT",
      dmarc,
      (r) => r.toLowerCase().startsWith("v=dmarc1"),
      "kein DMARC-Eintrag veröffentlicht",
    ),
  ];
}
