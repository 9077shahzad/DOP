import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { User } from "@supabase/supabase-js";

import { PartnerAuth } from "@/components/partner/PartnerAuth";
import { Wizard } from "@/components/partner/Wizard";
import { supabase } from "@/integrations/supabase/client";
import { langOf, publicHead } from "@/lib/seo";

export const Route = createFileRoute("/$lang/partner/registrieren")({
  ssr: false,
  head: ({ params }) => publicHead(langOf(params.lang), "partnerApply", "/partner/registrieren"),
  component: PartnerRegister,
});

function PartnerRegister() {
  const { lang } = Route.useParams();
  const active = langOf(lang);
  const { t } = useTranslation("partner");
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    let alive = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      setUser(data.session?.user ?? null);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  if (!ready) {
    return <p className="label-mono mx-auto max-w-3xl px-4 py-16 text-soft md:px-8">{t("apply.loading")}</p>;
  }
  if (!user) return <PartnerAuth />;
  return <Wizard user={user} lang={active} />;
}
