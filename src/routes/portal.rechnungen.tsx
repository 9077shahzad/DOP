import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import i18n, { isLang, type Lang } from "@/i18n/config";
import { formatCurrency, formatDayMonthYear } from "@/i18n/format";
import {
  loadPortalInvoices,
  openAmountOf,
  paymentStateOf,
  type PortalInvoice,
} from "@/lib/portal-invoices";
import { langOf, privateHead } from "@/lib/seo";

export const Route = createFileRoute("/portal/rechnungen")({
  ssr: false,
  head: () => privateHead(langOf(i18n.language), "portalInvoices"),
  component: InvoicesPage,
});

const TONE: Record<string, string> = {
  unpaid: "border-line text-ink-2",
  processing: "border-primary text-primary",
  paid: "border-ink text-ink",
};

function InvoicesPage() {
  const { t, i18n: inst } = useTranslation("portal");
  const lang = (isLang(inst.language) ? inst.language : "de") as Lang;
  const [rows, setRows] = useState<PortalInvoice[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    loadPortalInvoices()
      .then(setRows)
      .catch(() => setFailed(true));
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 md:px-8">
      <p className="label-mono text-primary">{t("invoices.eyebrow")}</p>
      <h1 className="mt-3 text-4xl md:text-5xl">{t("invoices.title")}</h1>
      <p className="mt-4 max-w-2xl text-sm text-ink-2">{t("invoices.intro")}</p>

      {failed ? (
        <p className="mt-8 max-w-2xl border border-ink bg-surface p-6 text-sm text-ink-2">
          {t("invoices.loadFailed")}
        </p>
      ) : rows === null ? (
        <p className="label-mono mt-8 text-soft">{t("loading")}</p>
      ) : rows.length === 0 ? (
        <div className="mt-8 max-w-2xl border border-ink bg-surface p-6 md:p-8">
          <p className="label-mono text-soft">{t("invoices.emptyTitle")}</p>
          <p className="mt-3 text-sm text-ink-2">{t("invoices.body1")}</p>
        </div>
      ) : (
        <section className="mt-8 border border-line bg-surface">
          <table className="w-full text-start text-sm">
            <caption className="sr-only">{t("invoices.caption")}</caption>
            <thead>
              <tr className="border-b border-line">
                <th scope="col" className="label-mono px-5 py-3 text-start text-soft">{t("invoices.table.reference")}</th>
                <th scope="col" className="label-mono px-5 py-3 text-start text-soft">{t("invoices.table.issued")}</th>
                <th scope="col" className="label-mono px-5 py-3 text-start text-soft">{t("invoices.table.due")}</th>
                <th scope="col" className="label-mono px-5 py-3 text-end text-soft">{t("invoices.table.total")}</th>
                <th scope="col" className="label-mono px-5 py-3 text-end text-soft">{t("invoices.table.open")}</th>
                <th scope="col" className="label-mono px-5 py-3 text-start text-soft">{t("invoices.table.status")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((invoice) => {
                const state = paymentStateOf(invoice);
                return (
                  <tr key={invoice.id} className="border-b border-line align-top last:border-0">
                    <td className="px-5 py-4">
                      <a className="underline" href={`/${lang}/rechnung/${invoice.access_token}`}>
                        {invoice.reference}
                      </a>
                      <p className="label-mono mt-1 text-soft">
                        {t("invoices.paymentReference")}: {invoice.payment_reference || invoice.reference}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      {invoice.issued_at ? formatDayMonthYear(invoice.issued_at) : "—"}
                    </td>
                    <td className="px-5 py-4">
                      {invoice.due_on ? formatDayMonthYear(invoice.due_on) : "—"}
                    </td>
                    <td className="px-5 py-4 text-end">
                      {formatCurrency(Number(invoice.total), lang, 2)}
                    </td>
                    <td className="px-5 py-4 text-end">
                      {formatCurrency(openAmountOf(invoice), lang, 2)}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`label-mono inline-block border px-2 py-1 ${TONE[state]}`}>
                        {t(`invoices.state.${state}`)}
                      </span>
                      <p className="mt-2 max-w-xs text-xs text-ink-2">
                        {invoice.payment_note
                          ? invoice.payment_note
                          : state === "paid" && invoice.paid_on
                            ? t("invoices.note.paidOn", { date: formatDayMonthYear(invoice.paid_on) })
                            : t(`invoices.note.${state}`)}
                      </p>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}

      <p className="mt-6 max-w-2xl text-xs text-soft">{t("invoices.body2")}</p>
    </div>
  );
}
