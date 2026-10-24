import { btn, btnPrimary, field } from "@/components/system";
/**
 * /admin/freigaben — approval inbox.
 *
 * Limits are enforced in the database; this screen only shows what is pending
 * and records a decision. Approving here does not itself apply the discount —
 * the requester re-runs the action with the approval attached.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import i18n from "@/i18n/config";
import { formatDate } from "@/i18n/format";
import { useActiveLang } from "@/lib/admin-i18n";
import { langOf, privateHead } from "@/lib/seo";
import { decideApproval, fetchApprovals, type ApprovalRequest } from "@/lib/commercial";

export const Route = createFileRoute("/admin/freigaben")({
  ssr: false,
  head: () => privateHead(langOf(i18n.language), "admin"),
  component: ApprovalInbox,
});


function ApprovalInbox() {
  const { t } = useTranslation("admin");
  const lang = useActiveLang();
  const [rows, setRows] = useState<ApprovalRequest[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setRows(await fetchApprovals("all"));
    } catch (err) {
      console.error(err);
      setRows([]);
      setError(t("approvals.loadError"));
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function decide(id: string, approve: boolean) {
    setBusy(true);
    setError(null);
    try {
      await decideApproval(id, approve, note);
      setNote("");
      await load();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : t("approvals.decideError"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <p className="label-mono text-primary">{t("approvals.eyebrow")}</p>
      <h1 className="mt-2 text-3xl md:text-4xl">{t("approvals.title")}</h1>
      <p className="mt-2 max-w-2xl text-sm text-ink-2">{t("approvals.lead")}</p>

      {error ? (
        <p role="alert" className="mt-6 border-l-4 border-destructive bg-surface px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <label className="mt-6 block max-w-xl text-sm">
        <span className="label-mono text-soft">{t("approvals.note")}</span>
        <input value={note} onChange={(e) => setNote(e.target.value)} className={field} />
      </label>

      {rows === null ? (
        <p className="label-mono mt-8 text-soft">{t("common.loading")}</p>
      ) : rows.length === 0 ? (
        <div className="mt-8 border border-line bg-surface p-8">
          <p className="label-mono text-soft">{t("approvals.empty")}</p>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {rows.map((row) => (
            <li key={row.id} className="border border-line bg-surface p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <p className="text-sm text-ink">
                  {t(`approvals.scope.${row.rule?.scope ?? "unknown"}`, row.rule?.scope ?? "—")}
                  {" · "}
                  <span className="data-mono">{row.requested_value ?? "—"}</span>
                </p>
                <p className="label-mono text-soft">
                  {t(`approvals.status.${row.status}`, row.status)} · {formatDate(row.created_at, lang)}
                </p>
              </div>
              <p className="mt-2 text-xs text-soft">
                {t("approvals.requiredRole", { role: row.rule?.required_role ?? "—" })}
                {row.lead ? ` · ${row.lead.reference}` : ""}
              </p>
              {row.note ? <p className="mt-2 text-sm text-ink-2">{row.note}</p> : null}
              {row.status === "pending" ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" disabled={busy} className={btnPrimary} onClick={() => void decide(row.id, true)}>
                    {t("approvals.approve")}
                  </button>
                  <button type="button" disabled={busy} className={btn} onClick={() => void decide(row.id, false)}>
                    {t("approvals.reject")}
                  </button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
