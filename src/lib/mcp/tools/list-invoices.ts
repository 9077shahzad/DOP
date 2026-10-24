import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { fail, rows, supabaseForUser, unauthenticated } from "../supabase";

export default defineTool({
  name: "list_invoices",
  title: "List invoices",
  description: "List invoices with reference, customer, status, due date and amounts in CHF.",
  inputSchema: {
    status: z.string().trim().min(1).optional().describe("Filter by invoice status, e.g. draft, issued, paid, overdue."),
    reference: z.string().trim().min(1).optional().describe("Exact invoice reference to look up."),
    limit: z.number().int().min(1).max(100).default(20).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, reference, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    let query = supabaseForUser(ctx)
      .from("invoices")
      .select(
        "id, reference, status, customer_name, customer_email, issued_at, due_on, paid_at, currency, net, vat, total, amount_paid, payment_method",
      )
      .order("created_at", { ascending: false })
      .limit(limit ?? 20);
    if (status) query = query.eq("status", status);
    if (reference) query = query.eq("reference", reference);
    const { data, error } = await query;
    return error ? fail(error.message) : rows(data);
  },
});
