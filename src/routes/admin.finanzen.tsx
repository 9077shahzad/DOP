/**
 * /admin/finanzen — invoices raised from completed jobs.
 *
 * The screen never invents a price: a completed job without a priced quote is
 * refused by the database with `pricing_required`, and an invoice cannot be
 * issued while the company's UID/MWST number or QR-IBAN is still unset. Both
 * refusals are shown as configuration work, not as an error the user caused.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  Button,
  Card,
  CardHeader,
  Chip,
  EmptyState,
  ErrorState,
  Field,
  Input,
  LoadingState,
  NoticeState,
  TableShell,
  Td,
  Th,
  Tr,
} from "@/components/system";
import i18n from "@/i18n/config";
import { formatCurrency, formatDate } from "@/i18n/format";
import { useActiveLang } from "@/lib/admin-i18n";
import { requestReview } from "@/lib/operations";
import { siteHref } from "@/lib/site";
import { langOf, privateHead } from "@/lib/seo";
import { pdfLabels } from "@/lib/documents/labels";
import { notifyInvoice } from "@/lib/operational-mail.functions";
import { useServerFn } from "@tanstack/react-start";
import { downloadInvoicePdf } from "@/lib/documents/download";
import { invoiceRecipient } from "@/lib/documents/document-model";
import {
  applyInvoicePayment,
  cancelInvoice,
  createInvoiceFromJob,
  fetchBillableJobs,
  fetchInvoiceConfigState,
  fetchInvoiceEvents,
  fetchInvoices,
  financeErrorCode,
  issueInvoice,
  markOverdueInvoices,
  openAmount,
  paymentState,
  type BillableJob,
  type Invoice,
  type InvoiceConfigState,
  type InvoiceEvent,
} from "@/lib/finance";

export const Route = createFileRoute("/admin/finanzen")({
  ssr: false,
  head: () => privateHead(langOf(i18n.language), "admin"),
  component: FinanceScreen,
});

type PaymentDraft = { amount: string; paidOn: string; method: string; reference: string; note: string };

const EMPTY_PAYMENT: PaymentDraft = {
  amount: "",
  paidOn: new Date().toISOString().slice(0, 10),
  method: "",
  reference: "",
  note: "",
};

function FinanceScreen() {
  const { t } = useTranslation("ops");
  const lang = useActiveLang();
  const [invoices, setInvoices] = useState<Invoice[] | null>(null);
  const [billable, setBillable] = useState<BillableJob[]>([]);
  const [config, setConfig] = useState<InvoiceConfigState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [events, setEvents] = useState<InvoiceEvent[]>([]);
  const [payment, setPayment] = useState<PaymentDraft>(EMPTY_PAYMENT);
  const [reason, setReason] = useState("");
  const [reviewLink, setReviewLink] = useState<string | null>(null);
  const [reviewExisting, setReviewExisting] = useState(false);
  const [includeTest, setIncludeTest] = useState(false);
  const sendInvoice = useServerFn(notifyInvoice);

  function report(e: unknown) {
    const code = financeErrorCode(e);
    setError(code ? t(`finance.errors.${code}`) : t("common.saveFailed"));
  }

  async function load() {
    try {
      const [list, jobs, cfg] = await Promise.all([
        fetchInvoices(includeTest),
        fetchBillableJobs(),
        fetchInvoiceConfigState(),
      ]);
      setInvoices(list);
      setBillable(jobs);
      setConfig(cfg);
      setError(null);
    } catch (e) {
      setInvoices([]);
      report(e);
    }
  }

  useEffect(() => {
    void load();
  }, [includeTest]);

  const selectedInvoice = useMemo(
    () => (invoices ?? []).find((row) => row.id === selected) ?? null,
    [invoices, selected],
  );

  useEffect(() => {
    setReviewLink(null);
    setReviewExisting(false);
  }, [selected]);

  useEffect(() => {
    if (!selected) {
      setEvents([]);
      return;
    }
    void fetchInvoiceEvents(selected).then(setEvents).catch(() => setEvents([]));
  }, [selected, invoices]);

  const totals = useMemo(() => {
    const rows = invoices ?? [];
    return {
      open: rows.reduce((sum, i) => sum + openAmount(i), 0),
      overdue: rows.filter((i) => i.status === "overdue").length,
    };
  }, [invoices]);

  async function run(key: string, action: () => Promise<void>) {
    setBusy(key);
    try {
      await action();
      await load();
      setError(null);
    } catch (e) {
      report(e);
    } finally {
      setBusy(null);
    }
  }

  return (
      <div className="space-y-6">
        <CardHeader eyebrow={t("common.eyebrow")} title={t("finance.title")} />
        <p className="type-small text-ink-2">{t("finance.intro")}</p>
        <label className="type-small inline-flex items-center gap-2 text-ink-2">
          <input type="checkbox" checked={includeTest} onChange={(e) => setIncludeTest(e.target.checked)} />
          {t("dop:common.showTest")}
        </label>

        {error ? <ErrorState message={error} /> : null}

        {config && !config.complete ? (
          <NoticeState
            message={`${t("finance.configIncomplete")} ${config.missing
              .map((key) => t(`finance.configFields.${key}`, { defaultValue: key }))
              .join(", ")}`}
          />
        ) : null}

        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <p className="label-mono text-soft">{t("finance.openTotal")}</p>
            <p className="data-mono mt-2 text-2xl">{formatCurrency(totals.open, lang, 2)}</p>
          </Card>
          <Card>
            <p className="label-mono text-soft">{t("finance.overdueCount")}</p>
            <p className="data-mono mt-2 text-2xl">{totals.overdue}</p>
          </Card>
          <Card>
            <p className="label-mono text-soft">{t("finance.billableCount")}</p>
            <p className="data-mono mt-2 text-2xl">{billable.length}</p>
          </Card>
        </div>

        {/* ----------------------------------------- completed jobs to bill */}
        <Card>
          <CardHeader title={t("finance.billableTitle")} />
          {billable.length === 0 ? (
            <EmptyState title={t("finance.billableEmpty")} />
          ) : (
            <TableShell
              caption={t("finance.billableTitle")}
              head={
                <Tr>
                  <Th>{t("finance.job")}</Th>
                  <Th>{t("common.customer")}</Th>
                  <Th>{t("finance.completedOn")}</Th>
                  <Th>{t("common.status")}</Th>
                </Tr>
              }
            >
                {billable.map((job) => (
                  <Tr key={job.id}>
                    <Td className="data-mono">{job.reference}</Td>
                    <Td>{job.customerName || t("common.none")}</Td>
                    <Td>{job.completedAt ? formatDate(job.completedAt, lang) : t("common.none")}</Td>
                    <Td>
                      <Button
                        size="sm"
                        variant="primary"
                        disabled={busy === job.id}
                        onClick={() => void run(job.id, async () => void (await createInvoiceFromJob(job.id)))}
                      >
                        {busy === job.id ? t("common.saving") : t("finance.createInvoice")}
                      </Button>
                    </Td>
                  </Tr>
                ))}
            </TableShell>
          )}
        </Card>

        {/* ------------------------------------------------------ invoices */}
        <Card>
          <CardHeader
            title={t("finance.invoicesTitle")}
            action={
              <Button
                size="sm"
                variant="outline"
                disabled={busy === "overdue"}
                onClick={() => void run("overdue", async () => void (await markOverdueInvoices()))}
              >
                {t("finance.markOverdue")}
              </Button>
            }
          />
          {invoices === null ? (
            <LoadingState label={t("common.loading")} />
          ) : invoices.length === 0 ? (
            <EmptyState title={t("finance.invoicesEmpty")} />
          ) : (
            <TableShell
              caption={t("finance.invoicesTitle")}
              head={
                <Tr>
                  <Th>{t("finance.reference")}</Th>
                  <Th>{t("common.customer")}</Th>
                  <Th>{t("finance.total")}</Th>
                  <Th>{t("finance.open")}</Th>
                  <Th>{t("finance.dueOn")}</Th>
                  <Th>{t("common.status")}</Th>
                  <Th>{t("finance.actions")}</Th>
                </Tr>
              }
            >
                {invoices.map((invoice) => {
                  const state = paymentState(invoice);
                  return (
                    <Tr key={invoice.id}>
                      <Td className="data-mono">{invoice.reference}</Td>
                      <Td>{invoice.customer_name || t("common.none")}</Td>
                      <Td className="data-mono">{formatCurrency(Number(invoice.total), lang, 2)}</Td>
                      <Td className="data-mono">{formatCurrency(openAmount(invoice), lang, 2)}</Td>
                      <Td>{invoice.due_on ? formatDate(invoice.due_on, lang) : t("common.none")}</Td>
                      <Td>
                        <Chip>{t(`finance.state.${state}`)}</Chip>
                      </Td>
                      <Td>
                        <div className="flex flex-wrap gap-2">
                          {invoice.status === "draft" ? (
                            <Button
                              size="sm"
                              variant="primary"
                              disabled={busy === invoice.id}
                              onClick={() =>
                                void run(invoice.id, async () => {
                                  const result = await issueInvoice(invoice.id);
                                  if (result.status === "config_incomplete") {
                                    setError(
                                      `${t("finance.configIncomplete")} ${result.missing
                                        .map((key) => t(`finance.configFields.${key}`, { defaultValue: key }))
                                        .join(", ")}`,
                                    );
                                  }
                                })
                              }
                            >
                              {t("finance.issue")}
                            </Button>
                          ) : null}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelected(selected === invoice.id ? null : invoice.id)}
                          >
                            {t("finance.details")}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              void downloadInvoicePdf(
                                {
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
                                },
                                invoiceRecipient(invoice.customer_name, invoice.customer_address),
                                pdfLabels(t),
                              ).catch(() => setError(t("finance.errors.pdf")))
                            }
                          >
                            {t("finance.pdf")}
                          </Button>
                          {invoice.status !== "draft" && invoice.status !== "cancelled" ? (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={busy === `email-${invoice.id}`}
                              onClick={() => void run(`email-${invoice.id}`, async () => {
                                const result = await sendInvoice({ data: { invoiceId: invoice.id, force: true } });
                                if (result.status !== "sent") setError(result.reason);
                              })}
                            >
                              {t("accounts.emailInvoice", { ns: "admin" })}
                            </Button>
                          ) : null}
                        </div>
                      </Td>
                    </Tr>
                  );
                })}
            </TableShell>
          )}
        </Card>

        {/* ------------------------------------------- payment and history */}
        {selected ? (
          <Card>
            <CardHeader title={t("finance.paymentTitle")} />
            <div className="grid gap-4 md:grid-cols-3">
              <Field label={t("finance.amount")}>
                {(p) => (
                  <Input
                    {...p}
                    type="number"
                    min="0"
                    step="0.05"
                    value={payment.amount}
                    onChange={(e) => setPayment({ ...payment, amount: e.target.value })}
                  />
                )}
              </Field>
              <Field label={t("finance.paidOn")}>
                {(p) => (
                  <Input
                    {...p}
                    type="date"
                    value={payment.paidOn}
                    onChange={(e) => setPayment({ ...payment, paidOn: e.target.value })}
                  />
                )}
              </Field>
              <Field label={t("finance.method")}>
                {(p) => (
                  <Input
                    {...p}
                    value={payment.method}
                    onChange={(e) => setPayment({ ...payment, method: e.target.value })}
                  />
                )}
              </Field>
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button
                variant="primary"
                disabled={busy === "pay" || !payment.amount}
                onClick={() =>
                  void run("pay", async () => {
                    await applyInvoicePayment({
                      id: selected,
                      amount: Number(payment.amount),
                      paidOn: payment.paidOn,
                      method: payment.method,
                      reference: payment.reference,
                      note: payment.note,
                    });
                    setPayment(EMPTY_PAYMENT);
                  })
                }
              >
                {t("finance.recordPayment")}
              </Button>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <Field label={t("finance.cancelReason")}>
                {(p) => <Input {...p} value={reason} onChange={(e) => setReason(e.target.value)} />}
              </Field>
              <div className="flex items-end">
                <Button
                  variant="outline"
                  disabled={busy === "cancel" || !reason}
                  onClick={() =>
                    void run("cancel", async () => {
                      await cancelInvoice(selected, reason);
                      setReason("");
                    })
                  }
                >
                  {t("finance.cancelInvoice")}
                </Button>
              </div>
            </div>

            {/* review invitation — part of the close-out, bound to a completed job */}
            <div className="mt-8 border-t border-line pt-6">
              <h3 className="label-mono text-soft">{t("finance.reviewTitle")}</h3>
              {selectedInvoice?.job_id ? (
                <>
                  <div className="mt-3 flex flex-wrap gap-3">
                    <Button
                      variant="outline"
                      disabled={busy === "review"}
                      onClick={() =>
                        void run("review", async () => {
                          const result = await requestReview(selectedInvoice.job_id as string);
                          setReviewExisting(!result.created);
                          setReviewLink(siteHref(`/${lang}/bewertung/${result.token}`));
                        })
                      }
                    >
                      {t("finance.reviewCreate")}
                    </Button>
                  </div>
                  {reviewLink ? (
                    <Field label={t("finance.reviewSend")} className="mt-4">
                      {(p) => <Input {...p} readOnly value={reviewLink} onFocus={(e) => e.currentTarget.select()} />}
                    </Field>
                  ) : null}
                  {reviewExisting ? <p className="type-small mt-2 text-ink-2">{t("finance.reviewExists")}</p> : null}
                </>
              ) : (
                <p className="type-small mt-2 text-ink-2">{t("finance.reviewNoJob")}</p>
              )}
            </div>

            <h3 className="label-mono mt-8 text-soft">{t("finance.history")}</h3>
            {events.length === 0 ? (
              <EmptyState title={t("finance.historyEmpty")} />
            ) : (
              <ul className="mt-3 space-y-2">
                {events.map((event) => (
                  <li key={event.id} className="type-small text-ink-2">
                    <span className="data-mono">{formatDate(event.created_at, lang)}</span>{" "}
                    {t(`finance.events.${event.kind}`, { defaultValue: event.kind })}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        ) : null}
      </div>
  );
}
