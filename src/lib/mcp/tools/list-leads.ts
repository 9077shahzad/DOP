import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { fail, rows, supabaseForUser, unauthenticated } from "../supabase";

export default defineTool({
  name: "list_leads",
  title: "List leads",
  description: "List the most recent enquiries (leads), optionally filtered by status or search text.",
  inputSchema: {
    status: z.string().trim().min(1).optional().describe("Filter by lead status, e.g. new, qualified, won, lost."),
    search: z.string().trim().min(1).optional().describe("Match customer name, email or city."),
    limit: z.number().int().min(1).max(100).default(20).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, search, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    let query = supabaseForUser(ctx)
      .from("leads")
      .select(
        "id, created_at, status, customer_name, customer_email, customer_phone, city, postcode, canton, language, estimated_value, preferred_date",
      )
      .order("created_at", { ascending: false })
      .limit(limit ?? 20);
    if (status) query = query.eq("status", status);
    if (search) {
      query = query.or(
        `customer_name.ilike.%${search}%,customer_email.ilike.%${search}%,city.ilike.%${search}%`,
      );
    }
    const { data, error } = await query;
    return error ? fail(error.message) : rows(data);
  },
});
