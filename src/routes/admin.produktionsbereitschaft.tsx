/**
 * /admin/produktionsbereitschaft — production readiness.
 *
 * No row is green by default. Live rows are recomputed on every load from the
 * database, DNS and the cron history; attestation rows are only green once a
 * named person has confirmed them, and they say who and when.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import {
  Card,
  CardHeader,
  Chip,
  ErrorState,
  Input,
  LoadingState,
  btn,
  btnPrimary,
} from "@/components/system";
import i18n from "@/i18n/config";
import {
  getReadinessReport,
  setReadinessAttestation,
  type ReadinessReport,
  type ReadinessRow,
} from "@/lib/readiness.functions";
import { langOf, privateHead } from "@/lib/seo";

export const Route = createFileRoute("/admin/produktionsbereitschaft")({
  head: () => privateHead(langOf(i18n.language), "admin"),
  component: ReadinessPage,
});

function toneOf(status: ReadinessRow["status"]) {
  if (status === "ok") return "success" as const;
  if (status === "failed") return "danger" as const;
  if (status === "partial") return "warning" as const;
  return "neutral" as const;
}

function ReadinessPage() {
  const { t } = useTranslation("admin");
  const r = (key: string) => t(`readiness.${key}`);
  const load = useServerFn(getReadinessReport);
  const attest = useServerFn(setReadinessAttestation);
  const queryClient = useQueryClient();

  const report = useQuery<ReadinessReport>({
    queryKey: ["readiness"],
    queryFn: () => load(),
  });

  const confirm = useMutation({
    mutationFn: (input: { key: string; confirmed: boolean; note: string }) =>
      attest({ data: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["readiness"] }),
  });

  const stamp = (value: string) =>
    value
      ? new Date(value).toLocaleString(i18n.language, { dateStyle: "medium", timeStyle: "short" })
      : "—";

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">{r("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{r("subtitle")}</p>
      </header>

      {report.isLoading ? <LoadingState label={r("loading")} /> : null}
      {report.isError ? <ErrorState message={String(report.error)} /> : null}

      {report.data ? (
        <>
          <Card>
            <CardHeader
              title={r("headline")}
              eyebrow={`${r("checkedAt")}: ${stamp(report.data.checkedAt)}`}
            />
            <div className="space-y-3 p-4">
              <div className="flex items-center gap-3">
                <Chip tone={report.data.ready ? "success" : "danger"}>
                  {report.data.ready ? r("ready") : r("notReady")}
                </Chip>
                <p className="text-sm">{report.data.headline}</p>
              </div>
              {report.data.blockers.length ? (
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    {r("productionBlockers")}
                  </p>
                  <ul className="mt-1 list-disc pl-5 text-sm">
                    {report.data.blockers.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {r("provisional")}
                </p>
                <ul className="mt-1 list-disc pl-5 text-sm text-muted-foreground">
                  {report.data.provisional.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <p className="text-xs text-muted-foreground">{r("notReadyNote")}</p>
            </div>
          </Card>

          <Card>
            <CardHeader title={r("cronTitle")} eyebrow={r("cronHint")} />
            <div className="overflow-x-auto">
              {report.data.cron.length ? (
                <table className="w-full min-w-[52rem] text-left text-sm">
                  <thead>
                    <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                      {(
                        [
                          "job",
                          "schedule",
                          "lastSuccess",
                          "nextRun",
                          "processed",
                          "failures",
                          "health",
                        ] as const
                      ).map((col) => (
                        <th key={col} scope="col" className="px-4 py-2 font-medium">
                          {r(`cronCol.${col}`)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {report.data.cron.map((job) => (
                      <tr key={job.name} className="border-b border-border last:border-b-0">
                        <td className="px-4 py-2 font-mono text-xs">{job.name}</td>
                        <td className="px-4 py-2 font-mono text-xs">{job.schedule}</td>
                        <td className="px-4 py-2 text-xs">{stamp(job.lastSuccess)}</td>
                        <td className="px-4 py-2 text-xs">
                          {job.nextRun ? stamp(job.nextRun) : "—"}
                        </td>
                        <td className="px-4 py-2 text-xs">{job.processed24h}</td>
                        <td className="px-4 py-2 text-xs">{job.failures24h}</td>
                        <td className="px-4 py-2">
                          <Chip
                            tone={
                              job.health === "healthy"
                                ? "success"
                                : job.health === "failed"
                                  ? "danger"
                                  : "warning"
                            }
                          >
                            {r(`cronHealth.${job.health}`)}
                          </Chip>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="p-4 text-sm text-muted-foreground">{r("noCron")}</p>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader
              title={r("securityTitle")}
              eyebrow={`${report.data.security.reduce((sum, g) => sum + g.count, 0)} ${r("securityOpen")}`}
            />
            <p className="px-4 pt-3 text-xs text-muted-foreground">{r("securityHint")}</p>
            <ul className="divide-y divide-border">
              {report.data.security.map((group) => (
                <li key={group.key} className="space-y-2 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{group.label}</span>
                    <Chip tone={group.count > 0 ? "warning" : "success"}>{group.count}</Chip>
                  </div>
                  <p className="text-xs text-muted-foreground">{group.reason}</p>
                  {group.items.length ? (
                    <details className="text-xs">
                      <summary className="cursor-pointer text-muted-foreground">
                        {r("securityItems")}
                      </summary>
                      <p className="mt-1 break-all font-mono text-muted-foreground">
                        {group.items.join(" · ")}
                      </p>
                    </details>
                  ) : null}
                </li>
              ))}
            </ul>
          </Card>

          {(["software", "human_uat", "business", "external"] as const).map((category) => {
            const rows = report.data.rows.filter((item) => item.category === category);
            const open = rows.filter((item) => item.status !== "ok");
            return (
              <Card key={category}>
                <CardHeader
                  title={r(`category.${category}`)}
                  eyebrow={`${open.length}/${rows.length}`}
                />
                <ul className="divide-y divide-border">
                  {rows.map((item) =>
                    item.kind === "attestation" ? (
                      <AttestationRow
                        key={item.key}
                        row={item}
                        stamp={stamp}
                        label={r}
                        busy={confirm.isPending}
                        onSubmit={(note, confirmed) =>
                          confirm.mutate({ key: item.key, confirmed, note })
                        }
                      />
                    ) : (
                      <li key={item.key} className="grid gap-2 p-4 sm:grid-cols-[1fr_auto]">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium">{item.label}</span>
                            <Chip tone={toneOf(item.status)}>{r(`status.${item.status}`)}</Chip>
                            {!item.blocking ? (
                              <span className="text-xs text-muted-foreground">
                                {r("nonBlocking")}
                              </span>
                            ) : null}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {r("checks")}: {item.checked}
                          </p>
                          {item.missing ? (
                            <p className="text-xs text-destructive">
                              {r("gap")}: {item.missing}
                            </p>
                          ) : null}
                          {item.detail?.length ? (
                            <p className="break-all font-mono text-xs text-muted-foreground">
                              {item.detail.join(" · ")}
                            </p>
                          ) : null}
                        </div>
                        {item.fixTo ? (
                          <Link to={item.fixTo} className={`${btn} h-fit whitespace-nowrap`}>
                            {item.fixLabel}
                          </Link>
                        ) : null}
                      </li>
                    ),
                  )}
                  {rows.length === 0 ? (
                    <li className="p-4 text-sm text-muted-foreground">{r("sectionDone")}</li>
                  ) : null}
                </ul>
              </Card>
            );
          })}
        </>
      ) : null}
    </div>
  );
}

function AttestationRow({
  row,
  stamp,
  label,
  busy,
  onSubmit,
}: {
  row: ReadinessRow;
  stamp: (value: string) => string;
  label: (key: string) => string;
  busy: boolean;
  onSubmit: (note: string, confirmed: boolean) => void;
}) {
  const [note, setNote] = useState(row.note ?? "");

  return (
    <li className="space-y-2 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium">{row.label}</span>
        <Chip tone={toneOf(row.status)}>{label(`status.${row.status}`)}</Chip>
        <span className="text-xs text-muted-foreground">{label("manual")}</span>
      </div>
      <p className="text-xs text-muted-foreground">
        {label("checks")}: {row.checked}
      </p>
      {row.status === "ok" ? (
        <p className="text-xs text-muted-foreground">
          {label("confirmedBy")}: {row.confirmedBy || "—"} · {stamp(row.confirmedAt ?? "")}
        </p>
      ) : (
        <p className="text-xs text-destructive">{label("noAttestation")}</p>
      )}
      <div className="flex flex-wrap gap-2">
        <Input
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder={label("notePlaceholder")}
          aria-label={label("notePlaceholder")}
          className="max-w-sm"
        />
        <button
          type="button"
          className={btnPrimary}
          disabled={busy}
          onClick={() => onSubmit(note, true)}
        >
          {label("confirm")}
        </button>
        {row.status === "ok" ? (
          <button
            type="button"
            className={btn}
            disabled={busy}
            onClick={() => onSubmit(note, false)}
          >
            {label("revoke")}
          </button>
        ) : null}
      </div>
    </li>
  );
}
