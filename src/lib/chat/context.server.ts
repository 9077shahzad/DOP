/**
 * The context block handed to the assistant.
 *
 * Everything the assistant is allowed to say about the company comes from
 * here: the real contact record, the published service catalogue, the real
 * coverage list and the guarantee wording as it appears on the site. Nothing
 * is written for the model to embellish.
 */
import de from "@/i18n/de.json";
import en from "@/i18n/en.json";
import fr from "@/i18n/fr.json";
import it from "@/i18n/it.json";
import type { Lang } from "@/i18n/config";
import type { Company } from "@/lib/company";
import { phoneDisplay } from "@/lib/company";
import { REGIONS } from "@/lib/regions";
import { SERVICE_IDS } from "@/lib/services";

const BUNDLES: Record<Lang, Record<string, unknown>> = { de, fr, it, en } as never;

function text(lang: Lang, path: string): string {
  const parts = path.split(".");
  let node: unknown = BUNDLES[lang];
  for (const part of parts) {
    if (typeof node !== "object" || node === null) return "";
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === "string" ? node : "";
}

export async function buildChatContext(lang: Lang): Promise<string> {
  const { publicClient } = await import("@/lib/company.server");
  let company: Company | null = null;
  try {
    const { data } = await publicClient().rpc("company_contact", { _country: "CH" });
    const row = Array.isArray(data) ? data[0] : data;
    company = (row as Company | undefined) ?? null;
  } catch (error) {
    console.error("chat context: company_contact failed", error);
  }

  const services = SERVICE_IDS.map(
    (id) => `- ${text(lang, `svc.${id}.short`)}: ${text(lang, `svc.${id}.lead`)} (/${lang}/leistungen/${id})`,
  ).join("\n");

  const core = REGIONS.filter((r) => r.coverage === "core").map((r) => r.name).join(", ");
  const extended = REGIONS.filter((r) => r.coverage === "extended").map((r) => r.name).join(", ");

  const guarantee = [
    text(lang, "home.guarantee.title"),
    text(lang, "home.guarantee.body"),
    `${text(lang, "home.guarantee.l2")}: ${text(lang, "home.guarantee.v2")}`,
    `${text(lang, "home.guarantee.l4")}: ${text(lang, "home.guarantee.v4")}`,
    `${text(lang, "home.guarantee.l5")}: ${text(lang, "home.guarantee.v5")}`,
  ]
    .filter(Boolean)
    .join(" ");

  const contact = company
    ? [
        `Legal name: ${company.legal_name}`,
        `Address: ${company.address_line}, ${company.postal_code} ${company.city}`,
        `Phone: ${phoneDisplay(company)}`,
        `E-mail: ${company.email}`,
      ].join("\n")
    : "Contact details are not available in this conversation — offer the contact form.";

  return `COMPANY
${contact}
Markets: Switzerland only. Other countries are not served.

SERVICES
${services}

COVERAGE
Core area (fastest response): ${core}
Extended area: ${extended}
Anywhere else in Switzerland: possible, the team confirms case by case.

HANDOVER GUARANTEE
${guarantee}

LINKS you may offer (always with the /${lang}/ prefix)
- Move planner, the only place a price estimate is produced: /${lang}/planer
- Contact and callback: /${lang}/kontakt
- Business / property managers: /${lang}/geschaeftskunden
- Partner network: /${lang}/partner
- Track an existing enquiry: /${lang}/status
- Legal pages: /${lang}/legal

PROCESS
Enquiry -> qualification -> quote or on-site survey -> confirmed appointment -> job -> sign-off. Every enquiry is recorded with a reference and answered by the team; the assistant never confirms an appointment itself.`;
}
