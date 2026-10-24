import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listLeadsTool from "./tools/list-leads";
import listQuotesTool from "./tools/list-quotes";
import listJobsTool from "./tools/list-jobs";
import listInvoicesTool from "./tools/list-invoices";
import whoamiTool from "./tools/whoami";

const projectRef = import.meta.env['VITE_SUPABASE_PROJECT_ID'] ?? "project-ref-unset";

export default defineMcp({
  name: "ps-umzug-ag-digital-operating-platform",
  title: "PS Umzug AG – Digital Operating Platform",
  version: "0.1.0",
  instructions:
    "Read-only tools for the PS Umzug AG operating platform. Use `whoami` to check the signed-in user and roles, `list_leads` for enquiries, `list_quotes` for quotes, `list_jobs` for scheduled work and `list_invoices` for billing. All data access respects the signed-in user's permissions.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [whoamiTool, listLeadsTool, listQuotesTool, listJobsTool, listInvoicesTool],
});
