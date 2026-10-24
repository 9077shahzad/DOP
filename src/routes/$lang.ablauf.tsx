/**
 * Retired route — inherited SwissMove "Ablauf" page.
 *
 * The page is not part of the approved PS Umzug navigation. The URL keeps
 * working as a permanent redirect so no inherited entry point 404s for an
 * existing link.
 */
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/$lang/ablauf")({
  beforeLoad: ({ params }) => {
    void params;
    throw redirect({
      to: "/$lang",
      params: { lang: params.lang },
      replace: true,
    });
  },
});
