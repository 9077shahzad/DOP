/** Customer acceptance, never a workflow label or staff override, permits conversion. */
export function hasCurrentCustomerAcceptance(quote: {
  accepted_at: string | null;
  accepted_version: number | null;
  version: number | null;
}): boolean {
  return Boolean(quote.accepted_at && quote.accepted_version != null && quote.accepted_version === quote.version);
}