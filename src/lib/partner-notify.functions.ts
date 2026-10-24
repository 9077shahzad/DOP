/**
 * Partner workflow notifications (invite, status update, reminder).
 * Delivery runs through the configured provider (Resend) and every attempt is
 * recorded in the admin delivery log.
 */

import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type NotifyInput = {
  reference: string;
  status: string;
  language: string;
  email: string | null;
  note: string;
  /** Which workflow mail to send; defaults to a status update. */
  kind?: "invite" | "status" | "reminder";
  partnerId?: string | null;
  name?: string | null;
  actionUrl?: string | null;
  dueDate?: string | null;
};

export type NotifyResult = { sent: boolean; reason: string };

export const notifyPartnerStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: NotifyInput) => input)
  .handler(async ({ data, context }): Promise<NotifyResult> => {
    const { data: isStaff } = await context.supabase.rpc("is_staff");
    if (!isStaff) throw new Error("Forbidden");

    if (!data.email) {
      return { sent: false, reason: "keine Kontakt-E-Mail hinterlegt" };
    }

    const { sendNotification } = await import("@/lib/notifications.server");
    const template =
      data.kind === "invite"
        ? "partner_invite"
        : data.kind === "reminder"
          ? "partner_reminder"
          : "partner_status";

    const result = await sendNotification({
      template,
      to: data.email,
      language: data.language,
      partnerId: data.partnerId ?? null,
      subjectType: "partner",
      subjectId: data.partnerId ?? null,
      data: {
        name: data.name ?? null,
        reference: data.reference,
        status: data.status,
        note: data.note,
        actionUrl: data.actionUrl ?? null,
        dueDate: data.dueDate ?? null,
      },
    });

    return { sent: result.sent, reason: result.reason };
  });
