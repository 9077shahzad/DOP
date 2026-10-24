import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button, Card, CardHeader, Chip, EmptyState, ErrorState, LoadingState, NoticeState, TableShell, Td, Th, Tr } from "@/components/system";
import i18n from "@/i18n/config";
import { formatCurrency } from "@/i18n/format";
import { useActiveLang } from "@/lib/admin-i18n";
import { downloadInvoicePdf } from "@/lib/documents/download";
import { pdfLabels } from "@/lib/documents/labels";
import { fetchInvoiceConfigState, fetchInvoices, openAmount, type Invoice, type InvoiceConfigState } from "@/lib/finance";
import { langOf, privateHead } from "@/lib/seo";

export const Route = createFileRoute("/admin/qr-rechnung")({
  ssr: false,
  head: () => privateHead(langOf(i18n.language), "admin"),
  component: QrBillPage,
});

function QrBillPage() {
  const { t } = useTranslation("ops");
  const lang = useActiveLang();
  const [invoices, setInvoices] = useState<Invoice[] | null>(null);
  const [config, setConfig] = useState<InvoiceConfigState | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void Promise.all([fetchInvoices(), fetchInvoiceConfigState()])
      .then(([rows, state]) => {
        setInvoices(rows.filter((row) => !["draft", "cancelled"].includes(row.status)));
        setConfig(state);
      })
      .catch((reason) => setError(String(reason)));
  }, []);

  async function download(invoice: Invoice) {
    setBusy(invoice.id);
    setError(null);
    try {
      await downloadInvoicePdf({
        id: invoice.id,
        reference: invoice.reference,
        created_at: invoice.created_at,
        issued_at: invoice.issued_at,
        due_on: invoice.due_on,
        qr_reference: invoice.qr_reference,
        net: invoice.net,
        vat: invoice.vat,
        total: invoice.total,
        currency: invoice.currency,
      }, [invoice.customer_name].filter(Boolean), pdfLabels(t));
    } catch {
      setError(t("finance.errors.pdf"));
    } finally {
      setBusy(null);
    }
  }

  return <div className="space-y-6">
    <CardHeader eyebrow={t("common.eyebrow")} title={t("finance.qrPageTitle")} />
    <p className="type-small text-ink-2">{t("finance.qrPageIntro")}</p>
    {error ? <ErrorState message={error} /> : null}
    {config && !config.complete ? <NoticeState message={`${t("finance.qrUnavailable")} ${config.missing.map((key) => t(`finance.configFields.${key}`, { defaultValue: key })).join(", ")}`} /> : null}
    <Card>
      {invoices === null ? <LoadingState label={t("common.loading")} /> : invoices.length === 0 ? <EmptyState title={t("finance.invoicesEmpty")} /> :
        <TableShell caption={t("finance.qrPageTitle")} head={<Tr><Th>{t("finance.reference")}</Th><Th>{t("common.customer")}</Th><Th>{t("finance.total")}</Th><Th>{t("finance.open")}</Th><Th>{t("common.status")}</Th><Th>{t("finance.actions")}</Th></Tr>}>
          {invoices.map((invoice) => <Tr key={invoice.id}>
            <Td className="data-mono">{invoice.reference}</Td><Td>{invoice.customer_name || t("common.none")}</Td>
            <Td className="data-mono">{formatCurrency(Number(invoice.total), lang, 2)}</Td><Td className="data-mono">{formatCurrency(openAmount(invoice), lang, 2)}</Td>
            <Td><Chip tone={config?.complete ? "success" : "warning"}>{config?.complete ? t("finance.qrReady") : t("finance.qrBlockedShort")}</Chip></Td>
            <Td><Button size="sm" variant="primary" disabled={!config?.complete || busy === invoice.id} onClick={() => void download(invoice)}>{busy === invoice.id ? t("common.loading") : t("finance.downloadQrBill")}</Button></Td>
          </Tr>)}
        </TableShell>}
    </Card>
  </div>;
}