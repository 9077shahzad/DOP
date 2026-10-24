/**
 * /admin/preise — pricing bands and rates, editable without a code change.
 *
 * Three things this screen must always make visible:
 *   1. which rates have never been signed off commercially (review flag),
 *   2. whether the draft can go live at all (band audit, run on the full set),
 *   3. which version is live and from when — published versions are read-only.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  Button,
  Card,
  CardHeader,
  Chip,
  EmptyState,
  ErrorState,
  Input,
  LoadingState,
  NoticeState,
  Select,
  TableShell,
  Td,
  Th,
  Tr,
  field,
} from "@/components/system";
import i18n from "@/i18n/config";
import { formatDate } from "@/i18n/format";
import { useActiveLang } from "@/lib/admin-i18n";
import { langOf, privateHead } from "@/lib/seo";
import {
  createDraftFrom,
  deleteRule,
  fetchConfigurations,
  fetchRules,
  operationalConfigurations,
  publishConfiguration,
  rollbackConfiguration,
  saveRule,
  unreviewedRules,
  updateConfiguration,
  validateRuleSet,
  type PricingConfiguration,
  type PricingRule,
  type ValidationIssue,
} from "@/lib/pricing-config";

export const Route = createFileRoute("/admin/preise")({
  ssr: false,
  head: () => privateHead(langOf(i18n.language), "adminPricing"),
  component: PricingAdmin,
});

type Translate = (key: string, options?: Record<string, unknown>) => string;

function issueText(t: Translate, issue: ValidationIssue): string {
  if (issue.kind === "overlap") return t("preise.issue.overlap", issue as unknown as Record<string, unknown>);
  if (issue.kind === "gap") return t("preise.issue.gap", issue as unknown as Record<string, unknown>);
  if (issue.kind === "invalid") return t("preise.issue.invalid", issue as unknown as Record<string, unknown>);
  return t("preise.issue.empty");
}

function PricingAdmin() {
  const { t } = useTranslation("admin");
  const lang = useActiveLang();

  const [configs, setConfigs] = useState<PricingConfiguration[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rules, setRules] = useState<PricingRule[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [issues, setIssues] = useState<ValidationIssue[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let alive = true;
    fetchConfigurations()
      .then((all) => {
        if (!alive) return;
        // Regression fixtures stay in the database but never appear as a
        // selectable live version.
        const rows = operationalConfigurations(all);
        setConfigs(rows);
        setSelectedId((current) => current ?? rows[0]?.id ?? null);
      })
      .catch((e: Error) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [reload]);

  useEffect(() => {
    if (!selectedId) return;
    let alive = true;
    setRules(null);
    fetchRules(selectedId)
      .then((rows) => alive && setRules(rows))
      .catch((e: Error) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [selectedId, reload]);

  const config = useMemo(
    () => configs?.find((c) => c.id === selectedId) ?? null,
    [configs, selectedId],
  );
  const editable = config?.status === "draft";
  // Only a superseded version can be restored — the live one is already live.
  const restorable = config?.status === "archived";
  const liveIssues = useMemo(() => (rules ? validateRuleSet(rules) : []), [rules]);
  const unreviewed = useMemo(() => (rules ? unreviewedRules(rules) : []), [rules]);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      setReload((n) => n + 1);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function onPublish() {
    if (!config) return;
    setBusy(true);
    setError(null);
    setIssues(null);
    try {
      const result = await publishConfiguration(config.id);
      if (result.status === "refused") {
        setIssues(result.issues);
        setNotice(null);
      } else {
        setNotice(t("preise.published"));
        setReload((n) => n + 1);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (error && !configs) return <ErrorState message={error} />;
  if (!configs) return <LoadingState label={t("common.loading")} />;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title={t("preise.title")}
          eyebrow={t("preise.eyebrow")}
          action={
            config ? (
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  onClick={() => void run(async () => {
                    const draft = await createDraftFrom(config);
                    setSelectedId(draft.id);
                  })}
                >
                  {t("preise.newDraft")}
                </Button>
                {restorable ? (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busy}
                    onClick={() =>
                      void run(async () => {
                        const restored = await rollbackConfiguration(config.id);
                        setSelectedId(restored.id);
                        setNotice(t("preise.rolledBack", { version: restored.version }));
                      })
                    }
                  >
                    {t("preise.rollback")}
                  </Button>
                ) : null}
                {editable ? (
                  <Button variant="primary" size="sm" disabled={busy} onClick={() => void onPublish()}>
                    {t("preise.publish")}
                  </Button>
                ) : null}
              </div>
            ) : null
          }
        />
        <div className="grid gap-4 p-4 sm:grid-cols-3">
          <label className="block text-sm">
            <span className="label-mono text-soft">{t("preise.version")}</span>
            <Select
              className={field}
              value={selectedId ?? ""}
              onChange={(e) => {
                setSelectedId(e.target.value);
                setIssues(null);
              }}
            >
              {configs.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.market} · v{c.version} · {t(`preise.status.${c.status}`)} · {formatDate(c.effective_from, lang)}
                </option>
              ))}
            </Select>
          </label>
          <label className="block text-sm">
            <span className="label-mono text-soft">{t("preise.name")}</span>
            <Input
              className={field}
              defaultValue={config?.name ?? ""}
              disabled={!editable}
              onBlur={(e) =>
                editable && config ? void run(() => updateConfiguration(config.id, { name: e.target.value })) : undefined
              }
            />
          </label>
          <label className="block text-sm">
            <span className="label-mono text-soft">{t("preise.effectiveFrom")}</span>
            <Input
              type="date"
              className={field}
              defaultValue={config?.effective_from ?? ""}
              disabled={!editable}
              onBlur={(e) =>
                editable && config
                  ? void run(() => updateConfiguration(config.id, { effective_from: e.target.value }))
                  : undefined
              }
            />
          </label>
        </div>
        {config?.notes ? <p className="px-4 pb-4 text-sm text-soft">{config.notes}</p> : null}
      </Card>

      {notice ? <NoticeState message={notice} /> : null}
      {error ? <ErrorState message={error} /> : null}

      {unreviewed.length > 0 ? (
        <Card className="border-warn/40">
          <CardHeader title={t("preise.review.title")} eyebrow={t("preise.review.eyebrow")} />
          <div className="space-y-1 p-4 text-sm text-ink">
            <p className="text-soft">{t("preise.review.body")}</p>
            <ul className="list-disc ps-5">
              {unreviewed.map((rule) => (
                <li key={rule.id}>
                  {rule.service} · {rule.band_id || rule.unit_type} · {rule.currency} {Number(rule.price)}
                </li>
              ))}
            </ul>
          </div>
        </Card>
      ) : null}

      {(issues ?? (liveIssues.length > 0 ? liveIssues : null)) ? (
        <Card className="border-danger/40">
          <CardHeader title={t("preise.gate.title")} eyebrow={t("preise.gate.eyebrow")} />
          <ul className="list-disc space-y-1 p-4 ps-9 text-sm text-ink">
            {(issues ?? liveIssues).map((issue, index) => (
              <li key={index}>{issueText(t as unknown as Translate, issue)}</li>
            ))}
          </ul>
        </Card>
      ) : null}

      {!rules ? (
        <LoadingState label={t("common.loading")} />
      ) : rules.length === 0 ? (
        <EmptyState title={t("preise.empty")} />
      ) : (
        <TableShell
          caption={t("preise.title")}
          head={
            <Tr>
              <Th>{t("preise.col.service")}</Th>
              <Th>{t("preise.col.propertyType")}</Th>
              <Th>{t("preise.col.band")}</Th>
              <Th>{t("preise.col.roomMin")}</Th>
              <Th>{t("preise.col.roomMax")}</Th>
              <Th>{t("preise.col.price")}</Th>
              <Th>{t("preise.col.currency")}</Th>
              <Th>{t("preise.col.flags")}</Th>
              <Th>{t("preise.col.actions")}</Th>
            </Tr>
          }
        >
          {rules.map((rule) => (
            <RuleRow
              key={rule.id}
              rule={rule}
              editable={Boolean(editable)}
              busy={busy}
              onSave={(patch) => void run(() => saveRule({ ...rule, ...patch }))}
              onDelete={() => void run(() => deleteRule(rule.id))}
              t={t}
            />
          ))}
        </TableShell>
      )}

      {editable && config ? (
        <Button
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={() =>
            void run(() =>
              saveRule({
                configuration_id: config.id,
                service: "clean",
                property_type: "any",
                band_id: "neu",
                room_min: null,
                room_max: null,
                price: 0,
                currency: "CHF",
                unit_type: "",
                requires_commercial_review: true,
                sort_order: (rules?.length ?? 0) * 10 + 10,
              }),
            )
          }
        >
          {t("preise.addRule")}
        </Button>
      ) : null}
    </div>
  );
}

function RuleRow({
  rule,
  editable,
  busy,
  onSave,
  onDelete,
  t,
}: {
  rule: PricingRule;
  editable: boolean;
  busy: boolean;
  onSave: (patch: Partial<PricingRule>) => void;
  onDelete: () => void;
  t: (key: string) => string;
}) {
  const num = (value: string) => (value.trim() === "" ? null : Number(value));
  return (
    <Tr>
      <Td>
        <Input
          className={field}
          defaultValue={rule.service}
          disabled={!editable}
          onBlur={(e) => e.target.value !== rule.service && onSave({ service: e.target.value })}
        />
      </Td>
      <Td>
        <Input
          className={field}
          defaultValue={rule.property_type}
          disabled={!editable}
          onBlur={(e) => e.target.value !== rule.property_type && onSave({ property_type: e.target.value })}
        />
      </Td>
      <Td>
        <Input
          className={field}
          defaultValue={rule.band_id}
          disabled={!editable}
          onBlur={(e) => e.target.value !== rule.band_id && onSave({ band_id: e.target.value })}
        />
      </Td>
      <Td>
        <Input
          className={field}
          type="number"
          step="0.5"
          defaultValue={rule.room_min == null ? "" : String(rule.room_min)}
          disabled={!editable}
          onBlur={(e) => onSave({ room_min: num(e.target.value) })}
        />
      </Td>
      <Td>
        <Input
          className={field}
          type="number"
          step="0.5"
          defaultValue={rule.room_max == null ? "" : String(rule.room_max)}
          disabled={!editable}
          onBlur={(e) => onSave({ room_max: num(e.target.value) })}
        />
      </Td>
      <Td>
        <Input
          className={field}
          type="number"
          step="1"
          defaultValue={String(Number(rule.price))}
          disabled={!editable}
          onBlur={(e) => onSave({ price: Number(e.target.value) })}
        />
      </Td>
      <Td>
        <Input
          className={field}
          defaultValue={rule.currency}
          disabled={!editable}
          onBlur={(e) => e.target.value !== rule.currency && onSave({ currency: e.target.value })}
        />
      </Td>
      <Td>
        <div className="space-y-1">
          <label className="flex items-center gap-2 text-xs text-soft">
            <input
              type="checkbox"
              checked={rule.requires_commercial_review}
              disabled={!editable}
              onChange={(e) => onSave({ requires_commercial_review: e.target.checked })}
            />
            {t("preise.col.review")}
          </label>
          <label className="flex items-center gap-2 text-xs text-soft">
            <input
              type="checkbox"
              checked={rule.gap_after_intentional}
              disabled={!editable}
              onChange={(e) => onSave({ gap_after_intentional: e.target.checked })}
            />
            {t("preise.col.gapOk")}
          </label>
          {rule.requires_commercial_review ? <Chip tone="warning">{t("preise.flag")}</Chip> : null}
        </div>
      </Td>
      <Td>
        {editable ? (
          <Button variant="danger" size="sm" disabled={busy} onClick={onDelete}>
            {t("preise.delete")}
          </Button>
        ) : (
          <span className="text-xs text-soft">{t("preise.locked")}</span>
        )}
      </Td>
    </Tr>
  );
}
