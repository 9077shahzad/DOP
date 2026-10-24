import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { PlannerWizard } from "@/components/planner/PlannerWizard";
import { isLang, type Lang } from "@/i18n/config";
import { langOf, publicHead } from "@/lib/seo";

export const Route = createFileRoute("/$lang/planer")({
  head: ({ params }) => publicHead(langOf(params.lang), "planer", "/planer"),
  component: PlanerPage,
});

function PlanerPage() {
  const { lang } = Route.useParams();
  const active = (isLang(lang) ? lang : "de") as Lang;
  useTranslation("planer");
  return <PlannerWizard lang={active} />;
}
