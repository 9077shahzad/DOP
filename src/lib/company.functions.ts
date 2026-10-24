import { createServerFn } from "@tanstack/react-start";

import type { Company } from "@/lib/company";

/**
 * Public company contact block for the active market. Read by the site shell
 * so no component hard-codes a phone number, address or e-mail.
 */
export const fetchCompany = createServerFn({ method: "GET" }).handler(
  async (): Promise<Company | null> => {
    const { publicClient } = await import("@/lib/company.server");
    const { data, error } = await publicClient().rpc("company_contact", { _country: "CH" });
    if (error) {
      console.error("company_contact failed", error.message);
      return null;
    }
    const row = Array.isArray(data) ? data[0] : data;
    return (row as Company | undefined) ?? null;
  },
);

export type MarketFlag = { country: string; active: boolean; currency: string };

/** Market activation flags — the coverage section renders from these, never from a list in code. */
export const fetchMarkets = createServerFn({ method: "GET" }).handler(
  async (): Promise<MarketFlag[]> => {
    const { publicClient } = await import("@/lib/company.server");
    const { data, error } = await publicClient().rpc("public_markets");
    if (error) {
      console.error("public_markets failed", error.message);
      return [];
    }
    return (data ?? []) as MarketFlag[];
  },
);
