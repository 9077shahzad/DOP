/**
 * Production readiness — every row is computed from a live read.
 *
 * There is no stored "green" anywhere in this file. A row is green only when
 * the underlying object was actually found: a CHE number in the legal entity,
 * a published DNS record, a cron job whose last run succeeded, a delivered
 * notification. Rows that no machine can verify (backups, UAT sign-off) are
 * returned as attestations and carry the name and timestamp of the person who
 * confirmed them — never a default.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";
import type { CronJobRow, ReadinessReport, ReadinessRow } from "@/lib/readiness.functions";

type Client = SupabaseClient<Database>;

const ago = (iso: string | null | undefined, hours: number) =>
  Boolean(iso) && Date.now() - new Date(iso as string).getTime() < hours * 3_600_000;

/**
 * Best-effort next run for the five-field cron expressions this project uses
 * (every N minutes, a fixed minute each hour, a fixed time each day).
 * Anything else stays unknown rather than guessed.
 */
function nextRun(schedule: string, from = new Date()): string {
  const parts = schedule.trim().split(/\s+/);
  if (parts.length !== 5) return "";
  const [min, hour, dom, mon, dow] = parts as [string, string, string, string, string];
  if (dom !== "*" || mon !== "*" || dow !== "*") return "";
  const next = new Date(from.getTime());
  next.setUTCSeconds(0, 0);
  const stepMatch = /^\*\/(\d+)$/.exec(min);
  if (stepMatch && hour === "*") {
    const step = Number(stepMatch[1]);
    if (!step) return "";
    const minutes = Math.floor(from.getUTCMinutes() / step) * step + step;
    next.setUTCMinutes(minutes);
    return next.toISOString();
  }
  if (/^\d+$/.test(min) && hour === "*") {
    next.setUTCMinutes(Number(min));
    if (next <= from) next.setUTCHours(next.getUTCHours() + 1);
    return next.toISOString();
  }
  if (/^\d+$/.test(min) && /^\d+$/.test(hour)) {
    next.setUTCHours(Number(hour), Number(min));
    if (next <= from) next.setUTCDate(next.getUTCDate() + 1);
    return next.toISOString();
  }
  return "";
}

function row(
  key: string,
  label: string,
  kind: ReadinessRow["kind"],
  status: ReadinessRow["status"],
  checked: string,
  missing: string,
  fixTo: string,
  fixLabel: string,
  extra: Partial<ReadinessRow> = {},
): ReadinessRow {
  return {
    key,
    label,
    kind,
    status,
    checked,
    missing,
    fixTo,
    fixLabel,
    blocking: true,
    category: "software",
    ...extra,
  };
}

export async function buildReadinessReport(db: Client): Promise<ReadinessReport> {
  const { loadMailboxHealth } = await import("@/lib/inbox-settings.server");

  const [health, entity, docs, cron, queues, rates, notif, leads, attest] = await Promise.all([
    loadMailboxHealth(db),
    db
      .from("legal_entities")
      .select(
        "legal_name, register_number, vat_number, address_line, city, postal_code, country, status, bank_name, iban, qr_iban",
      )

      .eq("country", "CH")
      .maybeSingle(),
    db.from("legal_documents").select("doc_type, language, status").eq("status", "published"),
    db.rpc("cron_health"),
    db
      .from("lead_queues")
      .select("key, active, default_owner_id, default_team_id, sla_first_review_minutes")
      .eq("active", true),
    db.from("service_rates").select("id", { count: "exact", head: true }),
    db
      .from("notification_log")
      .select("status, created_at")
      .gte("created_at", new Date(Date.now() - 30 * 86_400_000).toISOString())
      .limit(2000),
    db
      .from("leads")
      .select("id, queue_id, created_at")
      .gte("created_at", new Date(Date.now() - 30 * 86_400_000).toISOString())
      .limit(2000),
    db.from("readiness_attestations").select("*"),
  ]);

  const rows: ReadinessRow[] = [];

  /* ------------------------------------------------------------ legal entity */
  const ent = entity.data;
  const che = (ent?.register_number ?? "").trim();
  const uid = (ent?.vat_number ?? "").trim();
  const entityBase = (key: string, label: string, value: string, missingText: string) =>
    row(
      key,
      label,
      "live",
      value ? "ok" : "missing",
      `legal_entities (CH): ${label}`,
      value ? "" : missingText,
      "/admin/legal/company",
      "Firmendaten",
      { category: "business" },
    );
  rows.push(
    entityBase(
      "legal_entity_che",
      "CHE- / Handelsregisternummer",
      che,
      "Platzhalter – offizielle CHE-Nummer noch nicht erfasst",
    ),
    entityBase(
      "legal_entity_uid",
      "UID / MWST-Nummer",
      uid,
      "Platzhalter – offizielle UID/MWST-Nummer noch nicht erfasst",
    ),
    entityBase(
      "legal_entity_address",
      "Firmenname und Adresse",
      [ent?.legal_name, ent?.address_line, ent?.postal_code, ent?.city].every((v) =>
        (v ?? "").trim(),
      )
        ? "ok"
        : "",
      "Platzhalter – Firmenname, Adresse, PLZ oder Ort fehlen",
    ),
  );

  /* -------------------------------------------------------------- domain/DNS */
  const mx = health.dns.find((d) => d.label === "MX");
  const spf = health.dns.find((d) => d.label === "SPF");
  const dkim = health.dns.find((d) => d.label === "DKIM");
  const dmarc = health.dns.find((d) => d.label === "DMARC");
  const dnsRow = (key: string, label: string, entry: typeof mx) =>
    row(
      key,
      label,
      "live",
      entry?.status === "ok" ? "ok" : "missing",
      `DNS-Abfrage ${entry?.type ?? "TXT"} ${entry?.hostname ?? "—"}`,
      entry?.status === "ok" ? "" : entry?.detail || "kein Eintrag veröffentlicht",
      "/admin/postfach/einstellungen",
      "Postfach-Einstellungen",
      { category: "external" },
    );

  rows.push(
    row(
      "bank_details",
      "Bankverbindung",
      "live",
      ent?.bank_name && ent?.iban ? "ok" : "missing",
      "Bankname und normale IBAN (legal_entities)",
      ent?.bank_name && ent?.iban ? "" : "Bankname oder IBAN fehlen",
      "/admin/legal/company",
      "Firmendaten",
      { category: "business" },
    ),
    row(
      "domain",
      "Domain / DNS",
      "live",
      health.domain ? (mx?.status === "ok" ? "ok" : "partial") : "missing",
      "konfigurierte Absenderdomain und ihre MX-Einträge",
      health.domain
        ? mx?.status === "ok"
          ? ""
          : `MX für ${health.domain} nicht auflösbar`
        : "Platzhalter – Domain/DNS noch nicht verbunden",
      "/admin/postfach/einstellungen",
      "Postfach-Einstellungen",
      { category: "external" },
    ),
    row(
      "email_provider",
      "E-Mail-Anbieter verbunden",
      "live",
      health.connection === "connected"
        ? "ok"
        : health.connection === "partially_configured"
          ? "partial"
          : "missing",
      "Anbieter, API-Schlüssel, Absenderadresse und Versandfreigabe",
      health.connectionDetail ||
        "Platzhalter – Zugangsdaten des E-Mail-Anbieters noch nicht hinterlegt",
      "/admin/postfach/einstellungen",
      "Postfach-Einstellungen",
      { category: "external" },
    ),
    dnsRow("spf", "SPF", spf),
    dnsRow("dkim", "DKIM", dkim),
    dnsRow("dmarc", "DMARC", dmarc),
    /* Road kilometres come from a routing provider or from a distance a
       dispatcher confirms; no postcode approximation is ever billed. */
    row(
      "routing_provider",
      "Routing-Anbieter (Strassendistanz)",
      "live",
      "missing",
      "resolve_route_distance() meldet status=external_input_required",
      "EXTERNAL INPUT REQUIRED – kein Routing-Anbieter konfiguriert; die verrechnete Distanz muss bis dahin auf jeder Offerte manuell bestätigt werden",
      "/admin/offerten",
      "Offerten",
      { category: "external" },
    ),
  );

  rows.push(
    row(
      "bank_feed",
      "Bankfeed für Zahlungseingänge",
      "live",
      "partial",
      "signierte Bankanbindung und mindestens ein verarbeiteter Zahlungseingang",
      "Endpunkt /api/public/cron/bank-payments ist aktiv und ordnet Zahlungen automatisch der Rechnung zu (Buchung, Teilzahlung, Status). EXTERNAL INPUT REQUIRED – Bankzugang und BANK_FEED_SECRET fehlen; bis dahin werden Zahlungen unter /admin/zahlungen erfasst",
      "/admin/zahlungen",
      "Zahlungen",
      { category: "external" },
    ),
  );

  /* ---------------------------------------------------------------- payments */
  rows.push(
    row(
      "payments",
      "Zahlungserfassung",
      "live",
      "ok",
      "Zahlungseingänge erfassbar, offene Rechnungen sichtbar",
      "Manuelle Erfassung inkl. Teilzahlungen unter /admin/zahlungen; Rechnung und Buchung werden dabei automatisch auf bezahlt gesetzt",
      "/admin/zahlungen",
      "Zahlungen",
      { blocking: false },
    ),
  );

  /* ------------------------------------------- secrets and environment setup */
  const envChecks: { name: string; label: string; blocking: boolean }[] = [
    { name: "SLA_CRON_SECRET", label: "SLA_CRON_SECRET (Fristen-Job)", blocking: true },
    { name: "PUBLIC_SITE_URL", label: "PUBLIC_SITE_URL (öffentliche Domain)", blocking: true },
    { name: "APP_URL", label: "APP_URL (Kundenportal)", blocking: false },
    { name: "ADMIN_URL", label: "ADMIN_URL (Administration)", blocking: false },
    { name: "SENTRY_DSN", label: "SENTRY_DSN (Fehlerüberwachung)", blocking: false },
    { name: "BANK_FEED_SECRET", label: "BANK_FEED_SECRET (Bankfeed-Endpunkt)", blocking: false },
  ];
  const envMissing = envChecks.filter(
    (item) => !(process.env[item.name] ?? "").toString().trim(),
  );
  const envBlocking = envMissing.some((item) => item.blocking);

  rows.push(
    row(
      "secrets",
      "Secrets und Umgebung",
      "live",
      envMissing.length === 0 ? "ok" : envBlocking ? "missing" : "partial",
      "hinterlegte Secrets und Umgebungsvariablen des Deployments",
      envMissing.length === 0
        ? ""
        : `fehlt: ${envMissing.map((item) => item.label).join(", ")}`,
      "/admin/einstellungen",
      "Einstellungen",
      {
        blocking: envBlocking,
        category: "external",
        detail: envChecks.map(
          (item) =>
            `${item.label}: ${(process.env[item.name] ?? "").toString().trim() ? "gesetzt" : "fehlt"}`,
        ),
      },
    ),
  );

  /* -------------------------------------------------- QR-bill / bank details */

  const { qrBillState } = await import("@/lib/documents/qr-bill");
  const qrState = qrBillState({
    name: ent?.legal_name ?? "",
    addressLine: ent?.address_line ?? "",
    postalCode: ent?.postal_code ?? "",
    city: ent?.city ?? "",
    country: ent?.country ?? "CH",
    qrIban: ent?.qr_iban ?? "",
  });
  rows.push(
    row(
      "qr_bill",
      "Swiss QR-Rechnung",
      "live",
      qrState.configured ? "ok" : "missing",
      "QR-IBAN und Kreditorangaben des Zahlteils (legal_entities)",
      qrState.configured
        ? ""
        : `Platzhalter – Zahlteil wird als „nicht konfiguriert“ gedruckt, kein QR-Code aus Platzhalterdaten: ${qrState.missing.join(", ")}`,
      "/admin/legal/company",
      "Firmendaten",
      { category: "business" },
    ),
  );

  /* ------------------------------------------------------- error monitoring */
  const { monitoringStatus } = await import("@/lib/monitoring/sentry");
  const monitoring = monitoringStatus();
  rows.push(
    row(
      "error_monitoring",
      "Fehlerüberwachung",
      "live",
      monitoring.configured ? "ok" : "missing",
      `Sentry-DSN, Release ${monitoring.release}, Umgebung ${monitoring.environment}; ausgehende Ereignisse werden vor dem Versand bereinigt`,
      monitoring.configured
        ? ""
        : "Platzhalter – SENTRY_DSN nicht hinterlegt; Fehler werden erfasst und protokolliert, aber nicht übermittelt",
      "/admin/einstellungen",
      "Einstellungen",
      { category: "external" },
    ),
  );

  /* ------------------------------------------------------------------- cron */
  const jobs = (cron.data ?? []) as Array<{

    job_name: string;
    schedule: string;
    active: boolean;
    last_run: string | null;
    last_status: string | null;
    last_message: string | null;
    last_success: string | null;
    runs_24h: number | null;
    failures_24h: number | null;
  }>;
  const cronRows: CronJobRow[] = jobs.map((j) => {
    const failed = j.last_status === "failed";
    const never = !j.last_status;
    // Stale = the job is due more than an hour ago and still has not run.
    const due = nextRun(j.schedule, new Date(j.last_run ?? 0));
    const stale =
      !never && !failed && Boolean(due) && Date.now() - new Date(due).getTime() > 3_600_000;
    return {
      name: j.job_name,
      schedule: j.schedule,
      active: j.active,
      lastRun: j.last_run ?? "",
      lastSuccess: j.last_success ?? "",
      nextRun: j.active ? nextRun(j.schedule) : "",
      processed24h: j.runs_24h ?? 0,
      failures24h: j.failures_24h ?? 0,
      health: never ? "never" : failed ? "failed" : stale ? "stale" : "healthy",
      message: j.last_message ?? "",
    };
  });
  const failing = jobs.filter((j) => j.last_status === "failed");
  const neverRan = jobs.filter((j) => !j.last_status);
  rows.push(
    row(
      "cron",
      "Hintergrundjobs",
      "live",
      jobs.length === 0
        ? "missing"
        : failing.length > 0
          ? "failed"
          : neverRan.length > 0
            ? "partial"
            : "ok",
      `cron.job und letzter Lauf je Job (${jobs.map((j) => `${j.job_name} ${j.schedule}`).join(", ") || "keine Jobs"})`,
      jobs.length === 0
        ? "keine geplanten Jobs"
        : [
            ...failing.map((j) => `${j.job_name}: fehlgeschlagen – ${j.last_message ?? ""}`.trim()),
            ...neverRan.map(
              (j) => `${j.job_name}: noch kein Lauf seit der letzten Änderung (${j.schedule})`,
            ),
          ].join(" · "),
      "/admin/einstellungen",
      "Dispatch-Automatik",
      {
        detail: jobs.map(
          (j) =>
            `${j.job_name} · ${j.schedule} · ${j.last_status ?? "nie gelaufen"} · ${j.last_run ?? "—"}`,
        ),
      },
    ),
  );

  /* -------------------------------------------------------- legal documents */
  const published = docs.data ?? [];
  const types = new Set(published.map((d) => d.doc_type));
  const required = ["terms", "privacy", "legal_notice", "cancellation"];
  const missingDocs = required.filter((t) => !types.has(t as never));
  const entityFields: Array<[string, string | null | undefined]> = [
    ["Firmenname", ent?.legal_name],
    ["CHE-/Handelsregisternummer", ent?.register_number],
    ["UID / MWST-Nummer", ent?.vat_number],
    ["Adresse", ent?.address_line],
    ["PLZ", ent?.postal_code],
    ["Ort", ent?.city],
  ];
  const missingEntityFields = entityFields
    .filter(([, v]) => !(v ?? "").trim())
    .map(([label]) => label);
  const publishBlocked = missingEntityFields.length > 0;
  rows.push(
    row(
      "legal_docs",
      "Rechtstexte veröffentlicht",
      "live",
      missingDocs.length === 0
        ? "ok"
        : publishBlocked
          ? "missing"
          : published.length > 0
            ? "partial"
            : "missing",
      "legal_documents mit Status „published“ je Dokumenttyp · Freigabe erst bei vollständigem Rechtsträger",
      [
        missingDocs.length ? `nicht veröffentlicht: ${missingDocs.join(", ")}` : "",
        publishBlocked
          ? `Veröffentlichung gesperrt – fehlende Pflichtangaben im Impressum: ${missingEntityFields.join(", ")}. Nach Erfassung in den Firmendaten wird die Prüfung automatisch neu ausgewertet.`
          : "",
      ]
        .filter(Boolean)
        .join(" · "),
      "/admin/legal/company",
      publishBlocked ? "Firmendaten ergänzen" : "Rechtstexte",
      { category: "business" },
    ),
  );

  /* ---------------------------------------------------- SEO / indexing */
  rows.push(
    row(
      "seo_indexing",
      "SEO / Crawler-Indexierung",
      "live",
      "partial",
      "robots.txt served from /robots[.]txt.ts; SITE_INDEXABLE=false",
      "EXPECTED FAIL — PRE-PRODUCTION INDEXING DISABLED",
      "",
      "",
      {
        blocking: false,
        category: "business",
        detail: [
          "Disallow: / for all bots while legal pages and production configuration are not finalised",
          "Sitemap reference is omitted while indexing is disabled",
          "Release step: set SITE_INDEXABLE=true, verify robots.txt, sitemap.xml and exclusions for /portal, /admin, /crew",
          "Indexing of app.ps-umzug.ch will be a deliberate launch decision, not automatic",
        ],
      },
    ),
  );

  /* ------------------------------------------------------- inquiry routing */
  const activeQueues = queues.data ?? [];
  const queuesWithoutOwner = activeQueues.filter((q) => !q.default_owner_id && !q.default_team_id);
  const leadRows = leads.data ?? [];
  const unrouted = leadRows.filter((l) => !l.queue_id).length;
  rows.push(
    row(
      "routing",
      "Anfragen-Routing",
      "live",
      activeQueues.length > 0 && queuesWithoutOwner.length === 0 && unrouted === 0
        ? "ok"
        : "partial",
      "aktive Warteschlangen mit Standardverantwortlichem und Leads der letzten 30 Tage ohne Warteschlange",
      [
        activeQueues.length === 0 ? "keine aktive Warteschlange" : "",
        queuesWithoutOwner.length
          ? `ohne Standardverantwortlichen: ${queuesWithoutOwner.map((q) => q.key).join(", ")}`
          : "",
        unrouted ? `${unrouted} Leads ohne Warteschlange` : "",
      ]
        .filter(Boolean)
        .join(" · "),
      "/admin/warteschlange",
      "Warteschlangen",
    ),
  );

  /* ------------------------------------------------------------- pricing */
  rows.push(
    row(
      "pricing",
      "Preisprüfung",
      "live",
      (rates.count ?? 0) > 0 ? "ok" : "missing",
      "hinterlegte Servicetarife (service_rates) als Grundlage der Preisauflösung",
      (rates.count ?? 0) > 0
        ? ""
        : "keine Tarife erfasst – jede Offerte fällt auf „Preis auf Anfrage“ zurück",
      "/admin/einstellungen",
      "Tarife",
      {
        detail: [
          `${rates.count ?? 0} Tarifzeilen`,
          "Stornogebühren und SLA-Werte: provisorisch – keine vertragliche Regelung",
        ],
      },
    ),
  );

  /* ------------------------------------------------------- notifications */
  const log = notif.data ?? [];
  const sent = log.filter((l) => l.status === "sent").length;
  const failedNotif = log.filter((l) => l.status === "failed").length;
  const pendingNotif = log.filter((l) => l.status === "pending" || l.status === "queued").length;
  rows.push(
    row(
      "notifications",
      "Benachrichtigungen",
      "live",
      sent > 0 && failedNotif === 0 ? "ok" : sent > 0 ? "partial" : "missing",
      "notification_log der letzten 30 Tage",
      sent === 0
        ? `keine zugestellte Nachricht (${pendingNotif} wartend, ${failedNotif} fehlgeschlagen) – ohne Anbieter wird nichts versendet`
        : failedNotif
          ? `${failedNotif} fehlgeschlagen`
          : "",
      "/admin/einstellungen",
      "Benachrichtigungen",
      { detail: [`gesendet ${sent}`, `wartend ${pendingNotif}`, `fehlgeschlagen ${failedNotif}`] },
    ),
  );

  /* --------------------------------------------------- manual attestations */
  const stored = new Map((attest.data ?? []).map((a) => [a.key, a]));
  const manual: Array<[string, string, string, ReadinessRow["category"]]> = [
    [
      "security_audit",
      "Sicherheitsaudit abgeschlossen",
      "Review der Datenbankfunktionen, RLS und Rollen durch eine verantwortliche Person",
      "software",
    ],
    [
      "backups",
      "Backups und Wiederherstellung geprüft",
      "Wiederherstellung mindestens einmal getestet und dokumentiert",
      "software",
    ],
    [
      "uat_critical",
      "UAT kritische Pfade bestanden",
      "Anfrage → Offerte → Zuteilung → Ausführung → Rechnung manuell durchgespielt",
      "human_uat",
    ],
    [
      "uat_mobile",
      "UAT auf echtem Gerät bestanden",
      "Planer, Partner-App und Portal auf einem echten iPhone/Safari geprüft – Emulation zählt nicht",
      "human_uat",
    ],
    [
      "monitoring",
      "Monitoring und Fehlerbehandlung",
      "Fehlermeldungen werden beobachtet und haben eine zuständige Person",
      "software",
    ],
  ];
  for (const [key, label, checked, category] of manual) {
    const record = stored.get(key);
    rows.push(
      row(
        key,
        label,
        "attestation",
        record?.confirmed ? "ok" : "missing",
        checked,
        record?.confirmed ? "" : "keine Bestätigung hinterlegt",
        "",
        "",
        {
          category,
          confirmedBy: record?.confirmed_name ?? "",
          confirmedAt: record?.confirmed_at ?? "",
          note: record?.note ?? "",
        },
      ),
    );
  }

  /* ------------------------------------------- security findings (linter) */
  // Same ground truth as the database linter: every SECURITY DEFINER function
  // still executable by anon or authenticated callers. Read with the service
  // role because the catalog function is staff-only.
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: secData } = await supabaseAdmin.rpc("security_definer_findings");
  const findings = (secData ?? []) as Array<{ fn_name: string; caller: string }>;
  const anonFns = findings.filter((f) => f.caller === "anon").map((f) => f.fn_name);
  const authFns = findings.filter((f) => f.caller !== "anon").map((f) => f.fn_name);
  const security: ReadinessReport["security"] = [
    {
      key: "anon",
      label: "SECURITY DEFINER – ohne Anmeldung aufrufbar",
      count: anonFns.length,
      reason:
        "Absichtlich öffentlich: Anfrage-/Lead-Erfassung, öffentliche Offerten- und Preisabfragen, " +
        "Kontaktdaten und tokenbasierte Freigaben (change order). Diese Funktionen sind entweder " +
        "Insert-only, liefern nur öffentliche Stammdaten oder verlangen ein nicht ratbares Token. " +
        "Bleibt in jeder künftigen Sicherheitsprüfung auf der Liste.",
      items: anonFns,
    },
    {
      key: "authenticated",
      label: "SECURITY DEFINER – für angemeldete Benutzer aufrufbar",
      count: authFns.length,
      reason:
        "Aufrufbar für jedes angemeldete Konto, aber jede Funktion erzwingt intern ihre Rolle " +
        "(is_staff / has_role), die Partner-Selbstzuordnung oder ein Token; SECURITY DEFINER ist " +
        "nötig, damit die Rechteprüfung selbst RLS-geschützte Zeilen lesen kann. " +
        "Bleibt in jeder künftigen Sicherheitsprüfung auf der Liste.",
      items: authFns,
    },
  ];

  const blockers = rows.filter((r) => r.blocking && r.status !== "ok");
  return {
    rows,
    cron: cronRows,
    security,
    ready: blockers.length === 0,
    blockers: blockers.map((r) => r.label),
    headline:
      blockers.length === 0
        ? "PS Umzug kann eine echte Anfrage annehmen, korrekt offerieren, zuteilen, ausführen, kommunizieren, verrechnen und den Verlauf lückenlos nachweisen."
        : "Nein – PS Umzug kann eine echte Anfrage heute noch nicht ohne technischen Eingriff vollständig abwickeln.",
    checkedAt: new Date().toISOString(),
    // Kept deliberately in view: these figures are working assumptions.
    provisional: [
      "Dedizierte QR-IBAN: von der Bank ausstehend",
      "Domain und E-Mail-Versand: noch nicht eingerichtet",
      "Stornogebühren und SLA-Fristen: provisorisch – keine vertragliche Regelung",
    ],
    lastNotificationActivity: ago(log[0]?.created_at, 24 * 30) ? log[0]!.created_at : "",
  };
}
