# PS Umzug AG — operational setup checklist

Everything on this list is **documented, not silently activated**. Each open
item also shows up in the admin area under *Produktionsbereitschaft*
(production readiness), so nothing fails quietly.

## 1. Secrets (Project Settings → Secrets)

| Secret | Purpose | Status |
| --- | --- | --- |
| `SLA_CRON_SECRET` | Protects the deadline/SLA sweep endpoint | Exists, value still to be rotated by the owner |
| `PUBLIC_SITE_URL` | Public origin used for canonical/OG/sitemap links | **Not set** — no origin is hard-coded |
| `APP_URL` | Customer portal / quote wizard origin | Not set (falls back to `PUBLIC_SITE_URL`) |
| `ADMIN_URL` | Admin console origin | Not set (falls back to `APP_URL`) |
| `SENTRY_DSN` | Error monitoring | Not set |
| Mail provider API key | Outbound operational mail | Not set — configured under *Postfach-Einstellungen* |

Never set any of these to `ps-umzug.ch`: that domain serves the existing
WordPress marketing site and must not be emitted as the canonical origin.

## 2. Scheduled jobs (database cron)

| Job | Schedule | Status |
| --- | --- | --- |
| `mf-sla-timeouts` | every 5 minutes | Registered and active |
| `mf-work-orders` | daily 03:15 | Registered and active |

Health of both jobs is visible on the production-readiness page (last run,
last success, failures in 24 h).

## 3. Authentication

- Site URL and redirect allow-list must list the preview origin and, later,
  the production domain.
- Google sign-in: enable the provider before the first sign-in attempt.
- No anonymous sign-ups; e-mail auto-confirm stays off unless requested.

## 4. Mail

- Sender domain plus MX, SPF, DKIM and DMARC records.
- Provider credentials and the sending release switch.
- All four are checked live on the readiness page.

## 5. Company data still missing (admin-fillable, not invented)

- UID / company register number
- MWST (VAT) number
- IBAN and QR-IBAN

## 6. Known inherited items (phase 8 hardening)

- 232 database linter warnings about publicly callable `SECURITY DEFINER`
  functions — inherited from the source platform, unchanged by this phase.
- Roles are still stored on `profiles.role`; a separate role table is planned
  once the staged role migration is complete.
- Legacy identifiers kept for compatibility only (not customer-facing):
  `portal_role.zuegelwerk_admin`, `cancel_actor.multifagro`, cron job name
  prefix `mf-`.

## Brand assets

- [x] `ps-umzug-logo.svg` — full lockup (mark + outlined wordmark), extracted from the SEKA vector proof.
- [x] `ps-umzug-mark.svg` — standalone mark for favicon and PWA icons.
- [x] Favicon, Apple touch icon, 192×192, 512×512 and maskable icons generated from the vector mark.
- [x] Legacy icons removed.
- [x] `src/components/brand/Logo.tsx` uses the official SVG lockup.

## SLA cron secret

`SLA_CRON_SECRET` exists in this project and is read by the SLA sweep endpoint. Its value was
inherited from the copied project and **must be rotated by the owner** in
Project Settings → Secrets (values can only be set there, never read back). After rotating,
update the same value in the scheduled job that calls the endpoint. The production-readiness
page reports the secret as present/missing, not whether it was rotated.

## Database function exposure review (Phase 1)

Reviewed all `SECURITY DEFINER` functions reachable through the Data API
(89 linter warnings remaining, down from 232).

Callable without signing in (12) — all intentionally public:
`company_contact`, `public_legal_entity`, `public_markets`,
`public_planner_pricing`, `published_pricing`, `create_enquiry`,
`create_lead`, `create_quote`, `get_public_quote`, `lead_tracker`,
`change_order_by_token`, `respond_change_order_token`.
The last two require an unguessable token; the pricing readers expose
published prices only. `submit_partner_application` was revoked from
anonymous callers in this phase (marketplace parked).

Callable by signed-in users (77): every function touching pricing,
invoices, roles, leads, jobs or job cancellation checks the caller inside
the function — `is_staff()`, `is_zw_admin()`, `is_dispatcher()`,
`has_role()`, `is_service_role()` — and raises `42501` otherwise. Verified
individually for `publish_pricing_configuration`,
`rollback_pricing_configuration`, `record_invoice_payment`,
`build_consolidated_invoice`, `cancel_job`, `set_job_status`,
`set_lead_status`, `merge_leads`, `apply_retention`, `decide_approval`,
`set_partner_status`, `run_sla_timeouts_job`, `run_work_order_job`,
`email_ingest`, `cron_health`. The three unguarded ones
(`job_materials_for`, `my_partner_quotes`, `partner_opportunity_feed`) are
self-scoped via `can_access_job()` / `current_partner_id()`.
The remaining warnings are informational and are revisited in Phase 8.
