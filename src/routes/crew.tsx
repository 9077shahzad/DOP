/**
 * /crew — the crew app.
 *
 * Phone-first and installable: one screen per job, 48px controls, and only the
 * actions a crew actually performs on site — status, time, photos, materials
 * note, incident, and the customer's signature. Row level security decides
 * which jobs appear: a member of the assigned crew, nobody else.
 */
import { ForgotPassword } from "@/components/auth/ForgotPassword";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useTranslation } from "react-i18next";

import { VoiceNotePanel } from "@/components/ai/VoiceNotePanel";
import { Logo } from "@/components/brand/Logo";
import {
  Button,
  Card,
  CardHeader,
  EmptyState,
  ErrorState,
  Field,
  Input,
  LoadingState,
  Select,
  Textarea,
} from "@/components/system";
import { LanguageSwitcher } from "@/components/shell/LanguageSwitcher";
import i18n from "@/i18n/config";
import { formatDate, formatDateTime } from "@/i18n/format";
import { useActiveLang } from "@/lib/admin-i18n";
import { supabase } from "@/integrations/supabase/client";
import {
  JOB_STATUS_LABEL,
  NEXT_STATUS,
  fetchJobPhotos,
  fetchJobs,
  recordConfirmation,
  setJobStatus,
  uploadJobPhoto,
  type JobExec,
  type JobPhoto,
  type PhotoPhase,
} from "@/lib/jobs-exec";
import {
  INCIDENT_KINDS,
  INCIDENT_SEVERITIES,
  fetchMyEmployee,
  fetchTimeEntries,
  reportIncident,
  startTimeEntry,
  stopTimeEntry,
  uploadSignature,
  type Employee,
  type TimeEntry,
} from "@/lib/operations";

export const Route = createFileRoute("/crew")({
  ssr: false,
  head: () => ({
    meta: [
      { title: i18n.t("ops:crew.title") },
      { name: "description", content: i18n.t("ops:crew.metaDescription") },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: i18n.t("ops:crew.title") },
      { property: "og:description", content: i18n.t("ops:crew.ogDescription") },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CrewApp,
});

type Gate = "loading" | "signed-out" | "no-employee" | "ok";

function CrewApp() {
  const { t } = useTranslation("ops");
  const lang = useActiveLang();
  const [gate, setGate] = useState<Gate>("loading");
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [jobs, setJobs] = useState<JobExec[]>([]);
  const [openJob, setOpenJob] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function evaluate() {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      setGate("signed-out");
      return;
    }
    const me = await fetchMyEmployee();
    if (!me) {
      setGate("no-employee");
      return;
    }
    setEmployee(me);
    setGate("ok");
    try {
      setJobs(await fetchJobs("open"));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("common.loadFailed"));
    }
  }

  useEffect(() => {
    void evaluate();
    const { data: sub } = supabase.auth.onAuthStateChange(() => void evaluate());
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <div className="min-h-screen bg-canvas">
      <header className="flex items-center justify-between bg-ink px-4 py-4">
        <Logo tone="light" />
        <div className="flex items-center gap-3">
          <LanguageSwitcher current={lang} tone="dark" onSelect={(next) => void i18n.changeLanguage(next)} />
          {gate === "ok" ? (
            <Button size="sm" variant="outline" onClick={() => void supabase.auth.signOut()}>
              {t("crew.signOut")}
            </Button>
          ) : null}
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-4 py-6">
        {gate === "loading" ? <LoadingState label={t("common.loading")} /> : null}
        {gate === "signed-out" ? <CrewSignIn /> : null}
        {gate === "no-employee" ? (
          <EmptyState
            title={t("crew.noProfile")}
            body={t("crew.noProfileBody")}
          />
        ) : null}
        {gate === "ok" ? (
          <div className="space-y-4">
            <p className="label-mono text-soft">{t("crew.signedInAs", { name: employee?.full_name ?? "" })}</p>
            {error ? <ErrorState message={error} /> : null}
            {jobs.length === 0 ? (
              <EmptyState title={t("crew.noJobs")} body={t("crew.noJobsBody")} />
            ) : (
              jobs.map((job) =>
                openJob === job.id ? (
                  <JobCard
                    key={job.id}
                    job={job}
                    employee={employee!}
                    onClose={() => setOpenJob(null)}
                    onChanged={() => void evaluate()}
                  />
                ) : (
                  <Card key={job.id}>
                    <CardHeader
                      eyebrow={job.scheduled_start ? formatDateTime(job.scheduled_start, lang) : t("crew.noDate")}
                      title={job.reference}
                      action={
                        <Button size="sm" variant="primary" onClick={() => setOpenJob(job.id)}>
                          {t("crew.open")}
                        </Button>
                      }
                    />
                    <p className="type-small mt-2 text-soft">{t("crew.statusLine", { status: t(`status.${job.status}`, { defaultValue: JOB_STATUS_LABEL[job.status] }) })}</p>
                  </Card>
                ),
              )
            )}
          </div>
        ) : null}
      </main>
    </div>
  );
}

function CrewSignIn() {
  const { t } = useTranslation("ops");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <Card>
      <CardHeader title={t("crew.signInTitle")} />
      {error ? <ErrorState className="mt-4" message={error} /> : null}
      <form
        className="mt-4 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          setBusy(true);
          void supabase.auth
            .signInWithPassword({ email, password })
            .then(({ error: err }) => setError(err ? t("crew.signInFailed") : null))
            .finally(() => setBusy(false));
        }}
      >
        <Field label={t("crew.email")}>
          {(p) => <Input {...p} touch type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />}
        </Field>
        <Field label={t("crew.password")}>
          {(p) => (
            <Input
              {...p}
              touch
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          )}
        </Field>
        <Button type="submit" variant="primary" block disabled={busy}>
          {busy ? t("crew.signingIn") : t("crew.signIn")}
        </Button>
      </form>
      <ForgotPassword />
    </Card>
  );
}

/* ---------------------------------------------------------------- job card */

const PHASES: PhotoPhase[] = ["before", "during", "after", "damage"];

function JobCard({
  job,
  employee,
  onClose,
  onChanged,
}: {
  job: JobExec;
  employee: Employee;
  onClose: () => void;
  onChanged: () => void;
}) {
  const { t } = useTranslation("ops");
  const lang = useActiveLang();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photos, setPhotos] = useState<JobPhoto[]>([]);
  const [phase, setPhase] = useState<PhotoPhase>("before");
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [signName, setSignName] = useState("");
  const [incident, setIncident] = useState({ kind: "damage", severity: "low", description: "" });
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);

  async function reload() {
    setPhotos(await fetchJobPhotos(job.id));
    setEntries(await fetchTimeEntries(job.id, employee.id));
  }
  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job.id]);

  const running = entries.find((e) => e.ended_at === null) ?? null;
  const next = NEXT_STATUS[job.status] ?? [];

  async function guard(action: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      await reload();
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("crew.actionFailed"));
    } finally {
      setBusy(false);
    }
  }

  function point(e: ReactPointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: ((e.clientX - rect.left) / rect.width) * canvas.width, y: ((e.clientY - rect.top) / rect.height) * canvas.height };
  }

  return (
    <Card>
      <CardHeader
        eyebrow={t(`status.${job.status}`, { defaultValue: JOB_STATUS_LABEL[job.status] })}
        title={job.reference}
        action={
          <Button size="sm" variant="outline" onClick={onClose}>
            {t("crew.close")}
          </Button>
        }
      />
      {error ? <ErrorState className="mt-4" message={error} /> : null}

      <section className="mt-5">
        <h3 className="label-mono text-primary">{t("crew.status")}</h3>
        <div className="mt-2 flex flex-wrap gap-2">
          {next.length === 0 ? (
            <p className="type-small text-soft">{t("crew.noNextSteps")}</p>
          ) : (
            next.map((s) => (
              <Button key={s} size="md" disabled={busy} onClick={() => void guard(() => setJobStatus(job.id, s))}>
                {t(`status.${s}`, { defaultValue: JOB_STATUS_LABEL[s] })}
              </Button>
            ))
          )}
        </div>
        <p className="type-small mt-2 text-soft">
          {t("crew.completionHint")}
        </p>
      </section>

      <section className="mt-6">
        <h3 className="label-mono text-primary">{t("crew.time")}</h3>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          {running ? (
            <>
              <p className="type-small text-ink-2">{t("crew.runningSince", { time: formatDate(running.started_at, lang, { timeStyle: "short" }) })}</p>
              <Button size="md" disabled={busy} onClick={() => void guard(() => stopTimeEntry(running.id))}>
                {t("crew.stop")}
              </Button>
            </>
          ) : (
            <Button size="md" disabled={busy} onClick={() => void guard(() => startTimeEntry(employee.id, job.id))}>
              {t("crew.start")}
            </Button>
          )}
        </div>
        {entries.filter((e) => e.ended_at).length > 0 ? (
          <ul className="mt-3 space-y-1 text-sm text-ink-2">
            {entries
              .filter((e) => e.ended_at)
              .map((e) => (
                <li key={e.id}>
                  {formatDateTime(e.started_at, lang)} · {t("crew.minutes", { count: e.minutes ?? 0 })}
                </li>
              ))}
          </ul>
        ) : null}
      </section>

      <section className="mt-6">
        <h3 className="label-mono text-primary">{t("crew.photos")}</h3>
        <div className="mt-2 flex flex-wrap items-end gap-3">
          <Field label={t("crew.phase")}>
            {(p) => (
              <Select {...p} touch value={phase} onChange={(e) => setPhase(e.target.value as PhotoPhase)}>
                {PHASES.map((ph) => (
                  <option key={ph} value={ph}>
                    {t(`photoPhase.${ph}`)}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label={t("crew.takePhoto")}>
            {(p) => (
              <Input
                {...p}
                touch
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void guard(() => uploadJobPhoto(job.id, phase, file));
                  e.target.value = "";
                }}
              />
            )}
          </Field>
        </div>
        <p className="type-small mt-2 text-soft">{t("crew.photoCount", { count: photos.length })}</p>
      </section>

      <section className="mt-6">
        <h3 className="label-mono text-primary">{t("crew.reportIncident")}</h3>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          <Field label={t("crew.kind")}>
            {(p) => (
              <Select {...p} touch value={incident.kind} onChange={(e) => setIncident({ ...incident, kind: e.target.value })}>
                {INCIDENT_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {t(`incidentKind.${k}`)}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label={t("crew.severity")}>
            {(p) => (
              <Select
                {...p}
                touch
                value={incident.severity}
                onChange={(e) => setIncident({ ...incident, severity: e.target.value })}
              >
                {INCIDENT_SEVERITIES.map((sv) => (
                  <option key={sv} value={sv}>
                    {t(`incidentSeverity.${sv}`)}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label={t("crew.description")} className="sm:col-span-2">
            {(p) => (
              <Textarea
                {...p}
                touch
                value={incident.description}
                onChange={(e) => setIncident({ ...incident, description: e.target.value })}
              />
            )}
          </Field>
        </div>
        <Button
          className="mt-3"
          size="md"
          disabled={busy || !incident.description.trim()}
          onClick={() =>
            void guard(async () => {
              await reportIncident({
                jobId: job.id,
                kind: incident.kind,
                severity: incident.severity,
                description: incident.description.trim(),
              });
              setIncident({ kind: "damage", severity: "low", description: "" });
            })
          }
        >
          {t("crew.sendIncident")}
        </Button>
      </section>

      <section className="mt-6">
        <VoiceNotePanel jobId={job.id} spokenLanguage={lang} />
      </section>

      <section className="mt-6">
        <h3 className="label-mono text-primary">{t("crew.signature")}</h3>
        {job.signed_at ? (
          <p className="type-small mt-2 text-ink-2">
            {t("crew.signedBy", { name: job.signed_by_name ?? "", date: formatDateTime(job.signed_at, lang) })}
          </p>
        ) : (
          <>
            <canvas
              ref={canvasRef}
              width={600}
              height={200}
              aria-label={t("crew.signatureField")}
              className="mt-2 w-full touch-none rounded-md border border-line bg-surface"
              onPointerDown={(e) => {
                drawing.current = true;
                const ctx = canvasRef.current!.getContext("2d")!;
                const p = point(e);
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
              }}
              onPointerMove={(e) => {
                if (!drawing.current) return;
                const ctx = canvasRef.current!.getContext("2d")!;
                const p = point(e);
                ctx.lineWidth = 2;
                ctx.lineCap = "round";
                ctx.strokeStyle = "#19457C";
                ctx.lineTo(p.x, p.y);
                ctx.stroke();
              }}
              onPointerUp={() => {
                drawing.current = false;
              }}
              onPointerLeave={() => {
                drawing.current = false;
              }}
            />
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Field label={t("crew.customerName")}>
                {(p) => <Input {...p} touch value={signName} onChange={(e) => setSignName(e.target.value)} />}
              </Field>
              <div className="flex items-end gap-2">
                <Button
                  size="md"
                  variant="outline"
                  onClick={() => {
                    const c = canvasRef.current;
                    if (c) c.getContext("2d")?.clearRect(0, 0, c.width, c.height);
                  }}
                >
                  {t("crew.clear")}
                </Button>
                <Button
                  size="md"
                  variant="primary"
                  disabled={busy || !signName.trim()}
                  onClick={() =>
                    void guard(async () => {
                      const dataUrl = canvasRef.current!.toDataURL("image/png");
                      const path = await uploadSignature(job.id, dataUrl);
                      await recordConfirmation(job.id, "signature", signName.trim(), path);
                    })
                  }
                >
                  {t("crew.saveSignature")}
                </Button>
              </div>
            </div>
          </>
        )}
      </section>
    </Card>
  );
}
