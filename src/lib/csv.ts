/**
 * CSV export. Audit exports are produced in the browser from the same
 * RLS-scoped query the screen already ran — no separate export endpoint that
 * could hand out rows the viewer may not read.
 */

function cell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const text =
    typeof value === "object" ? JSON.stringify(value) : String(value);
  // Excel-safe: neutralise formula injection, quote everything.
  const guarded = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${guarded.replace(/"/g, '""')}"`;
}

export type CsvColumn<T> = { key: string; value: (row: T) => unknown };

export function toCsv<T>(rows: readonly T[], columns: readonly CsvColumn<T>[]): string {
  const head = columns.map((c) => cell(c.key)).join(";");
  const body = rows.map((row) => columns.map((c) => cell(c.value(row))).join(";"));
  // BOM so Excel on Windows reads UTF-8 umlauts correctly.
  return `\uFEFF${[head, ...body].join("\r\n")}\r\n`;
}

export function downloadCsv(filename: string, csv: string): void {
  if (typeof window === "undefined") return;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function stampedName(prefix: string): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${prefix}-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}.csv`;
}
