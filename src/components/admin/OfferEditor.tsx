/**
 * Staff editor for the whole offer: customer, addresses, access, property,
 * inventory, dates, cleaning, disposal, extras, notes and team plan.
 * Saving re-prices with the existing engine and creates a new version.
 */
import { Fragment, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { btn, btnPrimary, field } from "@/components/system";
import { fetchInventory } from "@/lib/inventory";
import { saveEditedOffer, adminRowToState } from "@/lib/offer-edit";
import { EXTRA_SERVICES, WINDOW_COVERINGS, type Level, type Lift, type PlannerState, type PropertyType } from "@/lib/pricing";
import type { QuoteRow } from "@/lib/quotes";
import { adjustPrice } from "@/lib/dop";
import { joinName, splitName } from "@/lib/person-name";
import { OfferDocuments } from "@/components/admin/OfferDocuments";

const COVERINGS_DE: Record<string, string> = { lamellen: "ed.cov.lamellen", rollladen: "ed.cov.rollladen", fensterlaeden: "ed.cov.fensterlaeden" };

const LIFTS: [Lift, string][] = [["ok", "ed.lift.ok"], ["small", "ed.lift.small"], ["none", "ed.lift.none"]];
const LEVELS: [Level, string][] = [[0, "ed.level.0"], [1, "ed.level.1"], [2, "ed.level.2"]];
const PROPS: [PropertyType, string][] = [["flat", "ed.prop.flat"], ["house", "ed.prop.house"], ["office", "ed.prop.office"]];

export function OfferEditor({ quote, onSaved, onClose }: { quote: QuoteRow; onSaved: (msg: string) => void; onClose: () => void }) {
  const { t } = useTranslation("dop");
  const [s, setS] = useState<PlannerState>(() => adminRowToState(quote));
  const [team, setTeam] = useState<string>(String(((quote.services ?? {}) as Record<string, unknown>)["team_plan"] ?? ""));
  const [reason, setReason] = useState("");
  const q = quote as QuoteRow & { manual_adjustment?: number | null; manual_adjustment_customer_note?: string | null };
  const [adj, setAdj] = useState<string>(String(q.manual_adjustment ?? 0));
  const [adjNote, setAdjNote] = useState<string>(q.manual_adjustment_customer_note ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const catalogue = useQuery({ queryKey: ["inventory-catalogue", "all"], queryFn: () => fetchInventory(true) });
  const names = useMemo(() => new Map((catalogue.data ?? []).map((i) => [i.key, i.name_de])), [catalogue.data]);

  const set = <K extends keyof PlannerState>(k: K, v: PlannerState[K]) => setS((p) => ({ ...p, [k]: v }));
  const txt = (label: string, k: keyof PlannerState) => (
    <label className="text-sm">{label}
      <input className={field} value={String(s[k] ?? "")} onChange={(e) => set(k, e.target.value as never)} />
    </label>
  );
  const num = (label: string, v: number | null, on: (n: number | null) => void, allowNull = false) => (
    <label className="text-sm">{label}
      <input className={field} type="number" min={0} step="any" value={v ?? ""} onChange={(e) => on(e.target.value === "" && allowNull ? null : Number(e.target.value) || 0)} />
    </label>
  );
  const chk = (label: string, v: boolean, on: (b: boolean) => void) => (
    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={v} onChange={(e) => on(e.target.checked)} />{label}</label>
  );
  const sel = <T extends string | number>(label: string, v: T, opts: [T, string][], on: (x: T) => void) => (
    <label className="text-sm">{label}
      <select className={field} value={String(v)} onChange={(e) => { const hit = opts.find(([o]) => String(o) === e.target.value); if (hit) on(hit[0]); }}>
        {opts.map(([o, l]) => <option key={String(o)} value={String(o)}>{t(l)}</option>)}
      </select>
    </label>
  );
  const sec = (title: string, body: React.ReactNode) => (
    <fieldset className="rounded-md border border-line p-3"><legend className="label-mono px-1 text-primary">{title}</legend>
      <div className="grid gap-3 sm:grid-cols-3">{body}</div></fieldset>
  );

  const itemKeys = Array.from(new Set([...(catalogue.data ?? []).filter((i) => i.active).map((i) => i.key), ...Object.keys(s.items)]));

  async function save() {
    if (!reason.trim()) { setError(t("ed.needReason")); return; }
    setBusy(true); setError(null);
    try {
      const r = await saveEditedOffer(quote, s, reason, team);
      const delta = Math.round((Number(adj) || 0) * 100) / 100;
      let adjusted = "";
      if (r.priced && (delta !== Number(q.manual_adjustment ?? 0) || (delta !== 0 && adjNote !== (q.manual_adjustment_customer_note ?? "")))) {
        const v = await adjustPrice(quote.id, delta, reason, adjNote);
        adjusted = " " + t("ed.adjSaved", { delta: delta.toFixed(2), v });
      }
      onSaved((r.priced
        ? t("ed.savedPriced", { v: r.version })
        : t("ed.savedUnpriced", { v: r.version, why: r.blocking.length ? t("ed.missingVolume", { items: r.blocking.map((k) => names.get(k) ?? k).join(", ") }) : t("ed.incomplete") })) + adjusted);
    } catch (e) {
      const m = e instanceof Error ? e.message : String(e);
      setError(m.includes("frozen") ? t("ed.frozen") : t("ed.saveFailed", { msg: m }));
    } finally { setBusy(false); }
  }

  return (
    <section className="space-y-4 rounded-md border border-primary bg-surface p-4" aria-label={t("ed.title")}>
      <h3 className="label-mono text-primary">{t("ed.title")}</h3>
      {sec(t("ed.services"), <>
        {chk(t("ed.move"), s.services.move, (b) => set("services", { ...s.services, move: b }))}
        {chk(t("ed.clean"), s.services.clean, (b) => set("services", { ...s.services, clean: b }))}
        {chk(t("ed.disp"), s.services.disp, (b) => set("services", { ...s.services, disp: b }))}
        {chk(t("ed.pack"), s.services.pack, (b) => set("services", { ...s.services, pack: b }))}
      </>)}
      {sec(t("ed.customer"), <>
        <label className="text-sm">{t("corr.first")}<input className={field} value={s.firstName ?? splitName(s.name).first} onChange={(e) => { const l = s.lastName ?? splitName(s.name).last; setS((p) => ({ ...p, firstName: e.target.value, lastName: l, name: joinName(e.target.value, l) })); }} /></label>
        <label className="text-sm">{t("corr.last")}<input className={field} value={s.lastName ?? splitName(s.name).last} onChange={(e) => { const f = s.firstName ?? splitName(s.name).first; setS((p) => ({ ...p, firstName: f, lastName: e.target.value, name: joinName(f, e.target.value) })); }} /></label>
        {txt(t("corr.company"), "company")}{txt(t("corr.phone"), "phone")}{txt(t("corr.email"), "email")}
        {txt(t("ed.street"), "customerStreet")}{txt(t("corr.zip"), "customerZip")}{txt(t("corr.city"), "customerCity")}{txt(t("corr.country"), "customerCountry")}
      </>)}
      {sec(t("ed.from"), <>
        {txt(t("ed.street"), "fromAddress")}{txt(t("corr.zip"), "fromZip")}{txt(t("corr.city"), "fromCity")}
        {num(t("ed.floor"), s.floorOut, (n) => set("floorOut", n ?? 0))}
        {sel(t("ed.liftL"), s.liftOut, LIFTS, (v) => set("liftOut", v))}
        {sel(t("ed.parking"), s.parkingOut, LEVELS, (v) => set("parkingOut", v))}
        {sel(t("ed.carry"), s.carry, LEVELS, (v) => set("carry", v))}
        {chk(t("ed.narrow"), s.narrowStairs, (b) => set("narrowStairs", b))}
        {chk(t("ed.hoist"), s.hoist, (b) => set("hoist", b))}
        {chk(t("ed.extra.parking_permit"), s.permit, (b) => set("permit", b))}
      </>)}
      {s.services.move ? sec(t("ed.to"), <>
        {txt(t("ed.street"), "toAddress")}{txt(t("corr.zip"), "toZip")}{txt(t("corr.city"), "toCity")}
        {num(t("ed.floor"), s.floorIn, (n) => set("floorIn", n ?? 0))}
        {sel(t("ed.liftL"), s.liftIn, LIFTS, (v) => set("liftIn", v))}
        {sel(t("ed.parking"), s.parkingIn, LEVELS, (v) => set("parkingIn", v))}
        {sel(t("ed.carry"), s.carryIn, LEVELS, (v) => set("carryIn", v))}
        {chk(t("ed.narrow"), s.narrowStairsIn, (b) => set("narrowStairsIn", b))}
        {chk(t("ed.hoist"), s.hoistIn, (b) => set("hoistIn", b))}
        {chk(t("ed.extra.parking_permit"), s.permitIn, (b) => set("permitIn", b))}
      </>) : null}
      {sec(t("ed.objDates"), <>
        {sel(t("ed.propType"), s.propertyType, PROPS, (v) => set("propertyType", v))}
        {num(t("ed.rooms"), s.roomUnits, (n) => set("roomUnits", n), true)}
        <label className="text-sm">{t("ed.date")}<input className={field} type="date" value={s.date ?? ""} onChange={(e) => set("date", e.target.value || null)} /></label>
        <label className="text-sm">{t("ed.start")}<input className={field} type="time" value={s.startTime || "08:00"} onChange={(e) => set("startTime", e.target.value || "08:00")} /></label>
        <label className="text-sm">{t("ed.cleanDate")}<input className={field} type="date" value={s.cleanDate ?? ""} onChange={(e) => set("cleanDate", e.target.value || null)} /></label>
      </>)}
      {s.services.move ? (
        <fieldset className="rounded-md border border-line p-3"><legend className="label-mono px-1 text-primary">{t("ed.inventory")}</legend>
          <div className="grid gap-2 sm:grid-cols-4">
            {itemKeys.map((k) => <Fragment key={k}>{num(names.get(k) ?? k, s.items[k] ?? 0, (n) => set("items", { ...s.items, [k]: n ?? 0 }))}</Fragment>)}
          </div></fieldset>
      ) : null}
      {s.services.clean ? sec(t("ed.clean"), <>
        {num(t("ed.winNormal"), s.cleaning.windowsNormal, (n) => set("cleaning", { ...s.cleaning, windowsNormal: n ?? 0 }))}
        {num(t("ed.winLarge"), s.cleaning.windowsLarge, (n) => set("cleaning", { ...s.cleaning, windowsLarge: n ?? 0 }))}
        {num(t("ed.wet"), s.cleaning.wetRooms, (n) => set("cleaning", { ...s.cleaning, wetRooms: n ?? 0 }))}
        {num(t("ed.dowel"), s.cleaning.dowelHoles, (n) => set("cleaning", { ...s.cleaning, dowelHoles: n ?? 0 }))}
        {!s.services.move ? num(t("ed.roomsClean"), s.cleaning.roomUnits, (n) => set("cleaning", { ...s.cleaning, roomUnits: n }), true) : null}
        {chk(t("ed.balcony"), s.cleaning.balcony, (b) => set("cleaning", { ...s.cleaning, balcony: b, balconyPressure: b && s.cleaning.balconyPressure }))}
        {chk(t("ed.cellar"), s.cleaning.cellar, (b) => set("cleaning", { ...s.cleaning, cellar: b }))}
        {chk(t("ed.garage"), s.cleaning.garage, (b) => set("cleaning", { ...s.cleaning, garage: b }))}
        {chk(t("ed.carpet"), s.cleaning.carpet, (b) => set("cleaning", { ...s.cleaning, carpet: b, carpetShampoo: b && s.cleaning.carpetShampoo }))}
        {s.cleaning.carpet ? chk(t("ed.shampoo"), s.cleaning.carpetShampoo, (b) => set("cleaning", { ...s.cleaning, carpetShampoo: b })) : null}
        {s.cleaning.balcony ? chk(t("ed.pressure"), s.cleaning.balconyPressure, (b) => set("cleaning", { ...s.cleaning, balconyPressure: b })) : null}
        {!s.services.move ? sel(t("ed.propClean"), s.cleaning.propertyType, PROPS, (v) => set("cleaning", { ...s.cleaning, propertyType: v })) : null}
        {!s.services.move ? <label className="text-sm">{t("ed.otherSize")}<input className={field} value={s.cleaning.otherSize} onChange={(e) => set("cleaning", { ...s.cleaning, otherSize: e.target.value })} /></label> : null}
        <div className="sm:col-span-3 flex flex-wrap gap-4"><span className="text-sm">{t("ed.coverings")}</span>
          {WINDOW_COVERINGS.map((c) => <Fragment key={c}>{chk(t(COVERINGS_DE[c] ?? c), s.cleaning.coverings.includes(c), (b) => set("cleaning", { ...s.cleaning, coverings: b ? [...s.cleaning.coverings, c] : s.cleaning.coverings.filter((x) => x !== c) }))}</Fragment>)}
        </div>
      </>) : null}
      {s.services.disp ? sec(t("ed.disp"), <>
        {num(t("ed.vol"), s.disposal.m3, (n) => set("disposal", { ...s.disposal, m3: n }), true)}
        {num(t("ed.hours"), s.disposal.hours, (n) => set("disposal", { ...s.disposal, hours: n }), true)}
        <label className="text-sm sm:col-span-3">{t("ed.dispNotes")}<textarea className={field} rows={2} value={s.disposal.notes} onChange={(e) => set("disposal", { ...s.disposal, notes: e.target.value })} /></label>
      </>) : null}
      {sec(t("ed.extras"), <>
        {EXTRA_SERVICES.map((x) => <Fragment key={x}>{chk(t(`ed.extra.${x}`), s.extras.includes(x), (b) => set("extras", b ? [...s.extras, x] : s.extras.filter((e) => e !== x)))}</Fragment>)}
        {s.extras.includes("lamp_installation") ? num(t("ed.lamps"), s.lampCount, (n) => set("lampCount", n ?? 0)) : null}
      </>)}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">{t("ed.notes")}<textarea className={field} rows={3} value={s.notes} onChange={(e) => set("notes", e.target.value)} /></label>
        <label className="text-sm">{t("ed.team")}<textarea className={field} rows={3} value={team} onChange={(e) => setTeam(e.target.value)} /></label>
      </div>
      {sec(t("ed.discount"), <>
        <p className="text-sm text-ink-2 sm:col-span-3">{t("ed.discountHelp")}</p>
        <label className="text-sm">{t("ed.adj")}<input className={field} type="number" step="0.05" value={adj} onChange={(e) => setAdj(e.target.value)} /></label>
        <label className="text-sm sm:col-span-2">{t("ed.adjNote")}<input className={field} value={adjNote} onChange={(e) => setAdjNote(e.target.value)} /></label>
      </>)}
      <OfferDocuments quote={quote} />
      <label className="block text-sm">{t("ed.reason")}
        <input className={field} value={reason} onChange={(e) => setReason(e.target.value)} />
      </label>
      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
      <div className="flex gap-3">
        <button type="button" className={btnPrimary} disabled={busy} onClick={() => void save()}>{busy ? t("common.saving") : t("ed.saveReprice")}</button>
        <button type="button" className={btn} onClick={onClose}>{t("common.cancel")}</button>
      </div>
    </section>
  );
}
