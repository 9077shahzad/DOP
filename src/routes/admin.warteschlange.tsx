import { createFileRoute, redirect } from "@tanstack/react-router";

/** Consolidated into the single DOP workflow (Neue Anfragen → Offerten → Aufträge). */
export const Route = createFileRoute("/admin/warteschlange")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/anfragen", replace: true });
  },
});
