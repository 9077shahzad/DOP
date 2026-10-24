/**
 * /:lang/rechnung/:token — the customer's own invoice.
 *
 * The token is the capability and names exactly one issued invoice; nothing
 * else is reachable with it, and a draft invoice is never returned. The PDF is
 * built in the browser from the same document model the office uses.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button, Card, CardHeader, ErrorState, LoadingState, TableShell, Td, Th, Tr } from "@/components/system";
import { formatCurrency, formatDate } from "@/i18n/format";
import { langOf, privateHead } from "@/lib/seo";
import { fetchInvoiceByToken, type PublicInvoice } from "@/lib/finance";
import { pdfLabels } from "@/lib/documents/labels";

export const Route = createFileRoute("/$lang/rechnung/$token")({
  ssr: false,
  head: ({ params }) => privateHead(langOf(params.lang), "portalInvoices"),
  component: CustomerInvoicePage,
});

function CustomerInvoicePage() {
  const { lang: raw, token } = Route.useParams();
  const lang = langOf(raw);
  const { t } = useTranslation("ops");
  const [data, setData] = useState<PublicInvoice | null | "loading">("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchInvoiceByToken(token).then(setData);
  }, [token]);

  if (data === "loading") return <LoadingState label={t("common.loading")} />;
  if (!data) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16">
        <ErrorState message={t("finance.publicInvalid")} />
      </main>
    );
  }

  const inv = data.invoice;

  async function download() {
    if (!data || data === "loading") return;
    try {
      const [{ renderDocumentPdf, downloadPdf }, { invoiceDocument, invoiceRecipient }] = await Promise.all([
        import("@/lib/documents/pdf"),
        import("@/lib/documents/document-model"),
      ]);
      const doc = invoiceDocument(
        data.invoice,
        data.lines.map((l) => ({
          description: l.description,
          quantity: l.quantity,
          unit_price: l.unit_price,
          net: l.net,
          vat_rate: l.vat_rate,
        })),
        data.entity,
        invoiceRecipient(data.invoice.customer_name, (data.invoice as { customer_address?: unknown }).customer_address),
      );
      downloadPdf(await renderDocumentPdf(doc, pdfLabels(t)), `${doc.reference}.pdf`);
    } catch {
      setError(t("finance.errors.pdf"));
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-14">
      <Card>
        <CardHeader eyebrow={inv.reference} title={t("finance.publicTitle")} />
        {error ? <ErrorState className="mt-4" message={error} /> : null}
        <dl className="mt-5 grid gap-3 sm:grid-cols-3">
          <div>
            <dt className="label-mono text-soft">{t("finance.issuedOn")}</dt>
            <dd className="data-mono">{inv.issued_at ? formatDate(inv.issued_at, lang) : "—"}</dd>
          </div>
          <div>
            <dt className="label-mono text-soft">{t("finance.dueOn")}</dt>
            <dd className="data-mono">{inv.due_on ? formatDate(inv.due_on, lang) : "—"}</dd>
          </div>
          <div>
            <dt className="label-mono text-soft">{t("finance.total")}</dt>
            <dd className="data-mono">{formatCurrency(Number(inv.total), lang, 2)}</dd>
          </div>
        </dl>

        <TableShell
          className="mt-6"
          caption={t("finance.publicTitle")}
          head={
            <Tr>
              <Th>{t("finance.description")}</Th>
              <Th>{t("finance.quantity")}</Th>
              <Th>{t("finance.lineNet")}</Th>
            </Tr>
          }
        >
          {data.lines.map((line, index) => (
            <Tr key={`${line.description}-${index}`}>
              <Td>{line.description}</Td>
              <Td className="data-mono">{line.quantity}</Td>
              <Td className="data-mono">{formatCurrency(Number(line.net), lang, 2)}</Td>
            </Tr>
          ))}
        </TableShell>

        <div className="mt-6">
          <Button variant="primary" onClick={() => void download()}>
            {t("finance.pdf")}
          </Button>
        </div>
      </Card>
    </main>
  );
}
