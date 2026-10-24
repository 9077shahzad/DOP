/**
 * The hero's primary action: the first question of the estimator, in the hero.
 *
 * The visitor answers something before they read anything. Two postcodes are
 * seeded into the planner's own storage so step 01 is already filled when the
 * planner opens — the same state the wizard reads, never a second copy.
 *
 * It shows no price and promises none: the planner decides that, and only with
 * complete inputs.
 */
import { useNavigate } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/system";
import type { Lang } from "@/i18n/config";
import { seedPlanner } from "@/components/planner/usePlanner";
import { cn } from "@/lib/utils";
import { nextZuegeltermine } from "@/lib/zuegeltermine";

const field = cn(
  "w-full min-h-13 rounded-xl border border-line bg-canvas px-4 text-lg text-ink",
  "data-mono outline-none transition-colors motion-fast placeholder:text-soft/70",
  "focus:border-primary focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary",
);

export function QuoteStarter({ lang }: { lang: Lang }) {
  const { t } = useTranslation("hero");
  const navigate = useNavigate();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  function start() {
    seedPlanner({ fromZip: from, toZip: to });
    void navigate({ to: "/$lang/planer", params: { lang } });
  }

  return (
    <div className="rounded-3xl bg-canvas p-6 ring-1 ring-line md:p-8">
      <p className="type-h3 text-ink">{t("quickTitle")}</p>
      <p className="type-small mt-2 text-soft">{t("quickLead")}</p>

      <form
        className="mt-6 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          start();
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="label-mono block pb-2 text-soft">{t("quickFrom")}</span>
            <input
              className={field}
              inputMode="numeric"
              maxLength={4}
              placeholder="8000"
              autoComplete="postal-code"
              value={from}
              onChange={(e) => setFrom(e.target.value.replace(/\D/g, "").slice(0, 4))}
            />
          </label>
          <label className="block">
            <span className="label-mono block pb-2 text-soft">{t("quickTo")}</span>
            <input
              className={field}
              inputMode="numeric"
              maxLength={4}
              placeholder="3000"
              value={to}
              onChange={(e) => setTo(e.target.value.replace(/\D/g, "").slice(0, 4))}
            />
          </label>
        </div>

        <Button type="button" onClick={start} variant="primary" size="touch" block>
          {t("quickStart")}
          <ArrowRight aria-hidden="true" className="size-4" />
        </Button>
      </form>

      <p className="type-caption mt-4">{t("quickNote")}</p>
      <NextZuegeltermine lang={lang} />
    </div>
  );
}

/**
 * The next two official Swiss moving dates. Rendered after mount: the list
 * depends on the visitor's calendar day, which the server cannot know.
 */
function NextZuegeltermine({ lang }: { lang: Lang }) {
  const { t } = useTranslation("hero");
  const [dates, setDates] = useState<Date[] | null>(null);
  useEffect(() => setDates(nextZuegeltermine(new Date(), 2)), []);
  if (!dates || dates.length === 0) return null;

  const fmt = new Intl.DateTimeFormat(lang, { day: "2-digit", month: "long", year: "numeric" });

  return (
    <p className="type-caption mt-2 text-soft">
      <span className="label-mono text-primary">{t("zuegeltermine.label")}</span>{" "}
      <span className="data-mono">{dates.map((d) => fmt.format(d)).join(" · ")}</span>{" "}
      {t("zuegeltermine.note")}
    </p>
  );
}
