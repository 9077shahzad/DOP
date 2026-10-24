/**
 * Planner questions — one question per view.
 *
 * Every answer that drives the price is a tappable card, never a `<select>`:
 * the whole answer space is visible, the target is 56px and the selected state
 * is unmistakable. Nothing is pre-selected — `null` means "not answered", and
 * the price resolver depends on that distinction to stay silent.
 */
import { joinName, splitName } from "@/lib/person-name";
import { useEffect, useRef, useState } from "react";
import { ImagePlus, Video } from "lucide-react";
import { Button } from "@/components/system";
import { useTranslation } from "react-i18next";

import { ChoiceCard, ChoiceGroup, MultiChoiceCard, MultiChoiceGroup } from "@/components/public/Choice";
import { Field, inputClass } from "@/components/planner/primitives";
import type { Lang } from "@/i18n/config";
import {
  applicableExtras,
  effectiveCleaning,
  WINDOW_COVERINGS,
  type Level,
  type Lift,
  type PlannerState,
  type PropertyType,
  type UploadKind,
} from "@/lib/pricing";
import {
  fetchPlannerPricing,
  optionalParam,
  type OptionalParamKey,
} from "@/lib/planner-pricing";
import { formatCalendarDate, formatCurrency } from "@/i18n/format";
import { MAIN_SERVICES, isCleaningOnly, type StepId } from "@/lib/planner-steps";
import { fetchInventory, inventoryName, type InventoryItem } from "@/lib/inventory";
import { publicRouteDistance } from "@/lib/distance";
import {
  formatResolved,
  isSwissPostcodeFormat,
  lookupPostcode,
  soleLocality,
  type Locality,
} from "@/lib/swiss-postcodes";
import { useActiveLang } from "@/lib/admin-i18n";
import { ACCEPTED_UPLOADS, UploadRejected, uploadIntakeFile } from "@/lib/intake-uploads";
import { useQuery } from "@tanstack/react-query";
import { PLANNER_ROOM_STEPS } from "@/lib/price-resolution";
import {
  nearestNonPeakDates,
  parseIsoDate,
  toIsoDate,
  zuegelterminInfoFromIso,
} from "@/lib/zuegeltermine";
import { cn } from "@/lib/utils";

type StepProps = {
  state: PlannerState;
  patch: (next: Partial<PlannerState>) => void;
  lang: Lang;
};

/* --------------------------------------------------------------- 1 · route */

/**
 * One address side. Town and canton are never typed or chosen freely: they are
 * resolved from the official postcode directory, so a canton can never
 * contradict the postcode it belongs to.
 */
function AddressPanel({
  side,
  label,
  zip,
  street,
  city,
  canton,
  onZip,
  onStreet,
  onPlace,
}: {
  side: "from" | "to";
  /** Overrides the panel heading, e.g. for a cleaning object address. */
  label?: string;
  zip: string;
  street: string;
  city: string;
  canton: string;
  onZip: (v: string) => void;
  onStreet: (v: string) => void;
  onPlace: (place: { city: string; canton: string }) => void;
}) {
  const { t } = useTranslation("planer");
  const valid = isSwissPostcodeFormat(zip);


  const options = useQuery({
    queryKey: ["swiss-postcode", zip],
    queryFn: () => lookupPostcode(zip),
    enabled: valid,
    staleTime: 24 * 60 * 60 * 1000,
  });

  const list: Locality[] = options.data ?? [];
  const sole = soleLocality(list);

  // A postcode with exactly one locality resolves on its own; anything the
  // customer had before that does not belong to this postcode is dropped.
  useEffect(() => {
    if (!valid) {
      if (city || canton) onPlace({ city: "", canton: "" });
      return;
    }
    if (options.isLoading || options.isError) return;
    if (sole) {
      if (city !== sole.locality || canton !== sole.canton) {
        onPlace({ city: sole.locality, canton: sole.canton });
      }
      return;
    }
    const stillValid = list.some((o) => o.locality === city && o.canton === canton);
    if (!stillValid && (city || canton)) onPlace({ city: "", canton: "" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zip, valid, options.isLoading, options.isError, options.dataUpdatedAt]);

  const resolved = list.find((o) => o.locality === city && o.canton === canton) ?? null;

  return (
    <div className="rounded-2xl bg-surface p-5">
      <p className="label-mono text-primary">{label ?? t(`step1.${side}`)}</p>
      <div className="mt-4 space-y-4">
        <Field label={t("step1.zip")}>
          <input
            className={cn(inputClass, "data-mono text-lg")}
            inputMode="numeric"
            maxLength={4}
            id={`planner-${side}-zip`}
            placeholder={side === "from" ? "8000" : "3000"}
            value={zip}
            onChange={(e) => onZip(e.target.value.replace(/\D/g, "").slice(0, 4))}
            autoComplete="postal-code"
            aria-describedby={`planner-${side}-place`}
          />
        </Field>

        <div id={`planner-${side}-place`} className="min-h-6">
          {zip === "" ? null : !valid ? (
            <p role="alert" className="type-small text-danger">
              {t("step1.zipInvalid")}
            </p>
          ) : options.isLoading ? (
            <p className="type-small text-soft">{t("step1.zipResolving")}</p>
          ) : options.isError ? (
            <p role="alert" className="type-small text-danger">
              {t("step1.zipLookupFailed")}
            </p>
          ) : list.length === 0 ? (
            <p role="alert" className="type-small text-danger">
              {t("step1.zipUnknown")}
            </p>
          ) : resolved ? (
            <p className="data-mono text-sm text-ink">{formatResolved(resolved)}</p>
          ) : (
            <div>
              <p className="type-small text-ink-2">{t("step1.zipChooseLocality")}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {list.map((o) => (
                  <button
                    key={`${o.locality}-${o.canton}`}
                    type="button"
                    className="min-h-11 rounded-xl border border-line bg-canvas px-3 py-2 text-sm text-ink hover:border-primary"
                    onClick={() => onPlace({ city: o.locality, canton: o.canton })}
                  >
                    {o.locality}, {o.canton}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <Field label={t("step1.street")}>
          <input
            id={`planner-${side}-street`}
            className={inputClass}
            value={street}
            onChange={(e) => onStreet(e.target.value)}
            autoComplete="street-address"
          />
        </Field>

        {/* Town and canton are derived, never editable. */}
        <div className="grid grid-cols-2 gap-4">
          <Field label={t("step1.city")}>
            <input
              id={`planner-${side}-city`}
              className={cn(inputClass, "bg-surface text-ink-2")}
              value={city}
              readOnly
              tabIndex={-1}
              aria-readonly="true"
            />
          </Field>
          <Field label={t("step1.canton")}>
            <input
              id={`planner-${side}-canton`}
              className={cn(inputClass, "data-mono bg-surface text-ink-2")}
              value={canton}
              readOnly
              tabIndex={-1}
              aria-readonly="true"
            />
          </Field>
        </div>
      </div>
    </div>
  );
}

export function QRoute({ state, patch }: StepProps) {
  const { t } = useTranslation("planer");

  // Without a move (disposal, or disposal plus cleaning) there is exactly one
  // work address — no empty destination is ever asked for.
  const single = !state.services.move;
  const bothResolved =
    !single &&
    isSwissPostcodeFormat(state.fromZip) &&
    isSwissPostcodeFormat(state.toZip) &&
    state.fromCanton !== "" &&
    state.toCanton !== "";

  // The routing adapter is the only source of road kilometres. While no
  // provider is configured it reports "external input required" and the bar
  // says the distance is confirmed on the offer — it never shows a number.
  const route = useQuery({
    queryKey: [
      "route-distance",
      state.fromZip,
      state.fromCity,
      state.toZip,
      state.toCity,
    ],
    queryFn: () =>
      publicRouteDistance(
        `${state.fromAddress} ${state.fromZip} ${state.fromCity}`.trim(),
        `${state.toAddress} ${state.toZip} ${state.toCity}`.trim(),
      ),
    enabled: bothResolved,
    retry: false,
  });

  const km = route.data?.status === "resolved" ? route.data.km : null;
  const minutes = route.data?.minutes ?? null;

  return (
    <div className="space-y-6">
      {single ? (
        <AddressPanel
          side="from"
          label={t("summary.objectAddress")}
          zip={state.fromZip}
          street={state.fromAddress}
          city={state.fromCity}
          canton={state.fromCanton}
          onZip={(v) => patch({ fromZip: v })}
          onStreet={(v) => patch({ fromAddress: v })}
          onPlace={(p) => patch({ fromCity: p.city, fromCanton: p.canton })}
        />
      ) : (
      <div className="grid gap-4 sm:grid-cols-2">
        <AddressPanel
          side="from"
          zip={state.fromZip}
          street={state.fromAddress}
          city={state.fromCity}
          canton={state.fromCanton}
          onZip={(v) => patch({ fromZip: v })}
          onStreet={(v) => patch({ fromAddress: v })}
          onPlace={(p) => patch({ fromCity: p.city, fromCanton: p.canton })}
        />
        <AddressPanel
          side="to"
          zip={state.toZip}
          street={state.toAddress}
          city={state.toCity}
          canton={state.toCanton}
          onZip={(v) => patch({ toZip: v })}
          onStreet={(v) => patch({ toAddress: v })}
          onPlace={(p) => patch({ toCity: p.city, toCanton: p.canton })}
        />
      </div>
      )}

      <p className="type-caption">{t("micro.zip")}</p>
      {/* Postcode arithmetic is never shown as kilometres. */}
      {single ? null : (
      <div className="flex flex-wrap items-baseline justify-between gap-3 rounded-2xl bg-ink px-5 py-4 text-canvas">
        <span className="label-mono text-primary-light">{t("step1.route")}</span>
        {km != null ? (
          <span className="data-mono text-lg">
            {km} {t("step1.km")}
            {minutes != null ? ` · ${t("step1.duration", { hours: Math.floor(minutes / 60), minutes: minutes % 60 })}` : ""}
          </span>
        ) : (
          <span className="type-small max-w-md text-canvas/80">
            {t("step1.routeNote")} {t("step1.distanceExcluded")}
          </span>
        )}
      </div>
      )}
    </div>
  );
}

/* --------------------------------------------------------------- 2 · rooms */

export function QRooms({ state, patch }: StepProps) {
  const { t } = useTranslation("planer");
  return (
    <ChoiceGroup id="planner-rooms" label={t("step1.size")} columns={3}>
      {PLANNER_ROOM_STEPS.map((v) => (
        <ChoiceCard
          key={v}
          title={`${v === 5.5 ? "5.5+" : v} ${t("step1.rooms")}`}
          selected={state.roomUnits === v}
          onSelect={() => patch({ roomUnits: v })}
        />
      ))}
    </ChoiceGroup>
  );
}

/* ------------------------------------------------------------ 3 · property */

export function QProperty({ state, patch }: StepProps) {
  const { t } = useTranslation("planer");
  const options: { value: PropertyType; label: string }[] = [
    { value: "flat", label: t("step2.flat") },
    { value: "house", label: t("step2.house") },
    { value: "office", label: t("step2.office") },
  ];
  return (
    <ChoiceGroup id="planner-property" label={t("step2.type")} columns={3}>
      {options.map((o) => (
        <ChoiceCard
          key={o.value}
          title={o.label}
          selected={state.propertyType === o.value}
          onSelect={() => patch({ propertyType: o.value })}
        />
      ))}
    </ChoiceGroup>
  );
}

/* ------------------------------------------------- 4/5 · access per address */

const FLOORS = [0, 1, 2, 3, 4, 5];

/**
 * One access block per address. Departure and destination are asked with the
 * same questions but stored in separate fields, so the crew instructions can
 * never mix up which building has the small lift.
 */
function AccessPanel({
  side,
  floor,
  lift,
  parking,
  onFloor,
  onLift,
  onParking,
}: {
  side: "out" | "in";
  floor: number;
  lift: Lift;
  parking: Level;
  onFloor: (v: number) => void;
  onLift: (v: Lift) => void;
  onParking: (v: Level) => void;
}) {
  const { t } = useTranslation("planer");
  const lifts: Lift[] = ["ok", "small", "none"];
  const parkings: Level[] = [0, 1, 2];

  return (
    <div className="space-y-10" id={`planner-access-${side}`}>
      <ChoiceGroup label={t(side === "out" ? "step2.floorOut" : "step2.floorIn")} columns={3}>
        {FLOORS.map((f) => (
          <ChoiceCard
            key={f}
            title={f === 0 ? t("step2.ground") : `${f}. ${t("step2.floor")}`}
            selected={floor === f}
            onSelect={() => onFloor(f)}
          />
        ))}
      </ChoiceGroup>
      <ChoiceGroup label={t(side === "out" ? "step2.liftOut" : "step2.liftIn")} columns={3}>
        {lifts.map((value) => (
          <ChoiceCard
            key={value}
            title={t(`step2.lift_${value}`)}
            selected={lift === value}
            onSelect={() => onLift(value)}
          />
        ))}
      </ChoiceGroup>
      <ChoiceGroup
        label={t(side === "out" ? "step3.parkingOut" : "step3.parkingIn")}
        hint={t("step3.note")}
        columns={3}
      >
        {parkings.map((value) => (
          <ChoiceCard
            key={value}
            title={t(`step3.p${value}`)}
            selected={parking === value}
            onSelect={() => onParking(value)}
          />
        ))}
      </ChoiceGroup>
    </div>
  );
}

export function QAccessOut({ state, patch }: Omit<StepProps, "lang">) {
  return (
    <AccessPanel
      side="out"
      floor={state.floorOut}
      lift={state.liftOut}
      parking={state.parkingOut}
      onFloor={(floorOut) => patch({ floorOut })}
      onLift={(liftOut) => patch({ liftOut })}
      onParking={(parkingOut) => patch({ parkingOut })}
    />
  );
}

export function QAccessIn({ state, patch }: Omit<StepProps, "lang">) {
  const { t } = useTranslation("planer");
  // Same options as at pick-up, stored separately: a hoist at the destination
  // never implies one at pick-up and vice versa.
  const extras = [
    { key: "narrowStairsIn", label: t("step3.stairs"), on: state.narrowStairsIn },
    { key: "permitIn", label: t("step3.permit"), on: state.permitIn },
    { key: "hoistIn", label: t("step3.hoist"), on: state.hoistIn },
  ] as const;
  return (
    <div className="space-y-10">
    <AccessPanel
      side="in"
      floor={state.floorIn}
      lift={state.liftIn}
      parking={state.parkingIn}
      onFloor={(floorIn) => patch({ floorIn })}
      onLift={(liftIn) => patch({ liftIn })}
      onParking={(parkingIn) => patch({ parkingIn })}
    />
      <ChoiceGroup label={t("step3.carry")} columns={3}>
        {([0, 1, 2] as const).map((value) => (
          <ChoiceCard key={value} title={t(`step3.c${value}`)} selected={state.carryIn === value} onSelect={() => patch({ carryIn: value })} />
        ))}
      </ChoiceGroup>
      <MultiChoiceGroup id="planner-access-in-extras" label={t("step3.extrasIn")} columns={3}>
        {extras.map((x) => (
          <MultiChoiceCard
            key={x.key}
            title={x.label}
            selected={x.on}
            onSelect={() => patch({ [x.key]: !x.on } as Partial<PlannerState>)}
          />
        ))}
      </MultiChoiceGroup>
    </div>
  );
}

/** Carry distance and the site conditions that apply to the assignment. */
export function QAccess({ state, patch }: Omit<StepProps, "lang">) {
  const { t } = useTranslation("planer");
  const carry: { value: Level; label: string }[] = [
    { value: 0, label: t("step3.c0") },
    { value: 1, label: t("step3.c1") },
    { value: 2, label: t("step3.c2") },
  ];
  const extras = [
    { key: "narrowStairs", label: t("step3.stairs"), on: state.narrowStairs },
    { key: "permit", label: t("step3.permit"), on: state.permit },
    { key: "hoist", label: t("step3.hoist"), on: state.hoist },
  ] as const;

  return (
    <div className="space-y-10">
      <ChoiceGroup label={t("step3.carry")} columns={3}>
        {carry.map((o) => (
          <ChoiceCard
            key={o.value}
            title={o.label}
            selected={state.carry === o.value}
            onSelect={() => patch({ carry: o.value })}
          />
        ))}
      </ChoiceGroup>
      <MultiChoiceGroup label={t("step3.extras")} columns={3}>
        {extras.map((x) => (
          <MultiChoiceCard
            key={x.key}
            title={x.label}
            selected={x.on}
            onSelect={() => patch({ [x.key]: !x.on } as Partial<PlannerState>)}
          />
        ))}
      </MultiChoiceGroup>
    </div>
  );
}

/* ------------------------------------------------------ 1 · services first */

/**
 * The first question of the whole flow: which services are needed. Everything
 * the wizard asks afterwards follows from this answer.
 */
export function QServices({
  state,
  toggleService,
}: Omit<StepProps, "patch" | "lang"> & {
  toggleService: (key: keyof PlannerState["services"]) => void;
}) {
  const { t } = useTranslation("planer");

  return (
    <MultiChoiceGroup id="planner-services" label={t("step4.services")} hint={t("flow.services.hint")} columns={3}>
      {MAIN_SERVICES.map((key) => (
        <MultiChoiceCard
          key={key}
          title={t(`step4.${key}`)}
          description={t(`step4.desc.${key}`)}
          selected={state.services[key]}
          onSelect={() => toggleService(key)}
        />
      ))}
    </MultiChoiceGroup>
  );
}

/* ----------------------------------------------------------- 7 · inventory */

export function QInventory({
  state,
  setItem,
}: Omit<StepProps, "patch" | "lang"> & { setItem: (id: string, qty: number) => void }) {
  const { t } = useTranslation("planer");
  const lang = useActiveLang();
  const catalogue = useQuery({ queryKey: ["inventory-catalogue"], queryFn: () => fetchInventory() });
  const items: InventoryItem[] = catalogue.data ?? [];
  // Long names are cut to one line; a tap shows the full name.
  const [open, setOpen] = useState<Set<string>>(new Set());

  if (catalogue.isLoading) {
    return <p className="type-small text-soft">{t("step4.inventoryLoading")}</p>;
  }
  if (catalogue.isError) {
    return (
      <p role="alert" className="type-small text-danger">
        {t("step4.inventoryError")}
      </p>
    );
  }

  return (
    <div>
      <p className="type-small text-soft">{t("step4.inventoryNote")}</p>
      <ul className="mt-5 grid gap-3 sm:grid-cols-2">
        {items.map((item) => {
          const qty = state.items[item.key] ?? 0;
          return (
            <li
              key={item.id}
              className={cn(
                "flex min-h-14 flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-xl border bg-canvas p-3 pl-4 transition-colors motion-fast",
                qty > 0 ? "border-primary bg-primary-subtle" : "border-line",
              )}
            >
              <span className="min-w-0 flex-1">
                {item.key === "box" ? (
                  <span className="block break-words text-[0.9375rem] text-ink">{inventoryName(item, lang)}</span>
                ) : (
                  <button
                    type="button"
                    aria-expanded={open.has(item.key)}
                    title={inventoryName(item, lang)}
                    onClick={() => setOpen((s) => { const n = new Set(s); if (n.has(item.key)) n.delete(item.key); else n.add(item.key); return n; })}
                    className={cn("block w-full text-start text-[0.9375rem] text-ink", open.has(item.key) ? "break-words" : "truncate")}
                  >
                    {inventoryName(item, lang)}
                  </button>
                )}
                <span className="data-mono text-xs text-soft">{Number(item.m3).toFixed(2)} m³</span>
              </span>
              <span className="flex shrink-0 items-center rounded-2xl bg-surface">
                <button
                  type="button"
                  aria-label={`${t("step4.less")} — ${inventoryName(item, lang)}`}
                  onClick={() => setItem(item.key, qty - 1)}
                  disabled={qty === 0}
                  className="min-h-11 rounded-s-lg px-3.5 py-2.5 text-ink transition-colors hover:bg-ink hover:text-canvas disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-ink"
                >
                  −
                </button>
                <input
                  id={item.key === "box" ? "planner-box-count" : undefined}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={9999}
                  step={1}
                  aria-label={`${inventoryName(item, lang)} – Anzahl`}
                  className="data-mono w-16 border-x border-line bg-canvas py-2.5 text-center text-sm"
                  value={qty}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    if (e.target.value === "") { setItem(item.key, 0); return; }
                    if (Number.isInteger(n) && n >= 0 && n <= 9999) setItem(item.key, n);
                  }}
                />
                <button
                  type="button"
                  aria-label={`${t("step4.more")} — ${inventoryName(item, lang)}`}
                  onClick={() => setItem(item.key, qty + 1)}
                  className="min-h-11 rounded-e-lg px-3.5 py-2.5 text-ink transition-colors hover:bg-ink hover:text-canvas"
                >
                  +
                </button>
              </span>
              {item.key === "box" ? <p className="basis-full text-xs leading-relaxed text-ink-2">{t("step4.boxHint")}</p> : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* --------------------------------------------- approved surcharge price tags */

/**
 * The published price list, read once and shared through the query cache with
 * the wizard itself. An option only shows a price when the list carries an
 * approved rate for it — never an invented figure.
 */
function useApprovedRates() {
  const query = useQuery({
    queryKey: ["planner-pricing", "CH"],
    queryFn: () => fetchPlannerPricing("CH"),
    staleTime: 5 * 60 * 1000,
  });
  return query.data ?? null;
}

/** "+ CHF 20" beside a paid option; empty while no approved rate exists. */
function useSurchargeLabel() {
  const pricing = useApprovedRates();
  const lang = useActiveLang();
  return (key: OptionalParamKey, suffix = "") => {
    const value = pricing ? optionalParam(pricing, key) : null;
    if (value == null || value <= 0) return "";
    // Never round a rate for display (e.g. CHF 4.50 must not read "CHF 5").
    return `+ ${formatCurrency(value, lang, Number.isInteger(value) ? 0 : 2)}${suffix}`;
  };
}


/* ------------------------------------------------------- 8 · extra services */

export function QExtras({ state, patch }: Omit<StepProps, "lang">) {
  const { t } = useTranslation("planer");
  const lang = useActiveLang();
  const available = applicableExtras(state.services);
  const price = useSurchargeLabel();
  const pricing = useApprovedRates();
  const minRooms = pricing ? optionalParam(pricing, "moveextra:furniture_assembly_min_rooms") : null;
  function toggle(key: string) {
    const next = state.extras.includes(key)
      ? state.extras.filter((e) => e !== key)
      : [...state.extras, key];
    const removing = state.extras.includes(key);
    patch({
      extras: next,
      ...(key === "lamp_installation" && removing ? { lampCount: 0 } : {}),
      // Deselecting the material clears its delivery choice and any charge.
      ...(key === "packing_material" && removing ? { packingMaterialOption: "" as const } : {}),
    });
  }
  const deliveryPrice = pricing ? optionalParam(pricing, "moveextra:packing_material_delivery") : null;
  const priceOf: Partial<Record<string, string>> = {
    furniture_assembly: price("moveextra:furniture_assembly"),
    piano_transport: price("moveextra:piano_transport"),
    lamp_installation: price("moveextra:lamp_installation", ` ${t("step8.perLamp")}`),
  };
  return (
    <div className="space-y-5">
      <MultiChoiceGroup id="planner-extras" label={t("step8.label")} hint={t("flow.extras.hint")} columns={2}>
        {available.map((key) => (
          <MultiChoiceCard
            key={key}
            title={t(`step8.items.${key}`)}
            {...(priceOf[key] ? { description: priceOf[key]! } : {})}
            selected={state.extras.includes(key)}
            onSelect={() => toggle(key)}
          />
        ))}
      </MultiChoiceGroup>

      {/* Packing material needs one of two follow-up choices. */}
      {state.extras.includes("packing_material") ? (
        <ChoiceGroup id="planner-packing-material" label={t("step8.packingMaterial.label")} columns={2}>
          <ChoiceCard
            title={t("step8.packingMaterial.self")}
            description={t("step8.packingMaterial.free")}
            selected={state.packingMaterialOption === "self"}
            onSelect={() => patch({ packingMaterialOption: "self" })}
          />
          <ChoiceCard
            title={t("step8.packingMaterial.delivery")}
            {...(deliveryPrice != null && deliveryPrice > 0
              ? { description: `+ ${formatCurrency(deliveryPrice, lang)}` }
              : {})}
            selected={state.packingMaterialOption === "delivery"}
            onSelect={() => patch({ packingMaterialOption: "delivery" })}
          />
        </ChoiceGroup>
      ) : null}
      {/* Furniture assembly is only charged from the configured property size. */}
      {state.extras.includes("furniture_assembly") && minRooms != null ? (
        <p className="type-small text-soft">{t("step8.assemblyMinRooms", { rooms: minRooms })}</p>
      ) : null}
      {/* A quantity only exists while the service itself is selected. */}
      {state.extras.includes("lamp_installation") ? (
        <CountField
          id="planner-lamp-count"
          label={t("step8.lampCount")}
          value={state.lampCount}
          onChange={(lampCount) => patch({ lampCount })}
        />
      ) : null}
      {/* The guarantee is part of "Endreinigung mit Abnahmegarantie" and is
          therefore shown as included instead of charged a second time. */}
      {state.services.clean ? (
        <p className="rounded-xl bg-primary-subtle px-4 py-3 text-sm text-ink">
          {t("step8.guaranteeIncluded")}
        </p>
      ) : null}
    </div>
  );
}


/* ------------------------------------------------------ cleaning checklist */

function CountField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (next: number) => void;
}) {
  return (
    <Field label={label}>
      <input
        id={id}
        type="number"
        min={0}
        step={1}
        inputMode="numeric"
        className={cn(inputClass, "data-mono")}
        value={String(value)}
        onChange={(e) => {
          const next = Number.parseInt(e.target.value, 10);
          onChange(Number.isFinite(next) && next > 0 ? Math.round(next) : 0);
        }}
      />
    </Field>
  );
}

function YesNo({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (next: boolean) => void;
}) {
  const { t } = useTranslation("planer");
  return (
    <ChoiceGroup label={label} columns={2}>
      <ChoiceCard title={t("cleaning.yes")} selected={value} onSelect={() => onChange(true)} />
      <ChoiceCard title={t("cleaning.no")} selected={!value} onSelect={() => onChange(false)} />
    </ChoiceGroup>
  );
}

export function QCleaning({ state, patch }: Omit<StepProps, "lang">) {
  const { t } = useTranslation("planer");
  const c = state.cleaning;
  const set = (next: Partial<PlannerState["cleaning"]>) => patch({ cleaning: { ...c, ...next } });
  const price = useSurchargeLabel();
  const pricing = useApprovedRates();
  const freeWindows = pricing ? optionalParam(pricing, "cleanextra:window_free") : null;
  /** Appends the approved surcharge to an option label, or nothing at all. */
  const paid = (label: string, key: OptionalParamKey) => {
    const tag = price(key);
    return tag ? `${label} · ${tag}` : label;
  };

  return (
    <div className="space-y-10" id="planner-cleaning">
      {/* A cleaning-only request never sees the route step, so the address of
          the object being cleaned is recorded here. */}
      {isCleaningOnly(state.services) ? (
        <AddressPanel
          side="from"
          label={t("cleaning.address")}
          zip={state.fromZip}
          street={state.fromAddress}
          city={state.fromCity}
          canton={state.fromCanton}
          onZip={(v) => patch({ fromZip: v })}
          onStreet={(v) => patch({ fromAddress: v })}
          onPlace={(p) => patch({ fromCity: p.city, fromCanton: p.canton })}
        />
      ) : null}

      {!state.services.move ? <ChoiceGroup label={t("cleaning.object")} columns={3}>
        {(["flat", "house", "office"] as const).map((value) => (
          <ChoiceCard
            key={value}
            title={t(`step2.${value}`)}
            selected={c.propertyType === value}
            onSelect={() => set({ propertyType: value })}
          />
        ))}
      </ChoiceGroup> : null}

      {!state.services.move ? <div>
        <ChoiceGroup id="planner-clean-rooms" label={t("cleaning.size")} columns={3}>
          {PLANNER_ROOM_STEPS.map((v) => (
            <ChoiceCard
              key={v}
              title={`${v} ${t("step1.rooms")}`}
              selected={c.roomUnits === v}
              onSelect={() => set({ roomUnits: v, otherSize: "" })}
            />
          ))}
          <ChoiceCard
            title={t("cleaning.other")}
            selected={c.roomUnits === null}
            onSelect={() => set({ roomUnits: null })}
          />
        </ChoiceGroup>
        {c.roomUnits === null ? (
          <Field label={t("cleaning.otherSize")}>
            <input
              className={cn(inputClass, "mt-2")}
              value={c.otherSize}
              onChange={(e) => set({ otherSize: e.target.value })}
            />
          </Field>
        ) : null}
      </div> : null}

      <div>
        <div className="grid gap-5 sm:grid-cols-3">
          <CountField
            id="planner-windows-normal"
            label={t("cleaning.windowsNormal")}
            value={c.windowsNormal}
            onChange={(windowsNormal) => set({ windowsNormal })}
          />
          <CountField
            id="planner-windows-large"
            label={t("cleaning.windowsLarge")}
            value={c.windowsLarge}
            onChange={(windowsLarge) => set({ windowsLarge })}
          />
          <CountField
            id="planner-wet-rooms"
            label={t("cleaning.wetRooms")}
            value={c.wetRooms}
            onChange={(wetRooms) => set({ wetRooms })}
          />
        </div>
        {freeWindows != null ? (
          <p className="type-small mt-3 text-soft">
            {t("cleaning.windowNote", {
              free: freeWindows,
              normal: price("cleanextra:window_normal"),
              large: price("cleanextra:window_large"),
            })}
          </p>
        ) : null}
      </div>

      <MultiChoiceGroup label={t("cleaning.coverings")} columns={3}>
        {WINDOW_COVERINGS.map((key) => (
          <MultiChoiceCard
            key={key}
            title={t(`cleaning.covering.${key}`)}
            {...(key === "lamellen" && price("cleanextra:lamellen")
              ? { description: price("cleanextra:lamellen") }
              : {})}
            selected={c.coverings.includes(key)}
            onSelect={() =>
              set({
                coverings: c.coverings.includes(key)
                  ? c.coverings.filter((x) => x !== key)
                  : [...c.coverings, key],
              })
            }
          />
        ))}
      </MultiChoiceGroup>

      <div className="space-y-10">
        <YesNo
          label={paid(t("cleaning.balcony"), "cleanextra:balcony")}
          value={c.balcony}
          onChange={(balcony) => set({ balcony, balconyPressure: balcony ? c.balconyPressure : false })}
        />
        {/* A "Nein" parent removes its dependent answer from the request. */}
        {c.balcony ? (
          <YesNo
            label={paid(t("cleaning.pressure"), "cleanextra:pressure")}
            value={c.balconyPressure}
            onChange={(balconyPressure) => set({ balconyPressure })}
          />
        ) : null}
        <YesNo
          label={paid(t("cleaning.cellar"), "cleanextra:cellar")}
          value={c.cellar}
          onChange={(cellar) => set({ cellar })}
        />
        <YesNo
          label={paid(t("cleaning.garage"), "cleanextra:garage")}
          value={c.garage}
          onChange={(garage) => set({ garage })}
        />
        {/* Carpet on its own is free; only shampooing carries a surcharge. */}
        <YesNo
          label={t("cleaning.carpet")}
          value={c.carpet}
          onChange={(carpet) => set({ carpet, carpetShampoo: carpet ? c.carpetShampoo : false })}
        />
        {c.carpet ? (
          <YesNo
            label={paid(t("cleaning.shampoo"), "cleanextra:carpet_shampoo")}
            value={c.carpetShampoo}
            onChange={(carpetShampoo) => set({ carpetShampoo })}
          />
        ) : null}
        <CountField
          id="planner-dowel-holes"
          label={paid(t("cleaning.dowelHoles"), "cleanextra:dowel_hole") + (price("cleanextra:dowel_hole") ? ` ${t("cleaning.perPiece")}` : "")}
          value={c.dowelHoles ?? 0}
          onChange={(dowelHoles) => set({ dowelHoles })}
        />
      </div>
    </div>
  );
}


/* ------------------------------------------------------ disposal / clearance */

export function QDisposal({ state, patch }: Omit<StepProps, "lang">) {
  const { t } = useTranslation("planer");
  const d = state.disposal;
  const set = (next: Partial<PlannerState["disposal"]>) => patch({ disposal: { ...d, ...next } });

  return (
    <div className="space-y-6" id="planner-disposal">
      <p className="type-small text-soft">{t("disposal.note")}</p>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={t("disposal.volume")}>
          <input
            id="planner-disposal-m3"
            type="number"
            min={0}
            step="0.5"
            inputMode="decimal"
            className={cn(inputClass, "data-mono")}
            value={d.m3 ?? ""}
            onChange={(e) => {
              const next = Number(e.target.value);
              set({ m3: e.target.value === "" || !Number.isFinite(next) ? null : Math.max(0, next) });
            }}
          />
        </Field>
        <Field label={t("disposal.hours")}>
          <input
            id="planner-disposal-hours"
            type="number"
            min={0}
            step="0.5"
            inputMode="decimal"
            className={cn(inputClass, "data-mono")}
            value={d.hours ?? ""}
            onChange={(e) => {
              const next = Number(e.target.value);
              set({ hours: e.target.value === "" || !Number.isFinite(next) ? null : Math.max(0, next) });
            }}
          />
        </Field>
      </div>
      <Field label={t("disposal.notes")}>
        <textarea
          rows={3}
          className={cn(inputClass, "mt-1")}
          value={d.notes}
          onChange={(e) => set({ notes: e.target.value })}
        />
      </Field>
      <p className="type-caption">{t("disposal.estimateNote")}</p>
    </div>
  );
}

/* --------------------------------------------------------------- 9 · dates */

/**
 * Every future day is selectable, weekends included, and the price is the same
 * on every day. The chosen date remains a request that we confirm — a
 * selectable day never means capacity has already been checked.
 */
export function QDate({ state, patch, lang }: StepProps) {
  const { t } = useTranslation("planer");
  // The visitor's calendar starts in the visitor's timezone. Rendering it on
  // the server would disagree with the browser, so the strip waits for mount.
  const [today, setToday] = useState<Date | null>(null);
  useEffect(() => setToday(new Date()), []);
  if (!today) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7" aria-hidden="true">
        {Array.from({ length: 14 }, (_, i) => (
          <div key={i} className="min-h-20 rounded-xl border border-line bg-canvas" />
        ))}
      </div>
    );
  }
  const days = Array.from(
    { length: 14 },
    (_, i) => new Date(today.getFullYear(), today.getMonth(), today.getDate() + i + 1),
  );
  const minDate = toIsoDate(days[0]!);

  const fmtDay = new Intl.DateTimeFormat(lang, { weekday: "short" });
  const fmtDate = new Intl.DateTimeFormat(lang, { day: "2-digit", month: "2-digit" });
  const needsCleanDate = state.services.clean && state.services.move;

  return (
    <div className="space-y-6">
      <p className="type-small text-soft">{t("micro.date")}</p>

      {state.services.move || !state.services.clean ? (
        <div>
          <p className="label-mono text-primary">
            {state.services.move ? t("step5.moveDate") : t("step5.serviceDate")}
          </p>
          <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {days.map((d) => {
              const iso = toIsoDate(d);
              const selected = state.date === iso;
              return (
                <li key={iso}>
                  <button
                    type="button"
                    aria-pressed={selected}
                    onClick={() => patch({ date: iso })}
                    className={cn(
                      "flex h-full min-h-20 w-full flex-col gap-1 rounded-xl border p-3 text-start transition-colors motion-fast",
                      selected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-line bg-canvas hover:border-primary/50",
                    )}
                  >
                    <span className="label-mono opacity-70">{fmtDay.format(d)}</span>
                    <span className="data-mono text-lg">{fmtDate.format(d)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          <Field label={t("step5.otherDate")}>
            <input
              id="planner-date"
              type="date"
              min={minDate}
              className={cn(inputClass, "data-mono mt-2")}
              value={state.date ?? ""}
              onChange={(e) => patch({ date: e.target.value || null })}
            />
          </Field>
        </div>
      ) : null}

      {/* Cleaning is a separate day: the flat is handed over after the move. */}
      {state.services.clean ? (
        <div className="rounded-2xl bg-surface p-5">
          <p className="label-mono text-primary">{t("step5.cleanDate")}</p>
          <p className="type-small mt-2 text-soft">{t("step5.cleanDateNote")}</p>
          <Field label={t("step5.cleanDateLabel")}>
            <input
              id="planner-clean-date"
              type="date"
              min={minDate}
              className={cn(inputClass, "data-mono mt-2")}
              value={(needsCleanDate ? state.cleanDate : (state.cleanDate ?? state.date)) ?? ""}
              onChange={(e) =>
                patch(
                  needsCleanDate
                    ? { cleanDate: e.target.value || null }
                    : { cleanDate: e.target.value || null, date: e.target.value || null },
                )
              }
            />
          </Field>
          {needsCleanDate && state.cleanDate && state.cleanDate === state.date ? (
            <p role="alert" className="type-small mt-2 text-danger">
              {t("step5.cleanDateSame")}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2">
        {/* The start time is fixed at 08:00 and is therefore shown, not asked. */}
        <Field label={t("step5.fixedStart")}>
          <p id="planner-start-time" className="data-mono mt-2 text-lg text-ink">
            {t("step5.fixedStartValue")}
          </p>
        </Field>

      </div>
      <p className="type-caption">{t("step5.note")}</p>
      <p className="type-caption">{t("step5.samePrice")}</p>
    </div>
  );
}

/* ------------------------------------------------------------- 9 · contact */

export function QContact({ state, patch }: StepProps) {
  const { t } = useTranslation("planer");
  const [differentBilling, setDifferentBilling] = useState(Boolean(state.customerStreet || state.customerZip || state.customerCity));

  return (
    <div className="space-y-5">
      <div className="grid gap-5 md:grid-cols-2">
        <Field label={t("step6.firstName")}>
          <input
            id="planner-name"
            className={inputClass}
            value={state.firstName ?? splitName(state.name).first}
            onChange={(e) => {
              const last = state.lastName ?? splitName(state.name).last;
              patch({ firstName: e.target.value, lastName: last, name: joinName(e.target.value, last) });
            }}
            autoComplete="given-name"
          />
        </Field>
        <Field label={t("step6.lastName")}>
          <input
            id="planner-last-name"
            className={inputClass}
            value={state.lastName ?? splitName(state.name).last}
            onChange={(e) => {
              const first = state.firstName ?? splitName(state.name).first;
              patch({ firstName: first, lastName: e.target.value, name: joinName(first, e.target.value) });
            }}
            autoComplete="family-name"
          />
        </Field>
        <Field label={t("step6.company")}>
          <input
            className={inputClass}
            value={state.company}
            onChange={(e) => patch({ company: e.target.value })}
            autoComplete="organization"
          />
        </Field>
        <Field label={t("step6.phone")}>
          <input
            id="planner-phone"
            className={cn(inputClass, "data-mono")}
            type="tel"
            value={state.phone}
            onChange={(e) => patch({ phone: e.target.value })}
            autoComplete="tel"
          />
        </Field>
        <Field label={t("step6.email")}>
          <input
            id="planner-email"
            className={inputClass}
            type="email"
            value={state.email}
            onChange={(e) => patch({ email: e.target.value })}
            autoComplete="email"
          />
        </Field>
      </div>

      {/* Invoice address of the customer — deliberately separate from the
          places the work happens, which may be different addresses. */}
      <label className="flex items-center gap-3 text-sm text-ink">
        <input type="checkbox" checked={differentBilling} onChange={(e) => {
          setDifferentBilling(e.target.checked);
          if (!e.target.checked) patch({ customerStreet: "", customerZip: "", customerCity: "", customerCountry: "" });
        }} />
        {t("step6.differentBilling", { defaultValue: "Abweichende Rechnungsadresse" })}
      </label>
      {differentBilling ? <div className="rounded-2xl bg-surface p-5">
        <p className="label-mono text-primary">{t("step6.addressTitle")}</p>
        <p className="type-small mt-2 text-soft">{t("step6.addressNote")}</p>
        <div className="mt-4 grid gap-5 md:grid-cols-2">
          <Field label={t("step6.street")}>
            <input
              id="planner-customer-street"
              className={inputClass}
              value={state.customerStreet}
              onChange={(e) => patch({ customerStreet: e.target.value })}
              autoComplete="street-address"
            />
          </Field>
          <Field label={t("step6.zip")}>
            <input
              id="planner-customer-zip"
              className={cn(inputClass, "data-mono")}
              inputMode="numeric"
              value={state.customerZip}
              onChange={(e) => patch({ customerZip: e.target.value })}
              autoComplete="postal-code"
            />
          </Field>
          <Field label={t("step6.city")}>
            <input
              id="planner-customer-city"
              className={inputClass}
              value={state.customerCity}
              onChange={(e) => patch({ customerCity: e.target.value })}
              autoComplete="address-level2"
            />
          </Field>
          <Field label={t("step6.country")}>
            <input
              id="planner-customer-country"
              className={inputClass}
              value={state.customerCountry}
              onChange={(e) => patch({ customerCountry: e.target.value })}
              autoComplete="country-name"
            />
          </Field>
        </div>
      </div> : null}

      <Field label={t("step6.language")}>
        <select
          id="planner-language"
          className={inputClass}
          value={state.contactLanguage}
          onChange={(e) => patch({ contactLanguage: e.target.value })}
        >
          <option value="de">Deutsch</option>
          <option value="fr">Français</option>
          <option value="it">Italiano</option>
          <option value="en">English</option>
        </select>
      </Field>
      <p className="type-small text-soft">{t("micro.contact")}</p>
      <p className="type-caption">{t("step6.note")}</p>
    </div>
  );
}


/* ------------------------------------------------------------- 10 · uploads */

// Floor plans are no longer requested; older requests keep theirs.
const UPLOAD_KINDS: UploadKind[] = ["photo", "video"];

export function QUploads({
  state,
  patch,
}: Omit<StepProps, "lang">) {
  const { t } = useTranslation("planer");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputs = useRef<Partial<Record<UploadKind, HTMLInputElement | null>>>({});

  async function add(kind: UploadKind, files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy(true);
    setError(null);
    const added: typeof state.uploads = [];
    for (const file of Array.from(files)) {
      try {
        added.push(await uploadIntakeFile(state.draftId, kind, file));
      } catch (e) {
        setError(
          e instanceof UploadRejected
            ? t(`step10.rejected.${e.reason}`, { name: file.name })
            : t("step10.failed", { name: file.name }),
        );
      }
    }
    if (added.length > 0) patch({ uploads: [...state.uploads, ...added] });
    setBusy(false);
  }

  return (
    <div className="space-y-6">
      <p className="type-small text-soft">{t("step10.note")}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        {UPLOAD_KINDS.map((kind) => (
          <div key={kind} className="min-w-0">
            <input
              id={`planner-upload-${kind}`}
              ref={(node) => { fileInputs.current[kind] = node; }}
              className="hidden"
              aria-label={t(`step10.kind.${kind}`)}
              type="file"
              multiple
              accept={ACCEPTED_UPLOADS}
              disabled={busy}
              onChange={(e) => {
                void add(kind, e.target.files);
                e.target.value = "";
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="touch"
              className="w-full min-w-0 whitespace-normal"
              disabled={busy}
              onClick={() => fileInputs.current[kind]?.click()}
            >
              {kind === "photo" ? <ImagePlus aria-hidden="true" className="size-5 shrink-0" /> : <Video aria-hidden="true" className="size-5 shrink-0" />}
              <span className="min-w-0 break-words">{t(`step10.kind.${kind}`)}</span>
            </Button>
          </div>
        ))}
      </div>
      {busy ? (
        <p role="status" className="type-small text-soft">
          {t("step10.uploading")}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="type-small text-danger">
          {error}
        </p>
      ) : null}
      {state.uploads.length > 0 ? (
        <ul className="space-y-2">
          {state.uploads.map((u) => (
            <li
              key={u.storage_path}
              className="flex min-h-12 items-center justify-between gap-4 rounded-xl border border-line bg-canvas px-4 py-2"
            >
              <span className="min-w-0">
                <span className="block truncate text-sm text-ink">{u.file_name}</span>
                <span className="data-mono text-xs text-soft">
                  {t(`step10.kind.${u.kind}`)} · {(u.size_bytes / 1024 / 1024).toFixed(1)} MB
                </span>
              </span>
              <button
                type="button"
                className="min-h-11 px-2 text-sm text-primary underline"
                onClick={() => patch({ uploads: state.uploads.filter((x) => x.storage_path !== u.storage_path) })}
              >
                {t("step10.remove")}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="type-caption">{t("step10.empty")}</p>
      )}
    </div>
  );
}

/* ------------------------------------------------------- weitere infos */

/** Optional free text on the final step; stored with the request and printed. */
export function QNotes({ state, patch }: Omit<StepProps, "lang">) {
  const { t } = useTranslation("planer");
  return (
    <Field label={t("step6.notes")}>
      <textarea
        id="planner-notes"
        rows={4}
        maxLength={4000}
        className={cn(inputClass, "mt-1")}
        value={state.notes}
        onChange={(e) => patch({ notes: e.target.value })}
      />
    </Field>
  );
}

/* ------------------------------------------------------------- 11 · summary */

export function QSummary({
  state,
  onEdit,
}: {
  state: PlannerState;
  onEdit: (stepId: StepId) => void;
}) {
  const { t } = useTranslation("planer");
  const lang = useActiveLang();
  // Names only: retired categories must still read as names in older requests.
  const catalogue = useQuery({ queryKey: ["inventory-catalogue", "all"], queryFn: () => fetchInventory(true) });
  const names = new Map((catalogue.data ?? []).map((i) => [i.key, inventoryName(i, lang)]));
  const counted = Object.entries(state.items).filter(([, qty]) => qty > 0);
  const clean = effectiveCleaning(state.cleaning);
  const yesNo = (on: boolean) => (on ? t("cleaning.yes") : t("cleaning.no"));
  const cleanOnly = isCleaningOnly(state.services);

  const rows: { step: StepId; label: string; value: string }[] = [
    {
      step: "services",
      label: t("summary.services"),
      value:
        MAIN_SERVICES.filter((k) => state.services[k])
          .map((k) => t(`step4.${k}`))
          .join(", ") || "—",
    },
    {
      // A cleaning-only request gave this address inside the cleaning step.
      step: cleanOnly ? ("cleaning" as StepId) : ("route" as StepId),
      label: cleanOnly ? t("cleaning.address") : state.services.move ? t("summary.from") : t("summary.objectAddress"),
      value: [state.fromAddress, `${state.fromZip} ${state.fromCity}`.trim(), state.fromCanton]
        .filter(Boolean)
        .join(", "),
    },
    ...(state.services.move
      ? [
          {
            step: "route" as StepId,
            label: t("summary.to"),
            value: [state.toAddress, `${state.toZip} ${state.toCity}`.trim(), state.toCanton]
              .filter(Boolean)
              .join(", "),
          },
        ]
      : []),
    ...(cleanOnly
      ? []
      : [
          {
            step: "size" as StepId,
            label: t("summary.size"),
            value: state.roomUnits ? `${state.roomUnits} ${t("step1.rooms")}` : "—",
          },
          {
            step: "accessOut" as StepId,
            label: t("summary.accessOut"),
            value: [
              `${state.floorOut}. ${t("step2.floor")}`,
              t(`step2.lift_${state.liftOut}`),
              t(`step3.p${state.parkingOut}`),
              t(`step3.c${state.carry}`),
              ...(state.narrowStairs ? [t("step3.stairs")] : []),
              ...(state.permit ? [t("step3.permit")] : []),
              ...(state.hoist ? [t("step3.hoist")] : []),
            ].join(" · "),
          },
        ]),
    ...(state.services.move
      ? [
          {
            step: "accessIn" as StepId,
            label: t("summary.accessIn"),
            value: [
              `${state.floorIn}. ${t("step2.floor")}`,
              t(`step2.lift_${state.liftIn}`),
              t(`step3.p${state.parkingIn}`),
              ...(state.permitIn ? [t("step3.permit")] : []),
              ...(state.hoistIn ? [t("step3.hoist")] : []),
              t(`step3.c${state.carryIn}`),
              ...(state.narrowStairsIn ? [t("step3.stairs")] : []),
            ].join(" · "),
          },
          {
            step: "inventory" as StepId,
            label: t("summary.inventory"),
            value: counted.length
              ? counted.map(([id, qty]) => `${qty}× ${names.get(id) ?? id}`).join(", ")
              : t("summary.none"),
          },
        ]
      : []),
    ...(state.services.clean
      ? [
          {
            step: "cleaning" as StepId,
            label: t("summary.cleaning"),
            value: [
              t(`step2.${clean.propertyType}`),
              clean.roomUnits ? `${clean.roomUnits} ${t("step1.rooms")}` : clean.otherSize || "—",
              `${t("cleaning.windowsNormal")}: ${clean.windowsNormal}`,
              `${t("cleaning.windowsLarge")}: ${clean.windowsLarge}`,
              clean.coverings.length
                ? clean.coverings.map((c) => t(`cleaning.covering.${c}`)).join(" / ")
                : t("summary.none"),
              `${t("cleaning.wetRooms")}: ${clean.wetRooms}`,
              `${t("cleaning.balcony")}: ${yesNo(clean.balcony)}${clean.balcony ? ` (${t("cleaning.pressure")}: ${yesNo(clean.balconyPressure)})` : ""}`,
              `${t("cleaning.cellar")}: ${yesNo(clean.cellar)}`,
              `${t("cleaning.garage")}: ${yesNo(clean.garage)}`,
              `${t("cleaning.carpet")}: ${yesNo(clean.carpet)}${clean.carpet ? ` (${t("cleaning.shampoo")}: ${yesNo(clean.carpetShampoo)})` : ""}`,
              `${t("cleaning.dowelHoles")}: ${clean.dowelHoles}`,
            ].join(" · "),
          },
        ]
      : []),
    ...(state.services.disp
      ? [
          {
            step: "disposal" as StepId,
            label: t("summary.disposal"),
            value: [
              `${t("disposal.volume")}: ${state.disposal.m3 ?? "—"} m³`,
              `${t("disposal.hours")}: ${state.disposal.hours ?? "—"} h`,
              state.disposal.notes,
            ]
              .filter(Boolean)
              .join(" · "),
          },
        ]
      : []),
    ...(cleanOnly
      ? []
      : [
          {
            step: "extras" as StepId,
            label: t("summary.extras"),
            value: state.extras.length
              ? state.extras
                  .map((e) =>
                    e === "packing_material" && state.packingMaterialOption
                      ? `${t(`step8.items.${e}`)} (${t(`step8.packingMaterial.${state.packingMaterialOption}`)})`
                      : t(`step8.items.${e}`),
                  )
                  .join(", ")
              : t("summary.none"),
          },
        ]),
    {
      step: "dates",
      // The one date of the request is named after the service it belongs to.
      label: cleanOnly ? t("summary.cleanDate") : t("summary.moveDate"),
      value: [
        formatCalendarDate(cleanOnly ? (state.cleanDate ?? state.date) : state.date),
        state.startTime,
      ]
        .filter(Boolean)
        .join(" "),
    },
    ...(state.services.clean && state.services.move
      ? [{ step: "dates" as StepId, label: t("summary.cleanDate"), value: formatCalendarDate(state.cleanDate) }]
      : []),
    {
      step: "uploads",
      label: t("summary.uploads"),
      value: state.uploads.length ? `${state.uploads.length}` : t("summary.none"),
    },
    ...(state.notes.trim()
      ? [{ step: "contact" as StepId, label: t("step6.notes"), value: state.notes.trim() }]
      : []),
  ];

  return (
    <div className="rounded-2xl border border-line bg-surface p-5">
      <p className="label-mono text-primary">{t("summary.title")}</p>
      <dl className="mt-4 divide-y divide-line">
        {rows.map((row) => (
          <div key={`${row.step}-${row.label}`} className="flex flex-wrap items-baseline justify-between gap-3 py-3">
            <dt className="label-mono text-soft">{row.label}</dt>
            <dd className="flex min-w-0 items-baseline gap-3">
              <span className="type-small break-words text-ink">{row.value || "—"}</span>
              <button type="button" className="shrink-0 text-sm text-primary underline" onClick={() => onEdit(row.step)}>
                {t("summary.edit")}
              </button>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
