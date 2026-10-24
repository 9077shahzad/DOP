import { useTranslation } from "react-i18next";

import type { Lang } from "@/i18n/config";
import { formatCurrency } from "@/i18n/format";

export type BookingConsent = {
  acceptedTerms: boolean;
  marketing: boolean;
};

function CheckRow({
  id,
  checked,
  onChange,
  label,
}: {
  id: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <label htmlFor={id} className="flex gap-3 rounded-2xl bg-surface p-4">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 size-5 shrink-0 accent-[var(--color-primary)]"
      />
      <span className="block text-sm text-ink">{label}</span>
    </label>
  );
}

/**
 * Pre-contract legal block — Switzerland only. Swiss law grants no statutory
 * 14-day withdrawal right for distance service contracts, so the customer sees
 * the contractual cancellation policy instead. Marketing consent is always a
 * separate, unticked checkbox, never bundled with accepting the terms.
 */
export function BookingLegal({
  lang,
  consent,
  patch,
  priceLow,
  priceHigh,
}: {
  lang: Lang;
  consent: BookingConsent;
  patch: (next: Partial<BookingConsent>) => void;
  /** Absent when nothing can be priced yet — the legal block still applies. */
  priceLow?: number | undefined;
  priceHigh?: number | undefined;
}) {
  const { t } = useTranslation("legal");

  return (
    <section className="mt-8 border-t border-line pt-6">
      <h3 className="text-lg">{t("booking.title")}</h3>

      <p className="data-mono mt-5 rounded-2xl bg-surface p-4 text-sm text-ink">
        {priceLow != null && priceHigh != null
          ? t("booking.priceInfo", {
              low: formatCurrency(priceLow, lang),
              high: formatCurrency(priceHigh, lang),
            })
          : t("booking.priceUnknown")}
      </p>

      <div className="mt-5 space-y-3">
        <CheckRow
          id="consent-terms"
          checked={consent.acceptedTerms}
          onChange={(v) => patch({ acceptedTerms: v })}
          label={t("booking.acceptTerms")}
        />
        <CheckRow
          id="consent-marketing"
          checked={consent.marketing}
          onChange={(v) => patch({ marketing: v })}
          label={t("booking.marketing")}
        />
      </div>
    </section>
  );
}
