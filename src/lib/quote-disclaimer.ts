/**
 * "Automatisch berechnete Schätzung. Endpreis nach Überprüfung." belongs only
 * on the planner's automatic estimate. Once staff have revised (version > 1)
 * or released the offer, the document is the reviewed offer and must not
 * call itself an estimate; an order never does.
 */
export function isEstimateDocument(opts: { documentKind?: "quote" | "order"; status?: string | undefined; version?: number | undefined }): boolean {
  if (opts.documentKind === "order") return false;
  if ((opts.version ?? 1) > 1) return false;
  return !opts.status || opts.status === "new" || opts.status === "draft";
}
