/** Translated labels for the printed documents. */
import type { TFunction } from "i18next";

import type { PdfLabels } from "./pdf";

export function pdfLabels(t: TFunction): PdfLabels {
  // Document wording lives in the admin namespace whichever page prints it.
  const d = (key: string) => t(`documents.${key}`, { ns: "admin" }) as string;
  return {
    invoiceTitle: d("invoiceTitle"),
    orderTitle: d("orderTitle"),
    quoteTitle: d("quoteTitle"),
    reference: d("reference"),
    issuedOn: d("issuedOn"),
    dueOn: d("dueOn"),
    validUntil: d("validUntil"),
    description: d("description"),
    quantity: d("quantity"),
    unitPrice: d("unitPrice"),
    lineNet: d("lineNet"),
    net: d("net"),
    vat: d("vat"),
    total: d("total"),
    paymentPart: d("paymentPart"),
    account: d("account"),
    creditor: d("creditor"),
    paymentReference: d("paymentReference"),
    amount: d("amount"),
    currency: d("currency"),
    notConfigured: d("notConfigured"),
    notConfiguredBody: d("notConfiguredBody"),
    pendingNote: d("pendingNote"),
    version: d("version"),
    status: d("status"),
    optionsTitle: d("optionsTitle"),
    optionSelected: d("optionSelected"),
    optionNotSelected: d("optionNotSelected"),
    optionsNote: d("optionsNote"),
    effortTitle: d("effortTitle"),
    minimumTitle: d("minimumTitle"),
    acceptanceTitle: d("acceptanceTitle"),
    acceptancePlaceDate: d("acceptancePlaceDate"),
    acceptanceName: d("acceptanceName"),
    acceptanceSignature: d("acceptanceSignature"),
    page: d("page"),
    pageOf: d("pageOf"),
    position: d("position"),
    priceTitle: d("priceTitle"),
    summaryTitle: d("summaryTitle"),
    dateColumn: d("dateColumn"),
    startColumn: d("startColumn"),
    acceptanceVersionLine: d("acceptanceVersionLine"),
  };
}

export function quoteBreakdownLabels(t: TFunction) {
  const d = (key: string) => t(`documents.breakdown.${key}`) as string;
  return {
    labour: d("labour"),
    materials: d("materials"),
    transport: d("transport"),
    equipment: d("equipment"),
    disposal: d("disposal"),
    discount: d("discount"),
  };
}
