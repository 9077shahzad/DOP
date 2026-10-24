# PS Umzug AG — Programme roadmap

## Current release gate — 23-10-2026 (supersedes historical status below)
- [x] Full regression suite: 474/474 tests, 54/54 files, no failures/skips; includes enquiry → offer → customer acceptance → scheduling → invoice and access-control regressions.
- [x] Hosted preview build checked: succeeded and in sync before this documentation update.
- [x] Fresh backend security scan: no new actionable findings. Application/dependency scans remain stale; complete security sign-off remains open.
- [x] Live configuration checked: company registration/VAT/IBAN present; 2 active vehicles, 0 active employees.
- [ ] Verify sender domain and real invitation/reset, offer/invoice and acceptance-notification delivery. Blocker: no Lovable email domain configured; existing operational Resend delivery configuration remains unverified.
- [ ] Enter real staff and assign enquiry queue owners/teams. Blocker: no active employees; sales_dispatch, b2b and support lack default owner/team.
- [ ] Record security review, backup restoration, critical-path UAT, physical iPhone/Safari UAT and monitoring ownership. Blocker: readiness_attestations has no confirmations.
- [ ] Obtain native-speaker, legal and written Govand launch approvals. Blocker: approval evidence not supplied.
- [ ] Connect a new private GitHub repository through Lovable Project settings → Git. Blocker: owner/admin must authorize the connection; the agent cannot create Git sync. Review tracked private configuration/history before sharing; .gitignore is platform read-only here.
- [ ] Complete authenticated owner walkthrough and final deployed configuration/document assessment. Blocker: requesting user has no matching app account; owner-session approval is needed.
- [ ] Publish only after release gates and approvals pass; indexing remains disabled throughout owner testing. NO-GO remains in force.

Current evidence and next actions: docs/RELEASE-STATUS-2026-10-23.md. Older entries below are historical checkpoints, not today's launch status.

## Optional photo/video booking step (21-10-2026)
- [x] Place the existing price summary immediately before uploads; keep only Back/Continue navigation (PlannerWizard.tsx, LivePanel.tsx, Steps.tsx).
- [x] Preserve file validation/storage and wizard state; 121 tests across 8 files passed, including new intake-uploads.test.ts, pricing invariants/resolution/config, lead dedupe, live intake, Notiz 8 and translation parity; preview build OK.
- [x] Real browser uploads: two photos and one video succeeded and persisted through Continue/Back; no-file continuation reached contact/review in DE/FR/IT/EN/AR. Real CHF 1’383–1’653 price checked before uploads on desktop/tablet/mobile and Arabic RTL; no horizontal overflow. No deployment or booking submission.

## Cancellation fee removal (21-10-2026)
- [x] Removed 40% clause in new terms/cancellation versions for five languages; old versions retained. No cancellation rules are configured, so no engine rate required changing.
- [x] Active-rule integration test passed; public terms and cancellation pages checked in five languages (German fallback). NO-GO and language/legal approval holds remain.

## Order download feedback (10-10-2026)
- [x] Diagnose screenshot orders: staff override conversions, no customer acceptance; preserve all records.
- [x] Require current customer acceptance for new conversions in UI and database; no admin override.
- [x] Clarify missing-acceptance PDF warning in all five languages.
- [x] Verified acceptance controls in five languages; accepted test order PDF downloaded; A–E conversion regression and all 457 automated tests passed; preview build OK.
- [ ] Existing screenshot orders remain blocked: genuine customer acceptance must be clarified; no historical/live-data repair authorized.

## Notizen 6 — current requested corrections
- [x] Contact: full-name label and definitive-offer wording in five languages.
- [x] European day-month-year appointment dates in PDFs and offer/order details; PDF header dates also corrected.
- [x] Direct PDF downloads from offer and order lists using the existing customer renderer; both downloaded through the authenticated UI with test records.
- [x] Make customer corrections discoverable in unaccepted offer details; expose full linked offer details in orders without changing accepted snapshots.
- [x] Verification: 240 tests passed including 16 live intake tests; 116 affected tests passed again; preview build OK. Ten downloaded PDF pages inspected: header ISO date corrected; no clipping/overlap; existing AGB placeholders and sparse pagination unchanged.
- [ ] Corrections after order acceptance: blocked pending owner decision on an audited correction/re-approval workflow; the existing immutable accepted snapshot cannot be overwritten. Keep order list; do not replace execution workflow with Zusage/Absage buttons.

> **Address confirmation (2026-09-08):** The correct company address is **Bahnhofstrasse 85, 3613 Steffisburg**. The QR-slip typo "3612 Steffiburg" is ignored; the database record keeps `postal_code = 3613` / `city = Steffisburg`.

> **Document branding (2026-09-09):** Customer quotes and invoices use the official PS Umzug vector lockup and exact navy/orange brand colours in the shared PDF layout. Pricing, customer details, and payment data are unchanged.

> **Invoice/payment implementation (2026-09-09):** Booking confirmation now creates one invoice from the accepted versioned quote. Valid bank details gate issue; PDFs render a real Swiss QR matrix only for a valid bank-issued QR-IBAN. Finance can record partial/full payments, resend invoice links, and bookings carry paid state. Dedicated `/admin/zahlungen` and `/admin/qr-rechnung` screens are available in all five languages. The full suite passes 324/324. A secure idempotent bank-feed boundary is ready, but the dedicated QR-IBAN, verified sender domain and authorised bank feed remain external blockers.


Reference: approved audit in `.lovable/plan/ps-umzug-ag-audit-of-the-remixed-platform-2026-09-05.md`.
Design reference: PS Umzug website screenshot (orange headings, navy buttons, light grey bands).

## Phase 1 — Foundation (conditionally accepted)
- [x] Rename Multifagro/SwissMove references to PS Umzug AG across app + i18n
- [x] Brand tokens in src/styles.css (orange #F8973A, navy #19457C)
- [x] Install official logo lockup + mark + PWA icons — extracted from the SEKA vector proof ("Logo vektorisiert") into public/ps-umzug-logo.svg, ps-umzug-logo-light.svg, ps-umzug-mark.svg; favicon, apple-touch-icon and 192/512/maskable icons regenerated from the vector mark, legacy icons removed
- [x] Domain env: PUBLIC_SITE_URL / APP_URL / ADMIN_URL, remove swissmove.app defaults
- [x] German-only customer UI (keep fr/it/en dictionaries)
- [x] Company record seeded (register/VAT/bank blank); Admin editing with PS Umzug details
- [x] Service catalogue: Umzüge, Reinigung, Entsorgung, Lagerung, Transport, Offerte
- [x] Regions: Steffisburg / Thun / Bern, admin-configurable
- [x] Register cron jobs in the new database
- [x] Baseline migration captured and rebuild-verified (94 tables / 201 policies)
- [x] Partner marketplace parked (routes kept, entry points hidden)
- [x] Lead sources, queues and routing seeded (intake works end to end)
- [x] Access hardening: anon table/function grants revoked, policy helpers restored
- [x] Setup checklist + readiness dashboard row for secrets and environment
- [x] 89 security linter warnings documented and grouped in readiness dashboard (12 anon / 77 authenticated)
- [ ] Publish a first price list (business decision — 2 integration tests wait on it)
- [ ] Verify SLA_CRON_SECRET in Project Secrets and scheduled job (owner configuration)

## Phase 2 — Pricing engine, public quoting, admin dashboard
Status: HOLD. Work starts only after both Phase 1 gates close (real Price List v1 published with version + effective date and 230/230 tests; SLA_CRON_SECRET synchronised and one authenticated scheduled run verified) and a final P0/P1 check is clean.

The partner portal remains parked and will not be built in Phase 2. It belongs after the core operational chain (lead → survey → quote → booking → dispatch → crew/vehicle → completion) is in place.

### 2.1 Pricing engine (built first — everything else depends on it)
- Admin-managed price lists with version number, effective date, draft/published states; no hardcoded prices
- Half-open pricing bands; unset room count stays null (never defaults to 3.5)
- Provisional prices flagged `requires_commercial_review` stay out of the signed-off list
- Publish gate: no overlapping bands, no unmarked gaps, validated against the full rule set
- Deterministic calculation service shared by public quoting, admin and portal (single source of truth)
- Regression suite extended per band/service; must stay green on every publish

### 2.2 Public quoting (/offerte, PSU- reference)
- 11-step wizard: service, addresses, floors/lift, dates, volume/rooms, packing, disposal, cleaning, storage, contact, review
- Save/resume, validation per step, mobile-first, German-only presentation
- Instant indicative price from the pricing engine + optional on-site survey request
- PSU- reference generation, confirmation email, lead written into existing intake queues/routing
- SEO metadata per public route; no legacy domain origins

### 2.3 Admin dashboard
- Leads/quotes overview with status pipeline, filters, assignment and audit trail
- Quote detail: line items, manual adjustments with reason, versioned re-issue, PDF export
- Price list management UI (edit, validate, publish, compare versions)
- Company, services and regions maintenance (already seeded in Phase 1)
- Role-scoped access using the staged 13-role model + RLS; readiness/security dashboard stays visible

### Phase 2 acceptance criteria
- 230/230 plus new Phase 2 tests green; no new P0/P1 findings
- Every price comes from a published, versioned list; zero hardcoded rates
- Public quote → lead → admin quote flow verified end to end
- RLS regression re-run for all new tables/policies, with GRANTs on every public table
- No new legacy Multifagro/SwissMove references introduced


## Technical debt — Phase 1 compatibility identifiers
The following 19 legacy references remain intentionally in the codebase. They are not customer-visible branding, but they should be renamed or removed later where safe (likely Phase 8 hardening) to eliminate the last Multifagro/SwissMove lineage:
- `cancel_actor = 'multifagro'` in cancellation/audit logic
- Legacy `multifagro` i18n keys in de/en/fr/it dictionaries
- Diagram node IDs referencing old platform names
- `zuegelwerk` legacy admin-role references (staged compatibility until all staff are migrated to PS Umzug roles)
- `mf.lang` localStorage key for the stored interface language (renaming would silently reset every stored preference)
Do not change these now if doing so risks RLS or backward compatibility.


## Mehrsprachigkeit (DE/FR/IT/EN/AR) — Stand
- [x] `UI_LANGS` = de, fr, it, en, ar; Deutsch bleibt Standard und Fallback
- [x] Arabisch vollständig übersetzt, RTL über `<html dir="rtl">` und logische CSS-Eigenschaften
- [x] Sprachumschalter in Public-, Admin-, Portal- und Crew-Oberfläche, Auswahl wird gespeichert
- [x] Betriebsoberflächen (Buchungen, Disposition, Inventar, Team, Vorfälle, Crew-App) über `ops`-Namespace übersetzt
- [x] Admin-pflegbare Inhalte über `label_i18n` (Inventar, Leistungen, Queues, Quellen, Verlustgründe, Partnerkategorien)
- [x] Parity-Test `src/i18n/i18n-parity.test.ts` bricht bei fehlenden, überzähligen oder leeren Schlüsseln



## Phase 2 — Stage A delivered (Betriebsressourcen & Crew)
- [x] Mitarbeitende (Stammdaten, Funktionen, Qualifikationen, aktiv/inaktiv) — /admin/team
- [x] Fahrzeuge (Kennzeichen, Typ, Ladevolumen) — /admin/team
- [x] Crews und Crew-Mitgliedschaften — /admin/team
- [x] Dispositionsboard + Einsatzkalender (Crew, Fahrzeug, Startzeit) — /admin/disposition
- [x] Crew-App (/crew): Statuslauf, Zeiterfassung, Fotonachweis, Vorfallmeldung, Kundenunterschrift
- [x] Vorfälle/Schadensmeldungen und Bewertungsanfragen — /admin/vorfaelle
- [x] Öffentliche Bewertungsseite mit Einmal-Token — /:lang/bewertung/:token
- [x] RLS: Crews sehen ausschliesslich die ihnen zugeteilten Einsätze

## Phase 2 — Stage B delivered (11-Schritt-Offertassistent + CRM-Intake) — Checkpoint zur Freigabe
- [x] 11 Schritte: Route → Grösse → Objekt → Stockwerk → Zugang → Leistungen → Inventar → Zusatzleistungen → Termin → Unterlagen → Kontakt/Zusammenfassung
- [x] Auszug/Einzug mit Strasse, PLZ, Ort, Kanton, Stockwerk, Lift, Parkieren, Tragdistanz; PLZ-Prüfung (4-stellig)
- [x] Admin-gepflegter Inventarkatalog (/admin/inventar), öffentlich im Assistenten
- [x] Zusatzleistungen (8 Positionen, konfiguriert im Code-Katalog EXTRA_SERVICES)
- [x] Wunschtermin, Ausweichtermin, Startzeit, Zügeltermin-Hinweis mit Alternativen
- [x] Uploads (Fotos/Videos/Grundrisse) in den privaten Bucket, Ordner pro Anfrage, Zuordnung erst nach Lead-Erstellung
- [x] Kontaktangaben inkl. bevorzugter Sprache; Zusammenfassung mit «Ändern»-Sprüngen
- [x] Referenz PSU-YYMMDD-NNNN (verifiziert: PSU-260905-0001/0002)
- [x] Duplikatserkennung (E-Mail/Telefon, 14 Tage) automatisch bei jeder neuen Anfrage
- [x] Validierung/Fehlerzustände sichtbar, keine stillen Fehler, kein CHF 0

### Stage B checkpoint — freigegeben durch Auftraggeber (15/15, keine P0)

## Phase 2 — Stage C delivered (Betriebskette: Buchung → Disposition → Crew → Abschluss)
- [x] Buchung aus angenommener Offerte (/admin/buchungen): Kunde, Leistung, Auszug/Einzug, Termine, Inventar, Zusatzleistungen, Anhänge und Referenzen werden serverseitig übernommen, keine Doppelerfassung; zweimaliges Buchen liefert denselben Einsatz
- [x] Einsatzkalender und Dispositionsboard mit Beginn/Ende, Crew- und Fahrzeugzuteilung
- [x] Verfügbarkeit: belegte Crews/Fahrzeuge im Zeitfenster sichtbar (nur Disposition), Doppelbuchung wird in der Datenbank verhindert
- [x] Statuslauf Zugeteilt → Unterwegs → Angekommen → Einsatz gestartet → Beladen → Transport → Entladen → Abgeschlossen mit serverseitigen Zeitstempeln
- [x] Abschluss nur mit Vorher-/Nachher-Foto, Kundenunterschrift und Schlussnotiz
- [x] Crew-App sieht ausschliesslich eigene zugeteilte Einsätze; Disposition/Admin sehen denselben Status
- [x] Einsatznummern neu PSU-JOB-JJJJ-XXXXXXXX (Altnummern unverändert)
- [x] Integrationstest tests/integration/operations.test.ts (9 Prüfungen) deckt die ganze Kette ab

### Phase 2 — still open (next stages, awaiting checkpoint release)
- Site survey scheduling workflow and survey report
- Cleaning checklists, disposal workflow, storage management
- Management KPI dashboard extension, global search, audit-trail view
- Customer portal: review history, evidence download

## Phase 3 — CRM, surveys, quotes
## Phase 4 — Booking, calendar, dispatch, crews, vehicles
## Phase 5 — Crew mobile app + evidence
## Phase 6 — Customer portal, documents, communication
## Phase 7 — Invoices, payments, storage, partners
## Known, pre-existing
- Security linter: 100 warnings (was 232) about database functions callable by visitors/signed-in users. Grouped and documented in the production-readiness dashboard: 15 anon-callable (intentionally public for contact/intake, published pricing/quote reads, token-gated change-order operations) and 85 authenticated-callable (internally guarded by staff/role checks, partner self-scoping, or tokens). Retained for future security regression reviews; address remaining exposure in Phase 8.
- Integration tests: 237/239. The 2 pricing-related failures remain because no real commercial price list has been published yet.
- **SEO / crawler indexing — EXPECTED FAIL — PRE-PRODUCTION INDEXING DISABLED.** `robots.txt` returns `Disallow: /` for all bots because `SITE_INDEXABLE=false`. This is the intentional, accepted pre-production state while the Impressum, Datenschutz and final company details are pending. It is recorded as a non-blocking row in the production-readiness dashboard. Not a UAT release defect and does not reopen development. Launch release step: set `SITE_INDEXABLE=true`, verify `robots.txt` serves `Allow: /` with `Sitemap:`, confirm `/portal`, `/admin` and `/crew` remain excluded, verify `/sitemap.xml`, then re-run the crawler/SEO scan.

### Klassifikation der neuen Sicherheitshinweise (Stand Stage C)
Anonym aufrufbar (15, alle bewusst öffentlich): attach_lead_files (nur Entwurfsordner der eigenen Anfrage), change_order_by_token, company_contact, create_enquiry, create_lead, create_quote, get_public_quote, lead_tracker, public_legal_entity, public_markets, public_planner_pricing, published_pricing, respond_change_order_token, review_by_token, submit_review (Token- bzw. Formularpfade der öffentlichen Website).
Neu gegenüber dem Stand 98:
- create_booking_from_quote — angemeldet aufrufbar, prüft intern Dispositionsrolle und angenommene Offerte (P2, geprüft)
- assign_job_resources — angemeldet aufrufbar, prüft Dispositionsrolle, aktive Crew/Fahrzeug, Doppelbuchung (P2, geprüft)
- resource_busy — angemeldet aufrufbar, liefert ohne Dispositionsrolle keine Zeilen (P2, geprüft)
- is_crew_of_job — Ausführungsrecht für anonyme Aufrufer entzogen (behoben)
- jobs_execution_no_double_booking, leads_flag_duplicate_trg, security_definer_findings — kein Ausführungsrecht für anon/authenticated (behoben)
- set_job_status, record_job_confirmation — angemeldet aufrufbar, prüfen Disposition/Partner/zugeteilte Crew und die Abschlussbedingungen (P2, geprüft)
Kein Kunden-, Anfrage-, Anhang- oder Verwaltungsdatenzugriff ausserhalb des vorgesehenen Bereichs; die 89 bereits dokumentierten Hinweise bleiben sichtbar.

## Phase 8 — Reporting, audit log, hardening

## Stage D — Finance, customer invoice, management figures (delivered)

- Invoices are raised from completed jobs only (`create_invoice_from_job`); a job
  without a priced quote is refused with `pricing_required` — no CHF 0 invoice.
- Issuing is gated on the company's legal/banking details (`invoice_config_state`);
  UID/MWST and QR-IBAN are still EXTERNAL INPUT REQUIRED, so the screen shows the
  missing fields instead of issuing.
- Payments (`apply_invoice_payment`, accumulating, partial-payment aware), cancellation
  with reason, overdue marking, and an append-only `invoice_events` audit trail.
- `/admin/finanzen` (finance/staff only) and `/:lang/rechnung/:token` for the customer,
  both producing the QR-bill PDF from the shared document model.
- `/admin/analytics` now shows management figures counted from real records only
  (`management_kpis`), with CSV export and "—" where nothing exists yet.
- Tests: `tests/integration/finance.test.ts` (anon closed out, role refusal, config gate,
  unknown job, empty-range figures). Suite 249/251 — the two failures remain the known
  real-pricing blockers.

## Stage E — Sicherheitsbehebung: Rollenschutz und Flottensichtbarkeit (geliefert)

**P0 — Selbstbeförderung ausgeschlossen (Datenbankebene).**
- Spalten-Whitelist: `REVOKE UPDATE ON public.profiles FROM authenticated`,
  danach `GRANT UPDATE (full_name, ui_language)`. Alles andere ist nicht mehr
  selbst editierbar.
- Zusätzlich Trigger `profiles_guard_protected_columns` (BEFORE UPDATE,
  SECURITY DEFINER, kein Ausführungsrecht für anon/authenticated): weist
  Änderungen an `role`, `organization_id`, `id` mit `42501` ab, sofern der
  Aufrufer nicht `is_zw_admin()` bzw. Service-Rolle ist.
- Einziger genehmigter Rollenweg: `set_user_role(_user_id, _role, _note)`
  (SECURITY DEFINER, prüft `is_zw_admin()`, anon-Recht entzogen).
- Auditierung: neue Tabelle `role_change_audit` (subject, from_role, to_role,
  actor, note, created_at), Lesen nur für `is_zw_admin()`, geschrieben vom
  Trigger — also auch bei Service-Rollen-Änderungen.
- Autorisierungszustand: `has_role()`, `is_staff()`, `is_zw_admin()`,
  `is_dispatcher()`, `caller_role()` lesen die Tabelle `profiles` live; es gibt
  keinen Rollen-Claim im JWT und keinen Cache. Eine Rollenänderung wirkt sofort
  beim nächsten Request, ohne erneute Anmeldung.

**P1 — Flotten- und Compliance-Daten eingeschränkt.**
- Policy `vehicles read authenticated` (USING true) entfernt.
- Neu `can_view_fleet()` = `is_staff() OR ops_manager OR dispatcher`
  (anon-Ausführungsrecht entzogen) und Policy `vehicles fleet read`.
- Neu Policy `vehicles assigned crew read`: Crew/Fahrer sehen nur Fahrzeuge,
  die einem eigenen Auftrag zugeteilt sind (`is_crew_of_job`).
- `vehicles staff manage` (is_staff) unverändert. Kunden, Partner und fremde
  Rollen sehen keine Zeile — auch nicht per direkter Fahrzeug-ID.
- `assign_job_resources` und die Compliance-Prüfungen bleiben unverändert und
  weiterhin getestet.

**Sicherheitsinventar nach der Behebung:** 113 Hinweise — 16 anonym aufrufbar
(unverändert), 97 angemeldet aufrufbar (+2 gegenüber 111: `set_user_role` und
`can_view_fleet`, beide intern rollen-geprüft). Der Trigger
`profiles_guard_protected_columns` ist für niemanden direkt aufrufbar.

**Neue Tests:** `tests/integration/profile-security.test.ts` (7),
`tests/integration/fleet-access.test.ts` (8).

### Nachweislage der Testzählung (Historie, nicht löschen)
- **259/261** (früherer Checkpoint) — **überholt und unbestätigt**: die damals
  gemeldeten Tests lagen nicht vollständig im Repository.
- **249/251 über 19 im Repository nachgewiesene Dateien** — nach der
  Evidenzprüfung die vertrauenswürdige Grundlinie.
- **269/271 über 24 Dateien** — nach der P0/P1-Konsolidierung (Zahlungen,
  Bewertungen, Fahrzeug-Compliance, Vorfälle, Rechnungs-Nebenläufigkeit).
- **284/286 über 26 Dateien** — aktueller Stand nach dieser Sicherheitsbehebung.
  Beide Fehlschläge sind weiterhin ausschliesslich die echten Preisblocker in
  `tests/integration/public-quote.test.ts`.

## Post-launch roadmap — NOT authorised for implementation

Documentation only. Nothing in this section may be built without a separate,
explicit authorisation. Feature development remains closed.

- **Echte Routendistanz** ersetzt die manuelle Distanzbestätigung
  (Routing-Provider konfigurieren, `distance_source = routing`).
- **Leere Tarifkategorien** aus der Preisliste: Stunden-/Teamansätze,
  Fahrzeugansätze, Mindeststunden, Etagen-/Lift-/Tragweg-Zuschläge in CHF,
  Packmaterial, Möbelmontage, Schwergut, Lagerung, Abend-/Wochenend-/
  Feiertagszuschläge, Aktionen/Promotionen.
- **GPS-Ortung der Teams** in der Crew-PWA.
- **WhatsApp-Zustellung** von Offerten und Auftragsdokumenten.
- **Partner-Marktplatz**: Entscheid über Aktivierung, Umfang oder Löschung
  (Code und Tabellen bleiben bis dahin geparkt und nicht erreichbar).
- **Profil-Grant-Härtung** (technische Schuld aus der Sicherheitsprüfung).
- **Eigene Fotografie von PS Umzug** ersetzt die Stockbilder.

### Akzeptierte Vorproduktionsbedingung

`http:robots` = **EXPECTED FAIL — PRE-PRODUCTION INDEXING DISABLED**.
Kein Release-Defekt, kein Code-Fehler.

Startregel: `/portal`, `/admin` und `/crew` bleiben in jedem Fall von der
Indexierung ausgeschlossen. `app.ps-umzug.ch` wird nicht automatisch zur
SEO-Seite — `ps-umzug.ch` bleibt die öffentliche Hauptseite, und welche
App-Seiten überhaupt indexiert werden, ist ein bewusster Startentscheid.

## Partner-Bereich reaktiviert (08.09.2026, freigegeben)

- [x] `/de/partner` — öffentliche Partnerseite: Vorteile, Zielgruppen, Ablauf,
      benötigte Dokumente, Vergütungsmodelle (nur Modelle, keine Ansätze).
- [x] `/de/partner/registrieren` — Bewerbungsassistent mit Partner-Login.
- [x] `/partner` — Partner-Arbeitsbereich mit Referenz, Bewerbungsstatus,
      Aufträgen und Ausschreibungen.
- [x] Navigation: „Partner werden" wieder im Hauptmenü (5 Sprachen).
- [x] Handelsregisternummer CHE-321.940.577 (HR Kanton Bern) in den
      Firmenangaben erfasst; Impressum zeigt sie automatisch.
- [ ] MWST-Nummer offen — im Handelsregisterauszug nicht enthalten.
- [ ] Owner-Admin-Konto offen — E-Mail-Adresse des Inhabers noch nicht geliefert.

## Pre-launch batch — 2026-09-08
- [x] Partner-only admin section live again: `/admin/partner` list + `/admin/partner/$reference` review page, wired to the staff-only `partner_internal` fields, with a "Partner" tab in the admin navigation
- [x] Owner admin walk-through verified as govand.mero@gmx.ch (overview, leads, quotes, jobs, dispatch, finance, partner, readiness — no console errors)
- [x] Terms, cancellation, privacy and Impressum published (DE, version 1) — privacy/Impressum are Swiss-standard drafts awaiting legal sign-off
- [x] Commercial register number CHE-321.940.577 recorded (Handelsregisteramt Kanton Bern extract, 24.06.2026)
- [ ] MWST (VAT) number — NOT in the supplied documents; readiness stays blocked
- [ ] QR-Rechnung bank details (account holder, IBAN/QR-IBAN, bank) — NOT supplied; QR bill stays invalid until entered
- [ ] Sending domain + MX/SPF/DKIM for ps-umzug.ch — owner controls DNS, setup pending
- [ ] SLA_CRON_SECRET value shared between Project Secrets and the scheduled job — required before the cron run can be verified end to end

- [x] Record the owner's account CH67 0630 0506 4911 2511 0 on legal_entities as both `iban` and `qr_iban`; bank label cleared (no bank name is printed). Superseded account CH61 0900 0000 1526 1283 4 removed.
- [x] Record MWST CHE-321.940.577 MWST on legal_entities

- [x] Quote PDF: company header, customer/route/date block, discount + peak lines, reference prefix PS- (was MF-).

## 2026-09-09 — Invoice email, bank sweep, QR on the ordinary account
- `/admin/offerten`: per-quote "email invoice" button (`notifyInvoiceForQuote`, staff only, recipient read from the stored invoice).
- `POST /api/public/cron/bank-payments`: scheduled bank sweep; bearer `BANK_FEED_SECRET` (falls back to `SLA_CRON_SECRET`), only accepts payments booked on the configured company account, matches via `import_bank_payment()` and settles invoice + booking.
- Swiss QR bill now prints from the ordinary account `CH67 0630 0506 4911 2511 0` using reference type NON (invoice number in the message); a bank-issued QR-IBAN still switches to structured QRR. `invoice_config_state()` returns `reference_mode`.
- Bank details, MWST number and address stay editable at `/admin/legal/company`; QR bills at `/admin/qr-rechnung`.
- Open: authorised bank-feed credentials/scheduler, verified sending domain.
- Suite: 324/324.
- 2026-09-09 end-to-end walk (executed on the live database, test record removed afterwards): booking created from an accepted quote → invoice PSU-INV-2026-0003 issued automatically (CHF 1081, due +30d) → manual part payment CHF 500 → booking `partially_paid` → bank sweep POST with CHF 581 matched by invoice reference → invoice and booking `paid`. Readiness rows `payments` (ok) and `bank_feed` (partial, credentials missing) updated; `BANK_FEED_SECRET` added to the secrets check.

## 2026-09-09 — Offertenformat v2 + Mindestverrechnung 4 Stunden (Vorschau)
- `quotes` erweitert (version, pricing_mode, billing_basis, options, accepted_*); neue unveränderliche Tabelle `quote_versions` (Staff-RLS).
- Preislisten-**Entwurf** v1000 mit `labour:min_hours = 4` und `labour:min_hours_basis_person = 1`. Veröffentlichte Preisliste v1 unverändert.
- `src/lib/pricing.ts`: `minimumBillingConfig()`, `minimumBilling()`, `flatPriceWithMinimum()` — Personentarif max(Dauer, 4) je Person, Teamtarif einmalig, Pauschale unverändert, interner Kostensatz nur intern.
- PDF (`documents/pdf.ts`, `document-model.ts`, `labels.ts`): Version/Status, Optionstabelle (nicht gewählte Optionen ausserhalb aller Summen), Aufwandtabelle, Mindestverrechnungshinweis, Annahmeblock, „Seite x von y“. MWST-Zeile druckt neu genau den Satz der Berechnung (keine doppelte Prozentangabe).
- Visuelle Kontrolle: je ein Beispiel-PDF Pauschale und Stundenangebot, beide Seiten geprüft.
- Tests: `src/lib/minimum-billing.test.ts`; Gesamtlauf 335/335.
- Offen (Eigentümer): Stundentarif pro Person, allfälliger Teamtarif, interner Kostensatz, Gültigkeitsbeginn der neuen Preislistenversion, Vertragsfassung mit „4 Stunden“. Ohne Tarife bleibt ein Stundenangebot bewusst nicht freigebbar; nichts veröffentlicht, nichts versendet.

## 2026-09-09 — Schritt 1: Preisberechnung und versionierte Mindestverrechnung
- Migration: `pricing_configurations.min_hours` (numerisch, > 0) und `min_hours_basis` (Textprüfung `person`/`team`, Paar-Constraint). Basis ist ein validiertes Wort, kein Preiswert, und hängt an genau einer Preislistenversion.
- Öffentliche Projektion `public_planner_pricing` liefert neu auch kundenseitige `labour`-Tarife; der interne Kostensatz (`cost`) ist auf Datenbankebene ausgeschlossen. Neue Lesefunktion `public_minimum_billing` gibt ausschliesslich Mindestdauer und Basis der geltenden Version zurück.
- Daten: Entwurf v1000 (unveröffentlicht, Markt CH) trägt `min_hours = 4`, Basis `person`. Die beiden früheren Hilfszeilen unter `labour` wurden entfernt. Veröffentlichte Listen v1/v2/v999 unverändert; Publikation nur auf ausdrückliche Anweisung.
- Code: `parseMinimumBillingPolicy`, `PlannerPricing.minimumBilling`, `INTERNAL_ONLY_PARAM_KEYS` (`planner-pricing.ts`); `minimumBillingConfig`, `hourlyQuotingBlockers`, `canQuoteHourly`, `customerFacingBilling` (`pricing.ts`). Validierung ist modusspezifisch: fehlende Stundentarife blockieren nur Stundenofferten, nie Pauschal-/Mengenofferten aus v1.
- Tests: Unit 162 bestanden, Integration 181 bestanden, 0 übersprungen, 0 fehlgeschlagen (Gesamt 343). Synthetische Testtarife sind im Testfile als solche markiert und nie in der Datenbank.
- Offen (Eigentümer): Stundentarif pro Person, allfälliger Teamtarif, interner Kostensatz, Gültigkeitsbeginn der neuen Version, Vertragsfassung „4 Stunden“.
- Schritt 2 (offen, Design vorgemerkt): `quote_versions` auf Datenbankebene append-only (kein UPDATE/DELETE, auch nicht für Staff), Annahme bindet Version, Optionen und Totale und weist veraltete Versionen zurück.

## 2026-09-09 — Step 1 handover (accepted, closed)
- Tested commit: `60ed4c1` ("Preisliste v1000 erstellt"). Commands: `bunx tsgo --noEmit`, `bunx vitest run tests/integration/public-quote.test.ts --reporter=verbose`, `bunx vitest run`.
- Test evidence: public-quote integration file 14 passed / 0 failed / 0 skipped — including the two previously failing published-pricing checks ("gives a signed-in portal user the published prices", "returns exactly one published version and no internal metadata") and the two new ones ("never projects a cost rate to the estimator", "exposes only the minimum-duration policy, never a tariff or a cost"). Full suite: 31 files, 343 passed, 0 failed, 0 skipped.
- No published configuration changed: v1 (published, eff. 2026-09-06), v2 (published, eff. 2030-01-01) and v999 (fixture, eff. 2099-01-01) all carry `min_hours = null` and unchanged `updated_at` of 2026-09-06. Only draft v1000 (unpublished) was touched.
- Version label: internal numbers stay immutable. Customer-facing documents must NOT print "Version 1000". Proposal — display label derived from the ordinal position among operational (non-fixture) published versions, so v1 prints "Preisliste 1" and the next published list prints "Preisliste 2", regardless of the internal number. Requires owner sign-off; not implemented.
- Hourly quotations stay blocked until owner supplies: CHF hourly rate per person, whether a separate team rate applies, effective date of the new rule, optional internal hourly cost.
- The four-hour contract text is a WORKING DRAFT only; final contractual wording and related terms await formal owner approval.
- M3: Customer acceptance currently supports supplements. Acceptance of complete quotation versions and their selected options is planned for Step 2.

## Step 1 closed — approved numbering rule (awaiting Step 2 instruction)
- Operational price-list number is assigned IMMUTABLY at publish time (current = Price List 1, next approved publication = Price List 2); never derived dynamically from record counts.
- Operational number must be preserved in each quotation snapshot; internal version IDs (e.g. v1000) stay hidden from customers.
- Draft v1000 remains unpublished; hourly quotations blocked pending owner inputs (hourly rate, team-rate decision, effective date, optional internal cost rate, final contract wording).
- No Step 2 work and no publication authorised yet.

## Price List 2 published + Step 2 (acceptance binding)
- Price List 2 (internal v1000) published: all values copied from Price List 1, plus `labour:per_person_hour = CHF 210`, minimum 4 hours per person, effective from the day after publication. No separate team rate, no internal cost rate.
- Publishing no longer retires a list that is still in force: a future-dated list takes over on its effective date. Regression fixtures (v2 "integration test", v999) are never archived.
- `pricing_configurations.operational_number` assigned immutably at publish (1 = current list before, 2 = new list), enforced by trigger, and stamped onto every quotation snapshot (`quote_versions.price_list_number`, `quotes.price_list_number`).
- `quote_versions` is append-only at database level (update/delete raise); snapshots are written automatically when a quotation's price, options or price list change.
- Customer acceptance: `accept_public_quote(reference, contact, version, total, name)` binds the exact version, options and total; stale versions and amount mismatches are refused. Public quote page shows the acceptance panel (DE/FR/IT/EN/AR).
- Tests: 31 files / 343 tests passed.

### Still blocked (owner/external)
- Sending domain DNS/MX/SPF/DKIM/DMARC for ps-umzug.ch and a real test invoice — needs DNS control and the recipient address.
- Customer document upload portal on the offer page — needs decision on which documents and retention.

## 2026-09-10 — Price List 2 held, customer uploads, company-wide 4-hour minimum
- **Price List 2 held before activation.** Publication approval outstanding, so internal v1000 (CHF 210 per person and hour, 4-hour minimum, effective 2026-09-11) was withdrawn to `archived` before it took effect. Price List 1 (v1, published 2026-09-06) remains the only list in force; every existing quotation keeps its agreed price. Operational number 2 is consumed and immutable — the next approved publication will be Price List 3.
- **Version/acceptance evidence** (`tests/integration/quote-versioning.test.ts`, 9/9 passed): first version written on store; update and delete on `quote_versions` refused even with service-role rights; new version appended on total change; customer sees newest version/total; acceptance of an outdated version refused (`quote_version_stale`); acceptance with a wrong total refused (`quote_total_mismatch`); acceptance of the exact shown version and total recorded; customer file linking requires the matching contact and never changes the accepted offer.
- **Customer upload area (preview only, not published).** New `quote_attachments` table (staff-read/delete only) plus `attach_quote_files()` — contact-verified, PDF/JPG/PNG only, max 25 MB, kinds floor plan / inventory list / photos. Rental contracts are not requested. Uploading never changes the offer, price, scope or acceptance state; commercial changes keep going through review and versioning. UI: `UploadPanel` on `/$lang/offerte/$ref`, DE/FR/IT/EN/AR.
- **Company-wide minimum: 4 billable hours** on every job and service commitment, all service types and booking channels. `COMPANY_MIN_BILLABLE_HOURS`, `meetsCompanyMinimum()` and `packagePriceFloor()` in `src/lib/pricing.ts`; hourly uses the approved person/team basis, fixed prices must already cover the floor, actual worked time recorded separately, previously accepted quotations untouched.
- Full suite: 32 files / 357 tests passed, 0 failed, 0 skipped.

### Awaiting owner
- Written publication approval for the CHF 210/person/hour rate plus exact activation date and time (Europe/Zurich).
- Sender address and DNS control confirmation for ps-umzug.ch; no test invoice sent.

## 2026-09-10 (later) — Four-hour minimum: mandatory enforcement
- **Active rule source.** The minimum no longer depends on a price list. New table `minimum_billing_policy` holds the approved, active company rule (4 hours, basis `person`, approver, approval date, effective from, status). Withdrawn Price List 2 is irrelevant to enforcement; Price List 1 stays the only list in force.
- **No approved fixed-price basis exists.** With no active hourly tariff, no monetary floor can be derived, so the earlier CHF 2,413 statement is NOT supported by an approved basis and is withdrawn. `minimum_gate_state()` returns `no_approved_minimum_basis`.
- **Hard block, not a warning.** `minimum_gate_state(created, attested)` gates three choke points: customer acceptance (`accept_public_quote`), release/acceptance of a customer offer (trigger on `quotes_customer` for status `sent`/`accepted`), and job creation (trigger on `jobs_execution`). Refusal is `minimum_hours_unverified`.
- **Only two ways through:** an active hourly tariff on the price list in force, or a recorded, named staff confirmation (`attest_minimum_hours(kind, id, note)`, staff-only, note mandatory, stored on the offer with user and timestamp). Offers created before the policy's effective timestamp and offers already accepted are untouched.
- **Evidence** (`tests/integration/minimum-enforcement.test.ts`, 7/7 passed): active policy is 4 h / person; gate reports `no_approved_minimum_basis` without a tariff; acceptance of a new unverified offer refused; acceptance allowed after a recorded confirmation; pre-policy acceptance untouched; release of an unverifiable customer offer refused then allowed after confirmation; job creation from an unverified offer refused.

### Open tasks requested 2026-09-10
- [ ] Sender domain setup for offerten@ps-umzug.ch and rechnung@ps-umzug.ch, then a real test invoice (needs DNS access + recipient).
- [ ] Publish Price List 3 with the CHF 210 rate once written approval + Europe/Zurich activation time arrive; then open hourly quoting.
- [ ] Phase 6 AI Assist: photo inventory, lead triage, crew voice notes, multilingual communication, briefing generator.
- [ ] Publish the offer and AGB pages live including the customer upload area (currently preview only).
- [ ] Dispatch recommendation assistant (availability, skills, capacity, working-time restrictions, routing; dispatcher approves).
- [x] Anonymised quotation PDFs and acceptance/upload screenshots for owner review (2026-09-10).

## 2026-09-10 (final) — No approval path: calculation basis is mandatory
- **Staff confirmation no longer releases anything.** `minimum_gate_state(created, total, people)` now passes only when (a) the offer predates the policy, or (b) an approved hourly basis is active on the price list in force AND the price after discounts reaches `4 h x rate (x persons)`. Reasons returned: `no_approved_calculation_basis`, `staffing_unknown`, `below_minimum`. `attest_minimum_hours()` remains as an audit note only and grants no exemption (documented in the function comment).
- **Three choke points unchanged:** release of a customer offer, customer acceptance, job creation — all refuse with `minimum_hours_unverified`.
- **Customer wording:** the public offer page now names the reason instead of a generic error (DE/FR/IT/EN/AR).
- **Evidence** (`tests/integration/minimum-enforcement.test.ts`, 8/8): active policy 4 h/person; gate reports `no_approved_calculation_basis`; acceptance blocked; acceptance still blocked with a staff note; note kept as audit evidence without acceptance; pre-policy offer still acceptable; customer-offer release blocked with and without a note; job creation blocked with a note.
- Full suite: 33 files / 365 tests passed.
- **Owner deliverables produced:** anonymised draft documents `muster-offerte.pdf`, `muster-rechnung.pdf` (both stamped ENTWURF — NICHT FREIGEGEBEN) and screenshots of the acceptance panel, upload area and the blocked acceptance.
- **Email:** provider is Lovable's built-in managed email (own sender domain required). Project status `not_started`; the owner must start domain setup for ps-umzug.ch and add the name-server records shown at that point. Sender addresses stay offerten@ps-umzug.ch and rechnung@ps-umzug.ch. DNS access and test recipient still pending.

## Stand 2026-09-11
- Preisliste: aktiv bleibt Preisliste 1. Die nächste Veröffentlichung ist **Preisliste 3** (Preisliste 2 wurde zurückgezogen und ist verbraucht). CHF 210 pro Person und Stunde ist bestätigt; **Teamansatz und Aktivierungszeitpunkt (Europe/Zurich) stehen aus** — bis zur schriftlichen Freigabe bleibt die Veröffentlichung gesperrt und Stundenofferten bleiben blockiert.
- KI-Assistenz: Einsatzbriefing (`crew_briefing`) implementiert — Vorschlag aus den erfassten Auftragsdaten, ohne Beträge und ohne Zusagen, Freigabe über die Vorschlagsliste. Funktion bleibt bis zur Aktivierung im Admin ausgeschaltet.
- Dispositionsvorschlag und mehrsprachige Kommunikation: weiterhin in der Warteschlange (nicht beauftragt).
- E-Mail: Absenderdomain `ps-umzug.ch` ist noch nicht eingerichtet. Testrechnung geht an `info@ps-umzug.ch`, sobald die Domain verifiziert ist.

## 2026-09-12 — Dispatch assistant, AI features switched on
- **Dispatch assistant built** (`src/lib/dispatch-assist.ts`, `src/components/admin/DispatchAssistant.tsx`, shown on `/admin/disposition`). Deterministic ranking from recorded data only: active crew members and headcount, skills derived from the recorded service/extras/inventory, crew leader and driver presence, restricted employment, daily team capacity, same city/canton routing, and existing bookings in the job window. Vehicles are ranked by active state, insurance/inspection/service dates, capacity fit against the recorded inventory volume, and conflicts. Blocked options stay visible with the reason. Nothing is assigned until the dispatcher approves; assignment still runs through the protected `assign_job_resources`, and the approved proposal is logged in `ai_suggestions`. Unknown volume, region or date are shown as open points, never guessed. Labels DE/FR/IT/EN/AR.
- **Evidence:** `src/lib/dispatch-assist.test.ts` 6/6, i18n parity 6/6, typecheck clean.
- **AI Assist switched on:** photo inventory, lead triage, crew voice notes, crew briefing and dispatch recommendation are enabled in `ai_feature_flags`. Monthly budget stays 0.00 (no cap) — the owner sets a cap in `/admin/ai-assist/einstellungen`.
- **Offer and AGB pages** are live in the app (AGB, Impressum, Datenschutz, Widerruf published in German; upload area on `/$lang/offerte/$ref`). Public search indexing stays off until the owner sets the production URLs.

### Still owner/external
- [ ] Sender domain: no email domain exists in the workspace yet. Owner must run the email setup for ps-umzug.ch and add the displayed DNS records; no test invoice can be sent before that.
- [ ] Bank-issued QR-IBAN and bank-feed credentials — invoices keep plain payment details until a valid QR-IBAN is stored.
- [ ] Price List 3 (CHF 210) — written approval, team-rate decision, exact Europe/Zurich activation time.
- **Payment slip confirmed (2026-09-12).** The owner's bank slip shows the ordinary account CH67 0630 0506 4911 2511 0 used without a structured reference. Invoices already print exactly this: a scannable Swiss QR (SPC/0200, reference type NON) with the invoice number as payment reference, creditor PS Umzug AG, Bahnhofstrasse 85, 3613 Steffisburg (owner confirmed 3613/Steffisburg over the "3612 Steffiburg" spelling on the slip). A bank-issued QR-IBAN is therefore no longer a blocker; it would only add a structured QRR reference for automatic matching.

## 2026-09-12 — Portal payment status, matching test, QR verification

- `/portal/rechnungen` now lists the organisation's issued invoices (RLS-scoped, drafts
  excluded) with amount, open balance, payment reference, derived state
  (`unpaid` / `processing` / `paid`) and the reconciliation note; DE/FR/IT/EN/AR.
- Company screen: `qr_iban` accepts any structurally valid IBAN. A bank-issued
  QR-IBAN prints QRR; the ordinary account prints NON — both are valid Swiss QR bills.
- End-to-end matching test (live DB, test record removed afterwards): test invoice
  CHF 1234.55 → part payment 234.55 matched (`processing`) → 1000.00 matched and
  settled (`paid`) → unknown reference stayed `unmatched` → replayed event returned
  `duplicate`. Payment reference resolved to the correct invoice in every case.
- QR verification: SPC payload built from the stored creditor, rendered and decoded
  with a scanner — creditor, CHF 1234.55, NON mode and the invoice number as reference.
- Still external: bank-issued QR-IBAN (optional, only for structured QRR), authorised
  bank-feed credentials/scheduler, and the sender domain for ps-umzug.ch (email setup
  is `not_started`, so no invoice mail can be sent yet).

## 2026-09-12 — Price List 3 published (team tariff)

- Owner decision: the hourly rate is a **team rate**, one service unit including staff,
  vehicle, tools, equipment, protection, planning and consumables — never multiplied by
  head count. Activation: today (2026-09-12).
- `pricing_configurations` version 1001, operational number **3**, status `published`,
  `effective_from = 2026-09-12`, `min_hours = 4`, `min_hours_basis = team`.
  Labour rule `labour:per_team_hour = CHF 210`. All other values copied from Price List 1.
- `minimum_billing_policy`: person basis superseded, new active row basis `team`, 4 hours
  (floor CHF 840). Quotes accepted before this row's effective time keep their terms.
- Dispatch ranking could not be run for real: `internal_teams`, `crew_members`,
  `employees` and `vehicles` are all empty — crews and vehicles must be entered first.
- Bank feed: owner has not yet requested access from the bank; manual matching stays.

## 2026-09-12 — Value additions, Stage 1: live job tracking (done)

- `jobs_execution` gained `tracking_token` (unique, random, default for new rows),
  plus `calendar_event_id` / `calendar_synced_at` reserved for Stage 2.
- `job_tracking_by_token(text)` is the only public read: reference, status,
  appointment window, town names, crew name, company phone and the status history —
  no prices, no addresses, no internal notes. Anon EXECUTE is intentional; the
  token is the capability (same pattern as the review and invoice links).
- Public page `/:lang/auftrag/:token` (`src/routes/$lang.auftrag.$token.tsx`),
  noindex, refreshes every 60 s, DE/FR/IT/EN/AR incl. RTL. Progress line folds
  loading/in_transit/unloading/paused into "in progress"; cancelled is shown as such.
- Office: the job dialog in `JobsBoard` shows and copies the customer link.
- Tests: `src/lib/job-tracking.test.ts` (4) plus i18n parity, all green. Verified in
  the browser with a demo job and with an invalid token.
- Unchanged: pricing, minimum-hour enforcement, email, bank and publication holds.

### Next stages (approved plan)
2. Google Calendar sync (needs the owner's Google connection) — 3. review requests —
4. SMS/WhatsApp (needs provider) — 5. office calendar view.

## 2026-09-13 — Dispatch calendar + review invitations
- Dispatch board: day/week/month calendar view (read-only, assignment unchanged), `src/lib/dispatch-calendar.ts` + `DispatchCalendar.tsx`, 6/6 tests.
- Review invitations: `review_settings` table (off by default, Google link empty), `review_request` e-mail template (DE/FR/IT/EN), staff-gated `notifyReviewRequest`, fired when a job is set to `verified`. Sending stays queued until the sender domain is verified.
- Public review page: high ratings (>= threshold) see the Google link, lower ratings stay internal.
- Open: Google Calendar sync needs the owner's Google account authorisation; e-mail delivery needs DNS/sender verification; Price List 3 hold unchanged.
- Known: `tests/integration/minimum-enforcement.test.ts` + `quote-distance.test.ts` (9 tests) fail since Price List 3 was published — fixtures assume price list version 1 and no active hourly tariff. Not caused by this change.

## Owner feedback 2026-09-25
- [ ] DOP simplification: Neue Anfragen → Offerten → Aufträge (approved plan, archive, actions, nav, Postfach identity)
- [ ] End-to-end tests A–L (Rechner → Zusammenfassung → Offerte → PDF, desktop + mobile), incl. discounts, disposal, packing, dowel holes, notes, uploads, PDF cleanup


## Go-live plan (fixed scope, 26.09.2026)
- [ ] Notizen 5: approved inventory volumes now reach calculation; missing volumes block estimates, not requests. Destination access, direct box entry, combined-service simplification, default billing-address storage, cleaning-only summary, attachment view/download and separately titled order PDF have partial implementations. The unused alternate date has been removed from new request submission; older data stays readable. Order PDF release checks accepted version number and saved price/options, but full operational snapshot verification remains open. The misleading order "Senden" action (which resent the offer) is removed until actual order sending exists. Still open: full offer editing with audited recalculation/versioning, canonical order details, PDF layout cleanup, document sending, all A–E stored-data/PDF lifecycle checks. Authenticated browser verification blocked pending a named test account. Field map: docs/DOP-FIELD-MAPPING.md.
- [x] Fix 1: Orders "Testdaten anzeigen" (visibility only) + Test label
- [x] Fix 2: Order shows move details from linked accepted offer (source of truth)
- [x] Fix 3: Customer page — no "zur Prüfung senden" on released offers; real progress step
- [x] Fix 4: Dowel label CHF 4.50 (no rounding); furniture CHF 200 ≥3.5 Zi via price list 1031; terms 4h (DE v2)
- [x] Fix 5: Lint errors (1 left in auto-generated file, not editable)
- [x] A6 order verified; A5 reload/duplicate check passed
- [ ] Phases 3–10
- [ ] A–L desktop + mobile to PDF — price engine A–L on live list 1031: 16/16 pass (26.09); UI desktop/mobile + PDF runs open
- [ ] Real email test via info@ps-umzug.ch — blocked: email domain ps-umzug.ch not yet set up (owner DNS)
- [ ] Invoices — use normal IBAN (no QR-IBAN); bank name stays blank until owner confirms
- [ ] Final go-live report

## DOP Tenant 001 migration (approved plan 2026-10-03)
- [x] Step 1a: baseline record counts (read-only)
- [ ] Step 2+: tenant layer in DOP Gulf Edition project — must be done from that project (blocked: cannot edit another project from here)

## Customer dashboard + move-day checklist (approved plan 2026-10-08, plan only)
- [ ] Build after go-live, preferably in DOP Gulf Edition (blocked: feature freeze + 4 open questions in plan)
- [ ] Assistant audit screen: plan together with customer assistant (blocked: assistant not approved)

## Notizen 7 (09-10-2026)
- [x] Vorname/Nachname getrennt (Planer DE/FR/IT/EN/AR, Offert-Editor, Korrektur)
- [x] Statusfarben: offen blau, angenommen grün, abgelehnt rot, "In Auftrag umgewandelt" markiert; Ablehnen/Wieder öffnen mit Grund
- [x] Kundendaten-Korrektur nach Annahme (administrativ, Verlauf, Snapshot unverändert); vertragliche Änderungen via Nachtrag mit Kundenfreigabe
- [x] DD-MM-YYYY auch in Offerten-/Auftragsliste
- [x] Auftrags-PDF zeigt korrigierte Kontaktdaten (entschieden 09-10-2026)

## Notizen 8 (09-10-2026)
- [x] Auftrags-PDF zeigt korrigierte Kontaktdaten; Originalofferte (PDF) unverändert abrufbar
- [x] Umwandlung angenommen → Auftrag erneut geprüft; Fehler bei Offerten ohne Telefonnummer behoben
- [x] Mobile Karten für Offerten-/Auftragsliste (kein seitliches Scrollen)
- [x] Planer-Preisbox: Rohschlüssel disposalVolume/disposalHours behoben (5 Sprachen)
- [x] PDF-Datum im Format TT-MM-JJJJ
- [ ] Blockiert: E-Mail-Domain notify.ps-umzug.ch (DNS) + echte Offert-/Rechnungsmails
- [ ] Blockiert: AGB-Platzhalter (Inhalte von PS Umzug)

## Notizen 9 (09-10-2026)
- [x] A–L Desktop/Mobil erneut inkl. PDF (13/13); Rappen-Rundung korrigiert
- [x] Admin-Seiten 5 Sprachen geprüft; Arabisch speicherbar + RTL ok
- [ ] Offen (Entscheid): DOP-Arbeitsseiten (Anfragen/Offerten/Aufträge u. a.) nur Deutsch, ca. 500 Texte
- [x] Auftrag ohne Umzugsdatum nicht bestätigen; "Datum ausstehend"
- [x] Positionsaufstellung geprüft (70/70 echte Anfragen); Umzug bleibt eine Position (Entscheid offen)
- [x] AGB-Liste erstellt; [ ] wartet auf Antworten PS Umzug
- [x] Anleitung erstellt; [ ] wartet auf Start der E-Mail-Einrichtung

## Notizen 10 (09.10.2026)
- [x] Admin-Arbeitsseiten vollständig in 5 Sprachen (Namespace dop), DE Standard, AR RTL, Desktop/Mobil
- [x] Umzug-Aufschlüsselung (Grundpreis/Volumen/Distanz) unter Position, gleich in Formular, Kundenseite, PDF — Totale unverändert
- [x] AGB-Korrekturentwurf DE mit Vergleich (alt/neu/Grund), nicht aktivieren
- [ ] E-Mail notify.ps-umzug.ch — BLOCKIERT: Domain-Einrichtung durch Nutzer
- [x] E2E-Kundenreise inkl. Nachtrag, Datumsprüfung, Preiskonsistenz (Testdaten)
