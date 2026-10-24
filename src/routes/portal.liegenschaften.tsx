/**
 * /portal/liegenschaften — the organisation manages its own portfolio.
 * Every write goes through the existing organisation-scoped RLS policies.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { usePortal } from "@/components/portal/PortalContext";
import { UnitDetails } from "@/components/portal/UnitDetails";
import {
  MultiUnitRequest,
  OverridesPanel,
  PortfolioImport,
} from "@/components/portal/PortfolioTools";
import i18n from "@/i18n/config";
import {
  ROOM_OPTIONS,
  UNIT_TYPES,
  cleaningUnitType,
  createProperty,
  fetchOverrides,
  type OverrideRow,
  createUnits,
  updateProperty,
  updateUnit,
  type Property,
  type PropertyInput,
  type Unit,
  type UnitInput,
} from "@/lib/portal";
import { langOf, privateHead } from "@/lib/seo";

export const Route = createFileRoute("/portal/liegenschaften")({
  head: () => privateHead(langOf(i18n.language), "portalPortfolio"),
  component: PortfolioPage,
});

const inputClass =
  "mt-1 w-full border border-line bg-canvas px-3 py-2 text-sm text-ink outline-none focus:border-ink";
const btn = "bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-60";
const ghost = "label-mono border border-line px-3 py-2 text-soft hover:border-ink hover:text-ink";

const emptyProperty: PropertyInput = {
  address: "",
  zip: "",
  city: "",
  canton: "",
  reference: "",
  unit_count: 0,
  notes: "",
};

const emptyUnit = (): UnitInput => ({
  label: "",
  unit_type: "wohnung",
  rooms: 3.5,
  floor: 0,
  has_lift: false,
  size_m2: null,
  notes: "",
});

function PortfolioPage() {
  const { data, reload, loading } = usePortal();
  const { t } = useTranslation("portal");
  const orgId = data.organization?.id ?? null;

  const [showArchived, setShowArchived] = useState(false);
  const [query, setQuery] = useState("");
  const [importing, setImporting] = useState(false);
  const [overrides, setOverrides] = useState<OverrideRow[]>([]);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<PropertyInput>(emptyProperty);
  const [editingProperty, setEditingProperty] = useState<string | null>(null);
  const [openProperty, setOpenProperty] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const properties = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return data.properties
      .filter((p) => showArchived || !p.archived)
      .filter((p) =>
        needle === ""
          ? true
          : [p.address, p.zip, p.city, p.reference]
              .filter(Boolean)
              .some((field) => String(field).toLowerCase().includes(needle)),
      );
  }, [data.properties, showArchived, query]);

  const loadOverrides = async () => {
    try {
      setOverrides(await fetchOverrides());
    } catch {
      setOverrides([]);
    }
  };

  useEffect(() => {
    void loadOverrides();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  async function run(action: () => Promise<unknown>) {
    setError(null);
    setBusy(true);
    try {
      await action();
      await reload();
    } catch {
      setError(t("portfolio.error"));
    } finally {
      setBusy(false);
    }
  }

  async function saveNewProperty() {
    if (!orgId || !form.address.trim()) {
      setError(t("portfolio.property.required"));
      return;
    }
    await run(async () => {
      await createProperty(orgId, form);
      setForm(emptyProperty);
      setCreating(false);
    });
  }

  if (loading) {
    return <p className="label-mono mx-auto max-w-7xl px-4 py-12 text-soft md:px-8">{t("loading")}</p>;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 md:px-8">
      <p className="label-mono text-primary">{t("portfolio.eyebrow")}</p>
      <h1 className="mt-3 text-4xl md:text-5xl">{t("portfolio.title")}</h1>
      <p className="mt-2 max-w-2xl text-sm text-ink-2">{t("portfolio.subtitle")}</p>

      {error ? (
        <p role="alert" className="mt-4 border-l-4 border-destructive bg-surface px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button type="button" className={btn} onClick={() => setCreating((v) => !v)}>
          {creating ? t("portfolio.cancel") : t("portfolio.property.add")}
        </button>
        <button type="button" className={ghost} onClick={() => setImporting((v) => !v)}>
          {importing ? t("portfolio.cancel") : t("portfolio.importToggle")}
        </button>
        <label className="text-sm">
          <span className="sr-only">{t("portfolio.search")}</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("portfolio.search")}
            className="w-72 max-w-full border border-line bg-canvas px-3 py-2 text-sm text-ink outline-none focus:border-ink"
          />
        </label>
        <label className="label-mono flex items-center gap-2 text-soft">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(event) => setShowArchived(event.target.checked)}
            className="size-4 accent-ink"
          />
          {t("portfolio.showArchived")}
        </label>
      </div>

      {importing ? <PortfolioImport onDone={reload} /> : null}

      {creating ? (
        <section className="mt-6 border border-ink bg-surface p-5 md:p-7">
          <h2 className="text-2xl">{t("portfolio.property.add")}</h2>
          <PropertyFields value={form} onChange={setForm} />
          <button type="button" className={`${btn} mt-5`} disabled={busy} onClick={() => void saveNewProperty()}>
            {busy ? t("portfolio.saving") : t("portfolio.save")}
          </button>
        </section>
      ) : null}

      {properties.length === 0 ? (
        <p className="mt-8 max-w-2xl border border-ink bg-surface p-6 text-sm text-ink-2">
          {query.trim() ? t("portfolio.noMatch") : t("portfolio.empty")}
        </p>
      ) : (
        <div className="mt-8 space-y-px bg-line">
          {properties.map((property) => (
            <PropertyCard
              key={property.id}
              property={property}
              units={data.units.filter((u) => u.property_id === property.id && (showArchived || !u.archived))}
              open={openProperty === property.id}
              editing={editingProperty === property.id}
              busy={busy}
              onToggle={() => setOpenProperty(openProperty === property.id ? null : property.id)}
              onEdit={() => setEditingProperty(editingProperty === property.id ? null : property.id)}
              onSaveProperty={(patch) =>
                void run(async () => {
                  await updateProperty(property.id, patch);
                  setEditingProperty(null);
                })
              }
              onArchiveProperty={() => void run(() => updateProperty(property.id, { archived: !property.archived }))}
              onAddUnits={(rows) =>
                orgId ? run(() => createUnits(orgId, property.id, rows)) : Promise.resolve()
              }
              onSaveUnit={(id, patch) => void run(() => updateUnit(id, patch))}
              overrides={overrides}
              onOverridesChanged={loadOverrides}
              onReload={reload}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PropertyFields({ value, onChange }: { value: PropertyInput; onChange: (next: PropertyInput) => void }) {
  const { t } = useTranslation("portal");
  const set = (patch: Partial<PropertyInput>) => onChange({ ...value, ...patch });
  return (
    <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <label className="text-sm">
        <span className="label-mono text-soft">{t("portfolio.property.address")}</span>
        <input value={value.address} onChange={(e) => set({ address: e.target.value })} className={inputClass} />
      </label>
      <label className="text-sm">
        <span className="label-mono text-soft">{t("portfolio.property.zip")}</span>
        <input value={value.zip} onChange={(e) => set({ zip: e.target.value })} className={`${inputClass} data-mono`} />
      </label>
      <label className="text-sm">
        <span className="label-mono text-soft">{t("portfolio.property.city")}</span>
        <input value={value.city} onChange={(e) => set({ city: e.target.value })} className={inputClass} />
      </label>
      <label className="text-sm">
        <span className="label-mono text-soft">{t("portfolio.property.canton")}</span>
        <input
          value={value.canton}
          maxLength={2}
          onChange={(e) => set({ canton: e.target.value.toUpperCase() })}
          className={`${inputClass} data-mono`}
        />
      </label>
      <label className="text-sm">
        <span className="label-mono text-soft">{t("portfolio.property.reference")}</span>
        <input value={value.reference} onChange={(e) => set({ reference: e.target.value })} className={inputClass} />
      </label>
      <label className="text-sm">
        <span className="label-mono text-soft">{t("portfolio.property.unitCount")}</span>
        <input
          type="number"
          min={0}
          value={value.unit_count}
          onChange={(e) => set({ unit_count: Number(e.target.value) || 0 })}
          className={`${inputClass} data-mono`}
        />
      </label>
      <label className="text-sm sm:col-span-2 lg:col-span-3">
        <span className="label-mono text-soft">{t("portfolio.notes")}</span>
        <textarea rows={2} value={value.notes} onChange={(e) => set({ notes: e.target.value })} className={inputClass} />
      </label>
    </div>
  );
}

function PropertyCard({
  property,
  units,
  open,
  editing,
  busy,
  onToggle,
  onEdit,
  onSaveProperty,
  onArchiveProperty,
  onAddUnits,
  onSaveUnit,
  overrides,
  onOverridesChanged,
  onReload,
}: {
  property: Property;
  units: Unit[];
  open: boolean;
  editing: boolean;
  busy: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onSaveProperty: (patch: PropertyInput) => void;
  onArchiveProperty: () => void;
  onAddUnits: (rows: UnitInput[]) => Promise<unknown>;
  onSaveUnit: (id: string, patch: Partial<UnitInput> & { archived?: boolean }) => void;
  overrides: OverrideRow[];
  onOverridesChanged: () => Promise<unknown>;
  onReload: () => Promise<unknown>;
}) {
  const { t } = useTranslation("portal");
  const [draft, setDraft] = useState<PropertyInput>({
    address: property.address,
    zip: property.zip,
    city: property.city,
    canton: property.canton,
    reference: property.reference,
    unit_count: property.unit_count,
    notes: property.notes,
  });

  return (
    <section className="bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl">
            {property.address}
            {property.archived ? <span className="label-mono ms-3 text-soft">{t("portfolio.archived")}</span> : null}
          </h2>
          <p className="label-mono mt-1 text-soft">
            {property.zip} {property.city}
            {property.canton ? ` · ${property.canton}` : ""}
            {property.reference ? ` · ${property.reference}` : ""} · {t("portfolio.unitsCount", { count: units.length })}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={ghost} onClick={onToggle} aria-expanded={open}>
            {open ? t("portfolio.hideUnits") : t("portfolio.showUnits")}
          </button>
          <button type="button" className={ghost} onClick={onEdit}>
            {editing ? t("portfolio.cancel") : t("portfolio.edit")}
          </button>
          <button type="button" className={ghost} onClick={onArchiveProperty} disabled={busy}>
            {property.archived ? t("portfolio.restore") : t("portfolio.archive")}
          </button>
        </div>
      </div>

      {editing ? (
        <div className="mt-4 border border-line bg-canvas p-4">
          <PropertyFields value={draft} onChange={setDraft} />
          <button type="button" className={`${btn} mt-4`} disabled={busy} onClick={() => onSaveProperty(draft)}>
            {busy ? t("portfolio.saving") : t("portfolio.save")}
          </button>
        </div>
      ) : null}

      {open ? (
        <>
          <UnitsPanel units={units} busy={busy} onAddUnits={onAddUnits} onSaveUnit={onSaveUnit} />
          {units.length > 0 ? <MultiUnitRequest units={units} onDone={onReload} /> : null}
          <OverridesPanel
            property={property}
            units={units}
            overrides={overrides}
            onChanged={onOverridesChanged}
          />
        </>
      ) : null}
    </section>
  );
}

function UnitsPanel({
  units,
  busy,
  onAddUnits,
  onSaveUnit,
}: {
  units: Unit[];
  busy: boolean;
  onAddUnits: (rows: UnitInput[]) => Promise<unknown>;
  onSaveUnit: (id: string, patch: Partial<UnitInput> & { archived?: boolean }) => void;
}) {
  const { t } = useTranslation("portal");
  const { data } = usePortal();
  const [rows, setRows] = useState<UnitInput[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  const setRow = (index: number, patch: Partial<UnitInput>) =>
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  async function saveRows() {
    const valid = rows.filter((row) => row.label.trim().length > 0);
    if (valid.length === 0) return;
    await onAddUnits(valid);
    setRows([]);
  }

  return (
    <div className="mt-5 border-t border-line pt-5">
      <h3 className="text-xl">{t("portfolio.unit.title")}</h3>

      {units.length === 0 ? (
        <p className="mt-3 text-sm text-soft">{t("portfolio.unit.empty")}</p>
      ) : (
        <div className="mt-3 overflow-x-auto border border-line">
          <table className="w-full min-w-[46rem] border-collapse text-sm">
            <thead>
              <tr>
                {["label", "type", "rooms", "floor", "lift", "size", "band", "actions"].map((key) => (
                  <th key={key} className="label-mono border-b border-ink px-3 py-2 text-start text-soft">
                    {t(`portfolio.unit.col.${key}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {units.map((unit) =>
                editId === unit.id ? (
                  <tr key={unit.id} className="border-b border-line bg-canvas">
                    <td colSpan={8} className="px-3 py-3">
                      <UnitEditor
                        unit={unit}
                        busy={busy}
                        onCancel={() => setEditId(null)}
                        onSave={(patch) => {
                          onSaveUnit(unit.id, patch);
                          setEditId(null);
                        }}
                      />
                    </td>
                  </tr>
                ) : (
                  <tr key={unit.id} className="border-b border-line">
                    <td className="px-3 py-2 text-ink">
                      {unit.label}
                      {unit.archived ? <span className="label-mono ms-2 text-soft">{t("portfolio.archived")}</span> : null}
                    </td>
                    <td className="px-3 py-2 text-ink-2">{t(`unitType.${unit.unit_type}`)}</td>
                    <td className="data-mono px-3 py-2">{unit.rooms ?? "—"}</td>
                    <td className="data-mono px-3 py-2">{unit.floor}</td>
                    <td className="px-3 py-2 text-ink-2">{unit.has_lift ? t("portfolio.yes") : t("portfolio.no")}</td>
                    <td className="data-mono px-3 py-2">{unit.size_m2 != null ? `${unit.size_m2} m²` : "—"}</td>
                    <td className="px-3 py-2 text-ink-2">
                      {cleaningUnitType(data.bands, unit.rooms == null ? null : Number(unit.rooms)) ?? t("portfolio.unit.quotation")}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-2">
                        <button type="button" className={ghost} onClick={() => setEditId(unit.id)}>
                          {t("portfolio.edit")}
                        </button>
                        <button
                          type="button"
                          className={ghost}
                          aria-expanded={detailId === unit.id}
                          onClick={() => setDetailId(detailId === unit.id ? null : unit.id)}
                        >
                          {t("portfolio.unit.details")}
                        </button>
                        <button
                          type="button"
                          className={ghost}
                          disabled={busy}
                          onClick={() => onSaveUnit(unit.id, { archived: !unit.archived })}
                        >
                          {unit.archived ? t("portfolio.restore") : t("portfolio.archive")}
                        </button>
                      </div>
                    </td>
                  </tr>
                ),
              )}
              {detailId && units.some((unit) => unit.id === detailId) ? (
                <tr className="border-b border-line bg-canvas">
                  <td colSpan={8} className="px-3 py-4">
                    <UnitDetails unit={units.find((unit) => unit.id === detailId)!} />
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-5 border border-line bg-canvas p-4">
        <h4 className="label-mono text-soft">{t("portfolio.unit.bulk")}</h4>
        {rows.length === 0 ? (
          <p className="mt-2 text-sm text-soft">{t("portfolio.unit.bulkHint")}</p>
        ) : (
          <div className="mt-3 space-y-3">
            {rows.map((row, index) => (
              <div key={index} className="grid gap-3 border border-line bg-surface p-3 md:grid-cols-6">
                <label className="text-sm md:col-span-2">
                  <span className="label-mono text-soft">{t("portfolio.unit.col.label")}</span>
                  <input value={row.label} onChange={(e) => setRow(index, { label: e.target.value })} className={inputClass} />
                </label>
                <label className="text-sm">
                  <span className="label-mono text-soft">{t("portfolio.unit.col.type")}</span>
                  <select value={row.unit_type} onChange={(e) => setRow(index, { unit_type: e.target.value })} className={inputClass}>
                    {UNIT_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {t(`unitType.${type}`)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm">
                  <span className="label-mono text-soft">{t("portfolio.unit.col.rooms")}</span>
                  <select
                    value={row.rooms == null ? "" : String(row.rooms)}
                    onChange={(e) => setRow(index, { rooms: e.target.value === "" ? null : Number(e.target.value) })}
                    className={`${inputClass} data-mono`}
                  >
                    <option value="">{t("portfolio.unit.roomsUnknown")}</option>
                    {ROOM_OPTIONS.map((value) => (
                      <option key={value} value={value}>
                        {value === 6 ? "6.0+" : value.toFixed(1)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm">
                  <span className="label-mono text-soft">{t("portfolio.unit.col.floor")}</span>
                  <input
                    type="number"
                    value={row.floor}
                    onChange={(e) => setRow(index, { floor: Number(e.target.value) || 0 })}
                    className={`${inputClass} data-mono`}
                  />
                </label>
                <label className="text-sm">
                  <span className="label-mono text-soft">{t("portfolio.unit.col.size")}</span>
                  <input
                    type="number"
                    value={row.size_m2 ?? ""}
                    onChange={(e) => setRow(index, { size_m2: e.target.value === "" ? null : Number(e.target.value) })}
                    className={`${inputClass} data-mono`}
                  />
                </label>
                <label className="label-mono flex items-end gap-2 text-soft">
                  <input
                    type="checkbox"
                    checked={row.has_lift}
                    onChange={(e) => setRow(index, { has_lift: e.target.checked })}
                    className="size-4 accent-ink"
                  />
                  {t("portfolio.unit.col.lift")}
                </label>
                <button
                  type="button"
                  className={`${ghost} md:col-span-6 md:justify-self-start`}
                  onClick={() => setRows((prev) => prev.filter((_, i) => i !== index))}
                >
                  {t("portfolio.unit.removeRow")}
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className={ghost} onClick={() => setRows((prev) => [...prev, emptyUnit()])}>
            {t("portfolio.unit.addRow")}
          </button>
          <button
            type="button"
            className={ghost}
            onClick={() => setRows((prev) => [...prev, ...Array.from({ length: 6 }, () => emptyUnit())])}
          >
            {t("portfolio.unit.addSix")}
          </button>
          <button type="button" className={btn} disabled={busy || rows.length === 0} onClick={() => void saveRows()}>
            {busy ? t("portfolio.saving") : t("portfolio.unit.saveAll", { count: rows.length })}
          </button>
        </div>
      </div>
    </div>
  );
}

function UnitEditor({
  unit,
  busy,
  onCancel,
  onSave,
}: {
  unit: Unit;
  busy: boolean;
  onCancel: () => void;
  onSave: (patch: Partial<UnitInput>) => void;
}) {
  const { t } = useTranslation("portal");
  const [draft, setDraft] = useState<UnitInput>({
    label: unit.label,
    unit_type: unit.unit_type,
    rooms: unit.rooms == null ? null : Number(unit.rooms),
    floor: unit.floor,
    has_lift: unit.has_lift,
    size_m2: unit.size_m2 == null ? null : Number(unit.size_m2),
    notes: unit.notes,
  });
  const set = (patch: Partial<UnitInput>) => setDraft((prev) => ({ ...prev, ...patch }));

  return (
    <div className="grid gap-3 md:grid-cols-6">
      <label className="text-sm md:col-span-2">
        <span className="label-mono text-soft">{t("portfolio.unit.col.label")}</span>
        <input value={draft.label} onChange={(e) => set({ label: e.target.value })} className={inputClass} />
      </label>
      <label className="text-sm">
        <span className="label-mono text-soft">{t("portfolio.unit.col.type")}</span>
        <select value={draft.unit_type} onChange={(e) => set({ unit_type: e.target.value })} className={inputClass}>
          {UNIT_TYPES.map((type) => (
            <option key={type} value={type}>
              {t(`unitType.${type}`)}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm">
        <span className="label-mono text-soft">{t("portfolio.unit.col.rooms")}</span>
        <select
          value={draft.rooms == null ? "" : String(draft.rooms)}
          onChange={(e) => set({ rooms: e.target.value === "" ? null : Number(e.target.value) })}
          className={`${inputClass} data-mono`}
        >
          <option value="">{t("portfolio.unit.roomsUnknown")}</option>
          {ROOM_OPTIONS.map((value) => (
            <option key={value} value={value}>
              {value === 6 ? "6.0+" : value.toFixed(1)}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm">
        <span className="label-mono text-soft">{t("portfolio.unit.col.floor")}</span>
        <input
          type="number"
          value={draft.floor}
          onChange={(e) => set({ floor: Number(e.target.value) || 0 })}
          className={`${inputClass} data-mono`}
        />
      </label>
      <label className="text-sm">
        <span className="label-mono text-soft">{t("portfolio.unit.col.size")}</span>
        <input
          type="number"
          value={draft.size_m2 ?? ""}
          onChange={(e) => set({ size_m2: e.target.value === "" ? null : Number(e.target.value) })}
          className={`${inputClass} data-mono`}
        />
      </label>
      <label className="label-mono flex items-end gap-2 text-soft">
        <input
          type="checkbox"
          checked={draft.has_lift}
          onChange={(e) => set({ has_lift: e.target.checked })}
          className="size-4 accent-ink"
        />
        {t("portfolio.unit.col.lift")}
      </label>
      <label className="text-sm md:col-span-6">
        <span className="label-mono text-soft">{t("portfolio.notes")}</span>
        <input value={draft.notes} onChange={(e) => set({ notes: e.target.value })} className={inputClass} />
      </label>
      <div className="flex gap-2 md:col-span-6">
        <button type="button" className={btn} disabled={busy} onClick={() => onSave(draft)}>
          {busy ? t("portfolio.saving") : t("portfolio.save")}
        </button>
        <button type="button" className={ghost} onClick={onCancel}>
          {t("portfolio.cancel")}
        </button>
      </div>
    </div>
  );
}
