/**
 * /admin/postfach — the email workspace.
 *
 * Three panes: folders and filters, the thread list, the conversation. Email
 * is communication attached to a record; the lead stays the source of truth,
 * which is why every thread shows its links, why "Nicht zugeordnet" is a
 * first-class folder, and why a message can be converted into a real record
 * instead of being answered in isolation.
 */
import { createFileRoute } from "@tanstack/react-router";

import { InboxWorkspace } from "@/components/admin/InboxWorkspace";
import i18n from "@/i18n/config";
import { langOf, privateHead } from "@/lib/seo";

export const Route = createFileRoute("/admin/postfach")({
  head: () => privateHead(langOf(i18n.language), "adminInbox"),
  component: InboxPage,
});

function InboxPage() {
  return (
    <InboxWorkspace />
  );
}
