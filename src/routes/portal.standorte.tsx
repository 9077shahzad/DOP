/**
 * /portal/standorte — the customer's own sites and their open work orders.
 * RLS limits both queries to the organisation's linked account.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import i18n, { isLang, type Lang } from "@/i18n/config";
import { formatDate } from "@/i18n/format";
import { langOf, privateHead } from "@/lib/seo";
import { fetchSites, fetchWorkOrders, type AccountSite, type WorkOrder } from "@/lib/accounts";

export const Route = createFileRoute("/portal/standorte")({
  ssr: false,
  head: () => privateHead(langOf(i18n.language), "portalSites"),
  component: SitesPage,
});

const cell = "border-b border-line px-3 py-2 text-sm align-top";
const head = "label-mono border-b border-ink px-3 py-2 text-left text-soft";

function SitesPage() {
  const { t, i18n: inst } = useTranslation("portal");
  const lang: Lang = isLang(inst.language) ? (inst.language as Lang) : "de";
  const [sites, setSites] = useState<AccountSite[] | null>(null);
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const [siteRows, orderRows] = await Promise.all([fetchSites(), fetchWorkOrders()]);
        setSites(siteRows);
        setOrders(orderRows.filter((o) => o.status !== "cancelled"));
      } catch (err) {
        console.error(err);
        setSites([]);
        setError(t("sites.loadError"));
      }
    })();
  }, [t]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 md:px-8">
      <p className="label-mono text-primary">{t("sites.eyebrow")}</p>
      <h1 className="mt-3 text-4xl md:text-5xl">{t("sites.title")}</h1>
      <p className="mt-2 max-w-2xl text-sm text-ink-2">{t("sites.subtitle")}</p>

      {error ? (
        <p role="alert" className="mt-4 border-l-4 border-destructive bg-surface px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {sites === null ? (
        <p className="label-mono mt-6 text-soft">{t("sites.loading")}</p>
      ) : sites.length === 0 ? (
        <p className="mt-6 border border-line bg-surface p-6 text-sm text-ink-2">{t("sites.empty")}</p>
      ) : (
        <>
          <div className="mt-8 overflow-x-auto border border-line bg-surface">
            <table className="w-full min-w-[34rem] border-collapse">
              <thead>
                <tr>
                  <th className={head}>{t("sites.col.site")}</th>
                  <th className={head}>{t("sites.col.address")}</th>
                </tr>
              </thead>
              <tbody>
                {sites.map((site) => (
                  <tr key={site.id}>
                    <td className={cell}>{site.name}</td>
                    <td className={cell}>{`${site.address}, ${site.postcode} ${site.city}`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2 className="mt-10 text-2xl">{t("sites.upcoming")}</h2>
          {orders.length === 0 ? (
            <p className="mt-4 border border-line bg-surface p-6 text-sm text-ink-2">{t("sites.none")}</p>
          ) : (
            <div className="mt-4 overflow-x-auto border border-line bg-surface">
              <table className="w-full min-w-[40rem] border-collapse">
                <thead>
                  <tr>
                    <th className={head}>{t("sites.col.reference")}</th>
                    <th className={head}>{t("sites.col.site")}</th>
                    <th className={head}>{t("sites.col.due")}</th>
                    <th className={head}>{t("sites.col.window")}</th>
                    <th className={head}>{t("sites.col.status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id}>
                      <td className={`${cell} font-mono`}>{order.reference}</td>
                      <td className={cell}>{sites.find((s) => s.id === order.site_id)?.name ?? "—"}</td>
                      <td className={`${cell} font-mono`}>{formatDate(order.due_on, lang, { dateStyle: "medium" })}</td>
                      <td className={`${cell} font-mono`}>
                        {order.window_start && order.window_end
                          ? `${formatDate(order.window_start, lang, { timeStyle: "short" })}–${formatDate(order.window_end, lang, { timeStyle: "short" })}`
                          : "—"}
                      </td>
                      <td className={cell}>{order.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
