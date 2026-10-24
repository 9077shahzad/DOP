import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";

import { usePortalLanguage } from "@/components/portal/usePortalLanguage";
import { supabase } from "@/integrations/supabase/client";
import { loadPortalData, type PortalData } from "@/lib/portal";

type PortalContextValue = {
  user: User;
  data: PortalData;
  reload: () => Promise<void>;
  loading: boolean;
};

const PortalCtx = createContext<PortalContextValue | null>(null);

export function usePortal(): PortalContextValue {
  const value = useContext(PortalCtx);
  // During SSR/prerender or before the auth session resolves the provider is
  // not mounted yet — render the loading state instead of crashing the page.
  return value ?? FALLBACK;
}

const FALLBACK: PortalContextValue = {
  user: null as unknown as User,
  get data() {
    return EMPTY;
  },
  reload: async () => {},
  loading: true,
};

const EMPTY: PortalData = {
  profile: null,
  organization: null,
  properties: [],
  units: [],
  jobs: [],
  events: [],
  rates: [],
  bands: [],
  overrides: [],
  pricingVersion: null,
  pricingEffectiveFrom: null,
  pricingCurrency: null,
};

export function PortalProvider({ user, children }: { user: User; children: ReactNode }) {
  const [data, setData] = useState<PortalData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const { applyStored } = usePortalLanguage(user.id);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const next = await loadPortalData(user.id);
      setData(next);
      // Stored preference wins over the browser default, once per signed-in user.
      applyStored(next.profile, next.organization);
    } finally {
      setLoading(false);
    }
  }, [user.id, applyStored]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const value = useMemo(() => ({ user, data, reload, loading }), [user, data, reload, loading]);

  return <PortalCtx.Provider value={value}>{children}</PortalCtx.Provider>;
}

export async function signOut() {
  await supabase.auth.signOut();
}
