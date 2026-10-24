/**
 * Occupants and service history for a single unit. Both read through the
 * organisation-scoped policies; nothing here is cross-tenant.
 */
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { isLang, type Lang } from "@/i18n/config";

import { usePortal } from "@/components/portal/PortalContext";
import { formatDate } from "@/i18n/format";
import {
  createOccupant,
  fetchOccupants,
  unitServiceHistory,
  updateOccupant,
  type Occupant,
  type OccupantInput,
  type Unit,
} from "@/lib/portal";

const inputClass =
  "mt-1 w-full border border-line bg-canvas px-3 py-2 text-sm text-ink outline-none focus:border-ink";
const btn =
  "bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-60";
const ghost = "label-mono border border-line px-3 py-2 text-soft hover:border-ink hover:text-ink";

const emptyOccupant = (): OccupantInput => ({
  full_name: "",
  email: "",
  phone: "",
  moves_out_on: null,
  notes: "",
});

export function UnitDetails({ unit }: { unit: Unit }) {
  const { t, i18n } = useTranslation("portal");
  const lang = (isLang(i18n.language) ? i18n.language : "de") as Lang;
  const { data } = usePortal();
  const orgId = data.organization?.id ?? null;

  const [occupants, setOccupants] = useState<Occupant[] | null>(null);
  const [form, setForm] = useState<OccupantInput>(emptyOccupant);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const history = unitServiceHistory(unit.id, data.jobs, data.events);

  async function load() {
    try {
      const rows = await fetchOccupants();
      setOccupants(rows.filter((row) => row.unit_id === unit.id));
    } catch {
      setOccupants([]);
      setError(t("portfolio.error"));
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unit.id]);

  async function addOccupant() {
    if (!orgId || form.full_name.trim() === "") {
      setError(t("portfolio.occupants.required"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await createOccupant(orgId, unit.id, form);
      setForm(emptyOccupant());
      await load();
    } catch {
      setError(t("portfolio.error"));
    } finally {
      setBusy(false);
    }
  }

  async function archive(id: string) {
    setBusy(true);
    try {
      await updateOccupant(id, { archived: true });
      await load();
    } catch {
      setError(t("portfolio.error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section>
        <h5 className="label-mono text-soft">{t("portfolio.occupants.title")}</h5>
        {error ? (
          <p role="alert" className="mt-2 border-l-4 border-destructive bg-surface px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}
        {occupants === null ? (
          <p className="mt-2 text-sm text-soft">{t("loading")}</p>
        ) : occupants.length === 0 ? (
          <p className="mt-2 text-sm text-soft">{t("portfolio.occupants.empty")}</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {occupants.map((occupant) => (
              <li key={occupant.id} className="flex flex-wrap items-start justify-between gap-3 border border-line bg-surface p-3">
                <div className="text-sm">
                  <p className="text-ink">{occupant.full_name}</p>
                  <p className="label-mono text-soft">
                    {[occupant.email, occupant.phone].filter(Boolean).join(" · ") || "—"}
                  </p>
                  {occupant.moves_out_on ? (
                    <p className="data-mono text-soft">
                      {t("portfolio.occupants.movesOut")}: {formatDate(occupant.moves_out_on, lang)}
                    </p>
                  ) : null}
                  {occupant.notes ? <p className="mt-1 text-ink-2">{occupant.notes}</p> : null}
                </div>
                <button type="button" className={ghost} disabled={busy} onClick={() => void archive(occupant.id)}>
                  {t("portfolio.archive")}
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 grid gap-3 border border-line bg-canvas p-3 sm:grid-cols-2">
          <label className="text-sm">
            <span className="label-mono text-soft">{t("portfolio.occupants.name")}</span>
            <input
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              className={inputClass}
            />
          </label>
          <label className="text-sm">
            <span className="label-mono text-soft">{t("portfolio.occupants.email")}</span>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className={inputClass}
            />
          </label>
          <label className="text-sm">
            <span className="label-mono text-soft">{t("portfolio.occupants.phone")}</span>
            <input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className={inputClass}
            />
          </label>
          <label className="text-sm">
            <span className="label-mono text-soft">{t("portfolio.occupants.movesOut")}</span>
            <input
              type="date"
              value={form.moves_out_on ?? ""}
              onChange={(e) => setForm({ ...form, moves_out_on: e.target.value || null })}
              className={`${inputClass} data-mono`}
            />
          </label>
          <label className="text-sm sm:col-span-2">
            <span className="label-mono text-soft">{t("portfolio.notes")}</span>
            <textarea
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className={inputClass}
            />
          </label>
          <div className="sm:col-span-2">
            <button type="button" className={btn} disabled={busy} onClick={() => void addOccupant()}>
              {busy ? t("portfolio.saving") : t("portfolio.occupants.add")}
            </button>
          </div>
        </div>
      </section>

      <section>
        <h5 className="label-mono text-soft">{t("portfolio.history.title")}</h5>
        {history.length === 0 ? (
          <p className="mt-2 text-sm text-soft">{t("portfolio.history.empty")}</p>
        ) : (
          <ol className="mt-3 space-y-2">
            {history.map(({ job, services, events }) => (
              <li key={job.id} className="border border-line bg-surface p-3 text-sm">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="data-mono text-ink">{job.reference}</span>
                  <span className="label-mono text-soft">{formatDate(job.created_at, lang)}</span>
                </div>
                <p className="label-mono mt-1 text-primary">{t(`stage.${job.status}`, job.status)}</p>
                <p className="mt-1 text-ink-2">
                  {services.length === 0
                    ? t("portfolio.history.noServices")
                    : services.map((service) => t(`service.${service}`, service)).join(" · ")}
                </p>
                {events.length > 0 ? (
                  <p className="label-mono mt-1 text-soft">
                    {t("portfolio.history.events", { count: events.length })} ·{" "}
                    {formatDate(events[0]!.created_at, lang)}
                  </p>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
