/**
 * Read-only payment position for one account invoice.
 *
 * There is exactly one authoritative way to record a payment — the finance
 * screen, which calls `apply_invoice_payment`. This component therefore only
 * shows what has been received and what is still open; it never writes.
 */
import { useTranslation } from "react-i18next";

import { formatCurrency } from "@/i18n/format";
import type { Invoice } from "@/lib/accounts";
import { useActiveLang } from "@/lib/admin-i18n";

export function InvoicePaymentSummary({ invoice }: { invoice: Invoice }) {
  const { t } = useTranslation("admin");
  const lang = useActiveLang();

  const paid = Number(invoice.amount_paid ?? 0);
  const total = Number(invoice.total ?? 0);
  const outstanding = invoice.status === "cancelled" ? 0 : Math.max(0, total - paid);

  return (
    <p className="font-mono text-xs">
      {formatCurrency(paid, lang, 2)}
      {outstanding > 0 ? (
        <span className="text-soft">
          {" "}
          · {t("accounts.payment.outstanding")} {formatCurrency(outstanding, lang, 2)}
        </span>
      ) : null}
    </p>
  );
}
