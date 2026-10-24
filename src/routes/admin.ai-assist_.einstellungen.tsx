/**
 * /admin/ai-assist/einstellungen — switches, budgets and the privacy record.
 *
 * A feature that is off cannot run at all: the switch is checked on the server
 * before any model is contacted, and the monthly budget stops the spend even
 * when the switch stays on.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button, Card, CardHeader, ErrorState, Input, LoadingState, NoticeState, TableShell, Td, Th, Tr } from "@/components/system";
import i18n from "@/i18n/config";
import { fetchFlags, fetchUsage, saveFlag, type AiFlag } from "@/lib/ai";
import { langOf, privateHead } from "@/lib/seo";

export const Route = createFileRoute("/admin/ai-assist_/einstellungen")({
  ssr: false,
  head: () => privateHead(langOf(i18n.language), "admin"),
  component: AiSettingsPage,
});

function AiSettingsPage() {
  const { t } = useTranslation("ai");
  const [flags, setFlags] = useState<AiFlag[] | null>(null);
  const [usage, setUsage] = useState<Record<string, { calls: number; cost: number; blocked: number }>>({});
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function load() {
    const [rows, totals] = await Promise.all([fetchFlags(), fetchUsage()]);
    setFlags(rows);
    setUsage(totals);
  }

  useEffect(() => {
    void load().catch((reason) => setError(String(reason)));
  }, []);

  async function update(feature: string, patch: { enabled?: boolean; monthly_budget_chf?: number }) {
    setSaved(false);
    try {
      await saveFlag(feature, patch);
      setSaved(true);
      await load();
    } catch (reason) {
      setError(String(reason));
    }
  }

  return (
      <div className="space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold text-ink">{t("settings.title")}</h1>
          <Link to="/admin/ai-assist" className="label-mono text-brand underline">
            {t("settings.back")}
          </Link>
        </header>

        {error ? <ErrorState message={error} /> : null}
        {saved ? <NoticeState message={t("settings.saved")} /> : null}

        {flags === null ? (
          <LoadingState label={t("common.loading")} />
        ) : (
          <TableShell
            caption={t("settings.title")}
            head={
              <Tr>
                <Th>{t("settings.feature")}</Th>
                <Th>{t("settings.enabled")}</Th>
                <Th>{t("settings.budget")}</Th>
                <Th>{t("settings.usageCalls")}</Th>
                <Th>{t("settings.usageCost")}</Th>
                <Th>{t("settings.blocked")}</Th>
              </Tr>
            }
          >
            {flags.map((flag) => {
              const totals = usage[flag.feature] ?? { calls: 0, cost: 0, blocked: 0 };
              return (
                <Tr key={flag.feature}>
                  <Td>{t(`features.${flag.feature}`)}</Td>
                  <Td>
                    <input
                      type="checkbox"
                      className="size-5"
                      checked={flag.enabled}
                      onChange={(event) => void update(flag.feature, { enabled: event.target.checked })}
                    />
                  </Td>
                  <Td>
                    <Input
                      type="number"
                      min={0}
                      step={10}
                      className="w-28"
                      defaultValue={String(flag.monthly_budget_chf ?? 0)}
                      onBlur={(event) =>
                        void update(flag.feature, { monthly_budget_chf: Number(event.target.value) || 0 })
                      }
                    />
                  </Td>
                  <Td>{totals.calls}</Td>
                  <Td>{totals.cost.toFixed(2)}</Td>
                  <Td>{totals.blocked}</Td>
                </Tr>
              );
            })}
          </TableShell>
        )}

        <Card>
          <CardHeader title={t("settings.privacyTitle")} />
          <p className="p-4 text-sm text-soft">{t("settings.privacyBody")}</p>
        </Card>

        <Button variant="outline" onClick={() => void load()}>
          {t("common.loading")}
        </Button>
      </div>
  );
}
