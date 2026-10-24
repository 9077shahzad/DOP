import { createFileRoute, redirect } from "@tanstack/react-router";

/** Consolidated into the single DOP workflow (Neue Anfragen → Offerten → Aufträge). */
export const Route = createFileRoute("/admin/buchungen")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/auftraege", search: {} as never, replace: true });
  },
});
