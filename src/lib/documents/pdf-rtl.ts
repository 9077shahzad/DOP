/**
 * Arabic support for jsPDF documents.
 *
 * The built-in PDF fonts carry no Arabic glyphs, so Arabic documents embed
 * Vazirmatn (Arabic + Latin, SIL OFL). jsPDF's own Arabic parser shapes the
 * letters; its bidi engine reorders each line from logical to visual order.
 * The page layout is mirrored horizontally so the document reads right to
 * left, except where the caller suspends it (the Swiss QR payment part keeps
 * its standardised left-to-right layout).
 */
import type { jsPDF } from "jspdf";

const ARABIC = /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/;

/** Replaces undrawable spaces with plain spaces and drops invisible bidi marks. */
export function cleanPdfText(value: string): string {
  return value.replace(/[\u00A0\u2007\u202F]/g, " ").replace(/[\u200E\u200F\u061C\u202A-\u202E\u2066-\u2069]/g, "");
}

export function isArabicText(value: string): boolean {
  return ARABIC.test(value);
}

const FAMILY = "Vazirmatn";
let fontData: Promise<{ regular: string; bold: string }> | null = null;

async function base64(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`font ${url} ${response.status}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

function loadFonts() {
  fontData ??= Promise.all([base64("/fonts/Vazirmatn-Regular.ttf"), base64("/fonts/Vazirmatn-Bold.ttf")]).then(
    ([regular, bold]) => ({ regular, bold }),
  );
  return fontData;
}

/** Mirror x so a left-to-right layout reads right to left. */
export function mirrorX(x: number, pageWidth: number, objectWidth = 0): number {
  return pageWidth - x - objectWidth;
}

/** Text alignment after mirroring the page. */
export function mirrorAlign(align: string | undefined): "left" | "right" | "center" | "justify" {
  if (align === "right") return "left";
  if (align === "center" || align === "justify") return align;
  return "right";
}

export type RtlControl = { suspend: <T>(draw: () => Promise<T> | T) => Promise<T> };

/**
 * Embed the Arabic font and mirror every drawing call on this document.
 * Returns a control to draw sections that must stay left to right.
 */
export async function enableRtl(pdf: jsPDF): Promise<RtlControl> {
  const fonts = await loadFonts();
  pdf.addFileToVFS("Vazirmatn-Regular.ttf", fonts.regular);
  pdf.addFont("Vazirmatn-Regular.ttf", FAMILY, "normal");
  pdf.addFileToVFS("Vazirmatn-Bold.ttf", fonts.bold);
  pdf.addFont("Vazirmatn-Bold.ttf", FAMILY, "bold");

  const width = () => pdf.internal.pageSize.getWidth();
  let mirror = true;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = pdf as any;
  const orig = {
    setFont: p.setFont.bind(pdf),
    text: p.text.bind(pdf),
    rect: p.rect.bind(pdf),
    roundedRect: p.roundedRect.bind(pdf),
    line: p.line.bind(pdf),
    circle: p.circle.bind(pdf),
    ellipse: p.ellipse.bind(pdf),
    triangle: p.triangle.bind(pdf),
    addImage: p.addImage.bind(pdf),
  };

  p.setFont = (_family: string, style?: string, weight?: string | number) =>
    orig.setFont(FAMILY, style && /bold/i.test(style) ? "bold" : "normal", weight);
  orig.setFont(FAMILY, "normal");

  p.text = (text: string | string[], x: number, y: number, options?: Record<string, unknown>, transform?: unknown) => {
    // Only lines with Arabic letters are reordered; Latin-only lines
    // (addresses, amounts, references) keep their natural order.
    const arabic = isArabicText(Array.isArray(text) ? text.join(" ") : String(text));
    const bidi = arabic ? { isInputVisual: false, isOutputVisual: true, isInputRtl: true, isOutputRtl: false, isSymmetricSwapping: true } : {};
    const opts = { ...(options ?? {}), ...bidi };
    if (!mirror) return orig.text(text, x, y, opts, transform);
    return orig.text(text, mirrorX(x, width()), y, { ...opts, align: mirrorAlign(options?.["align"] as string | undefined) }, transform);
  };
  p.rect = (x: number, y: number, w: number, h: number, style?: string | null) =>
    orig.rect(mirror ? mirrorX(x, width(), w) : x, y, w, h, style);
  p.roundedRect = (x: number, y: number, w: number, h: number, rx: number, ry: number, style?: string | null) =>
    orig.roundedRect(mirror ? mirrorX(x, width(), w) : x, y, w, h, rx, ry, style);
  p.line = (x1: number, y1: number, x2: number, y2: number, style?: string | null) =>
    mirror ? orig.line(mirrorX(x1, width()), y1, mirrorX(x2, width()), y2, style) : orig.line(x1, y1, x2, y2, style);
  p.circle = (x: number, y: number, r: number, style?: string | null) =>
    orig.circle(mirror ? mirrorX(x, width()) : x, y, r, style);
  p.ellipse = (x: number, y: number, rx: number, ry: number, style?: string | null) =>
    orig.ellipse(mirror ? mirrorX(x, width()) : x, y, rx, ry, style);
  p.triangle = (x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, style?: string | null) =>
    mirror
      ? orig.triangle(mirrorX(x1, width()), y1, mirrorX(x2, width()), y2, mirrorX(x3, width()), y3, style)
      : orig.triangle(x1, y1, x2, y2, x3, y3, style);
  p.addImage = (...args: unknown[]) => {
    // addImage(imageData, format, x, y, w, h, ...)
    if (mirror && typeof args[2] === "number" && typeof args[4] === "number") {
      args[2] = mirrorX(args[2] as number, width(), args[4] as number);
    }
    return orig.addImage(...args);
  };

  return {
    async suspend(draw) {
      mirror = false;
      try {
        return await draw();
      } finally {
        mirror = true;
      }
    },
  };
}
