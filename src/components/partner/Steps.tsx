import { Link } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  CardToggle,
  Field,
  NumberField,
  RowCard,
  SectionTitle,
  SelectField,
  TagField,
  TextAreaField,
  TextField,
  ToggleField,
} from "@/components/partner/primitives";
import type { Application, CategoryRow } from "@/components/partner/useApplication";
import { ErrorState, Input, UploadRow } from "@/components/system";
import { supabase } from "@/integrations/supabase/client";
import type { Lang } from "@/i18n/config";
import {
  ALLOWED_EXTENSIONS,
  COMPANY_SIZES,
  COUNTRIES,
  DECLARATIONS,
  DECLARATION_POLICY,
  MAX_UPLOAD_BYTES,
  OWNERSHIPS,
  PARTNER_GROUPS,
  PRICING_METHODS,
  RATE_FIELDS,
  SKILL_LEVELS,
  VEHICLE_TYPES,
  WORKFORCE_CATEGORIES,
  isAllowedFile,
  requiredDocuments,
  type PartnerGroup,
  type PricingMethod,
} from "@/lib/partner";

export function categoryLabel(cat: CategoryRow, lang: Lang) {
  return (
    (cat[`label_${lang}` as keyof CategoryRow] as string | undefined) ?? cat.label_en ?? cat.key
  );
}

/* ------------------------------------------------------------------ step 1 */

export function StepType({ app }: { app: Application }) {
  const { t } = useTranslation("partner");

  function toggle(group: PartnerGroup) {
    app.setGroups(
      app.groups.includes(group) ? app.groups.filter((g) => g !== group) : [...app.groups, group],
    );
  }

  return (
    <div>
      <SectionTitle title={t("apply.step1.title")} hint={t("apply.step1.lead")} />
      <div className="grid gap-3 sm:grid-cols-2">
        {PARTNER_GROUPS.map((group) => (
          <CardToggle
            key={group}
            title={t(`groups.${group}.label`)}
            body={t(`groups.${group}.line`)}
            selected={app.groups.includes(group)}
            onToggle={() => toggle(group)}
          />
        ))}
      </div>

      <fieldset className="mt-8">
        <legend className="label-mono text-soft">{t("apply.step1.entity")}</legend>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          {(["company", "individual"] as const).map((entity) => (
            <CardToggle
              key={entity}
              title={t(`apply.step1.entityType.${entity}`)}
              body={t(`apply.step1.entityHint.${entity}`)}
              selected={app.profile.entity_type === entity}
              onToggle={() => app.setProfile({ ...app.profile, entity_type: entity })}
            />
          ))}
        </div>
      </fieldset>
    </div>
  );
}

/* ------------------------------------------------------------------ step 2 */

export function StepCompany({ app }: { app: Application }) {
  const { t } = useTranslation("partner");
  const p = app.profile;
  const set = (patch: Partial<typeof p>) => app.setProfile({ ...p, ...patch });
  const isCompany = p.entity_type === "company";

  return (
    <div>
      <SectionTitle title={t("apply.step2.title")} hint={t("apply.step2.lead")} />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label={t("apply.step2.legalName")}
          required
          value={p.legal_name}
          onChange={(v) => set({ legal_name: v })}
        />
        <TextField
          label={t("apply.step2.tradingName")}
          value={p.trading_name}
          onChange={(v) => set({ trading_name: v })}
        />
        <SelectField
          label={t("apply.step2.country")}
          value={p.country}
          onChange={(v) => set({ country: v })}
          options={COUNTRIES.map((c) => ({ value: c, label: t(`countries.${c}`) }))}
        />
        <TextField label={t("apply.step2.city")} required value={p.city} onChange={(v) => set({ city: v })} />
        <div className="sm:col-span-2">
          <TagField
            label={t("apply.step2.areas")}
            values={p.areas_served}
            onChange={(v) => set({ areas_served: v })}
            placeholder={t("apply.step2.areasPlaceholder")}
          />
        </div>
        <NumberField
          label={t("apply.step2.year")}
          value={p.year_established}
          onChange={(v) => set({ year_established: v })}
        />
        <TextField
          label={t("apply.step2.website")}
          value={p.website}
          inputMode="url"
          onChange={(v) => set({ website: v })}
        />
        {isCompany ? (
          <>
            <SelectField
              label={t("apply.step2.companySize")}
              value={p.company_size}
              onChange={(v) => set({ company_size: v })}
              options={[
                { value: "", label: t("apply.notSpecified") },
                ...COMPANY_SIZES.map((s) => ({ value: s, label: s })),
              ]}
            />
            <NumberField
              label={t("apply.step2.employees")}
              value={p.employee_count}
              onChange={(v) => set({ employee_count: v })}
            />
          </>
        ) : null}
        <NumberField
          label={t("apply.step2.technicians")}
          value={p.technician_count}
          onChange={(v) => set({ technician_count: v })}
        />
        <NumberField
          label={t("apply.step2.vehicles")}
          value={p.vehicle_count}
          onChange={(v) => set({ vehicle_count: v })}
        />
        {isCompany ? (
          <>
            <TextField
              label={t("apply.step2.registration")}
              value={p.registration_number}
              onChange={(v) => set({ registration_number: v })}
            />
            <TextField
              label={t("apply.step2.vat")}
              value={p.vat_number}
              onChange={(v) => set({ vat_number: v })}
            />
          </>
        ) : null}
        <div className="sm:col-span-2">
          <TextAreaField
            label={t("apply.step2.address")}
            rows={3}
            value={p.address}
            onChange={(v) => set({ address: v })}
          />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ step 3 */

export function StepContact({ app }: { app: Application }) {
  const { t } = useTranslation("partner");
  const c = app.contact;
  const set = (patch: Partial<typeof c>) => app.setContact({ ...c, ...patch });

  return (
    <div>
      <SectionTitle title={t("apply.step3.title")} hint={t("apply.step3.lead")} />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label={t("apply.step3.fullName")}
          required
          autoComplete="name"
          value={c.full_name}
          onChange={(v) => set({ full_name: v })}
        />
        <TextField label={t("apply.step3.position")} value={c.position} onChange={(v) => set({ position: v })} />
        <TextField
          label={t("apply.step3.mobile")}
          required
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={c.mobile}
          onChange={(v) => set({ mobile: v })}
        />
        <TextField label={t("apply.step3.whatsapp")} type="tel" inputMode="tel" value={c.whatsapp} onChange={(v) => set({ whatsapp: v })} />
        <TextField
          label={t("apply.step3.email")}
          required
          type="email"
          inputMode="email"
          autoComplete="email"
          value={c.email}
          onChange={(v) => set({ email: v })}
          validate={(value) => (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? null : t("apply.errors.email"))}
        />
        <TextField
          label={t("apply.step3.alternative")}
          value={c.alternative_contact}
          onChange={(v) => set({ alternative_contact: v })}
        />
        <SelectField
          label={t("apply.step3.language")}
          value={c.preferred_language}
          onChange={(v) => set({ preferred_language: v })}
          options={(["de", "fr", "it", "en"] as const).map((l) => ({
            value: l,
            label: t(`languages.${l}`),
          }))}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ step 4 */

export function StepServices({ app, lang }: { app: Application; lang: Lang }) {
  const { t } = useTranslation("partner");
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);

  const visible = useMemo(() => {
    const base = showAll || app.groups.length === 0
      ? app.categories
      : app.categories.filter((c) => app.groups.includes(c.group));
    const q = query.trim().toLowerCase();
    return q ? base.filter((c) => categoryLabel(c, lang).toLowerCase().includes(q)) : base;
  }, [app.categories, app.groups, lang, query, showAll]);

  const byId = useMemo(() => new Map(app.categories.map((c) => [c.id, c])), [app.categories]);

  function toggle(categoryId: string) {
    const exists = app.services.some((s) => s.category_id === categoryId);
    app.setServices(
      exists
        ? app.services.filter((s) => s.category_id !== categoryId)
        : [
            ...app.services,
            {
              category_id: categoryId,
              coverage_cities: [],
              available_manpower: "",
              emergency_available: false,
              available_24_7: false,
              pricing_method: "quotation" as PricingMethod,
              callout_charge: "",
              hourly_rate: "",
              daily_rate: "",
              monthly_rate: "",
              transport_rate: "",
              notes: "",
            },
          ],
    );
  }

  return (
    <div>
      <SectionTitle title={t("apply.step4.title")} hint={t("apply.step4.lead")} />

      <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <TextField label={t("apply.step4.search")} value={query} onChange={setQuery} />
        <ToggleField label={t("apply.step4.showAll")} checked={showAll} onChange={setShowAll} />
      </div>

      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {visible.map((cat) => {
          const selected = app.services.some((s) => s.category_id === cat.id);
          return (
            <li key={cat.id}>
              <CardToggle
                title={categoryLabel(cat, lang)}
                body={t(`groups.${cat.group}.label`)}
                selected={selected}
                onToggle={() => toggle(cat.id)}
              />
            </li>
          );
        })}
        {visible.length === 0 ? (
          <li className="text-sm text-soft">{t("apply.step4.noResults")}</li>
        ) : null}
      </ul>

      <div className="mt-8 space-y-4">
        {app.services.map((service, index) => {
          const cat = byId.get(service.category_id);
          const rates = RATE_FIELDS[service.pricing_method] ?? [];
          const update = (patch: Partial<typeof service>) =>
            app.setServices(app.services.map((s, i) => (i === index ? { ...s, ...patch } : s)));

          return (
            <RowCard
              key={service.category_id}
              title={cat ? categoryLabel(cat, lang) : t("apply.step4.service")}
              onRemove={() => toggle(service.category_id)}
            >
              <div className="sm:col-span-2">
                <TagField
                  label={t("apply.step4.cities")}
                  values={service.coverage_cities}
                  onChange={(v) => update({ coverage_cities: v })}
                />
              </div>
              <NumberField
                label={t("apply.step4.manpower")}
                value={service.available_manpower}
                onChange={(v) => update({ available_manpower: v })}
              />
              <SelectField
                label={t("apply.step4.pricing")}
                value={service.pricing_method}
                onChange={(v) => update({ pricing_method: v as PricingMethod })}
                options={PRICING_METHODS.map((m) => ({ value: m, label: t(`pricing.${m}`) }))}
              />
              <ToggleField
                label={t("apply.step4.emergency")}
                checked={service.emergency_available}
                onChange={(v) => update({ emergency_available: v })}
              />
              <ToggleField
                label={t("apply.step4.always")}
                checked={service.available_24_7}
                onChange={(v) => update({ available_24_7: v })}
              />
              {rates.map((rate) => (
                <NumberField
                  key={rate}
                  label={t(`apply.step4.rates.${rate}`)}
                  hint={t("apply.step4.rateOptional")}
                  value={service[rate as keyof typeof service] as string}
                  onChange={(v) => update({ [rate]: v } as Partial<typeof service>)}
                />
              ))}
              <div className="sm:col-span-2">
                <TextAreaField
                  label={t("apply.step4.notes")}
                  rows={2}
                  value={service.notes}
                  onChange={(v) => update({ notes: v })}
                />
              </div>
            </RowCard>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ step 5 */

export function StepCapacity({ app, lang }: { app: Application; lang: Lang }) {
  const { t } = useTranslation("partner");
  const groups = app.groups;
  const showWorkforce = groups.includes("manpower");
  const showFleet = groups.includes("transport");
  const showCapabilities = groups.includes("maintenance") || groups.includes("cleaning");

  const capabilityCategories = app.categories.filter(
    (c) =>
      (groups.includes("maintenance") && c.group === "maintenance") ||
      (groups.includes("cleaning") && c.group === "cleaning"),
  );

  return (
    <div className="space-y-10">
      <SectionTitle title={t("apply.step5.title")} hint={t("apply.step5.lead")} />

      {!showWorkforce && !showFleet && !showCapabilities ? (
        <p className="rounded-md rounded-2xl bg-surface p-4 text-sm text-ink-2">
          {t("apply.step5.nothing")}
        </p>
      ) : null}

      {showWorkforce ? (
        <section>
          <h3 className="label-mono text-primary">{t("apply.step5.workforce")}</h3>
          <p className="mt-1 text-sm text-ink-2">{t("apply.step5.workforceNote")}</p>
          <div className="mt-4 space-y-4">
            {app.workforce.map((row, index) => {
              const update = (patch: Partial<typeof row>) =>
                app.setWorkforce(app.workforce.map((w, i) => (i === index ? { ...w, ...patch } : w)));
              return (
                <RowCard
                  key={index}
                  title={`${t("apply.step5.workforceRow")} ${index + 1}`}
                  onRemove={() => app.setWorkforce(app.workforce.filter((_, i) => i !== index))}
                >
                  <TextField
                    label={t("apply.step5.category")}
                    hint={t("apply.step5.categoryHint")}
                    value={row.category}
                    onChange={(v) => update({ category: v })}
                  />
                  <NumberField
                    label={t("apply.step5.workerCount")}
                    value={row.worker_count}
                    onChange={(v) => update({ worker_count: v })}
                  />
                  <SelectField
                    label={t("apply.step5.skill")}
                    value={row.skill_level}
                    onChange={(v) => update({ skill_level: v as (typeof SKILL_LEVELS)[number] })}
                    options={SKILL_LEVELS.map((s) => ({ value: s, label: t(`skill.${s}`) }))}
                  />
                  <NumberField
                    label={t("apply.step5.mobilisation")}
                    value={row.mobilisation_days}
                    onChange={(v) => update({ mobilisation_days: v })}
                  />
                  <ToggleField
                    label={t("apply.step5.accommodation")}
                    checked={row.accommodation_provided}
                    onChange={(v) => update({ accommodation_provided: v })}
                  />
                  <ToggleField
                    label={t("apply.step5.transport")}
                    checked={row.transport_provided}
                    onChange={(v) => update({ transport_provided: v })}
                  />
                  <ToggleField
                    label={t("apply.step5.ppe")}
                    checked={row.ppe_provided}
                    onChange={(v) => update({ ppe_provided: v })}
                  />
                </RowCard>
              );
            })}
            <div className="flex flex-wrap gap-2">
              {WORKFORCE_CATEGORIES.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() =>
                    app.setWorkforce([
                      ...app.workforce,
                      {
                        category: t(`workforceCategory.${category}`),
                        worker_count: "",
                        skill_level: "skilled",
                        mobilisation_days: "",
                        accommodation_provided: false,
                        transport_provided: false,
                        ppe_provided: false,
                      },
                    ])
                  }
                  className="label-mono min-h-11 rounded-md border border-ink/25 px-3 text-ink hover:border-primary hover:text-primary"
                >
                  + {t(`workforceCategory.${category}`)}
                </button>
              ))}
            </div>
            <TextAreaField
              label={t("apply.step5.workforceNotes")}
              value={app.profile.workforce_notes}
              onChange={(v) => app.setProfile({ ...app.profile, workforce_notes: v })}
            />
          </div>
        </section>
      ) : null}

      {showFleet ? (
        <section>
          <h3 className="label-mono text-primary">{t("apply.step5.fleet")}</h3>
          <div className="mt-4 space-y-4">
            {app.fleet.map((row, index) => {
              const update = (patch: Partial<typeof row>) =>
                app.setFleet(app.fleet.map((f, i) => (i === index ? { ...f, ...patch } : f)));
              return (
                <RowCard
                  key={index}
                  title={`${t("apply.step5.fleetRow")} ${index + 1}`}
                  onRemove={() => app.setFleet(app.fleet.filter((_, i) => i !== index))}
                >
                  <SelectField
                    label={t("apply.step5.vehicleType")}
                    value={row.vehicle_type}
                    onChange={(v) => update({ vehicle_type: v })}
                    options={VEHICLE_TYPES.map((v) => ({ value: v, label: t(`vehicle.${v}`) }))}
                  />
                  <NumberField
                    label={t("apply.step5.vehicleCount")}
                    value={row.vehicle_count}
                    onChange={(v) => update({ vehicle_count: v })}
                  />
                  <TextField
                    label={t("apply.step5.capacity")}
                    value={row.capacity}
                    onChange={(v) => update({ capacity: v })}
                  />
                  <SelectField
                    label={t("apply.step5.ownership")}
                    value={row.ownership}
                    onChange={(v) => update({ ownership: v as (typeof OWNERSHIPS)[number] })}
                    options={OWNERSHIPS.map((o) => ({ value: o, label: t(`ownership.${o}`) }))}
                  />
                  <NumberField
                    label={t("apply.step5.yearFrom")}
                    value={row.model_year_from}
                    onChange={(v) => update({ model_year_from: v })}
                  />
                  <NumberField
                    label={t("apply.step5.yearTo")}
                    value={row.model_year_to}
                    onChange={(v) => update({ model_year_to: v })}
                  />
                  <TextField
                    label={t("apply.step5.coverage")}
                    value={row.coverage_area}
                    onChange={(v) => update({ coverage_area: v })}
                  />
                  <ToggleField
                    label={t("apply.step5.driver")}
                    checked={row.driver_included}
                    onChange={(v) => update({ driver_included: v })}
                  />
                  <ToggleField
                    label={t("apply.step5.intercity")}
                    checked={row.intercity}
                    onChange={(v) => update({ intercity: v })}
                  />
                  <ToggleField
                    label={t("apply.step5.always")}
                    checked={row.available_24_7}
                    onChange={(v) => update({ available_24_7: v })}
                  />
                  <ToggleField
                    label={t("apply.step5.gps")}
                    checked={row.gps_tracking}
                    onChange={(v) => update({ gps_tracking: v })}
                  />
                </RowCard>
              );
            })}
            <button
              type="button"
              onClick={() =>
                app.setFleet([
                  ...app.fleet,
                  {
                    vehicle_type: "van",
                    vehicle_count: "",
                    capacity: "",
                    model_year_from: "",
                    model_year_to: "",
                    ownership: "owned",
                    driver_included: false,
                    coverage_area: "",
                    intercity: false,
                    available_24_7: false,
                    gps_tracking: false,
                  },
                ])
              }
              className="label-mono min-h-11 rounded-md border border-ink/25 px-3 text-ink hover:border-primary hover:text-primary"
            >
              + {t("apply.step5.addVehicle")}
            </button>
          </div>
        </section>
      ) : null}

      {showCapabilities ? (
        <section>
          <h3 className="label-mono text-primary">{t("apply.step5.capabilities")}</h3>
          <p className="mt-1 text-sm text-ink-2">{t("apply.step5.capabilitiesNote")}</p>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {capabilityCategories.map((cat) => {
              const index = app.services.findIndex((s) => s.category_id === cat.id);
              const selected = index >= 0;
              return (
                <li key={cat.id} className="rounded-md rounded-2xl bg-surface p-3">
                  <ToggleField
                    label={categoryLabel(cat, lang)}
                    checked={selected}
                    onChange={(checked) =>
                      app.setServices(
                        checked
                          ? [
                              ...app.services,
                              {
                                category_id: cat.id,
                                coverage_cities: [],
                                available_manpower: "",
                                emergency_available: false,
                                available_24_7: false,
                                pricing_method: "quotation",
                                callout_charge: "",
                                hourly_rate: "",
                                daily_rate: "",
                                monthly_rate: "",
                                transport_rate: "",
                                notes: "",
                              },
                            ]
                          : app.services.filter((s) => s.category_id !== cat.id),
                      )
                    }
                  />
                  {selected ? (
                    <div className="mt-3 grid gap-3">
                      <NumberField
                        label={t("apply.step5.technicianCount")}
                        value={app.services[index]!.available_manpower}
                        onChange={(v) =>
                          app.setServices(
                            app.services.map((s, i) =>
                              i === index ? { ...s, available_manpower: v } : s,
                            ),
                          )
                        }
                      />
                      <TextAreaField
                        label={t("apply.step5.capabilityNotes")}
                        rows={2}
                        value={app.services[index]!.notes}
                        onChange={(v) =>
                          app.setServices(
                            app.services.map((s, i) => (i === index ? { ...s, notes: v } : s)),
                          )
                        }
                      />
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ step 6 */

async function uploadWithProgress(
  path: string,
  file: File,
  onProgress: (percent: number) => void,
): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const base = import.meta.env["VITE_SUPABASE_URL"] as string | undefined;
  if (!token || !base) return "no-session";

  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${base}/storage/v1/object/partner-documents/${path}`);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.setRequestHeader("x-upsert", "true");
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => resolve(xhr.status >= 200 && xhr.status < 300 ? null : xhr.responseText);
    xhr.onerror = () => resolve("network");
    const body = new FormData();
    body.append("file", file);
    xhr.send(body);
  });
}

export function StepDocuments({
  app,
  lang,
  declarations,
  setDeclarations,
}: {
  app: Application;
  lang: Lang;
  declarations: string[];
  setDeclarations: (next: string[]) => void;
}) {
  const { t } = useTranslation("partner");
  const [busy, setBusy] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const docTypes = requiredDocuments(app.groups, app.profile.entity_type, app.profile.country);

  async function handleFile(docType: string, file: File | undefined) {
    if (!file || !app.partner) return;
    setError(null);
    if (file.size > MAX_UPLOAD_BYTES) return setError(t("apply.step6.tooLarge"));
    if (!isAllowedFile(file)) return setError(t("apply.step6.badType"));

    setBusy(docType);
    setProgress(0);
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${app.partner.id}/${Date.now()}-${safeName}`;
    const uploadError = await uploadWithProgress(path, file, setProgress);
    if (uploadError) {
      setBusy(null);
      return setError(t("apply.step6.uploadFailed"));
    }

    const existing = app.documents.find((d) => d.doc_type === docType);
    const { error: insertError } = await supabase.from("partner_documents").insert({
      partner_id: app.partner.id,
      doc_type: docType,
      storage_path: path,
      file_name: file.name,
      mime_type: file.type || "application/octet-stream",
      size_bytes: file.size,
    });
    if (insertError) {
      setBusy(null);
      return setError(t("apply.step6.uploadFailed"));
    }
    if (existing) {
      // Replacement: keep the newest row visible, drop the superseded file.
      await supabase.storage.from("partner-documents").remove([existing.storage_path]);
    }
    await app.reloadDocuments();
    setBusy(null);
  }

  return (
    <div className="space-y-10">
      <div>
        <SectionTitle title={t("apply.step6.title")} hint={t("apply.step6.lead")} />
        <p className="label-mono text-soft">
          {t("apply.step6.limits", { size: "10 MB", types: ALLOWED_EXTENSIONS.join(", ") })}
        </p>

        {error ? <ErrorState className="mt-4" message={error} /> : null}

        <ul className="mt-4 space-y-3">
          {docTypes.map((docType) => {
            const doc = app.documents.filter((d) => d.doc_type === docType).at(-1);
            const status = doc ? doc.status : "missing";
            return (
              <li key={docType}>
                <UploadRow
                  title={t(`documents.${docType}`)}
                  status={status}
                  statusLabel={busy === docType ? t("apply.step6.uploading") : t(`documentStatus.${status}`)}
                  fileName={doc?.file_name ?? null}
                  buttonLabel={doc ? t("apply.step6.replace") : t("apply.step6.upload")}
                  accept={ALLOWED_EXTENSIONS.map((e) => `.${e}`).join(",")}
                  uploading={busy === docType}
                  progress={progress}
                  onSelect={(file) => void handleFile(docType, file)}
                >
                  {doc ? (
                    <div className="max-w-xs">
                      <Field label={t("apply.step6.expiry")} id={`expiry-${doc.id}`}>
                        {(props) => (
                          <Input
                            {...props}
                            touch
                            type="date"
                            value={doc.expires_on ?? ""}
                            onChange={(event) => {
                              const value = event.target.value || null;
                              void supabase
                                .from("partner_documents")
                                .update({ expires_on: value })
                                .eq("id", doc.id)
                                .then(() => app.reloadDocuments());
                            }}
                          />
                        )}
                      </Field>
                    </div>
                  ) : null}
                </UploadRow>
              </li>
            );
          })}
        </ul>
      </div>

      <section>
        <h3 className="text-xl text-ink">{t("apply.step6.declarationTitle")}</h3>
        <p className="mt-1 text-sm text-ink-2">{t("apply.step6.declarationLead")}</p>
        <ul className="mt-4 space-y-2">
          {DECLARATIONS.map((key) => {
            const policy = DECLARATION_POLICY[key];
            return (
              <li key={key} className="rounded-md rounded-2xl bg-surface p-3">
                <label className="flex cursor-pointer items-start gap-3 text-sm text-ink">
                  <input
                    type="checkbox"
                    className="mt-0.5 size-5 accent-[var(--color-primary,#19457C)]"
                    checked={declarations.includes(key)}
                    onChange={(event) =>
                      setDeclarations(
                        event.target.checked
                          ? [...declarations, key]
                          : declarations.filter((d) => d !== key),
                      )
                    }
                  />
                  <span>
                    {t(`declarations.${key}`)}
                    {policy ? (
                      <>
                        {" "}
                        <Link
                          to="/$lang/richtlinien/$doc"
                          params={{ lang, doc: policy }}
                          target="_blank"
                          className="underline decoration-primary underline-offset-2 hover:text-primary"
                        >
                          {t("apply.step6.readPolicy")}
                        </Link>
                      </>
                    ) : null}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
