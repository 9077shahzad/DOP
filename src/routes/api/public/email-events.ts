import { createFileRoute } from "@tanstack/react-router";

/**
 * Resend webhook receiver. The caller must present the shared secret stored in
 * Company Settings; unsigned or mismatching calls are rejected before the body
 * is used. Records delivery outcomes (delivered, bounced, deferred, complaint)
 * against the original send in the notification log.
 */
export const Route = createFileRoute("/api/public/email-events")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const raw = await request.text();
        const { loadSettings, recordDeliveryEvent } = await import("@/lib/notifications.server");
        const settings = await loadSettings();
        const expected = settings.webhook_secret.trim();
        if (!expected) return new Response("Webhook secret not configured", { status: 503 });

        const provided = (request.headers.get("x-webhook-secret") ?? "").trim();
        if (provided.length !== expected.length || provided !== expected) {
          return new Response("Invalid signature", { status: 401 });
        }

        let payload: { type?: string; data?: Record<string, unknown> };
        try {
          payload = JSON.parse(raw) as { type?: string; data?: Record<string, unknown> };
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        const detail = payload.data ?? {};
        const to = detail["to"];
        await recordDeliveryEvent({
          type: typeof payload.type === "string" ? payload.type : "unknown",
          messageId: typeof detail["email_id"] === "string" ? (detail["email_id"] as string) : "",
          recipient: Array.isArray(to) ? String(to[0] ?? "") : typeof to === "string" ? to : "",
          detail,
        });

        return new Response("ok");
      },
    },
  },
});
