/**
 * Dispatch assistant panel.
 *
 * Shows a ranked proposal for one job — crew and vehicle, each with the reason
 * behind the ranking — and hands it to the dispatcher. The proposal writes
 * nothing: only the dispatcher's own approval assigns the job, and the database
 * rules on assign_job_resources still decide.
 */
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button, Card, CardHeader, Select } from "@/components/system";
import type { JobExec } from "@/lib/jobs-exec";
import {
  logDispatchDecision,
  recommendDispatch,
  type DispatchRecommendation,
  type DispatchReason,
  type DispatchResources,
} from "@/lib/dispatch-assist";

type Props = {
  jobs: JobExec[];
  resources: DispatchResources;
  onAssign: (jobId: string, teamId: string, vehicleId: string) => Promise<void>;
};

function Reasons({ reasons }: { reasons: DispatchReason[] }) {
  const { t } = useTranslation("ops");
  if (reasons.length === 0) return null;
  return (
    <ul className="type-small mt-1 space-y-0.5 text-soft">
      {reasons.map((r, i) => (
        <li key={`${r.key}-${i}`}>· {t(`dispatch.assist.reason.${r.key}`, r.values ?? {})}</li>
      ))}
    </ul>
  );
}

export function DispatchAssistant({ jobs, resources, onAssign }: Props) {
  const { t } = useTranslation("ops");
  const open = useMemo(() => jobs.filter((j) => j.status !== "cancelled" && j.status !== "completed"), [jobs]);
  const [jobId, setJobId] = useState<string>(open[0]?.id ?? "");
  const [result, setResult] = useState<DispatchRecommendation | null>(null);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const job = open.find((j) => j.id === jobId) ?? null;
  const bestCrew = result?.crews.find((c) => !c.blocked) ?? null;
  const bestVehicle = result?.vehicles.find((v) => !v.blocked) ?? null;

  async function run() {
    if (!job) return;
    setLoading(true);
    setError(null);
    try {
      setResult(await recommendDispatch(job, jobs, resources));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  async function approve() {
    if (!job || !result || !bestCrew || !bestVehicle) return;
    setApplying(true);
    setError(null);
    try {
      await onAssign(job.id, bestCrew.teamId, bestVehicle.vehicleId);
      await logDispatchDecision({
        jobId: job.id,
        teamId: bestCrew.teamId,
        vehicleId: bestVehicle.vehicleId,
        accepted: true,
        recommendation: result,
      }).catch(() => undefined);
      setResult(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setApplying(false);
    }
  }

  return (
    <Card>
      <CardHeader title={t("dispatch.assist.title")} eyebrow={t("dispatch.assist.eyebrow")} />
      <p className="type-small mt-2 text-ink-2">{t("dispatch.assist.intro")}</p>

      <div className="mt-3 flex flex-wrap items-end gap-2">
        <Select
          aria-label={t("dispatch.job")}
          value={jobId}
          onChange={(e) => {
            setJobId(e.target.value);
            setResult(null);
          }}
        >
          {open.length === 0 ? <option value="">{t("dispatch.emptyOpen")}</option> : null}
          {open.map((j) => (
            <option key={j.id} value={j.id}>
              {j.reference} · {j.scheduled_start ? j.scheduled_start.slice(0, 16).replace("T", " ") : t("dispatch.noDate")}
            </option>
          ))}
        </Select>
        <Button size="sm" variant="outline" disabled={!job || loading} onClick={() => void run()}>
          {loading ? t("dispatch.assist.calculating") : t("dispatch.assist.calculate")}
        </Button>
      </div>

      {error ? <p className="type-small mt-3 text-danger">{error}</p> : null}

      {result ? (
        <div className="mt-4 space-y-4">
          <p className="type-small text-ink-2">
            {t("dispatch.assist.context", {
              skills: result.requiredSkills.length > 0 ? result.requiredSkills.join(", ") : t("dispatch.assist.noSkills"),
              volume: result.volumeM3 == null ? t("dispatch.assist.unknown") : `${result.volumeM3} m³`,
              region: result.region || t("dispatch.assist.unknown"),
            })}
          </p>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h3 className="type-small font-semibold">{t("dispatch.crew")}</h3>
              <ul className="mt-2 space-y-3">
                {result.crews.slice(0, 4).map((c) => (
                  <li key={c.teamId} className="border-b border-line pb-2 last:border-0">
                    <p className="text-sm">
                      {c.name}
                      {c.blocked ? ` — ${t("dispatch.assist.blocked")}` : ""}
                    </p>
                    <Reasons reasons={c.reasons} />
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="type-small font-semibold">{t("dispatch.vehicle")}</h3>
              <ul className="mt-2 space-y-3">
                {result.vehicles.slice(0, 4).map((v) => (
                  <li key={v.vehicleId} className="border-b border-line pb-2 last:border-0">
                    <p className="text-sm">
                      {v.label}
                      {v.blocked ? ` — ${t("dispatch.assist.blocked")}` : ""}
                    </p>
                    <Reasons reasons={v.reasons} />
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {result.openPoints.length > 0 ? (
            <div>
              <h3 className="type-small font-semibold">{t("dispatch.assist.openPoints")}</h3>
              <Reasons reasons={result.openPoints} />
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="primary"
              disabled={!bestCrew || !bestVehicle || applying}
              onClick={() => void approve()}
            >
              {applying ? t("dispatch.assigning") : t("dispatch.assist.approve")}
            </Button>
            <span className="type-small text-soft">
              {bestCrew && bestVehicle
                ? t("dispatch.assist.approveHint", { crew: bestCrew.name, vehicle: bestVehicle.label })
                : t("dispatch.assist.noneAvailable")}
            </span>
          </div>
        </div>
      ) : null}
    </Card>
  );
}
