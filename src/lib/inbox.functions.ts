import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { ReplyInput, ReplyResult } from "@/lib/inbox.server";

/**
 * Queues an outbound reply. Staff only; the result reports the real delivery
 * state, never an optimistic "sent".
 */
export const sendInboxReply = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: ReplyInput) => data)
  .handler(async ({ data, context }): Promise<ReplyResult> => {
    const { data: staff } = await context.supabase.rpc("is_staff");
    if (!staff) throw new Error("Forbidden");
    const { composeReply } = await import("@/lib/inbox.server");
    return composeReply(context.supabase, data);
  });
