/**
 * /admin/ai-assist — the review desk for AI Assist.
 *
 * Everything the model produces lands here as a proposal with its source, its
 * model and its reviewer. Nothing on this screen changes a price, a date or a
 * record; a person accepts or rejects, and that decision is written down.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { Lines } from "@/components/ai/VoiceNotePanel";
import {
  Button,
  Card,
  CardHeader,
  Chip,
  EmptyState,
  ErrorState,
  Field,
  LoadingState,
  NoticeState,
  Select,
} from "@/components/system";
import i18n from "@/i18n/config";
import { formatDateTime } from "@/i18n/format";
import type { Lang } from "@/i18n/config";
import { useActiveLang } from "@/lib/admin-i18n";
import { aiCrewBriefing, aiLeadTriage, aiPhotoInventory } from "@/lib/ai.functions";
import type { AiUnavailable } from "@/lib/ai/features";
import { fetchFlags, fetchSuggestions, reviewSuggestion, type AiFlag, type AiSuggestion } from "@/lib/ai";
import { fetchJobs, type JobExec } from "@/lib/jobs-exec";
import { EMPTY_FILTERS, fetchLeads, type LeadListItem } from "@/lib/leads-admin";
import { langOf, privateHead } from "@/lib/seo";

export const Route = createFileRoute("/admin/ai-assist")({
  ssr: false,
  head: () => privateHead(langOf(i18n.language), "admin"),
  component: AiAssistPage,
});

function AiAssistPage() {
  const { t } = useTranslation("ai");
  const lang = useActiveLang();
  const [flags, setFlags] = useState<AiFlag[] | null>(null);
  const [leads, setLeads] = useState<LeadListItem[]>([]);
  const [jobs, setJobs] = useState<JobExec[]>([]);
  const [jobId, setJobId] = useState("");
  const [suggestions, setSuggestions] = useState<AiSuggestion[] | null>(null);
  const [leadId, setLeadId] = useState("");
  const [busy, setBusy] = useState<"" | "triage" | "photos" | "briefing">("");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const [flagRows, leadRows, jobRows, rows] = await Promise.all([
      fetchFlags(),
      fetchLeads(EMPTY_FILTERS),
      fetchJobs("open"),
      fetchSuggestions({ limit: 60 }),
    ]);
    setFlags(flagRows);
    setLeads(leadRows.slice(0, 100));
    setJobs(jobRows.slice(0, 100));
    setSuggestions(rows);
  }

  useEffect(() => {
    void load().catch((reason) => setError(String(reason)));
  }, []);

  const enabled = useMemo(
    () => new Set((flags ?? []).filter((flag) => flag.enabled).map((flag) => flag.feature)),
    [flags],
  );

  async function run(kind: "triage" | "photos") {
    if (!leadId) return;
    setBusy(kind);
    setNotice(null);
    try {
      const result =
        kind === "triage"
          ? await aiLeadTriage({ data: { leadId } })
          : await aiPhotoInventory({ data: { leadId } });
      if (!result.ok) setNotice(t(`unavailable.${result.reason as AiUnavailable}`));
      await load();
    } catch {
      setNotice(t("common.error"));
    } finally {
      setBusy("");
    }
  }

  async function runBriefing() {
    if (!jobId) return;
    setBusy("briefing");
    setNotice(null);
    try {
      const result = await aiCrewBriefing({ data: { jobId } });
      if (!result.ok) setNotice(t(`unavailable.${result.reason as AiUnavailable}`));
      await load();
    } catch {
      setNotice(t("common.error"));
    } finally {
      setBusy("");
    }
  }

  async function review(id: string, status: "accepted" | "rejected") {
    await reviewSuggestion({ id, status });
    await load();
  }

  return (
      <div className="space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold text-ink">{t("title")}</h1>
          <p className="max-w-3xl text-sm text-soft">{t("intro")}</p>
          <Link to="/admin/ai-assist/einstellungen" className="label-mono text-brand underline">
            {t("common.settings")}
          </Link>
        </header>

        {error ? <ErrorState message={error} /> : null}

        <Card>
          <CardHeader title={t("triage.title")} />
          <div className="space-y-3 p-4">
            <Field label={t("triage.lead")}>
              {(props) => (
              <Select {...props} value={leadId} onChange={(event) => setLeadId(event.target.value)}>
                <option value="">—</option>
                {leads.map((lead) => (
                  <option key={lead.id} value={lead.id}>
                    {(lead.reference ?? lead.id.slice(0, 8)) + " · " + (lead.customer_name ?? "")}
                  </option>
                ))}
              </Select>
              )}
            </Field>
            <div className="flex flex-wrap gap-2">
              <Button disabled={!leadId || busy !== "" || !enabled.has("lead_triage")} onClick={() => void run("triage")}>
                {busy === "triage" ? t("triage.running") : t("triage.run")}
              </Button>
              <Button
                variant="outline"
                disabled={!leadId || busy !== "" || !enabled.has("photo_inventory")}
                onClick={() => void run("photos")}
              >
                {busy === "photos" ? t("photo.running") : t("photo.run")}
              </Button>
            </div>
            <p className="text-xs text-soft">{t("photo.pilot")}</p>
            <p className="text-xs text-soft">{t("photo.consentHint")}</p>
            {notice ? <NoticeState message={notice} /> : null}
          </div>
        </Card>

        <Card>
          <CardHeader title={t("briefing.title")} />
          <div className="space-y-3 p-4">
            <Field label={t("briefing.job")}>
              {(props) => (
                <Select {...props} value={jobId} onChange={(event) => setJobId(event.target.value)}>
                  <option value="">—</option>
                  {jobs.map((job) => (
                    <option key={job.id} value={job.id}>
                      {(job.reference ?? job.id.slice(0, 8)) + " · " + (job.customer_name ?? "")}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Button
              disabled={!jobId || busy !== "" || !enabled.has("crew_briefing")}
              onClick={() => void runBriefing()}
            >
              {busy === "briefing" ? t("briefing.running") : t("briefing.run")}
            </Button>
            <p className="text-xs text-soft">{t("briefing.hint")}</p>
          </div>
        </Card>

        <Card>
          <CardHeader title={t("inbox.title")} />
          <div className="space-y-3 p-4">
            {suggestions === null ? (
              <LoadingState label={t("common.loading")} />
            ) : suggestions.length === 0 ? (
              <EmptyState title={t("inbox.empty")} />
            ) : (
              suggestions.map((row) => (
                <SuggestionCard key={row.id} row={row} lang={lang} onReview={review} />
              ))
            )}
          </div>
        </Card>
      </div>
  );
}

function SuggestionCard({
  row,
  lang,
  onReview,
}: {
  row: AiSuggestion;
  lang: Lang;
  onReview: (id: string, status: "accepted" | "rejected") => Promise<void>;
}) {
  const { t } = useTranslation("ai");
  const payload = (row.payload ?? {}) as Record<string, unknown>;
  const strings = (key: string): string[] => {
    const value = payload[key];
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
  };
  const text = (key: string): string => (typeof payload[key] === "string" ? (payload[key] as string) : "");

  return (
    <div className="rounded-xl border border-line p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Chip>{t(`features.${row.feature}`)}</Chip>
          <Chip>{t(`inbox.status.${row.status}`)}</Chip>
          <span className="label-mono text-soft">{formatDateTime(row.created_at, lang)}</span>
        </div>
        {row.status === "proposed" ? (
          <div className="flex gap-2">
            <Button size="sm" onClick={() => void onReview(row.id, "accepted")}>
              {t("inbox.accept")}
            </Button>
            <Button size="sm" variant="outline" onClick={() => void onReview(row.id, "rejected")}>
              {t("inbox.reject")}
            </Button>
          </div>
        ) : null}
      </div>

      <p className="mt-3 text-sm text-ink">{text("summary")}</p>
      <div className="mt-2 space-y-2 text-sm text-ink">
        <Lines title={t("triage.requirements")} items={strings("requirements")} />
        <Lines title={t("triage.flags")} items={strings("complexity_flags")} />
        <Lines title={t("triage.missing")} items={strings("missing_information")} />
        <Lines title={t("photo.assumptions")} items={strings("assumptions")} />
        <Lines title={t("photo.questions")} items={strings("questions")} />
        <Lines title={t("voice.work")} items={strings("work_completed")} />
        <Lines title={t("voice.extra")} items={strings("additional_work")} />
        <Lines title={t("voice.followUp")} items={strings("follow_up")} />
        <Lines title={t("briefing.access")} items={strings("access_notes")} />
        <Lines title={t("briefing.equipment")} items={strings("equipment")} />
        <Lines title={t("briefing.risks")} items={strings("risks")} />
        <Lines title={t("briefing.sequence")} items={strings("sequence")} />
        <Lines title={t("briefing.customer")} items={strings("customer_notes")} />
        <Lines title={t("briefing.questions")} items={strings("open_questions")} />
      </div>
      {text("next_action") ? (
        <p className="mt-2 text-sm text-ink">
          <span className="label-mono text-soft">{t("triage.next")}: </span>
          {text("next_action")}
        </p>
      ) : null}
      {text("draft_reply") ? (
        <details className="mt-2">
          <summary className="label-mono cursor-pointer text-soft">{t("triage.reply")}</summary>
          <p className="mt-1 whitespace-pre-wrap text-sm text-soft">{text("draft_reply")}</p>
        </details>
      ) : null}
      <p className="mt-3 text-xs text-soft">
        {row.model} · {row.input_summary}
      </p>
      {row.reviewed_at ? (
        <p className="text-xs text-soft">
          {t("inbox.reviewed")}: {formatDateTime(row.reviewed_at, lang)}
        </p>
      ) : null}
    </div>
  );
}
