import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";

import { ReviewSettingsCard } from "@/components/admin/ReviewSettingsCard";
import i18n from "@/i18n/config";
import { formatDate } from "@/i18n/format";
import { langOf, privateHead } from "@/lib/seo";
import { useActiveLang } from "@/lib/admin-i18n";
import {
  getNotificationSettings,
  listDeliveryLog,
  saveNotificationSettings,
  sendTestNotification,
  type DeliveryRow,
  type SettingsView,
} from "@/lib/notifications.functions";

export const Route = createFileRoute("/admin/einstellungen")({
  ssr: false,
  head: () => privateHead(langOf(i18n.language), "admin"),
  component: AdminSettings,
});

const STATUS_FILTERS = ["all", "sent", "delivered", "bounced", "deferred", "complained", "failed"] as const;

function toneFor(status: string): string {
  if (status === "sent" || status === "delivered") return "border-success text-success";
  if (status === "deferred") return "border-warning text-warning";
  if (status === "failed" || status === "bounced" || status === "complained") return "border-destructive text-destructive";
  return "border-line text-ink-2";
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="label-mono text-soft">{label}</span>
      <div className="mt-2">{children}</div>
      {hint ? <span className="mt-1 block text-xs text-soft">{hint}</span> : null}
    </label>
  );
}

const inputClass =
  "w-full border border-line bg-canvas px-3 py-2 text-sm text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

function AdminSettings() {
  const { t } = useTranslation("admin");
  const lang = useActiveLang();

  const [settings, setSettings] = useState<SettingsView | null>(null);
  const [form, setForm] = useState({
    enabled: false,
    from_name: "",
    from_email: "",
    reply_to: "",
    test_recipient: "",
    api_key: "",
    webhook_secret: "",
  });
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [rows, setRows] = useState<DeliveryRow[] | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const loadLog = useCallback(async (status: string, term: string) => {
    try {
      setRows(await listDeliveryLog({ data: { status, search: term, limit: 100 } }));
    } catch {
      setRows([]);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const current = await getNotificationSettings();
        setSettings(current);
        setForm({
          enabled: current.enabled,
          from_name: current.from_name,
          from_email: current.from_email,
          reply_to: current.reply_to,
          test_recipient: current.test_recipient,
          api_key: "",
          webhook_secret: "",
        });
      } catch {
        setError(t("settings.loadError"));
      }
      void loadLog("all", "");
    })();
  }, [loadLog, t]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setNotice(null);
    setError(null);
    try {
      await saveNotificationSettings({ data: form });
      const current = await getNotificationSettings();
      setSettings(current);
      setForm((prev) => ({ ...prev, api_key: "", webhook_secret: "" }));
      setNotice(t("settings.saved"));
    } catch {
      setError(t("settings.saveError"));
    } finally {
      setBusy(false);
    }
  }

  async function runTest() {
    setBusy(true);
    setNotice(null);
    setError(null);
    try {
      const target = form.test_recipient.trim();
      if (!target) {
        setError(t("settings.testMissing"));
        return;
      }
      const result = await sendTestNotification({ data: { to: target, language: lang } });
      if (result.sent) setNotice(t("settings.testSent", { email: target }));
      else setError(t("settings.testFailed", { reason: result.reason }));
      await loadLog(statusFilter, search);
    } catch {
      setError(t("settings.testFailed", { reason: "server error" }));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <p className="label-mono text-primary">{t("settings.eyebrow")}</p>
      <h1 className="mt-2 text-3xl md:text-4xl">{t("settings.title")}</h1>
      <p className="mt-3 max-w-2xl text-sm text-ink-2">{t("settings.intro")}</p>

      {notice ? (
        <p role="status" className="mt-6 border-l-4 border-success bg-surface px-4 py-3 text-sm text-ink">
          {notice}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="mt-6 border-l-4 border-destructive bg-surface px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <form onSubmit={submit} className="mt-8 grid gap-6 border border-line bg-surface p-6 md:grid-cols-2">
        <h2 className="label-mono text-primary md:col-span-2">{t("settings.providerSection")}</h2>

        <Field label={t("settings.provider")}>
          <p className="text-sm text-ink">Resend</p>
        </Field>

        <Field label={t("settings.enabled")}>
          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
            />
            {t("settings.enabledHint")}
          </label>
        </Field>

        <Field label={t("settings.apiKey")} hint={
          settings?.api_key_set
            ? t("settings.apiKeySet", { source: settings.api_key_source })
            : t("settings.apiKeyMissing")
        }>
          <input
            type="password"
            autoComplete="off"
            value={form.api_key}
            placeholder="re_..."
            onChange={(e) => setForm({ ...form, api_key: e.target.value })}
            className={inputClass}
          />
        </Field>

        <Field label={t("settings.webhookSecret")} hint={t("settings.webhookHint")}>
          <input
            type="password"
            autoComplete="off"
            value={form.webhook_secret}
            onChange={(e) => setForm({ ...form, webhook_secret: e.target.value })}
            className={inputClass}
          />
        </Field>

        <h2 className="label-mono text-primary md:col-span-2">{t("settings.senderSection")}</h2>

        <Field label={t("settings.fromName")}>
          <input value={form.from_name} onChange={(e) => setForm({ ...form, from_name: e.target.value })} className={inputClass} />
        </Field>
        <Field label={t("settings.fromEmail")} hint={t("settings.fromEmailHint")}>
          <input
            type="email"
            value={form.from_email}
            onChange={(e) => setForm({ ...form, from_email: e.target.value })}
            className={inputClass}
          />
        </Field>
        <Field label={t("settings.replyTo")}>
          <input
            type="email"
            value={form.reply_to}
            onChange={(e) => setForm({ ...form, reply_to: e.target.value })}
            className={inputClass}
          />
        </Field>
        <Field label={t("settings.testRecipient")}>
          <input
            type="email"
            value={form.test_recipient}
            onChange={(e) => setForm({ ...form, test_recipient: e.target.value })}
            className={inputClass}
          />
        </Field>

        <div className="flex flex-wrap gap-3 md:col-span-2">
          <button
            type="submit"
            disabled={busy}
            className="label-mono border border-primary bg-primary px-4 py-2 text-surface disabled:opacity-60"
          >
            {t("settings.save")}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void runTest()}
            className="label-mono border border-line px-4 py-2 text-ink disabled:opacity-60"
          >
            {t("settings.sendTest")}
          </button>
          {settings?.updated_at ? (
            <span className="label-mono self-center text-soft">
              {t("settings.updatedAt", { date: formatDate(settings.updated_at, lang) })}
            </span>
          ) : null}
        </div>
      </form>

      <h2 className="mt-12 text-2xl">{t("settings.logTitle")}</h2>
      <p className="mt-2 max-w-2xl text-sm text-ink-2">{t("settings.logIntro")}</p>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="block">
          <span className="label-mono text-soft">{t("settings.filterStatus")}</span>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              void loadLog(e.target.value, search);
            }}
            className={`mt-2 ${inputClass}`}
          >
            {STATUS_FILTERS.map((s) => (
              <option key={s} value={s}>
                {t(`settings.status.${s}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="label-mono text-soft">{t("settings.filterRecipient")}</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onBlur={() => void loadLog(statusFilter, search)}
            className={`mt-2 ${inputClass}`}
          />
        </label>
        <button
          type="button"
          onClick={() => void loadLog(statusFilter, search)}
          className="label-mono border border-line px-4 py-2 text-ink"
        >
          {t("settings.refresh")}
        </button>
      </div>

      {rows === null ? (
        <p className="label-mono mt-6 text-soft">{t("common.loading")}</p>
      ) : rows.length === 0 ? (
        <p className="mt-6 text-ink-2">{t("settings.logEmpty")}</p>
      ) : (
        <div className="mt-6 overflow-x-auto border border-line bg-surface">
          <table className="w-full min-w-[60rem] text-start text-sm">
            <thead>
              <tr className="border-b border-line">
                {["time", "template", "recipient", "subject", "status", "detail"].map((col) => (
                  <th key={col} scope="col" className="label-mono px-4 py-3 text-start text-soft">
                    {t(`settings.columns.${col}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-line last:border-b-0 align-top">
                  <td className="px-4 py-3 text-ink-2">{formatDate(row.event_at || row.created_at, lang)}</td>
                  <td className="px-4 py-3 text-ink-2">{t(`settings.templates.${row.template}`, { defaultValue: row.template })}</td>
                  <td className="px-4 py-3 text-ink">{row.recipient || "—"}</td>
                  <td className="px-4 py-3 text-ink-2">{row.subject || "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`label-mono inline-block border px-2 py-1 ${toneFor(row.status)}`}>
                      {t(`settings.status.${row.status}`, { defaultValue: row.status })}
                    </span>
                  </td>
                  <td className="max-w-[22rem] px-4 py-3 text-xs text-soft">{row.error || row.provider_message_id || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <ReviewSettingsCard />
    </section>
  );
}
