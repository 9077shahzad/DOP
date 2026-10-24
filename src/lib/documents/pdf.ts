/**
 * PDF rendering for invoices and quotes.
 *
 * Runs in the browser (jsPDF is imported dynamically so it never enters the
 * SSR bundle). The Swiss QR payment part is drawn from the same template in
 * both states: with the structured reference and creditor when configured, and
 * with an explicit "not configured" box when the QR-IBAN is still missing. No
 * QR code is ever drawn from placeholder payment data.
 */
import type { DocumentModel } from "./document-model";
import { PLACEHOLDER } from "./document-model";
import { drawIcon, type DocumentIcon } from "./pdf-icons";
import { formatIban, swissQrDataUrl } from "./qr-bill";
import { formatCalendarDate } from "@/i18n/format";

export type PdfLabels = {
  invoiceTitle: string;
  orderTitle?: string;
  quoteTitle: string;
  reference: string;
  issuedOn: string;
  dueOn: string;
  validUntil: string;
  description: string;
  quantity: string;
  unitPrice: string;
  lineNet: string;
  net: string;
  vat: string;
  total: string;
  paymentPart: string;
  account: string;
  creditor: string;
  paymentReference: string;
  amount: string;
  currency: string;
  notConfigured: string;
  notConfiguredBody: string;
  pendingNote: string;
  version: string;
  status: string;
  optionsTitle: string;
  optionSelected: string;
  optionNotSelected: string;
  optionsNote: string;
  effortTitle: string;
  minimumTitle: string;
  acceptanceTitle: string;
  acceptancePlaceDate: string;
  acceptanceName: string;
  acceptanceSignature: string;
  page: string;
  pageOf: string;
  /** Column head of the position number in the price table ("Pos."). */
  position?: string;
  priceTitle?: string;
  summaryTitle?: string;
  dateColumn?: string;
  startColumn?: string;
  acceptanceVersionLine?: string;
};

const MARGIN = 18;
const BRAND_NAVY: [number, number, number] = [25, 69, 124];
const BRAND_ORANGE: [number, number, number] = [248, 151, 58];
const BRAND_PALE: [number, number, number] = [242, 245, 248];
const BRAND_LINE: [number, number, number] = [218, 226, 235];
const TEXT: [number, number, number] = [22, 35, 58];
const money = (value: number, currency: string) =>
  `${currency} ${value.toLocaleString("de-CH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

let logoDataUrl: Promise<string | null> | null = null;

/** Rasterise the official vector lockup at print resolution for jsPDF. */
async function loadLogo(): Promise<string | null> {
  if (logoDataUrl) return logoDataUrl;
  logoDataUrl = (async () => {
    try {
      const response = await fetch("/ps-umzug-logo.svg");
      if (!response.ok) return null;
      const svg = await response.text();
      const blobUrl = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
      try {
        const image = new Image();
        image.decoding = "async";
        image.src = blobUrl;
        await image.decode();
        const canvas = document.createElement("canvas");
        canvas.width = 1248;
        canvas.height = 765;
        const context = canvas.getContext("2d");
        if (!context) return null;
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL("image/png");
      } finally {
        URL.revokeObjectURL(blobUrl);
      }
    } catch {
      return null;
    }
  })();
  return logoDataUrl;
}

export async function renderDocumentPdf(doc: DocumentModel, labels: PdfLabels): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  // Arabic documents need an embedded Arabic font, letter shaping and a
  // right-to-left page; detected from the translated labels.
  const { enableRtl, isArabicText, cleanPdfText } = await import("./pdf-rtl");
  {
    // Locale formatters emit narrow/no-break spaces and invisible direction
    // marks the PDF fonts cannot draw (French "1 387" printed as "1 /387",
    // Arabic amounts reversed). Normalise every string before drawing.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = pdf as any;
    const baseText = p.text.bind(pdf);
    p.text = (text: string | string[], ...rest: unknown[]) =>
      baseText(Array.isArray(text) ? text.map(cleanPdfText) : cleanPdfText(String(text)), ...rest);
  }
  const rtl = isArabicText(`${labels.quoteTitle} ${labels.invoiceTitle} ${labels.total}`) ? await enableRtl(pdf) : null;
  const width = pdf.internal.pageSize.getWidth();
  const height = pdf.internal.pageSize.getHeight();
  const contentBottom = doc.payment ? height - 120 : height - 25;
  const logo = await loadLogo();
  let y = MARGIN;

  const setText = (color: [number, number, number] = TEXT) => pdf.setTextColor(...color);
  const footer = () => {
    pdf.setDrawColor(...BRAND_ORANGE);
    pdf.setLineWidth(0.7);
    pdf.line(MARGIN, height - 16, width - MARGIN, height - 16);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7.5);
    setText(BRAND_NAVY);
    pdf.text(
      doc.issuer.lines.filter((line) => line !== PLACEHOLDER).slice(0, 3).join("  ·  "),
      width / 2,
      height - 12,
      { align: "center" },
    );
    if (doc.bankLine) {
      pdf.setFontSize(7);
      pdf.text(doc.bankLine, width / 2, height - 8.4, { align: "center" });
    }
    pdf.setFontSize(7.5);
    pdf.text(doc.reference, width - MARGIN, height - 4.6, { align: "right" });
  };

  /** Address/phone/mail strip repeated at the top of every page. */
  const contactStrip = () => {
    if (!doc.contactStrip) return;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7.2);
    setText(BRAND_NAVY);
    pdf.text(doc.contactStrip, MARGIN, 14.2);
    setText();
  };

  /** "Seite x von y" — written after rendering, when the count is known. */
  const stampPageNumbers = () => {
    const pages = pdf.getNumberOfPages();
    for (let page = 1; page <= pages; page += 1) {
      pdf.setPage(page);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7.5);
      pdf.setTextColor(...BRAND_NAVY);
      pdf.text(`${labels.page} ${page} ${labels.pageOf} ${pages}`, width / 2, height - 4.6, {
        align: "center",
      });
    }
  };

  const newContentPage = () => {
    footer();
    pdf.addPage();
    pdf.setFillColor(...BRAND_NAVY);
    pdf.rect(0, 0, width, 8, "F");
    pdf.setFillColor(...BRAND_ORANGE);
    pdf.rect(0, 8, width, 1.4, "F");
    contactStrip();
    y = doc.contactStrip ? 24 : MARGIN;
    setText();
  };

  const beginRequiredPage = (minimumPage: number) => {
    const pageBeforeBreak = pdf.getNumberOfPages();
    while (pdf.getNumberOfPages() < minimumPage) newContentPage();
    if (pageBeforeBreak >= minimumPage && y > (doc.contactStrip ? 30 : MARGIN + 6)) newContentPage();
  };

  // -------------------------------------------------------------- issuer
  pdf.setFillColor(...BRAND_NAVY);
  pdf.rect(0, 0, width, 8, "F");
  pdf.setFillColor(...BRAND_ORANGE);
  pdf.rect(0, 8, width, 2.2, "F");
  contactStrip();
  const headTop = doc.contactStrip ? 18 : 15;
  if (logo) {
    pdf.addImage(logo, "PNG", MARGIN, headTop, 42, 25.8, undefined, "FAST");
  } else {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(15);
    setText(BRAND_NAVY);
    pdf.text(doc.issuer.lines[0] ?? PLACEHOLDER, MARGIN, headTop + 9);
  }
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8.3);
  setText();
  let issuerY = headTop + 3;
  // The contact strip already carries the address line; repeating it on the
  // right of the header would print the same data twice.
  if (!doc.contactStrip) {
    for (const line of doc.issuer.lines.slice(1)) {
      pdf.text(line, width - MARGIN, issuerY, { align: "right" });
      issuerY += 4;
    }
  }

  // ------------------------------------------------------------ recipient
  // With party boxes the customer is printed there; the centred address block
  // would only repeat it.
  let ry = 48;
  if (!doc.parties?.length) {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    setText(BRAND_ORANGE);
    pdf.text(doc.kind === "invoice" ? labels.invoiceTitle : doc.kind === "order" ? (labels.orderTitle || labels.quoteTitle) : labels.quoteTitle, width / 2, ry);
    ry += 5;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    setText();
    for (const line of doc.recipient) {
      pdf.text(line, width / 2, ry);
      ry += 4;
    }
  }

  y = Math.max(48, ry) + 7;

  // ---------------------------------------------------------------- title
  const titleRows = (doc.subtitle ? 1 : 0) + (doc.version != null || doc.status ? 1 : 0);
  const titleHeight = 22 + titleRows * 6;
  pdf.setFillColor(...BRAND_NAVY);
  pdf.roundedRect(MARGIN, y, width - MARGIN * 2, titleHeight, 1.5, 1.5, "F");
  pdf.setFillColor(...BRAND_ORANGE);
  pdf.rect(MARGIN, y, 3, titleHeight, "F");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(16);
  pdf.setTextColor(255, 255, 255);
  pdf.text(doc.kind === "invoice" ? labels.invoiceTitle : doc.kind === "order" ? (labels.orderTitle || labels.quoteTitle) : labels.quoteTitle, MARGIN + 8, y + 9);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8.5);
  let metaY = y + 16;
  if (doc.subtitle) {
    pdf.setFontSize(10);
    pdf.text(doc.subtitle, MARGIN + 8, metaY);
    pdf.setFontSize(8.5);
    metaY += 6;
  }
  pdf.text(`${labels.reference}: ${doc.reference}`, MARGIN + 8, metaY);
  pdf.text(`${labels.issuedOn}: ${doc.issuedOn ? formatCalendarDate(doc.issuedOn) : PLACEHOLDER}`, width - MARGIN - 5, y + 9, { align: "right" });
  if (doc.dueOn) {
    pdf.text(
      `${doc.kind === "invoice" ? labels.dueOn : labels.validUntil}: ${formatCalendarDate(doc.dueOn)}`,
      width - MARGIN - 5,
      y + 16,
      { align: "right" },
    );
  }
  if (doc.version != null || doc.status) {
    const left = doc.version != null ? `${labels.version}: ${doc.version}` : "";
    const right = doc.status ? `${labels.status}: ${doc.status}` : "";
    if (left) pdf.text(left, MARGIN + 8, metaY + 6);
    if (right) pdf.text(right, width - MARGIN - 5, metaY + 6, { align: "right" });
  }
  y += titleHeight + 8;
  setText();

  const ensure = (space: number) => {
    if (y + space > contentBottom) newContentPage();
  };

  /** Section heading with an optional pictogram and the orange rule. */
  const heading = (title: string, icon?: DocumentIcon) => {
    y += 10;
    ensure(16);
    if (icon) drawIcon(pdf, icon, MARGIN, y - 3.9, 4.6, BRAND_ORANGE);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    setText(BRAND_NAVY);
    pdf.text(title.toUpperCase(), MARGIN + (icon ? 6.6 : 0), y);
    pdf.setDrawColor(...BRAND_ORANGE);
    pdf.setLineWidth(0.6);
    pdf.line(MARGIN, y + 1.8, width - MARGIN, y + 1.8);
    y += 7;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8.5);
    setText();
  };

  const paragraph = (text: string, size = 8.5) => {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(size);
    setText();
    const lines = pdf.splitTextToSize(text, width - MARGIN * 2) as string[];
    ensure(lines.length * 4.2 + 2);
    pdf.text(lines, MARGIN, y);
    y += lines.length * 4.2;
    pdf.setFontSize(9);
  };

  // ---------------------------------------------------------------- intro
  if (doc.intro) {
    paragraph(doc.intro);
    y += 3;
  }

  // ------------------------------------------------- customer / basis boxes
  if (doc.parties?.length) {
    const gap = 4;
    const boxW = (width - MARGIN * 2 - gap * (doc.parties.length - 1)) / doc.parties.length;
    const bodyRows = Math.max(...doc.parties.map((p) => p.rows.length));
    const boxH = 12 + bodyRows * 4.6;
    ensure(boxH + 4);
    for (const [index, party] of doc.parties.entries()) {
      const bx = MARGIN + index * (boxW + gap);
      pdf.setFillColor(...BRAND_PALE);
      pdf.roundedRect(bx, y, boxW, boxH, 1.5, 1.5, "F");
      pdf.setFillColor(...BRAND_ORANGE);
      pdf.rect(bx, y, 1.4, boxH, "F");
      drawIcon(pdf, party.icon ?? "customer", bx + 4, y + 3.4, 4.2, BRAND_NAVY);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(7.4);
      setText(BRAND_NAVY);
      pdf.text(party.title.toUpperCase(), bx + 10, y + 6.8);
      let py = y + 12.5;
      for (const row of party.rows) {
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8.2);
        setText(BRAND_NAVY);
        const label = row.label ? `${row.label} ` : "";
        if (label) pdf.text(label, bx + 4, py);
        setText();
        const labelWidth = label ? (pdf.getTextWidth(label) as number) : 0;
        const value = pdf.splitTextToSize(row.value, boxW - 8 - labelWidth) as string[];
        pdf.text(value, bx + 4 + labelWidth, py);
        py += value.length * 4.6;
      }
    }
    y += boxH + 4;
    pdf.setFontSize(9);
    setText();
  }

  // --------------------------------------------------------- appointments
  if (doc.appointments?.length) {
    heading(doc.appointmentsTitle ?? labels.issuedOn, "calendar");
    pdf.setFillColor(...BRAND_NAVY);
    pdf.roundedRect(MARGIN, y - 4.6, width - MARGIN * 2, 7, 1, 1, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(7.6);
    pdf.setTextColor(255, 255, 255);
    pdf.text(labels.description.toUpperCase(), MARGIN + 3, y);
    pdf.text((labels.dateColumn ?? labels.issuedOn).toUpperCase(), MARGIN + 60, y);
    pdf.text((labels.startColumn ?? "").toUpperCase(), width - MARGIN - 3, y, { align: "right" });
    y += 6.6;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8.5);
    for (const [index, item] of doc.appointments.entries()) {
      ensure(6);
      if (index % 2 === 1) {
        pdf.setFillColor(...BRAND_PALE);
        pdf.rect(MARGIN, y - 3.8, width - MARGIN * 2, 5.6, "F");
      }
      drawIcon(pdf, item.icon ?? "clock", MARGIN + 2, y - 3.2, 3.6, BRAND_ORANGE);
      setText(BRAND_NAVY);
      pdf.setFont("helvetica", "bold");
      pdf.text(item.label, MARGIN + 7.5, y);
      pdf.setFont("helvetica", "normal");
      setText();
      pdf.text(formatCalendarDate(item.date), MARGIN + 60, y);
      pdf.text(item.time, width - MARGIN - 3, y, { align: "right" });
      y += 5.6;
    }
    pdf.setFontSize(9);
  }

  // ------------------------------------------------------------- locations
  if (doc.locations?.length) {
    heading(doc.locationsTitle ?? "", "route");
    const gap = 4;
    const boxW = (width - MARGIN * 2 - gap * (doc.locations.length - 1)) / doc.locations.length;
    const rows = Math.max(...doc.locations.map((l) => l.details.length));
    const boxH = 15 + rows * 4.4;
    ensure(boxH + 3);
    for (const [index, place] of doc.locations.entries()) {
      const bx = MARGIN + index * (boxW + gap);
      pdf.setDrawColor(...BRAND_LINE);
      pdf.setLineWidth(0.4);
      pdf.roundedRect(bx, y - 3, boxW, boxH, 1.5, 1.5);
      drawIcon(pdf, place.icon ?? "pin", bx + 3.5, y + 0.4, 4.2, BRAND_ORANGE);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(7.4);
      setText(BRAND_NAVY);
      pdf.text(place.title.toUpperCase(), bx + 9.5, y + 3.8);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8.4);
      setText();
      const address = pdf.splitTextToSize(place.address, boxW - 7) as string[];
      pdf.text(address, bx + 3.5, y + 9.5);
      let ly = y + 9.5 + address.length * 4.2;
      pdf.setFontSize(7.8);
      setText(BRAND_NAVY);
      for (const detail of place.details) {
        const text = pdf.splitTextToSize(detail, boxW - 7) as string[];
        pdf.text(text, bx + 3.5, ly);
        ly += text.length * 4;
      }
    }
    y += boxH + 2;
    pdf.setFontSize(9);
    setText();
  }


  // ------------------------------------------------------------ key figures
  if (doc.facts?.length) {
    const perRow = 3;
    const cellW = (width - MARGIN * 2) / perRow;
    const rows = Math.ceil(doc.facts.length / perRow);
    ensure(rows * 14 + 4);
    for (const [index, fact] of doc.facts.entries()) {
      const cx = MARGIN + (index % perRow) * cellW;
      const cy = y + Math.floor(index / perRow) * 14;
      pdf.setFillColor(...BRAND_PALE);
      pdf.rect(cx + 0.6, cy, cellW - 1.2, 13, "F");
      pdf.setFillColor(...BRAND_ORANGE);
      pdf.rect(cx + 0.6, cy, 1.2, 13, "F");
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(6.8);
      setText(BRAND_NAVY);
      pdf.text(fact.label.toUpperCase(), cx + 4, cy + 5);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9.5);
      setText();
      pdf.text(fact.value, cx + 4, cy + 10.5);
    }
    y += rows * 14 + 6;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
  }


  if (doc.priceTitle) heading(doc.priceTitle, "price");

  const posX = MARGIN + 3;
  const descX = MARGIN + (labels.position ? 13 : 3);
  const cols: [number, number, number, number] = [MARGIN, width - MARGIN - 78, width - MARGIN - 52, width - MARGIN];
  // The head is drawn from a function so it repeats on every continuation
  // page — a price table that breaks without its head is unreadable.
  const lineTableHead = () => {
    pdf.setFillColor(...BRAND_NAVY);
    pdf.roundedRect(MARGIN, y - 5, width - MARGIN * 2, 8, 1, 1, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8.5);
    pdf.setTextColor(255, 255, 255);
    if (labels.position) pdf.text(labels.position, posX, y);
    pdf.text(labels.description, descX, y);
    pdf.text(labels.quantity, cols[1], y, { align: "right" });
    pdf.text(labels.unitPrice, cols[2], y, { align: "right" });
    pdf.text(labels.lineNet, cols[3] - 3, y, { align: "right" });
    y += 7;
    pdf.setFont("helvetica", "normal");
    setText();
  };
  lineTableHead();

  for (const [index, line] of doc.lines.entries()) {
    const text = pdf.splitTextToSize(line.description || "—", cols[1] - descX - 6) as string[];
    const rowHeight = Math.max(7, text.length * 4.5 + 2);
    if (y + rowHeight > contentBottom) {
      newContentPage();
      y += 5;
      lineTableHead();
    }
    if (index % 2 === 1) {
      pdf.setFillColor(...BRAND_PALE);
      pdf.rect(MARGIN, y - 4, width - MARGIN * 2, rowHeight, "F");
    }
    if (labels.position) {
      setText(BRAND_NAVY);
      pdf.text(String(index + 1), posX, y);
      setText();
    }
    pdf.text(text, descX, y);
    pdf.text(line.quantity.toLocaleString("de-CH"), cols[1], y, { align: "right" });
    pdf.text(money(line.unitPrice, doc.currency), cols[2], y, { align: "right" });
    pdf.text(money(line.net, doc.currency), cols[3] - 3, y, { align: "right" });
    y += rowHeight;
  }

  // --------------------------------------------------------------- totals
  const vatLabel = labels.vat.replace(/\s*[\d.,]+\s*%\s*$/, "").trim();
  if (doc.summary?.length) {
    // Commercial summary in the agreed format: subtotal, discount, net, VAT,
    // gross — each row exactly as the caller calculated it.
    heading(doc.summaryTitle ?? labels.total, "summary");
    for (const [index, row] of doc.summary.entries()) {
      ensure(7);
      const rowH = row.emphasis ? 7.4 : 5.8;
      if (row.emphasis) {
        pdf.setFillColor(...BRAND_NAVY);
        pdf.roundedRect(MARGIN, y - 4.4, width - MARGIN * 2, rowH, 1, 1, "F");
        pdf.setTextColor(255, 255, 255);
        pdf.setFont("helvetica", "bold");
      } else {
        if (index % 2 === 1) {
          pdf.setFillColor(...BRAND_PALE);
          pdf.rect(MARGIN, y - 3.9, width - MARGIN * 2, rowH, "F");
        }
        pdf.setFont("helvetica", "normal");
        setText(row.negative ? BRAND_ORANGE : TEXT);
      }
      pdf.text(row.label, MARGIN + 3, y);
      pdf.text(row.value, width - MARGIN - 3, y, { align: "right" });
      y += rowH;
      setText();
    }
    pdf.setFontSize(9);
  } else {
    if (y + 29 > contentBottom) newContentPage();
    y += 3;
    pdf.setDrawColor(...BRAND_ORANGE);
    pdf.setLineWidth(0.7);
    pdf.line(width / 2, y, width - MARGIN, y);
    y += 6;
    const totalRow = (label: string, value: string, bold = false) => {
      pdf.setFont("helvetica", bold ? "bold" : "normal");
      setText(bold ? BRAND_NAVY : TEXT);
      pdf.text(label, width - MARGIN - 52, y, { align: "right" });
      pdf.text(value, width - MARGIN, y, { align: "right" });
      y += 5;
    };
    totalRow(labels.net, money(doc.net, doc.currency));
    // The translated label may already carry a rate; the printed rate is
    // always the one this document was calculated with.
    totalRow(`${vatLabel} ${(doc.vatRate * 100).toFixed(1)} %`, money(doc.vat, doc.currency));
    totalRow(labels.total, money(doc.total, doc.currency), true);
  }

  for (const note of doc.summaryNotes ?? []) {
    pdf.setFont("helvetica", "italic");
    pdf.setFontSize(7.6);
    setText(BRAND_NAVY);
    const text = pdf.splitTextToSize(note, width - MARGIN * 2) as string[];
    ensure(text.length * 3.8 + 3);
    y += 3;
    pdf.text(text, MARGIN, y);
    y += text.length * 3.8;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    setText();
  }


  if (doc.issuer.pending.length) {
    pdf.setFont("helvetica", "italic");
    pdf.setFontSize(8);
    const pendingText = pdf.splitTextToSize(
      `${labels.pendingNote}: ${doc.issuer.pending.join(", ")}`,
      width - MARGIN * 2,
    ) as string[];
    if (y + 4 + pendingText.length * 4 > contentBottom) newContentPage();
    pdf.text(pendingText, MARGIN, y + 4);
    // Keep the following notes clear of this line instead of printing over it.
    y += pendingText.length * 4 + 1;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
  }

  for (const note of doc.notes) {
    y += 8;
    const text = pdf.splitTextToSize(note, width - MARGIN * 2) as string[];
    if (y + text.length * 4 > contentBottom) newContentPage();
    pdf.setFillColor(...BRAND_PALE);
    pdf.roundedRect(MARGIN, y - 5, width - MARGIN * 2, text.length * 4 + 7, 1.5, 1.5, "F");
    setText();
    pdf.text(text, MARGIN, y);
    y += text.length * 4;
  }

  // --------------------------------------------------------- scope of work
  if (doc.mandatoryQuoteFormat && doc.kind !== "invoice") beginRequiredPage(2);
  for (const block of doc.scopeBlocks ?? []) {
    const body = block.body.filter((line) => line.trim());
    if (!body.length) continue;
    heading(block.title, block.icon ?? "scope");
    for (const line of body) paragraph(line, 8.4);
    y += 1;
  }

  // ------------------------------------------------------- detail sections
  for (const section of doc.sections ?? []) {
    const rows = section.rows.filter((r) => (r.value ?? "").trim());
    if (!rows.length) continue;
    heading(section.title, section.icon ?? "list");
    for (const rowItem of rows) {
      const valueX = MARGIN + 44;
      pdf.setFont("helvetica", "normal");
      // Long labels (e.g. French/Italian) wrap inside their column instead of
      // running into the value.
      const label = pdf.splitTextToSize(rowItem.label, valueX - MARGIN - 3) as string[];
      const text = pdf.splitTextToSize(rowItem.value, width - MARGIN - valueX) as string[];
      const lines = Math.max(label.length, text.length);
      ensure(lines * 4.2 + 3);
      setText(BRAND_NAVY);
      pdf.text(label, MARGIN, y);
      setText();
      pdf.text(text, valueX, y);
      y += lines * 4.2 + 2;
    }
    pdf.setFontSize(9);
  }

  // ------------------------------------------------------------- schedules
  // Each service day is its own dated section; a single `schedule` is still
  // accepted so older callers keep printing exactly as before.
  const schedulePlans =
    doc.schedules?.filter((plan) => plan.rows.length) ??
    (doc.schedule?.length ? [{ title: doc.scheduleTitle ?? "", rows: doc.schedule }] : []);
  for (const plan of schedulePlans) {
    heading(plan.title, "clock");
    for (const [index, step] of plan.rows.entries()) {
      ensure(6);
      if (index % 2 === 1) {
        pdf.setFillColor(...BRAND_PALE);
        pdf.rect(MARGIN, y - 3.6, width - MARGIN * 2, 5.4, "F");
      }
      pdf.setFont("helvetica", "bold");
      setText(BRAND_NAVY);
      pdf.text(step.time, MARGIN + 2, y);
      pdf.setFont("helvetica", "normal");
      setText();
      pdf.text(step.label, MARGIN + 22, y);
      pdf.text(step.duration, width - MARGIN - 2, y, { align: "right" });
      y += 5.4;
    }
    pdf.setFontSize(9);
  }


  // ----------------------------------------------------- hourly effort proof
  if (doc.effort?.rows.length) {
    heading(doc.effort.title, doc.effort.icon ?? "minimum");
    for (const [index, rowItem] of doc.effort.rows.entries()) {
      ensure(6);
      if (index % 2 === 1) {
        pdf.setFillColor(...BRAND_PALE);
        pdf.rect(MARGIN, y - 3.6, width - MARGIN * 2, 5.4, "F");
      }
      setText(BRAND_NAVY);
      pdf.text(rowItem.label, MARGIN + 2, y);
      setText();
      pdf.text(rowItem.value, width - MARGIN - 2, y, { align: "right" });
      y += 5.4;
    }
    pdf.setFontSize(9);
  }

  // ------------------------------------------------------- optional services
  if (doc.options?.length) {
    heading(labels.optionsTitle, "options");
    for (const [index, option] of doc.options.entries()) {
      const text = pdf.splitTextToSize(option.description, width - MARGIN * 2 - 82) as string[];
      const rowHeight = Math.max(6, text.length * 4.4 + 1.6);
      ensure(rowHeight);
      if (index % 2 === 1) {
        pdf.setFillColor(...BRAND_PALE);
        pdf.rect(MARGIN, y - 3.8, width - MARGIN * 2, rowHeight, "F");
      }
      // Tick box: the customer marks the options they want, which is what
      // creates the next version of the offer.
      pdf.setDrawColor(...BRAND_NAVY);
      pdf.setLineWidth(0.3);
      pdf.rect(MARGIN + 2, y - 3, 3.2, 3.2);
      if (option.selected) drawIcon(pdf, "check", MARGIN + 1.9, y - 3.1, 3.4, BRAND_ORANGE);
      setText();
      pdf.text(text, MARGIN + 8, y);
      pdf.text(
        option.priceLabel ?? (option.amount == null ? PLACEHOLDER : money(option.amount, doc.currency)),
        width - MARGIN - 34,
        y,
        { align: "right" },
      );
      setText(option.selected ? BRAND_NAVY : BRAND_ORANGE);
      pdf.text(option.selected ? labels.optionSelected : labels.optionNotSelected, width - MARGIN - 2, y, {
        align: "right",
      });
      y += rowHeight;
    }
    setText();
    const note = pdf.splitTextToSize(labels.optionsNote, width - MARGIN * 2) as string[];
    ensure(note.length * 4 + 3);
    pdf.setFont("helvetica", "italic");
    pdf.setFontSize(8);
    pdf.text(note, MARGIN, y + 2);
    y += note.length * 4 + 2;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
  }

  // ----------------------------------------------------- minimum billing note
  if (doc.minimumNote) {
    const text = pdf.splitTextToSize(doc.minimumNote, width - MARGIN * 2 - 8) as string[];
    y += 10;
    ensure(text.length * 4.2 + 14);
    pdf.setFillColor(...BRAND_PALE);
    pdf.roundedRect(MARGIN, y - 5, width - MARGIN * 2, text.length * 4.2 + 12, 1.5, 1.5, "F");
    pdf.setFillColor(...BRAND_ORANGE);
    pdf.rect(MARGIN, y - 5, 1.6, text.length * 4.2 + 12, "F");
    drawIcon(pdf, "minimum", MARGIN + 4.6, y - 3.6, 4, BRAND_ORANGE);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8.5);
    setText(BRAND_NAVY);
    pdf.text(labels.minimumTitle.toUpperCase(), MARGIN + 10.6, y);
    pdf.setFont("helvetica", "normal");
    setText();
    pdf.text(text, MARGIN + 5, y + 5.5);
    y += text.length * 4.2 + 9;
    pdf.setFontSize(9);
  }

  // ------------------------------------------------------------- acceptance
  if (doc.acceptance) {
    // Keep heading, statement and signature lines on one page — a signature
    // block split across pages is not usable.
    if (y + 62 > contentBottom) newContentPage();
    heading(labels.acceptanceTitle, "signature");
    ensure(38);
    const half = (width - MARGIN * 2) / 2;
    const sign = (label: string, x: number) => {
      pdf.setDrawColor(...BRAND_LINE);
      pdf.setLineWidth(0.4);
      pdf.line(x, y + 12, x + half - 8, y + 12);
      pdf.setFontSize(7.5);
      setText(BRAND_NAVY);
      pdf.text(label, x, y + 16);
      pdf.setFontSize(8.5);
      setText();
    };
    if (doc.acceptanceStatement) {
      pdf.setDrawColor(...BRAND_NAVY);
      pdf.setLineWidth(0.3);
      pdf.rect(MARGIN, y - 3, 3.4, 3.4);
      const statement = pdf.splitTextToSize(doc.acceptanceStatement, width - MARGIN * 2 - 8) as string[];
      pdf.text(statement, MARGIN + 6, y);
      y += statement.length * 4.2 + 2;
    }
    const bound = [
      doc.version != null
        ? (labels.acceptanceVersionLine
            ? `${labels.acceptanceVersionLine} ${doc.version}`
            : `${labels.version}: ${doc.version}`)
        : "",
      `${labels.reference}: ${doc.reference}`,
    ]
      .filter(Boolean)
      .join("   ·   ");
    setText(BRAND_NAVY);
    pdf.text(bound, MARGIN, y);
    setText();
    y += 4;
    sign(labels.acceptancePlaceDate, MARGIN);
    sign(labels.acceptanceSignature, MARGIN + half);
    y += 22;
    if (doc.acceptanceContact) {
      const contact = pdf.splitTextToSize(doc.acceptanceContact, width - MARGIN * 2) as string[];
      ensure(contact.length * 4 + 3);
      pdf.setFontSize(7.8);
      setText(BRAND_NAVY);
      pdf.text(contact, MARGIN, y);
      y += contact.length * 4;
      setText();
    }
    pdf.setFontSize(9);
  }

  // ------------------------------------------------------- contract terms
  if (doc.terms?.length) {
    if (doc.mandatoryQuoteFormat && doc.kind !== "invoice") beginRequiredPage(3);
    heading(doc.termsTitle ?? "", "terms");
    if (doc.termsSubtitle) {
      paragraph(doc.termsSubtitle, 8);
      y += 2;
    }
    for (const block of doc.terms) {
      const body = block.body.filter((line) => line.trim());
      if (!body.length && !block.title) continue;
      ensure(10);
      y += 3;
      if (block.icon) drawIcon(pdf, block.icon, MARGIN, y - 3.2, 4, BRAND_ORANGE);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(8.3);
      setText(BRAND_NAVY);
      pdf.text(block.title, MARGIN + (block.icon ? 6 : 0), y);
      y += 4.4;
      pdf.setFont("helvetica", "normal");
      setText();
      for (const line of body) paragraph(line, 8);
    }
  }

  // ------------------------------------------------------------- extra QR
  if (doc.qr) {
    y += 10;
    ensure(40);
    const box = 30;
    pdf.setFillColor(...BRAND_PALE);
    pdf.roundedRect(MARGIN, y - 4, width - MARGIN * 2, box + 8, 1.5, 1.5, "F");
    pdf.addImage(doc.qr.dataUrl, "PNG", MARGIN + 4, y, box, box, undefined, "FAST");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9.5);
    setText(BRAND_NAVY);
    pdf.text(doc.qr.title, MARGIN + box + 10, y + 8);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8.2);
    setText();
    const caption = pdf.splitTextToSize(doc.qr.caption, width - MARGIN * 2 - box - 16) as string[];
    pdf.text(caption, MARGIN + box + 10, y + 14);
    y += box + 8;
    pdf.setFontSize(9);
  }


  // --------------------------------------------------- QR payment part
  // The Swiss QR payment part keeps its standardised left-to-right layout.
  if (doc.payment) {
    if (rtl) await rtl.suspend(() => drawPaymentPart(pdf, doc, labels));
    else await drawPaymentPart(pdf, doc, labels);
  }

  footer();
  stampPageNumbers();

  return pdf.output("blob");
}

type Pdf = Awaited<ReturnType<typeof import("jspdf").jsPDF.prototype.output>> extends never
  ? never
  : InstanceType<typeof import("jspdf").jsPDF>;

async function drawPaymentPart(pdf: Pdf, doc: DocumentModel, labels: PdfLabels) {
  const payment = doc.payment;
  if (!payment) return;
  const width = pdf.internal.pageSize.getWidth();
  const height = pdf.internal.pageSize.getHeight();
  const top = height - 105;

  pdf.setDrawColor(...BRAND_NAVY);
  pdf.setLineDashPattern([1, 1], 0);
  pdf.line(0, top, width, top);
  pdf.setLineDashPattern([], 0);

  let y = top + 10;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);
  pdf.setTextColor(...BRAND_NAVY);
  pdf.text(labels.paymentPart, MARGIN, y);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  y += 8;

  // The QR square is drawn as an empty, clearly marked frame until the
  // creditor is configured. A scannable code with invalid payment data would
  // be paid into nothing, so it is never produced from placeholders.
  const box = 46;
  pdf.setDrawColor(...BRAND_ORANGE);
  pdf.setLineWidth(0.7);
  pdf.rect(MARGIN, y, box, box);
  if (payment.state === "configured") {
    const dataUrl = await swissQrDataUrl({
      creditor: payment.creditor,
      amount: payment.amount,
      currency: payment.currency,
      reference: payment.reference,
      ...(payment.debtor ? { debtor: payment.debtor } : {}),
    });
    pdf.addImage(dataUrl, "PNG", MARGIN + 1, y + 1, box - 2, box - 2, undefined, "FAST");
  } else {
    const text = pdf.splitTextToSize(labels.notConfiguredBody, box - 6) as string[];
    pdf.setFont("helvetica", "bold");
    pdf.text(labels.notConfigured, MARGIN + 3, y + 8);
    pdf.setFont("helvetica", "normal");
    pdf.text(text, MARGIN + 3, y + 14);
  }

  let ty = y + 4;
  const col = MARGIN + box + 8;
  const field = (label: string, value: string) => {
    pdf.setFont("helvetica", "bold");
    pdf.text(label, col, ty);
    pdf.setFont("helvetica", "normal");
    ty += 4;
    const text = pdf.splitTextToSize(value, width - col - MARGIN) as string[];
    pdf.text(text, col, ty);
    ty += text.length * 4 + 2;
  };

  field(
    labels.account,
    payment.creditor.qrIban ? formatIban(payment.creditor.qrIban) : labels.notConfigured,
  );
  field(
    labels.creditor,
    [payment.creditor.name, payment.creditor.addressLine, `${payment.creditor.postalCode ?? ""} ${payment.creditor.city ?? ""}`.trim()]
      .filter(Boolean)
      .join(", ") || labels.notConfigured,
  );
  field(labels.paymentReference, payment.referenceFormatted);
  field(labels.amount, money(payment.amount, payment.currency));
}

export function downloadPdf(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
