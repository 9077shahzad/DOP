import { btn, btnPrimary, field, cellClass as cell, headClass as head } from "@/components/system";
/**
 * /admin/kunden — B2B accounts.
 *
 * List of accounts, then a detail view with sites, contracts, services,
 * schedules, work orders, invoices and contacts. Invoicing only ever creates
 * drafts; work orders without proof of service come back as "not billed".
 */
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { InvoicePaymentSummary } from "@/components/admin/InvoicePaymentSummary";
import i18n from "@/i18n/config";
import { formatCurrency, formatDate } from "@/i18n/format";
import { useActiveLang } from "@/lib/admin-i18n";
import { downloadInvoicePdf } from "@/lib/documents/download";
import { pdfLabels } from "@/lib/documents/labels";
import { langOf, privateHead } from "@/lib/seo";

import {
  buildConsolidatedInvoice,
  fetchAccount,
  fetchAccounts,
  fetchAccountServices,
  fetchContacts,
  fetchContracts,
  fetchCatalogue,
  fetchInvoices,
  fetchSchedules,
  fetchSites,
  fetchSiteServices,
  fetchSlas,
  fetchWorkOrders,
  pauseSchedule,
  runWorkOrderJob,
  setWorkOrderStatus,
  WORK_ORDER_STATUSES,
  type Account,
  type AccountContact,
  type AccountSite,
  type CatalogueItem,
  type Contract,
  type Invoice,
  type InvoiceBuildResult,
  type ServiceSchedule,
  type SiteService,
  type Sla,
  type WorkOrder,
  type WorkOrderStatus,
} from "@/lib/accounts";

export const Route = createFileRoute("/admin/kunden")({
  ssr: false,
  head: () => privateHead(langOf(i18n.language), "admin"),
  component: AccountsScreen,
});


const TABS = ["sites", "contracts", "services", "schedules", "orders", "invoices", "contacts"] as const;
type Tab = (typeof TABS)[number];

function AccountsScreen() {
  const [selected, setSelected] = useState<string | null>(null);
  return selected ? (
    <AccountDetail id={selected} onBack={() => setSelected(null)} />
  ) : (
    <AccountList onSelect={setSelected} />
  );
}

function AccountList({ onSelect }: { onSelect: (id: string) => void }) {
  const { t } = useTranslation("admin");
  const [rows, setRows] = useState<Account[] | null>(null);
  const [sites, setSites] = useState<AccountSite[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const [accounts, allSites] = await Promise.all([fetchAccounts(), fetchSites()]);
        setRows(accounts);
        setSites(allSites);
      } catch (err) {
        console.error(err);
        setRows([]);
        setError(t("accounts.loadError"));
      }
    })();
  }, [t]);

  return (
    <section>
      <p className="label-mono text-primary">{t("accounts.eyebrow")}</p>
      <h1 className="mt-3 text-3xl md:text-4xl">{t("accounts.title")}</h1>
      <p className="mt-2 max-w-2xl text-sm text-ink-2">{t("accounts.subtitle")}</p>
      {error ? (
        <p role="alert" className="mt-4 border-l-4 border-destructive bg-surface px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {rows === null ? (
        <p className="mt-6 label-mono text-soft">{t("accounts.loading")}</p>
      ) : rows.length === 0 ? (
        <p className="mt-6 border border-line bg-surface p-6 text-sm text-ink-2">{t("accounts.empty")}</p>
      ) : (
        <div className="mt-6 overflow-x-auto border border-line bg-surface">
          <table className="w-full min-w-[42rem] border-collapse">
            <thead>
              <tr>
                <th className={head}>{t("accounts.col.account")}</th>
                <th className={head}>{t("accounts.col.type")}</th>
                <th className={head}>{t("accounts.col.status")}</th>
                <th className={head}>{t("accounts.col.sites")}</th>
                <th className={head}>{t("accounts.col.terms")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className={cell}>
                    <button type="button" className="text-left underline" onClick={() => onSelect(row.id)}>
                      {row.legal_name}
                    </button>
                    {row.trading_name ? <span className="block text-xs text-soft">{row.trading_name}</span> : null}
                  </td>
                  <td className={cell}>{t(`accounts.type.${row.type}`, { defaultValue: row.type })}</td>
                  <td className={cell}>{t(`accounts.accountStatus.${row.status}`, { defaultValue: row.status })}</td>
                  <td className={`${cell} font-mono`}>{sites.filter((s) => s.account_id === row.id).length}</td>
                  <td className={`${cell} font-mono`}>{row.payment_terms_days}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function AccountDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const { t } = useTranslation("admin");
  const lang = useActiveLang();
  const [tab, setTab] = useState<Tab>("sites");
  const [account, setAccount] = useState<Account | null>(null);
  const [sites, setSites] = useState<AccountSite[]>([]);
  const [contacts, setContacts] = useState<AccountContact[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [siteServices, setSiteServices] = useState<SiteService[]>([]);
  const [schedules, setSchedules] = useState<ServiceSchedule[]>([]);
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [catalogue, setCatalogue] = useState<CatalogueItem[]>([]);
  const [slas, setSlas] = useState<Sla[]>([]);
  const [accountServiceCount, setAccountServiceCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [periodStart, setPeriodStart] = useState(() => firstOfMonth());
  const [periodEnd, setPeriodEnd] = useState(() => lastOfMonth());
  const [result, setResult] = useState<InvoiceBuildResult | null>(null);

  const load = useCallback(async () => {
    try {
      const [acc, accSites, accContacts, accContracts, accInvoices, cat, slaRows, accServices] = await Promise.all([
        fetchAccount(id),
        fetchSites(id),
        fetchContacts(id),
        fetchContracts(id),
        fetchInvoices(id),
        fetchCatalogue(),
        fetchSlas(),
        fetchAccountServices(id),
      ]);
      setAccount(acc);
      setSites(accSites);
      setContacts(accContacts);
      setContracts(accContracts);
      setInvoices(accInvoices);
      setCatalogue(cat);
      setSlas(slaRows);
      setAccountServiceCount(accServices.length);
      const services = await fetchSiteServices(accSites.map((s) => s.id));
      setSiteServices(services);
      setSchedules(await fetchSchedules(services.map((s) => s.id)));
      setOrders(await fetchWorkOrders({ accountId: id }));
    } catch (err) {
      console.error(err);
      setError(t("accounts.loadError"));
    }
  }, [id, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const catalogueName = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of catalogue) {
      const byLang: Record<string, string | null> = {
        de: item.label_de,
        fr: item.label_fr,
        it: item.label_it,
        en: item.label_en,
      };
      map.set(item.id, byLang[lang] || item.label_de || item.key);
    }
    return map;
  }, [catalogue, lang]);

  const siteName = useMemo(() => new Map(sites.map((s) => [s.id, s.name])), [sites]);
  const slaName = useMemo(() => new Map(slas.map((s) => [s.id, s.name])), [slas]);

  async function generate() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await runWorkOrderJob();
      setNotice(res.skipped ? t("accounts.generateLocked") : t("accounts.generateDone", { count: res.created ?? 0 }));
      await load();
    } catch (err) {
      console.error(err);
      setError(t("accounts.generateError"));
    }
    setBusy(false);
  }

  async function build() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await buildConsolidatedInvoice(id, periodStart, periodEnd);
      setResult(res);
      setNotice(t("accounts.invoiceDone", { reference: res.reference, lines: res.lines }));
      await load();
    } catch (err) {
      console.error(err);
      setError(t("accounts.invoiceError"));
    }
    setBusy(false);
  }

  async function invoicePdf(invoice: Invoice) {
    setError(null);
    try {
      const recipient = [account?.legal_name || account?.trading_name || "", account?.billing_address || ""].filter(Boolean);
      await downloadInvoicePdf(invoice, recipient, pdfLabels(t));
    } catch (err) {
      console.error(err);
      setError(t("accounts.pdfError"));
    }
  }

  async function changeStatus(orderId: string, status: WorkOrderStatus) {

    try {
      await setWorkOrderStatus(orderId, status);
      await load();
    } catch (err) {
      console.error(err);
      setError(t("accounts.loadError"));
    }
  }

  async function togglePause(schedule: ServiceSchedule) {
    const paused = schedule.paused_until && new Date(schedule.paused_until) >= new Date();
    const until = paused ? null : window.prompt(t("accounts.pausePrompt"), addDays(90));
    if (!paused && !until) return;
    try {
      await pauseSchedule(schedule.id, until);
      await load();
    } catch (err) {
      console.error(err);
      setError(t("accounts.loadError"));
    }
  }

  return (
    <section>
      <button type="button" className={btn} onClick={onBack}>
        {t("accounts.back")}
      </button>
      <h1 className="mt-4 text-3xl md:text-4xl">{account?.legal_name ?? ""}</h1>
      <p className="label-mono mt-2 text-soft">
        {account ? t(`accounts.type.${account.type}`, { defaultValue: account.type }) : ""} ·{" "}
        {account ? t(`accounts.accountStatus.${account.status}`, { defaultValue: account.status }) : ""} ·{" "}
        {account?.country ?? "CH"} · {accountServiceCount} {t("accounts.services")}
      </p>

      {error ? (
        <p role="alert" className="mt-4 border-l-4 border-destructive bg-surface px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p role="status" className="mt-4 border-l-4 border-primary bg-surface px-3 py-2 text-sm text-ink-2">
          {notice}
        </p>
      ) : null}

      <nav aria-label={t("accounts.title")} className="mt-6 overflow-x-auto">
        <ul className="flex min-w-max gap-1 border-b border-line">
          {TABS.map((key) => (
            <li key={key}>
              <button
                type="button"
                onClick={() => setTab(key)}
                aria-current={tab === key ? "page" : undefined}
                className={`label-mono border-b-2 px-4 py-3 ${tab === key ? "border-primary text-ink" : "border-transparent text-soft"}`}
              >
                {t(`accounts.${key}`)}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mt-6 overflow-x-auto border border-line bg-surface">
        {tab === "sites" ? (
          <Table
            headers={[t("accounts.col.name"), t("accounts.col.address"), t("accounts.col.reference")]}
            rows={sites.map((s) => [s.name, `${s.address}, ${s.postcode} ${s.city}`, s.site_reference || "—"])}
          />
        ) : null}
        {tab === "contracts" ? (
          <Table
            headers={[t("accounts.col.reference"), t("accounts.col.period"), t("accounts.col.status")]}
            rows={contracts.map((c) => [
              c.reference,
              `${formatDate(c.starts_on, lang, { dateStyle: "medium" })} – ${c.ends_on ? formatDate(c.ends_on, lang, { dateStyle: "medium" }) : "—"}`,
              c.status,
            ])}
          />
        ) : null}
        {tab === "services" ? (
          <Table
            headers={[
              t("accounts.col.name"),
              t("accounts.col.service"),
              t("accounts.col.price"),
              t("accounts.col.frequency"),
              t("accounts.col.sla"),
            ]}
            rows={siteServices.map((s) => [
              siteName.get(s.site_id) ?? "—",
              catalogueName.get(s.catalogue_id) ?? "—",
              s.agreed_price === null ? "—" : formatCurrency(Number(s.agreed_price), lang),
              s.frequency ?? "—",
              s.sla_id ? (slaName.get(s.sla_id) ?? "—") : "—",
            ])}
          />
        ) : null}
        {tab === "schedules" ? (
          <div>
            <div className="flex flex-wrap gap-3 border-b border-line p-3">
              <button type="button" className={btnPrimary} disabled={busy} onClick={() => void generate()}>
                {t("accounts.generate")}
              </button>
            </div>
            <table className="w-full min-w-[40rem] border-collapse">
              <thead>
                <tr>
                  <th className={head}>{t("accounts.col.service")}</th>
                  <th className={head}>{t("accounts.col.frequency")}</th>
                  <th className={head}>{t("accounts.col.next")}</th>
                  <th className={head}>{t("accounts.col.paused")}</th>
                  <th className={head} />
                </tr>
              </thead>
              <tbody>
                {schedules.map((s) => {
                  const service = siteServices.find((x) => x.id === s.site_service_id);
                  const paused = s.paused_until && new Date(s.paused_until) >= new Date();
                  return (
                    <tr key={s.id}>
                      <td className={cell}>
                        {service ? (catalogueName.get(service.catalogue_id) ?? "—") : "—"}
                        <span className="block text-xs text-soft">
                          {service ? (siteName.get(service.site_id) ?? "") : ""}
                        </span>
                      </td>
                      <td className={cell}>{s.frequency}</td>
                      <td className={`${cell} font-mono`}>{formatDate(s.next_due_on, lang, { dateStyle: "medium" })}</td>
                      <td className={`${cell} font-mono`}>
                        {paused ? formatDate(s.paused_until as string, lang, { dateStyle: "medium" }) : "—"}
                      </td>
                      <td className={cell}>
                        <button type="button" className={btn} onClick={() => void togglePause(s)}>
                          {paused ? t("accounts.resume") : t("accounts.pause")}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
        {tab === "orders" ? (
          <table className="w-full min-w-[48rem] border-collapse">
            <thead>
              <tr>
                <th className={head}>{t("accounts.col.reference")}</th>
                <th className={head}>{t("accounts.col.name")}</th>
                <th className={head}>{t("accounts.col.due")}</th>
                <th className={head}>{t("accounts.col.response")}</th>
                <th className={head}>{t("accounts.col.resolution")}</th>
                <th className={head}>{t("accounts.col.status")}</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td className={`${cell} font-mono`}>{o.reference}</td>
                  <td className={cell}>{siteName.get(o.site_id) ?? "—"}</td>
                  <td className={`${cell} font-mono`}>{formatDate(o.due_on, lang, { dateStyle: "medium" })}</td>
                  <td className={`${cell} font-mono`}>
                    {o.response_due_at ? formatDate(o.response_due_at, lang, { dateStyle: "short", timeStyle: "short" }) : "—"}
                  </td>
                  <td className={`${cell} font-mono`}>
                    {o.resolution_due_at
                      ? formatDate(o.resolution_due_at, lang, { dateStyle: "short", timeStyle: "short" })
                      : "—"}
                  </td>
                  <td className={cell}>
                    <label className="sr-only" htmlFor={`st-${o.id}`}>
                      {t("accounts.statusChange")}
                    </label>
                    <select
                      id={`st-${o.id}`}
                      className={field}
                      value={o.status}
                      onChange={(e) => void changeStatus(o.id, e.target.value as WorkOrderStatus)}
                    >
                      {WORK_ORDER_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {t(`accounts.woStatus.${s}`)}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
        {tab === "invoices" ? (
          <div>
            <div className="flex flex-wrap items-end gap-3 border-b border-line p-3">
              <label className="text-sm">
                <span className="label-mono text-soft">{t("accounts.from")}</span>
                <input type="date" className={field} value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
              </label>
              <label className="text-sm">
                <span className="label-mono text-soft">{t("accounts.to")}</span>
                <input type="date" className={field} value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
              </label>
              <button type="button" className={btnPrimary} disabled={busy} onClick={() => void build()}>
                {t("accounts.buildInvoice")}
              </button>
            </div>
            <p className="border-b border-line px-3 py-2 text-xs text-soft">{t("accounts.draftOnly")}</p>
            {result && result.skipped.length > 0 ? (
              <div className="border-b border-line px-3 py-2 text-sm">
                <p className="label-mono text-soft">{t("accounts.skipped")}</p>
                <ul className="mt-2 space-y-1">
                  {result.skipped.map((s) => (
                    <li key={`${s.work_order}-${s.reason}`} className="text-ink-2">
                      <span className="font-mono">{s.work_order}</span> —{" "}
                      {t(`accounts.skipReason.${s.reason}`, { defaultValue: s.reason })}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <table className="w-full min-w-[52rem] border-collapse">
              <thead>
                <tr>
                  <th className={head}>{t("accounts.col.reference")}</th>
                  <th className={head}>{t("accounts.col.period")}</th>
                  <th className={head}>{t("accounts.col.net")}</th>
                  <th className={head}>{t("accounts.col.vat")}</th>
                  <th className={head}>{t("accounts.col.total")}</th>
                  <th className={head}>{t("accounts.col.status")}</th>
                  <th className={head}>{t("accounts.payment.title")}</th>
                  <th className={head}>{t("accounts.document")}</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id}>
                    <td className={`${cell} font-mono`}>
                      {inv.reference}
                      <span className="block text-[0.65rem] text-soft">{inv.qr_reference}</span>
                    </td>
                    <td className={`${cell} font-mono`}>
                      {formatDate(inv.period_start, lang, { dateStyle: "medium" })} –{" "}
                      {formatDate(inv.period_end, lang, { dateStyle: "medium" })}
                    </td>
                    <td className={`${cell} font-mono`}>{formatCurrency(Number(inv.net), lang, 2)}</td>
                    <td className={`${cell} font-mono`}>{formatCurrency(Number(inv.vat), lang, 2)}</td>
                    <td className={`${cell} font-mono`}>{formatCurrency(Number(inv.total), lang, 2)}</td>
                    <td className={cell}>{t(`accounts.invoiceStatus.${inv.status}`, { defaultValue: inv.status })}</td>
                    <td className={cell}>
                      <InvoicePaymentSummary invoice={inv} />
                    </td>
                    <td className={cell}>
                      <button type="button" className={btn} onClick={() => void invoicePdf(inv)}>
                        {t("accounts.pdf")}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="px-3 py-2 text-xs text-soft">{t("accounts.vatNote")}</p>
            <p className="px-3 pb-2 text-xs text-soft">{t("accounts.qrBlocked")}</p>

          </div>
        ) : null}
        {tab === "contacts" ? (
          <Table
            headers={[
              t("accounts.col.name"),
              t("accounts.col.role"),
              t("accounts.col.email"),
              t("accounts.col.phone"),
            ]}
            rows={contacts.map((c) => [c.name, c.role || "—", c.email || "—", c.phone || "—"])}
          />
        ) : null}
      </div>
    </section>
  );
}

function Table({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <table className="w-full min-w-[36rem] border-collapse">
      <thead>
        <tr>
          {headers.map((h) => (
            <th key={h} className={head}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={`${row[0]}-${index}`}>
            {row.map((value, i) => (
              <td key={i} className={cell}>
                {value}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function firstOfMonth(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1)).toISOString().slice(0, 10);
}
function lastOfMonth(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0)).toISOString().slice(0, 10);
}
function addDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
