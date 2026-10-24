/**
 * /admin/vorfaelle — Vorfälle, Schadensmeldungen und Bewertungen.
 *
 * Two things that only exist after a job: what went wrong, and what the
 * customer thought. Review invitations are no longer created here — they are
 * part of the financial close-out on /admin/finanzen — so this screen only
 * reports incidents and reads the reviews that came back.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  Button,
  Card,
  CardHeader,
  EmptyState,
  ErrorState,
  Field,
  LoadingState,
  Select,
  TableShell,
  Td,
  Th,
  Tr,
  Textarea,
} from "@/components/system";
import i18n from "@/i18n/config";
import { formatDate } from "@/i18n/format";
import { useActiveLang } from "@/lib/admin-i18n";
import { langOf, privateHead } from "@/lib/seo";
import { fetchJobs, type JobExec } from "@/lib/jobs-exec";
import {
  INCIDENT_KINDS,
  INCIDENT_SEVERITIES,
  INCIDENT_STATUSES,
  fetchIncidents,
  fetchReviews,
  reportIncident,
  updateIncident,
  type Incident,
  type JobReview,
} from "@/lib/operations";

export const Route = createFileRoute("/admin/vorfaelle")({
  ssr: false,
  head: () => privateHead(langOf(i18n.language), "admin"),
  component: IncidentsScreen,
});

function IncidentsScreen() {
  const { t } = useTranslation("ops");
  const lang = useActiveLang();
  const [incidents, setIncidents] = useState<Incident[] | null>(null);
  const [reviews, setReviews] = useState<JobReview[]>([]);
  const [jobs, setJobs] = useState<JobExec[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState({ jobId: "", kind: "damage", severity: "low", description: "" });

  async function load() {
    try {
      const [i, r, j] = await Promise.all([fetchIncidents(), fetchReviews(), fetchJobs("all")]);
      setIncidents(i);
      setReviews(r);
      setJobs(j);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("common.loadFailed"));
    }
  }
  useEffect(() => {
    void load();
  }, []);

  const jobRef = useMemo(() => new Map(jobs.map((j) => [j.id, j.reference])), [jobs]);

  return (
      <div className="space-y-6">
        <CardHeader eyebrow={t("incidents.eyebrow")} title={t("incidents.title")} />
        {error ? <ErrorState message={error} /> : null}

        <Card>
          <CardHeader title={t("incidents.report")} />
          <div className="mt-4 grid gap-4 md:grid-cols-4">
            <Field label={t("incidents.job")}>
              {(p) => (
                <Select {...p} value={draft.jobId} onChange={(e) => setDraft({ ...draft, jobId: e.target.value })}>
                  <option value="">{t("incidents.noJob")}</option>
                  {jobs.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.reference}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label={t("incidents.kind")}>
              {(p) => (
                <Select {...p} value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value })}>
                  {INCIDENT_KINDS.map((k) => (
                    <option key={k} value={k}>
                      {t(`incidentKind.${k}`)}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label={t("incidents.severity")}>
              {(p) => (
                <Select {...p} value={draft.severity} onChange={(e) => setDraft({ ...draft, severity: e.target.value })}>
                  {INCIDENT_SEVERITIES.map((sv) => (
                    <option key={sv} value={sv}>
                      {t(`incidentSeverity.${sv}`)}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label={t("incidents.description")} className="md:col-span-4">
              {(p) => (
                <Textarea
                  {...p}
                  value={draft.description}
                  onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                />
              )}
            </Field>
          </div>
          <div className="mt-4">
            <Button
              size="sm"
              variant="primary"
              disabled={!draft.description.trim()}
              onClick={() =>
                void reportIncident({
                  jobId: draft.jobId || null,
                  kind: draft.kind,
                  severity: draft.severity,
                  description: draft.description.trim(),
                })
                  .then(() => setDraft({ jobId: "", kind: "damage", severity: "low", description: "" }))
                  .then(load)
                  .catch((e: unknown) => setError(e instanceof Error ? e.message : t("common.error")))
              }
            >
              {t("incidents.submit")}
            </Button>
          </div>
        </Card>

        {incidents === null ? (
          <LoadingState label={t("common.loading")} />
        ) : incidents.length === 0 ? (
          <EmptyState title={t("incidents.empty")} />
        ) : (
          <TableShell
            caption={t("incidents.caption")}
            head={
              <tr>
                <Th>{t("incidents.date")}</Th>
                <Th>{t("incidents.job")}</Th>
                <Th>{t("incidents.kind")}</Th>
                <Th>{t("incidents.severityShort")}</Th>
                <Th>{t("incidents.description")}</Th>
                <Th>{t("common.status")}</Th>
              </tr>
            }
          >
            {incidents.map((r) => (
              <Tr key={r.id}>
                <Td>{formatDate(r.created_at, lang, { dateStyle: "medium" })}</Td>
                <Td className="data-mono">{r.job_id ? jobRef.get(r.job_id) ?? t("common.none") : t("common.none")}</Td>
                <Td>{t(`incidentKind.${r.kind}`, { defaultValue: r.kind })}</Td>
                <Td>{t(`incidentSeverity.${r.severity}`, { defaultValue: r.severity })}</Td>
                <Td className="max-w-md whitespace-pre-wrap">{r.description}</Td>
                <Td>
                  <Select
                    value={r.status}
                    onChange={(e) => void updateIncident(r.id, { status: e.target.value }).then(load)}
                  >
                    {INCIDENT_STATUSES.map((st) => (
                      <option key={st} value={st}>
                        {t(`incidentStatus.${st}`)}
                      </option>
                    ))}
                  </Select>
                </Td>
              </Tr>
            ))}
          </TableShell>
        )}

        {reviews.length > 0 ? (
          <TableShell
            caption={t("incidents.reviewsCaption")}
            head={
              <tr>
                <Th>{t("incidents.job")}</Th>
                <Th>{t("incidents.requested")}</Th>
                <Th>{t("incidents.rating")}</Th>
                <Th>{t("incidents.comment")}</Th>
              </tr>
            }
          >
            {reviews.map((r) => (
              <Tr key={r.id}>
                <Td className="data-mono">{jobRef.get(r.job_id) ?? "—"}</Td>
                <Td>{formatDate(r.requested_at, lang, { dateStyle: "medium" })}</Td>
                <Td>{r.rating ? `${r.rating}/5` : t("incidents.ratingOpen")}</Td>
                <Td className="max-w-md whitespace-pre-wrap">{r.comment || t("common.none")}</Td>
              </Tr>
            ))}
          </TableShell>
        ) : null}
      </div>
  );
}
