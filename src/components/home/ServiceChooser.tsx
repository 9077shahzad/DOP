/**
 * Progressive disclosure of the catalogue.
 *
 * Top level: six categories in the customer's own words. Choosing one reveals
 * its sub-services, each linking to the real service page. A category without
 * sub-services offers the contact route instead of pretending to have depth.
 */
import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  Boxes,
  Hammer,
  MessageCircleQuestion,
  SprayCan,
  Truck,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { ChoiceCard } from "@/components/public/Choice";
import { buttonVariants } from "@/components/system";
import type { Lang } from "@/i18n/config";
import { CATEGORIES, type CategoryId } from "@/lib/service-categories";
import { cn } from "@/lib/utils";

const ICONS: Record<CategoryId, typeof Truck> = {
  umzug: Truck,
  reinigung: SprayCan,
  entsorgung: Hammer,
  lagerung: Boxes,
  transport: Truck,
  besichtigung: MessageCircleQuestion,
};

export function ServiceChooser({ lang }: { lang: Lang }) {
  const { t } = useTranslation(["home", "svc", "common"]);
  const [open, setOpen] = useState<CategoryId | null>(null);
  const category = CATEGORIES.find((c) => c.id === open) ?? null;

  return (
    <div>
      <div role="radiogroup" aria-label={t("home:catUi.title")} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {CATEGORIES.map((c) => {
          const Icon = ICONS[c.id];
          return (
            <ChoiceCard
              key={c.id}
              title={t(`home:cat.${c.id}.title`)}
              description={t(`home:cat.${c.id}.desc`)}
              icon={<Icon aria-hidden="true" strokeWidth={1.5} className="size-6" />}
              selected={open === c.id}
              onSelect={() => setOpen(open === c.id ? null : c.id)}
              className="min-h-20"
            />
          );
        })}
      </div>

      {category ? (
        <div className="mt-6 rounded-2xl bg-surface p-6 md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="type-h3 text-ink">{t(`home:cat.${category.id}.title`)}</p>
            <button
              type="button"
              onClick={() => setOpen(null)}
              className="label-mono inline-flex items-center gap-1.5 text-soft hover:text-primary"
            >
              <ArrowLeft aria-hidden="true" className="size-3.5" />
              {t("home:catUi.back")}
            </button>
          </div>

          {category.services.length > 0 ? (
            <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {category.services.map((s) => (
                <li key={s}>
                  <Link
                    to="/$lang/leistungen/$service"
                    params={{ lang, service: s }}
                    className="group flex min-h-16 items-center justify-between gap-3 rounded-xl bg-canvas px-4 py-4 ring-1 ring-line transition-colors motion-fast hover:ring-primary"
                  >
                    <span className="min-w-0">
                      <span className="block text-[0.9375rem] font-semibold text-ink">{t(`svc:${s}.title`)}</span>
                      <span className="type-caption block truncate">{t(`svc:${s}.short`)}</span>
                    </span>
                    <ArrowRight
                      aria-hidden="true"
                      className="size-4 shrink-0 text-soft transition-colors group-hover:text-primary"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <Link
              to="/$lang/kontakt"
              params={{ lang }}
              className={cn(buttonVariants({ variant: "primary", size: "touch" }), "mt-5")}
            >
              {t("common:cta.contact")}
            </Link>
          )}
        </div>
      ) : null}
    </div>
  );
}
