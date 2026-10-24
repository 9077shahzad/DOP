import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { useCompany } from "@/components/shell/CompanyContext";
import { whatsappHref } from "@/lib/company";
import { isLang, type Lang } from "@/i18n/config";
import { createWhatsappLead } from "@/lib/leads";

type Props = {
  /** Short description of where the handoff happened, stored on the lead. */
  context: string;
  /** Prefilled chat text; the reference is appended once the record exists. */
  message?: string;
  details?: Record<string, unknown>;
  className?: string;
  children: ReactNode;
};

/**
 * WhatsApp handoff that creates the lead FIRST and only then opens the chat,
 * with the reference in the text so the conversation and the record are linked.
 * If the record cannot be written we still open the chat — but the failure is
 * visible, never silent.
 */
export function WhatsappHandoff({ context, message, details, className, children }: Props) {
  const { i18n } = useTranslation();
  const company = useCompany();
  const [busy, setBusy] = useState(false);

  async function open() {
    if (busy) return;
    setBusy(true);
    const lang = (isLang(i18n.language) ? i18n.language : "de") as Lang;
    let text = message ?? "";
    try {
      const reference = await createWhatsappLead({ language: lang, context, details });
      text = `${text ? `${text}\n\n` : ""}Ref: ${reference}`;
    } catch (error) {
      console.error("whatsapp_lead_failed", error);
    } finally {
      setBusy(false);
      window.open(whatsappHref(company, text || undefined), "_blank", "noopener,noreferrer");
    }
  }

  return (
    <button type="button" onClick={open} disabled={busy} className={className}>
      {children}
    </button>
  );
}
