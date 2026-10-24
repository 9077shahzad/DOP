/**
 * Attribution capture. UTM parameters are captured on the LANDING page and kept
 * for the whole session, so a submission three pages later still carries them —
 * attribution collected only at the form is attribution lost.
 */

const KEY = "mf.attribution.v1";

export type Attribution = {
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_term: string;
  utm_content: string;
  gclid: string;
  referrer: string;
  landing_page: string;
};

const EMPTY: Attribution = {
  utm_source: "",
  utm_medium: "",
  utm_campaign: "",
  utm_term: "",
  utm_content: "",
  gclid: "",
  referrer: "",
  landing_page: "",
};

/** Call once on the first client render. Never overwrites an earlier capture. */
export function captureAttribution(): void {
  if (typeof window === "undefined") return;
  try {
    const params = new URLSearchParams(window.location.search);
    const stored = window.sessionStorage.getItem(KEY);
    const hasNewCampaign =
      params.has("utm_source") || params.has("utm_campaign") || params.has("gclid");
    if (stored && !hasNewCampaign) return;

    const next: Attribution = {
      utm_source: params.get("utm_source") ?? "",
      utm_medium: params.get("utm_medium") ?? "",
      utm_campaign: params.get("utm_campaign") ?? "",
      utm_term: params.get("utm_term") ?? "",
      utm_content: params.get("utm_content") ?? "",
      gclid: params.get("gclid") ?? "",
      referrer: document.referrer ?? "",
      landing_page: window.location.pathname + window.location.search,
    };
    window.sessionStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage disabled — attribution is best effort, the record is not */
  }
}

/** Attribution for the current session, empty strings when nothing was captured. */
export function readAttribution(): Attribution {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return EMPTY;
    return { ...EMPTY, ...(JSON.parse(raw) as Partial<Attribution>) };
  } catch {
    return EMPTY;
  }
}
