import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { fail, rows, supabaseForUser, unauthenticated } from "../supabase";

export default defineTool({
  name: "list_quotes",
  title: "List quotes",
  description: "List recent quotes with reference, customer, status, distance confirmation and price totals.",
  inputSchema: {
    status: z.string().trim().min(1).optional().describe("Filter by quote status, e.g. draft, sent, accepted."),
    reference: z.string().trim().min(1).optional().describe("Exact quote reference to look up."),
    limit: z.number().int().min(1).max(100).default(20).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, reference, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    let query = supabaseForUser(ctx)
      .from("quotes")
      .select(
        "id, reference, created_at, sent_at, status, price_stage, customer_name, customer_email, from_zip, to_zip, distance_km, distance_source, distance_confirmed_at, price_net, price_vat, price_total, language",
      )
      .order("created_at", { ascending: false })
      .limit(limit ?? 20);
    if (status) query = query.eq("status", status);
    if (reference) query = query.eq("reference", reference);
    const { data, error } = await query;
    return error ? fail(error.message) : rows(data);
  },
});
