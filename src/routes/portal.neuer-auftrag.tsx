import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { usePortal } from "@/components/portal/PortalContext";
import i18n, { isLang, type Lang } from "@/i18n/config";
import { formatCurrency } from "@/i18n/format";
import { SERVICE_KEYS, createJob, servicesOf, type JobServices, type ServiceKey } from "@/lib/portal";
import { isPriced, resolvePortalPrice } from "@/lib/price-resolution";
import { langOf, privateHead } from "@/lib/seo";

export const Route = createFileRoute("/portal/neuer-auftrag")({
  // `?repeat=<jobId>` — repeat booking for a returning customer. The form is
  // prefilled from that job instead of starting empty; every value stays
  // editable and nothing is submitted until the customer confirms.
  validateSearch: (search: Record<string, unknown>): { repeat?: string } =>
    typeof search["repeat"] === "string" && search["repeat"] ? { repeat: search["repeat"] } : {},
  head: () => privateHead(langOf(i18n.language), "portalNewJob"),
  component: NewJobPage,
});

const inputClass =
  "mt-1 w-full border border-line bg-canvas px-3 py-2 text-sm text-ink outline-none focus:border-ink";

function NewJobPage() {
  const { data, reload, user, loading } = usePortal();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation("portal");
  const lang = (isLang(i18n.language) ? i18n.language : "de") as Lang;

  const [propertyId, setPropertyId] = useState("");
  const [unitId, setUnitId] = useState("");
  const [moveOut, setMoveOut] = useState("");
  const [handover, setHandover] = useState("");
  const [notes, setNotes] = useState("");
  const [services, setServices] = useState<JobServices>({ clean: true });
  const [saving, setSaving] = useState(false);
  const { repeat } = Route.useSearch();
  const [prefilled, setPrefilled] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const properties = useMemo(() => data.properties.filter((p) => !p.archived), [data.properties]);
  const units = useMemo(
    () => data.units.filter((unit) => unit.property_id === propertyId && !unit.archived),
    [data.units, propertyId],
  );
  const unit = data.units.find((u) => u.id === unitId) ?? null;
  const unitRooms = unit && unit.rooms != null ? Number(unit.rooms) : null;
  const discountRate = Number(data.organization?.framework_discount ?? 0);
  // No unit chosen means no price at all — never a default room band.
  const resolution = useMemo(
    () =>
      resolvePortalPrice({
        unitId: unit ? unitId : null,
        rooms: unitRooms,
        services,
        rates: data.rates,
        bands: data.bands,
        overrides: data.overrides,
        discountRate,
      }),
    [unit, unitId, unitRooms, services, data.rates, data.bands, data.overrides, discountRate],
  );

  // The three states stay distinguishable on screen: nothing at all before a
  // unit is chosen, "—" for anything that has to be quoted by hand.
  const price = useMemo(() => {
    if (resolution.state === "incomplete") return null;
    const lines = resolution.lines;
    const gross = lines.reduce((sum, line) => sum + line.amount, 0);
    const discount = Math.round(gross * discountRate * 100) / 100;
    return {
      lines,
      gross,
      discount,
      net: isPriced(resolution) ? resolution.net : Math.round((gross - discount) * 100) / 100,
      quotationRequired: resolution.state === "quotation",
      roomsKnown: unitRooms != null,
    };
  }, [resolution, discountRate, unitRooms]);


  // Prefill once, from the referenced job or the customer's most recent one.
  useEffect(() => {
    if (!repeat || prefilled || data.jobs.length === 0) return;
    const source = data.jobs.find((job) => job.id === repeat);
    if (!source) return;
    const sourceUnit = data.units.find((u) => u.id === source.unit_id);
    if (sourceUnit) {
      setPropertyId(sourceUnit.property_id);
      setUnitId(sourceUnit.id);
    }
    const picked = servicesOf(source);
    if (picked.length > 0) {
      setServices(Object.fromEntries(picked.map((key) => [key, true])) as JobServices);
    }
    setPrefilled(true);
  }, [repeat, prefilled, data.jobs, data.units]);

  function toggle(key: ServiceKey) {
    setServices((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function submit() {
    setError(null);
    if (!data.organization || !unitId || !handover) {
      setError(t("newJob.errorRequired"));
      return;
    }
    setSaving(true);
    try {
      await createJob({
        organizationId: data.organization.id,
        unitId,
        moveOutDate: moveOut,
        handoverDate: handover,
        services,
        notes,
        amount: price && !price.quotationRequired ? price.net : 0,
        actorId: user.id,
      });
      await reload();
      void navigate({ to: "/portal/auftraege" });
    } catch {
      setError(t("newJob.errorSave"));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="label-mono mx-auto max-w-7xl px-4 py-12 text-soft md:px-8">{t("loading")}</p>;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 md:px-8">
      <p className="label-mono text-primary">{t("newJob.eyebrow")}</p>
      <h1 className="mt-3 text-4xl md:text-5xl">{t("newJob.title")}</h1>
      {prefilled ? (
        <p className="mt-3 max-w-2xl border-l-4 border-primary bg-card px-4 py-3 text-sm text-ink-2">
          {t("newJob.prefilled")}
        </p>
      ) : null}

      {properties.length === 0 ? (
        <div className="mt-8 max-w-2xl border border-ink bg-surface p-6 text-sm text-ink-2">
          <p>{t("newJob.noProperties")}</p>
          <Link
            to="/portal/liegenschaften"
            className="label-mono mt-4 inline-block bg-primary px-5 py-3 text-primary-foreground hover:bg-primary-hover"
          >
            {t("newJob.toPortfolio")}
          </Link>
        </div>
      ) : (

        <div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <section className="border border-line bg-surface p-5 md:p-7">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm">
                <span className="label-mono text-soft">{t("newJob.property")}</span>
                <select
                  value={propertyId}
                  onChange={(event) => {
                    setPropertyId(event.target.value);
                    setUnitId("");
                  }}
                  className={inputClass}
                >
                  <option value="">{t("newJob.choose")}</option>
                  {properties.map((property) => (
                    <option key={property.id} value={property.id}>
                      {property.address}, {property.zip} {property.city}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm">
                <span className="label-mono text-soft">{t("newJob.unit")}</span>
                <select
                  value={unitId}
                  onChange={(event) => setUnitId(event.target.value)}
                  disabled={!propertyId}
                  className={inputClass}
                >
                  <option value="">{t("newJob.choose")}</option>
                  {units.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.label} · {t(`unitType.${u.unit_type}`)} ·{" "}
                      {u.rooms != null ? `${u.rooms} ${t("newJob.rooms")}` : "—"}
                    </option>
                  ))}
                </select>
              </label>


              <label className="text-sm">
                <span className="label-mono text-soft">{t("newJob.moveOut")}</span>
                <input
                  type="date"
                  value={moveOut}
                  onChange={(event) => setMoveOut(event.target.value)}
                  className={`${inputClass} data-mono`}
                />
              </label>

              <label className="text-sm">
                <span className="label-mono text-soft">{t("newJob.handover")}</span>
                <input
                  type="date"
                  value={handover}
                  onChange={(event) => setHandover(event.target.value)}
                  className={`${inputClass} data-mono`}
                />
              </label>
            </div>

            <fieldset className="mt-7">
              <legend className="label-mono text-soft">{t("newJob.services")}</legend>
              <div className="mt-3 grid gap-px bg-line sm:grid-cols-2">
                {SERVICE_KEYS.map((key) => (
                  <label
                    key={key}
                    className={`flex cursor-pointer items-center gap-3 p-4 text-sm ${
                      services[key] ? "bg-primary-subtle text-primary" : "bg-surface text-ink-2"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(services[key])}
                      onChange={() => toggle(key)}
                      className="size-4 accent-ink"
                    />
                    {t(`service.${key}`)}
                  </label>
                ))}
              </div>
            </fieldset>

            <label className="mt-7 block text-sm">
              <span className="label-mono text-soft">{t("newJob.notes")}</span>
              <textarea
                rows={4}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                className={inputClass}
              />
            </label>

            {error ? (
              <p role="alert" className="mt-5 border-l-4 border-destructive bg-canvas px-4 py-3 text-sm text-destructive">
                {error}
              </p>
            ) : null}

            <button
              type="button"
              onClick={() => void submit()}
              disabled={saving}
              className="mt-7 bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-60"
            >
              {saving ? t("newJob.saving") : t("newJob.submit")}
            </button>
          </section>

          <aside className="border border-ink bg-surface lg:sticky lg:top-6">
            <div className="border-b border-line px-5 py-4">
              <h2 className="text-2xl">{t("newJob.price.title")}</h2>
              <p className="label-mono mt-1 text-soft">{t("newJob.price.subtitle")}</p>
            </div>
            {!price ? (
              <p className="px-5 py-6 text-sm text-soft">{t("newJob.price.noUnit")}</p>
            ) : (
              <>
                <div className="px-5 py-4">
                  <p className="label-mono text-soft">
                    {unit?.label} ·{" "}
                    <span className="data-mono text-ink">
                      {price.roomsKnown ? `${unitRooms} ${t("newJob.rooms")}` : "—"}
                    </span>
                  </p>
                  {price.lines.length === 0 ? (
                    <p className="mt-3 text-sm text-soft">{t("newJob.price.empty")}</p>
                  ) : (
                    <ul className="mt-3 space-y-3 text-sm">
                      {price.lines.map((line) => (
                        <li key={line.id} className="flex justify-between gap-3">
                          <span className="text-ink-2">{t(line.labelKey, line.params)}</span>
                          <span className="data-mono text-ink">
                            {line.quotation ? "—" : formatCurrency(line.amount, lang)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {price.quotationRequired ? (
                    <p className="mt-4 border-l-4 border-primary bg-canvas px-3 py-2 text-sm text-ink-2">
                      {price.roomsKnown ? t("newJob.price.outOfBand") : t("newJob.price.noRooms")}
                    </p>
                  ) : null}
                </div>
                <dl className="border-t border-line px-5 py-4 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-soft">{t("newJob.price.subtotal")}</dt>
                    <dd className="data-mono text-soft">{formatCurrency(price.gross, lang)}</dd>
                  </div>
                  <div className="mt-2 flex justify-between">
                    <dt className="text-ink">
                      {t("newJob.price.discount")}{" "}
                      <span className="data-mono">{Math.round(discountRate * 100)} %</span>
                    </dt>
                    <dd className="data-mono text-ink">−{formatCurrency(price.discount, lang)}</dd>
                  </div>
                </dl>
                <div className="flex items-center justify-between bg-ink px-5 py-4 text-canvas">
                  <span className="font-display uppercase">
                    {price.quotationRequired ? t("newJob.price.partialTotal") : t("newJob.price.total")}
                  </span>
                  <span className="data-mono text-xl">
                    {price.quotationRequired && price.gross === 0 ? "—" : formatCurrency(price.net, lang)}
                  </span>

                </div>
                <p className="border-t border-line px-5 py-4 text-sm text-soft">{t("newJob.price.note")}</p>
              </>
            )}

          </aside>
        </div>
      )}
    </div>
  );
}
