/**
 * Portfolio tools for property managers: spreadsheet import with column
 * mapping and preview, agreed price overrides per property or unit, and a
 * single request covering several units at once.
 *
 * Nothing here prices anything on its own — prices shown come from the
 * published configuration the portal already loaded.
 */
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { usePortal } from "@/components/portal/PortalContext";
import { formatCurrency } from "@/i18n/format";
import { isLang, type Lang } from "@/i18n/config";
import {
  IMPORT_FIELDS,
  SERVICE_KEYS,
  archiveOverride,
  buildImportRows,
  createJobsForUnits,
  guessMapping,
  importPortfolio,
  parseDelimited,
  saveOverride,
  type ImportField,
  type ImportRow,
  type OverrideRow,
  type ParsedSheet,
  type Property,
  type Unit,
} from "@/lib/portal";

const inputClass =
  "mt-1 w-full border border-line bg-canvas px-3 py-2 text-sm text-ink outline-none focus:border-ink";
const btn =
  "bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-60";
const ghost = "label-mono border border-line px-3 py-2 text-soft hover:border-ink hover:text-ink";

/* --------------------------------------------------------------- import */

export function PortfolioImport({ onDone }: { onDone: () => Promise<unknown> }) {
  const { t } = useTranslation("portal");
  const { data } = usePortal();
  const orgId = data.organization?.id ?? null;

  const [sheet, setSheet] = useState<ParsedSheet | null>(null);
  const [mapping, setMapping] = useState<(ImportField | "")[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const preview: ImportRow[] = useMemo(
    () => (sheet ? buildImportRows(sheet, mapping) : []),
    [sheet, mapping],
  );
  const valid = preview.filter((row) => row.problems.length === 0);

  async function pick(file: File) {
    setError(null);
    setMessage(null);
    if (!/\.(csv|txt|tsv)$/i.test(file.name)) {
      setError(t("portfolio.import.formatError"));
      return;
    }
    const parsed = parseDelimited(await file.text());
    setSheet(parsed);
    setMapping(guessMapping(parsed.headers));
  }

  async function confirm() {
    if (!orgId || valid.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const result = await importPortfolio(orgId, preview, data.properties);
      await onDone();
      setMessage(t("portfolio.import.done", result));
      setSheet(null);
    } catch {
      setError(t("portfolio.error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-6 border border-ink bg-surface p-5 md:p-7">
      <h2 className="text-2xl">{t("portfolio.import.title")}</h2>
      <p className="mt-2 max-w-2xl text-sm text-ink-2">{t("portfolio.import.hint")}</p>

      <label className="mt-4 block text-sm">
        <span className="label-mono text-soft">{t("portfolio.import.file")}</span>
        <input
          type="file"
          accept=".csv,.txt,.tsv,text/csv"
          className={inputClass}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void pick(file);
          }}
        />
      </label>

      {error ? (
        <p role="alert" className="mt-3 border-l-4 border-destructive bg-canvas px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {message ? <p className="mt-3 text-sm text-ink-2">{message}</p> : null}

      {sheet ? (
        <>
          <h3 className="label-mono mt-6 text-soft">{t("portfolio.import.mapping")}</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {sheet.headers.map((header, index) => (
              <label key={`${header}-${index}`} className="text-sm">
                <span className="label-mono text-soft">{header || `#${index + 1}`}</span>
                <select
                  value={mapping[index] ?? ""}
                  onChange={(event) =>
                    setMapping((prev) =>
                      prev.map((v, i) => (i === index ? (event.target.value as ImportField | "") : v)),
                    )
                  }
                  className={inputClass}
                >
                  <option value="">{t("portfolio.import.ignore")}</option>
                  {IMPORT_FIELDS.map((field) => (
                    <option key={field} value={field}>
                      {t(`portfolio.import.field.${field}`)}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>

          <h3 className="label-mono mt-6 text-soft">
            {t("portfolio.import.preview", { valid: valid.length, total: preview.length })}
          </h3>
          <div className="mt-3 overflow-x-auto border border-line">
            <table className="w-full min-w-[46rem] text-sm">
              <thead>
                <tr>
                  {["address", "zip", "city", "label", "rooms", "status"].map((key) => (
                    <th key={key} className="label-mono border-b border-ink px-3 py-2 text-start text-soft">
                      {t(`portfolio.import.col.${key}`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.slice(0, 25).map((row, index) => (
                  <tr key={index} className="border-b border-line last:border-b-0">
                    <td className="px-3 py-2 text-ink">{row.property.address || "—"}</td>
                    <td className="data-mono px-3 py-2">{row.property.zip || "—"}</td>
                    <td className="px-3 py-2 text-ink-2">{row.property.city || "—"}</td>
                    <td className="px-3 py-2 text-ink-2">{row.unit?.label ?? "—"}</td>
                    <td className="data-mono px-3 py-2">{row.unit?.rooms ?? "—"}</td>
                    <td className="px-3 py-2 text-ink-2">
                      {row.problems.length === 0
                        ? t("portfolio.import.ok")
                        : row.problems.map((p) => t(`portfolio.import.problem.${p}`)).join(", ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button type="button" className={`${btn} mt-4`} disabled={busy || valid.length === 0} onClick={() => void confirm()}>
            {busy ? t("portfolio.saving") : t("portfolio.import.confirm", { count: valid.length })}
          </button>
        </>
      ) : null}
    </section>
  );
}

/* ------------------------------------------------------------- overrides */

export function OverridesPanel({
  property,
  units,
  overrides,
  onChanged,
}: {
  property: Property;
  units: Unit[];
  overrides: OverrideRow[];
  onChanged: () => Promise<unknown>;
}) {
  const { t, i18n } = useTranslation("portal");
  const lang = (isLang(i18n.language) ? i18n.language : "de") as Lang;
  const { data } = usePortal();
  const orgId = data.organization?.id ?? null;

  const unitIds = new Set(units.map((u) => u.id));
  const mine = overrides.filter(
    (o) => o.property_id === property.id || (o.unit_id != null && unitIds.has(o.unit_id)),
  );

  const [service, setService] = useState<string>(SERVICE_KEYS[0]);
  const [scope, setScope] = useState<string>("property");
  const [price, setPrice] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const unitTypes = useMemo(
    () => [...new Set(data.rates.filter((r) => r.service === service).map((r) => r.unit_type))],
    [data.rates, service],
  );
  const [unitType, setUnitType] = useState<string>("");

  async function add() {
    const value = Number(price.replace(",", "."));
    if (!orgId || !Number.isFinite(value) || value <= 0) return;
    setBusy(true);
    try {
      await saveOverride({
        organizationId: orgId,
        propertyId: scope === "property" ? property.id : null,
        unitId: scope === "property" ? null : scope,
        service,
        unitType: unitType || (unitTypes[0] ?? "per_job"),
        price: value,
        note,
      });
      setPrice("");
      setNote("");
      await onChanged();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-5 border-t border-line pt-5">
      <h3 className="text-xl">{t("portfolio.override.title")}</h3>
      <p className="mt-1 text-sm text-ink-2">{t("portfolio.override.hint")}</p>

      {mine.length === 0 ? (
        <p className="mt-3 text-sm text-soft">{t("portfolio.override.empty")}</p>
      ) : (
        <ul className="mt-3 space-y-px bg-line">
          {mine.map((row) => (
            <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 bg-surface px-3 py-2 text-sm">
              <span className="text-ink-2">
                {t(`service.${row.service}`, row.service)} · {row.unit_type} ·{" "}
                {row.unit_id
                  ? units.find((u) => u.id === row.unit_id)?.label ?? t("portfolio.override.unit")
                  : t("portfolio.override.property")}
              </span>
              <span className="flex items-center gap-3">
                <span className="data-mono text-ink">{formatCurrency(Number(row.price), lang)}</span>
                <button
                  type="button"
                  className={ghost}
                  onClick={() => void archiveOverride(row.id).then(onChanged)}
                >
                  {t("portfolio.override.remove")}
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 grid gap-3 border border-line bg-canvas p-3 md:grid-cols-5">
        <label className="text-sm">
          <span className="label-mono text-soft">{t("portfolio.override.scope")}</span>
          <select value={scope} onChange={(e) => setScope(e.target.value)} className={inputClass}>
            <option value="property">{t("portfolio.override.property")}</option>
            {units.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="label-mono text-soft">{t("portfolio.override.service")}</span>
          <select
            value={service}
            onChange={(e) => {
              setService(e.target.value);
              setUnitType("");
            }}
            className={inputClass}
          >
            {SERVICE_KEYS.map((key) => (
              <option key={key} value={key}>
                {t(`service.${key}`, key)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="label-mono text-soft">{t("portfolio.override.unitType")}</span>
          <select value={unitType} onChange={(e) => setUnitType(e.target.value)} className={inputClass}>
            {unitTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="label-mono text-soft">{t("portfolio.override.price")}</span>
          <input value={price} onChange={(e) => setPrice(e.target.value)} className={`${inputClass} data-mono`} />
        </label>
        <label className="text-sm">
          <span className="label-mono text-soft">{t("portfolio.notes")}</span>
          <input value={note} onChange={(e) => setNote(e.target.value)} className={inputClass} />
        </label>
        <button type="button" className={`${btn} md:col-span-5 md:justify-self-start`} disabled={busy} onClick={() => void add()}>
          {busy ? t("portfolio.saving") : t("portfolio.override.add")}
        </button>
      </div>
    </div>
  );
}

/* ---------------------------------------------------- multi-unit request */

export function MultiUnitRequest({
  units,
  onDone,
}: {
  units: Unit[];
  onDone: () => Promise<unknown>;
}) {
  const { t } = useTranslation("portal");
  const { data } = usePortal();
  const orgId = data.organization?.id ?? null;
  const actorId = data.profile?.id ?? null;

  const [selected, setSelected] = useState<string[]>([]);
  const [moveOut, setMoveOut] = useState("");
  const [handover, setHandover] = useState("");
  const [services, setServices] = useState<Record<string, boolean>>({ clean: true });
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  async function submit() {
    if (!orgId || !actorId || selected.length === 0) return;
    setBusy(true);
    try {
      await createJobsForUnits(
        {
          organizationId: orgId,
          moveOutDate: moveOut,
          handoverDate: handover,
          services,
          notes,
          amount: 0,
          actorId,
        },
        selected,
      );
      setSelected([]);
      setNotes("");
      await onDone();
      setMessage(t("portfolio.multi.done", { count: selected.length }));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-5 border-t border-line pt-5">
      <h3 className="text-xl">{t("portfolio.multi.title")}</h3>
      <p className="mt-1 text-sm text-ink-2">{t("portfolio.multi.hint")}</p>

      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className={ghost} onClick={() => setSelected(units.map((u) => u.id))}>
          {t("portfolio.multi.selectAll")}
        </button>
        <button type="button" className={ghost} onClick={() => setSelected([])}>
          {t("portfolio.multi.clear")}
        </button>
      </div>

      <ul className="mt-3 flex flex-wrap gap-2">
        {units.map((unit) => (
          <li key={unit.id}>
            <label className="label-mono flex items-center gap-2 border border-line px-3 py-2 text-soft">
              <input
                type="checkbox"
                className="size-4 accent-ink"
                checked={selected.includes(unit.id)}
                onChange={() => toggle(unit.id)}
              />
              {unit.label}
            </label>
          </li>
        ))}
      </ul>

      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <label className="text-sm">
          <span className="label-mono text-soft">{t("portfolio.multi.moveOut")}</span>
          <input type="date" value={moveOut} onChange={(e) => setMoveOut(e.target.value)} className={inputClass} />
        </label>
        <label className="text-sm">
          <span className="label-mono text-soft">{t("portfolio.multi.handover")}</span>
          <input type="date" value={handover} onChange={(e) => setHandover(e.target.value)} className={inputClass} />
        </label>
        <fieldset className="text-sm md:col-span-2">
          <legend className="label-mono text-soft">{t("portfolio.multi.services")}</legend>
          <div className="mt-1 flex flex-wrap gap-2">
            {SERVICE_KEYS.map((key) => (
              <label key={key} className="label-mono flex items-center gap-2 border border-line px-3 py-2 text-soft">
                <input
                  type="checkbox"
                  className="size-4 accent-ink"
                  checked={Boolean(services[key])}
                  onChange={(e) => setServices((prev) => ({ ...prev, [key]: e.target.checked }))}
                />
                {t(`service.${key}`, key)}
              </label>
            ))}
          </div>
        </fieldset>
        <label className="text-sm md:col-span-4">
          <span className="label-mono text-soft">{t("portfolio.notes")}</span>
          <input value={notes} onChange={(e) => setNotes(e.target.value)} className={inputClass} />
        </label>
      </div>

      {message ? <p className="mt-3 text-sm text-ink-2">{message}</p> : null}

      <button
        type="button"
        className={`${btn} mt-4`}
        disabled={busy || selected.length === 0}
        onClick={() => void submit()}
      >
        {busy ? t("portfolio.saving") : t("portfolio.multi.submit", { count: selected.length })}
      </button>
    </div>
  );
}
