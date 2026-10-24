/**
 * Review invitation settings.
 *
 * Three owner decisions live here: whether invitations go out after a job is
 * verified, the public Google review link, and the star rating from which a
 * customer is shown that link. Below the threshold the feedback stays with the
 * office. Nothing is prefilled — with no link stored, the public review page
 * simply thanks the customer.
 */
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { supabase } from "@/integrations/supabase/client";

const inputClass =
  "w-full border border-line bg-canvas px-3 py-2 text-sm text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

export function ReviewSettingsCard() {
  const { t } = useTranslation("admin");
  const s = (key: string) => t(`settings.reviews.${key}`);
  const [enabled, setEnabled] = useState(false);
  const [url, setUrl] = useState("");
  const [threshold, setThreshold] = useState(4);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void supabase
      .from("review_settings")
      .select("enabled, google_review_url, low_rating_threshold")
      .eq("id", "default")
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        setEnabled(Boolean(data.enabled));
        setUrl(data.google_review_url ?? "");
        setThreshold(Number(data.low_rating_threshold ?? 4));
      });
  }, []);

  async function save() {
    setBusy(true);
    setError(null);
    setNotice(null);
    const trimmed = url.trim();
    if (trimmed && !/^https:\/\//i.test(trimmed)) {
      setError(s("invalidUrl"));
      setBusy(false);
      return;
    }
    const { error: err } = await supabase
      .from("review_settings")
      .update({
        enabled,
        google_review_url: trimmed,
        low_rating_threshold: threshold,
        updated_at: new Date().toISOString(),
      })
      .eq("id", "default");
    setBusy(false);
    if (err) setError(err.message);
    else setNotice(s("saved"));
  }

  return (
    <section className="mt-10 border border-line p-5">
      <h2 className="text-lg font-semibold tracking-tight">{s("title")}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{s("subtitle")}</p>

      {error ? <p role="alert" className="mt-4 border-l-4 border-destructive px-3 py-2 text-sm text-destructive">{error}</p> : null}
      {notice ? <p role="status" className="mt-4 border-l-4 border-primary px-3 py-2 text-sm text-ink-2">{notice}</p> : null}

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <label className="flex items-center gap-3 text-sm text-ink">
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
          {s("enabled")}
        </label>
        <label className="block">
          <span className="label-mono text-soft">{s("threshold")}</span>
          <select className={`${inputClass} mt-2`} value={threshold} onChange={(e) => setThreshold(Number(e.target.value))}>
            {[3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <label className="block sm:col-span-2">
          <span className="label-mono text-soft">{s("url")}</span>
          <input
            className={`${inputClass} mt-2`}
            value={url}
            placeholder="https://g.page/r/…"
            onChange={(e) => setUrl(e.target.value)}
          />
          <span className="mt-1 block text-xs text-soft">{s("urlHint")}</span>
        </label>
      </div>

      <div className="mt-5">
        <button
          type="button"
          disabled={busy}
          onClick={() => void save()}
          className="border border-primary bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-60"
        >
          {s("save")}
        </button>
      </div>
    </section>
  );
}
