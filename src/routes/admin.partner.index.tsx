import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { formatDate } from "@/i18n/format";
import i18n from "@/i18n/config";
import { langOf, privateHead } from "@/lib/seo";
import { categoryLabel, useActiveLang } from "@/lib/admin-i18n";
import {
  PARTNER_STATUS_TONE,
  QUEUE_STATUSES,
  isDocumentValid,
  type PartnerStatus,
} from "@/lib/partner-admin";
import {
  fetchCategories,
  fetchPartnerList,
  fetchStatusCounts,
  type PartnerCategoryRow,
  type PartnerFilters,
  type PartnerListItem,
} from "@/lib/partner-admin-data";

export const Route = createFileRoute("/admin/partner/")({
  ssr: false,
  head: () => privateHead(langOf(i18n.language), "admin"),
  component: PartnerList,
});

const EMPTY: PartnerFilters = { status: "submitted", categoryId: "", city: "", country: "", search: "" };

const COLUMNS = ["reference", "partner", "place", "services", "documents", "score", "status", "received"] as const;

function PartnerList() {
  const { t } = useTranslation("admin");
  const lang = useActiveLang();
  const [filters, setFilters] = useState<PartnerFilters>(EMPTY);
  const [rows, setRows] = useState<PartnerListItem[] | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [categories, setCategories] = useState<PartnerCategoryRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchCategories().then(setCategories).catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    let active = true;
    setRows(null);
    setError(null);
    void (async () => {
      try {
        const [list, c] = await Promise.all([fetchPartnerList(filters), fetchStatusCounts()]);
        if (!active) return;
        setRows(list);
        setCounts(c);
      } catch {
        if (active) setError(t("partners.loadError"));
      }
    })();
    return () => {
      active = false;
    };
  }, [filters, t]);

  const total = useMemo(() => Object.values(counts).reduce((a, b) => a + b, 0), [counts]);

  return (
    <section>
      <p className="label-mono text-primary">{t("partners.eyebrow")}</p>
      <h1 className="mt-2 text-3xl md:text-4xl">{t("partners.title")}</h1>

      <nav aria-label={t("partners.statusNav")} className="mt-6 overflow-x-auto">
        <ul className="flex min-w-max gap-2">
          {(["all", ...QUEUE_STATUSES] as const).map((status) => {
            const active = filters.status === status;
            const count = status === "all" ? total : (counts[status] ?? 0);
            return (
              <li key={status}>
                <button
                  type="button"
                  aria-pressed={active}
                  onClick={() => setFilters((f) => ({ ...f, status: status as PartnerFilters["status"] }))}
                  className={`label-mono border px-3 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                    active ? "border-primary bg-primary text-primary-foreground" : "border-line bg-surface text-ink-2"
                  }`}
                >
                  {status === "all" ? t("common.all") : t(`status.${status as PartnerStatus}`)}{" "}
                  <span className="data-mono">{count}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="mt-4 grid gap-3 border border-line bg-surface p-4 md:grid-cols-4">
        <label className="block text-sm">
          <span className="label-mono text-soft">{t("partners.search")}</span>
          <input
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
            placeholder={t("partners.searchPlaceholder")}
            className="mt-1 w-full border border-line bg-canvas px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </label>
        <label className="block text-sm">
          <span className="label-mono text-soft">{t("partners.category")}</span>
          <select
            value={filters.categoryId}
            onChange={(e) => setFilters((f) => ({ ...f, categoryId: e.target.value }))}
            className="mt-1 w-full border border-line bg-canvas px-3 py-2 text-sm outline-none focus:border-primary"
          >
            <option value="">{t("common.all")}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {categoryLabel(c, lang, c.key)}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="label-mono text-soft">{t("partners.city")}</span>
          <input
            value={filters.city}
            onChange={(e) => setFilters((f) => ({ ...f, city: e.target.value }))}
            className="mt-1 w-full border border-line bg-canvas px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </label>
        <label className="block text-sm">
          <span className="label-mono text-soft">{t("partners.country")}</span>
          <input
            value={filters.country}
            onChange={(e) => setFilters((f) => ({ ...f, country: e.target.value }))}
            placeholder="CH"
            className="mt-1 w-full border border-line bg-canvas px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </label>
      </div>

      {error ? (
        <p role="alert" className="mt-6 border-l-4 border-destructive bg-surface px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {rows === null ? (
        <p className="label-mono mt-8 text-soft">{t("common.loading")}</p>
      ) : rows.length === 0 ? (
        <div className="mt-8 border border-line bg-surface p-8">
          <p className="label-mono text-soft">{t("partners.emptyTitle")}</p>
          <p className="mt-2 text-sm text-ink-2">{t("partners.emptyBody")}</p>
          <button
            type="button"
            onClick={() => setFilters({ ...EMPTY, status: "all" })}
            className="label-mono mt-4 border border-ink px-3 py-2"
          >
            {t("partners.showAll")}
          </button>
        </div>
      ) : (
        <div className="mt-8 overflow-x-auto border border-line bg-surface">
          <table className="w-full min-w-[56rem] text-start text-sm">
            <thead>
              <tr className="border-b border-line">
                {COLUMNS.map((h) => (
                  <th key={h} scope="col" className="label-mono px-4 py-3 text-start text-soft">
                    {t(`partners.col.${h}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const docsOk = row.partner_documents.filter((d) => isDocumentValid(d.status, d.expires_on)).length;
                return (
                  <tr key={row.id} className="border-b border-line last:border-b-0">
                    <td className="data-mono px-4 py-3">
                      <Link
                        to="/admin/partner/$reference"
                        params={{ reference: row.reference }}
                        className="text-primary underline underline-offset-2"
                      >
                        {row.reference}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-ink">
                      {row.legal_name}
                      <span className="label-mono block text-soft">{row.trading_name || "—"}</span>
                    </td>
                    <td className="px-4 py-3 text-ink-2">
                      {row.city}
                      <span className="label-mono block text-soft">{row.country}</span>
                    </td>
                    <td className="data-mono px-4 py-3 text-ink-2">{row.partner_services.length}</td>
                    <td className="data-mono px-4 py-3 text-ink-2">
                      {docsOk}/{row.partner_documents.length}
                    </td>
                    <td className="data-mono px-4 py-3 text-ink-2">{row.internal_score ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`label-mono border px-2 py-1 ${PARTNER_STATUS_TONE[row.status as PartnerStatus]}`}
                      >
                        {t(`status.${row.status as PartnerStatus}`)}
                      </span>
                    </td>
                    <td className="data-mono px-4 py-3 text-soft">{formatDate(row.created_at, lang)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
