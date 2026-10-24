import { LOCALES, resources, type Lang } from "@/i18n/config";
import { addressLine, cantonName, phoneE164, type Company } from "@/lib/company";
import { siteUrl } from "@/lib/site";

/**
 * One MovingCompany entity for the whole site (same @id in every language),
 * plus its services and the FAQ of the home page in the active language.
 * Address, phone and e-mail come from the company record — never from a
 * literal in this file. Fields the record does not carry are omitted rather
 * than filled with a placeholder.
 */
export function buildHomeJsonLd(lang: Lang, company: Company | null) {
  const dict = resources[lang].home as unknown as {
    services: { title: string } & Record<string, { title: string; desc: string } | string>;
    faq: Record<string, string>;
  };

  const businessId = `${siteUrl()}/#organisation`;

  const business = {
    "@type": ["MovingCompany", "LocalBusiness"],
    "@id": businessId,
    name: company?.legal_name || "PS Umzug AG",
    description: dict.services.title,
    url: `${siteUrl()}/${lang}`,
    inLanguage: LOCALES[lang],
    ...(company?.email ? { email: company.email } : {}),
    ...(company?.phone ? { telephone: phoneE164(company.phone) } : {}),
    ...(company
      ? {
          address: {
            "@type": "PostalAddress",
            streetAddress: company.address_line,
            postalCode: company.postal_code,
            addressLocality: company.city,
            addressRegion: cantonName(company),
            addressCountry: company.country,
          },
        }
      : {}),
    ...(company?.legal_name ? { legalName: company.legal_name } : {}),
    areaServed: { "@type": "Country", name: "Schweiz" },
    makesOffer: (["moving", "cleaning", "disposal"] as const).map((key) => {
      const svc = dict.services[key] as { title: string; desc: string };
      return {
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: svc.title,
          description: svc.desc,
          provider: { "@id": businessId },
        },
      };
    }),
  };

  const faq = {
    "@type": "FAQPage",
    inLanguage: LOCALES[lang],
    mainEntity: [1, 2, 3, 4, 5].map((n) => ({
      "@type": "Question",
      name: dict.faq[`q${n}`] ?? "",
      acceptedAnswer: { "@type": "Answer", text: dict.faq[`a${n}`] ?? "" },
    })),
  };

  return JSON.stringify({ "@context": "https://schema.org", "@graph": [business, faq] });
}
