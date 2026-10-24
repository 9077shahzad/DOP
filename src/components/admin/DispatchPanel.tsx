/**
 * /admin/disposition — Dispositionsboard und Einsatzkalender.
 *
 * Every open job appears here exactly once. A job without a crew is the
 * dispatcher's work list; assigning a crew, a vehicle and a start time is the
 * single write this screen performs. The calendar is the same data grouped by
 * day, so a double booking is visible instead of implied.
 */
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { DispatchAssistant } from "@/components/admin/DispatchAssistant";
import { DispatchCalendar } from "@/components/admin/DispatchCalendar";
import { fetchDispatchResources, type DispatchResources } from "@/lib/dispatch-assist";
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
  TableShell,
  Td,
  Th,
  Tr,
} from "@/components/system";
import { formatDate, formatDateTime } from "@/i18n/format";
import { useActiveLang } from "@/lib/admin-i18n";
import { fetchJobs, type JobExec } from "@/lib/jobs-exec";
import { fetchBusyResources, type BusyResource } from "@/lib/bookings";
import { assignJobResources, fetchTeams, fetchVehicles, type InternalTeam, type Vehicle } from "@/lib/operations";


function dayKey(iso: string | null): string {
  if (!iso) return "unplanned";
  return iso.slice(0, 10);
}

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  return iso.slice(0, 16);
}

export function DispatchPanel() {
  const { t } = useTranslation("ops");
  const lang = useActiveLang();
  const [jobs, setJobs] = useState<JobExec[] | null>(null);
  const [teams, setTeams] = useState<InternalTeam[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [view, setView] = useState<"board" | "kalender">("board");
  const [draft, setDraft] = useState<Record<string, { team: string; vehicle: string; start: string; end: string }>>({});
  const [busy, setBusy] = useState<Record<string, BusyResource[]>>({});
  const [resources, setResources] = useState<DispatchResources | null>(null);

  async function load() {
    try {
      const [j, tm, v, res] = await Promise.all([
        fetchJobs("open"),
        fetchTeams(),
        fetchVehicles(false),
        fetchDispatchResources().catch(() => null),
      ]);
      setJobs(j);
      setTeams(tm);
      setVehicles(v);
      setResources(res);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("common.loadFailed"));
    }
  }
  useEffect(() => {
    void load();
  }, []);

  const unassigned = useMemo(() => (jobs ?? []).filter((j) => !j.team_id), [jobs]);
  const byDay = useMemo(() => {
    const map = new Map<string, JobExec[]>();
    for (const j of jobs ?? []) {
      const key = dayKey(j.scheduled_start);
      map.set(key, [...(map.get(key) ?? []), j]);
    }
    return [...map.entries()].sort(([a], [b]) => (a === "unplanned" ? 1 : b === "unplanned" ? -1 : a.localeCompare(b)));
  }, [jobs]);

  function current(job: JobExec) {
    return (
      draft[job.id] ?? {
        team: job.team_id ?? "",
        vehicle: job.vehicle_id ?? "",
        start: toLocalInput(job.scheduled_start),
        end: toLocalInput(job.scheduled_end),
      }
    );
  }

  /** Turns the database's refusal codes into a sentence in the reader's language. */
  function assignErrorMessage(e: unknown, translate: typeof t): string {
    const raw = e instanceof Error ? e.message : String(e ?? "");
    const codes = [
      "not_authorised",
      "job_closed",
      "team_without_members",
      "vehicle_inactive",
      "vehicle_insurance_expired",
      "vehicle_inspection_due",
      "vehicle_service_due",
      "overlap",
    ] as const;
    const hit = codes.find((code) => raw.includes(code));
    return hit ? translate(`dispatch.errors.${hit}`) : translate("dispatch.assignFailed");
  }

  /** Shows which crews and vehicles are already booked in the chosen window. */
  async function checkBusy(job: JobExec) {
    const d = current(job);
    if (!d.start) return;
    const start = new Date(d.start).toISOString();
    const end = d.end ? new Date(d.end).toISOString() : null;
    setBusy({ ...busy, [job.id]: await fetchBusyResources(start, end, job.id) });
  }

  async function assign(job: JobExec) {
    const d = current(job);
    setSaving(job.id);
    try {
      await assignJobResources(
        job.id,
        d.team || null,
        d.vehicle || null,
        d.start ? new Date(d.start).toISOString() : null,
        d.end ? new Date(d.end).toISOString() : null,
      );
      await load();
      setError(null);
    } catch (e) {
      setError(assignErrorMessage(e, t));
    } finally {
      setSaving(null);
    }
  }

  const teamName = (id: string | null) => teams.find((x) => x.id === id)?.name ?? "—";
  const vehicleName = (id: string | null) => {
    const v = vehicles.find((x) => x.id === id);
    return v ? `${v.plate}${v.label ? ` (${v.label})` : ""}` : "—";
  };

  return (
      <div className="space-y-6">
        <CardHeader
          eyebrow={t("common.eyebrow")}
          title={t("dispatch.title")}
          action={
            <div className="flex gap-2">
              <Button size="sm" variant={view === "board" ? "primary" : "outline"} onClick={() => setView("board")}>
                {t("dispatch.board")}
              </Button>
              <Button size="sm" variant={view === "kalender" ? "primary" : "outline"} onClick={() => setView("kalender")}>
                {t("dispatch.calendar")}
              </Button>
            </div>
          }
        />

        {error ? <ErrorState message={error} /> : null}

        {teams.length === 0 || vehicles.length === 0 ? (
          <Card>
            <p className="type-small text-ink-2">
              {teams.length === 0 ? t("dispatch.noTeams") : ""}
              {vehicles.length === 0 ? t("dispatch.noVehicles") : ""}
              {t("dispatch.configRequired")}
            </p>
          </Card>
        ) : null}

        {jobs === null ? (
          <LoadingState label={t("common.loading")} />
        ) : view === "board" ? (
          <>
            {resources ? (
              <DispatchAssistant
                jobs={jobs ?? []}
                resources={resources}
                onAssign={async (jobId, teamId, vehicleId) => {
                  const job = (jobs ?? []).find((j) => j.id === jobId);
                  await assignJobResources(
                    jobId,
                    teamId,
                    vehicleId,
                    job?.scheduled_start ?? null,
                    job?.scheduled_end ?? null,
                  );
                  await load();
                }}
              />
            ) : null}
            <Card>
              <CardHeader title={t("dispatch.withoutCrew", { count: unassigned.length })} />
              {unassigned.length === 0 ? (
                <p className="type-small mt-3 text-soft">{t("dispatch.allAssigned")}</p>
              ) : (
                <ul className="mt-3 space-y-1 text-sm">
                  {unassigned.map((j) => (
                    <li key={j.id} className="data-mono">
                      {j.reference} · {j.scheduled_start ? formatDateTime(j.scheduled_start, lang) : t("dispatch.noDate")}
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <TableShell
              caption={t("dispatch.caption")}
              head={
                <tr>
                  <Th>{t("dispatch.job")}</Th>
                  <Th>{t("common.status")}</Th>
                  <Th>{t("dispatch.start")}</Th>
                  <Th>{t("dispatch.end")}</Th>
                  <Th>{t("dispatch.crew")}</Th>
                  <Th>{t("dispatch.vehicle")}</Th>
                  <Th>{t("dispatch.action")}</Th>
                </tr>
              }
            >
              {(jobs ?? []).map((job) => {
                const d = current(job);
                return (
                  <Tr key={job.id}>
                    <Td className="data-mono">{job.reference}</Td>
                    <Td>{t(`status.${job.status}`)}</Td>
                    <Td>
                      <Field label={t("dispatch.start")}>
                        {(p) => (
                          <Input
                            {...p}
                            type="datetime-local"
                            value={d.start}
                            onChange={(e) => setDraft({ ...draft, [job.id]: { ...d, start: e.target.value } })}
                            onBlur={() => void checkBusy(job)}
                          />
                        )}
                      </Field>
                    </Td>
                    <Td>
                      <Field label={t("dispatch.end")}>
                        {(p) => (
                          <Input
                            {...p}
                            type="datetime-local"
                            value={d.end}
                            onChange={(e) => setDraft({ ...draft, [job.id]: { ...d, end: e.target.value } })}
                            onBlur={() => void checkBusy(job)}
                          />
                        )}
                      </Field>
                    </Td>
                    <Td>
                      <Field label={t("dispatch.crew")}>
                        {(p) => (
                          <Select
                            {...p}
                            value={d.team}
                            onChange={(e) => setDraft({ ...draft, [job.id]: { ...d, team: e.target.value } })}
                          >
                            <option value="">{t("dispatch.noneF")}</option>
                            {teams.map((team) => (
                              <option key={team.id} value={team.id}>
                                {team.name}
                                {(busy[job.id] ?? []).some((b) => b.kind === "team" && b.id === team.id)
                                  ? t("dispatch.busy")
                                  : ""}
                              </option>
                            ))}
                          </Select>
                        )}
                      </Field>
                    </Td>
                    <Td>
                      <Field label={t("dispatch.vehicle")}>
                        {(p) => (
                          <Select
                            {...p}
                            value={d.vehicle}
                            onChange={(e) => setDraft({ ...draft, [job.id]: { ...d, vehicle: e.target.value } })}
                          >
                            <option value="">{t("dispatch.noneN")}</option>
                            {vehicles.map((v) => (
                              <option key={v.id} value={v.id}>
                                {v.plate} {v.label}
                                {(busy[job.id] ?? []).some((b) => b.kind === "vehicle" && b.id === v.id)
                                  ? t("dispatch.busy")
                                  : ""}
                              </option>
                            ))}
                          </Select>
                        )}
                      </Field>
                    </Td>
                    <Td>
                      <Button size="sm" variant="primary" disabled={saving === job.id} onClick={() => void assign(job)}>
                        {saving === job.id ? t("dispatch.assigning") : t("dispatch.assign")}
                      </Button>
                    </Td>
                  </Tr>
                );
              })}
            </TableShell>
          </>
        ) : byDay.length === 0 ? (
          <EmptyState title={t("dispatch.emptyOpen")} />
        ) : (
          <DispatchCalendar jobs={jobs ?? []} teamName={teamName} vehicleName={vehicleName} />
        )}
      </div>
  );
}
