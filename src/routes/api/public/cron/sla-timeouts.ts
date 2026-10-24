/**
 * External cron fallback for the SLA timeout sweep.
 *
 * Used when the in-database scheduler (pg_cron) is unavailable: any external
 * scheduler can POST here every few minutes with the shared bearer secret.
 */
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/cron/sla-timeouts")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["SLA_CRON_SECRET"];
        const header = request.headers.get("authorization") ?? "";
        if (!secret || header !== `Bearer ${secret}`) {
          return new Response("Unauthorized", { status: 401 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.rpc("run_sla_timeouts_job", { _trigger: "external" });
        if (error) {
          const { captureError } = await import("@/lib/monitoring/sentry");
          captureError(new Error(error.message), {
            source: "job",
            tags: { job_name: "mf-sla-timeouts", trigger: "external" },
          });
          return new Response(JSON.stringify({ ok: false, error: error.message }), {
            status: 500,
            headers: { "content-type": "application/json" },
          });
        }

        // Inquiry SLAs ride the same sweep: each open breach logs one intended notice.
        const inquiry = await supabaseAdmin.rpc("process_inquiry_sla");
        return new Response(
          JSON.stringify({ ok: true, result: data, inquiry_notices: inquiry.data ?? 0 }),
          { headers: { "content-type": "application/json" } },
        );
      },
    },
  },
});
