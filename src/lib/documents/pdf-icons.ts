/**
 * Vector pictograms for the printed documents.
 *
 * Drawn with jsPDF primitives instead of an icon font: no extra embedded font,
 * no rasterisation, and the strokes stay crisp at any print resolution. Every
 * glyph is drawn inside a square box of `size` millimetres anchored at (x, y).
 */
export type DocumentIcon =
  | "customer"
  | "contact"
  | "calendar"
  | "clock"
  | "route"
  | "pin"
  | "truck"
  | "clean"
  | "box"
  | "price"
  | "summary"
  | "options"
  | "minimum"
  | "signature"
  | "qr"
  | "info"
  | "scope"
  | "terms"
  | "bank"
  | "check"
  | "list";

type Rgb = [number, number, number];

// Minimal structural type: keeps this module free of a jsPDF import at build
// time while still type-checking every call we make.
type Canvas = {
  setDrawColor: (r: number, g: number, b: number) => unknown;
  setFillColor: (r: number, g: number, b: number) => unknown;
  setLineWidth: (w: number) => unknown;
  line: (x1: number, y1: number, x2: number, y2: number) => unknown;
  rect: (x: number, y: number, w: number, h: number, style?: string) => unknown;
  roundedRect: (x: number, y: number, w: number, h: number, rx: number, ry: number, style?: string) => unknown;
  circle: (x: number, y: number, r: number, style?: string) => unknown;
  triangle: (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    x3: number,
    y3: number,
    style?: string,
  ) => unknown;
};

export function drawIcon(pdf: Canvas, name: DocumentIcon, x: number, y: number, size: number, color: Rgb) {
  const s = size;
  const cx = x + s / 2;
  const cy = y + s / 2;
  pdf.setDrawColor(...color);
  pdf.setFillColor(...color);
  pdf.setLineWidth(Math.max(0.22, s * 0.075));

  switch (name) {
    case "customer": {
      pdf.circle(cx, y + s * 0.32, s * 0.19);
      pdf.line(x + s * 0.14, y + s * 0.92, x + s * 0.14, y + s * 0.78);
      pdf.line(x + s * 0.14, y + s * 0.78, x + s * 0.86, y + s * 0.78);
      pdf.line(x + s * 0.86, y + s * 0.78, x + s * 0.86, y + s * 0.92);
      break;
    }
    case "contact": {
      pdf.roundedRect(x + s * 0.24, y + s * 0.08, s * 0.52, s * 0.84, s * 0.12, s * 0.12);
      pdf.line(x + s * 0.4, y + s * 0.78, x + s * 0.6, y + s * 0.78);
      break;
    }
    case "calendar": {
      pdf.roundedRect(x + s * 0.1, y + s * 0.2, s * 0.8, s * 0.7, s * 0.08, s * 0.08);
      pdf.line(x + s * 0.1, y + s * 0.42, x + s * 0.9, y + s * 0.42);
      pdf.line(x + s * 0.3, y + s * 0.08, x + s * 0.3, y + s * 0.26);
      pdf.line(x + s * 0.7, y + s * 0.08, x + s * 0.7, y + s * 0.26);
      break;
    }
    case "clock":
    case "minimum": {
      pdf.circle(cx, cy, s * 0.4);
      pdf.line(cx, cy, cx, cy - s * 0.22);
      pdf.line(cx, cy, cx + s * 0.18, cy + s * 0.06);
      break;
    }
    case "route": {
      pdf.circle(x + s * 0.2, y + s * 0.24, s * 0.13);
      pdf.circle(x + s * 0.8, y + s * 0.76, s * 0.13);
      pdf.line(x + s * 0.2, y + s * 0.4, x + s * 0.2, y + s * 0.62);
      pdf.line(x + s * 0.2, y + s * 0.62, x + s * 0.8, y + s * 0.62);
      break;
    }
    case "pin": {
      pdf.circle(cx, y + s * 0.36, s * 0.26);
      pdf.line(x + s * 0.3, y + s * 0.55, cx, y + s * 0.94);
      pdf.line(x + s * 0.7, y + s * 0.55, cx, y + s * 0.94);
      break;
    }
    case "truck": {
      pdf.rect(x + s * 0.06, y + s * 0.28, s * 0.5, s * 0.4);
      pdf.line(x + s * 0.56, y + s * 0.44, x + s * 0.78, y + s * 0.44);
      pdf.line(x + s * 0.78, y + s * 0.44, x + s * 0.92, y + s * 0.58);
      pdf.line(x + s * 0.92, y + s * 0.58, x + s * 0.92, y + s * 0.68);
      pdf.line(x + s * 0.56, y + s * 0.68, x + s * 0.92, y + s * 0.68);
      pdf.circle(x + s * 0.28, y + s * 0.78, s * 0.1);
      pdf.circle(x + s * 0.76, y + s * 0.78, s * 0.1);
      break;
    }
    case "clean": {
      pdf.circle(x + s * 0.38, y + s * 0.62, s * 0.24);
      pdf.line(x + s * 0.72, y + s * 0.14, x + s * 0.72, y + s * 0.34);
      pdf.line(x + s * 0.62, y + s * 0.24, x + s * 0.82, y + s * 0.24);
      pdf.line(x + s * 0.86, y + s * 0.5, x + s * 0.86, y + s * 0.64);
      pdf.line(x + s * 0.79, y + s * 0.57, x + s * 0.93, y + s * 0.57);
      break;
    }
    case "box": {
      pdf.rect(x + s * 0.12, y + s * 0.26, s * 0.76, s * 0.6);
      pdf.line(x + s * 0.12, y + s * 0.46, x + s * 0.88, y + s * 0.46);
      pdf.line(cx, y + s * 0.26, cx, y + s * 0.46);
      break;
    }
    case "price": {
      pdf.circle(cx, cy, s * 0.4);
      pdf.line(cx, y + s * 0.2, cx, y + s * 0.8);
      pdf.line(x + s * 0.34, y + s * 0.38, x + s * 0.66, y + s * 0.38);
      pdf.line(x + s * 0.34, y + s * 0.62, x + s * 0.66, y + s * 0.62);
      break;
    }
    case "summary": {
      pdf.line(x + s * 0.14, y + s * 0.88, x + s * 0.9, y + s * 0.88);
      pdf.rect(x + s * 0.2, y + s * 0.54, s * 0.16, s * 0.3, "F");
      pdf.rect(x + s * 0.44, y + s * 0.34, s * 0.16, s * 0.5, "F");
      pdf.rect(x + s * 0.68, y + s * 0.18, s * 0.16, s * 0.66, "F");
      break;
    }
    case "options": {
      pdf.rect(x + s * 0.12, y + s * 0.16, s * 0.32, s * 0.32);
      pdf.rect(x + s * 0.12, y + s * 0.56, s * 0.32, s * 0.32);
      pdf.line(x + s * 0.54, y + s * 0.3, x + s * 0.9, y + s * 0.3);
      pdf.line(x + s * 0.54, y + s * 0.7, x + s * 0.9, y + s * 0.7);
      break;
    }
    case "signature": {
      pdf.line(x + s * 0.1, y + s * 0.86, x + s * 0.9, y + s * 0.86);
      pdf.line(x + s * 0.16, y + s * 0.68, x + s * 0.42, y + s * 0.26);
      pdf.line(x + s * 0.42, y + s * 0.26, x + s * 0.56, y + s * 0.68);
      pdf.line(x + s * 0.56, y + s * 0.68, x + s * 0.86, y + s * 0.2);
      break;
    }
    case "qr": {
      pdf.rect(x + s * 0.12, y + s * 0.12, s * 0.3, s * 0.3);
      pdf.rect(x + s * 0.58, y + s * 0.12, s * 0.3, s * 0.3);
      pdf.rect(x + s * 0.12, y + s * 0.58, s * 0.3, s * 0.3);
      pdf.rect(x + s * 0.62, y + s * 0.62, s * 0.1, s * 0.1, "F");
      pdf.rect(x + s * 0.78, y + s * 0.78, s * 0.1, s * 0.1, "F");
      break;
    }
    case "info": {
      pdf.circle(cx, cy, s * 0.4);
      pdf.line(cx, y + s * 0.44, cx, y + s * 0.72);
      pdf.circle(cx, y + s * 0.3, s * 0.045, "F");
      break;
    }
    case "scope": {
      pdf.rect(x + s * 0.14, y + s * 0.14, s * 0.72, s * 0.72);
      pdf.line(x + s * 0.28, y + s * 0.5, x + s * 0.44, y + s * 0.66);
      pdf.line(x + s * 0.44, y + s * 0.66, x + s * 0.74, y + s * 0.3);
      break;
    }
    case "terms": {
      pdf.line(x + s * 0.18, y + s * 0.08, x + s * 0.66, y + s * 0.08);
      pdf.line(x + s * 0.18, y + s * 0.08, x + s * 0.18, y + s * 0.92);
      pdf.line(x + s * 0.18, y + s * 0.92, x + s * 0.82, y + s * 0.92);
      pdf.line(x + s * 0.82, y + s * 0.92, x + s * 0.82, y + s * 0.26);
      pdf.line(x + s * 0.66, y + s * 0.08, x + s * 0.82, y + s * 0.26);
      pdf.line(x + s * 0.3, y + s * 0.46, x + s * 0.7, y + s * 0.46);
      pdf.line(x + s * 0.3, y + s * 0.64, x + s * 0.7, y + s * 0.64);
      break;
    }
    case "bank": {
      pdf.triangle(cx, y + s * 0.12, x + s * 0.1, y + s * 0.36, x + s * 0.9, y + s * 0.36);
      pdf.line(x + s * 0.24, y + s * 0.4, x + s * 0.24, y + s * 0.76);
      pdf.line(cx, y + s * 0.4, cx, y + s * 0.76);
      pdf.line(x + s * 0.76, y + s * 0.4, x + s * 0.76, y + s * 0.76);
      pdf.line(x + s * 0.1, y + s * 0.86, x + s * 0.9, y + s * 0.86);
      break;
    }
    case "check": {
      pdf.circle(cx, cy, s * 0.4);
      pdf.line(x + s * 0.28, y + s * 0.52, x + s * 0.44, y + s * 0.68);
      pdf.line(x + s * 0.44, y + s * 0.68, x + s * 0.74, y + s * 0.32);
      break;
    }
    case "list":
    default: {
      for (const row of [0.24, 0.5, 0.76]) {
        pdf.circle(x + s * 0.16, y + s * row, s * 0.05, "F");
        pdf.line(x + s * 0.32, y + s * row, x + s * 0.9, y + s * row);
      }
      break;
    }
  }
}
