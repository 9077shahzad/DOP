/**
 * Browser-side entry point for document download.
 *
 * Keeps jsPDF and the document model out of every screen that only wants a
 * "PDF" button, and keeps the label wiring in one place.
 */
import { supabase } from "@/integrations/supabase/client";

import { invoiceDocument, quoteDocument, type DocumentExtras, type EntityFields } from "./document-model";
import type { PdfLabels } from "./pdf";

async function loadEntity(): Promise<EntityFields | null> {
  const { data } = await supabase.from("legal_entities").select("*").eq("country", "CH").maybeSingle();
  return (data as EntityFields | null) ?? null;
}

export async function downloadInvoicePdf(
  invoice: Parameters<typeof invoiceDocument>[0],
  recipient: string[],
  labels: PdfLabels,
): Promise<void> {
  const [{ renderDocumentPdf, downloadPdf }, entity, lines] = await Promise.all([
    import("./pdf"),
    loadEntity(),
    supabase.from("invoice_lines").select("*").eq("invoice_id", invoice.id),
  ]);
  const doc = invoiceDocument(
    invoice,
    (lines.data ?? []) as Parameters<typeof invoiceDocument>[1],
    entity,
    recipient,
  );
  downloadPdf(await renderDocumentPdf(doc, labels), `${doc.reference}.pdf`);
}

/** Renders the quotation or order document without handing it to the browser. */
export async function renderQuotePdfBlob(
  quote: Parameters<typeof quoteDocument>[0],
  recipient: string[],
  labels: PdfLabels,
  breakdownLabels: Parameters<typeof quoteDocument>[3],
  entityOverride?: EntityFields | null,
  extras?: DocumentExtras,
  documentKind: "quote" | "order" = "quote",
): Promise<{ blob: Blob; filename: string }> {
  const [{ renderDocumentPdf }, entity] = await Promise.all([
    import("./pdf"),
    entityOverride ? Promise.resolve(entityOverride) : loadEntity(),
  ]);
  const doc = { ...quoteDocument(quote, entity, recipient, breakdownLabels), ...(extras ?? {}), kind: documentKind };
  return { blob: await renderDocumentPdf(doc, labels), filename: `${doc.reference}${documentKind === "order" ? "-Auftrag" : ""}.pdf` };
}

export async function downloadQuotePdf(
  quote: Parameters<typeof quoteDocument>[0],
  recipient: string[],
  labels: PdfLabels,
  breakdownLabels: Parameters<typeof quoteDocument>[3],
  /** Company block when the caller already has it (public pages cannot read the table). */
  entityOverride?: EntityFields | null,
  /** Key figures, detail sections, day plan and QR the offer should carry. */
  extras?: DocumentExtras,
): Promise<void> {
  const [{ downloadPdf }, rendered] = await Promise.all([
    import("./pdf"),
    renderQuotePdfBlob(quote, recipient, labels, breakdownLabels, entityOverride, extras),
  ]);
  downloadPdf(rendered.blob, rendered.filename);
}



