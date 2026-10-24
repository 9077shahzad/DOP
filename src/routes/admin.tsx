import { Outlet, createFileRoute } from "@tanstack/react-router";

import { AdminShell } from "@/components/admin/AdminShell";
import { privateHead } from "@/lib/seo";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => privateHead("de", "admin"),
  component: AdminLayout,
});

function AdminLayout() {
  return (
    <AdminShell>
      <Outlet />
    </AdminShell>
  );
}
