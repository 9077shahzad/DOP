# PS Umzug AG — Digital Operating Platform · Handover Manifest

> **Historical manifest — not the current release status.** Phase, test,
> branding and configuration statements below describe earlier checkpoints.
> See `docs/RELEASE-STATUS-2026-10-23.md` for today's verified launch gate.
> Release remains **NO-GO** pending email verification, operational checks
> and the required human approvals.

Status: Phase 1 (foundation) in progress. This platform is a **separate product** for
PS Umzug AG, Steffisburg. It has its own database, branding, users and configuration and
must never read from or write to any other company's data.
**No secret values appear anywhere in this file.**

---

## 1. Architecture

Single full-stack application on one Supabase (Lovable Cloud) project.

- **Frontend + server**: TanStack Start v1, React 19, Vite, Tailwind v4. File routing in
  `src/routes/`. Server logic runs as TanStack server functions (`createServerFn`) plus a
  few HTTP server routes under `src/routes/api/public/`. Deployed as an edge Worker bundle.
- **Backend**: Supabase Postgres — 94 tables, RLS enabled everywhere, ~200 policies, ~142
  SQL functions. Pricing resolution, lead routing, allocation, SLA escalation and invoicing
  live in SQL, not in the frontend.
- **Surfaces**: public site and quote planner (`/:lang/…`), customer portal (`/portal`),
  partner portal (`/partner`, parked for Phase 1), admin console (`/admin`).

Key directories: `src/routes` · `src/components` · `src/lib` (`*.server.ts` /
`*.functions.ts` are server-only) · `src/integrations/supabase` (generated) ·
`supabase/migrations` · `tests/` (unit + live-project integration tests).

## 2. Database baseline

- `supabase/migrations/20260101000000_baseline_schema.sql` is the **structure-only baseline**
  of this project's schema (tables, enums, functions, triggers, indexes, grants, RLS,
  policies). It was verified by rebuilding it into a throwaway PostgreSQL 17 instance:
  94 tables, 201 policies, 89 triggers, zero SQL errors.
- Every later change is a normal incremental migration on top of the baseline.
- Rebuild check: apply the baseline, then the incremental migrations in filename order.

## 3. Build and test

- Toolchain **Bun**. `bun install` · `bun run dev` (port 8080) · `bun run build` ·
  `bun run test` (unit) · `bun run test:integration` (needs the live project + service role).
- Typecheck with `tsgo`.
- Current suite: 228 passing / 2 failing. The two failures are
  `tests/integration/public-quote.test.ts` — they require a **published price list**, which
  is a business decision for PS Umzug (see §6), not a code defect.

## 4. Branding and language

- Official colours: orange `#F8973A`, navy `#19457C` (primary brand colour), white, light
  grey `#F2F5F8` — all semantic tokens in `src/styles.css`; derived tints only for hover,
  backgrounds and secondary UI.
- Logo: `src/components/brand/Logo.tsx` is a reserved slot rendering a typographic
  placeholder. The official `ps-umzug-logo.svg` (lockup) and `ps-umzug-mark.svg` (favicon,
  PWA icons, compact UI) have **not been supplied yet** — nothing is redrawn or invented.
- German is the only visible UI language (`UI_LANGS`); the fr/it/en dictionaries remain
  underneath for later activation. Swiss German conventions (ss, CHF, dd.mm.yyyy).

## 5. URLs

No production or preview URL is hard-coded. `src/lib/site.ts` reads, in order:
`PUBLIC_SITE_URL` / `SITE_URL` (and the client-prefixed variants), then the browser origin,
otherwise **no absolute origin at all** — in which case canonical, hreflang, Open Graph and
JSON-LD URLs are simply omitted rather than guessed. `APP_URL` and `ADMIN_URL` follow the
same rule for links in outbound mail.

## 6. Configuration owned by PS Umzug (admin-editable, not code)

| Area | Where | State |
|---|---|---|
| Company details | admin → Firma | Seeded: PS Umzug AG, Bahnhofstrasse 85, 3613 Steffisburg, 0800 800 255 / 079 821 97 35, info@ps-umzug.ch, Mo–Fr 08:00–17:00, Sa 08:00–11:00 |
| UID / MWST / IBAN / QR-IBAN | admin → Firma | **Blank placeholders — must be filled before invoicing** |
| Services | `service_catalogue` | Umzüge, Reinigung, Räumung/Entsorgung, Lagerung, Transport, Offerte/Besichtigung |
| Regions | `service_zones` | Steffisburg, Thun, Bern |
| Lead sources / queues / routing | `lead_sources`, `lead_queues`, `lead_routing_rules` | Seeded: web form, planner, B2B, WhatsApp, phone, e-mail → Sales & Dispatch / B2B / Support |
| Price list | admin → Preise | **No published version yet.** Prices and bands are versioned and admin-edited; nothing is hardcoded |

## 7. Roles

`profiles.role` (enum `portal_role`) now carries the PS Umzug roles: `super_admin`,
`management`, `ops_manager`, `dispatcher`, `sales`, `surveyor`, `finance`, `crew_leader`,
`driver`, `mover`, `cleaner`, `partner`, `customer` — plus the legacy `zuegelwerk_admin`
value kept **only** for staged compatibility while policies migrate. `is_staff()` and
`is_zw_admin()` accept `super_admin`, `management` and the legacy value.

## 8. Legacy identifiers still present (deliberate, internal only)

- `portal_role.zuegelwerk_admin` — legacy admin role, retired once all policies are migrated.
- `cancel_actor.multifagro` — enum value; displayed as “PS Umzug” in the UI.
- Cron job names `mf-sla-timeouts`, `mf-work-orders` and the `MF-` lead reference prefix.
- Integration tests and `src/lib/partner-admin-data.ts` still reference the legacy role.

None of these are visible to customers.

## 9. Operational setup still required

See `docs/SETUP-CHECKLIST.md`. Summary: rotate `SLA_CRON_SECRET`; set `PUBLIC_SITE_URL`,
`APP_URL`, `ADMIN_URL`, optional `SENTRY_DSN`; configure the Auth Site URL and redirect
allow-list; mail provider credentials and SPF/DKIM/DMARC for the sending domain; fill the
banking/tax fields; publish a price list. The admin production-readiness page
(`/admin/produktionsbereitschaft`) shows each of these as pass/fail.
