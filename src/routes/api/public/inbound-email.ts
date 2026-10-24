import { createFileRoute } from "@tanstack/react-router";

/**
 * Provider-agnostic inbound email receiver.
 *
 * No provider is connected today (the working address is a Gmail account, so
 * MX-based inbound routing is not possible as things stand). This endpoint is
 * built so that connecting one is a configuration step, not a rewrite:
 *
 *  - It accepts a NORMALISED payload (the `native` adapter) and the
 *    provider webhook shapes registered in `src/lib/email/adapters.ts`
 *    (Postmark, Mailgun) behind the `EmailAdapter` interface.
 *  - It authenticates with the shared secret from Company Settings
 *    (`x-webhook-secret`), the same secret the delivery webhook uses.
 *  - It writes through `email_ingest()`, so threading, high-confidence
 *    matching, folder placement and the lead timeline behave exactly as they
 *    do for an imported `.eml`.
 *
 * To connect a real provider:
 *  - Postmark: create an inbound stream, set the inbound webhook to
 *    `<site>/api/public/inbound-email?adapter=postmark`, add the shared secret
 *    as a custom header, and point the domain's MX at Postmark.
 *  - Mailgun: create a receiving route with a "store and notify" action to
 *    `?adapter=mailgun`, and point MX at Mailgun.
 *  - Gmail API poll (keeps the current Gmail address): a scheduled job would
 *    exchange an OAuth refresh token for an access token, call
 *    `users.messages.list` with a history cursor, and POST each message here
 *    with `?adapter=native` and `source=gmail_poll`. That requires a Google
 *    Cloud project, OAuth consent and a stored refresh token — none of which
 *    exist yet.
 */
export const Route = createFileRoute("/api/public/inbound-email")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const raw = await request.text();

        const { loadSettings } = await import("@/lib/notifications.server");
        const settings = await loadSettings();
        const expected = settings.webhook_secret.trim();
        if (!expected) return new Response("Webhook secret not configured", { status: 503 });

        const provided = (request.headers.get("x-webhook-secret") ?? "").trim();
        if (provided.length !== expected.length || provided !== expected) {
          return new Response("Invalid signature", { status: 401 });
        }

        let payload: Record<string, unknown>;
        try {
          payload = JSON.parse(raw) as Record<string, unknown>;
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        const url = new URL(request.url);
        const adapterId = url.searchParams.get("adapter") ?? "native";
        const { resolveAdapter, nativeInbound } = await import("@/lib/email/adapters");

        const normalized =
          adapterId === "native" ? nativeInbound(payload) : resolveAdapter(adapterId).parseInbound(payload);
        if (!normalized.from_address) return new Response("from_address is required", { status: 400 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.rpc("email_ingest", {
          payload: {
            ...normalized,
            direction: "inbound",
            source: url.searchParams.get("source") === "gmail_poll" ? "gmail_poll" : "webhook",
          } as never,
        });

        if (error) {
          console.error(`[inbound-email] ingest failed: ${error.message}`);
          return new Response(`Ingest failed: ${error.message}`, { status: 500 });
        }

        return new Response(JSON.stringify(data), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
