import { useState } from "react";
import { useTranslation } from "react-i18next";

import { useMarkets } from "@/components/shell/CompanyContext";
import { REGIONS } from "@/lib/regions";
import { cn } from "@/lib/utils";

/**
 * Coverage experience.
 *
 * Regions get layered elevation and a hover lift — depth only, no glass.
 * Which countries appear is read from the `markets.active` flag: nothing here
 * hard-codes a "coming soon" market, so today Switzerland is the only tile.
 */
export function AreaSelector() {
  const { t } = useTranslation("home");
  const markets = useMarkets();
  const [activeId, setActiveId] = useState(REGIONS[0]!.id);
  const active = REGIONS.find((r) => r.id === activeId) ?? REGIONS[0]!;
  const activeMarkets = markets.filter((m) => m.active);

  const fields = [
    { label: t("area.coverage"), value: t(`area.${active.coverage}`) },
    { label: t("area.response"), value: `${active.responseHours} h` },
    { label: t("area.surcharge"), value: `CHF ${active.surchargeChf}` },
    { label: t("area.next"), value: `${active.surveyDays} ${t("area.days")}` },
  ];

  return (
    <div>
      {activeMarkets.length > 0 ? (
        <ul className="mb-6 flex flex-wrap gap-3" aria-label={t("area.markets")}>
          {activeMarkets.map((m) => (
            <li
              key={m.country}
              className="depth-tile border border-ink bg-card px-5 py-3 elev-raised"
            >
              <span className="label-mono text-primary">{m.country}</span>
              <span className="data-mono ml-3 text-sm text-ink">{m.currency}</span>
            </li>
          ))}
        </ul>
      ) : null}

      <div role="group" aria-label={t("area.selectLabel")} className="flex flex-wrap gap-px bg-line">
        {REGIONS.map((r) => (
          <button
            key={r.id}
            type="button"
            aria-pressed={r.id === activeId}
            onClick={() => setActiveId(r.id)}
            className={cn(
              "label-mono depth-tile border border-line px-4 py-3 transition-colors",
              r.id === activeId
                ? "border-ink bg-ink text-canvas elev-raised"
                : "bg-card text-ink hover:border-ink",
            )}
          >
            {t(`area.regions.${r.id}`, { defaultValue: r.name })}
          </button>
        ))}
      </div>

      <div className="mt-px grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
        {fields.map((f) => (
          <div key={f.label} className="lift-card bg-card px-5 py-6">
            <p className="label-mono text-soft">{f.label}</p>
            <p className="data-mono mt-2 text-xl text-ink">{f.value}</p>
          </div>
        ))}
      </div>

      <p className="label-mono mt-3 text-soft">{t("area.note")}</p>
    </div>
  );
}
