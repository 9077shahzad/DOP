/** Result of one live DNS lookup. Client-safe: shared by the checker and the UI. */
export type DnsCheck = {
  label: string;
  hostname: string;
  type: "MX" | "TXT";
  /** ok = a record matching the requirement is published. */
  status: "ok" | "missing" | "error";
  records: string[];
  detail: string;
};
