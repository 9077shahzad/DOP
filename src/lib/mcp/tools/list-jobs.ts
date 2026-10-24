import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { fail, rows, supabaseForUser, unauthenticated } from "../supabase";

export default defineTool({
  name: "list_jobs",
  title: "List jobs",
  description: "List scheduled jobs with status, date, crew size, vehicle and amount.",
  inputSchema: {
    status: z.string().trim().min(1).optional().describe("Filter by job status."),
    from_date: z.string().trim().min(1).optional().describe("Only jobs scheduled on or after this ISO date."),
    to_date: z.string().trim().min(1).optional().describe("Only jobs scheduled on or before this ISO date."),
    limit: z.number().int().min(1).max(100).default(20).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, from_date, to_date, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    let query = supabaseForUser(ctx)
      .from("jobs")
      .select("id, reference, status, type, scheduled_date, move_out_date, crew_size, vehicle, amount, price_stage, notes")
      .order("scheduled_date", { ascending: true, nullsFirst: false })
      .limit(limit ?? 20);
    if (status) query = query.eq("status", status);
    if (from_date) query = query.gte("scheduled_date", from_date);
    if (to_date) query = query.lte("scheduled_date", to_date);
    const { data, error } = await query;
    return error ? fail(error.message) : rows(data);
  },
});
