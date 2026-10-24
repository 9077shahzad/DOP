import { createFileRoute, redirect } from "@tanstack/react-router";

/** Disposition now lives inside Aufträge (assignment and calendar tab). */
export const Route = createFileRoute("/admin/disposition")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/auftraege", search: { tab: "zuteilung" } as never, replace: true });
  },
});
