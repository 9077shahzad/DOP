import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button, Card, CardHeader, Chip, EmptyState, ErrorState, Field, Input, LoadingState, TableShell, Td, Th, Tr } from "@/components/system";
import i18n from "@/i18n/config";
import { formatCurrency, formatDate } from "@/i18n/format";
import { useActiveLang } from "@/lib/admin-i18n";
import { applyInvoicePayment, fetchInvoices, financeErrorCode, openAmount, paymentState, type Invoice } from "@/lib/finance";
import { langOf, privateHead } from "@/lib/seo";

export const Route = createFileRoute("/admin/zahlungen")({
  ssr: false,
  head: () => privateHead(langOf(i18n.language), "admin"),
  component: PaymentsPage,
});

const today = () => new Date().toISOString().slice(0, 10);

function PaymentsPage() {
  const { t } = useTranslation("ops");
  const lang = useActiveLang();
  const [invoices, setInvoices] = useState<Invoice[] | null>(null);
  const [selected, setSelected] = useState<string>("");
  const [amount, setAmount] = useState("");
  const [paidOn, setPaidOn] = useState(today());
  const [method, setMethod] = useState("bank");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const rows = await fetchInvoices();
    setInvoices(rows.filter((row) => !["draft", "paid", "cancelled"].includes(row.status)));
  }

  useEffect(() => {
    void load().catch((reason) => setError(String(reason)));
  }, []);

  const chosen = useMemo(() => (invoices ?? []).find((row) => row.id === selected), [invoices, selected]);

  function choose(invoice: Invoice) {
    setSelected(invoice.id);
    setAmount(openAmount(invoice).toFixed(2));
    setError(null);
  }

  async function save() {
    if (!chosen) return;
    setBusy(true);
    setError(null);
    try {
      await applyInvoicePayment({ id: chosen.id, amount: Number(amount), paidOn, method, reference, note });
      setSelected("");
      setAmount("");
      setReference("");
      setNote("");
      await load();
    } catch (reason) {
      const code = financeErrorCode(reason);
      setError(code ? t(`finance.errors.${code}`) : t("common.saveFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
      <div className="space-y-6">
        <CardHeader eyebrow={t("common.eyebrow")} title={t("finance.paymentsPageTitle")} />
        <p className="type-small text-ink-2">{t("finance.paymentsPageIntro")}</p>
        {error ? <ErrorState message={error} /> : null}

        <Card>
          {invoices === null ? <LoadingState label={t("common.loading")} /> : invoices.length === 0 ? (
            <EmptyState title={t("finance.noOpenPayments")} />
          ) : (
            <TableShell caption={t("finance.paymentsPageTitle")} head={<Tr><Th>{t("finance.reference")}</Th><Th>{t("common.customer")}</Th><Th>{t("finance.open")}</Th><Th>{t("finance.dueOn")}</Th><Th>{t("common.status")}</Th><Th>{t("finance.actions")}</Th></Tr>}>
              {invoices.map((invoice) => <Tr key={invoice.id}>
                <Td className="data-mono">{invoice.reference}</Td>
                <Td>{invoice.customer_name || t("common.none")}</Td>
                <Td className="data-mono">{formatCurrency(openAmount(invoice), lang, 2)}</Td>
                <Td>{invoice.due_on ? formatDate(invoice.due_on, lang) : t("common.none")}</Td>
                <Td><Chip>{t(`finance.state.${paymentState(invoice)}`)}</Chip></Td>
                <Td><Button size="sm" variant={selected === invoice.id ? "primary" : "outline"} onClick={() => choose(invoice)}>{t("finance.recordPayment")}</Button></Td>
              </Tr>)}
            </TableShell>
          )}
        </Card>

        {chosen ? <Card>
          <CardHeader title={`${t("finance.paymentTitle")} · ${chosen.reference}`} />
          <div className="grid gap-4 md:grid-cols-3">
            <Field label={t("finance.amount")}>{(props) => <Input {...props} type="number" min="0.05" step="0.05" max={openAmount(chosen)} value={amount} onChange={(event) => setAmount(event.target.value)} />}</Field>
            <Field label={t("finance.paidOn")}>{(props) => <Input {...props} type="date" value={paidOn} onChange={(event) => setPaidOn(event.target.value)} />}</Field>
            <Field label={t("finance.method")}>{(props) => <Input {...props} value={method} onChange={(event) => setMethod(event.target.value)} />}</Field>
            <Field label={t("finance.paymentReference")}>{(props) => <Input {...props} value={reference} onChange={(event) => setReference(event.target.value)} />}</Field>
            <Field label={t("finance.paymentNote")}>{(props) => <Input {...props} value={note} onChange={(event) => setNote(event.target.value)} />}</Field>
          </div>
          <div className="mt-5"><Button variant="primary" disabled={busy || !amount || Number(amount) <= 0} onClick={() => void save()}>{busy ? t("common.saving") : t("finance.recordPayment")}</Button></div>
        </Card> : null}
      </div>
  );
}