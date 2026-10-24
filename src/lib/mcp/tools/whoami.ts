import { defineTool } from "@lovable.dev/mcp-js";
import { fail, supabaseForUser, unauthenticated } from "../supabase";

export default defineTool({
  name: "whoami",
  title: "Who am I",
  description: "Return the signed-in user's id, email and portal roles in PS Umzug.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_args, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const { data, error } = await supabaseForUser(ctx)
      .from("user_roles")
      .select("role")
      .eq("user_id", ctx.getUserId() ?? "");
    if (error) return fail(error.message);
    const roles = (data ?? []).map((row: { role: string }) => row.role);
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({ user_id: ctx.getUserId(), email: ctx.getUserEmail(), roles }),
        },
      ],
    };
  },
});
