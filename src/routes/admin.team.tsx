/**
 * /admin/team — Mitarbeitende, Fahrzeuge und Crews.
 *
 * The operational resource master data: who works here, what they can do,
 * what we drive, and which crew a person belongs to. Everything here is data,
 * never code: dispatch reads exactly these rows.
 */
import { InviteStaffCard } from "@/components/admin/InviteStaffCard";
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
  Input,
  LoadingState,
  Select,
  TableShell,
  Td,
  Th,
  Tr,
} from "@/components/system";
import i18n from "@/i18n/config";
import { langOf, privateHead } from "@/lib/seo";
import {
  EMPLOYEE_ROLES,
  SKILLS,
  VEHICLE_TYPES,
  addCrewMember,
  createTeam,
  fetchCrewMembers,
  fetchEmployees,
  fetchTeams,
  fetchVehicles,
  removeCrewMember,
  saveEmployee,
  saveVehicle,
  setEmployeeActive,
  setVehicleActive,
  type CrewMember,
  type Employee,
  type InternalTeam,
  type Vehicle,
} from "@/lib/operations";

export const Route = createFileRoute("/admin/team")({
  ssr: false,
  head: () => privateHead(langOf(i18n.language), "admin"),
  component: TeamScreen,
});

const TABS = ["mitarbeitende", "fahrzeuge", "crews"] as const;
type Tab = (typeof TABS)[number];

const TAB_KEY: Record<Tab, string> = {
  mitarbeitende: "team.tabEmployees",
  fahrzeuge: "team.tabVehicles",
  crews: "team.tabCrews",
};

function TeamScreen() {
  const { t } = useTranslation("ops");
  const [tab, setTab] = useState<Tab>("mitarbeitende");
  return (
      <div className="space-y-6">
        <CardHeader eyebrow={t("common.eyebrow")} title={t("team.title")} />
        <div className="flex flex-wrap gap-2">
          {TABS.map((key) => (
            <Button
              key={key}
              variant={tab === key ? "primary" : "outline"}
              size="sm"
              onClick={() => setTab(key)}
            >
              {t(TAB_KEY[key])}
            </Button>
          ))}
        </div>
        {tab === "mitarbeitende" ? <><InviteStaffCard /><EmployeesPanel /></> : null}
        {tab === "fahrzeuge" ? <VehiclesPanel /> : null}
        {tab === "crews" ? <CrewsPanel /> : null}
      </div>
  );
}

/* --------------------------------------------------------------- employees */

const EMPTY_EMPLOYEE = {
  full_name: "",
  role: "mover",
  phone: "",
  email: "",
  employment: "permanent",
  skills: [] as string[],
};

function EmployeesPanel() {
  const { t } = useTranslation("ops");
  const [rows, setRows] = useState<Employee[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState({ ...EMPTY_EMPLOYEE });
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      setRows(await fetchEmployees());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("common.loadFailed"));
    }
  }
  useEffect(() => {
    void load();
  }, []);

  async function add() {
    if (!draft.full_name.trim()) return;
    setSaving(true);
    try {
      await saveEmployee({ ...draft, full_name: draft.full_name.trim() });
      setDraft({ ...EMPTY_EMPLOYEE });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("common.saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {error ? <ErrorState message={error} /> : null}
      <Card>
        <CardHeader title={t("team.addEmployee")} />
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <Field label={t("team.name")} required>
            {(p) => (
              <Input
                {...p}
                value={draft.full_name}
                onChange={(e) => setDraft({ ...draft, full_name: e.target.value })}
              />
            )}
          </Field>
          <Field label={t("team.role")}>
            {(p) => (
              <Select {...p} value={draft.role} onChange={(e) => setDraft({ ...draft, role: e.target.value })}>
                {EMPLOYEE_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {t(`role.${r}`)}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label={t("team.employment")}>
            {(p) => (
              <Select
                {...p}
                value={draft.employment}
                onChange={(e) => setDraft({ ...draft, employment: e.target.value })}
              >
                <option value="permanent">{t("employment.permanent")}</option>
                <option value="temporary">{t("employment.temporary")}</option>
                <option value="freelance">{t("employment.freelance")}</option>
              </Select>
            )}
          </Field>
          <Field label={t("team.phone")}>
            {(p) => <Input {...p} value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} />}
          </Field>
          <Field label={t("team.email")}>
            {(p) => (
              <Input {...p} type="email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} />
            )}
          </Field>
          <Field label={t("team.skills")} help={t("team.skillsHelp")}>
            {(p) => (
              <Select
                {...p}
                multiple
                value={draft.skills}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    skills: Array.from(e.target.selectedOptions).map((o) => o.value),
                  })
                }
              >
                {SKILLS.map((s) => (
                  <option key={s} value={s}>
                    {t(`skill.${s}`)}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>
        <div className="mt-4">
          <Button variant="primary" size="sm" onClick={() => void add()} disabled={saving || !draft.full_name.trim()}>
            {saving ? t("team.saving") : t("team.createEmployee")}
          </Button>
        </div>
      </Card>

      {rows === null ? (
        <LoadingState label={t("common.loading")} />
      ) : rows.length === 0 ? (
        <EmptyState title={t("team.emptyEmployees")} body={t("team.emptyEmployeesBody")} />
      ) : (
        <TableShell
          caption={t("team.captionEmployees")}
          head={
            <tr>
              <Th>{t("team.name")}</Th>
              <Th>{t("team.role")}</Th>
              <Th>{t("team.contact")}</Th>
              <Th>{t("team.skills")}</Th>
              <Th>{t("common.status")}</Th>
              <Th>{t("team.action")}</Th>
            </tr>
          }
        >
          {rows.map((r) => (
            <Tr key={r.id}>
              <Td>{r.full_name}</Td>
              <Td>{t(`role.${r.role}`, { defaultValue: r.role })}</Td>
              <Td>
                {r.phone || t("common.none")}
                <br />
                {r.email || t("common.none")}
              </Td>
              <Td>{r.skills.length ? r.skills.map((sk) => t(`skill.${sk}`, { defaultValue: sk })).join(", ") : t("common.none")}</Td>
              <Td>{r.active ? t("team.activeShort") : t("team.inactiveShort")}</Td>
              <Td>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void setEmployeeActive(r.id, !r.active).then(load)}
                >
                  {r.active ? t("team.deactivate") : t("team.activate")}
                </Button>
              </Td>
            </Tr>
          ))}
        </TableShell>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- vehicles */

function VehiclesPanel() {
  const { t } = useTranslation("ops");
  const [rows, setRows] = useState<Vehicle[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState({ plate: "", label: "", vehicle_type: "van", capacity_m3: "" });

  async function load() {
    try {
      setRows(await fetchVehicles());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("common.loadFailed"));
    }
  }
  useEffect(() => {
    void load();
  }, []);

  async function add() {
    if (!draft.plate.trim()) return;
    try {
      await saveVehicle({
        plate: draft.plate.trim().toUpperCase(),
        label: draft.label,
        vehicle_type: draft.vehicle_type,
        capacity_m3: draft.capacity_m3 ? Number(draft.capacity_m3) : 0,
      });
      setDraft({ plate: "", label: "", vehicle_type: "van", capacity_m3: "" });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("common.saveFailed"));
    }
  }

  return (
    <div className="space-y-4">
      {error ? <ErrorState message={error} /> : null}
      <Card>
        <CardHeader title={t("team.addVehicle")} />
        <div className="mt-4 grid gap-4 md:grid-cols-4">
          <Field label={t("team.plate")} required>
            {(p) => <Input {...p} value={draft.plate} onChange={(e) => setDraft({ ...draft, plate: e.target.value })} />}
          </Field>
          <Field label={t("team.label")}>
            {(p) => <Input {...p} value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} />}
          </Field>
          <Field label={t("team.type")}>
            {(p) => (
              <Select
                {...p}
                value={draft.vehicle_type}
                onChange={(e) => setDraft({ ...draft, vehicle_type: e.target.value })}
              >
                {VEHICLE_TYPES.map((v) => (
                  <option key={v} value={v}>
                    {t(`vehicleType.${v}`)}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label={t("team.capacity")}>
            {(p) => (
              <Input
                {...p}
                inputMode="decimal"
                value={draft.capacity_m3}
                onChange={(e) => setDraft({ ...draft, capacity_m3: e.target.value })}
              />
            )}
          </Field>
        </div>
        <div className="mt-4">
          <Button variant="primary" size="sm" onClick={() => void add()} disabled={!draft.plate.trim()}>
            {t("team.createVehicle")}
          </Button>
        </div>
      </Card>

      {rows === null ? (
        <LoadingState label={t("common.loading")} />
      ) : rows.length === 0 ? (
        <EmptyState title={t("team.emptyVehicles")} body={t("team.emptyVehiclesBody")} />
      ) : (
        <TableShell
          caption={t("team.captionVehicles")}
          head={
            <tr>
              <Th>{t("team.plate")}</Th>
              <Th>{t("team.label")}</Th>
              <Th>{t("team.type")}</Th>
              <Th>m³</Th>
              <Th>{t("common.status")}</Th>
              <Th>{t("team.action")}</Th>
            </tr>
          }
        >
          {rows.map((r) => (
            <Tr key={r.id}>
              <Td>{r.plate}</Td>
              <Td>{r.label || t("common.none")}</Td>
              <Td>{t(`vehicleType.${r.vehicle_type}`, { defaultValue: r.vehicle_type })}</Td>
              <Td>{Number(r.capacity_m3) || t("common.none")}</Td>
              <Td>{r.active ? t("team.activeShort") : t("team.inactiveShort")}</Td>
              <Td>
                <Button size="sm" variant="outline" onClick={() => void setVehicleActive(r.id, !r.active).then(load)}>
                  {r.active ? t("team.deactivate") : t("team.activate")}
                </Button>
              </Td>
            </Tr>
          ))}
        </TableShell>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------- crews */

function CrewsPanel() {
  const { t } = useTranslation("ops");
  const [teams, setTeams] = useState<InternalTeam[] | null>(null);
  const [members, setMembers] = useState<CrewMember[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [teamName, setTeamName] = useState("");
  const [pick, setPick] = useState<Record<string, string>>({});

  async function load() {
    try {
      const [tm, m, e] = await Promise.all([fetchTeams(), fetchCrewMembers(), fetchEmployees(false)]);
      setTeams(tm);
      setMembers(m);
      setEmployees(e);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("common.loadFailed"));
    }
  }
  useEffect(() => {
    void load();
  }, []);

  const byTeam = useMemo(() => {
    const map = new Map<string, CrewMember[]>();
    for (const m of members) map.set(m.team_id, [...(map.get(m.team_id) ?? []), m]);
    return map;
  }, [members]);

  const nameOf = (id: string) => employees.find((x) => x.id === id)?.full_name ?? "—";

  return (
    <div className="space-y-4">
      {error ? <ErrorState message={error} /> : null}
      <Card>
        <CardHeader title={t("team.addCrew")} />
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <Field label={t("team.crewName")} className="min-w-64">
            {(p) => <Input {...p} value={teamName} onChange={(e) => setTeamName(e.target.value)} />}
          </Field>
          <Button
            variant="primary"
            size="sm"
            disabled={!teamName.trim()}
            onClick={() =>
              void createTeam(teamName.trim(), "Steffisburg", "BE")
                .then(() => setTeamName(""))
                .then(load)
                .catch((e: unknown) => setError(e instanceof Error ? e.message : t("common.error")))
            }
          >
            {t("team.addCrew")}
          </Button>
        </div>
      </Card>

      {teams === null ? (
        <LoadingState label={t("common.loading")} />
      ) : teams.length === 0 ? (
        <EmptyState title={t("team.emptyCrews")} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {teams.map((team) => (
            <Card key={team.id}>
              <CardHeader title={team.name} eyebrow={`${team.city} · ${team.canton}`} />
              <ul className="mt-3 space-y-2">
                {(byTeam.get(team.id) ?? []).map((m) => (
                  <li key={m.id} className="flex items-center justify-between gap-3 border-b border-line pb-2 text-sm">
                    <span>
                      {nameOf(m.employee_id)} <span className="text-soft">· {t(`role.${m.crew_role}`, { defaultValue: m.crew_role })}</span>
                    </span>
                    <Button size="sm" variant="outline" onClick={() => void removeCrewMember(m.id).then(load)}>
                      {t("team.remove")}
                    </Button>
                  </li>
                ))}
                {(byTeam.get(team.id) ?? []).length === 0 ? (
                  <li className="type-small text-soft">{t("team.noMembers")}</li>
                ) : null}
              </ul>
              <div className="mt-4 flex flex-wrap items-end gap-3">
                <Field label={t("team.addMember")} className="min-w-56">
                  {(p) => (
                    <Select
                      {...p}
                      value={pick[team.id] ?? ""}
                      onChange={(e) => setPick({ ...pick, [team.id]: e.target.value })}
                    >
                      <option value="">{t("team.choose")}</option>
                      {employees.map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.full_name}
                        </option>
                      ))}
                    </Select>
                  )}
                </Field>
                <Button
                  size="sm"
                  disabled={!pick[team.id]}
                  onClick={() => {
                    const employeeId = pick[team.id];
                    if (!employeeId) return;
                    const role = employees.find((e) => e.id === employeeId)?.role ?? "mover";
                    void addCrewMember(team.id, employeeId, role)
                      .then(() => setPick({ ...pick, [team.id]: "" }))
                      .then(load)
                      .catch((err: unknown) => setError(err instanceof Error ? err.message : t("common.error")));
                  }}
                >
                  {t("common.add")}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
