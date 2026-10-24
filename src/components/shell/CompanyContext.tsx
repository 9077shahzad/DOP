import { createContext, useContext, type ReactNode } from "react";

import type { Company } from "@/lib/company";
import type { MarketFlag } from "@/lib/company.functions";

type Value = { company: Company | null; markets: MarketFlag[] };

const CompanyContext = createContext<Value>({ company: null, markets: [] });

export function CompanyProvider({ value, children }: { value: Value; children: ReactNode }) {
  return <CompanyContext.Provider value={value}>{children}</CompanyContext.Provider>;
}

/**
 * Company contact details loaded once by the language layout. Returns null
 * while the record is unavailable — callers must render without contact links
 * rather than fall back to invented data.
 */
export function useCompany(): Company | null {
  return useContext(CompanyContext).company;
}

export function useMarkets(): MarketFlag[] {
  return useContext(CompanyContext).markets;
}
