-- PS Umzug AG — baseline schema
-- Generated from the cloned database catalog. Captures the structure the
-- project inherited from the copied platform so the schema can be rebuilt
-- from migrations alone. Contains no business data.
-- Structure only: extensions, enums, functions, tables, constraints,
-- indexes, triggers, row-level security policies and grants.

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA vault;
CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA pg_catalog;

-- Enum types
DO $$ BEGIN CREATE TYPE public.account_status AS ENUM ('prospect', 'active', 'on_hold', 'closed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.account_type AS ENUM ('property_manager', 'hotel', 'real_estate', 'facility_manager', 'corporate', 'other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.allocation_exception_reason AS ENUM ('no_eligible_partner', 'all_declined', 'sla_exhausted', 'outside_coverage'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.allocation_method AS ENUM ('direct', 'auto', 'round_robin', 'weighted', 'broadcast_rfq', 'territory', 'preferred', 'internal_first'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.approval_scope AS ENUM ('discount_pct', 'margin_pct', 'quote_total', 'refund_amount', 'material_cost'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.approval_status AS ENUM ('pending', 'approved', 'rejected'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.availability_state AS ENUM ('available', 'limited', 'full', 'unavailable', 'holiday'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.cancel_actor AS ENUM ('customer', 'partner', 'multifagro'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.change_order_status AS ENUM ('draft', 'awaiting_customer', 'approved', 'rejected', 'cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.consent_kind AS ENUM ('accepted_terms', 'privacy_notice_shown', 'cancellation_policy_shown', 'marketing_optin'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.consent_subject_type AS ENUM ('customer', 'partner'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.contract_status AS ENUM ('draft', 'active', 'expiring', 'expired', 'terminated'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.customer_quote_status AS ENUM ('draft', 'sent', 'accepted', 'declined', 'expired', 'cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.email_delivery_status AS ENUM ('pending', 'queued', 'sent', 'failed', 'received'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.email_direction AS ENUM ('inbound', 'outbound'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.email_folder AS ENUM ('inbox', 'sent', 'drafts', 'archived', 'unassigned'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.email_ingest_source AS ENUM ('webhook', 'import_eml', 'manual_forward', 'gmail_poll', 'outbound'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.email_link_entity AS ENUM ('lead', 'account', 'site', 'unit', 'job', 'work_order', 'partner', 'contract'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.fulfilment_pref AS ENUM ('internal', 'partner', 'either'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.invoice_status AS ENUM ('draft', 'issued', 'paid', 'overdue', 'cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.job_confirmation_kind AS ENUM ('signature', 'code', 'none'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.job_exec_event_kind AS ENUM ('arrive', 'start', 'pause', 'resume', 'complete', 'note', 'photo', 'material', 'signature', 'status', 'cancel', 'change_order'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.job_exec_status AS ENUM ('scheduled', 'en_route', 'on_site', 'in_progress', 'paused', 'completed', 'verified', 'cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.job_material_status AS ENUM ('proposed', 'approval_required', 'approved', 'rejected', 'purchased', 'installed', 'cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.job_photo_phase AS ENUM ('before', 'during', 'after', 'damage'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.job_status AS ENUM ('received', 'survey', 'quote_approved', 'scheduled', 'crew_assigned', 'clearance', 'cleaning', 'handover_done'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.job_type AS ENUM ('changeover', 'move', 'clean', 'clearance'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.lead_activity_kind AS ENUM ('created', 'status_change', 'assignment', 'note', 'communication', 'quote', 'system'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.lead_actor_kind AS ENUM ('staff', 'partner', 'customer', 'system'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.lead_customer_type AS ENUM ('private', 'b2b'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.lead_followup_status AS ENUM ('pending', 'sent', 'done', 'skipped'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.lead_fulfilment_type AS ENUM ('internal', 'partner', 'rfq', 'mixed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.lead_priority AS ENUM ('critical', 'high', 'normal', 'low'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.lead_source_group AS ENUM ('web', 'phone', 'messaging', 'paid', 'referral', 'b2b', 'manual', 'api'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.lead_status AS ENUM ('new', 'qualified', 'quote_required', 'quote_sent', 'negotiation', 'won', 'scheduled', 'in_progress', 'completed', 'lost', 'cancelled', 'unqualified', 'site_visit_required', 'awaiting_customer', 'ready_for_allocation', 'assigned_internal', 'sent_to_partners', 'spam_review'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.lead_temperature AS ENUM ('hot', 'warm', 'cold'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.legal_doc_status AS ENUM ('draft', 'published', 'superseded'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.partner_category_group AS ENUM ('manpower', 'maintenance', 'cleaning', 'transport', 'specialist'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.partner_document_status AS ENUM ('uploaded', 'under_review', 'approved', 'rejected', 'expired'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.partner_entity_type AS ENUM ('company', 'individual'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.partner_ownership AS ENUM ('owned', 'leased'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.partner_pricing_method AS ENUM ('fixed', 'hourly', 'daily', 'monthly', 'per_job', 'per_trip', 'per_km', 'quotation'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.partner_quote_status AS ENUM ('draft', 'submitted', 'withdrawn', 'accepted', 'rejected'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.partner_skill_level AS ENUM ('skilled', 'semi_skilled', 'unskilled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.partner_status AS ENUM ('draft', 'submitted', 'under_review', 'more_info_required', 'approved', 'suspended', 'rejected'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.portal_role AS ENUM ('owner', 'manager', 'staff', 'zuegelwerk_admin', 'ops_manager', 'sales', 'partner_manager', 'finance'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.price_stage AS ENUM ('richtwert', 'offerte', 'vertragspreis', 'rechnung'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.pricing_config_status AS ENUM ('draft', 'published', 'archived'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.rate_scope AS ENUM ('default', 'canton', 'city', 'partner', 'organization'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.resource_kind AS ENUM ('partner', 'internal_team'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.service_frequency AS ENUM ('one_off', 'weekly', 'biweekly', 'monthly', 'quarterly', 'semiannual', 'annual', 'custom_cron'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.service_unit AS ENUM ('hourly', 'per_visit', 'per_m2', 'per_m3', 'per_room', 'per_trip', 'per_km', 'fixed', 'quotation'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.sla_coverage AS ENUM ('business_hours', 'extended', '24_7'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.sla_penalty_type AS ENUM ('none', 'service_credit', 'fixed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.work_order_status AS ENUM ('planned', 'dispatched', 'in_progress', 'completed', 'verified', 'cancelled', 'on_hold'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Composite / domain types

-- Tables
CREATE TABLE IF NOT EXISTS public.account_contacts (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "account_id" uuid NOT NULL,
  "site_id" uuid,
  "name" text NOT NULL,
  "role" text DEFAULT ''::text NOT NULL,
  "phone" text DEFAULT ''::text NOT NULL,
  "email" text DEFAULT ''::text NOT NULL,
  "preferred_language" text DEFAULT 'de'::text NOT NULL,
  "is_billing" boolean DEFAULT false NOT NULL,
  "is_primary" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public.account_services (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "account_id" uuid NOT NULL,
  "catalogue_id" uuid NOT NULL,
  "agreed_price" numeric,
  "frequency" public.service_frequency,
  "sla_id" uuid,
  "preferred_fulfilment" public.fulfilment_pref,
  "active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public.account_sites (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "account_id" uuid NOT NULL,
  "name" text NOT NULL,
  "address" text DEFAULT ''::text NOT NULL,
  "canton" text DEFAULT ''::text NOT NULL,
  "city" text DEFAULT ''::text NOT NULL,
  "postcode" text DEFAULT ''::text NOT NULL,
  "site_reference" text DEFAULT ''::text NOT NULL,
  "operating_hours" jsonb DEFAULT '{"fri": ["08:00", "17:00"], "mon": ["08:00", "17:00"], "sat": [], "sun": [], "thu": ["08:00", "17:00"], "tue": ["08:00", "17:00"], "wed": ["08:00", "17:00"]}'::jsonb NOT NULL,
  "access_notes" text DEFAULT ''::text NOT NULL,
  "active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public.accounts (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid,
  "legal_name" text NOT NULL,
  "trading_name" text DEFAULT ''::text NOT NULL,
  "country" text DEFAULT 'CH'::text NOT NULL,
  "type" public.account_type DEFAULT 'property_manager'::account_type NOT NULL,
  "vat_number" text DEFAULT ''::text NOT NULL,
  "billing_address" text DEFAULT ''::text NOT NULL,
  "billing_email" text DEFAULT ''::text NOT NULL,
  "payment_terms_days" integer DEFAULT 30 NOT NULL,
  "consolidated_invoicing" boolean DEFAULT true NOT NULL,
  "account_manager_id" uuid,
  "status" public.account_status DEFAULT 'prospect'::account_status NOT NULL,
  "notes" text DEFAULT ''::text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public.allocation_exceptions (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "lead_id" uuid NOT NULL,
  "reason" public.allocation_exception_reason NOT NULL,
  "resolution" text DEFAULT ''::text NOT NULL,
  "resolved_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public.allocation_rules (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "category_id" uuid,
  "canton" text DEFAULT ''::text NOT NULL,
  "customer_type" public.lead_customer_type,
  "method" public.allocation_method DEFAULT 'auto'::allocation_method NOT NULL,
  "sla_minutes" integer DEFAULT 120 NOT NULL,
  "rfq_partner_count" integer DEFAULT 3 NOT NULL,
  "weights" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "active" boolean DEFAULT true NOT NULL,
  "priority" integer DEFAULT 100 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public.approval_requests (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "subject_type" text NOT NULL,
  "subject_id" uuid,
  "lead_id" uuid,
  "rule_id" uuid,
  "requested_by" uuid,
  "requested_value" numeric,
  "payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "status" public.approval_status DEFAULT 'pending'::approval_status NOT NULL,
  "decided_by" uuid,
  "decided_at" timestamp with time zone,
  "note" text DEFAULT ''::text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public.approval_rules (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "scope" public.approval_scope NOT NULL,
  "threshold" numeric NOT NULL,
  "required_role" text NOT NULL,
  "active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "country" text DEFAULT 'CH'::text NOT NULL
);
CREATE TABLE IF NOT EXISTS public.cancellation_rules (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "who" public.cancel_actor NOT NULL,
  "band_key" text NOT NULL,
  "hours_before" integer,
  "job_state" text,
  "charge_pct" numeric DEFAULT 0 NOT NULL,
  "charge_fixed" numeric DEFAULT 0 NOT NULL,
  "partner_compensation_pct" numeric DEFAULT 0 NOT NULL,
  "note" text DEFAULT ''::text NOT NULL,
  "active" boolean DEFAULT true NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "country" text DEFAULT 'CH'::text NOT NULL
);
CREATE TABLE IF NOT EXISTS public.change_orders (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "job_id" uuid,
  "lead_id" uuid,
  "reference" text DEFAULT 'pending'::text NOT NULL,
  "description" text DEFAULT ''::text NOT NULL,
  "reason" text DEFAULT ''::text NOT NULL,
  "estimated_hours" numeric,
  "estimated_materials" numeric,
  "partner_cost" numeric,
  "customer_price" numeric,
  "currency" text DEFAULT 'CHF'::text NOT NULL,
  "status" public.change_order_status DEFAULT 'draft'::change_order_status NOT NULL,
  "requested_by" uuid,
  "requested_kind" public.lead_actor_kind DEFAULT 'staff'::lead_actor_kind NOT NULL,
  "customer_decided_at" timestamp with time zone,
  "decision_channel" text DEFAULT ''::text NOT NULL,
  "decided_name" text DEFAULT ''::text NOT NULL,
  "approval_request_id" uuid,
  "public_token" text DEFAULT ''::text NOT NULL,
  "token_expires_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public.chat_messages (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "session_id" uuid NOT NULL,
  "role" text NOT NULL,
  "content" text DEFAULT ''::text NOT NULL,
  "blocked" boolean DEFAULT false NOT NULL,
  "block_reason" text DEFAULT ''::text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public.chat_sessions (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "language" text DEFAULT 'de'::text NOT NULL,
  "ip_hash" text DEFAULT ''::text NOT NULL,
  "consent_at" timestamp with time zone,
  "lead_id" uuid,
  "message_count" integer DEFAULT 0 NOT NULL,
  "blocked_count" integer DEFAULT 0 NOT NULL,
  "model" text DEFAULT ''::text NOT NULL,
  "closed" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public.consent_records (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "subject_type" public.consent_subject_type NOT NULL,
  "subject_ref" text DEFAULT ''::text NOT NULL,
  "booking_reference" text DEFAULT ''::text NOT NULL,
  "partner_reference" text DEFAULT ''::text NOT NULL,
  "country" text NOT NULL,
  "legal_entity_id" uuid,
  "document_type" text DEFAULT ''::text NOT NULL,
  "document_version" integer,
  "consent_kind" public.consent_kind NOT NULL,
  "value" boolean NOT NULL,
  "user_agent_hash" text DEFAULT ''::text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public.contract_sites (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "contract_id" uuid NOT NULL,
  "site_id" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public.contracts (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "account_id" uuid NOT NULL,
  "reference" text DEFAULT 'pending'::text NOT NULL,
  "title" text DEFAULT ''::text NOT NULL,
  "starts_on" date DEFAULT CURRENT_DATE NOT NULL,
  "ends_on" date,
  "notice_period_days" integer DEFAULT 90 NOT NULL,
  "auto_renew" boolean DEFAULT true NOT NULL,
  "status" public.contract_status DEFAULT 'draft'::contract_status NOT NULL,
  "price_list_scope" text DEFAULT 'account'::text NOT NULL,
  "terms_document_id" uuid,
  "sla_id" uuid,
  "signed_at" timestamp with time zone,
  "signed_by" text DEFAULT ''::text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public.dispatch_automation (
  "id" boolean DEFAULT true NOT NULL,
  "enabled" boolean DEFAULT false NOT NULL,
  "interval_minutes" integer DEFAULT 15 NOT NULL,
  "scheduler" text DEFAULT 'none'::text NOT NULL,
  "last_run_at" timestamp with time zone,
  "last_timed_out" integer DEFAULT 0 NOT NULL,
  "last_escalated" integer DEFAULT 0 NOT NULL,
  "last_exceptions" integer DEFAULT 0 NOT NULL,
  "last_error" text DEFAULT ''::text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "last_skipped" boolean DEFAULT false NOT NULL,
  "last_duration_ms" integer DEFAULT 0 NOT NULL,
  "last_trigger" text DEFAULT ''::text NOT NULL,
  "wo_enabled" boolean DEFAULT true NOT NULL,
  "wo_horizon_days" integer DEFAULT 30 NOT NULL,
  "wo_last_run_at" timestamp with time zone,
  "wo_last_created" integer DEFAULT 0 NOT NULL,
  "wo_last_skipped" boolean DEFAULT false NOT NULL
);
CREATE TABLE IF NOT EXISTS public.dispatch_runs (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "trigger" text DEFAULT 'scheduler'::text NOT NULL,
  "started_at" timestamp with time zone DEFAULT now() NOT NULL,
  "finished_at" timestamp with time zone,
  "duration_ms" integer DEFAULT 0 NOT NULL,
  "skipped" boolean DEFAULT false NOT NULL,
  "skip_reason" text DEFAULT ''::text NOT NULL,
  "leads_processed" integer DEFAULT 0 NOT NULL,
  "partners_notified" integer DEFAULT 0 NOT NULL,
  "timed_out" integer DEFAULT 0 NOT NULL,
  "escalated" integer DEFAULT 0 NOT NULL,
  "exceptions" integer DEFAULT 0 NOT NULL,
  "errors" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "error" text DEFAULT ''::text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "job" text DEFAULT 'sla_timeouts'::text NOT NULL
);
CREATE TABLE IF NOT EXISTS public.email_accounts (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "address" text NOT NULL,
  "display_name" text DEFAULT ''::text NOT NULL,
  "provider" text DEFAULT 'none'::text NOT NULL,
  "inbound_mode" text DEFAULT 'import'::text NOT NULL,
  "outbound_ready" boolean DEFAULT false NOT NULL,
  "is_default" boolean DEFAULT false NOT NULL,
  "active" boolean DEFAULT true NOT NULL,
  "notes" text DEFAULT ''::text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "reply_to" text DEFAULT ''::text NOT NULL,
  "inbound_address" text DEFAULT ''::text NOT NULL,
  "domain" text DEFAULT ''::text NOT NULL,
  "dkim_selector" text DEFAULT ''::text NOT NULL
);
CREATE TABLE IF NOT EXISTS public.email_assignments (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "thread_id" uuid NOT NULL,
  "assigned_to" uuid,
  "assigned_by" uuid,
  "note" text DEFAULT ''::text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public.email_attachments (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "message_id" uuid NOT NULL,
  "filename" text DEFAULT ''::text NOT NULL,
  "mime_type" text DEFAULT 'application/octet-stream'::text NOT NULL,
  "size_bytes" bigint DEFAULT 0 NOT NULL,
  "storage_path" text DEFAULT ''::text NOT NULL,
  "content_id" text DEFAULT ''::text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public.email_links (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "thread_id" uuid NOT NULL,
  "entity_type" public.email_link_entity NOT NULL,
  "entity_id" uuid NOT NULL,
  "confidence" text DEFAULT 'manual'::text NOT NULL,
  "matched_on" text DEFAULT ''::text NOT NULL,
  "linked_by" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public.email_messages (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "thread_id" uuid NOT NULL,
  "direction" public.email_direction NOT NULL,
  "from_address" text DEFAULT ''::text NOT NULL,
  "from_name" text DEFAULT ''::text NOT NULL,
  "to_addresses" text[] DEFAULT '{}'::text[] NOT NULL,
  "cc_addresses" text[] DEFAULT '{}'::text[] NOT NULL,
  "bcc_addresses" text[] DEFAULT '{}'::text[] NOT NULL,
  "subject" text DEFAULT ''::text NOT NULL,
  "body_text" text DEFAULT ''::text NOT NULL,
  "body_html" text DEFAULT ''::text NOT NULL,
  "message_id" text DEFAULT ''::text NOT NULL,
  "in_reply_to" text DEFAULT ''::text NOT NULL,
  "references" text[] DEFAULT '{}'::text[] NOT NULL,
  "received_at" timestamp with time zone DEFAULT now() NOT NULL,
  "read_at" timestamp with time zone,
  "folder" public.email_folder DEFAULT 'inbox'::email_folder NOT NULL,
  "delivery_status" public.email_delivery_status DEFAULT 'received'::email_delivery_status NOT NULL,
  "delivery_reason" text DEFAULT ''::text NOT NULL,
  "provider_message_id" text DEFAULT ''::text NOT NULL,
  "ingest_source" public.email_ingest_source DEFAULT 'import_eml'::email_ingest_source NOT NULL,
  "raw_headers" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public.email_tags (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "thread_id" uuid NOT NULL,
  "tag" text NOT NULL,
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public.email_threads (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "account_id" uuid,
  "subject" text DEFAULT ''::text NOT NULL,
  "normalized_subject" text DEFAULT ''::text NOT NULL,
  "participants" text[] DEFAULT '{}'::text[] NOT NULL,
  "folder" public.email_folder DEFAULT 'unassigned'::email_folder NOT NULL,
  "assigned_to" uuid,
  "unread_count" integer DEFAULT 0 NOT NULL,
  "message_count" integer DEFAULT 0 NOT NULL,
  "last_message_at" timestamp with time zone DEFAULT now() NOT NULL,
  "last_direction" public.email_direction DEFAULT 'inbound'::email_direction NOT NULL,
  "snippet" text DEFAULT ''::text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public.enquiries (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "name" text,
  "phone" text,
  "email" text,
  "from_text" text,
  "to_text" text,
  "preferred_date" date,
  "message" text,
  "language" text DEFAULT 'de'::text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public.exception_rules (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "key" text NOT NULL,
  "label" text DEFAULT ''::text NOT NULL,
  "severity" text DEFAULT 'warning'::text NOT NULL,
  "threshold_value" numeric DEFAULT 0 NOT NULL,
  "threshold_unit" text DEFAULT 'count'::text NOT NULL,
  "active" boolean DEFAULT true NOT NULL,
  "sort_order" integer DEFAULT 100 NOT NULL,
  "note" text DEFAULT ''::text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public.fairness_rules (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "key" text NOT NULL,
  "label" text DEFAULT ''::text NOT NULL,
  "value" numeric DEFAULT 0 NOT NULL,
  "unit" text DEFAULT 'count'::text NOT NULL,
  "active" boolean DEFAULT true NOT NULL,
  "note" text DEFAULT ''::text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public.internal_teams (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "country" text DEFAULT 'CH'::text NOT NULL,
  "canton" text DEFAULT ''::text NOT NULL,
  "city" text DEFAULT ''::text NOT NULL,
  "category_ids" uuid[] DEFAULT '{}'::uuid[] NOT NULL,
  "capacity_per_day" integer DEFAULT 1 NOT NULL,
  "active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public.invoice_lines (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "invoice_id" uuid NOT NULL,
  "work_order_id" uuid,
  "site_id" uuid,
  "description" text DEFAULT ''::text NOT NULL,
  "quantity" numeric DEFAULT 1 NOT NULL,
  "unit_price" numeric DEFAULT 0 NOT NULL,
  "net" numeric DEFAULT 0 NOT NULL,
  "vat_rate" numeric DEFAULT 0.081 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public.invoices (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "reference" text DEFAULT 'pending'::text NOT NULL,
  "account_id" uuid NOT NULL,
  "period_start" date NOT NULL,
  "period_end" date NOT NULL,
  "status" public.invoice_status DEFAULT 'draft'::invoice_status NOT NULL,
  "net" numeric DEFAULT 0 NOT NULL,
  "vat" numeric DEFAULT 0 NOT NULL,
  "total" numeric DEFAULT 0 NOT NULL,
  "currency" text DEFAULT 'CHF'::text NOT NULL,
  "country" text DEFAULT 'CH'::text NOT NULL,
  "vat_treatment" text DEFAULT 'domestic_standard'::text NOT NULL,
  "due_on" date,
  "issued_at" timestamp with time zone,
  "paid_at" timestamp with time zone,
  "skipped" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "amount_paid" numeric DEFAULT 0 NOT NULL,
  "paid_on" date,
  "payment_method" text DEFAULT ''::text NOT NULL,
  "payment_reference" text DEFAULT ''::text NOT NULL,
  "payment_note" text DEFAULT ''::text NOT NULL,
  "qr_reference" text DEFAULT ''::text NOT NULL
);
CREATE TABLE IF NOT EXISTS public.job_events (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL,
  "job_id" uuid NOT NULL,
  "stage" public.job_status NOT NULL,
  "note" text DEFAULT ''::text NOT NULL,
  "actor_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public.job_events_exec (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "job_id" uuid NOT NULL,
  "kind" public.job_exec_event_kind NOT NULL,
  "body" text DEFAULT ''::text NOT NULL,
  "meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "actor_id" uuid,
  "actor_kind" public.lead_actor_kind DEFAULT 'system'::lead_actor_kind NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public.job_materials (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "job_id" uuid NOT NULL,
  "description" text NOT NULL,
  "quantity" numeric DEFAULT 1 NOT NULL,
  "unit" text DEFAULT 'Stk'::text NOT NULL,
  "supplier_cost" numeric,
  "customer_price" numeric,
  "photo_path" text DEFAULT ''::text NOT NULL,
  "approval_request_id" uuid,
  "change_order_id" uuid,
  "status" public.job_material_status DEFAULT 'proposed'::job_material_status NOT NULL,
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public.job_photos (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "job_id" uuid NOT NULL,
  "phase" public.job_photo_phase NOT NULL,
  "storage_path" text NOT NULL,
  "caption" text DEFAULT ''::text NOT NULL,
  "uploaded_by" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public.jobs (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "reference" text NOT NULL,
  "organization_id" uuid NOT NULL,
  "unit_id" uuid,
  "quote_id" uuid,
  "type" public.job_type DEFAULT 'changeover'::job_type NOT NULL,
  "status" public.job_status DEFAULT 'received'::job_status NOT NULL,
  "services" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "move_out_date" date,
  "scheduled_date" date,
  "crew_size" integer DEFAULT 2 NOT NULL,
  "vehicle" text DEFAULT '3.5t'::text NOT NULL,
  "document_language" text DEFAULT 'de'::text NOT NULL,
  "amount" numeric DEFAULT 0 NOT NULL,
  "notes" text DEFAULT ''::text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "price_stage" public.price_stage DEFAULT 'richtwert'::price_stage NOT NULL
);
CREATE TABLE IF NOT EXISTS public.jobs_execution (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "reference" text DEFAULT 'pending'::text NOT NULL,
  "lead_id" uuid NOT NULL,
  "opportunity_id" uuid,
  "partner_id" uuid,
  "team_id" uuid,
  "status" public.job_exec_status DEFAULT 'scheduled'::job_exec_status NOT NULL,
  "scheduled_start" timestamp with time zone,
  "arrived_at" timestamp with time zone,
  "started_at" timestamp with time zone,
  "paused_at" timestamp with time zone,
  "completed_at" timestamp with time zone,
  "verified_at" timestamp with time zone,
  "total_pause_minutes" integer DEFAULT 0 NOT NULL,
  "crew_note" text DEFAULT ''::text NOT NULL,
  "customer_confirmation" public.job_confirmation_kind DEFAULT 'none'::job_confirmation_kind NOT NULL,
  "signed_by_name" text DEFAULT ''::text NOT NULL,
  "signed_at" timestamp with time zone,
  "signature_path" text DEFAULT ''::text NOT NULL,
  "confirmation_code" text DEFAULT ''::text NOT NULL,
  "job_value" numeric,
  "location_evidence" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "cancelled_at" timestamp with time zone,
  "cancelled_by" public.cancel_actor,
  "cancellation_reason" text DEFAULT ''::text NOT NULL,
  "cancellation_rule_id" uuid,
  "cancellation_customer_charge" numeric,
  "cancellation_partner_compensation" numeric,
  "cancellation_manual_review" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public.lead_activities (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "lead_id" uuid NOT NULL,
  "kind" public.lead_activity_kind NOT NULL,
  "body" text DEFAULT ''::text NOT NULL,
  "meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "actor_id" uuid,
  "actor_kind" public.lead_actor_kind DEFAULT 'staff'::lead_actor_kind NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public.lead_attachments (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "lead_id" uuid NOT NULL,
  "storage_path" text NOT NULL,
  "file_name" text DEFAULT ''::text NOT NULL,
  "mime_type" text DEFAULT ''::text NOT NULL,
  "size_bytes" bigint DEFAULT 0 NOT NULL,
  "uploaded_by" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public.lead_duplicates (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "lead_id" uuid NOT NULL,
  "existing_lead_id" uuid NOT NULL,
  "matched_on" text DEFAULT ''::text NOT NULL,
  "status" text DEFAULT 'pending'::text NOT NULL,
  "resolved_by" uuid,
  "resolved_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public.lead_followups (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "lead_id" uuid NOT NULL,
  "due_at" timestamp with time zone NOT NULL,
  "channel" text DEFAULT 'email'::text NOT NULL,
  "template_key" text DEFAULT ''::text NOT NULL,
  "status" public.lead_followup_status DEFAULT 'pending'::lead_followup_status NOT NULL,
  "actor_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public.lead_loss_reasons (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "key" text NOT NULL,
  "label_de" text DEFAULT ''::text NOT NULL,
  "label_fr" text DEFAULT ''::text NOT NULL,
  "label_it" text DEFAULT ''::text NOT NULL,
  "label_en" text DEFAULT ''::text NOT NULL,
  "active" boolean DEFAULT true NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public.lead_notes (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "lead_id" uuid NOT NULL,
  "body" text NOT NULL,
  "actor_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public.lead_queues (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "key" text NOT NULL,
  "label_de" text DEFAULT ''::text NOT NULL,
  "label_fr" text DEFAULT ''::text NOT NULL,
  "label_it" text DEFAULT ''::text NOT NULL,
  "label_en" text DEFAULT ''::text NOT NULL,
  "default_owner_id" uuid,
  "default_team_id" uuid,
  "sla_first_review_minutes" integer DEFAULT 30 NOT NULL,
  "sla_first_contact_minutes" integer DEFAULT 120 NOT NULL,
  "sla_quote_minutes" integer DEFAULT 1440 NOT NULL,
  "sla_awaiting_customer_minutes" integer DEFAULT 4320 NOT NULL,
  "sla_awaiting_partner_minutes" integer DEFAULT 720 NOT NULL,
  "active" boolean DEFAULT true NOT NULL,
  "sort_order" integer DEFAULT 100 NOT NULL,
  "note" text DEFAULT ''::text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public.lead_risk_signals (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "lead_id" uuid NOT NULL,
  "signal" text NOT NULL,
  "weight" numeric DEFAULT 0 NOT NULL,
  "detail" text DEFAULT ''::text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public.lead_routing_rules (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "key" text NOT NULL,
  "priority" integer DEFAULT 100 NOT NULL,
  "match_source_key" text DEFAULT ''::text NOT NULL,
  "match_customer_type" public.lead_customer_type,
  "match_urgency" text DEFAULT ''::text NOT NULL,
  "match_flag" text DEFAULT ''::text NOT NULL,
  "queue_id" uuid NOT NULL,
  "active" boolean DEFAULT true NOT NULL,
  "note" text DEFAULT ''::text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public.lead_sources (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "key" text NOT NULL,
  "label_de" text DEFAULT ''::text NOT NULL,
  "label_fr" text DEFAULT ''::text NOT NULL,
  "label_it" text DEFAULT ''::text NOT NULL,
  "label_en" text DEFAULT ''::text NOT NULL,
  "group" public.lead_source_group NOT NULL,
  "active" boolean DEFAULT true NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "tracking_number" text DEFAULT ''::text NOT NULL,
  "tracking_provider" text DEFAULT ''::text NOT NULL,
  "attribution" jsonb DEFAULT '{}'::jsonb NOT NULL
);
CREATE TABLE IF NOT EXISTS public.leads (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "reference" text DEFAULT 'pending'::text NOT NULL,
  "source_id" uuid,
  "campaign" text DEFAULT ''::text NOT NULL,
  "customer_name" text DEFAULT ''::text NOT NULL,
  "customer_phone" text DEFAULT ''::text NOT NULL,
  "customer_email" text DEFAULT ''::text NOT NULL,
  "preferred_contact" text DEFAULT 'phone'::text NOT NULL,
  "country" text DEFAULT 'CH'::text NOT NULL,
  "canton" text DEFAULT ''::text NOT NULL,
  "city" text DEFAULT ''::text NOT NULL,
  "postcode" text DEFAULT ''::text NOT NULL,
  "service_address" text DEFAULT ''::text NOT NULL,
  "category_id" uuid,
  "service_details" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "preferred_date" date,
  "preferred_time" text DEFAULT ''::text NOT NULL,
  "urgency" text DEFAULT 'normal'::text NOT NULL,
  "description" text DEFAULT ''::text NOT NULL,
  "property_type" text DEFAULT ''::text NOT NULL,
  "customer_type" public.lead_customer_type DEFAULT 'private'::lead_customer_type NOT NULL,
  "status" public.lead_status DEFAULT 'new'::lead_status NOT NULL,
  "temperature" public.lead_temperature DEFAULT 'warm'::lead_temperature NOT NULL,
  "priority" public.lead_priority DEFAULT 'normal'::lead_priority NOT NULL,
  "estimated_value" numeric,
  "lead_owner_id" uuid,
  "fulfilment_type" public.lead_fulfilment_type,
  "assigned_partner_id" uuid,
  "assigned_team_id" uuid,
  "locked_by" uuid,
  "locked_at" timestamp with time zone,
  "last_activity_at" timestamp with time zone DEFAULT now() NOT NULL,
  "next_action_at" timestamp with time zone,
  "lost_reason_id" uuid,
  "language" text DEFAULT 'de'::text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "expected_sell" numeric,
  "expected_cost" numeric,
  "expected_margin" numeric,
  "expected_margin_pct" numeric,
  "travel_cost" numeric,
  "acquisition_cost" numeric,
  "min_margin_pct" numeric,
  "economics_flags" text[] DEFAULT '{}'::text[] NOT NULL,
  "risk_score" numeric DEFAULT 0 NOT NULL,
  "risk_reviewed" boolean DEFAULT false NOT NULL,
  "ip_hash" text DEFAULT ''::text NOT NULL,
  "referred_by_partner_id" uuid,
  "queue_id" uuid,
  "utm_source" text DEFAULT ''::text NOT NULL,
  "utm_medium" text DEFAULT ''::text NOT NULL,
  "utm_campaign" text DEFAULT ''::text NOT NULL,
  "utm_term" text DEFAULT ''::text NOT NULL,
  "utm_content" text DEFAULT ''::text NOT NULL,
  "gclid" text DEFAULT ''::text NOT NULL,
  "referrer" text DEFAULT ''::text NOT NULL,
  "landing_page" text DEFAULT ''::text NOT NULL,
  "first_review_at" timestamp with time zone,
  "first_contact_at" timestamp with time zone,
  "quoted_at" timestamp with time zone,
  "awaiting_since" timestamp with time zone
);
CREATE TABLE IF NOT EXISTS public.legal_documents (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "doc_type" text NOT NULL,
  "country" text NOT NULL,
  "language" text NOT NULL,
  "version" integer DEFAULT 1 NOT NULL,
  "effective_date" date,
  "status" public.legal_doc_status DEFAULT 'draft'::legal_doc_status NOT NULL,
  "body" text DEFAULT ''::text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public.legal_entities (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "country" text NOT NULL,
  "legal_name" text DEFAULT ''::text NOT NULL,
  "register_number" text DEFAULT ''::text NOT NULL,
  "vat_number" text DEFAULT ''::text NOT NULL,
  "address_line" text DEFAULT ''::text NOT NULL,
  "postal_code" text DEFAULT ''::text NOT NULL,
  "city" text DEFAULT ''::text NOT NULL,
  "email" text DEFAULT ''::text NOT NULL,
  "phone" text DEFAULT ''::text NOT NULL,
  "currency" text NOT NULL,
  "status" text DEFAULT 'pending'::text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "canton" text DEFAULT ''::text NOT NULL,
  "qr_iban" text DEFAULT ''::text NOT NULL,
  "iban" text DEFAULT ''::text NOT NULL,
  "bank_name" text DEFAULT ''::text NOT NULL
);
CREATE TABLE IF NOT EXISTS public.markets (
  "country" text NOT NULL,
  "currency" text NOT NULL,
  "vat_rate" numeric NOT NULL,
  "consumer_regime" text NOT NULL,
  "active" boolean DEFAULT false NOT NULL,
  "activated_at" timestamp with time zone,
  "legal_ready" boolean DEFAULT false NOT NULL,
  "entity_ready" boolean DEFAULT false NOT NULL,
  "tax_ready" boolean DEFAULT false NOT NULL,
  "note" text DEFAULT ''::text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public.notification_log (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "channel" text DEFAULT 'email'::text NOT NULL,
  "template" text DEFAULT ''::text NOT NULL,
  "recipient" text DEFAULT ''::text NOT NULL,
  "subject_type" text DEFAULT ''::text NOT NULL,
  "subject_id" uuid,
  "lead_id" uuid,
  "partner_id" uuid,
  "status" text DEFAULT 'pending'::text NOT NULL,
  "error" text DEFAULT ''::text NOT NULL,
  "attempts" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "provider" text DEFAULT 'resend'::text NOT NULL,
  "provider_message_id" text DEFAULT ''::text NOT NULL,
  "subject" text DEFAULT ''::text NOT NULL,
  "language" text DEFAULT 'de'::text NOT NULL,
  "event_at" timestamp with time zone DEFAULT now() NOT NULL,
  "details" jsonb DEFAULT '{}'::jsonb NOT NULL
);
CREATE TABLE IF NOT EXISTS public.notification_settings (
  "id" text DEFAULT 'default'::text NOT NULL,
  "provider" text DEFAULT 'resend'::text NOT NULL,
  "enabled" boolean DEFAULT false NOT NULL,
  "from_name" text DEFAULT ''::text NOT NULL,
  "from_email" text DEFAULT ''::text NOT NULL,
  "reply_to" text DEFAULT ''::text NOT NULL,
  "test_recipient" text DEFAULT ''::text NOT NULL,
  "api_key" text DEFAULT ''::text NOT NULL,
  "webhook_secret" text DEFAULT ''::text NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_by" uuid
);
CREATE TABLE IF NOT EXISTS public.organizations (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "ui_language" text DEFAULT 'de'::text NOT NULL,
  "document_language" text DEFAULT 'de'::text NOT NULL,
  "framework_discount" numeric DEFAULT 0.10 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public.partner_allocation_stats (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "partner_id" uuid NOT NULL,
  "period_start" date NOT NULL,
  "period_end" date NOT NULL,
  "category_id" uuid,
  "canton" text DEFAULT ''::text NOT NULL,
  "offered" integer DEFAULT 0 NOT NULL,
  "accepted" integer DEFAULT 0 NOT NULL,
  "explored" integer DEFAULT 0 NOT NULL,
  "saturated_out" integer DEFAULT 0 NOT NULL,
  "skipped" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public.partner_categories (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "key" text NOT NULL,
  "label_de" text NOT NULL,
  "label_fr" text NOT NULL,
  "label_it" text NOT NULL,
  "label_en" text NOT NULL,
  "group" public.partner_category_group NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public.partner_contacts (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "partner_id" uuid NOT NULL,
  "full_name" text DEFAULT ''::text NOT NULL,
  "position" text DEFAULT ''::text NOT NULL,
  "mobile" text,
  "whatsapp" text,
  "email" text,
  "alternative_contact" text,
  "preferred_language" text DEFAULT 'de'::text NOT NULL,
  "is_primary" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public.partner_coverage (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "partner_id" uuid NOT NULL,
  "zone_id" uuid,
  "postcode_prefix" text DEFAULT ''::text NOT NULL,
  "category_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public.partner_documents (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "partner_id" uuid NOT NULL,
  "doc_type" text DEFAULT ''::text NOT NULL,
  "storage_path" text NOT NULL,
  "file_name" text DEFAULT ''::text NOT NULL,
  "mime_type" text DEFAULT ''::text NOT NULL,
  "size_bytes" bigint DEFAULT 0 NOT NULL,
  "status" public.partner_document_status DEFAULT 'uploaded'::partner_document_status NOT NULL,
  "expires_on" date,
  "reviewed_by" uuid,
  "reviewed_at" timestamp with time zone,
  "rejection_reason" text,
  "uploaded_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public.partner_fleet (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "partner_id" uuid NOT NULL,
  "vehicle_type" text DEFAULT ''::text NOT NULL,
  "vehicle_count" integer DEFAULT 0 NOT NULL,
  "capacity" text,
  "model_year_from" integer,
  "model_year_to" integer,
  "ownership" public.partner_ownership DEFAULT 'owned'::partner_ownership NOT NULL,
  "driver_included" boolean DEFAULT false NOT NULL,
  "coverage_area" text DEFAULT ''::text NOT NULL,
  "intercity" boolean DEFAULT false NOT NULL,
  "available_24_7" boolean DEFAULT false NOT NULL,
  "gps_tracking" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public.partner_notes (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "partner_id" uuid NOT NULL,
  "body" text DEFAULT ''::text NOT NULL,
  "actor_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public.partner_opportunities (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "partner_id" uuid,
  "reference" text DEFAULT ''::text NOT NULL,
  "status" text DEFAULT 'open'::text NOT NULL,
  "title" text DEFAULT ''::text NOT NULL,
  "description" text DEFAULT ''::text NOT NULL,
  "amount" numeric,
  "currency" text DEFAULT 'CHF'::text NOT NULL,
  "starts_on" date,
  "ends_on" date,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "lead_id" uuid,
  "sent_at" timestamp with time zone,
  "respond_by" timestamp with time zone,
  "decline_reason" text DEFAULT ''::text NOT NULL,
  "responded_at" timestamp with time zone,
  "match_score" numeric,
  "match_reasons" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "is_backup" boolean DEFAULT false NOT NULL,
  "allocation_kind" text DEFAULT 'manual'::text NOT NULL,
  "allocation_reason" text DEFAULT ''::text NOT NULL
);
CREATE TABLE IF NOT EXISTS public.partner_performance (
  "partner_id" uuid NOT NULL,
  "opportunities_sent" integer DEFAULT 0 NOT NULL,
  "opportunities_accepted" integer DEFAULT 0 NOT NULL,
  "opportunities_declined" integer DEFAULT 0 NOT NULL,
  "opportunities_timed_out" integer DEFAULT 0 NOT NULL,
  "avg_response_minutes" numeric DEFAULT 0 NOT NULL,
  "quotes_submitted" integer DEFAULT 0 NOT NULL,
  "jobs_won" integer DEFAULT 0 NOT NULL,
  "jobs_completed" integer DEFAULT 0 NOT NULL,
  "jobs_on_time" integer DEFAULT 0 NOT NULL,
  "cancellations" integer DEFAULT 0 NOT NULL,
  "complaints" integer DEFAULT 0 NOT NULL,
  "avg_customer_rating" numeric DEFAULT 0 NOT NULL,
  "score" numeric DEFAULT 0 NOT NULL,
  "computed_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public.partner_quotations (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "partner_id" uuid,
  "opportunity_id" uuid,
  "reference" text DEFAULT ''::text NOT NULL,
  "status" text DEFAULT 'draft'::text NOT NULL,
  "title" text DEFAULT ''::text NOT NULL,
  "description" text DEFAULT ''::text NOT NULL,
  "amount_net" numeric,
  "amount_total" numeric,
  "currency" text DEFAULT 'CHF'::text NOT NULL,
  "valid_until" date,
  "submitted_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public.partner_quotes (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "opportunity_id" uuid,
  "partner_id" uuid NOT NULL,
  "lead_id" uuid,
  "partner_cost" numeric DEFAULT 0 NOT NULL,
  "currency" text DEFAULT 'CHF'::text NOT NULL,
  "availability_date" date,
  "completion_days" integer,
  "conditions" text DEFAULT ''::text NOT NULL,
  "notes" text DEFAULT ''::text NOT NULL,
  "status" public.partner_quote_status DEFAULT 'draft'::partner_quote_status NOT NULL,
  "submitted_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public.partner_ratings (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "partner_id" uuid NOT NULL,
  "criterion" text DEFAULT ''::text NOT NULL,
  "score" numeric DEFAULT 0 NOT NULL,
  "max_score" numeric DEFAULT 5 NOT NULL,
  "note" text DEFAULT ''::text NOT NULL,
  "actor_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public.partner_services (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "partner_id" uuid NOT NULL,
  "category_id" uuid NOT NULL,
  "coverage_cities" text[] DEFAULT '{}'::text[] NOT NULL,
  "available_manpower" integer,
  "emergency_available" boolean DEFAULT false NOT NULL,
  "available_24_7" boolean DEFAULT false NOT NULL,
  "pricing_method" public.partner_pricing_method DEFAULT 'quotation'::partner_pricing_method NOT NULL,
  "callout_charge" numeric,
  "hourly_rate" numeric,
  "daily_rate" numeric,
  "monthly_rate" numeric,
  "transport_rate" numeric,
  "notes" text DEFAULT ''::text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "approved" boolean DEFAULT false NOT NULL,
  "approved_cities" text[] DEFAULT '{}'::text[] NOT NULL
);
CREATE TABLE IF NOT EXISTS public.partner_status_history (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "partner_id" uuid NOT NULL,
  "from_status" public.partner_status,
  "to_status" public.partner_status NOT NULL,
  "note" text DEFAULT ''::text NOT NULL,
  "actor_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public.partner_work_orders (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "partner_id" uuid,
  "quotation_id" uuid,
  "reference" text DEFAULT ''::text NOT NULL,
  "status" text DEFAULT 'issued'::text NOT NULL,
  "title" text DEFAULT ''::text NOT NULL,
  "description" text DEFAULT ''::text NOT NULL,
  "amount_total" numeric,
  "currency" text DEFAULT 'CHF'::text NOT NULL,
  "scheduled_date" date,
  "completed_date" date,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public.partner_workforce (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "partner_id" uuid NOT NULL,
  "category" text DEFAULT ''::text NOT NULL,
  "worker_count" integer DEFAULT 0 NOT NULL,
  "skill_level" public.partner_skill_level DEFAULT 'skilled'::partner_skill_level NOT NULL,
  "mobilisation_days" integer,
  "accommodation_provided" boolean DEFAULT false NOT NULL,
  "transport_provided" boolean DEFAULT false NOT NULL,
  "ppe_provided" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public.partners (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "reference" text DEFAULT 'pending'::text NOT NULL,
  "status" public.partner_status DEFAULT 'draft'::partner_status NOT NULL,
  "entity_type" public.partner_entity_type DEFAULT 'company'::partner_entity_type NOT NULL,
  "legal_name" text DEFAULT ''::text NOT NULL,
  "trading_name" text DEFAULT ''::text NOT NULL,
  "country" text DEFAULT 'CH'::text NOT NULL,
  "city" text DEFAULT ''::text NOT NULL,
  "areas_served" text[] DEFAULT '{}'::text[] NOT NULL,
  "year_established" integer,
  "website" text,
  "company_size" text,
  "employee_count" integer,
  "technician_count" integer,
  "vehicle_count" integer,
  "registration_number" text,
  "vat_number" text,
  "address" text DEFAULT ''::text NOT NULL,
  "workforce_notes" text DEFAULT ''::text NOT NULL,
  "created_by" uuid NOT NULL,
  "account_manager_id" uuid,
  "internal_score" numeric,
  "classification" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public.portfolio_price_overrides (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL,
  "property_id" uuid,
  "unit_id" uuid,
  "service" text NOT NULL,
  "unit_type" text DEFAULT ''::text NOT NULL,
  "price" numeric(12,2) NOT NULL,
  "currency" text DEFAULT 'CHF'::text NOT NULL,
  "note" text DEFAULT ''::text NOT NULL,
  "archived" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public.pricing_configurations (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "market" text DEFAULT 'CH'::text NOT NULL,
  "name" text DEFAULT ''::text NOT NULL,
  "version" integer DEFAULT 1 NOT NULL,
  "status" public.pricing_config_status DEFAULT 'draft'::pricing_config_status NOT NULL,
  "effective_from" date DEFAULT CURRENT_DATE NOT NULL,
  "notes" text DEFAULT ''::text NOT NULL,
  "published_at" timestamp with time zone,
  "published_by" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public.pricing_rules (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "configuration_id" uuid NOT NULL,
  "service" text NOT NULL,
  "property_type" text DEFAULT 'any'::text NOT NULL,
  "band_id" text DEFAULT ''::text NOT NULL,
  "room_min" numeric,
  "room_max" numeric,
  "price" numeric DEFAULT 0 NOT NULL,
  "currency" text DEFAULT 'CHF'::text NOT NULL,
  "unit_type" text DEFAULT ''::text NOT NULL,
  "gap_after_intentional" boolean DEFAULT false NOT NULL,
  "requires_commercial_review" boolean DEFAULT false NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public.profiles (
  "id" uuid NOT NULL,
  "organization_id" uuid,
  "full_name" text DEFAULT ''::text NOT NULL,
  "role" public.portal_role DEFAULT 'staff'::portal_role NOT NULL,
  "ui_language" text DEFAULT 'de'::text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public.properties (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL,
  "address" text NOT NULL,
  "zip" text DEFAULT ''::text NOT NULL,
  "city" text DEFAULT ''::text NOT NULL,
  "unit_count" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "canton" text DEFAULT ''::text NOT NULL,
  "reference" text DEFAULT ''::text NOT NULL,
  "notes" text DEFAULT ''::text NOT NULL,
  "archived" boolean DEFAULT false NOT NULL
);
CREATE TABLE IF NOT EXISTS public.quotes (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "reference" text NOT NULL,
  "language" text DEFAULT 'de'::text NOT NULL,
  "status" text DEFAULT 'new'::text NOT NULL,
  "customer_name" text,
  "customer_company" text,
  "customer_phone" text,
  "customer_email" text,
  "from_address" text,
  "from_zip" text,
  "to_address" text,
  "to_zip" text,
  "room_units" numeric,
  "floor_out" integer,
  "floor_in" integer,
  "lift" text,
  "property_type" text,
  "parking" integer,
  "carry" integer,
  "narrow_stairs" boolean,
  "permit" boolean,
  "hoist" boolean,
  "services" jsonb,
  "items" jsonb,
  "move_date" date,
  "distance_km" integer,
  "volume_m3" numeric,
  "boxes" integer,
  "vans" integer,
  "crew" integer,
  "load_hours" numeric,
  "total_hours" numeric,
  "access_score" integer,
  "score_label" text,
  "price_net" numeric,
  "price_vat" numeric,
  "price_total" numeric,
  "price_low" numeric,
  "price_high" numeric,
  "discount_rate" numeric,
  "source" text DEFAULT 'planner'::text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "price_stage" public.price_stage DEFAULT 'richtwert'::price_stage NOT NULL,
  "pricing_configuration_id" uuid
);
CREATE TABLE IF NOT EXISTS public.quotes_customer (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "lead_id" uuid,
  "reference" text DEFAULT 'pending'::text NOT NULL,
  "source_quote_id" uuid,
  "line_items" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "labour" numeric DEFAULT 0 NOT NULL,
  "materials" numeric DEFAULT 0 NOT NULL,
  "transport" numeric DEFAULT 0 NOT NULL,
  "equipment" numeric DEFAULT 0 NOT NULL,
  "disposal" numeric DEFAULT 0 NOT NULL,
  "discount" numeric DEFAULT 0 NOT NULL,
  "vat" numeric DEFAULT 0 NOT NULL,
  "total" numeric DEFAULT 0 NOT NULL,
  "currency" text DEFAULT 'CHF'::text NOT NULL,
  "valid_until" date,
  "terms" text DEFAULT ''::text NOT NULL,
  "status" public.customer_quote_status DEFAULT 'draft'::customer_quote_status NOT NULL,
  "language" text DEFAULT 'de'::text NOT NULL,
  "sent_at" timestamp with time zone,
  "accepted_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "price_stage" public.price_stage DEFAULT 'offerte'::price_stage NOT NULL
);
CREATE TABLE IF NOT EXISTS public.readiness_attestations (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "key" text NOT NULL,
  "confirmed" boolean DEFAULT false NOT NULL,
  "confirmed_by" uuid,
  "confirmed_name" text DEFAULT ''::text NOT NULL,
  "confirmed_at" timestamp with time zone,
  "note" text DEFAULT ''::text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public.resource_availability (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "resource_kind" public.resource_kind NOT NULL,
  "resource_id" uuid NOT NULL,
  "date" date NOT NULL,
  "state" public.availability_state DEFAULT 'available'::availability_state NOT NULL,
  "note" text DEFAULT ''::text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public.retention_rules (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "entity" text NOT NULL,
  "label" text DEFAULT ''::text NOT NULL,
  "condition" text DEFAULT ''::text NOT NULL,
  "retention_days" integer DEFAULT 365 NOT NULL,
  "action" text DEFAULT 'anonymise'::text NOT NULL,
  "active" boolean DEFAULT true NOT NULL,
  "note" text DEFAULT ''::text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public.retention_runs (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "ran_at" timestamp with time zone DEFAULT now() NOT NULL,
  "dry_run" boolean DEFAULT true NOT NULL,
  "actor_id" uuid,
  "summary" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public.risk_email_domains (
  "domain" text NOT NULL,
  "active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public.risk_rules (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "signal" text NOT NULL,
  "label" text DEFAULT ''::text NOT NULL,
  "weight" numeric DEFAULT 10 NOT NULL,
  "active" boolean DEFAULT true NOT NULL,
  "note" text DEFAULT ''::text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public.service_catalogue (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "category_id" uuid,
  "key" text NOT NULL,
  "label_de" text DEFAULT ''::text NOT NULL,
  "label_fr" text DEFAULT ''::text NOT NULL,
  "label_it" text DEFAULT ''::text NOT NULL,
  "label_en" text DEFAULT ''::text NOT NULL,
  "unit" public.service_unit NOT NULL,
  "active" boolean DEFAULT true NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public.service_rates (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "catalogue_id" uuid NOT NULL,
  "scope" public.rate_scope DEFAULT 'default'::rate_scope NOT NULL,
  "scope_ref" text DEFAULT ''::text NOT NULL,
  "sell_price" numeric,
  "cost_price" numeric,
  "min_margin_pct" numeric,
  "currency" text DEFAULT 'CHF'::text NOT NULL,
  "valid_from" date DEFAULT CURRENT_DATE NOT NULL,
  "valid_to" date,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "country" text DEFAULT 'CH'::text NOT NULL
);
CREATE TABLE IF NOT EXISTS public.service_schedules (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "site_service_id" uuid NOT NULL,
  "frequency" public.service_frequency DEFAULT 'monthly'::service_frequency NOT NULL,
  "weekday" integer,
  "day_of_month" integer,
  "month_offset" integer DEFAULT 0 NOT NULL,
  "window_start_time" time without time zone DEFAULT '08:00:00'::time without time zone NOT NULL,
  "window_end_time" time without time zone DEFAULT '17:00:00'::time without time zone NOT NULL,
  "next_due_on" date DEFAULT CURRENT_DATE NOT NULL,
  "last_generated_on" date,
  "lead_time_days" integer DEFAULT 7 NOT NULL,
  "custom_cron" text DEFAULT ''::text NOT NULL,
  "active" boolean DEFAULT true NOT NULL,
  "paused_until" date,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public.service_zones (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "country" text DEFAULT 'CH'::text NOT NULL,
  "canton" text DEFAULT ''::text NOT NULL,
  "city" text DEFAULT ''::text NOT NULL,
  "postcode_prefix" text DEFAULT ''::text NOT NULL,
  "active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public.site_services (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "site_id" uuid NOT NULL,
  "catalogue_id" uuid NOT NULL,
  "agreed_price" numeric,
  "frequency" public.service_frequency DEFAULT 'one_off'::service_frequency NOT NULL,
  "sla_id" uuid,
  "preferred_fulfilment" public.fulfilment_pref DEFAULT 'either'::fulfilment_pref NOT NULL,
  "preferred_partner_id" uuid,
  "preferred_team_id" uuid,
  "active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public.site_visits (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "lead_id" uuid NOT NULL,
  "assigned_kind" public.resource_kind,
  "assigned_id" uuid,
  "scheduled_at" timestamp with time zone,
  "completed_at" timestamp with time zone,
  "notes" text DEFAULT ''::text NOT NULL,
  "measurements" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "photos" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public.slas (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "country" text DEFAULT 'CH'::text NOT NULL,
  "name" text NOT NULL,
  "response_minutes" integer NOT NULL,
  "resolution_hours" integer NOT NULL,
  "coverage" public.sla_coverage DEFAULT 'business_hours'::sla_coverage NOT NULL,
  "business_hours" jsonb DEFAULT '{"fri": ["08:00", "17:00"], "mon": ["08:00", "17:00"], "sat": [], "sun": [], "thu": ["08:00", "17:00"], "tue": ["08:00", "17:00"], "wed": ["08:00", "17:00"]}'::jsonb NOT NULL,
  "emergency_rate_multiplier" numeric DEFAULT 1.0 NOT NULL,
  "penalty_type" public.sla_penalty_type DEFAULT 'none'::sla_penalty_type NOT NULL,
  "penalty_value" numeric DEFAULT 0 NOT NULL,
  "active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public.source_costs (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "source_id" uuid NOT NULL,
  "period_start" date NOT NULL,
  "period_end" date NOT NULL,
  "spend" numeric DEFAULT 0 NOT NULL,
  "currency" text DEFAULT 'CHF'::text NOT NULL,
  "note" text DEFAULT ''::text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public.unit_occupants (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL,
  "unit_id" uuid NOT NULL,
  "full_name" text NOT NULL,
  "phone" text DEFAULT ''::text NOT NULL,
  "email" text DEFAULT ''::text NOT NULL,
  "notes" text DEFAULT ''::text NOT NULL,
  "moves_out_on" date,
  "archived" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public.units (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL,
  "property_id" uuid NOT NULL,
  "label" text NOT NULL,
  "rooms" numeric,
  "floor" integer DEFAULT 0 NOT NULL,
  "has_lift" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "unit_type" text DEFAULT 'wohnung'::text NOT NULL,
  "size_m2" numeric,
  "notes" text DEFAULT ''::text NOT NULL,
  "archived" boolean DEFAULT false NOT NULL
);
CREATE TABLE IF NOT EXISTS public.work_orders (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "reference" text DEFAULT 'pending'::text NOT NULL,
  "account_id" uuid NOT NULL,
  "site_id" uuid NOT NULL,
  "contract_id" uuid,
  "schedule_id" uuid,
  "lead_id" uuid,
  "catalogue_id" uuid,
  "service" text DEFAULT ''::text NOT NULL,
  "due_on" date DEFAULT CURRENT_DATE NOT NULL,
  "window_start" timestamp with time zone,
  "window_end" timestamp with time zone,
  "sla_id" uuid,
  "reported_at" timestamp with time zone DEFAULT now() NOT NULL,
  "response_due_at" timestamp with time zone,
  "resolution_due_at" timestamp with time zone,
  "responded_at" timestamp with time zone,
  "resolved_at" timestamp with time zone,
  "status" public.work_order_status DEFAULT 'planned'::work_order_status NOT NULL,
  "job_execution_id" uuid,
  "opportunity_id" uuid,
  "preferred_fulfilment" public.fulfilment_pref DEFAULT 'either'::fulfilment_pref NOT NULL,
  "partner_id" uuid,
  "team_id" uuid,
  "value" numeric,
  "cost" numeric,
  "invoice_id" uuid,
  "note" text DEFAULT ''::text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Primary keys, unique and check constraints
ALTER TABLE public.account_contacts DROP CONSTRAINT IF EXISTS account_contacts_preferred_language_check;
ALTER TABLE public.account_contacts ADD CONSTRAINT account_contacts_preferred_language_check CHECK ((preferred_language = ANY (ARRAY['de'::text, 'fr'::text, 'it'::text, 'en'::text])));
ALTER TABLE public.account_contacts DROP CONSTRAINT IF EXISTS account_contacts_pkey;
ALTER TABLE public.account_contacts ADD CONSTRAINT account_contacts_pkey PRIMARY KEY (id);
ALTER TABLE public.account_services DROP CONSTRAINT IF EXISTS account_services_pkey;
ALTER TABLE public.account_services ADD CONSTRAINT account_services_pkey PRIMARY KEY (id);
ALTER TABLE public.account_services DROP CONSTRAINT IF EXISTS account_services_account_id_catalogue_id_key;
ALTER TABLE public.account_services ADD CONSTRAINT account_services_account_id_catalogue_id_key UNIQUE (account_id, catalogue_id);
ALTER TABLE public.account_sites DROP CONSTRAINT IF EXISTS account_sites_pkey;
ALTER TABLE public.account_sites ADD CONSTRAINT account_sites_pkey PRIMARY KEY (id);
ALTER TABLE public.accounts DROP CONSTRAINT IF EXISTS accounts_pkey;
ALTER TABLE public.accounts ADD CONSTRAINT accounts_pkey PRIMARY KEY (id);
ALTER TABLE public.allocation_exceptions DROP CONSTRAINT IF EXISTS allocation_exceptions_pkey;
ALTER TABLE public.allocation_exceptions ADD CONSTRAINT allocation_exceptions_pkey PRIMARY KEY (id);
ALTER TABLE public.allocation_rules DROP CONSTRAINT IF EXISTS allocation_rules_pkey;
ALTER TABLE public.allocation_rules ADD CONSTRAINT allocation_rules_pkey PRIMARY KEY (id);
ALTER TABLE public.approval_requests DROP CONSTRAINT IF EXISTS approval_requests_pkey;
ALTER TABLE public.approval_requests ADD CONSTRAINT approval_requests_pkey PRIMARY KEY (id);
ALTER TABLE public.approval_rules DROP CONSTRAINT IF EXISTS approval_rules_pkey;
ALTER TABLE public.approval_rules ADD CONSTRAINT approval_rules_pkey PRIMARY KEY (id);
ALTER TABLE public.cancellation_rules DROP CONSTRAINT IF EXISTS cancellation_rules_pkey;
ALTER TABLE public.cancellation_rules ADD CONSTRAINT cancellation_rules_pkey PRIMARY KEY (id);
ALTER TABLE public.cancellation_rules DROP CONSTRAINT IF EXISTS cancellation_rules_band_key;
ALTER TABLE public.cancellation_rules ADD CONSTRAINT cancellation_rules_band_key UNIQUE (who, band_key);
ALTER TABLE public.change_orders DROP CONSTRAINT IF EXISTS change_orders_pkey;
ALTER TABLE public.change_orders ADD CONSTRAINT change_orders_pkey PRIMARY KEY (id);
ALTER TABLE public.change_orders DROP CONSTRAINT IF EXISTS change_orders_reference_key;
ALTER TABLE public.change_orders ADD CONSTRAINT change_orders_reference_key UNIQUE (reference);
ALTER TABLE public.chat_messages DROP CONSTRAINT IF EXISTS chat_messages_role_check;
ALTER TABLE public.chat_messages ADD CONSTRAINT chat_messages_role_check CHECK ((role = ANY (ARRAY['user'::text, 'assistant'::text])));
ALTER TABLE public.chat_messages DROP CONSTRAINT IF EXISTS chat_messages_pkey;
ALTER TABLE public.chat_messages ADD CONSTRAINT chat_messages_pkey PRIMARY KEY (id);
ALTER TABLE public.chat_sessions DROP CONSTRAINT IF EXISTS chat_sessions_pkey;
ALTER TABLE public.chat_sessions ADD CONSTRAINT chat_sessions_pkey PRIMARY KEY (id);
ALTER TABLE public.consent_records DROP CONSTRAINT IF EXISTS consent_records_country_check;
ALTER TABLE public.consent_records ADD CONSTRAINT consent_records_country_check CHECK ((country = 'CH'::text));
ALTER TABLE public.consent_records DROP CONSTRAINT IF EXISTS consent_records_pkey;
ALTER TABLE public.consent_records ADD CONSTRAINT consent_records_pkey PRIMARY KEY (id);
ALTER TABLE public.contract_sites DROP CONSTRAINT IF EXISTS contract_sites_pkey;
ALTER TABLE public.contract_sites ADD CONSTRAINT contract_sites_pkey PRIMARY KEY (id);
ALTER TABLE public.contract_sites DROP CONSTRAINT IF EXISTS contract_sites_contract_id_site_id_key;
ALTER TABLE public.contract_sites ADD CONSTRAINT contract_sites_contract_id_site_id_key UNIQUE (contract_id, site_id);
ALTER TABLE public.contracts DROP CONSTRAINT IF EXISTS contracts_pkey;
ALTER TABLE public.contracts ADD CONSTRAINT contracts_pkey PRIMARY KEY (id);
ALTER TABLE public.contracts DROP CONSTRAINT IF EXISTS contracts_reference_key;
ALTER TABLE public.contracts ADD CONSTRAINT contracts_reference_key UNIQUE (reference);
ALTER TABLE public.dispatch_automation DROP CONSTRAINT IF EXISTS dispatch_automation_id_check;
ALTER TABLE public.dispatch_automation ADD CONSTRAINT dispatch_automation_id_check CHECK (id);
ALTER TABLE public.dispatch_automation DROP CONSTRAINT IF EXISTS dispatch_automation_interval_minutes_check;
ALTER TABLE public.dispatch_automation ADD CONSTRAINT dispatch_automation_interval_minutes_check CHECK (((interval_minutes >= 1) AND (interval_minutes <= 1440)));
ALTER TABLE public.dispatch_automation DROP CONSTRAINT IF EXISTS dispatch_automation_pkey;
ALTER TABLE public.dispatch_automation ADD CONSTRAINT dispatch_automation_pkey PRIMARY KEY (id);
ALTER TABLE public.dispatch_runs DROP CONSTRAINT IF EXISTS dispatch_runs_pkey;
ALTER TABLE public.dispatch_runs ADD CONSTRAINT dispatch_runs_pkey PRIMARY KEY (id);
ALTER TABLE public.email_accounts DROP CONSTRAINT IF EXISTS email_accounts_pkey;
ALTER TABLE public.email_accounts ADD CONSTRAINT email_accounts_pkey PRIMARY KEY (id);
ALTER TABLE public.email_accounts DROP CONSTRAINT IF EXISTS email_accounts_address_key;
ALTER TABLE public.email_accounts ADD CONSTRAINT email_accounts_address_key UNIQUE (address);
ALTER TABLE public.email_assignments DROP CONSTRAINT IF EXISTS email_assignments_pkey;
ALTER TABLE public.email_assignments ADD CONSTRAINT email_assignments_pkey PRIMARY KEY (id);
ALTER TABLE public.email_attachments DROP CONSTRAINT IF EXISTS email_attachments_pkey;
ALTER TABLE public.email_attachments ADD CONSTRAINT email_attachments_pkey PRIMARY KEY (id);
ALTER TABLE public.email_links DROP CONSTRAINT IF EXISTS email_links_pkey;
ALTER TABLE public.email_links ADD CONSTRAINT email_links_pkey PRIMARY KEY (id);
ALTER TABLE public.email_links DROP CONSTRAINT IF EXISTS email_links_thread_id_entity_type_entity_id_key;
ALTER TABLE public.email_links ADD CONSTRAINT email_links_thread_id_entity_type_entity_id_key UNIQUE (thread_id, entity_type, entity_id);
ALTER TABLE public.email_messages DROP CONSTRAINT IF EXISTS email_messages_pkey;
ALTER TABLE public.email_messages ADD CONSTRAINT email_messages_pkey PRIMARY KEY (id);
ALTER TABLE public.email_tags DROP CONSTRAINT IF EXISTS email_tags_pkey;
ALTER TABLE public.email_tags ADD CONSTRAINT email_tags_pkey PRIMARY KEY (id);
ALTER TABLE public.email_tags DROP CONSTRAINT IF EXISTS email_tags_thread_id_tag_key;
ALTER TABLE public.email_tags ADD CONSTRAINT email_tags_thread_id_tag_key UNIQUE (thread_id, tag);
ALTER TABLE public.email_threads DROP CONSTRAINT IF EXISTS email_threads_pkey;
ALTER TABLE public.email_threads ADD CONSTRAINT email_threads_pkey PRIMARY KEY (id);
ALTER TABLE public.enquiries DROP CONSTRAINT IF EXISTS enquiries_pkey;
ALTER TABLE public.enquiries ADD CONSTRAINT enquiries_pkey PRIMARY KEY (id);
ALTER TABLE public.exception_rules DROP CONSTRAINT IF EXISTS exception_rules_severity_check;
ALTER TABLE public.exception_rules ADD CONSTRAINT exception_rules_severity_check CHECK ((severity = ANY (ARRAY['critical'::text, 'warning'::text, 'info'::text])));
ALTER TABLE public.exception_rules DROP CONSTRAINT IF EXISTS exception_rules_pkey;
ALTER TABLE public.exception_rules ADD CONSTRAINT exception_rules_pkey PRIMARY KEY (id);
ALTER TABLE public.exception_rules DROP CONSTRAINT IF EXISTS exception_rules_key_key;
ALTER TABLE public.exception_rules ADD CONSTRAINT exception_rules_key_key UNIQUE (key);
ALTER TABLE public.fairness_rules DROP CONSTRAINT IF EXISTS fairness_rules_pkey;
ALTER TABLE public.fairness_rules ADD CONSTRAINT fairness_rules_pkey PRIMARY KEY (id);
ALTER TABLE public.fairness_rules DROP CONSTRAINT IF EXISTS fairness_rules_key_key;
ALTER TABLE public.fairness_rules ADD CONSTRAINT fairness_rules_key_key UNIQUE (key);
ALTER TABLE public.internal_teams DROP CONSTRAINT IF EXISTS internal_teams_pkey;
ALTER TABLE public.internal_teams ADD CONSTRAINT internal_teams_pkey PRIMARY KEY (id);
ALTER TABLE public.invoice_lines DROP CONSTRAINT IF EXISTS invoice_lines_pkey;
ALTER TABLE public.invoice_lines ADD CONSTRAINT invoice_lines_pkey PRIMARY KEY (id);
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_pkey;
ALTER TABLE public.invoices ADD CONSTRAINT invoices_pkey PRIMARY KEY (id);
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_reference_key;
ALTER TABLE public.invoices ADD CONSTRAINT invoices_reference_key UNIQUE (reference);
ALTER TABLE public.job_events DROP CONSTRAINT IF EXISTS job_events_pkey;
ALTER TABLE public.job_events ADD CONSTRAINT job_events_pkey PRIMARY KEY (id);
ALTER TABLE public.job_events_exec DROP CONSTRAINT IF EXISTS job_events_exec_pkey;
ALTER TABLE public.job_events_exec ADD CONSTRAINT job_events_exec_pkey PRIMARY KEY (id);
ALTER TABLE public.job_materials DROP CONSTRAINT IF EXISTS job_materials_pkey;
ALTER TABLE public.job_materials ADD CONSTRAINT job_materials_pkey PRIMARY KEY (id);
ALTER TABLE public.job_photos DROP CONSTRAINT IF EXISTS job_photos_pkey;
ALTER TABLE public.job_photos ADD CONSTRAINT job_photos_pkey PRIMARY KEY (id);
ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_pkey;
ALTER TABLE public.jobs ADD CONSTRAINT jobs_pkey PRIMARY KEY (id);
ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_reference_key;
ALTER TABLE public.jobs ADD CONSTRAINT jobs_reference_key UNIQUE (reference);
ALTER TABLE public.jobs_execution DROP CONSTRAINT IF EXISTS jobs_execution_resource_ck;
ALTER TABLE public.jobs_execution ADD CONSTRAINT jobs_execution_resource_ck CHECK (((partner_id IS NOT NULL) OR (team_id IS NOT NULL)));
ALTER TABLE public.jobs_execution DROP CONSTRAINT IF EXISTS jobs_execution_pkey;
ALTER TABLE public.jobs_execution ADD CONSTRAINT jobs_execution_pkey PRIMARY KEY (id);
ALTER TABLE public.jobs_execution DROP CONSTRAINT IF EXISTS jobs_execution_reference_key;
ALTER TABLE public.jobs_execution ADD CONSTRAINT jobs_execution_reference_key UNIQUE (reference);
ALTER TABLE public.lead_activities DROP CONSTRAINT IF EXISTS lead_activities_pkey;
ALTER TABLE public.lead_activities ADD CONSTRAINT lead_activities_pkey PRIMARY KEY (id);
ALTER TABLE public.lead_attachments DROP CONSTRAINT IF EXISTS lead_attachments_pkey;
ALTER TABLE public.lead_attachments ADD CONSTRAINT lead_attachments_pkey PRIMARY KEY (id);
ALTER TABLE public.lead_duplicates DROP CONSTRAINT IF EXISTS lead_duplicates_pkey;
ALTER TABLE public.lead_duplicates ADD CONSTRAINT lead_duplicates_pkey PRIMARY KEY (id);
ALTER TABLE public.lead_duplicates DROP CONSTRAINT IF EXISTS lead_duplicates_lead_id_existing_lead_id_key;
ALTER TABLE public.lead_duplicates ADD CONSTRAINT lead_duplicates_lead_id_existing_lead_id_key UNIQUE (lead_id, existing_lead_id);
ALTER TABLE public.lead_followups DROP CONSTRAINT IF EXISTS lead_followups_pkey;
ALTER TABLE public.lead_followups ADD CONSTRAINT lead_followups_pkey PRIMARY KEY (id);
ALTER TABLE public.lead_loss_reasons DROP CONSTRAINT IF EXISTS lead_loss_reasons_pkey;
ALTER TABLE public.lead_loss_reasons ADD CONSTRAINT lead_loss_reasons_pkey PRIMARY KEY (id);
ALTER TABLE public.lead_loss_reasons DROP CONSTRAINT IF EXISTS lead_loss_reasons_key_key;
ALTER TABLE public.lead_loss_reasons ADD CONSTRAINT lead_loss_reasons_key_key UNIQUE (key);
ALTER TABLE public.lead_notes DROP CONSTRAINT IF EXISTS lead_notes_pkey;
ALTER TABLE public.lead_notes ADD CONSTRAINT lead_notes_pkey PRIMARY KEY (id);
ALTER TABLE public.lead_queues DROP CONSTRAINT IF EXISTS lead_queues_pkey;
ALTER TABLE public.lead_queues ADD CONSTRAINT lead_queues_pkey PRIMARY KEY (id);
ALTER TABLE public.lead_queues DROP CONSTRAINT IF EXISTS lead_queues_key_key;
ALTER TABLE public.lead_queues ADD CONSTRAINT lead_queues_key_key UNIQUE (key);
ALTER TABLE public.lead_risk_signals DROP CONSTRAINT IF EXISTS lead_risk_signals_pkey;
ALTER TABLE public.lead_risk_signals ADD CONSTRAINT lead_risk_signals_pkey PRIMARY KEY (id);
ALTER TABLE public.lead_routing_rules DROP CONSTRAINT IF EXISTS lead_routing_rules_pkey;
ALTER TABLE public.lead_routing_rules ADD CONSTRAINT lead_routing_rules_pkey PRIMARY KEY (id);
ALTER TABLE public.lead_routing_rules DROP CONSTRAINT IF EXISTS lead_routing_rules_key_key;
ALTER TABLE public.lead_routing_rules ADD CONSTRAINT lead_routing_rules_key_key UNIQUE (key);
ALTER TABLE public.lead_sources DROP CONSTRAINT IF EXISTS lead_sources_pkey;
ALTER TABLE public.lead_sources ADD CONSTRAINT lead_sources_pkey PRIMARY KEY (id);
ALTER TABLE public.lead_sources DROP CONSTRAINT IF EXISTS lead_sources_key_key;
ALTER TABLE public.lead_sources ADD CONSTRAINT lead_sources_key_key UNIQUE (key);
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_pkey;
ALTER TABLE public.leads ADD CONSTRAINT leads_pkey PRIMARY KEY (id);
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_reference_key;
ALTER TABLE public.leads ADD CONSTRAINT leads_reference_key UNIQUE (reference);
ALTER TABLE public.legal_documents DROP CONSTRAINT IF EXISTS legal_documents_country_check;
ALTER TABLE public.legal_documents ADD CONSTRAINT legal_documents_country_check CHECK ((country = 'CH'::text));
ALTER TABLE public.legal_documents DROP CONSTRAINT IF EXISTS legal_documents_doc_type_check;
ALTER TABLE public.legal_documents ADD CONSTRAINT legal_documents_doc_type_check CHECK ((doc_type = ANY (ARRAY['terms'::text, 'privacy'::text, 'cookies'::text, 'cancellation'::text, 'legal_notice'::text, 'partner_terms'::text, 'partner_code_of_conduct'::text, 'partner_privacy'::text, 'partner_health_safety'::text, 'complaints'::text])));
ALTER TABLE public.legal_documents DROP CONSTRAINT IF EXISTS legal_documents_language_check;
ALTER TABLE public.legal_documents ADD CONSTRAINT legal_documents_language_check CHECK ((language = ANY (ARRAY['de'::text, 'fr'::text, 'it'::text, 'en'::text])));
ALTER TABLE public.legal_documents DROP CONSTRAINT IF EXISTS legal_documents_pkey;
ALTER TABLE public.legal_documents ADD CONSTRAINT legal_documents_pkey PRIMARY KEY (id);
ALTER TABLE public.legal_documents DROP CONSTRAINT IF EXISTS legal_documents_doc_type_country_language_version_key;
ALTER TABLE public.legal_documents ADD CONSTRAINT legal_documents_doc_type_country_language_version_key UNIQUE (doc_type, country, language, version);
ALTER TABLE public.legal_entities DROP CONSTRAINT IF EXISTS legal_entities_country_check;
ALTER TABLE public.legal_entities ADD CONSTRAINT legal_entities_country_check CHECK ((country = 'CH'::text));
ALTER TABLE public.legal_entities DROP CONSTRAINT IF EXISTS legal_entities_currency_check;
ALTER TABLE public.legal_entities ADD CONSTRAINT legal_entities_currency_check CHECK ((currency = 'CHF'::text));
ALTER TABLE public.legal_entities DROP CONSTRAINT IF EXISTS legal_entities_status_check;
ALTER TABLE public.legal_entities ADD CONSTRAINT legal_entities_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'complete'::text])));
ALTER TABLE public.legal_entities DROP CONSTRAINT IF EXISTS legal_entities_pkey;
ALTER TABLE public.legal_entities ADD CONSTRAINT legal_entities_pkey PRIMARY KEY (id);
ALTER TABLE public.legal_entities DROP CONSTRAINT IF EXISTS legal_entities_country_key;
ALTER TABLE public.legal_entities ADD CONSTRAINT legal_entities_country_key UNIQUE (country);
ALTER TABLE public.markets DROP CONSTRAINT IF EXISTS markets_consumer_regime_check;
ALTER TABLE public.markets ADD CONSTRAINT markets_consumer_regime_check CHECK ((consumer_regime = ANY (ARRAY['swiss'::text, 'eu'::text])));
ALTER TABLE public.markets DROP CONSTRAINT IF EXISTS markets_country_check;
ALTER TABLE public.markets ADD CONSTRAINT markets_country_check CHECK ((country = ANY (ARRAY['CH'::text, 'DE'::text, 'FR'::text, 'IT'::text])));
ALTER TABLE public.markets DROP CONSTRAINT IF EXISTS markets_pkey;
ALTER TABLE public.markets ADD CONSTRAINT markets_pkey PRIMARY KEY (country);
ALTER TABLE public.notification_log DROP CONSTRAINT IF EXISTS notification_log_status_check;
ALTER TABLE public.notification_log ADD CONSTRAINT notification_log_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'sent'::text, 'failed'::text, 'skipped'::text])));
ALTER TABLE public.notification_log DROP CONSTRAINT IF EXISTS notification_log_pkey;
ALTER TABLE public.notification_log ADD CONSTRAINT notification_log_pkey PRIMARY KEY (id);
ALTER TABLE public.notification_settings DROP CONSTRAINT IF EXISTS notification_settings_pkey;
ALTER TABLE public.notification_settings ADD CONSTRAINT notification_settings_pkey PRIMARY KEY (id);
ALTER TABLE public.organizations DROP CONSTRAINT IF EXISTS organizations_pkey;
ALTER TABLE public.organizations ADD CONSTRAINT organizations_pkey PRIMARY KEY (id);
ALTER TABLE public.partner_allocation_stats DROP CONSTRAINT IF EXISTS partner_allocation_stats_pkey;
ALTER TABLE public.partner_allocation_stats ADD CONSTRAINT partner_allocation_stats_pkey PRIMARY KEY (id);
ALTER TABLE public.partner_categories DROP CONSTRAINT IF EXISTS partner_categories_pkey;
ALTER TABLE public.partner_categories ADD CONSTRAINT partner_categories_pkey PRIMARY KEY (id);
ALTER TABLE public.partner_categories DROP CONSTRAINT IF EXISTS partner_categories_key_key;
ALTER TABLE public.partner_categories ADD CONSTRAINT partner_categories_key_key UNIQUE (key);
ALTER TABLE public.partner_contacts DROP CONSTRAINT IF EXISTS partner_contacts_pkey;
ALTER TABLE public.partner_contacts ADD CONSTRAINT partner_contacts_pkey PRIMARY KEY (id);
ALTER TABLE public.partner_coverage DROP CONSTRAINT IF EXISTS partner_coverage_pkey;
ALTER TABLE public.partner_coverage ADD CONSTRAINT partner_coverage_pkey PRIMARY KEY (id);
ALTER TABLE public.partner_documents DROP CONSTRAINT IF EXISTS partner_documents_pkey;
ALTER TABLE public.partner_documents ADD CONSTRAINT partner_documents_pkey PRIMARY KEY (id);
ALTER TABLE public.partner_fleet DROP CONSTRAINT IF EXISTS partner_fleet_pkey;
ALTER TABLE public.partner_fleet ADD CONSTRAINT partner_fleet_pkey PRIMARY KEY (id);
ALTER TABLE public.partner_notes DROP CONSTRAINT IF EXISTS partner_notes_pkey;
ALTER TABLE public.partner_notes ADD CONSTRAINT partner_notes_pkey PRIMARY KEY (id);
ALTER TABLE public.partner_opportunities DROP CONSTRAINT IF EXISTS partner_opportunities_allocation_kind_ck;
ALTER TABLE public.partner_opportunities ADD CONSTRAINT partner_opportunities_allocation_kind_ck CHECK ((allocation_kind = ANY (ARRAY['manual'::text, 'ranked'::text, 'escalation'::text, 'exploration'::text])));
ALTER TABLE public.partner_opportunities DROP CONSTRAINT IF EXISTS partner_opportunities_status_check;
ALTER TABLE public.partner_opportunities ADD CONSTRAINT partner_opportunities_status_check CHECK ((status = ANY (ARRAY['sent'::text, 'viewed'::text, 'accepted'::text, 'declined'::text, 'timed_out'::text, 'withdrawn'::text, 'draft'::text])));
ALTER TABLE public.partner_opportunities DROP CONSTRAINT IF EXISTS partner_opportunities_pkey;
ALTER TABLE public.partner_opportunities ADD CONSTRAINT partner_opportunities_pkey PRIMARY KEY (id);
ALTER TABLE public.partner_performance DROP CONSTRAINT IF EXISTS partner_performance_pkey;
ALTER TABLE public.partner_performance ADD CONSTRAINT partner_performance_pkey PRIMARY KEY (partner_id);
ALTER TABLE public.partner_quotations DROP CONSTRAINT IF EXISTS partner_quotations_pkey;
ALTER TABLE public.partner_quotations ADD CONSTRAINT partner_quotations_pkey PRIMARY KEY (id);
ALTER TABLE public.partner_quotes DROP CONSTRAINT IF EXISTS partner_quotes_pkey;
ALTER TABLE public.partner_quotes ADD CONSTRAINT partner_quotes_pkey PRIMARY KEY (id);
ALTER TABLE public.partner_ratings DROP CONSTRAINT IF EXISTS partner_ratings_pkey;
ALTER TABLE public.partner_ratings ADD CONSTRAINT partner_ratings_pkey PRIMARY KEY (id);
ALTER TABLE public.partner_services DROP CONSTRAINT IF EXISTS partner_services_pkey;
ALTER TABLE public.partner_services ADD CONSTRAINT partner_services_pkey PRIMARY KEY (id);
ALTER TABLE public.partner_status_history DROP CONSTRAINT IF EXISTS partner_status_history_pkey;
ALTER TABLE public.partner_status_history ADD CONSTRAINT partner_status_history_pkey PRIMARY KEY (id);
ALTER TABLE public.partner_work_orders DROP CONSTRAINT IF EXISTS partner_work_orders_pkey;
ALTER TABLE public.partner_work_orders ADD CONSTRAINT partner_work_orders_pkey PRIMARY KEY (id);
ALTER TABLE public.partner_workforce DROP CONSTRAINT IF EXISTS partner_workforce_pkey;
ALTER TABLE public.partner_workforce ADD CONSTRAINT partner_workforce_pkey PRIMARY KEY (id);
ALTER TABLE public.partners DROP CONSTRAINT IF EXISTS partners_pkey;
ALTER TABLE public.partners ADD CONSTRAINT partners_pkey PRIMARY KEY (id);
ALTER TABLE public.partners DROP CONSTRAINT IF EXISTS partners_reference_key;
ALTER TABLE public.partners ADD CONSTRAINT partners_reference_key UNIQUE (reference);
ALTER TABLE public.portfolio_price_overrides DROP CONSTRAINT IF EXISTS portfolio_override_target;
ALTER TABLE public.portfolio_price_overrides ADD CONSTRAINT portfolio_override_target CHECK ((NOT ((property_id IS NOT NULL) AND (unit_id IS NOT NULL))));
ALTER TABLE public.portfolio_price_overrides DROP CONSTRAINT IF EXISTS portfolio_price_overrides_pkey;
ALTER TABLE public.portfolio_price_overrides ADD CONSTRAINT portfolio_price_overrides_pkey PRIMARY KEY (id);
ALTER TABLE public.pricing_configurations DROP CONSTRAINT IF EXISTS pricing_configurations_pkey;
ALTER TABLE public.pricing_configurations ADD CONSTRAINT pricing_configurations_pkey PRIMARY KEY (id);
ALTER TABLE public.pricing_configurations DROP CONSTRAINT IF EXISTS pricing_configurations_market_version_key;
ALTER TABLE public.pricing_configurations ADD CONSTRAINT pricing_configurations_market_version_key UNIQUE (market, version);
ALTER TABLE public.pricing_rules DROP CONSTRAINT IF EXISTS pricing_rules_band_half_open;
ALTER TABLE public.pricing_rules ADD CONSTRAINT pricing_rules_band_half_open CHECK (((room_min IS NULL) OR (room_max IS NULL) OR (room_max > room_min)));
ALTER TABLE public.pricing_rules DROP CONSTRAINT IF EXISTS pricing_rules_pkey;
ALTER TABLE public.pricing_rules ADD CONSTRAINT pricing_rules_pkey PRIMARY KEY (id);
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_ui_language_supported;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_ui_language_supported CHECK ((ui_language = ANY (ARRAY['de'::text, 'fr'::text, 'it'::text, 'en'::text])));
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_pkey;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);
ALTER TABLE public.properties DROP CONSTRAINT IF EXISTS properties_pkey;
ALTER TABLE public.properties ADD CONSTRAINT properties_pkey PRIMARY KEY (id);
ALTER TABLE public.quotes DROP CONSTRAINT IF EXISTS quotes_pkey;
ALTER TABLE public.quotes ADD CONSTRAINT quotes_pkey PRIMARY KEY (id);
ALTER TABLE public.quotes DROP CONSTRAINT IF EXISTS quotes_reference_key;
ALTER TABLE public.quotes ADD CONSTRAINT quotes_reference_key UNIQUE (reference);
ALTER TABLE public.quotes_customer DROP CONSTRAINT IF EXISTS quotes_customer_pkey;
ALTER TABLE public.quotes_customer ADD CONSTRAINT quotes_customer_pkey PRIMARY KEY (id);
ALTER TABLE public.quotes_customer DROP CONSTRAINT IF EXISTS quotes_customer_reference_key;
ALTER TABLE public.quotes_customer ADD CONSTRAINT quotes_customer_reference_key UNIQUE (reference);
ALTER TABLE public.readiness_attestations DROP CONSTRAINT IF EXISTS readiness_attestations_pkey;
ALTER TABLE public.readiness_attestations ADD CONSTRAINT readiness_attestations_pkey PRIMARY KEY (id);
ALTER TABLE public.readiness_attestations DROP CONSTRAINT IF EXISTS readiness_attestations_key_key;
ALTER TABLE public.readiness_attestations ADD CONSTRAINT readiness_attestations_key_key UNIQUE (key);
ALTER TABLE public.resource_availability DROP CONSTRAINT IF EXISTS resource_availability_pkey;
ALTER TABLE public.resource_availability ADD CONSTRAINT resource_availability_pkey PRIMARY KEY (id);
ALTER TABLE public.resource_availability DROP CONSTRAINT IF EXISTS resource_availability_resource_kind_resource_id_date_key;
ALTER TABLE public.resource_availability ADD CONSTRAINT resource_availability_resource_kind_resource_id_date_key UNIQUE (resource_kind, resource_id, date);
ALTER TABLE public.retention_rules DROP CONSTRAINT IF EXISTS retention_rules_action_ck;
ALTER TABLE public.retention_rules ADD CONSTRAINT retention_rules_action_ck CHECK ((action = ANY (ARRAY['anonymise'::text, 'delete'::text])));
ALTER TABLE public.retention_rules DROP CONSTRAINT IF EXISTS retention_rules_pkey;
ALTER TABLE public.retention_rules ADD CONSTRAINT retention_rules_pkey PRIMARY KEY (id);
ALTER TABLE public.retention_rules DROP CONSTRAINT IF EXISTS retention_rules_entity_key;
ALTER TABLE public.retention_rules ADD CONSTRAINT retention_rules_entity_key UNIQUE (entity);
ALTER TABLE public.retention_runs DROP CONSTRAINT IF EXISTS retention_runs_pkey;
ALTER TABLE public.retention_runs ADD CONSTRAINT retention_runs_pkey PRIMARY KEY (id);
ALTER TABLE public.risk_email_domains DROP CONSTRAINT IF EXISTS risk_email_domains_pkey;
ALTER TABLE public.risk_email_domains ADD CONSTRAINT risk_email_domains_pkey PRIMARY KEY (domain);
ALTER TABLE public.risk_rules DROP CONSTRAINT IF EXISTS risk_rules_pkey;
ALTER TABLE public.risk_rules ADD CONSTRAINT risk_rules_pkey PRIMARY KEY (id);
ALTER TABLE public.risk_rules DROP CONSTRAINT IF EXISTS risk_rules_signal_key;
ALTER TABLE public.risk_rules ADD CONSTRAINT risk_rules_signal_key UNIQUE (signal);
ALTER TABLE public.service_catalogue DROP CONSTRAINT IF EXISTS service_catalogue_pkey;
ALTER TABLE public.service_catalogue ADD CONSTRAINT service_catalogue_pkey PRIMARY KEY (id);
ALTER TABLE public.service_catalogue DROP CONSTRAINT IF EXISTS service_catalogue_key_key;
ALTER TABLE public.service_catalogue ADD CONSTRAINT service_catalogue_key_key UNIQUE (key);
ALTER TABLE public.service_rates DROP CONSTRAINT IF EXISTS service_rates_pkey;
ALTER TABLE public.service_rates ADD CONSTRAINT service_rates_pkey PRIMARY KEY (id);
ALTER TABLE public.service_schedules DROP CONSTRAINT IF EXISTS service_schedules_day_of_month_check;
ALTER TABLE public.service_schedules ADD CONSTRAINT service_schedules_day_of_month_check CHECK (((day_of_month >= 1) AND (day_of_month <= 28)));
ALTER TABLE public.service_schedules DROP CONSTRAINT IF EXISTS service_schedules_weekday_check;
ALTER TABLE public.service_schedules ADD CONSTRAINT service_schedules_weekday_check CHECK (((weekday >= 0) AND (weekday <= 6)));
ALTER TABLE public.service_schedules DROP CONSTRAINT IF EXISTS service_schedules_pkey;
ALTER TABLE public.service_schedules ADD CONSTRAINT service_schedules_pkey PRIMARY KEY (id);
ALTER TABLE public.service_zones DROP CONSTRAINT IF EXISTS service_zones_pkey;
ALTER TABLE public.service_zones ADD CONSTRAINT service_zones_pkey PRIMARY KEY (id);
ALTER TABLE public.service_zones DROP CONSTRAINT IF EXISTS service_zones_country_canton_city_postcode_prefix_key;
ALTER TABLE public.service_zones ADD CONSTRAINT service_zones_country_canton_city_postcode_prefix_key UNIQUE (country, canton, city, postcode_prefix);
ALTER TABLE public.site_services DROP CONSTRAINT IF EXISTS site_services_pkey;
ALTER TABLE public.site_services ADD CONSTRAINT site_services_pkey PRIMARY KEY (id);
ALTER TABLE public.site_services DROP CONSTRAINT IF EXISTS site_services_site_id_catalogue_id_key;
ALTER TABLE public.site_services ADD CONSTRAINT site_services_site_id_catalogue_id_key UNIQUE (site_id, catalogue_id);
ALTER TABLE public.site_visits DROP CONSTRAINT IF EXISTS site_visits_pkey;
ALTER TABLE public.site_visits ADD CONSTRAINT site_visits_pkey PRIMARY KEY (id);
ALTER TABLE public.slas DROP CONSTRAINT IF EXISTS slas_pkey;
ALTER TABLE public.slas ADD CONSTRAINT slas_pkey PRIMARY KEY (id);
ALTER TABLE public.source_costs DROP CONSTRAINT IF EXISTS source_costs_pkey;
ALTER TABLE public.source_costs ADD CONSTRAINT source_costs_pkey PRIMARY KEY (id);
ALTER TABLE public.source_costs DROP CONSTRAINT IF EXISTS source_costs_source_id_period_start_period_end_key;
ALTER TABLE public.source_costs ADD CONSTRAINT source_costs_source_id_period_start_period_end_key UNIQUE (source_id, period_start, period_end);
ALTER TABLE public.unit_occupants DROP CONSTRAINT IF EXISTS unit_occupants_pkey;
ALTER TABLE public.unit_occupants ADD CONSTRAINT unit_occupants_pkey PRIMARY KEY (id);
ALTER TABLE public.units DROP CONSTRAINT IF EXISTS units_pkey;
ALTER TABLE public.units ADD CONSTRAINT units_pkey PRIMARY KEY (id);
ALTER TABLE public.work_orders DROP CONSTRAINT IF EXISTS work_orders_pkey;
ALTER TABLE public.work_orders ADD CONSTRAINT work_orders_pkey PRIMARY KEY (id);
ALTER TABLE public.work_orders DROP CONSTRAINT IF EXISTS work_orders_reference_key;
ALTER TABLE public.work_orders ADD CONSTRAINT work_orders_reference_key UNIQUE (reference);
ALTER TABLE public.work_orders DROP CONSTRAINT IF EXISTS work_orders_schedule_id_due_on_key;
ALTER TABLE public.work_orders ADD CONSTRAINT work_orders_schedule_id_due_on_key UNIQUE (schedule_id, due_on);

-- Functions
-- Bodies are not validated while loading, so functions that call each other
-- can be created in any order.
SET check_function_bodies = off;
CREATE OR REPLACE FUNCTION public.accept_partner_quote(_quote_id uuid, _note text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE q public.partner_quotes; other record; winner uuid;
BEGIN
  IF NOT public.is_dispatcher() THEN
    RAISE EXCEPTION 'not authorised' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO q FROM public.partner_quotes WHERE id = _quote_id;
  IF q.id IS NULL THEN RAISE EXCEPTION 'quote not found' USING ERRCODE = 'P0002'; END IF;
  IF q.lead_id IS NULL THEN RAISE EXCEPTION 'quote is not linked to a lead' USING ERRCODE = '22023'; END IF;

  -- Serialise every acceptance for this lead, whichever quote it targets.
  PERFORM 1 FROM public.leads WHERE id = q.lead_id FOR UPDATE;

  -- Re-read under the lock: another transaction may have decided already.
  SELECT * INTO q FROM public.partner_quotes WHERE id = _quote_id;

  SELECT id INTO winner
    FROM public.partner_quotes
   WHERE lead_id = q.lead_id AND status = 'accepted'
   LIMIT 1;

  IF winner IS NOT NULL THEN
    IF winner = _quote_id THEN
      RETURN q.lead_id;  -- idempotent: same decision, repeated
    END IF;
    RAISE EXCEPTION 'already_allocated: another quote has been accepted for this lead'
      USING ERRCODE = '55006';
  END IF;

  IF q.status NOT IN ('submitted', 'draft') THEN
    RAISE EXCEPTION 'already_allocated: quote is %, it can no longer be accepted', q.status
      USING ERRCODE = '55006';
  END IF;

  UPDATE public.partner_quotes SET status = 'accepted', updated_at = now() WHERE id = _quote_id;
  UPDATE public.partner_quotes SET status = 'rejected', updated_at = now()
   WHERE lead_id = q.lead_id AND id <> _quote_id AND status IN ('submitted','draft');

  IF q.opportunity_id IS NOT NULL THEN
    UPDATE public.partner_opportunities
       SET status = 'accepted', responded_at = coalesce(responded_at, now()), updated_at = now()
     WHERE id = q.opportunity_id;
  END IF;

  FOR other IN
    SELECT id, partner_id FROM public.partner_opportunities
     WHERE lead_id = q.lead_id AND status IN ('sent','viewed')
       AND (q.opportunity_id IS NULL OR id <> q.opportunity_id)
  LOOP
    UPDATE public.partner_opportunities
       SET status = 'withdrawn', responded_at = now(), updated_at = now()
     WHERE id = other.id;
    INSERT INTO public.lead_activities (lead_id, kind, body, meta, actor_id, actor_kind)
    VALUES (q.lead_id, 'system', '',
            jsonb_build_object('opportunity', other.id, 'partner', other.partner_id, 'action', 'withdrawn'),
            auth.uid(), 'staff');
    PERFORM public.recalc_partner_performance(other.partner_id);
  END LOOP;

  UPDATE public.leads
     SET fulfilment_type = 'partner', assigned_partner_id = q.partner_id, assigned_team_id = NULL,
         last_activity_at = now()
   WHERE id = q.lead_id;

  INSERT INTO public.lead_activities (lead_id, kind, body, meta, actor_id, actor_kind)
  VALUES (q.lead_id, 'assignment', coalesce(_note,''),
          jsonb_build_object('quote', _quote_id, 'partner', q.partner_id, 'action', 'quote_accepted'),
          auth.uid(), 'staff');

  PERFORM public.recalc_partner_performance(q.partner_id);
  RETURN q.lead_id;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.account_visible(_account_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select public.is_dispatcher()
      or exists (
        select 1 from public.accounts a
        where a.id = _account_id
          and a.organization_id is not null
          and a.organization_id = public.current_org_id()
      )
$function$
;
CREATE OR REPLACE FUNCTION public.active_markets()
 RETURNS TABLE(country text, currency text, vat_rate numeric, consumer_regime text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select m.country, m.currency, m.vat_rate, m.consumer_regime
  from public.markets m where m.active order by m.country
$function$
;
CREATE OR REPLACE FUNCTION public.active_pricing_configuration(_market text DEFAULT 'CH'::text)
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT id FROM public.pricing_configurations
  WHERE market = _market AND status = 'published' AND effective_from <= current_date
  ORDER BY effective_from DESC, version DESC
  LIMIT 1
$function$
;
CREATE OR REPLACE FUNCTION public.add_coverage_minutes(_from timestamp with time zone, _minutes integer, _hours jsonb, _always boolean)
 RETURNS timestamp with time zone
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  cur timestamptz := _from; remaining int := greatest(_minutes, 0);
  guard int := 0; dkey text; win jsonb; open_t time; close_t time; day_open timestamptz; day_close timestamptz; step int;
begin
  if _always then return _from + make_interval(mins => _minutes); end if;
  while remaining > 0 and guard < 400 loop
    guard := guard + 1;
    dkey := lower(to_char(cur, 'dy'));
    win := _hours -> dkey;
    if win is null or jsonb_array_length(win) < 2 then
      cur := date_trunc('day', cur) + interval '1 day'; continue;
    end if;
    open_t := (win->>0)::time; close_t := (win->>1)::time;
    day_open := date_trunc('day', cur) + open_t; day_close := date_trunc('day', cur) + close_t;
    if cur < day_open then cur := day_open; end if;
    if cur >= day_close then cur := date_trunc('day', cur) + interval '1 day'; continue; end if;
    step := least(remaining, (extract(epoch from day_close - cur)/60)::int);
    cur := cur + make_interval(mins => step);
    remaining := remaining - step;
  end loop;
  return cur;
end $function$
;
CREATE OR REPLACE FUNCTION public.advance_due_date(_freq service_frequency, _from date, _weekday integer, _dom integer, _month_offset integer)
 RETURNS date
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select case _freq
    when 'weekly'     then _from + 7
    when 'biweekly'   then _from + 14
    when 'monthly'    then (_from + interval '1 month')::date
    when 'quarterly'  then (_from + interval '3 months')::date
    when 'semiannual' then (_from + interval '6 months')::date
    when 'annual'     then (_from + interval '1 year')::date
    else null
  end
$function$
;
CREATE OR REPLACE FUNCTION public.apply_change_order_decision(_id uuid, _approve boolean, _channel text, _name text)
 RETURNS change_orders
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE c public.change_orders;
BEGIN
  SELECT * INTO c FROM public.change_orders WHERE id = _id FOR UPDATE;
  IF c.id IS NULL THEN RAISE EXCEPTION 'change order not found' USING ERRCODE = 'P0002'; END IF;
  IF c.status NOT IN ('draft','awaiting_customer') THEN
    RAISE EXCEPTION 'change order already decided' USING ERRCODE = '22023';
  END IF;
  IF _approve AND c.customer_price IS NULL THEN
    RAISE EXCEPTION 'a customer price is required' USING ERRCODE = '22023';
  END IF;

  UPDATE public.change_orders
     SET status = (CASE WHEN _approve THEN 'approved' ELSE 'rejected' END)::public.change_order_status,
         customer_decided_at = now(),
         decision_channel = coalesce(btrim(_channel),''),
         decided_name = coalesce(btrim(_name),''),
         updated_at = now()
   WHERE id = _id RETURNING * INTO c;

  IF _approve THEN
    UPDATE public.jobs_execution
       SET job_value = coalesce(job_value, 0) + c.customer_price, updated_at = now()
     WHERE id = c.job_id;
    UPDATE public.job_materials SET status = 'approved', updated_at = now()
     WHERE change_order_id = c.id AND status = 'approval_required';
    IF c.lead_id IS NOT NULL THEN
      UPDATE public.leads
         SET estimated_value = coalesce(estimated_value, 0) + c.customer_price, updated_at = now()
       WHERE id = c.lead_id;
      PERFORM public.compute_lead_economics(c.lead_id);
    END IF;
  ELSE
    UPDATE public.job_materials SET status = 'rejected', updated_at = now()
     WHERE change_order_id = c.id AND status = 'approval_required';
  END IF;

  IF c.job_id IS NOT NULL THEN
    INSERT INTO public.job_events_exec (job_id, kind, body, meta, actor_id, actor_kind)
    VALUES (c.job_id, 'change_order', coalesce(btrim(_name),''),
            jsonb_build_object('change_order', c.id, 'status', c.status, 'channel', btrim(_channel),
                               'price', c.customer_price),
            auth.uid(), (CASE WHEN auth.uid() IS NULL THEN 'customer' ELSE 'staff' END)::public.lead_actor_kind);
  END IF;
  RETURN c;
END; $function$
;
CREATE OR REPLACE FUNCTION public.apply_retention(_dry_run boolean DEFAULT true)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  claims jsonb;
  r record;
  out jsonb := '[]'::jsonb;
  n bigint;
  skipped bigint;
BEGIN
  claims := nullif(current_setting('request.jwt.claims', true), '')::jsonb;
  IF claims IS NOT NULL AND coalesce(claims->>'role','') <> 'service_role' AND NOT public.is_staff() THEN
    RAISE EXCEPTION 'not authorised' USING ERRCODE = '42501';
  END IF;

  FOR r IN SELECT * FROM public.retention_rules WHERE active LOOP
    n := 0; skipped := 0;

    IF r.entity = 'unconverted_leads' THEN
      WITH cand AS (
        SELECT l.id,
               EXISTS (SELECT 1 FROM public.jobs_execution je WHERE je.lead_id = l.id) AS has_job,
               EXISTS (SELECT 1 FROM public.quotes_customer q WHERE q.lead_id = l.id AND q.status = 'accepted') AS has_quote,
               EXISTS (SELECT 1 FROM public.approval_requests a WHERE a.lead_id = l.id AND a.status = 'pending') AS open_dispute
          FROM public.leads l
         WHERE l.status IN ('new','lost','cancelled')
           AND l.created_at < now() - make_interval(days => r.retention_days)
           AND l.customer_name <> '[anonymised]'
      )
      SELECT count(*) FILTER (WHERE NOT has_job AND NOT has_quote AND NOT open_dispute),
             count(*) FILTER (WHERE has_job OR has_quote OR open_dispute)
        INTO n, skipped FROM cand;

      IF NOT _dry_run THEN
        UPDATE public.leads l
           SET customer_name = '[anonymised]', customer_email = '', customer_phone = '',
               service_address = '', description = '', ip_hash = '', updated_at = now()
         WHERE l.status IN ('new','lost','cancelled')
           AND l.created_at < now() - make_interval(days => r.retention_days)
           AND l.customer_name <> '[anonymised]'
           AND NOT EXISTS (SELECT 1 FROM public.jobs_execution je WHERE je.lead_id = l.id)
           AND NOT EXISTS (SELECT 1 FROM public.quotes_customer q WHERE q.lead_id = l.id AND q.status = 'accepted')
           AND NOT EXISTS (SELECT 1 FROM public.approval_requests a WHERE a.lead_id = l.id AND a.status = 'pending');
      END IF;

    ELSIF r.entity = 'lead_attachments' THEN
      SELECT count(*) INTO n FROM public.lead_attachments a
       WHERE a.created_at < now() - make_interval(days => r.retention_days)
         AND NOT EXISTS (SELECT 1 FROM public.quotes_customer q WHERE q.lead_id = a.lead_id AND q.status = 'accepted');
      SELECT count(*) INTO skipped FROM public.lead_attachments a
       WHERE a.created_at < now() - make_interval(days => r.retention_days)
         AND EXISTS (SELECT 1 FROM public.quotes_customer q WHERE q.lead_id = a.lead_id AND q.status = 'accepted');
      IF NOT _dry_run THEN
        DELETE FROM public.lead_attachments a
         WHERE a.created_at < now() - make_interval(days => r.retention_days)
           AND NOT EXISTS (SELECT 1 FROM public.quotes_customer q WHERE q.lead_id = a.lead_id AND q.status = 'accepted');
      END IF;

    ELSIF r.entity = 'job_evidence' THEN
      SELECT count(*) INTO n FROM public.job_photos p
        JOIN public.jobs_execution je ON je.id = p.job_id
       WHERE je.completed_at IS NOT NULL
         AND je.completed_at < now() - make_interval(days => r.retention_days)
         AND NOT je.cancellation_manual_review;
      SELECT count(*) INTO skipped FROM public.job_photos p
        JOIN public.jobs_execution je ON je.id = p.job_id
       WHERE je.completed_at IS NOT NULL
         AND je.completed_at < now() - make_interval(days => r.retention_days)
         AND je.cancellation_manual_review;
      IF NOT _dry_run THEN
        DELETE FROM public.job_photos p USING public.jobs_execution je
         WHERE je.id = p.job_id AND je.completed_at IS NOT NULL
           AND je.completed_at < now() - make_interval(days => r.retention_days)
           AND NOT je.cancellation_manual_review;
      END IF;

    ELSIF r.entity = 'partner_documents' THEN
      SELECT count(*) INTO n FROM public.partner_documents d
        JOIN public.partners p ON p.id = d.partner_id
       WHERE p.status IN ('rejected','suspended')
         AND p.updated_at < now() - make_interval(days => r.retention_days);
      IF NOT _dry_run THEN
        DELETE FROM public.partner_documents d USING public.partners p
         WHERE p.id = d.partner_id AND p.status IN ('rejected','suspended')
           AND p.updated_at < now() - make_interval(days => r.retention_days);
      END IF;

    ELSIF r.entity = 'risk_signals' THEN
      SELECT count(*) INTO n FROM public.lead_risk_signals s
       WHERE s.created_at < now() - make_interval(days => r.retention_days);
      IF NOT _dry_run THEN
        DELETE FROM public.lead_risk_signals s
         WHERE s.created_at < now() - make_interval(days => r.retention_days);
      END IF;

    ELSIF r.entity = 'chat_transcripts' THEN
      -- A conversation that produced an inquiry is part of that inquiry's
      -- record and is left to the lead rule; the rest is deleted outright.
      SELECT count(*) INTO n FROM public.chat_sessions s
       WHERE s.created_at < now() - make_interval(days => r.retention_days)
         AND s.lead_id IS NULL;
      SELECT count(*) INTO skipped FROM public.chat_sessions s
       WHERE s.created_at < now() - make_interval(days => r.retention_days)
         AND s.lead_id IS NOT NULL;
      IF NOT _dry_run THEN
        DELETE FROM public.chat_sessions s
         WHERE s.created_at < now() - make_interval(days => r.retention_days)
           AND s.lead_id IS NULL;
      END IF;
    END IF;

    out := out || jsonb_build_object(
      'entity', r.entity, 'action', r.action, 'retention_days', r.retention_days,
      'affected', n, 'skipped_protected', skipped);
  END LOOP;

  INSERT INTO public.retention_runs (dry_run, actor_id, summary)
  VALUES (_dry_run, auth.uid(), jsonb_build_object('items', out));

  RETURN jsonb_build_object('dry_run', _dry_run, 'items', out);
END;
$function$
;
CREATE OR REPLACE FUNCTION public.approval_role_for(_scope approval_scope, _value numeric)
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE r text;
BEGIN
  IF _value IS NULL THEN RETURN NULL; END IF;
  IF _scope = 'margin_pct' THEN
    SELECT required_role INTO r FROM public.approval_rules
     WHERE active AND scope = 'margin_pct' AND _value < threshold
     ORDER BY threshold DESC LIMIT 1;
    RETURN r;
  END IF;
  SELECT required_role INTO r FROM public.approval_rules
   WHERE active AND scope = _scope AND threshold >= _value
   ORDER BY threshold ASC LIMIT 1;
  RETURN coalesce(r, 'zuegelwerk_admin');
END;
$function$
;
CREATE OR REPLACE FUNCTION public.assign_lead(_lead_id uuid, _fulfilment lead_fulfilment_type, _partner_id uuid DEFAULT NULL::uuid, _team_id uuid DEFAULT NULL::uuid, _note text DEFAULT ''::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE prev_partner uuid; prev_team uuid;
BEGIN
  IF NOT (public.is_staff() OR public.has_role('ops_manager')) THEN
    RAISE EXCEPTION 'not authorised' USING ERRCODE = '42501';
  END IF;
  SELECT assigned_partner_id, assigned_team_id INTO prev_partner, prev_team
    FROM public.leads WHERE id = _lead_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'lead not found' USING ERRCODE = 'P0002'; END IF;

  UPDATE public.leads
     SET fulfilment_type = _fulfilment,
         assigned_partner_id = _partner_id,
         assigned_team_id = _team_id,
         last_activity_at = now()
   WHERE id = _lead_id;

  INSERT INTO public.lead_activities (lead_id, kind, body, meta, actor_id, actor_kind)
  VALUES (_lead_id, 'assignment', coalesce(_note,''),
          jsonb_build_object(
            'from_partner', prev_partner, 'to_partner', _partner_id,
            'from_team', prev_team, 'to_team', _team_id,
            'fulfilment', _fulfilment), auth.uid(), 'staff');
  RETURN _lead_id;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.build_consolidated_invoice(_account_id uuid, _period_start date, _period_end date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare acc public.accounts; inv public.invoices; wo record; eff record;
        vat_rate_v numeric; net_total numeric := 0; skipped_v jsonb := '[]'::jsonb; billed int := 0; price numeric;
        issued_ref text;
begin
  if not (public.is_staff() or public.has_role('finance') or public.is_service_role()) then
    raise exception 'not authorised' using errcode = '42501';
  end if;
  select * into acc from public.accounts where id = _account_id for update;
  if acc.id is null then raise exception 'account not found' using errcode = 'P0002'; end if;
  select m.vat_rate into vat_rate_v from public.markets m where m.country = acc.country;
  vat_rate_v := coalesce(vat_rate_v, 0.081);

  -- An already issued invoice for this period is final.
  select reference into issued_ref from public.invoices
   where account_id = _account_id and period_start = _period_start and period_end = _period_end
     and status <> 'draft'
   limit 1;
  if issued_ref is not null then
    raise exception 'invoice % already issued for this period', issued_ref using errcode = '55006';
  end if;

  -- Reuse the period's draft if one exists; only ever one per account/period.
  select * into inv from public.invoices
   where account_id = _account_id and period_start = _period_start and period_end = _period_end
     and status = 'draft'
   for update;

  if inv.id is null then
    insert into public.invoices (account_id, period_start, period_end, status, currency, country, due_on, vat_treatment)
    values (_account_id, _period_start, _period_end, 'draft',
            (select currency from public.markets where country = acc.country),
            acc.country, current_date + acc.payment_terms_days,
            case when acc.country = 'CH' then 'domestic_standard' else 'review_required' end)
    returning * into inv;
  else
    -- Recompute from scratch so a re-run is a true no-op, not a doubling.
    select coalesce(sum(net), 0), count(*) into net_total, billed
      from public.invoice_lines where invoice_id = inv.id;
  end if;

  for wo in
    select w.*, j.status as job_status, j.verified_at as job_verified_at, j.signed_at, j.confirmation_code
    from public.work_orders w
    left join public.jobs_execution j on j.id = w.job_execution_id
    where w.account_id = _account_id and w.invoice_id is null
      and w.due_on between _period_start and _period_end and w.status <> 'cancelled'
    order by w.due_on, w.reference
    for update of w
  loop
    if wo.status not in ('completed','verified') then
      skipped_v := skipped_v || jsonb_build_object('work_order', wo.reference, 'reason', 'not_completed', 'status', wo.status);
      continue;
    end if;
    if wo.job_execution_id is null then
      skipped_v := skipped_v || jsonb_build_object('work_order', wo.reference, 'reason', 'no_proof_of_service');
      continue;
    end if;
    if wo.job_status not in ('completed','verified') then
      skipped_v := skipped_v || jsonb_build_object('work_order', wo.reference, 'reason', 'job_not_completed', 'job_status', wo.job_status);
      continue;
    end if;
    if wo.signed_at is null and coalesce(wo.confirmation_code,'') = '' and wo.job_verified_at is null then
      skipped_v := skipped_v || jsonb_build_object('work_order', wo.reference, 'reason', 'no_customer_confirmation');
      continue;
    end if;

    price := wo.value;
    if price is null then
      select * into eff from public.resolve_site_service(wo.site_id, wo.catalogue_id);
      price := eff.price;
    end if;
    if price is null then
      skipped_v := skipped_v || jsonb_build_object('work_order', wo.reference, 'reason', 'no_agreed_price');
      continue;
    end if;

    insert into public.invoice_lines (invoice_id, work_order_id, site_id, description, quantity, unit_price, net, vat_rate)
    values (inv.id, wo.id, wo.site_id, coalesce(nullif(wo.service,''),'Leistung') || ' — ' || wo.reference,
            1, price, price, vat_rate_v);
    update public.work_orders set invoice_id = inv.id where id = wo.id;
    net_total := net_total + price; billed := billed + 1;
  end loop;

  update public.invoices i
     set net = net_total,
         vat = round(net_total * vat_rate_v, 2),
         total = net_total + round(net_total * vat_rate_v, 2),
         skipped = skipped_v,
         updated_at = now()
   where i.id = inv.id
  returning * into inv;

  return jsonb_build_object('invoice_id', inv.id, 'reference', inv.reference, 'status', inv.status,
                            'lines', billed, 'net', inv.net, 'vat', inv.vat, 'total', inv.total, 'skipped', skipped_v);
end
$function$
;
CREATE OR REPLACE FUNCTION public.build_qr_reference(_seed text)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  base text := lpad(left(regexp_replace(coalesce(_seed, ''), '\D', '', 'g'), 26), 26, '0');
BEGIN
  RETURN base || public.qr_reference_check_digit(base)::text;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.bump_allocation_stat(_partner_id uuid, _category_id uuid, _canton text, _field text, _n integer DEFAULT 1)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  ps date := date_trunc('month', now())::date;
  pe date := (date_trunc('month', now()) + interval '1 month - 1 day')::date;
BEGIN
  IF _partner_id IS NULL THEN RETURN; END IF;
  INSERT INTO public.partner_allocation_stats (partner_id, period_start, period_end, category_id, canton)
  VALUES (_partner_id, ps, pe, _category_id, coalesce(_canton,''))
  ON CONFLICT (partner_id, period_start, coalesce(category_id, '00000000-0000-0000-0000-000000000000'::uuid), canton)
  DO NOTHING;

  EXECUTE format(
    'UPDATE public.partner_allocation_stats SET %I = %I + $1, updated_at = now()
      WHERE partner_id = $2 AND period_start = $3
        AND coalesce(category_id, ''00000000-0000-0000-0000-000000000000''::uuid) = coalesce($4, ''00000000-0000-0000-0000-000000000000''::uuid)
        AND canton = $5',
    _field, _field)
  USING _n, _partner_id, ps, _category_id, coalesce(_canton,'');
END;
$function$
;
CREATE OR REPLACE FUNCTION public.caller_role()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT role::text FROM public.profiles WHERE id = auth.uid()
$function$
;
CREATE OR REPLACE FUNCTION public.can_access_job(_job_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.jobs_execution j
     WHERE j.id = _job_id
       AND (public.is_dispatcher() OR public.has_role('finance')
            OR (j.partner_id IS NOT NULL AND j.partner_id = public.current_partner_id()))
  )
$function$
;
CREATE OR REPLACE FUNCTION public.can_access_job_folder(_folder text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF _folder IS NULL OR _folder !~ '^[0-9a-fA-F-]{36}$' THEN RETURN false; END IF;
  RETURN public.can_access_job(_folder::uuid);
END; $function$
;
CREATE OR REPLACE FUNCTION public.can_see_costs()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role::text IN ('zuegelwerk_admin','ops_manager','partner_manager','finance')
  )
$function$
;
CREATE OR REPLACE FUNCTION public.cancel_job(_job_id uuid, _who cancel_actor, _reason text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE j public.jobs_execution; is_partner boolean; state text; hrs numeric;
        r public.cancellation_rules; base numeric; charge numeric; comp numeric; manual boolean := false;
BEGIN
  SELECT * INTO j FROM public.jobs_execution WHERE id = _job_id FOR UPDATE;
  IF j.id IS NULL THEN RAISE EXCEPTION 'job not found' USING ERRCODE = 'P0002'; END IF;
  is_partner := j.partner_id IS NOT NULL AND j.partner_id = public.current_partner_id();
  IF NOT (public.is_dispatcher() OR is_partner) THEN
    RAISE EXCEPTION 'not authorised' USING ERRCODE = '42501';
  END IF;
  IF j.status IN ('cancelled','verified') THEN
    RAISE EXCEPTION 'job already closed' USING ERRCODE = '22023';
  END IF;
  IF coalesce(btrim(_reason),'') = '' THEN
    RAISE EXCEPTION 'a reason is required' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (SELECT 1 FROM public.job_materials m WHERE m.job_id = _job_id AND m.status IN ('purchased','installed')) THEN
    state := 'materials_purchased';
  ELSIF j.status IN ('in_progress','paused','completed') THEN state := 'work_started';
  ELSIF j.status = 'on_site' THEN state := 'on_site';
  ELSIF j.status = 'en_route' THEN state := 'crew_dispatched';
  ELSE state := NULL;
  END IF;

  IF state IS NOT NULL THEN
    SELECT * INTO r FROM public.cancellation_rules
     WHERE active AND who = _who AND job_state = state ORDER BY sort_order DESC LIMIT 1;
  END IF;

  IF r.id IS NULL THEN
    IF j.scheduled_start IS NOT NULL THEN
      hrs := extract(epoch FROM (j.scheduled_start - now())) / 3600.0;
      SELECT * INTO r FROM public.cancellation_rules
       WHERE active AND who = _who AND job_state IS NULL AND hours_before IS NOT NULL
         AND hrs < hours_before
       ORDER BY hours_before ASC LIMIT 1;
    END IF;
  END IF;

  IF r.id IS NULL THEN
    SELECT * INTO r FROM public.cancellation_rules
     WHERE active AND who = _who AND job_state IS NULL AND hours_before IS NULL
     ORDER BY sort_order ASC LIMIT 1;
  END IF;

  base := coalesce(j.job_value, (SELECT expected_sell FROM public.leads WHERE id = j.lead_id));

  IF r.id IS NULL OR base IS NULL THEN
    -- No applicable rule, or no job value to apply it to: never invent a figure.
    manual := true; charge := NULL; comp := NULL;
  ELSE
    charge := round(base * r.charge_pct / 100.0, 2) + r.charge_fixed;
    comp := round(base * r.partner_compensation_pct / 100.0, 2);
  END IF;

  UPDATE public.jobs_execution
     SET status = 'cancelled', cancelled_at = now(), cancelled_by = _who,
         cancellation_reason = btrim(_reason), cancellation_rule_id = r.id,
         cancellation_customer_charge = charge, cancellation_partner_compensation = comp,
         cancellation_manual_review = manual, updated_at = now()
   WHERE id = _job_id;

  INSERT INTO public.job_events_exec (job_id, kind, body, meta, actor_id, actor_kind)
  VALUES (_job_id, 'cancel', btrim(_reason),
          jsonb_build_object('who', _who, 'rule', r.id, 'band', r.band_key, 'state', state,
                             'customer_charge', charge, 'partner_compensation', comp,
                             'manual_review', manual),
          auth.uid(), (CASE WHEN is_partner THEN 'partner' ELSE 'staff' END)::public.lead_actor_kind);

  IF j.lead_id IS NOT NULL THEN
    INSERT INTO public.lead_activities (lead_id, kind, body, meta, actor_id, actor_kind)
    VALUES (j.lead_id, 'system', btrim(_reason),
            jsonb_build_object('job', _job_id, 'action','cancelled','who', _who), auth.uid(), 'staff');
  END IF;

  RETURN jsonb_build_object('rule_id', r.id, 'band', r.band_key, 'state', state,
                            'customer_charge', charge, 'partner_compensation', comp,
                            'manual_review', manual, 'base_value', base);
END; $function$
;
CREATE OR REPLACE FUNCTION public.change_order_by_token(_token text)
 RETURNS TABLE(reference text, description text, reason text, customer_price numeric, currency text, status change_order_status, expires_at timestamp with time zone, job_reference text, decided_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT c.reference, c.description, c.reason, c.customer_price, c.currency, c.status,
         c.token_expires_at, j.reference, c.customer_decided_at
    FROM public.change_orders c
    LEFT JOIN public.jobs_execution j ON j.id = c.job_id
   WHERE c.public_token = _token AND _token <> ''
     AND (c.token_expires_at IS NULL OR c.token_expires_at > now())
$function$
;
CREATE OR REPLACE FUNCTION public.change_orders_for(_job_id uuid)
 RETURNS TABLE(id uuid, reference text, description text, reason text, estimated_hours numeric, estimated_materials numeric, partner_cost numeric, customer_price numeric, status change_order_status, decision_channel text, decided_name text, customer_decided_at timestamp with time zone, approval_request_id uuid, public_token text, token_expires_at timestamp with time zone, created_at timestamp with time zone, costs_visible boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE vis boolean; disp boolean;
BEGIN
  IF NOT public.can_access_job(_job_id) THEN RAISE EXCEPTION 'not authorised' USING ERRCODE = '42501'; END IF;
  vis := public.can_see_costs(); disp := public.is_dispatcher();
  RETURN QUERY
    SELECT c.id, c.reference, c.description, c.reason, c.estimated_hours, c.estimated_materials,
           CASE WHEN vis THEN c.partner_cost ELSE NULL END,
           c.customer_price, c.status, c.decision_channel, c.decided_name, c.customer_decided_at,
           c.approval_request_id,
           CASE WHEN disp THEN c.public_token ELSE '' END,
           c.token_expires_at, c.created_at, vis
      FROM public.change_orders c WHERE c.job_id = _job_id ORDER BY c.created_at DESC;
END; $function$
;
CREATE OR REPLACE FUNCTION public.clear_lead_risk(_lead_id uuid, _note text DEFAULT ''::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF NOT public.is_dispatcher() THEN
    RAISE EXCEPTION 'not authorised' USING ERRCODE = '42501';
  END IF;
  UPDATE public.leads SET risk_reviewed = true, updated_at = now() WHERE id = _lead_id;
  INSERT INTO public.lead_activities (lead_id, kind, body, meta, actor_id, actor_kind)
  VALUES (_lead_id, 'system', coalesce(_note,''),
          jsonb_build_object('action','risk_reviewed'), auth.uid(), 'staff');
END;
$function$
;
CREATE OR REPLACE FUNCTION public.company_contact(_country text DEFAULT 'CH'::text)
 RETURNS TABLE(country text, legal_name text, address_line text, postal_code text, city text, canton text, email text, phone text, register_number text, vat_number text, status text, legal_ready boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select e.country,
         e.legal_name,
         e.address_line,
         e.postal_code,
         e.city,
         e.canton,
         e.email,
         e.phone,
         nullif(e.register_number, '') as register_number,
         nullif(e.vat_number, '')      as vat_number,
         e.status,
         coalesce(m.legal_ready, false) as legal_ready
    from public.legal_entities e
    left join public.markets m on m.country = e.country
   where e.country = coalesce(_country, 'CH')
$function$
;
CREATE OR REPLACE FUNCTION public.compute_lead_economics(_lead_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  l public.leads;
  cat_id uuid;
  r_sell numeric; r_cost numeric; r_min numeric; r_scope text;
  sell numeric; cost numeric; travel numeric; acq numeric;
  margin numeric; margin_pct numeric; minm numeric;
  flags text[] := ARRAY[]::text[];
BEGIN
  SELECT * INTO l FROM public.leads WHERE id = _lead_id;
  IF l.id IS NULL THEN RAISE EXCEPTION 'lead not found' USING ERRCODE = 'P0002'; END IF;

  SELECT c.id INTO cat_id FROM public.service_catalogue c
   WHERE c.active AND c.category_id = l.category_id
   ORDER BY c.sort_order LIMIT 1;

  IF cat_id IS NOT NULL THEN
    SELECT r.sell_price, r.cost_price, r.min_margin_pct, r.scope::text
      INTO r_sell, r_cost, r_min, r_scope
      FROM public.service_rates r
     WHERE r.catalogue_id = cat_id
       AND r.valid_from <= current_date
       AND (r.valid_to IS NULL OR r.valid_to >= current_date)
       AND (
         (r.scope = 'city' AND l.city <> '' AND lower(r.scope_ref) = lower(l.city))
         OR (r.scope = 'canton' AND l.canton <> '' AND lower(r.scope_ref) = lower(l.canton))
         OR (r.scope = 'default')
       )
     ORDER BY CASE r.scope WHEN 'city' THEN 1 WHEN 'canton' THEN 2 ELSE 3 END, r.valid_from DESC
     LIMIT 1;
  END IF;

  sell := coalesce(l.estimated_value, r_sell);
  minm := coalesce(r_min, l.min_margin_pct);

  SELECT min(q.partner_cost) INTO cost
    FROM public.partner_quotes q
   WHERE q.lead_id = _lead_id AND q.status IN ('accepted','submitted');
  IF cost IS NULL THEN cost := r_cost; END IF;

  travel := l.travel_cost;
  acq := l.acquisition_cost;

  IF sell IS NOT NULL AND cost IS NOT NULL THEN
    margin := sell - cost - coalesce(travel, 0) - coalesce(acq, 0);
    IF sell > 0 THEN margin_pct := round(margin / sell * 100, 1); END IF;
  END IF;

  IF sell IS NOT NULL AND sell >= 3000 AND margin_pct IS NOT NULL AND margin_pct < 20 THEN
    flags := flags || ARRAY['high_value_low_margin']::text[];
  END IF;
  IF margin_pct IS NOT NULL AND minm IS NOT NULL AND margin_pct < minm THEN
    flags := flags || ARRAY['below_min_margin']::text[];
  END IF;
  IF l.customer_type = 'b2b' THEN flags := flags || ARRAY['strategic_customer']::text[]; END IF;
  IF cost IS NULL THEN flags := flags || ARRAY['cost_unknown']::text[]; END IF;

  UPDATE public.leads
     SET expected_sell = sell, expected_cost = cost, expected_margin = margin,
         expected_margin_pct = margin_pct, min_margin_pct = minm,
         economics_flags = flags, updated_at = now()
   WHERE id = _lead_id;

  RETURN jsonb_build_object(
    'lead_id', _lead_id,
    'expected_sell', sell, 'expected_cost', cost,
    'expected_margin', margin, 'expected_margin_pct', margin_pct,
    'travel_cost', travel, 'acquisition_cost', acq,
    'min_margin_pct', minm, 'rate_scope', r_scope, 'flags', to_jsonb(flags));
END;
$function$
;
CREATE OR REPLACE FUNCTION public.create_change_order(_job_id uuid, _description text, _reason text DEFAULT ''::text, _estimated_hours numeric DEFAULT NULL::numeric, _estimated_materials numeric DEFAULT NULL::numeric, _partner_cost numeric DEFAULT NULL::numeric, _customer_price numeric DEFAULT NULL::numeric)
 RETURNS change_orders
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE j public.jobs_execution; is_partner boolean; c public.change_orders;
BEGIN
  SELECT * INTO j FROM public.jobs_execution WHERE id = _job_id;
  IF j.id IS NULL THEN RAISE EXCEPTION 'job not found' USING ERRCODE = 'P0002'; END IF;
  is_partner := j.partner_id IS NOT NULL AND j.partner_id = public.current_partner_id();
  IF NOT (public.is_dispatcher() OR is_partner) THEN
    RAISE EXCEPTION 'not authorised' USING ERRCODE = '42501';
  END IF;
  IF coalesce(btrim(_description),'') = '' THEN
    RAISE EXCEPTION 'description is required' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.change_orders (job_id, lead_id, description, reason, estimated_hours,
                                    estimated_materials, partner_cost, customer_price,
                                    status, requested_by, requested_kind)
  VALUES (_job_id, j.lead_id, btrim(_description), coalesce(btrim(_reason),''),
          _estimated_hours, _estimated_materials,
          CASE WHEN is_partner OR public.can_see_costs() THEN _partner_cost ELSE NULL END,
          CASE WHEN public.is_dispatcher() THEN _customer_price ELSE NULL END,
          'draft', auth.uid(),
          (CASE WHEN is_partner THEN 'partner' ELSE 'staff' END)::public.lead_actor_kind)
  RETURNING * INTO c;

  INSERT INTO public.job_events_exec (job_id, kind, body, meta, actor_id, actor_kind)
  VALUES (_job_id, 'change_order', btrim(_description),
          jsonb_build_object('change_order', c.id, 'reference', c.reference, 'status', 'draft'),
          auth.uid(), (CASE WHEN is_partner THEN 'partner' ELSE 'staff' END)::public.lead_actor_kind);
  RETURN c;
END; $function$
;
CREATE OR REPLACE FUNCTION public.create_customer_quote(_lead_id uuid, _line_items jsonb, _labour numeric DEFAULT 0, _materials numeric DEFAULT 0, _transport numeric DEFAULT 0, _equipment numeric DEFAULT 0, _disposal numeric DEFAULT 0, _discount_pct numeric DEFAULT 0, _terms text DEFAULT ''::text, _approval uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  l public.leads; net numeric; discount numeric; vat numeric; total numeric;
  need text; req uuid; appr public.approval_requests; margin_pct numeric; q public.quotes_customer;
BEGIN
  IF NOT public.is_dispatcher() THEN
    RAISE EXCEPTION 'not authorised' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO l FROM public.leads WHERE id = _lead_id;
  IF l.id IS NULL THEN RAISE EXCEPTION 'lead not found' USING ERRCODE = 'P0002'; END IF;

  net := coalesce(_labour,0) + coalesce(_materials,0) + coalesce(_transport,0)
       + coalesce(_equipment,0) + coalesce(_disposal,0);
  discount := round(net * coalesce(_discount_pct,0) / 100.0, 2);
  vat := round((net - discount) * 0.081, 2);
  total := net - discount + vat;

  IF l.expected_cost IS NOT NULL AND (net - discount) > 0 THEN
    margin_pct := round((net - discount - l.expected_cost) / (net - discount) * 100, 1);
  END IF;

  IF _approval IS NOT NULL THEN
    SELECT * INTO appr FROM public.approval_requests WHERE id = _approval;
    IF appr.id IS NULL OR appr.status <> 'approved' OR appr.lead_id IS DISTINCT FROM _lead_id THEN
      RAISE EXCEPTION 'approval not valid' USING ERRCODE = '42501';
    END IF;
  ELSE
    -- discount limit
    need := public.approval_role_for('discount_pct', coalesce(_discount_pct,0));
    IF need IS NOT NULL AND public.role_rank(public.caller_role()) < public.role_rank(need) THEN
      req := public.request_approval('discount_pct', _discount_pct, 'customer_quote', NULL, _lead_id,
               jsonb_build_object('net', net, 'discount_pct', _discount_pct, 'total', total));
      RETURN jsonb_build_object('status','approval_required','scope','discount_pct',
                                'required_role', need, 'request_id', req, 'value', _discount_pct);
    END IF;
    -- margin floor
    need := public.approval_role_for('margin_pct', margin_pct);
    IF need IS NOT NULL AND public.role_rank(public.caller_role()) < public.role_rank(need) THEN
      req := public.request_approval('margin_pct', margin_pct, 'customer_quote', NULL, _lead_id,
               jsonb_build_object('net', net, 'total', total, 'margin_pct', margin_pct));
      RETURN jsonb_build_object('status','approval_required','scope','margin_pct',
                                'required_role', need, 'request_id', req, 'value', margin_pct);
    END IF;
    -- quote total limit
    need := public.approval_role_for('quote_total', total);
    IF need IS NOT NULL AND public.role_rank(public.caller_role()) < public.role_rank(need) THEN
      req := public.request_approval('quote_total', total, 'customer_quote', NULL, _lead_id,
               jsonb_build_object('net', net, 'total', total));
      RETURN jsonb_build_object('status','approval_required','scope','quote_total',
                                'required_role', need, 'request_id', req, 'value', total);
    END IF;
  END IF;

  INSERT INTO public.quotes_customer (lead_id, line_items, labour, materials, transport, equipment,
                                      disposal, discount, vat, total, currency, terms, status, language)
  VALUES (_lead_id, coalesce(_line_items,'[]'::jsonb), coalesce(_labour,0), coalesce(_materials,0),
          coalesce(_transport,0), coalesce(_equipment,0), coalesce(_disposal,0), discount, vat, total,
          'CHF', coalesce(_terms,''), 'draft', l.language)
  RETURNING * INTO q;

  IF _approval IS NOT NULL THEN
    UPDATE public.approval_requests SET subject_id = q.id, updated_at = now() WHERE id = _approval;
  END IF;

  INSERT INTO public.lead_activities (lead_id, kind, body, meta, actor_id, actor_kind)
  VALUES (_lead_id, 'quote', '', jsonb_build_object('quote', q.id, 'total', total, 'discount_pct', _discount_pct),
          auth.uid(), 'staff');

  RETURN jsonb_build_object('status','created','quote_id', q.id, 'reference', q.reference,
                            'net', net, 'discount', discount, 'vat', vat, 'total', total,
                            'margin_pct', margin_pct);
END;
$function$
;
CREATE OR REPLACE FUNCTION public.create_enquiry(payload jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_name text := btrim(left(coalesce(payload->>'name', ''), 120));
  v_phone text := btrim(left(coalesce(payload->>'phone', ''), 40));
  v_email text := lower(btrim(left(coalesce(payload->>'email', ''), 160)));
  v_from text := btrim(left(coalesce(payload->>'from_text', ''), 240));
  v_to text := btrim(left(coalesce(payload->>'to_text', ''), 240));
  v_message text := btrim(left(coalesce(payload->>'message', ''), 4000));
  v_language text := lower(btrim(coalesce(payload->>'language', 'de')));
  v_date date;
  v_id uuid;
begin
  if v_name = '' or length(v_name) < 2 then
    raise exception 'invalid_name' using errcode = '22023';
  end if;
  if v_email = '' or v_email !~ '^[^@\s]+@[^@\s]+\.[a-z]{2,}$' then
    raise exception 'invalid_email' using errcode = '22023';
  end if;
  if v_phone <> '' and v_phone !~ '^[0-9+()./ -]{6,40}$' then
    raise exception 'invalid_phone' using errcode = '22023';
  end if;
  if v_language not in ('de', 'fr', 'it', 'en') then
    v_language := 'de';
  end if;

  begin
    v_date := nullif(payload->>'preferred_date', '')::date;
  exception when others then
    v_date := null;
  end;

  -- strip control characters that only ever arrive from injection attempts
  v_message := regexp_replace(v_message, '[\u0000-\u0008\u000B\u000C\u000E-\u001F]', '', 'g');

  insert into public.enquiries (name, phone, email, from_text, to_text, preferred_date, message, language)
  values (v_name, nullif(v_phone, ''), v_email, nullif(v_from, ''), nullif(v_to, ''), v_date,
          nullif(v_message, ''), v_language)
  returning id into v_id;

  return v_id;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.create_job_from_lead(_lead_id uuid, _scheduled_start timestamp with time zone DEFAULT NULL::timestamp with time zone, _opportunity_id uuid DEFAULT NULL::uuid)
 RETURNS jobs_execution
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE l public.leads; j public.jobs_execution;
BEGIN
  IF NOT public.is_dispatcher() THEN RAISE EXCEPTION 'not authorised' USING ERRCODE = '42501'; END IF;
  SELECT * INTO l FROM public.leads WHERE id = _lead_id;
  IF l.id IS NULL THEN RAISE EXCEPTION 'lead not found' USING ERRCODE = 'P0002'; END IF;
  IF l.assigned_partner_id IS NULL AND l.assigned_team_id IS NULL THEN
    RAISE EXCEPTION 'lead has no assigned resource' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.jobs_execution (lead_id, opportunity_id, partner_id, team_id, scheduled_start, job_value)
  VALUES (_lead_id, _opportunity_id, l.assigned_partner_id, l.assigned_team_id,
          coalesce(_scheduled_start, (l.preferred_date)::timestamptz), l.expected_sell)
  RETURNING * INTO j;

  INSERT INTO public.job_events_exec (job_id, kind, body, meta, actor_id, actor_kind)
  VALUES (j.id, 'status', '', jsonb_build_object('status','scheduled'), auth.uid(), 'staff');

  INSERT INTO public.lead_activities (lead_id, kind, body, meta, actor_id, actor_kind)
  VALUES (_lead_id, 'system', '', jsonb_build_object('job', j.id, 'reference', j.reference), auth.uid(), 'staff');
  RETURN j;
END; $function$
;
CREATE OR REPLACE FUNCTION public.create_lead(payload jsonb)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  new_ref text; new_id uuid; src uuid; quote_ref text;
  src_key text; ctype public.lead_customer_type; urg text; flag text;
  q public.lead_queues%ROWTYPE;
  em text; ph text; recent int; is_spam boolean := false; elapsed int;
  req_status text;
BEGIN
  src_key := coalesce(payload->>'source_key','website_form');
  ctype := coalesce(nullif(payload->>'customer_type','')::public.lead_customer_type,'private');
  urg := coalesce(payload->>'urgency','normal');
  flag := coalesce(payload->>'flag','');

  em := lower(btrim(coalesce(payload->>'customer_email','')));
  ph := regexp_replace(coalesce(payload->>'customer_phone',''), '\D', '', 'g');
  elapsed := coalesce(nullif(payload->>'elapsed_ms','')::int, 999999);

  -- Only a narrow, safe set of intake statuses may be requested by a caller.
  req_status := nullif(payload->>'status','');
  IF req_status IS NOT NULL AND req_status <> 'quote_required' THEN
    req_status := NULL;
  END IF;

  -- Honeypot field filled, or the form completed faster than a human can:
  -- the record is still kept, but parked for spam review and never notified.
  IF btrim(coalesce(payload->>'hp','')) <> '' OR elapsed < 2000 THEN
    is_spam := true;
  END IF;

  -- Rate limit: at most 5 inquiries per hour from the same contact.
  IF NOT is_spam AND (em <> '' OR length(ph) >= 6) THEN
    SELECT count(*) INTO recent FROM public.leads x
     WHERE x.created_at > now() - interval '1 hour'
       AND ((em <> '' AND lower(btrim(x.customer_email)) = em)
         OR (length(ph) >= 6 AND regexp_replace(coalesce(x.customer_phone,''), '\D', '', 'g') = ph));
    IF recent >= 5 THEN
      RAISE EXCEPTION 'too many requests' USING ERRCODE = 'MF429';
    END IF;
  END IF;

  SELECT id INTO src FROM public.lead_sources WHERE key = src_key AND active LIMIT 1;
  SELECT * INTO q FROM public.lead_queues
   WHERE id = coalesce(nullif(payload->>'queue_id','')::uuid,
                       public.route_lead_queue(src_key, ctype, urg, flag));

  INSERT INTO public.leads (
    source_id, campaign, customer_name, customer_phone, customer_email, preferred_contact,
    country, canton, city, postcode, service_address, category_id, service_details,
    preferred_date, preferred_time, urgency, description, property_type, customer_type,
    language, estimated_value, queue_id, lead_owner_id, assigned_team_id,
    utm_source, utm_medium, utm_campaign, utm_term, utm_content, gclid, referrer, landing_page
  ) VALUES (
    src,
    coalesce(payload->>'campaign', payload->>'utm_campaign', ''),
    coalesce(payload->>'customer_name',''),
    coalesce(payload->>'customer_phone',''),
    coalesce(payload->>'customer_email',''),
    coalesce(payload->>'preferred_contact','phone'),
    coalesce(nullif(payload->>'country',''),'CH'),
    coalesce(payload->>'canton',''),
    coalesce(payload->>'city',''),
    coalesce(payload->>'postcode',''),
    coalesce(payload->>'service_address',''),
    nullif(payload->>'category_id','')::uuid,
    coalesce(payload->'service_details','{}'::jsonb),
    nullif(payload->>'preferred_date','')::date,
    coalesce(payload->>'preferred_time',''),
    urg,
    coalesce(payload->>'description',''),
    coalesce(payload->>'property_type',''),
    ctype,
    coalesce(payload->>'language','de'),
    nullif(payload->>'estimated_value','')::numeric,
    q.id, q.default_owner_id, q.default_team_id,
    coalesce(payload->>'utm_source',''), coalesce(payload->>'utm_medium',''),
    coalesce(payload->>'utm_campaign',''), coalesce(payload->>'utm_term',''),
    coalesce(payload->>'utm_content',''), coalesce(payload->>'gclid',''),
    coalesce(payload->>'referrer',''), coalesce(payload->>'landing_page','')
  ) RETURNING id, reference INTO new_id, new_ref;

  INSERT INTO public.lead_activities (lead_id, kind, body, meta, actor_kind)
  VALUES (new_id, 'created', 'Lead created from public inquiry',
          jsonb_build_object('source', src_key, 'queue', q.key, 'spam', is_spam), 'customer');

  quote_ref := nullif(payload->>'quote_reference','');
  IF quote_ref IS NOT NULL THEN
    INSERT INTO public.lead_activities (lead_id, kind, body, meta, actor_kind)
    VALUES (new_id, 'quote', quote_ref, jsonb_build_object('quote_reference', quote_ref), 'system');
  END IF;

  IF is_spam THEN
    UPDATE public.leads SET status = 'spam_review' WHERE id = new_id;
    RETURN new_ref;
  END IF;

  IF req_status IS NOT NULL THEN
    UPDATE public.leads SET status = req_status::public.lead_status WHERE id = new_id;
  END IF;

  -- The notification is a notice about the record, never the record itself.
  INSERT INTO public.notification_log (channel, template, recipient, subject_type, subject_id,
                                       lead_id, status, language, subject, details)
  VALUES ('email', 'lead_arrived', '', 'lead', new_id, new_id, 'pending',
          coalesce(payload->>'language','de'),
          'Neue Anfrage ' || new_ref,
          jsonb_build_object('queue', q.key, 'source', src_key, 'reference', new_ref,
                             'owner_id', q.default_owner_id, 'team_id', q.default_team_id));

  RETURN new_ref;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.create_quote(payload jsonb)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  new_reference text;
BEGIN
  INSERT INTO public.quotes (
    reference, language, customer_name, customer_company, customer_phone, customer_email,
    from_address, from_zip, to_address, to_zip,
    room_units, floor_out, floor_in, lift, property_type,
    parking, carry, narrow_stairs, permit, hoist,
    services, items, move_date,
    distance_km, volume_m3, boxes, vans, crew, load_hours, total_hours,
    access_score, score_label,
    price_net, price_vat, price_total, price_low, price_high, discount_rate,
    source, pricing_configuration_id
  ) VALUES (
    'pending',
    coalesce(payload->>'language', 'de'),
    payload->>'customer_name',
    payload->>'customer_company',
    payload->>'customer_phone',
    payload->>'customer_email',
    payload->>'from_address',
    payload->>'from_zip',
    payload->>'to_address',
    payload->>'to_zip',
    (payload->>'room_units')::numeric,
    (payload->>'floor_out')::int,
    (payload->>'floor_in')::int,
    payload->>'lift',
    payload->>'property_type',
    (payload->>'parking')::int,
    (payload->>'carry')::int,
    (payload->>'narrow_stairs')::boolean,
    (payload->>'permit')::boolean,
    (payload->>'hoist')::boolean,
    payload->'services',
    payload->'items',
    nullif(payload->>'move_date', '')::date,
    (payload->>'distance_km')::int,
    (payload->>'volume_m3')::numeric,
    (payload->>'boxes')::int,
    (payload->>'vans')::int,
    (payload->>'crew')::int,
    (payload->>'load_hours')::numeric,
    (payload->>'total_hours')::numeric,
    (payload->>'access_score')::int,
    payload->>'score_label',
    (payload->>'price_net')::numeric,
    (payload->>'price_vat')::numeric,
    (payload->>'price_total')::numeric,
    (payload->>'price_low')::numeric,
    (payload->>'price_high')::numeric,
    (payload->>'discount_rate')::numeric,
    'planner',
    public.active_pricing_configuration(coalesce(payload->>'market','CH'))
  )
  RETURNING reference INTO new_reference;

  RETURN new_reference;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.cron_health()
 RETURNS TABLE(job_name text, schedule text, active boolean, last_run timestamp with time zone, last_status text, last_message text, last_success timestamp with time zone, runs_24h integer, failures_24h integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'cron', 'pg_temp'
AS $function$
  select j.jobname::text,
         j.schedule::text,
         j.active,
         (select d.end_time from cron.job_run_details d where d.jobid = j.jobid order by d.start_time desc limit 1),
         (select d.status::text from cron.job_run_details d where d.jobid = j.jobid order by d.start_time desc limit 1),
         (select left(coalesce(d.return_message, ''), 300) from cron.job_run_details d where d.jobid = j.jobid order by d.start_time desc limit 1),
         (select max(d.end_time) from cron.job_run_details d where d.jobid = j.jobid and d.status = 'succeeded'),
         (select count(*)::int from cron.job_run_details d where d.jobid = j.jobid and d.start_time > now() - interval '24 hours'),
         (select count(*)::int from cron.job_run_details d where d.jobid = j.jobid and d.start_time > now() - interval '24 hours' and d.status <> 'succeeded')
  from cron.job j
  where public.is_staff()
  order by j.jobname
$function$
;
CREATE OR REPLACE FUNCTION public.current_org_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT organization_id FROM public.profiles WHERE id = auth.uid()
$function$
;
CREATE OR REPLACE FUNCTION public.current_partner_editable()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.partners
    WHERE created_by = auth.uid() AND status IN ('draft','more_info_required')
  )
$function$
;
CREATE OR REPLACE FUNCTION public.current_partner_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT id FROM public.partners WHERE created_by = auth.uid() ORDER BY created_at LIMIT 1
$function$
;
CREATE OR REPLACE FUNCTION public.customer_facing_status(_status lead_status)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT CASE _status
    WHEN 'new' THEN 'received'
    WHEN 'qualified' THEN 'under_review'
    WHEN 'quote_required' THEN 'under_review'
    WHEN 'quote_sent' THEN 'offer_sent'
    WHEN 'negotiation' THEN 'offer_sent'
    WHEN 'won' THEN 'confirmed'
    WHEN 'scheduled' THEN 'scheduled'
    WHEN 'in_progress' THEN 'in_progress'
    WHEN 'completed' THEN 'completed'
    WHEN 'lost' THEN 'closed'
    WHEN 'cancelled' THEN 'closed'
    ELSE 'under_review'
  END
$function$
;
CREATE OR REPLACE FUNCTION public.customer_value()
 RETURNS TABLE(contact_key text, customer_name text, customer_email text, customer_phone text, jobs bigint, revenue numeric, gross_margin numeric, average_ticket numeric, complaints bigint, first_job timestamp with time zone, last_job timestamp with time zone, repeat_customer boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF NOT (public.is_staff() OR public.has_role('ops_manager') OR public.has_role('sales')
          OR public.has_role('finance')) THEN
    RAISE EXCEPTION 'not authorised' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH keyed AS (
    SELECT coalesce(nullif(lower(l.customer_email), ''), nullif(l.customer_phone, ''), l.id::text) AS k,
           l.*
      FROM public.leads l
  ), agg AS (
    SELECT k.k,
           max(k.customer_name) AS nm,
           max(k.customer_email) AS em,
           max(k.customer_phone) AS ph,
           count(DISTINCT je.id) AS jobs,
           coalesce(sum(q.total), 0) AS revenue,
           coalesce(sum(k.expected_margin) FILTER (WHERE je.id IS NOT NULL), 0) AS margin,
           min(je.completed_at) AS first_job,
           max(je.completed_at) AS last_job
      FROM keyed k
      LEFT JOIN public.jobs_execution je ON je.lead_id = k.id AND je.status IN ('completed','verified')
      LEFT JOIN LATERAL (
        SELECT qc.total FROM public.quotes_customer qc
         WHERE qc.lead_id = k.id AND qc.status = 'accepted'
         ORDER BY qc.accepted_at DESC NULLS LAST LIMIT 1) q ON true
     GROUP BY k.k
  ), comp AS (
    SELECT coalesce(nullif(lower(l.customer_email), ''), nullif(l.customer_phone, ''), l.id::text) AS k,
           count(*) AS n
      FROM public.lead_activities a
      JOIN public.leads l ON l.id = a.lead_id
     WHERE a.meta->>'complaint' = 'true'
     GROUP BY 1
  )
  SELECT a.k, a.nm, a.em, a.ph, a.jobs, a.revenue, a.margin,
         CASE WHEN a.jobs = 0 THEN 0 ELSE round(a.revenue / a.jobs, 2) END,
         coalesce(c.n, 0), a.first_job, a.last_job, a.jobs > 1
    FROM agg a LEFT JOIN comp c ON c.k = a.k
   WHERE a.jobs > 0
   ORDER BY a.revenue DESC;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.decide_approval(_id uuid, _approve boolean, _note text DEFAULT ''::text)
 RETURNS approval_requests
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE r public.approval_requests; need text;
BEGIN
  SELECT * INTO r FROM public.approval_requests WHERE id = _id FOR UPDATE;
  IF r.id IS NULL THEN RAISE EXCEPTION 'request not found' USING ERRCODE = 'P0002'; END IF;
  IF r.status <> 'pending' THEN RAISE EXCEPTION 'already decided' USING ERRCODE = '55006'; END IF;

  SELECT required_role INTO need FROM public.approval_rules WHERE id = r.rule_id;
  need := coalesce(need, 'zuegelwerk_admin');
  IF public.role_rank(public.caller_role()) < public.role_rank(need) THEN
    RAISE EXCEPTION 'not authorised' USING ERRCODE = '42501';
  END IF;
  IF r.requested_by = auth.uid() AND NOT public.is_staff() THEN
    RAISE EXCEPTION 'not authorised' USING ERRCODE = '42501';
  END IF;

  UPDATE public.approval_requests
     SET status = CASE WHEN _approve THEN 'approved' ELSE 'rejected' END::public.approval_status,
         decided_by = auth.uid(), decided_at = now(), note = coalesce(nullif(_note,''), note)
   WHERE id = _id RETURNING * INTO r;

  IF r.lead_id IS NOT NULL THEN
    INSERT INTO public.lead_activities (lead_id, kind, body, meta, actor_id, actor_kind)
    VALUES (r.lead_id, 'system', coalesce(_note,''),
            jsonb_build_object('approval_request', r.id, 'decision', r.status), auth.uid(), 'staff');
  END IF;
  RETURN r;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.decide_change_order_staff(_id uuid, _approve boolean, _channel text DEFAULT 'phone'::text, _name text DEFAULT ''::text)
 RETURNS change_orders
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF NOT public.is_dispatcher() THEN RAISE EXCEPTION 'not authorised' USING ERRCODE = '42501'; END IF;
  IF coalesce(btrim(_channel),'') = '' THEN
    RAISE EXCEPTION 'a decision channel is required' USING ERRCODE = '22023';
  END IF;
  RETURN public.apply_change_order_decision(_id, _approve, _channel, _name);
END; $function$
;
CREATE OR REPLACE FUNCTION public.detect_lead_risk(_lead_id uuid)
 RETURNS numeric
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  l public.leads;
  wts jsonb;
  digits text;
  dom text;
  total numeric := 0;
  n int;
  zone_canton text;
BEGIN
  SELECT * INTO l FROM public.leads WHERE id = _lead_id;
  IF l.id IS NULL THEN RETURN 0; END IF;

  SELECT jsonb_object_agg(signal, weight) INTO wts FROM public.risk_rules WHERE active;
  wts := coalesce(wts, '{}'::jsonb);

  DELETE FROM public.lead_risk_signals WHERE lead_id = _lead_id;

  -- implausible phone
  digits := regexp_replace(coalesce(l.customer_phone,''), '\D', '', 'g');
  IF wts ? 'implausible_phone' AND (length(digits) < 9 OR length(digits) > 15
      OR digits ~ '^(\d)\1+$') THEN
    INSERT INTO public.lead_risk_signals (lead_id, signal, weight, detail)
    VALUES (_lead_id, 'implausible_phone', (wts->>'implausible_phone')::numeric,
            length(digits)::text || ' digits: ' || coalesce(l.customer_phone,''));
  END IF;

  -- disposable email
  dom := lower(split_part(coalesce(l.customer_email,''), '@', 2));
  IF wts ? 'disposable_email' AND dom <> ''
     AND EXISTS (SELECT 1 FROM public.risk_email_domains d WHERE d.active AND d.domain = dom) THEN
    INSERT INTO public.lead_risk_signals (lead_id, signal, weight, detail)
    VALUES (_lead_id, 'disposable_email', (wts->>'disposable_email')::numeric, dom);
  END IF;

  -- repeat submitter
  IF wts ? 'repeat_submitter' THEN
    SELECT count(*) INTO n FROM public.leads x
     WHERE x.id <> _lead_id AND x.created_at > l.created_at - interval '24 hours'
       AND ((nullif(l.customer_email,'') IS NOT NULL AND lower(x.customer_email) = lower(l.customer_email))
         OR (nullif(l.customer_phone,'') IS NOT NULL AND x.customer_phone = l.customer_phone));
    IF n >= 2 THEN
      INSERT INTO public.lead_risk_signals (lead_id, signal, weight, detail)
      VALUES (_lead_id, 'repeat_submitter', (wts->>'repeat_submitter')::numeric,
              n::text || ' other leads from the same contact in 24 h');
    END IF;
  END IF;

  -- identical description
  IF wts ? 'duplicate_text' AND length(coalesce(l.description,'')) >= 40 THEN
    SELECT count(*) INTO n FROM public.leads x
     WHERE x.id <> _lead_id AND x.created_at > l.created_at - interval '30 days'
       AND btrim(lower(x.description)) = btrim(lower(l.description));
    IF n > 0 THEN
      INSERT INTO public.lead_risk_signals (lead_id, signal, weight, detail)
      VALUES (_lead_id, 'duplicate_text', (wts->>'duplicate_text')::numeric,
              n::text || ' other leads with identical description');
    END IF;
  END IF;

  -- partner-referred lead matching the referring partner's own contacts
  IF wts ? 'partner_self_referral' AND l.referred_by_partner_id IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM public.partner_contacts c
                WHERE c.partner_id = l.referred_by_partner_id
                  AND ((nullif(l.customer_email,'') IS NOT NULL AND lower(c.email) = lower(l.customer_email))
                    OR (nullif(l.customer_phone,'') IS NOT NULL AND c.phone = l.customer_phone))) THEN
      INSERT INTO public.lead_risk_signals (lead_id, signal, weight, detail)
      VALUES (_lead_id, 'partner_self_referral', (wts->>'partner_self_referral')::numeric,
              'Contact details match the referring partner — disclosure required');
    END IF;
  END IF;

  -- IP hash rate
  IF wts ? 'ip_rate' AND coalesce(l.ip_hash,'') <> '' THEN
    SELECT count(*) INTO n FROM public.leads x
     WHERE x.id <> _lead_id AND x.ip_hash = l.ip_hash
       AND x.created_at > l.created_at - interval '24 hours';
    IF n >= 4 THEN
      INSERT INTO public.lead_risk_signals (lead_id, signal, weight, detail)
      VALUES (_lead_id, 'ip_rate', (wts->>'ip_rate')::numeric,
              n::text || ' other submissions from the same IP hash in 24 h');
    END IF;
  END IF;

  -- postcode / canton mismatch
  IF wts ? 'canton_mismatch' AND coalesce(l.postcode,'') <> '' AND coalesce(l.canton,'') <> '' THEN
    SELECT z.canton INTO zone_canton FROM public.service_zones z
     WHERE z.postcode_prefix <> '' AND left(l.postcode, length(z.postcode_prefix)) = z.postcode_prefix
     ORDER BY length(z.postcode_prefix) DESC LIMIT 1;
    IF zone_canton IS NOT NULL AND zone_canton <> l.canton THEN
      INSERT INTO public.lead_risk_signals (lead_id, signal, weight, detail)
      VALUES (_lead_id, 'canton_mismatch', (wts->>'canton_mismatch')::numeric,
              'Postcode ' || l.postcode || ' maps to ' || zone_canton || ', lead says ' || l.canton);
    END IF;
  END IF;

  SELECT coalesce(sum(weight), 0) INTO total FROM public.lead_risk_signals WHERE lead_id = _lead_id;
  UPDATE public.leads SET risk_score = total WHERE id = _lead_id;
  RETURN total;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.email_ingest(payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_caller_staff boolean := public.is_staff();
  v_service boolean := public.is_service_role();
  v_account uuid;
  v_direction public.email_direction := coalesce((payload->>'direction')::public.email_direction, 'inbound');
  v_from text := lower(btrim(coalesce(payload->>'from_address','')));
  v_from_name text := coalesce(payload->>'from_name','');
  v_to text[] := coalesce((SELECT array_agg(lower(btrim(x))) FROM jsonb_array_elements_text(coalesce(payload->'to','[]'::jsonb)) x WHERE btrim(x) <> ''), '{}');
  v_cc text[] := coalesce((SELECT array_agg(lower(btrim(x))) FROM jsonb_array_elements_text(coalesce(payload->'cc','[]'::jsonb)) x WHERE btrim(x) <> ''), '{}');
  v_refs text[] := coalesce((SELECT array_agg(btrim(x)) FROM jsonb_array_elements_text(coalesce(payload->'references','[]'::jsonb)) x WHERE btrim(x) <> ''), '{}');
  v_subject text := coalesce(payload->>'subject','');
  v_norm text := public.email_normalize_subject(coalesce(payload->>'subject',''));
  v_msgid text := btrim(coalesce(payload->>'message_id',''));
  v_inreply text := btrim(coalesce(payload->>'in_reply_to',''));
  v_received timestamptz := coalesce((payload->>'received_at')::timestamptz, now());
  v_source public.email_ingest_source := coalesce((payload->>'source')::public.email_ingest_source, 'import_eml');
  v_body_text text := coalesce(payload->>'body_text','');
  v_body_html text := coalesce(payload->>'body_html','');
  v_thread uuid;
  v_message uuid;
  v_existing uuid;
  v_match_count integer := 0;
  v_match record;
  v_linked boolean := false;
  v_folder public.email_folder;
  v_participants text[];
BEGIN
  IF NOT (v_caller_staff OR v_service) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  IF v_from = '' THEN
    RAISE EXCEPTION 'from_address is required' USING ERRCODE = '22023';
  END IF;

  -- Idempotency: the same Message-ID never lands twice.
  IF v_msgid <> '' THEN
    SELECT id, thread_id INTO v_existing, v_thread FROM public.email_messages WHERE message_id = v_msgid;
    IF v_existing IS NOT NULL THEN
      RETURN jsonb_build_object('message_id', v_existing, 'thread_id', v_thread, 'duplicate', true);
    END IF;
  END IF;

  SELECT id INTO v_account FROM public.email_accounts
   WHERE address = lower(btrim(coalesce(payload->>'account','')))
   LIMIT 1;
  IF v_account IS NULL THEN
    SELECT id INTO v_account FROM public.email_accounts WHERE active ORDER BY is_default DESC, created_at LIMIT 1;
  END IF;

  v_participants := (SELECT array_agg(DISTINCT x) FROM unnest(array_prepend(v_from, v_to || v_cc)) x WHERE x <> '');

  -- Thread by reply headers first, then by normalised subject + participant overlap.
  IF v_inreply <> '' OR array_length(v_refs,1) > 0 THEN
    SELECT m.thread_id INTO v_thread FROM public.email_messages m
     WHERE m.message_id <> '' AND m.message_id = ANY (array_remove(v_refs || ARRAY[v_inreply], ''))
     ORDER BY m.received_at DESC LIMIT 1;
  END IF;
  IF v_thread IS NULL AND v_norm <> '' THEN
    SELECT t.id INTO v_thread FROM public.email_threads t
     WHERE t.normalized_subject = v_norm
       AND t.participants && v_participants
       AND t.last_message_at > now() - interval '180 days'
     ORDER BY t.last_message_at DESC LIMIT 1;
  END IF;

  -- High-confidence match: exactly one record on a non-shared address.
  IF v_direction = 'inbound' AND NOT public.email_is_generic_address(v_from) THEN
    SELECT count(DISTINCT (entity_type, entity_id)) INTO v_match_count FROM public.email_match_sender(v_from);
    IF v_match_count = 1 THEN
      SELECT * INTO v_match FROM public.email_match_sender(v_from) LIMIT 1;
      v_linked := true;
    END IF;
  END IF;

  IF v_direction = 'outbound' THEN
    v_folder := 'sent';
  ELSE
    v_folder := CASE WHEN v_linked OR v_thread IS NOT NULL THEN 'inbox' ELSE 'unassigned' END;
  END IF;

  IF v_thread IS NULL THEN
    INSERT INTO public.email_threads (account_id, subject, normalized_subject, participants, folder,
                                      unread_count, message_count, last_message_at, last_direction, snippet)
    VALUES (v_account, v_subject, v_norm, coalesce(v_participants,'{}'), v_folder,
            CASE WHEN v_direction = 'inbound' THEN 1 ELSE 0 END, 1, v_received, v_direction,
            left(regexp_replace(v_body_text, '\s+', ' ', 'g'), 240))
    RETURNING id INTO v_thread;
  ELSE
    UPDATE public.email_threads t SET
      participants = (SELECT array_agg(DISTINCT x) FROM unnest(t.participants || coalesce(v_participants,'{}')) x),
      unread_count = t.unread_count + CASE WHEN v_direction = 'inbound' THEN 1 ELSE 0 END,
      message_count = t.message_count + 1,
      last_message_at = greatest(t.last_message_at, v_received),
      last_direction = v_direction,
      snippet = left(regexp_replace(v_body_text, '\s+', ' ', 'g'), 240),
      folder = CASE WHEN t.folder = 'archived' THEN 'inbox'::public.email_folder ELSE t.folder END,
      updated_at = now()
    WHERE t.id = v_thread;
    -- An existing thread already carries its links, so it is never "unassigned".
    IF v_direction = 'inbound' THEN
      UPDATE public.email_threads SET folder = 'inbox'
       WHERE id = v_thread AND folder = 'unassigned'
         AND EXISTS (SELECT 1 FROM public.email_links WHERE thread_id = v_thread);
    END IF;
  END IF;

  INSERT INTO public.email_messages (
    thread_id, direction, from_address, from_name, to_addresses, cc_addresses, subject,
    body_text, body_html, message_id, in_reply_to, "references", received_at, folder,
    delivery_status, ingest_source, raw_headers, created_by
  ) VALUES (
    v_thread, v_direction, v_from, v_from_name, v_to, v_cc, v_subject,
    v_body_text, v_body_html, v_msgid, v_inreply, v_refs, v_received, v_folder,
    CASE WHEN v_direction = 'inbound' THEN 'received'::public.email_delivery_status ELSE 'pending'::public.email_delivery_status END,
    v_source, coalesce(payload->'headers','{}'::jsonb), auth.uid()
  ) RETURNING id INTO v_message;

  IF v_linked THEN
    INSERT INTO public.email_links (thread_id, entity_type, entity_id, confidence, matched_on)
    VALUES (v_thread, v_match.entity_type, v_match.entity_id, 'high', v_match.matched_on)
    ON CONFLICT (thread_id, entity_type, entity_id) DO NOTHING;
  END IF;

  -- One timeline: an email attached to a lead is a communication on that lead.
  INSERT INTO public.lead_activities (lead_id, kind, actor_kind, actor_id, body, meta)
  SELECT el.entity_id, 'communication', CASE WHEN v_direction = 'inbound' THEN 'customer' ELSE 'staff' END::public.lead_actor_kind,
         auth.uid(),
         CASE WHEN v_direction = 'inbound' THEN 'E-Mail empfangen: ' ELSE 'E-Mail erfasst: ' END || coalesce(nullif(v_subject,''),'(ohne Betreff)'),
         jsonb_build_object('channel','email','thread_id', v_thread, 'message_id', v_message,
                            'from', v_from, 'direction', v_direction)
    FROM public.email_links el
   WHERE el.thread_id = v_thread AND el.entity_type = 'lead';

  RETURN jsonb_build_object(
    'message_id', v_message,
    'thread_id', v_thread,
    'duplicate', false,
    'folder', v_folder,
    'auto_linked', v_linked,
    'match_count', v_match_count
  );
END;
$function$
;
CREATE OR REPLACE FUNCTION public.email_is_generic_address(_addr text)
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT lower(split_part(coalesce(_addr,''),'@',1)) IN (
    'info','kontakt','contact','hello','hallo','office','admin','support','service',
    'noreply','no-reply','donotreply','do-not-reply','mailer-daemon','postmaster',
    'bounce','bounces','notifications','notification','news','newsletter','billing','buchhaltung'
  );
$function$
;
CREATE OR REPLACE FUNCTION public.email_match_sender(_addr text)
 RETURNS TABLE(entity_type email_link_entity, entity_id uuid, matched_on text, label text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  WITH a AS (SELECT lower(btrim(coalesce(_addr,''))) AS addr)
  SELECT 'lead'::public.email_link_entity, l.id, 'leads.customer_email', l.reference
    FROM public.leads l, a
   WHERE a.addr <> '' AND lower(l.customer_email) = a.addr
  UNION ALL
  SELECT 'partner'::public.email_link_entity, pc.partner_id, 'partner_contacts.email', p.trading_name
    FROM public.partner_contacts pc
    JOIN public.partners p ON p.id = pc.partner_id, a
   WHERE a.addr <> '' AND lower(coalesce(pc.email,'')) = a.addr
  UNION ALL
  SELECT 'account'::public.email_link_entity, ac.account_id, 'account_contacts.email', acc.trading_name
    FROM public.account_contacts ac
    JOIN public.accounts acc ON acc.id = ac.account_id, a
   WHERE a.addr <> '' AND lower(ac.email) = a.addr
  UNION ALL
  SELECT 'account'::public.email_link_entity, acc.id, 'accounts.billing_email', acc.trading_name
    FROM public.accounts acc, a
   WHERE a.addr <> '' AND lower(acc.billing_email) = a.addr;
$function$
;
CREATE OR REPLACE FUNCTION public.email_normalize_subject(_subject text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT btrim(regexp_replace(lower(coalesce(_subject,'')), '^((re|aw|antw|fw|fwd|wg|tr|rif)\s*(\[[0-9]+\])?\s*:\s*)+', '', 'g'));
$function$
;
CREATE OR REPLACE FUNCTION public.evaluate_fulfilment(_lead_id uuid)
 RETURNS TABLE(candidate_kind text, candidate_id uuid, candidate_name text, score numeric, reasons jsonb, customer_price numeric, expected_cost numeric, expected_margin numeric, expected_margin_pct numeric, travel_estimate numeric, earliest_availability date, rating numeric, commercial_note text, costs_visible boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  l public.leads;
  show_costs boolean := public.can_see_costs();
  price numeric;
BEGIN
  IF NOT public.is_dispatcher() THEN
    RAISE EXCEPTION 'not authorised' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO l FROM public.leads WHERE id = _lead_id;
  IF l.id IS NULL THEN RAISE EXCEPTION 'lead not found' USING ERRCODE = 'P0002'; END IF;
  price := l.expected_sell;

  RETURN QUERY
  WITH base AS (
    SELECT * FROM public.score_candidates(_lead_id)
  ), enriched AS (
    SELECT b.candidate_kind, b.candidate_id, b.candidate_name, b.score, b.reasons,
           price AS customer_price,
           CASE WHEN show_costs THEN
             CASE WHEN b.candidate_kind = 'partner' THEN (
               SELECT min(q.partner_cost) FROM public.partner_quotes q
                WHERE q.lead_id = _lead_id AND q.partner_id = b.candidate_id
                  AND q.status IN ('submitted','accepted'))
             ELSE NULL END
           ELSE NULL END AS cand_cost,
           NULL::numeric AS travel_estimate,
           CASE WHEN b.candidate_kind = 'partner' THEN (
             SELECT min(a.date) FROM public.resource_availability a
              WHERE a.resource_kind = 'partner' AND a.resource_id = b.candidate_id
                AND a.state IN ('available','limited') AND a.date >= current_date)
           ELSE (
             SELECT min(a.date) FROM public.resource_availability a
              WHERE a.resource_kind = 'internal_team' AND a.resource_id = b.candidate_id
                AND a.state IN ('available','limited') AND a.date >= current_date)
           END AS earliest_availability,
           CASE WHEN b.candidate_kind = 'partner'
                THEN (SELECT pp.score FROM public.partner_performance pp WHERE pp.partner_id = b.candidate_id)
                ELSE NULL END AS rating
    FROM base b
  ), calc AS (
    SELECT e.*,
           CASE WHEN e.cand_cost IS NOT NULL AND e.customer_price IS NOT NULL
                THEN e.customer_price - e.cand_cost END AS gp,
           CASE WHEN e.cand_cost IS NOT NULL AND coalesce(e.customer_price,0) > 0
                THEN round((e.customer_price - e.cand_cost) / e.customer_price * 100, 1) END AS gp_pct
    FROM enriched e
  )
  SELECT c.candidate_kind, c.candidate_id, c.candidate_name, c.score, c.reasons,
         c.customer_price, c.cand_cost, c.gp, c.gp_pct, c.travel_estimate,
         c.earliest_availability, c.rating,
         CASE
           WHEN show_costs AND c.gp_pct IS NOT NULL AND c.gp_pct = max(c.gp_pct) OVER () THEN 'highest_margin'
           WHEN c.earliest_availability IS NOT NULL AND c.earliest_availability = min(c.earliest_availability) OVER () THEN 'fastest_availability'
           WHEN c.rating IS NOT NULL AND c.rating = max(c.rating) OVER () THEN 'best_rated'
           ELSE ''
         END,
         show_costs
  FROM calc c
  ORDER BY c.score DESC;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.exception_threshold(_key text, _fallback numeric)
 RETURNS numeric
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT coalesce((SELECT threshold_value FROM public.exception_rules WHERE key = _key AND active), _fallback)
$function$
;
CREATE OR REPLACE FUNCTION public.fairness_pick(_lead_id uuid)
 RETURNS TABLE(partner_id uuid, score numeric, reasons jsonb, kind text, reason_text text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  expl numeric := public.fairness_value('exploration_pct', 15);
  bucket int;
  rec record;
BEGIN
  IF NOT (public.is_dispatcher() OR public.is_service_role()) THEN
    RAISE EXCEPTION 'not authorised' USING ERRCODE = '42501';
  END IF;

  bucket := abs(hashtext(_lead_id::text)) % 100;

  -- exploration slot: deterministic on the lead id
  IF bucket < expl THEN
    SELECT s.candidate_id, s.score, s.reasons INTO rec
      FROM public.score_candidates(_lead_id) s
     WHERE s.candidate_kind = 'partner'
       AND (s.flags->>'probation')::boolean IS FALSE
       AND (s.flags->>'saturated')::boolean IS FALSE
       AND (s.flags->>'cold_start')::boolean IS TRUE
       AND NOT EXISTS (SELECT 1 FROM public.partner_opportunities y
                        WHERE y.lead_id = _lead_id AND y.partner_id = s.candidate_id)
     ORDER BY s.score DESC, s.candidate_id ASC LIMIT 1;
    IF rec.candidate_id IS NOT NULL THEN
      RETURN QUERY SELECT rec.candidate_id, rec.score, rec.reasons, 'exploration'::text,
        'Exploration slot ' || bucket::text || '/100 below ' || expl::text ||
        '% — qualified partner with thin history chosen over the incumbent';
      RETURN;
    END IF;
  END IF;

  SELECT s.candidate_id, s.score, s.reasons INTO rec
    FROM public.score_candidates(_lead_id) s
   WHERE s.candidate_kind = 'partner'
     AND (s.flags->>'probation')::boolean IS FALSE
     AND (s.flags->>'saturated')::boolean IS FALSE
     AND NOT EXISTS (SELECT 1 FROM public.partner_opportunities y
                      WHERE y.lead_id = _lead_id AND y.partner_id = s.candidate_id)
   ORDER BY s.score DESC, s.candidate_id ASC LIMIT 1;

  IF rec.candidate_id IS NOT NULL THEN
    RETURN QUERY SELECT rec.candidate_id, rec.score, rec.reasons, 'escalation'::text,
      'Highest ranked eligible partner outside probation and under the saturation cap';
  END IF;
  RETURN;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.fairness_value(_key text, _fallback numeric)
 RETURNS numeric
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT coalesce((SELECT value FROM public.fairness_rules WHERE key = _key AND active), _fallback)
$function$
;
CREATE OR REPLACE FUNCTION public.generate_due_work_orders(_horizon_days integer DEFAULT 30)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  sch record; eff record; site public.account_sites; created int := 0; skipped int := 0;
  details jsonb := '[]'::jsonb; wo public.work_orders; due date; guard int; ctr uuid;
begin
  if not (public.is_dispatcher() or public.is_service_role()) then
    raise exception 'not authorised' using errcode = '42501';
  end if;

  for sch in
    select s.*, ss.site_id, ss.catalogue_id
    from public.service_schedules s
    join public.site_services ss on ss.id = s.site_service_id and ss.active
    where s.active and s.frequency <> 'custom_cron'
      and s.next_due_on <= current_date + make_interval(days => greatest(_horizon_days,0))
  loop
    if sch.paused_until is not null and sch.paused_until >= current_date then
      skipped := skipped + 1;
      details := details || jsonb_build_object('schedule', sch.id, 'reason', 'paused_until', 'until', sch.paused_until);
      continue;
    end if;

    select * into site from public.account_sites where id = sch.site_id;
    select * into eff from public.resolve_site_service(sch.site_id, sch.catalogue_id);
    select cs.contract_id into ctr from public.contract_sites cs
      join public.contracts c on c.id = cs.contract_id
     where cs.site_id = sch.site_id and c.status = 'active' limit 1;

    due := sch.next_due_on; guard := 0;
    while due <= current_date + make_interval(days => greatest(_horizon_days,0)) and guard < 60 loop
      guard := guard + 1;
      begin
        insert into public.work_orders (
          account_id, site_id, contract_id, schedule_id, catalogue_id, service, due_on,
          window_start, window_end, sla_id, reported_at, preferred_fulfilment,
          partner_id, team_id, value)
        values (
          site.account_id, sch.site_id, ctr, sch.id, sch.catalogue_id,
          coalesce((select key from public.service_catalogue where id = sch.catalogue_id), ''),
          due,
          (due::timestamp + sch.window_start_time)::timestamptz,
          (due::timestamp + sch.window_end_time)::timestamptz,
          eff.sla_id,
          greatest(now(), (due - make_interval(days => sch.lead_time_days))::timestamptz),
          eff.preferred_fulfilment, eff.preferred_partner_id, eff.preferred_team_id, eff.price)
        returning * into wo;
        created := created + 1;
        details := details || jsonb_build_object('schedule', sch.id, 'work_order', wo.reference, 'due_on', due);
      exception when unique_violation then
        skipped := skipped + 1;
        details := details || jsonb_build_object('schedule', sch.id, 'reason', 'already_generated', 'due_on', due);
      end;
      due := public.advance_due_date(sch.frequency, due, sch.weekday, sch.day_of_month, sch.month_offset);
      exit when due is null;
    end loop;

    update public.service_schedules
       set next_due_on = coalesce(due, next_due_on), last_generated_on = current_date, updated_at = now()
     where id = sch.id;
  end loop;

  return jsonb_build_object('created', created, 'skipped', skipped, 'details', details);
end $function$
;
CREATE OR REPLACE FUNCTION public.generate_opportunity_reference()
 RETURNS text
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  candidate text; i int;
BEGIN
  LOOP
    candidate := 'MF-OPP-' || to_char(now(), 'YYYY') || '-';
    FOR i IN 1..8 LOOP
      candidate := candidate || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.partner_opportunities WHERE reference = candidate);
  END LOOP;
  RETURN candidate;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.generate_quote_reference()
 RETURNS text
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  candidate text;
  i int;
BEGIN
  LOOP
    candidate := 'MF-' || to_char(now(), 'YYYY') || '-';
    FOR i IN 1..8 LOOP
      candidate := candidate || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.quotes q WHERE q.reference = candidate);
  END LOOP;
  RETURN candidate;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.get_public_quote(_reference text, _contact text DEFAULT NULL::text)
 RETURNS TABLE(reference text, language text, status text, created_at timestamp with time zone, move_date text, from_zip text, to_zip text, room_units numeric, floor_out integer, floor_in integer, lift text, property_type text, parking integer, carry integer, narrow_stairs boolean, permit boolean, hoist boolean, services jsonb, items jsonb, distance_km integer, volume_m3 numeric, boxes integer, vans integer, crew integer, load_hours numeric, total_hours numeric, access_score integer, score_label text, price_net numeric, price_vat numeric, price_total numeric, price_low numeric, price_high numeric, discount_rate numeric, pricing_version integer, pricing_effective_from date)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  c text := btrim(coalesce(_contact, ''));
  c_digits text := regexp_replace(coalesce(_contact, ''), '\D', '', 'g');
BEGIN
  IF btrim(coalesce(_reference, '')) = '' OR c = '' THEN
    RETURN;
  END IF;

  -- Swiss national form: 0791234567 and 41791234567 are the same subscriber.
  IF length(c_digits) >= 9 AND left(c_digits, 1) = '0' THEN
    c_digits := substr(c_digits, 2);
  ELSIF length(c_digits) >= 11 AND left(c_digits, 2) = '41' THEN
    c_digits := substr(c_digits, 3);
  END IF;

  RETURN QUERY
    SELECT q.reference, q.language, q.status::text, q.created_at, q.move_date::text,
           q.from_zip, q.to_zip, q.room_units, q.floor_out, q.floor_in, q.lift,
           q.property_type, q.parking, q.carry, q.narrow_stairs, q.permit, q.hoist,
           q.services, q.items, q.distance_km, q.volume_m3, q.boxes, q.vans, q.crew,
           q.load_hours, q.total_hours, q.access_score, q.score_label,
           q.price_net, q.price_vat, q.price_total, q.price_low, q.price_high,
           q.discount_rate, pc.version, pc.effective_from
      FROM public.quotes q
      LEFT JOIN public.pricing_configurations pc ON pc.id = q.pricing_configuration_id
     WHERE q.reference = btrim(_reference)
       AND q.created_at > now() - interval '30 days'
       AND (
         (position('@' in c) > 0 AND lower(btrim(coalesce(q.customer_email, ''))) = lower(c))
         OR (
           length(c_digits) >= 6
           AND length(regexp_replace(coalesce(q.customer_phone, ''), '\D', '', 'g')) >= 6
           AND right(regexp_replace(coalesce(q.customer_phone, ''), '\D', '', 'g'), length(c_digits)) = c_digits
         )
       )
     LIMIT 1;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.handle_new_portal_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.handle_sla_timeouts()
 RETURNS TABLE(timed_out integer, escalated integer, exceptions integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE res jsonb;
BEGIN
  res := public.handle_sla_timeouts_detailed();
  RETURN QUERY SELECT (res->>'timed_out')::int, (res->>'escalated')::int, (res->>'exceptions')::int;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.handle_sla_timeouts_detailed()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  o record;
  nxt record;
  sla int;
  claims jsonb;
  n_timeout int := 0; n_escalated int := 0; n_exception int := 0;
  leads uuid[] := '{}';
  errs jsonb := '[]'::jsonb;
  lead_ref text;
  risk_gate numeric := public.exception_threshold('risk_review', 50);
  l public.leads;
BEGIN
  claims := nullif(current_setting('request.jwt.claims', true), '')::jsonb;
  IF claims IS NOT NULL
     AND coalesce(claims->>'role', '') <> 'service_role'
     AND NOT (public.is_staff() OR public.has_role('ops_manager')) THEN
    RAISE EXCEPTION 'not authorised' USING ERRCODE = '42501';
  END IF;

  FOR o IN
    SELECT * FROM public.partner_opportunities
     WHERE status IN ('sent','viewed') AND respond_by IS NOT NULL AND respond_by < now()
     ORDER BY respond_by ASC
  LOOP
    BEGIN
      UPDATE public.partner_opportunities
         SET status = 'timed_out', responded_at = now(), updated_at = now()
       WHERE id = o.id;
      n_timeout := n_timeout + 1;

      IF o.lead_id IS NOT NULL AND NOT (o.lead_id = ANY(leads)) THEN
        leads := leads || o.lead_id;
      END IF;

      IF o.lead_id IS NOT NULL THEN
        INSERT INTO public.lead_activities (lead_id, kind, body, meta, actor_id, actor_kind)
        VALUES (o.lead_id, 'system', '',
                jsonb_build_object('opportunity', o.id, 'partner', o.partner_id, 'action', 'timed_out'),
                auth.uid(), 'system');
      END IF;

      IF o.partner_id IS NOT NULL THEN
        PERFORM public.recalc_partner_performance(o.partner_id);
      END IF;

      IF o.lead_id IS NOT NULL
         AND NOT EXISTS (SELECT 1 FROM public.partner_opportunities x
                          WHERE x.lead_id = o.lead_id AND x.status IN ('accepted','sent','viewed')) THEN

        SELECT * INTO l FROM public.leads WHERE id = o.lead_id;

        IF l.risk_score >= risk_gate AND NOT l.risk_reviewed THEN
          INSERT INTO public.lead_activities (lead_id, kind, body, meta, actor_id, actor_kind)
          VALUES (o.lead_id, 'system', '',
                  jsonb_build_object('action','auto_allocation_suppressed','risk_score', l.risk_score),
                  auth.uid(), 'system');
          CONTINUE;
        END IF;

        sla := public.lead_sla_minutes(o.lead_id);
        SELECT * INTO nxt FROM public.fairness_pick(o.lead_id) LIMIT 1;

        IF nxt.partner_id IS NOT NULL THEN
          INSERT INTO public.partner_opportunities (
            partner_id, reference, status, title, description, currency,
            lead_id, sent_at, respond_by, match_score, match_reasons,
            allocation_kind, allocation_reason)
          SELECT nxt.partner_id, public.generate_opportunity_reference(), 'sent',
                 l.reference, left(coalesce(l.description,''),140), 'CHF',
                 l.id, now(), now() + make_interval(mins => sla), nxt.score, nxt.reasons,
                 nxt.kind, nxt.reason_text;
          n_escalated := n_escalated + 1;
          INSERT INTO public.lead_activities (lead_id, kind, body, meta, actor_id, actor_kind)
          VALUES (o.lead_id, 'assignment', nxt.reason_text,
                  jsonb_build_object('partner', nxt.partner_id, 'action', 'escalated_after_timeout',
                                     'allocation_kind', nxt.kind),
                  auth.uid(), 'system');
          PERFORM public.recalc_partner_performance(nxt.partner_id);
        ELSE
          INSERT INTO public.allocation_exceptions (lead_id, reason, resolution)
          SELECT o.lead_id, 'sla_exhausted', ''
           WHERE NOT EXISTS (SELECT 1 FROM public.allocation_exceptions ae
                              WHERE ae.lead_id = o.lead_id AND ae.reason = 'sla_exhausted' AND ae.resolved_at IS NULL);
          n_exception := n_exception + 1;
          INSERT INTO public.lead_activities (lead_id, kind, body, meta, actor_id, actor_kind)
          VALUES (o.lead_id, 'system', '', jsonb_build_object('action', 'sla_exhausted'), auth.uid(), 'system');
        END IF;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      SELECT reference INTO lead_ref FROM public.leads WHERE id = o.lead_id;
      errs := errs || jsonb_build_object(
        'lead_reference', coalesce(lead_ref, ''),
        'opportunity', o.reference,
        'code', 'lead_failed',
        'message', SQLERRM);
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'timed_out', n_timeout,
    'escalated', n_escalated,
    'exceptions', n_exception,
    'leads_processed', coalesce(array_length(leads, 1), 0),
    'partners_notified', n_escalated,
    'errors', errs);
END;
$function$
;
CREATE OR REPLACE FUNCTION public.has_role(_role text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role::text = _role
  )
$function$
;
CREATE OR REPLACE FUNCTION public.identity_candidates(_email text, _phone text, _exclude uuid DEFAULT NULL::uuid)
 RETURNS TABLE(lead_id uuid, reference text, customer_name text, customer_email text, customer_phone text, matched_on text, created_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT l.id, l.reference, l.customer_name, l.customer_email, l.customer_phone,
         CASE WHEN lower(l.customer_email) = lower(btrim(coalesce(_email,''))) AND coalesce(_email,'') <> ''
              THEN 'email' ELSE 'phone' END,
         l.created_at
    FROM public.leads l
   WHERE (_exclude IS NULL OR l.id <> _exclude)
     AND (
       (coalesce(btrim(_email),'') <> '' AND lower(l.customer_email) = lower(btrim(_email)))
       OR (public.phone_key(_phone) <> '' AND public.phone_key(l.customer_phone) = public.phone_key(_phone))
     )
   ORDER BY l.created_at DESC
   LIMIT 20;
$function$
;
CREATE OR REPLACE FUNCTION public.import_units(_property_id uuid, _rows jsonb)
 RETURNS integer
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  _org uuid;
  _row jsonb;
  _count integer := 0;
BEGIN
  SELECT organization_id INTO _org FROM public.properties WHERE id = _property_id;
  IF _org IS NULL THEN
    RAISE EXCEPTION 'property_not_found';
  END IF;

  FOR _row IN SELECT * FROM jsonb_array_elements(_rows) LOOP
    IF coalesce(btrim(_row->>'label'), '') = '' THEN
      RAISE EXCEPTION 'label_required';
    END IF;
    INSERT INTO public.units (organization_id, property_id, label, unit_type, rooms, floor, has_lift, size_m2, notes)
    VALUES (
      _org,
      _property_id,
      btrim(_row->>'label'),
      coalesce(nullif(_row->>'unit_type', ''), 'wohnung'),
      nullif(_row->>'rooms', '')::numeric,
      coalesce(nullif(_row->>'floor', '')::integer, 0),
      coalesce(nullif(_row->>'has_lift', '')::boolean, false),
      nullif(_row->>'size_m2', '')::numeric,
      coalesce(_row->>'notes', '')
    );
    _count := _count + 1;
  END LOOP;

  RETURN _count;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.inquiry_sla_exceptions()
 RETURNS TABLE(rule_key text, severity text, entity text, entity_id uuid, reference text, metric numeric, unit text, detail text, link text, occurred_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF NOT public.is_dispatcher() THEN
    RAISE EXCEPTION 'not authorised' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  -- First review not done inside the queue's target
  SELECT 'inquiry_first_review', 'critical', 'lead', l.id, l.reference,
         round(extract(epoch FROM now() - l.created_at)/60), 'minutes',
         'No first review · queue ' || q.key, '/admin/leads?lead=' || l.id::text, l.created_at
    FROM public.leads l JOIN public.lead_queues q ON q.id = l.queue_id
   WHERE l.first_review_at IS NULL
     AND l.status::text NOT IN ('lost','cancelled','completed','spam_review')
     AND l.created_at < now() - make_interval(mins => q.sla_first_review_minutes)

  UNION ALL
  -- Customer not contacted inside the queue's target
  SELECT 'inquiry_first_contact', 'critical', 'lead', l.id, l.reference,
         round(extract(epoch FROM now() - l.created_at)/60), 'minutes',
         'Customer not contacted · queue ' || q.key, '/admin/leads?lead=' || l.id::text, l.created_at
    FROM public.leads l JOIN public.lead_queues q ON q.id = l.queue_id
   WHERE l.first_contact_at IS NULL
     AND l.status::text NOT IN ('lost','cancelled','completed','spam_review')
     AND l.created_at < now() - make_interval(mins => q.sla_first_contact_minutes)

  UNION ALL
  -- Near breach on first contact (last 20% of the window)
  SELECT 'inquiry_contact_near_breach', 'warning', 'lead', l.id, l.reference,
         round(extract(epoch FROM (l.created_at + make_interval(mins => q.sla_first_contact_minutes)) - now())/60),
         'minutes', 'First contact deadline approaching · queue ' || q.key,
         '/admin/leads?lead=' || l.id::text, l.created_at
    FROM public.leads l JOIN public.lead_queues q ON q.id = l.queue_id
   WHERE l.first_contact_at IS NULL
     AND l.status::text NOT IN ('lost','cancelled','completed','spam_review')
     AND now() >= l.created_at + make_interval(mins => (q.sla_first_contact_minutes * 8 / 10))
     AND now() < l.created_at + make_interval(mins => q.sla_first_contact_minutes)

  UNION ALL
  -- Quote overdue
  SELECT 'inquiry_quote_overdue', 'warning', 'lead', l.id, l.reference,
         round(extract(epoch FROM now() - l.created_at)/60), 'minutes',
         'Quote not sent · queue ' || q.key, '/admin/leads?lead=' || l.id::text, l.created_at
    FROM public.leads l JOIN public.lead_queues q ON q.id = l.queue_id
   WHERE l.quoted_at IS NULL
     AND l.status::text IN ('qualified','quote_required','site_visit_required','ready_for_allocation')
     AND l.created_at < now() - make_interval(mins => q.sla_quote_minutes)

  UNION ALL
  -- Waiting on the customer for too long
  SELECT 'inquiry_awaiting_customer', 'warning', 'lead', l.id, l.reference,
         round(extract(epoch FROM now() - coalesce(l.awaiting_since, l.last_activity_at))/60), 'minutes',
         'Waiting on customer · queue ' || q.key, '/admin/leads?lead=' || l.id::text,
         coalesce(l.awaiting_since, l.last_activity_at)
    FROM public.leads l JOIN public.lead_queues q ON q.id = l.queue_id
   WHERE l.status::text IN ('awaiting_customer','negotiation','quote_sent')
     AND coalesce(l.awaiting_since, l.last_activity_at) < now() - make_interval(mins => q.sla_awaiting_customer_minutes)

  UNION ALL
  -- Waiting on partners for too long
  SELECT 'inquiry_awaiting_partner', 'warning', 'lead', l.id, l.reference,
         round(extract(epoch FROM now() - coalesce(l.awaiting_since, l.last_activity_at))/60), 'minutes',
         'Waiting on partner responses · queue ' || q.key, '/admin/leads?lead=' || l.id::text,
         coalesce(l.awaiting_since, l.last_activity_at)
    FROM public.leads l JOIN public.lead_queues q ON q.id = l.queue_id
   WHERE l.status::text = 'sent_to_partners'
     AND coalesce(l.awaiting_since, l.last_activity_at) < now() - make_interval(mins => q.sla_awaiting_partner_minutes)

  UNION ALL
  -- Unowned inquiry: the one that gets forgotten
  SELECT 'inquiry_unowned', 'critical', 'lead', l.id, l.reference,
         round(extract(epoch FROM now() - l.created_at)/60), 'minutes',
         'No owner and no team', '/admin/leads?lead=' || l.id::text, l.created_at
    FROM public.leads l
   WHERE l.lead_owner_id IS NULL AND l.assigned_team_id IS NULL
     AND l.status::text NOT IN ('lost','cancelled','completed');
END;
$function$
;
CREATE OR REPLACE FUNCTION public.invoices_set_qr_reference()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF coalesce(NEW.qr_reference, '') = '' THEN
    NEW.qr_reference := public.build_qr_reference(
      to_char(coalesce(NEW.created_at, now()), 'YYYYMMDD') ||
      regexp_replace(coalesce(NEW.reference, ''), '\D', '', 'g') ||
      replace(NEW.id::text, '-', ''));
  END IF;
  RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.is_dispatcher()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT public.is_staff() OR public.has_role('ops_manager') OR public.has_role('sales') OR public.has_role('partner_manager')
$function$
;
CREATE OR REPLACE FUNCTION public.is_service_role()
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb->>'role','') = 'service_role'
     or current_setting('role', true) = 'service_role'
$function$
;
CREATE OR REPLACE FUNCTION public.is_staff()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'zuegelwerk_admin')
$function$
;
CREATE OR REPLACE FUNCTION public.is_zw_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'zuegelwerk_admin'
  )
$function$
;
CREATE OR REPLACE FUNCTION public.job_materials_for(_job_id uuid)
 RETURNS TABLE(id uuid, description text, quantity numeric, unit text, supplier_cost numeric, customer_price numeric, photo_path text, status job_material_status, change_order_id uuid, created_at timestamp with time zone, costs_visible boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE vis boolean;
BEGIN
  IF NOT public.can_access_job(_job_id) THEN RAISE EXCEPTION 'not authorised' USING ERRCODE = '42501'; END IF;
  vis := public.can_see_costs();
  RETURN QUERY
    SELECT m.id, m.description, m.quantity, m.unit,
           CASE WHEN vis THEN m.supplier_cost ELSE NULL END,
           m.customer_price, m.photo_path, m.status, m.change_order_id, m.created_at, vis
      FROM public.job_materials m WHERE m.job_id = _job_id ORDER BY m.created_at;
END; $function$
;
CREATE OR REPLACE FUNCTION public.lead_economics(_lead_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE l public.leads; show_costs boolean := public.can_see_costs();
BEGIN
  IF NOT public.is_dispatcher() THEN
    RAISE EXCEPTION 'not authorised' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO l FROM public.leads WHERE id = _lead_id;
  IF l.id IS NULL THEN RAISE EXCEPTION 'lead not found' USING ERRCODE = 'P0002'; END IF;
  RETURN jsonb_build_object(
    'lead_id', l.id,
    'costs_visible', show_costs,
    'expected_sell', l.expected_sell,
    'min_margin_pct', l.min_margin_pct,
    'flags', to_jsonb(l.economics_flags),
    'expected_cost', CASE WHEN show_costs THEN l.expected_cost END,
    'expected_margin', CASE WHEN show_costs THEN l.expected_margin END,
    'expected_margin_pct', CASE WHEN show_costs THEN l.expected_margin_pct END,
    'travel_cost', CASE WHEN show_costs THEN l.travel_cost END,
    'acquisition_cost', CASE WHEN show_costs THEN l.acquisition_cost END);
END;
$function$
;
CREATE OR REPLACE FUNCTION public.lead_sla_minutes(_lead_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  has_session boolean := coalesce(nullif(current_setting('request.jwt.claims', true), ''), '') <> '';
  result integer;
BEGIN
  IF has_session AND NOT (public.is_staff() OR public.is_dispatcher() OR public.is_service_role()) THEN
    RAISE EXCEPTION 'not permitted' USING ERRCODE = '42501';
  END IF;

  SELECT coalesce((
    SELECT r.sla_minutes FROM public.allocation_rules r
     JOIN public.leads l ON l.id = _lead_id
     WHERE r.active
       AND (r.category_id IS NULL OR r.category_id = l.category_id)
       AND (r.canton = '' OR r.canton = l.canton)
       AND (r.customer_type IS NULL OR r.customer_type = l.customer_type)
     ORDER BY r.priority ASC LIMIT 1), 120)
  INTO result;

  RETURN result;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.lead_status_for_customer(_reference text)
 RETURNS TABLE(reference text, status text, updated_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT l.reference, public.customer_facing_status(l.status), l.updated_at
  FROM public.leads l
  WHERE l.reference = _reference
    AND l.created_at > now() - interval '180 days'
  LIMIT 1;
$function$
;
CREATE OR REPLACE FUNCTION public.lead_tracker(_reference text, _contact text)
 RETURNS TABLE(reference text, stage text, source_key text, queue_key text, label_de text, label_fr text, label_it text, label_en text, language text, created_at timestamp with time zone, updated_at timestamp with time zone, first_review_at timestamp with time zone, first_contact_at timestamp with time zone, quoted_at timestamp with time zone, review_due_at timestamp with time zone, contact_due_at timestamp with time zone, quote_due_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT l.reference,
         public.customer_facing_status(l.status),
         coalesce(s.key, ''),
         coalesce(q.key, ''),
         coalesce(q.label_de, ''), coalesce(q.label_fr, ''),
         coalesce(q.label_it, ''), coalesce(q.label_en, ''),
         l.language,
         l.created_at,
         l.updated_at,
         l.first_review_at,
         l.first_contact_at,
         l.quoted_at,
         l.created_at + make_interval(mins => coalesce(q.sla_first_review_minutes, 0)),
         l.created_at + make_interval(mins => coalesce(q.sla_first_contact_minutes, 0)),
         l.created_at + make_interval(mins => coalesce(q.sla_quote_minutes, 0))
    FROM public.leads l
    LEFT JOIN public.lead_queues q ON q.id = l.queue_id
    LEFT JOIN public.lead_sources s ON s.id = l.source_id
   WHERE upper(btrim(l.reference)) = upper(btrim(_reference))
     AND btrim(coalesce(_contact, '')) <> ''
     AND (
       lower(btrim(l.customer_email)) = lower(btrim(_contact))
       OR (
         length(regexp_replace(coalesce(_contact, ''), '\D', '', 'g')) >= 6
         AND regexp_replace(coalesce(l.customer_phone, ''), '\D', '', 'g')
             LIKE '%' || right(regexp_replace(_contact, '\D', '', 'g'), 9)
       )
     )
   LIMIT 1;
$function$
;
CREATE OR REPLACE FUNCTION public.leads_identity_trigger()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE c record; n integer := 0;
BEGIN
  FOR c IN SELECT * FROM public.identity_candidates(NEW.customer_email, NEW.customer_phone, NEW.id) LOOP
    INSERT INTO public.lead_duplicates (lead_id, existing_lead_id, matched_on)
    VALUES (NEW.id, c.lead_id, c.matched_on)
    ON CONFLICT (lead_id, existing_lead_id) DO NOTHING;

    INSERT INTO public.lead_activities (lead_id, kind, actor_kind, body, meta)
    VALUES (NEW.id, 'system', 'system',
            'Bestehender Kundendatensatz erkannt: ' || c.reference || ' (' || c.matched_on || ')',
            jsonb_build_object('duplicate_of', c.lead_id, 'matched_on', c.matched_on,
                               'reference', c.reference));
    n := n + 1;
    EXIT WHEN n >= 5;
  END LOOP;
  RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.leads_recompute_economics()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  PERFORM public.compute_lead_economics(NEW.id);
  RETURN NULL;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.leads_risk_trigger()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  PERFORM public.detect_lead_risk(NEW.id);
  RETURN NULL;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.log_allocation_exception(_lead_id uuid, _reason allocation_exception_reason, _resolution text DEFAULT ''::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE new_id uuid;
BEGIN
  IF NOT public.is_dispatcher() THEN
    RAISE EXCEPTION 'not authorised' USING ERRCODE = '42501';
  END IF;
  SELECT id INTO new_id FROM public.allocation_exceptions
   WHERE lead_id = _lead_id AND reason = _reason AND resolved_at IS NULL LIMIT 1;
  IF new_id IS NOT NULL THEN RETURN new_id; END IF;

  INSERT INTO public.allocation_exceptions (lead_id, reason, resolution)
  VALUES (_lead_id, _reason, coalesce(_resolution, ''))
  RETURNING id INTO new_id;

  INSERT INTO public.lead_activities (lead_id, kind, body, meta, actor_id, actor_kind)
  VALUES (_lead_id, 'system', coalesce(_resolution, ''),
          jsonb_build_object('allocation_exception', new_id, 'reason', _reason), auth.uid(), 'staff');
  RETURN new_id;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.management_exceptions()
 RETURNS TABLE(rule_key text, severity text, entity text, entity_id uuid, reference text, metric numeric, unit text, detail text, link text, occurred_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  r_active jsonb;
BEGIN
  IF NOT public.is_dispatcher() THEN
    RAISE EXCEPTION 'not authorised' USING ERRCODE = '42501';
  END IF;

  SELECT jsonb_object_agg(er.key, jsonb_build_object('sev', er.severity, 'v', er.threshold_value))
    INTO r_active FROM public.exception_rules er WHERE er.active;
  r_active := coalesce(r_active, '{}'::jsonb);

  RETURN QUERY
  SELECT 'unassigned_lead', r_active->'unassigned_lead'->>'sev', 'lead', l.id, l.reference,
         round(extract(epoch FROM now() - l.created_at)/60), 'minutes',
         'Status ' || l.status::text || ', no partner or team assigned',
         '/admin/leads?lead=' || l.id::text, l.created_at
    FROM public.leads l
   WHERE r_active ? 'unassigned_lead'
     AND l.status IN ('new','qualified','quote_required')
     AND l.assigned_partner_id IS NULL AND l.assigned_team_id IS NULL
     AND l.created_at < now() - make_interval(mins => (r_active->'unassigned_lead'->>'v')::int)

  UNION ALL
  SELECT 'sla_breach', r_active->'sla_breach'->>'sev', 'opportunity', o.id, o.reference,
         round(extract(epoch FROM now() - o.respond_by)/60), 'minutes',
         'Response deadline passed, opportunity still ' || o.status,
         '/admin/leads?lead=' || coalesce(o.lead_id::text,''), o.respond_by
    FROM public.partner_opportunities o
   WHERE r_active ? 'sla_breach' AND o.status IN ('sent','viewed')
     AND o.respond_by IS NOT NULL AND o.respond_by < now()

  UNION ALL
  SELECT 'sla_near_breach', r_active->'sla_near_breach'->>'sev', 'opportunity', o.id, o.reference,
         round(extract(epoch FROM o.respond_by - now())/60), 'minutes',
         'Response deadline approaching',
         '/admin/leads?lead=' || coalesce(o.lead_id::text,''), o.respond_by
    FROM public.partner_opportunities o
   WHERE r_active ? 'sla_near_breach' AND o.status IN ('sent','viewed')
     AND o.respond_by IS NOT NULL AND o.respond_by >= now()
     AND o.respond_by < now() + make_interval(mins => (r_active->'sla_near_breach'->>'v')::int)

  UNION ALL
  SELECT 'low_margin', r_active->'low_margin'->>'sev', 'lead', l.id, l.reference,
         round(l.expected_margin_pct, 1), 'percent',
         'Expected margin below threshold',
         '/admin/leads?lead=' || l.id::text, l.updated_at
    FROM public.leads l
   WHERE r_active ? 'low_margin' AND l.expected_margin_pct IS NOT NULL
     AND l.status NOT IN ('lost','cancelled','completed')
     AND l.expected_margin_pct < (r_active->'low_margin'->>'v')::numeric

  UNION ALL
  SELECT 'below_min_margin', r_active->'below_min_margin'->>'sev', 'lead', l.id, l.reference,
         round(l.expected_margin_pct, 1), 'percent',
         'Below the lead minimum of ' || round(l.min_margin_pct,1)::text || '%',
         '/admin/leads?lead=' || l.id::text, l.updated_at
    FROM public.leads l
   WHERE r_active ? 'below_min_margin' AND l.expected_margin_pct IS NOT NULL
     AND l.min_margin_pct IS NOT NULL
     AND l.status NOT IN ('lost','cancelled','completed')
     AND l.expected_margin_pct < l.min_margin_pct

  UNION ALL
  SELECT 'partner_failure_rate', r_active->'partner_failure_rate'->>'sev', 'partner', p.id, p.reference,
         round(f.bad::numeric * 100 / f.sent, 1), 'percent',
         f.bad::text || ' declined/timed out of ' || f.sent::text || ' in 90 days',
         '/admin/partner/' || p.reference, now()
    FROM public.partners p
    JOIN LATERAL (
      SELECT count(*) FILTER (WHERE o.status IN ('sent','viewed','accepted','rejected','withdrawn','timed_out')) AS sent,
             count(*) FILTER (WHERE o.status IN ('rejected','timed_out')) AS bad
        FROM public.partner_opportunities o
       WHERE o.partner_id = p.id AND o.sent_at > now() - interval '90 days'
    ) f ON f.sent >= 5
   WHERE r_active ? 'partner_failure_rate'
     AND f.bad::numeric * 100 / f.sent >= (r_active->'partner_failure_rate'->>'v')::numeric

  UNION ALL
  SELECT 'overdue_quote', r_active->'overdue_quote'->>'sev', 'lead', l.id, l.reference,
         round(extract(epoch FROM now() - coalesce(l.last_activity_at, l.updated_at))/86400, 1), 'days',
         'Quote sent, no movement since',
         '/admin/leads?lead=' || l.id::text, coalesce(l.last_activity_at, l.updated_at)
    FROM public.leads l
   WHERE r_active ? 'overdue_quote' AND l.status = 'quote_sent'
     AND coalesce(l.last_activity_at, l.updated_at)
         < now() - make_interval(days => (r_active->'overdue_quote'->>'v')::int)

  UNION ALL
  SELECT 'partner_complaints', r_active->'partner_complaints'->>'sev', 'partner', p.id, p.reference,
         pp.complaints::numeric, 'count',
         pp.complaints::text || ' complaints recorded',
         '/admin/partner/' || p.reference, pp.computed_at
    FROM public.partner_performance pp
    JOIN public.partners p ON p.id = pp.partner_id
   WHERE r_active ? 'partner_complaints'
     AND pp.complaints >= (r_active->'partner_complaints'->>'v')::int

  UNION ALL
  SELECT 'coverage_gap', r_active->'coverage_gap'->>'sev', 'lead', ae.lead_id, l.reference,
         1, 'count', 'Allocation exception: ' || ae.reason::text,
         '/admin/leads?lead=' || coalesce(ae.lead_id::text,''), ae.created_at
    FROM public.allocation_exceptions ae
    LEFT JOIN public.leads l ON l.id = ae.lead_id
   WHERE r_active ? 'coverage_gap' AND ae.resolved_at IS NULL
     AND ae.reason IN ('no_eligible_partner','outside_coverage')

  UNION ALL
  SELECT 'allocation_exception', r_active->'allocation_exception'->>'sev', 'lead', ae.lead_id, l.reference,
         1, 'count', 'Allocation exception: ' || ae.reason::text,
         '/admin/leads?lead=' || coalesce(ae.lead_id::text,''), ae.created_at
    FROM public.allocation_exceptions ae
    LEFT JOIN public.leads l ON l.id = ae.lead_id
   WHERE r_active ? 'allocation_exception' AND ae.resolved_at IS NULL
     AND ae.reason NOT IN ('no_eligible_partner','outside_coverage')

  UNION ALL
  SELECT 'high_value_untouched', r_active->'high_value_untouched'->>'sev', 'lead', l.id, l.reference,
         l.estimated_value, 'chf',
         'No activity for ' || round(extract(epoch FROM now() - coalesce(l.last_activity_at, l.created_at))/3600)::text || ' h',
         '/admin/leads?lead=' || l.id::text, coalesce(l.last_activity_at, l.created_at)
    FROM public.leads l
   WHERE r_active ? 'high_value_untouched'
     AND l.status NOT IN ('won','completed','lost','cancelled')
     AND coalesce(l.estimated_value, 0) >= (r_active->'high_value_untouched'->>'v')::numeric
     AND coalesce(l.last_activity_at, l.created_at)
         < now() - make_interval(hours => coalesce((r_active->'high_value_hours'->>'v')::int, 24))

  UNION ALL
  SELECT 'cancellation_spike', r_active->'cancellation_spike'->>'sev', 'partner', p.id, p.reference,
         c.n::numeric, 'count', c.n::text || ' cancellations in 7 days',
         '/admin/partner/' || p.reference, now()
    FROM public.partners p
    JOIN LATERAL (
      SELECT count(*) AS n FROM public.jobs_execution j
       WHERE j.partner_id = p.id AND j.cancelled_at > now() - interval '7 days'
    ) c ON true
   WHERE r_active ? 'cancellation_spike'
     AND c.n >= (r_active->'cancellation_spike'->>'v')::int

  UNION ALL
  SELECT 'cancellation_review', r_active->'cancellation_review'->>'sev', 'job', j.id, j.reference,
         coalesce(j.cancellation_customer_charge, 0), 'chf',
         'Cancellation charge flagged for manual review',
         '/admin/auftraege', j.cancelled_at
    FROM public.jobs_execution j
   WHERE r_active ? 'cancellation_review' AND j.cancellation_manual_review

  UNION ALL
  SELECT 'weak_source', r_active->'weak_source'->>'sev', 'source', s.id, s.key,
         round(s.won::numeric * 100 / s.total, 1), 'percent',
         s.won::text || ' won of ' || s.total::text || ' leads in 90 days',
         '/admin/analytics', now()
    FROM (
      SELECT src.id, src.key,
             count(l.id) AS total,
             count(l.id) FILTER (WHERE l.status IN ('won','scheduled','in_progress','completed')) AS won
        FROM public.lead_sources src
        JOIN public.leads l ON l.source_id = src.id AND l.created_at > now() - interval '90 days'
       GROUP BY src.id, src.key
    ) s
   WHERE r_active ? 'weak_source' AND s.total >= 10
     AND s.won::numeric * 100 / s.total < (r_active->'weak_source'->>'v')::numeric

  UNION ALL
  SELECT 'compliance_expiry', r_active->'compliance_expiry'->>'sev', 'partner', p.id, p.reference,
         (d.expires_on - current_date)::numeric, 'days',
         d.doc_type || ' expires ' || d.expires_on::text,
         '/admin/partner/' || p.reference, now()
    FROM public.partner_documents d
    JOIN public.partners p ON p.id = d.partner_id
   WHERE r_active ? 'compliance_expiry' AND d.expires_on IS NOT NULL
     AND d.status IN ('approved','under_review','uploaded','expired')
     AND d.expires_on <= current_date + make_interval(days => (r_active->'compliance_expiry'->>'v')::int)

  UNION ALL
  SELECT 'approval_pending', r_active->'approval_pending'->>'sev', 'approval', a.id, a.subject_type,
         round(extract(epoch FROM now() - a.created_at)/3600, 1), 'hours',
         'Approval request still pending',
         '/admin/freigaben', a.created_at
    FROM public.approval_requests a
   WHERE r_active ? 'approval_pending' AND a.status = 'pending'
     AND a.created_at < now() - make_interval(hours => (r_active->'approval_pending'->>'v')::int)

  UNION ALL
  SELECT 'failed_notification', r_active->'failed_notification'->>'sev', 'notification', n.id, n.template,
         n.attempts::numeric, 'count',
         coalesce(nullif(n.error,''), 'Delivery failed') || ' → ' || n.recipient,
         '/admin', n.created_at
    FROM public.notification_log n
   WHERE r_active ? 'failed_notification' AND n.status = 'failed'
     AND n.created_at > now() - interval '7 days'

  UNION ALL
  SELECT 'risk_review', r_active->'risk_review'->>'sev', 'lead', l.id, l.reference,
         l.risk_score, 'points',
         'Advisory risk score ' || l.risk_score::text || ' — automatic allocation suppressed until reviewed',
         '/admin/leads?lead=' || l.id::text, l.created_at
    FROM public.leads l
   WHERE r_active ? 'risk_review' AND NOT l.risk_reviewed
     AND l.risk_score >= (r_active->'risk_review'->>'v')::numeric
     AND l.status NOT IN ('lost','cancelled','completed')

  ORDER BY 2, 10 ASC;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.material_approval_threshold()
 RETURNS numeric
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT min(threshold) FROM public.approval_rules WHERE active AND scope = 'material_cost'
$function$
;
CREATE OR REPLACE FUNCTION public.merge_leads(_source uuid, _target uuid, _note text DEFAULT ''::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE dup uuid;
BEGIN
  IF NOT (public.is_staff() OR public.has_role('ops_manager') OR public.has_role('sales')) THEN
    RAISE EXCEPTION 'not authorised' USING ERRCODE = '42501';
  END IF;
  IF _source = _target THEN
    RAISE EXCEPTION 'cannot merge a lead into itself' USING ERRCODE = '22023';
  END IF;
  PERFORM 1 FROM public.leads WHERE id = _source FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'lead not found' USING ERRCODE = 'P0002'; END IF;
  PERFORM 1 FROM public.leads WHERE id = _target FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'lead not found' USING ERRCODE = 'P0002'; END IF;

  SELECT id INTO dup FROM public.lead_loss_reasons WHERE key = 'duplicate' LIMIT 1;

  UPDATE public.lead_activities SET lead_id = _target WHERE lead_id = _source;
  UPDATE public.lead_notes SET lead_id = _target WHERE lead_id = _source;
  UPDATE public.lead_attachments SET lead_id = _target WHERE lead_id = _source;
  UPDATE public.lead_followups SET lead_id = _target WHERE lead_id = _source;

  UPDATE public.leads
     SET status = 'cancelled', lost_reason_id = dup, locked_by = NULL, locked_at = NULL,
         last_activity_at = now()
   WHERE id = _source;

  INSERT INTO public.lead_activities (lead_id, kind, body, meta, actor_id, actor_kind)
  VALUES
    (_target, 'system', coalesce(_note,''), jsonb_build_object('merged_from', _source), auth.uid(), 'staff'),
    (_source, 'system', coalesce(_note,''), jsonb_build_object('merged_into', _target), auth.uid(), 'staff');

  RETURN _target;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.my_partner_quotes()
 RETURNS TABLE(quote_id uuid, opportunity_id uuid, lead_id uuid, partner_cost numeric, currency text, status partner_quote_status, submitted_at timestamp with time zone, created_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select q.id, q.opportunity_id, q.lead_id, q.partner_cost, q.currency, q.status,
         q.submitted_at, q.created_at
  from public.partner_quotes q
  where q.partner_id = public.current_partner_id()
  order by q.created_at desc
$function$
;
CREATE OR REPLACE FUNCTION public.opportunity_stats_trigger()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE cat uuid; cant text;
BEGIN
  SELECT l.category_id, coalesce(l.canton,'') INTO cat, cant FROM public.leads l WHERE l.id = NEW.lead_id;
  IF TG_OP = 'INSERT' THEN
    PERFORM public.bump_allocation_stat(NEW.partner_id, cat, cant, 'offered');
    IF NEW.allocation_kind = 'exploration' THEN
      PERFORM public.bump_allocation_stat(NEW.partner_id, cat, cant, 'explored');
    END IF;
  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'accepted' AND coalesce(OLD.status,'') <> 'accepted' THEN
    PERFORM public.bump_allocation_stat(NEW.partner_id, cat, cant, 'accepted');
  END IF;
  RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.partner_documents_protect_review()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF public.is_staff() OR public.is_service_role() THEN
    RETURN NEW;
  END IF;
  NEW.status := OLD.status;
  NEW.reviewed_by := OLD.reviewed_by;
  NEW.reviewed_at := OLD.reviewed_at;
  NEW.rejection_reason := OLD.rejection_reason;
  RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.partner_fairness(_lead_id uuid)
 RETURNS TABLE(partner_id uuid, completed integer, probation boolean, provisional boolean, cold_start boolean, window_share numeric, saturated boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  l public.leads;
  prob numeric := public.fairness_value('probation_jobs', 5);
  cold numeric := public.fairness_value('cold_start_jobs', 5);
  cap  numeric := public.fairness_value('saturation_pct', 40);
  win  int     := public.fairness_value('saturation_window_days', 30)::int;
  total_window int;
BEGIN
  IF NOT public.is_dispatcher() AND NOT public.is_service_role() THEN
    RAISE EXCEPTION 'not authorised' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO l FROM public.leads WHERE id = _lead_id;

  SELECT count(*) INTO total_window
    FROM public.partner_opportunities o
    JOIN public.leads x ON x.id = o.lead_id
   WHERE o.sent_at > now() - make_interval(days => win)
     AND (l.category_id IS NULL OR x.category_id = l.category_id)
     AND coalesce(x.canton,'') = coalesce(l.canton,'');

  RETURN QUERY
  SELECT p.id,
         coalesce(pp.jobs_completed, 0),
         coalesce(pp.jobs_completed, 0) < prob,
         coalesce(pp.jobs_completed, 0) < cold,
         coalesce(pp.jobs_completed, 0) < cold,
         CASE WHEN coalesce(total_window,0) = 0 THEN 0
              ELSE round(w.n::numeric * 100 / total_window, 1) END,
         coalesce(total_window,0) >= 5
           AND CASE WHEN coalesce(total_window,0) = 0 THEN 0
                    ELSE w.n::numeric * 100 / total_window END > cap
    FROM public.partners p
    LEFT JOIN public.partner_performance pp ON pp.partner_id = p.id
    JOIN LATERAL (
      SELECT count(*) AS n
        FROM public.partner_opportunities o
        JOIN public.leads x ON x.id = o.lead_id
       WHERE o.partner_id = p.id
         AND o.sent_at > now() - make_interval(days => win)
         AND (l.category_id IS NULL OR x.category_id = l.category_id)
         AND coalesce(x.canton,'') = coalesce(l.canton,'')
    ) w ON true;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.partner_opportunity_feed()
 RETURNS TABLE(opportunity_id uuid, lead_reference text, status text, sent_at timestamp with time zone, respond_by timestamp with time zone, category_id uuid, city text, canton text, postcode_prefix text, date_window text, approx_value numeric, description text, customer_name text, customer_phone text, customer_email text, service_address text, match_score numeric, match_reasons jsonb)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT
    o.id,
    l.reference,
    o.status,
    o.sent_at,
    o.respond_by,
    l.category_id,
    l.city,
    l.canton,
    left(l.postcode, 2),
    CASE WHEN l.preferred_date IS NULL THEN 'flexible'
         ELSE to_char(l.preferred_date, 'YYYY-MM') || ' (±3d)' END,
    round(coalesce(l.estimated_value, 0) / 100.0) * 100,
    CASE WHEN o.status = 'accepted' THEN l.description ELSE left(l.description, 140) END,
    CASE WHEN o.status = 'accepted' THEN l.customer_name ELSE NULL END,
    CASE WHEN o.status = 'accepted' THEN l.customer_phone ELSE NULL END,
    CASE WHEN o.status = 'accepted' THEN l.customer_email ELSE NULL END,
    CASE WHEN o.status = 'accepted' THEN l.service_address ELSE NULL END,
    o.match_score,
    o.match_reasons
  FROM public.partner_opportunities o
  JOIN public.leads l ON l.id = o.lead_id
  WHERE o.partner_id = public.current_partner_id();
$function$
;
CREATE OR REPLACE FUNCTION public.partner_quote_conflict_trigger()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE w numeric;
BEGIN
  SELECT weight INTO w FROM public.risk_rules WHERE signal = 'partner_quotes_own_lead' AND active;
  IF w IS NOT NULL AND EXISTS (
     SELECT 1 FROM public.leads l WHERE l.id = NEW.lead_id AND l.referred_by_partner_id = NEW.partner_id) THEN
    INSERT INTO public.lead_risk_signals (lead_id, signal, weight, detail)
    VALUES (NEW.lead_id, 'partner_quotes_own_lead', w,
            'Partner quoted on a lead it referred — disclosure required')
    ON CONFLICT (lead_id, signal) DO NOTHING;
    UPDATE public.leads SET risk_score = (
      SELECT coalesce(sum(weight),0) FROM public.lead_risk_signals WHERE lead_id = NEW.lead_id)
     WHERE id = NEW.lead_id;
  END IF;
  RETURN NULL;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.partner_quotes_without_cost(_lead_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(id uuid, opportunity_id uuid, partner_id uuid, lead_id uuid, currency text, availability_date date, completion_days integer, conditions text, status partner_quote_status, submitted_at timestamp with time zone, created_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF NOT (public.is_staff() OR public.has_role('ops_manager') OR public.has_role('sales')
          OR public.has_role('partner_manager') OR public.has_role('finance')) THEN
    RAISE EXCEPTION 'not authorised' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT q.id, q.opportunity_id, q.partner_id, q.lead_id, q.currency, q.availability_date,
         q.completion_days, q.conditions, q.status, q.submitted_at, q.created_at
  FROM public.partner_quotes q
  WHERE _lead_id IS NULL OR q.lead_id = _lead_id;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.phone_key(_phone text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT CASE
    WHEN length(regexp_replace(coalesce(_phone,''), '\D', '', 'g')) < 7 THEN ''
    ELSE right(regexp_replace(coalesce(_phone,''), '\D', '', 'g'), 9)
  END;
$function$
;
CREATE OR REPLACE FUNCTION public.pricing_configurations_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.status = 'published' THEN
    IF NEW.status NOT IN ('published','archived') THEN
      RAISE EXCEPTION 'A published pricing configuration cannot return to draft';
    END IF;
    NEW.market := OLD.market;
    NEW.version := OLD.version;
    NEW.effective_from := OLD.effective_from;
    NEW.published_at := OLD.published_at;
    NEW.published_by := OLD.published_by;
  END IF;
  RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.pricing_rules_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  cfg uuid;
  st public.pricing_config_status;
BEGIN
  cfg := COALESCE(NEW.configuration_id, OLD.configuration_id);
  SELECT status INTO st FROM public.pricing_configurations WHERE id = cfg;
  IF st IS DISTINCT FROM 'draft' THEN
    RAISE EXCEPTION 'Pricing rules can only be changed while the configuration is a draft';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$function$
;
CREATE OR REPLACE FUNCTION public.process_inquiry_sla()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE inserted integer := 0;
BEGIN
  IF NOT (public.is_dispatcher() OR public.is_service_role()) THEN
    RAISE EXCEPTION 'not authorised' USING ERRCODE = '42501';
  END IF;

  WITH breaches AS (
    SELECT l.id, l.reference, l.language, q.key AS queue_key, q.default_owner_id
      FROM public.leads l JOIN public.lead_queues q ON q.id = l.queue_id
     WHERE l.first_contact_at IS NULL
       AND l.status::text NOT IN ('lost','cancelled','completed','spam_review')
       AND l.created_at < now() - make_interval(mins => q.sla_first_contact_minutes)
  ), fresh AS (
    SELECT b.* FROM breaches b
     WHERE NOT EXISTS (
       SELECT 1 FROM public.notification_log n
        WHERE n.lead_id = b.id AND n.template = 'inquiry_sla_breach'
          AND n.created_at > now() - interval '12 hours')
  ), ins AS (
    INSERT INTO public.notification_log (channel, template, recipient, subject_type, subject_id,
                                         lead_id, status, language, subject, details)
    SELECT 'email', 'inquiry_sla_breach', '', 'lead', f.id, f.id, 'pending', f.language,
           'SLA überschritten ' || f.reference,
           jsonb_build_object('queue', f.queue_key, 'owner_id', f.default_owner_id)
      FROM fresh f
    RETURNING 1
  )
  SELECT count(*) INTO inserted FROM ins;

  RETURN inserted;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.profiles_protect_privileged_columns()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF public.is_service_role() OR public.is_zw_admin() THEN
    RETURN NEW;
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'role may only be changed by an administrator'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.organization_id IS DISTINCT FROM OLD.organization_id THEN
    RAISE EXCEPTION 'organization_id may only be changed by an administrator'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'profile id is immutable' USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.public_legal_entity(_country text DEFAULT 'CH'::text)
 RETURNS TABLE(id uuid, country text, legal_name text, register_number text, vat_number text, address_line text, postal_code text, city text, canton text, email text, phone text, currency text, status text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select e.id, e.country, e.legal_name, e.register_number, e.vat_number,
         e.address_line, e.postal_code, e.city, e.canton, e.email, e.phone,
         e.currency, e.status
  from public.legal_entities e
  where e.country = coalesce(_country, 'CH')
    and e.status in ('active', 'published')
  limit 1
$function$
;
CREATE OR REPLACE FUNCTION public.public_markets()
 RETURNS TABLE(country text, active boolean, currency text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select m.country, m.active, m.currency from public.markets m order by m.country
$function$
;
CREATE OR REPLACE FUNCTION public.public_planner_pricing(_market text DEFAULT 'CH'::text)
 RETURNS TABLE(version integer, effective_from date, service text, unit_type text, price numeric, currency text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  cfg uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.markets m WHERE m.country = _market AND m.active) THEN
    RETURN;
  END IF;
  cfg := public.active_pricing_configuration(_market);
  IF cfg IS NULL THEN RETURN; END IF;

  RETURN QUERY
  SELECT c.version, c.effective_from, r.service, r.unit_type, r.price, r.currency
  FROM public.pricing_configurations c
  JOIN public.pricing_rules r ON r.configuration_id = c.id
  WHERE c.id = cfg
    AND r.property_type = 'any'
    AND r.service IN ('move','packing','endcleaning','disposal','engine')
  ORDER BY r.service, r.sort_order;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.publish_legal_document(_id uuid, _effective_date date DEFAULT CURRENT_DATE)
 RETURNS legal_documents
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  doc public.legal_documents;
  ready boolean;
begin
  if not public.is_zw_admin() then
    raise exception 'not authorised';
  end if;

  select * into doc from public.legal_documents where id = _id;
  if doc is null then
    raise exception 'document not found';
  end if;
  if doc.status <> 'draft' then
    raise exception 'only draft documents can be published';
  end if;

  select m.legal_ready into ready from public.markets m where m.country = doc.country;
  if coalesce(ready, false) = false then
    raise exception 'market % is not legal_ready — company registration data is still pending', doc.country;
  end if;

  update public.legal_documents
     set status = 'superseded', updated_at = now()
   where doc_type = doc.doc_type
     and country = doc.country
     and language = doc.language
     and status = 'published';

  update public.legal_documents
     set status = 'published', effective_date = coalesce(_effective_date, current_date), updated_at = now()
   where id = _id
  returning * into doc;

  return doc;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.publish_pricing_configuration(_id uuid)
 RETURNS pricing_configurations
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  row public.pricing_configurations;
BEGIN
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'Only staff may publish pricing';
  END IF;
  UPDATE public.pricing_configurations
     SET status = 'published', published_at = now(), published_by = auth.uid()
   WHERE id = _id AND status = 'draft'
   RETURNING * INTO row;
  IF row.id IS NULL THEN
    RAISE EXCEPTION 'Only a draft configuration can be published';
  END IF;
  UPDATE public.pricing_configurations
     SET status = 'archived'
   WHERE market = row.market AND status = 'published' AND id <> row.id;
  RETURN row;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.published_pricing(_market text DEFAULT 'CH'::text)
 RETURNS TABLE(configuration_id uuid, version integer, effective_from date, service text, property_type text, band_id text, room_min numeric, room_max numeric, unit_type text, price numeric, currency text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  cfg uuid;
BEGIN
  IF auth.uid() IS NULL AND NOT public.is_service_role() THEN
    RAISE EXCEPTION 'Sign in required to read pricing';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.markets m WHERE m.country = _market AND m.active) THEN
    RETURN;
  END IF;

  cfg := public.active_pricing_configuration(_market);
  IF cfg IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT c.id, c.version, c.effective_from,
         r.service, r.property_type, r.band_id, r.room_min, r.room_max,
         r.unit_type, r.price, r.currency
  FROM public.pricing_configurations c
  JOIN public.pricing_rules r ON r.configuration_id = c.id
  WHERE c.id = cfg
  ORDER BY r.service, r.sort_order;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.qr_reference_check_digit(_digits text)
 RETURNS integer
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  tbl int[][] := ARRAY[
    ARRAY[0,9,4,6,8,2,7,1,3,5],
    ARRAY[9,4,6,8,2,7,1,3,5,0],
    ARRAY[4,6,8,2,7,1,3,5,0,9],
    ARRAY[6,8,2,7,1,3,5,0,9,4],
    ARRAY[8,2,7,1,3,5,0,9,4,6],
    ARRAY[2,7,1,3,5,0,9,4,6,8],
    ARRAY[7,1,3,5,0,9,4,6,8,2],
    ARRAY[1,3,5,0,9,4,6,8,2,7],
    ARRAY[3,5,0,9,4,6,8,2,7,1],
    ARRAY[5,0,9,4,6,8,2,7,1,3]];
  carry int := 0;
  i int;
BEGIN
  FOR i IN 1..length(_digits) LOOP
    carry := tbl[carry + 1][substr(_digits, i, 1)::int + 1];
  END LOOP;
  RETURN (10 - carry) % 10;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.quote_costs_for_lead(_lead_id uuid)
 RETURNS TABLE(quote_id uuid, opportunity_id uuid, partner_id uuid, partner_cost numeric, currency text, status partner_quote_status, availability_date date, completion_days integer, conditions text, notes text, submitted_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select q.id, q.opportunity_id, q.partner_id, q.partner_cost, q.currency, q.status,
         q.availability_date, q.completion_days, q.conditions, q.notes, q.submitted_at
  from public.partner_quotes q
  where q.lead_id = _lead_id
    and public.is_staff()
    and public.can_see_costs()
$function$
;
CREATE OR REPLACE FUNCTION public.recalc_partner_performance(_partner_id uuid)
 RETURNS numeric
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  sent int; acc int; dec int; tmo int; avg_min numeric; qsub int; s numeric;
BEGIN
  SELECT count(*) FILTER (WHERE status <> 'draft'),
         count(*) FILTER (WHERE status = 'accepted'),
         count(*) FILTER (WHERE status = 'declined'),
         count(*) FILTER (WHERE status = 'timed_out'),
         coalesce(avg(EXTRACT(EPOCH FROM (responded_at - sent_at)) / 60.0) FILTER (WHERE responded_at IS NOT NULL AND sent_at IS NOT NULL), 0)
    INTO sent, acc, dec, tmo, avg_min
    FROM public.partner_opportunities WHERE partner_id = _partner_id;

  SELECT count(*) INTO qsub FROM public.partner_quotes
   WHERE partner_id = _partner_id AND status <> 'draft';

  s := 100
       * (CASE WHEN sent = 0 THEN 0.5 ELSE acc::numeric / sent END)
       - (tmo * 5)
       - (dec * 1);
  s := greatest(0, least(100, s));

  INSERT INTO public.partner_performance AS pp (
    partner_id, opportunities_sent, opportunities_accepted, opportunities_declined,
    opportunities_timed_out, avg_response_minutes, quotes_submitted, score, computed_at)
  VALUES (_partner_id, sent, acc, dec, tmo, round(avg_min, 1), qsub, round(s, 1), now())
  ON CONFLICT (partner_id) DO UPDATE SET
    opportunities_sent = EXCLUDED.opportunities_sent,
    opportunities_accepted = EXCLUDED.opportunities_accepted,
    opportunities_declined = EXCLUDED.opportunities_declined,
    opportunities_timed_out = EXCLUDED.opportunities_timed_out,
    avg_response_minutes = EXCLUDED.avg_response_minutes,
    quotes_submitted = EXCLUDED.quotes_submitted,
    score = EXCLUDED.score,
    computed_at = now(),
    updated_at = now();

  RETURN round(s, 1);
END;
$function$
;
CREATE OR REPLACE FUNCTION public.recompute_lead_economics(_lead_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF NOT (public.is_staff() OR public.is_dispatcher()) THEN
    RAISE EXCEPTION 'not permitted' USING ERRCODE = '42501';
  END IF;
  RETURN public.compute_lead_economics(_lead_id);
END;
$function$
;
CREATE OR REPLACE FUNCTION public.record_invoice_payment(_invoice uuid, _amount numeric, _paid_on date DEFAULT CURRENT_DATE, _method text DEFAULT ''::text, _reference text DEFAULT ''::text, _note text DEFAULT ''::text)
 RETURNS invoices
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  inv public.invoices;
BEGIN
  IF NOT (public.is_staff() OR public.has_role('finance')) THEN
    RAISE EXCEPTION 'not authorised' USING ERRCODE = '42501';
  END IF;
  IF coalesce(_amount, 0) < 0 THEN
    RAISE EXCEPTION 'amount must not be negative' USING ERRCODE = '22023';
  END IF;

  UPDATE public.invoices
     SET amount_paid = round(coalesce(_amount, 0), 2),
         paid_on = _paid_on,
         payment_method = coalesce(_method, ''),
         payment_reference = coalesce(_reference, ''),
         payment_note = coalesce(_note, ''),
         paid_at = CASE WHEN round(coalesce(_amount, 0), 2) >= total THEN
                          coalesce(_paid_on::timestamptz, now())
                        ELSE NULL END,
         status = CASE WHEN round(coalesce(_amount, 0), 2) >= total THEN 'paid'::invoice_status
                       ELSE status END,
         updated_at = now()
   WHERE id = _invoice
  RETURNING * INTO inv;

  IF inv.id IS NULL THEN
    RAISE EXCEPTION 'invoice not found' USING ERRCODE = 'P0002';
  END IF;
  RETURN inv;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.record_job_confirmation(_job_id uuid, _kind job_confirmation_kind, _name text DEFAULT ''::text, _signature_path text DEFAULT ''::text, _code text DEFAULT ''::text)
 RETURNS jobs_execution
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE j public.jobs_execution; is_partner boolean;
BEGIN
  SELECT * INTO j FROM public.jobs_execution WHERE id = _job_id FOR UPDATE;
  IF j.id IS NULL THEN RAISE EXCEPTION 'job not found' USING ERRCODE = 'P0002'; END IF;
  is_partner := j.partner_id IS NOT NULL AND j.partner_id = public.current_partner_id();
  IF NOT (public.is_dispatcher() OR is_partner) THEN
    RAISE EXCEPTION 'not authorised' USING ERRCODE = '42501';
  END IF;
  IF _kind = 'signature' AND coalesce(btrim(_name),'') = '' THEN
    RAISE EXCEPTION 'signer name is required' USING ERRCODE = '22023';
  END IF;

  UPDATE public.jobs_execution
     SET customer_confirmation = _kind,
         signed_by_name = coalesce(btrim(_name),''),
         signature_path = coalesce(_signature_path,''),
         confirmation_code = coalesce(btrim(_code),''),
         signed_at = now(), updated_at = now()
   WHERE id = _job_id RETURNING * INTO j;

  INSERT INTO public.job_events_exec (job_id, kind, body, meta, actor_id, actor_kind)
  VALUES (_job_id, 'signature', coalesce(btrim(_name),''),
          jsonb_build_object('confirmation', _kind), auth.uid(),
          (CASE WHEN is_partner THEN 'partner' ELSE 'staff' END)::public.lead_actor_kind);
  RETURN j;
END; $function$
;
CREATE OR REPLACE FUNCTION public.record_job_material(_job_id uuid, _description text, _quantity numeric, _unit text, _supplier_cost numeric DEFAULT NULL::numeric, _customer_price numeric DEFAULT NULL::numeric, _photo_path text DEFAULT ''::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE j public.jobs_execution; is_partner boolean; thr numeric; co uuid; mat uuid; st public.job_material_status;
BEGIN
  SELECT * INTO j FROM public.jobs_execution WHERE id = _job_id;
  IF j.id IS NULL THEN RAISE EXCEPTION 'job not found' USING ERRCODE = 'P0002'; END IF;
  is_partner := j.partner_id IS NOT NULL AND j.partner_id = public.current_partner_id();
  IF NOT (public.is_dispatcher() OR is_partner) THEN
    RAISE EXCEPTION 'not authorised' USING ERRCODE = '42501';
  END IF;
  IF coalesce(btrim(_description),'') = '' THEN
    RAISE EXCEPTION 'description is required' USING ERRCODE = '22023';
  END IF;

  thr := public.material_approval_threshold();
  IF _customer_price IS NOT NULL AND thr IS NOT NULL AND _customer_price > thr THEN
    INSERT INTO public.change_orders (job_id, lead_id, description, reason, estimated_materials,
                                      partner_cost, customer_price, status, requested_by, requested_kind)
    VALUES (_job_id, j.lead_id, btrim(_description), 'material', _customer_price,
            _supplier_cost, _customer_price, 'awaiting_customer', auth.uid(),
            (CASE WHEN is_partner THEN 'partner' ELSE 'staff' END)::public.lead_actor_kind)
    RETURNING id INTO co;
    st := 'approval_required';
  ELSE
    st := 'approved';
  END IF;

  INSERT INTO public.job_materials (job_id, description, quantity, unit, supplier_cost,
                                    customer_price, photo_path, change_order_id, status, created_by)
  VALUES (_job_id, btrim(_description), coalesce(_quantity,1), coalesce(nullif(btrim(_unit),''),'Stk'),
          _supplier_cost, _customer_price, coalesce(_photo_path,''), co, st, auth.uid())
  RETURNING id INTO mat;

  INSERT INTO public.job_events_exec (job_id, kind, body, meta, actor_id, actor_kind)
  VALUES (_job_id, 'material', btrim(_description),
          jsonb_build_object('material', mat, 'status', st, 'change_order', co),
          auth.uid(), (CASE WHEN is_partner THEN 'partner' ELSE 'staff' END)::public.lead_actor_kind);

  RETURN jsonb_build_object('material_id', mat, 'status', st, 'change_order_id', co, 'threshold', thr);
END; $function$
;
CREATE OR REPLACE FUNCTION public.record_partner_response(_opportunity_id uuid, _response text, _reason text DEFAULT ''::text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE opp public.partner_opportunities; caller_partner uuid; other record; l public.leads; lead_ref uuid;
BEGIN
  SELECT * INTO opp FROM public.partner_opportunities WHERE id = _opportunity_id;
  IF opp.id IS NULL THEN RAISE EXCEPTION 'opportunity not found' USING ERRCODE = 'P0002'; END IF;
  caller_partner := public.current_partner_id();
  IF NOT (public.is_staff() OR public.has_role('ops_manager') OR opp.partner_id = caller_partner) THEN
    RAISE EXCEPTION 'not authorised' USING ERRCODE = '42501';
  END IF;
  IF _response NOT IN ('viewed','accepted','declined','timed_out','withdrawn') THEN
    RAISE EXCEPTION 'invalid response' USING ERRCODE = '22023';
  END IF;
  IF _response = 'declined' AND coalesce(btrim(_reason),'') = '' THEN
    RAISE EXCEPTION 'a decline reason is required' USING ERRCODE = '22023';
  END IF;

  -- Lock ordering: the LEAD is always locked before any opportunity row.
  -- Competing acceptances therefore queue on the lead and the loser fails with
  -- a clear already_allocated instead of deadlocking against the winner's
  -- withdrawal of its row.
  lead_ref := opp.lead_id;
  IF lead_ref IS NOT NULL THEN
    SELECT * INTO l FROM public.leads WHERE id = lead_ref FOR UPDATE;
  END IF;

  SELECT * INTO opp FROM public.partner_opportunities WHERE id = _opportunity_id FOR UPDATE;

  IF _response = 'accepted' AND lead_ref IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.partner_opportunities o
       WHERE o.lead_id = lead_ref AND o.id <> opp.id AND o.status = 'accepted'
    ) OR (l.assigned_partner_id IS NOT NULL AND l.assigned_partner_id <> opp.partner_id) THEN
      RAISE EXCEPTION 'already_allocated' USING ERRCODE = '55006';
    END IF;
    IF opp.status NOT IN ('sent','viewed') THEN
      RAISE EXCEPTION 'already_allocated' USING ERRCODE = '55006';
    END IF;
  END IF;

  UPDATE public.partner_opportunities
     SET status = _response,
         decline_reason = CASE WHEN _response = 'declined' THEN btrim(_reason) ELSE decline_reason END,
         responded_at = CASE WHEN _response = 'viewed' THEN responded_at ELSE now() END,
         updated_at = now()
   WHERE id = _opportunity_id;

  IF lead_ref IS NOT NULL THEN
    INSERT INTO public.lead_activities (lead_id, kind, body, meta, actor_id, actor_kind)
    VALUES (lead_ref, 'system'::public.lead_activity_kind, coalesce(_reason,''),
            jsonb_build_object('opportunity', _opportunity_id, 'partner', opp.partner_id, 'response', _response),
            auth.uid(),
            (CASE WHEN opp.partner_id = caller_partner THEN 'partner' ELSE 'staff' END)::public.lead_actor_kind);
  END IF;

  IF _response = 'accepted' AND lead_ref IS NOT NULL THEN
    UPDATE public.leads
       SET fulfilment_type = 'partner', assigned_partner_id = opp.partner_id, assigned_team_id = NULL,
           last_activity_at = now()
     WHERE id = lead_ref;

    FOR other IN
      SELECT id, partner_id FROM public.partner_opportunities
       WHERE lead_id = lead_ref AND id <> opp.id
         AND status IN ('sent','viewed') AND NOT is_backup
       ORDER BY id
    LOOP
      UPDATE public.partner_opportunities
         SET status = 'withdrawn', responded_at = now(), updated_at = now()
       WHERE id = other.id;
      INSERT INTO public.lead_activities (lead_id, kind, body, meta, actor_id, actor_kind)
      VALUES (lead_ref, 'system', '',
              jsonb_build_object('opportunity', other.id, 'partner', other.partner_id, 'action', 'withdrawn'),
              auth.uid(), 'system');
      PERFORM public.recalc_partner_performance(other.partner_id);
    END LOOP;

    INSERT INTO public.lead_activities (lead_id, kind, body, meta, actor_id, actor_kind)
    VALUES (lead_ref, 'assignment', '',
            jsonb_build_object('opportunity', _opportunity_id, 'partner', opp.partner_id, 'action', 'partner_accepted'),
            auth.uid(), 'system');
    PERFORM public.recalc_partner_performance(opp.partner_id);
  END IF;

  RETURN _response;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.request_approval(_scope approval_scope, _value numeric, _subject_type text, _subject_id uuid, _lead_id uuid DEFAULT NULL::uuid, _payload jsonb DEFAULT '{}'::jsonb, _note text DEFAULT ''::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE need text; rule uuid; req uuid;
BEGIN
  IF NOT public.is_dispatcher() THEN
    RAISE EXCEPTION 'not authorised' USING ERRCODE = '42501';
  END IF;
  need := public.approval_role_for(_scope, _value);
  SELECT id INTO rule FROM public.approval_rules
   WHERE active AND scope = _scope AND required_role = need ORDER BY threshold LIMIT 1;

  INSERT INTO public.approval_requests (subject_type, subject_id, lead_id, rule_id, requested_by, requested_value, payload, note)
  VALUES (_subject_type, _subject_id, _lead_id, rule, auth.uid(), _value, coalesce(_payload,'{}'::jsonb), coalesce(_note,''))
  RETURNING id INTO req;

  IF _lead_id IS NOT NULL THEN
    INSERT INTO public.lead_activities (lead_id, kind, body, meta, actor_id, actor_kind)
    VALUES (_lead_id, 'system', coalesce(_note,''),
            jsonb_build_object('approval_request', req, 'scope', _scope, 'value', _value, 'required_role', need),
            auth.uid(), 'staff');
  END IF;
  RETURN req;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.resolve_allocation_exception(_id uuid, _resolution text DEFAULT ''::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF NOT public.is_dispatcher() THEN
    RAISE EXCEPTION 'not authorised' USING ERRCODE = '42501';
  END IF;
  UPDATE public.allocation_exceptions
     SET resolved_at = now(), resolution = coalesce(nullif(btrim(_resolution),''), resolution)
   WHERE id = _id;
  RETURN _id;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.resolve_lead_duplicate(_id uuid, _status text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  IF _status NOT IN ('pending','linked','dismissed','merged') THEN
    RAISE EXCEPTION 'invalid status' USING ERRCODE = '22023';
  END IF;
  UPDATE public.lead_duplicates
     SET status = _status, resolved_by = auth.uid(), resolved_at = now()
   WHERE id = _id;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.resolve_rate(_catalogue_id uuid, _canton text DEFAULT ''::text, _city text DEFAULT ''::text, _partner_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(rate_id uuid, catalogue_id uuid, scope text, scope_ref text, sell_price numeric, cost_price numeric, min_margin_pct numeric, currency text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF NOT public.is_dispatcher() THEN
    RAISE EXCEPTION 'not authorised' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT r.id, r.catalogue_id, r.scope::text, r.scope_ref, r.sell_price,
         CASE WHEN public.can_see_costs() THEN r.cost_price ELSE NULL END,
         r.min_margin_pct, r.currency
  FROM public.service_rates r
  WHERE r.catalogue_id = _catalogue_id
    AND r.valid_from <= current_date
    AND (r.valid_to IS NULL OR r.valid_to >= current_date)
    AND (
      (r.scope = 'partner' AND _partner_id IS NOT NULL AND r.scope_ref = _partner_id::text)
      OR (r.scope = 'city' AND _city <> '' AND lower(r.scope_ref) = lower(_city))
      OR (r.scope = 'canton' AND _canton <> '' AND lower(r.scope_ref) = lower(_canton))
      OR (r.scope = 'default')
    )
  ORDER BY CASE r.scope WHEN 'partner' THEN 1 WHEN 'city' THEN 2 WHEN 'canton' THEN 3 ELSE 4 END,
           r.valid_from DESC
  LIMIT 1;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.resolve_site_service(_site_id uuid, _catalogue_id uuid)
 RETURNS TABLE(level text, price numeric, price_level text, sla_id uuid, sla_level text, frequency service_frequency, frequency_level text, preferred_fulfilment fulfilment_pref, fulfilment_level text, preferred_partner_id uuid, preferred_team_id uuid, currency text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare ss public.site_services; acc public.account_services; s public.account_sites; rate record;
begin
  if not (public.is_dispatcher() or public.is_service_role()) then
    if not exists (select 1 from public.account_sites x where x.id = _site_id and public.account_visible(x.account_id)) then
      raise exception 'not authorised' using errcode = '42501';
    end if;
  end if;

  select * into s from public.account_sites where id = _site_id;
  if s.id is null then raise exception 'site not found' using errcode = 'P0002'; end if;

  select * into ss from public.site_services where site_id = _site_id and catalogue_id = _catalogue_id and active;
  select * into acc from public.account_services where account_id = s.account_id and catalogue_id = _catalogue_id and active;

  select r.sell_price, r.currency into rate
  from public.service_rates r
  where r.catalogue_id = _catalogue_id and r.scope = 'default' and r.country = 'CH'
    and r.valid_from <= current_date and (r.valid_to is null or r.valid_to >= current_date)
  order by r.valid_from desc limit 1;

  level := case when ss.id is not null then 'site' when acc.id is not null then 'account' else 'catalogue' end;
  price := coalesce(ss.agreed_price, acc.agreed_price, rate.sell_price);
  price_level := case when ss.agreed_price is not null then 'site'
                      when acc.agreed_price is not null then 'account'
                      when rate.sell_price is not null then 'catalogue_default' else 'unknown' end;
  sla_id := coalesce(ss.sla_id, acc.sla_id);
  sla_level := case when ss.sla_id is not null then 'site' when acc.sla_id is not null then 'account' else 'none' end;
  frequency := coalesce(ss.frequency, acc.frequency, 'one_off');
  frequency_level := case when ss.id is not null then 'site' when acc.frequency is not null then 'account' else 'default' end;
  preferred_fulfilment := coalesce(ss.preferred_fulfilment, acc.preferred_fulfilment, 'either');
  fulfilment_level := case when ss.id is not null then 'site' when acc.preferred_fulfilment is not null then 'account' else 'default' end;
  preferred_partner_id := ss.preferred_partner_id;
  preferred_team_id := ss.preferred_team_id;
  currency := coalesce(rate.currency, 'CHF');
  return next;
end $function$
;
CREATE OR REPLACE FUNCTION public.respond_change_order_token(_token text, _accept boolean, _name text DEFAULT ''::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE c public.change_orders;
BEGIN
  SELECT * INTO c FROM public.change_orders
   WHERE public_token = _token AND _token <> '';
  IF c.id IS NULL THEN RAISE EXCEPTION 'not found' USING ERRCODE = 'P0002'; END IF;
  IF c.token_expires_at IS NOT NULL AND c.token_expires_at <= now() THEN
    RAISE EXCEPTION 'link expired' USING ERRCODE = '22023';
  END IF;
  IF c.status <> 'awaiting_customer' THEN
    RAISE EXCEPTION 'already decided' USING ERRCODE = '22023';
  END IF;
  PERFORM public.apply_change_order_decision(c.id, _accept, 'link', _name);
  RETURN jsonb_build_object('status', CASE WHEN _accept THEN 'approved' ELSE 'rejected' END,
                            'reference', c.reference);
END; $function$
;
CREATE OR REPLACE FUNCTION public.review_partner_document(_document_id uuid, _status partner_document_status, _reason text DEFAULT ''::text, _expires_on date DEFAULT NULL::date)
 RETURNS partner_documents
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  row public.partner_documents;
BEGIN
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'not authorised' USING ERRCODE = '42501';
  END IF;
  IF _status = 'rejected' AND coalesce(btrim(_reason), '') = '' THEN
    RAISE EXCEPTION 'a rejection reason is required' USING ERRCODE = '22023';
  END IF;
  UPDATE public.partner_documents
     SET status = _status,
         rejection_reason = CASE WHEN _status = 'rejected' THEN btrim(_reason) ELSE NULL END,
         expires_on = coalesce(_expires_on, expires_on),
         reviewed_by = auth.uid(),
         reviewed_at = now(),
         updated_at = now()
   WHERE id = _document_id
   RETURNING * INTO row;
  IF row.id IS NULL THEN
    RAISE EXCEPTION 'document not found' USING ERRCODE = 'P0002';
  END IF;
  RETURN row;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.role_rank(_role text)
 RETURNS integer
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT CASE _role
    WHEN 'sales' THEN 1
    WHEN 'partner_manager' THEN 1
    WHEN 'finance' THEN 2
    WHEN 'ops_manager' THEN 2
    WHEN 'zuegelwerk_admin' THEN 3
    ELSE 0 END
$function$
;
CREATE OR REPLACE FUNCTION public.rollback_pricing_configuration(_id uuid)
 RETURNS pricing_configurations
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  src public.pricing_configurations;
  row public.pricing_configurations;
  next_version integer;
BEGIN
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'Only staff may roll back pricing';
  END IF;

  SELECT * INTO src FROM public.pricing_configurations WHERE id = _id;
  IF src.id IS NULL THEN
    RAISE EXCEPTION 'Unknown pricing configuration';
  END IF;
  IF src.status <> 'archived' THEN
    RAISE EXCEPTION 'Only a previously published, archived version can be restored';
  END IF;

  SELECT COALESCE(MAX(version), 0) + 1 INTO next_version
  FROM public.pricing_configurations WHERE market = src.market;

  INSERT INTO public.pricing_configurations (market, name, version, status, effective_from, notes)
  VALUES (src.market, src.name, next_version, 'draft', current_date,
          'Rollback of version ' || src.version)
  RETURNING * INTO row;

  INSERT INTO public.pricing_rules (
    configuration_id, service, property_type, band_id, room_min, room_max,
    price, currency, unit_type, gap_after_intentional, requires_commercial_review, sort_order)
  SELECT row.id, service, property_type, band_id, room_min, room_max,
         price, currency, unit_type, gap_after_intentional, requires_commercial_review, sort_order
  FROM public.pricing_rules WHERE configuration_id = src.id;

  UPDATE public.pricing_configurations
     SET status = 'published', published_at = now(), published_by = auth.uid()
   WHERE id = row.id
   RETURNING * INTO row;

  UPDATE public.pricing_configurations
     SET status = 'archived'
   WHERE market = src.market AND status = 'published' AND id <> row.id;

  RETURN row;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.route_lead_queue(_source_key text, _customer_type lead_customer_type, _urgency text, _flag text)
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT r.queue_id FROM public.lead_routing_rules r
   JOIN public.lead_queues q ON q.id = r.queue_id AND q.active
   WHERE r.active
     AND (r.match_source_key = '' OR r.match_source_key = coalesce(_source_key,''))
     AND (r.match_customer_type IS NULL OR r.match_customer_type = _customer_type)
     AND (r.match_urgency = '' OR r.match_urgency = coalesce(_urgency,''))
     AND (r.match_flag = '' OR r.match_flag = coalesce(_flag,''))
   ORDER BY r.priority ASC LIMIT 1
$function$
;
CREATE OR REPLACE FUNCTION public.run_sla_timeouts_job(_trigger text DEFAULT 'scheduler'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  res jsonb;
  t0 timestamptz := clock_timestamp();
  dur int;
  trig text := coalesce(nullif(_trigger, ''), 'scheduler');
  claims jsonb;
  is_on boolean;
BEGIN
  claims := nullif(current_setting('request.jwt.claims', true), '')::jsonb;
  IF claims IS NOT NULL
     AND coalesce(claims->>'role', '') <> 'service_role'
     AND NOT (public.is_staff() OR public.has_role('ops_manager')) THEN
    RAISE EXCEPTION 'not authorised' USING ERRCODE = '42501';
  END IF;

  SELECT enabled INTO is_on FROM public.dispatch_automation WHERE id;

  -- The switch is state, not schedule: a disabled sweep still runs, records a
  -- skip and stays visible in cron.job_run_details.
  IF trig = 'scheduler' AND coalesce(is_on, false) = false THEN
    dur := (extract(epoch FROM clock_timestamp() - t0) * 1000)::int;
    INSERT INTO public.dispatch_runs (trigger, started_at, finished_at, duration_ms, skipped, skip_reason)
    VALUES (trig, t0, clock_timestamp(), dur, true, 'disabled');
    UPDATE public.dispatch_automation
       SET last_run_at = now(), last_skipped = true, last_trigger = trig,
           last_duration_ms = dur, updated_at = now()
     WHERE id;
    RETURN jsonb_build_object('skipped', true, 'reason', 'disabled',
                              'timed_out', 0, 'escalated', 0, 'exceptions', 0,
                              'leads_processed', 0, 'partners_notified', 0,
                              'errors', '[]'::jsonb, 'duration_ms', dur);
  END IF;

  -- One sweep at a time. A run that overlaps the previous one is skipped, not
  -- queued, so the same opportunity can never be timed out twice.
  IF NOT pg_try_advisory_xact_lock(hashtext('mf-sla-timeouts')) THEN
    dur := (extract(epoch FROM clock_timestamp() - t0) * 1000)::int;
    INSERT INTO public.dispatch_runs (trigger, started_at, finished_at, duration_ms, skipped, skip_reason)
    VALUES (trig, t0, clock_timestamp(), dur, true, 'locked');
    UPDATE public.dispatch_automation
       SET last_run_at = now(), last_skipped = true, last_trigger = trig,
           last_duration_ms = dur, updated_at = now()
     WHERE id;
    RETURN jsonb_build_object('skipped', true, 'reason', 'locked',
                              'timed_out', 0, 'escalated', 0, 'exceptions', 0,
                              'leads_processed', 0, 'partners_notified', 0,
                              'errors', '[]'::jsonb, 'duration_ms', dur);
  END IF;

  BEGIN
    res := public.handle_sla_timeouts_detailed();
    dur := (extract(epoch FROM clock_timestamp() - t0) * 1000)::int;

    INSERT INTO public.dispatch_runs (
      trigger, started_at, finished_at, duration_ms, leads_processed, partners_notified,
      timed_out, escalated, exceptions, errors)
    VALUES (trig, t0, clock_timestamp(), dur,
            (res->>'leads_processed')::int, (res->>'partners_notified')::int,
            (res->>'timed_out')::int, (res->>'escalated')::int, (res->>'exceptions')::int,
            coalesce(res->'errors', '[]'::jsonb));

    UPDATE public.dispatch_automation
       SET last_run_at = now(), last_timed_out = (res->>'timed_out')::int,
           last_escalated = (res->>'escalated')::int, last_exceptions = (res->>'exceptions')::int,
           last_error = '', last_skipped = false, last_trigger = trig,
           last_duration_ms = dur, updated_at = now()
     WHERE id;

    RETURN res || jsonb_build_object('skipped', false, 'duration_ms', dur);
  EXCEPTION WHEN OTHERS THEN
    dur := (extract(epoch FROM clock_timestamp() - t0) * 1000)::int;
    INSERT INTO public.dispatch_runs (trigger, started_at, finished_at, duration_ms, error)
    VALUES (trig, t0, clock_timestamp(), dur, SQLERRM);
    UPDATE public.dispatch_automation
       SET last_run_at = now(), last_error = SQLERRM, last_skipped = false,
           last_trigger = trig, last_duration_ms = dur, updated_at = now()
     WHERE id;
    RAISE;
  END;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.run_work_order_job(_trigger text DEFAULT 'scheduler'::text, _horizon_days integer DEFAULT NULL::integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare res jsonb; t0 timestamptz := clock_timestamp(); dur int;
        trig text := coalesce(nullif(_trigger,''),'scheduler'); horizon int; cfg record;
begin
  if not (public.is_service_role() or public.is_staff() or public.has_role('ops_manager')) then
    raise exception 'not authorised' using errcode = '42501';
  end if;
  select * into cfg from public.dispatch_automation limit 1;
  horizon := coalesce(_horizon_days, cfg.wo_horizon_days, 30);

  if not pg_try_advisory_xact_lock(hashtext('mf-work-orders')) then
    dur := (extract(epoch from clock_timestamp() - t0) * 1000)::int;
    insert into public.dispatch_runs (job, trigger, started_at, finished_at, duration_ms, skipped, skip_reason)
    values ('work_orders', trig, t0, clock_timestamp(), dur, true, 'locked');
    update public.dispatch_automation set wo_last_run_at = now(), wo_last_skipped = true, updated_at = now() where true;
    return jsonb_build_object('skipped', true, 'reason', 'locked', 'created', 0);
  end if;

  res := public.generate_due_work_orders(horizon);
  dur := (extract(epoch from clock_timestamp() - t0) * 1000)::int;
  insert into public.dispatch_runs (job, trigger, started_at, finished_at, duration_ms, leads_processed, errors)
  values ('work_orders', trig, t0, clock_timestamp(), dur, (res->>'created')::int, '[]'::jsonb);
  update public.dispatch_automation
     set wo_last_run_at = now(), wo_last_created = (res->>'created')::int, wo_last_skipped = false, updated_at = now()
   where true;
  return res || jsonb_build_object('skipped', false, 'duration_ms', dur);
end $function$
;
CREATE OR REPLACE FUNCTION public.score_candidates(_lead_id uuid)
 RETURNS TABLE(candidate_kind text, candidate_id uuid, candidate_name text, score numeric, reasons jsonb, flags jsonb)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  l public.leads;
  w jsonb;
  pfx text;
  cold numeric := public.fairness_value('cold_start_jobs', 5);
  baseline numeric;
BEGIN
  IF NOT (public.is_staff() OR public.has_role('ops_manager') OR public.has_role('sales')
          OR public.has_role('partner_manager') OR public.is_service_role()) THEN
    RAISE EXCEPTION 'not authorised' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO l FROM public.leads WHERE id = _lead_id;
  IF l.id IS NULL THEN RAISE EXCEPTION 'lead not found' USING ERRCODE = 'P0002'; END IF;
  pfx := left(coalesce(l.postcode, ''), 2);

  SELECT r.weights INTO w FROM public.allocation_rules r
   WHERE r.active
     AND (r.category_id IS NULL OR r.category_id = l.category_id)
     AND (r.canton = '' OR r.canton = l.canton)
     AND (r.customer_type IS NULL OR r.customer_type = l.customer_type)
   ORDER BY r.priority ASC LIMIT 1;
  w := coalesce(w, '{"capability":30,"coverage":20,"distance":10,"availability":15,"capacity":5,"performance":10,"acceptance":5,"tier":5}'::jsonb);

  -- cold-start baseline: average score of partners in the same category and canton
  SELECT round(avg(pp.score), 1) INTO baseline
    FROM public.partner_performance pp
    JOIN public.partners p ON p.id = pp.partner_id
    JOIN public.partner_services ps ON ps.partner_id = p.id AND ps.approved
       AND (l.category_id IS NULL OR ps.category_id = l.category_id)
   WHERE pp.jobs_completed >= cold;
  baseline := coalesce(baseline, 50);

  RETURN QUERY
  WITH fair AS (SELECT * FROM public.partner_fairness(_lead_id)),
  eligible AS (
    SELECT p.id, p.legal_name, p.trading_name, p.city, p.classification,
           ps.approved_cities, ps.available_manpower,
           cov.hit AS coverage_hit,
           av.state AS av_state,
           perf.score AS perf_score,
           CASE WHEN coalesce(perf.opportunities_sent,0) = 0 THEN NULL
                ELSE perf.opportunities_accepted::numeric / perf.opportunities_sent END AS acceptance,
           f.completed, f.probation, f.provisional, f.cold_start, f.window_share, f.saturated
    FROM public.partners p
    JOIN public.partner_services ps
      ON ps.partner_id = p.id AND ps.category_id = l.category_id AND ps.approved
    LEFT JOIN LATERAL (
      SELECT true AS hit FROM public.partner_coverage pc
       LEFT JOIN public.service_zones z ON z.id = pc.zone_id
       WHERE pc.partner_id = p.id
         AND (pc.category_id IS NULL OR pc.category_id = l.category_id)
         AND (
           (pc.postcode_prefix <> '' AND pfx LIKE pc.postcode_prefix || '%')
           OR (z.id IS NOT NULL AND (z.postcode_prefix = pfx OR z.canton = l.canton))
         )
       LIMIT 1
    ) cov ON true
    LEFT JOIN public.resource_availability av
      ON av.resource_kind = 'partner' AND av.resource_id = p.id AND av.date = l.preferred_date
    LEFT JOIN public.partner_performance perf ON perf.partner_id = p.id
    LEFT JOIN fair f ON f.partner_id = p.id
    WHERE p.status = 'approved'
      AND EXISTS (SELECT 1 FROM public.partner_documents d
                   WHERE d.partner_id = p.id AND d.status = 'approved')
      AND NOT EXISTS (SELECT 1 FROM public.partner_documents d
                   WHERE d.partner_id = p.id
                     AND (d.status IN ('expired','rejected')
                          OR (d.expires_on IS NOT NULL AND d.expires_on < current_date)))
      AND coalesce(av.state, 'available') NOT IN ('unavailable','holiday','full')
  )
  SELECT 'partner'::text,
         e.id,
         coalesce(nullif(e.trading_name,''), e.legal_name),
         round(
             (w->>'capability')::numeric * 1.0
           + (w->>'coverage')::numeric * CASE WHEN e.coverage_hit THEN 1.0
                                              WHEN l.city <> '' AND l.city = ANY(e.approved_cities) THEN 0.8
                                              ELSE 0.2 END
           + (w->>'distance')::numeric * CASE WHEN lower(e.city) = lower(l.city) THEN 1.0 ELSE 0.4 END
           + (w->>'availability')::numeric * CASE e.av_state WHEN 'available' THEN 1.0
                                                             WHEN 'limited' THEN 0.5
                                                             ELSE 0.6 END
           + (w->>'capacity')::numeric * CASE WHEN coalesce(e.available_manpower,0) >= 4 THEN 1.0
                                              WHEN coalesce(e.available_manpower,0) > 0 THEN 0.6
                                              ELSE 0.3 END
           + (w->>'performance')::numeric * ((CASE WHEN coalesce(e.cold_start,true) THEN baseline
                                                   ELSE coalesce(e.perf_score, baseline) END) / 100.0)
           + (w->>'acceptance')::numeric * coalesce(e.acceptance, 0.5)
           + (w->>'tier')::numeric * CASE lower(coalesce(e.classification,''))
                                       WHEN 'a' THEN 1.0 WHEN 'b' THEN 0.7 WHEN 'c' THEN 0.4 ELSE 0.5 END
         , 1),
         to_jsonb(ARRAY[
           'Approved partner with valid, unexpired documents',
           'Offers the requested service category (approved)',
           CASE WHEN e.coverage_hit THEN 'Covers postcode area ' || pfx
                WHEN l.city <> '' AND l.city = ANY(e.approved_cities) THEN 'Approved for city ' || l.city
                ELSE 'No declared coverage for postcode area ' || pfx END,
           CASE WHEN lower(e.city) = lower(l.city) THEN 'Based in ' || l.city ELSE 'Based in ' || e.city || ', travel required' END,
           CASE e.av_state WHEN 'available' THEN 'Declared available on the requested date'
                           WHEN 'limited' THEN 'Limited availability on the requested date'
                           ELSE 'No availability declared for the requested date' END,
           'Capacity: ' || coalesce(e.available_manpower, 0)::text || ' people declared',
           CASE WHEN coalesce(e.cold_start,true)
                THEN 'Provisional score: only ' || coalesce(e.completed,0)::text ||
                     ' completed jobs, using category/canton average ' || baseline::text || '/100'
                ELSE 'Performance score ' || coalesce(e.perf_score, baseline)::text || '/100 over ' ||
                     coalesce(e.completed,0)::text || ' completed jobs' END,
           'Historical acceptance rate ' || round(coalesce(e.acceptance, 0.5) * 100)::text || '%',
           'Tier ' || coalesce(nullif(e.classification,''), 'unrated'),
           CASE WHEN coalesce(e.probation,true) THEN 'On probation — automatic assignment needs human confirmation'
                ELSE 'Out of probation' END,
           CASE WHEN coalesce(e.saturated,false)
                THEN 'Saturation cap reached: ' || coalesce(e.window_share,0)::text || '% of recent opportunities in this category/canton'
                ELSE 'Share of recent opportunities: ' || coalesce(e.window_share,0)::text || '%' END
         ]),
         jsonb_build_object(
           'probation', coalesce(e.probation, true),
           'provisional', coalesce(e.provisional, true),
           'cold_start', coalesce(e.cold_start, true),
           'completed_jobs', coalesce(e.completed, 0),
           'window_share', coalesce(e.window_share, 0),
           'saturated', coalesce(e.saturated, false),
           'baseline', baseline)
  FROM eligible e

  UNION ALL

  SELECT 'internal_team'::text,
         t.id,
         t.name,
         round(
             (w->>'capability')::numeric * 1.0
           + (w->>'coverage')::numeric * CASE WHEN t.canton = l.canton THEN 1.0 ELSE 0.3 END
           + (w->>'distance')::numeric * CASE WHEN lower(t.city) = lower(l.city) THEN 1.0 ELSE 0.4 END
           + (w->>'availability')::numeric * CASE coalesce(av.state,'available') WHEN 'available' THEN 1.0 WHEN 'limited' THEN 0.5 ELSE 0.6 END
           + (w->>'capacity')::numeric * CASE WHEN t.capacity_per_day >= 2 THEN 1.0 ELSE 0.6 END
           + (w->>'performance')::numeric * 0.8
           + (w->>'acceptance')::numeric * 1.0
           + (w->>'tier')::numeric * 1.0
         , 1),
         to_jsonb(ARRAY[
           'Internal team, always compliant',
           'Team covers the requested service category',
           CASE WHEN t.canton = l.canton THEN 'Based in canton ' || l.canton ELSE 'Outside canton ' || l.canton END,
           CASE WHEN lower(t.city) = lower(l.city) THEN 'Based in ' || l.city ELSE 'Based in ' || t.city || ', travel required' END,
           CASE coalesce(av.state,'available') WHEN 'available' THEN 'Declared available on the requested date'
                                               WHEN 'limited' THEN 'Limited availability on the requested date'
                                               ELSE 'No availability declared for the requested date' END,
           'Capacity ' || t.capacity_per_day::text || ' jobs/day'
         ]),
         jsonb_build_object('probation', false, 'provisional', false, 'cold_start', false,
                            'completed_jobs', null, 'window_share', 0, 'saturated', false,
                            'baseline', baseline)
  FROM public.internal_teams t
  LEFT JOIN public.resource_availability av
    ON av.resource_kind = 'internal_team' AND av.resource_id = t.id AND av.date = l.preferred_date
  WHERE t.active
    AND (l.category_id IS NULL OR l.category_id = ANY(t.category_ids))
    AND coalesce(av.state,'available') NOT IN ('unavailable','holiday','full')

  ORDER BY 4 DESC;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.send_change_order(_id uuid, _customer_price numeric DEFAULT NULL::numeric, _approval uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE c public.change_orders; price numeric; need text; req uuid; appr public.approval_requests;
BEGIN
  IF NOT public.is_dispatcher() THEN RAISE EXCEPTION 'not authorised' USING ERRCODE = '42501'; END IF;
  SELECT * INTO c FROM public.change_orders WHERE id = _id FOR UPDATE;
  IF c.id IS NULL THEN RAISE EXCEPTION 'change order not found' USING ERRCODE = 'P0002'; END IF;
  IF c.status NOT IN ('draft','awaiting_customer') THEN
    RAISE EXCEPTION 'change order already decided' USING ERRCODE = '22023';
  END IF;
  price := coalesce(_customer_price, c.customer_price);
  IF price IS NULL THEN RAISE EXCEPTION 'a customer price is required' USING ERRCODE = '22023'; END IF;

  need := public.approval_role_for('quote_total', price);
  IF need IS NOT NULL AND public.role_rank(public.caller_role()) < public.role_rank(need) THEN
    IF _approval IS NOT NULL THEN
      SELECT * INTO appr FROM public.approval_requests WHERE id = _approval;
    END IF;
    IF appr.id IS NULL OR appr.status <> 'approved' THEN
      req := public.request_approval('quote_total', price, 'change_order', _id, c.lead_id,
             jsonb_build_object('change_order', _id, 'price', price), 'Nachtrag Freigabe');
      UPDATE public.change_orders SET customer_price = price, approval_request_id = req, updated_at = now()
       WHERE id = _id;
      RETURN jsonb_build_object('status','approval_required','required_role', need,
                                'request_id', req, 'value', price);
    END IF;
  END IF;

  UPDATE public.change_orders
     SET customer_price = price, status = 'awaiting_customer',
         token_expires_at = coalesce(token_expires_at, now() + interval '30 days'), updated_at = now()
   WHERE id = _id RETURNING * INTO c;

  INSERT INTO public.job_events_exec (job_id, kind, body, meta, actor_id, actor_kind)
  VALUES (c.job_id, 'change_order', '',
          jsonb_build_object('change_order', c.id, 'status', 'awaiting_customer', 'price', price),
          auth.uid(), 'staff');

  RETURN jsonb_build_object('status','awaiting_customer','reference', c.reference,
                            'token', c.public_token, 'expires_at', c.token_expires_at);
END; $function$
;
CREATE OR REPLACE FUNCTION public.send_lead_opportunities(_lead_id uuid, _candidates jsonb, _note text DEFAULT ''::text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  l public.leads;
  sla int;
  deadline timestamptz;
  c jsonb;
  pid uuid;
  made int := 0;
  opp_id uuid;
BEGIN
  IF NOT public.is_dispatcher() THEN
    RAISE EXCEPTION 'not authorised' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO l FROM public.leads WHERE id = _lead_id;
  IF l.id IS NULL THEN RAISE EXCEPTION 'lead not found' USING ERRCODE = 'P0002'; END IF;
  IF jsonb_typeof(_candidates) <> 'array' OR jsonb_array_length(_candidates) = 0 THEN
    RAISE EXCEPTION 'no candidates supplied' USING ERRCODE = '22023';
  END IF;

  sla := public.lead_sla_minutes(_lead_id);
  deadline := now() + make_interval(mins => sla);

  FOR c IN SELECT * FROM jsonb_array_elements(_candidates) LOOP
    pid := nullif(c->>'partner_id','')::uuid;
    CONTINUE WHEN pid IS NULL;
    CONTINUE WHEN EXISTS (
      SELECT 1 FROM public.partner_opportunities o
       WHERE o.lead_id = _lead_id AND o.partner_id = pid
         AND o.status IN ('sent','viewed','accepted'));

    INSERT INTO public.partner_opportunities (
      partner_id, reference, status, title, description, amount, currency,
      starts_on, lead_id, sent_at, respond_by, match_score, match_reasons)
    VALUES (
      pid, public.generate_opportunity_reference(), 'sent',
      l.reference, left(coalesce(l.description,''), 140),
      l.estimated_value, 'CHF', l.preferred_date, _lead_id, now(), deadline,
      nullif(c->>'score','')::numeric, coalesce(c->'reasons', '[]'::jsonb))
    RETURNING id INTO opp_id;

    made := made + 1;

    INSERT INTO public.lead_activities (lead_id, kind, body, meta, actor_id, actor_kind)
    VALUES (_lead_id, 'assignment', coalesce(_note,''),
            jsonb_build_object('opportunity', opp_id, 'partner', pid, 'action', 'sent',
                               'respond_by', deadline, 'match_score', c->'score'),
            auth.uid(), 'staff');

    PERFORM public.recalc_partner_performance(pid);
  END LOOP;

  IF made > 0 THEN
    UPDATE public.leads
       SET fulfilment_type = CASE WHEN made > 1 THEN 'rfq'::public.lead_fulfilment_type
                                  ELSE coalesce(fulfilment_type, 'partner'::public.lead_fulfilment_type) END,
           last_activity_at = now()
     WHERE id = _lead_id;
  END IF;
  RETURN made;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.set_change_order_reference()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; candidate text; i int;
BEGIN
  IF NEW.reference IS NULL OR NEW.reference = '' OR NEW.reference = 'pending' THEN
    LOOP
      candidate := 'MF-CO-' || to_char(now(),'YYYY') || '-';
      FOR i IN 1..8 LOOP
        candidate := candidate || substr(alphabet, 1 + floor(random()*length(alphabet))::int, 1);
      END LOOP;
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.change_orders WHERE reference = candidate);
    END LOOP;
    NEW.reference := candidate;
  END IF;
  IF NEW.public_token IS NULL OR NEW.public_token = '' THEN
    NEW.public_token := replace(gen_random_uuid()::text,'-','') || replace(gen_random_uuid()::text,'-','');
    NEW.token_expires_at := coalesce(NEW.token_expires_at, now() + interval '30 days');
  END IF;
  RETURN NEW;
END; $function$
;
CREATE OR REPLACE FUNCTION public.set_contract_reference()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; candidate text; i int;
begin
  if new.reference is not null and new.reference <> '' and new.reference <> 'pending' then return new; end if;
  loop
    candidate := 'MF-CTR-' || to_char(now(),'YYYY') || '-';
    for i in 1..8 loop
      candidate := candidate || substr(alphabet, 1 + floor(random()*length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.contracts where reference = candidate);
  end loop;
  new.reference := candidate; return new;
end $function$
;
CREATE OR REPLACE FUNCTION public.set_customer_quote_reference()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  candidate text; i int;
BEGIN
  IF NEW.reference IS NOT NULL AND NEW.reference <> '' AND NEW.reference <> 'pending' THEN
    RETURN NEW;
  END IF;
  LOOP
    candidate := 'MF-Q-' || to_char(now(), 'YYYY') || '-';
    FOR i IN 1..8 LOOP
      candidate := candidate || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.quotes_customer WHERE reference = candidate);
  END LOOP;
  NEW.reference := candidate;
  RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.set_invoice_reference()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; candidate text; i int;
begin
  if new.reference is not null and new.reference <> '' and new.reference <> 'pending' then return new; end if;
  loop
    candidate := 'MF-INV-' || to_char(now(),'YYYY') || '-';
    for i in 1..8 loop candidate := candidate || substr(alphabet, 1 + floor(random()*length(alphabet))::int, 1); end loop;
    exit when not exists (select 1 from public.invoices where reference = candidate);
  end loop;
  new.reference := candidate; return new;
end $function$
;
CREATE OR REPLACE FUNCTION public.set_job_exec_reference()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; candidate text; i int;
BEGIN
  IF NEW.reference IS NOT NULL AND NEW.reference <> '' AND NEW.reference <> 'pending' THEN RETURN NEW; END IF;
  LOOP
    candidate := 'MF-JOB-' || to_char(now(),'YYYY') || '-';
    FOR i IN 1..8 LOOP
      candidate := candidate || substr(alphabet, 1 + floor(random()*length(alphabet))::int, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.jobs_execution WHERE reference = candidate);
  END LOOP;
  NEW.reference := candidate; RETURN NEW;
END; $function$
;
CREATE OR REPLACE FUNCTION public.set_job_reference()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  alphabet TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  candidate TEXT;
  i INTEGER;
BEGIN
  IF NEW.reference IS NOT NULL AND NEW.reference <> '' AND NEW.reference <> 'pending' THEN
    RETURN NEW;
  END IF;
  LOOP
    candidate := 'MF-' || to_char(now(), 'YYYY') || '-';
    FOR i IN 1..8 LOOP
      candidate := candidate || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.jobs WHERE reference = candidate);
  END LOOP;
  NEW.reference := candidate;
  RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.set_job_status(_job_id uuid, _status job_exec_status, _note text DEFAULT ''::text)
 RETURNS jobs_execution
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE j public.jobs_execution; ok boolean; ev public.job_exec_event_kind; is_partner boolean;
BEGIN
  SELECT * INTO j FROM public.jobs_execution WHERE id = _job_id FOR UPDATE;
  IF j.id IS NULL THEN RAISE EXCEPTION 'job not found' USING ERRCODE = 'P0002'; END IF;
  is_partner := j.partner_id IS NOT NULL AND j.partner_id = public.current_partner_id();
  IF NOT (public.is_dispatcher() OR is_partner) THEN
    RAISE EXCEPTION 'not authorised' USING ERRCODE = '42501';
  END IF;
  IF _status = 'cancelled' THEN
    RAISE EXCEPTION 'use cancel_job to cancel' USING ERRCODE = '22023';
  END IF;
  IF _status = 'verified' AND NOT public.is_dispatcher() THEN
    RAISE EXCEPTION 'not authorised' USING ERRCODE = '42501';
  END IF;

  ok := CASE j.status
    WHEN 'scheduled'   THEN _status IN ('en_route','on_site')
    WHEN 'en_route'    THEN _status IN ('on_site')
    WHEN 'on_site'     THEN _status IN ('in_progress')
    WHEN 'in_progress' THEN _status IN ('paused','completed')
    WHEN 'paused'      THEN _status IN ('in_progress','completed')
    WHEN 'completed'   THEN _status IN ('verified')
    ELSE false END;
  IF NOT ok THEN RAISE EXCEPTION 'invalid transition' USING ERRCODE = '22023'; END IF;

  -- Timestamps come from the server clock only.
  UPDATE public.jobs_execution SET
    status = _status,
    arrived_at   = CASE WHEN _status = 'on_site' AND arrived_at IS NULL THEN now() ELSE arrived_at END,
    started_at   = CASE WHEN _status = 'in_progress' AND started_at IS NULL THEN now() ELSE started_at END,
    paused_at    = CASE WHEN _status = 'paused' THEN now() ELSE NULL END,
    total_pause_minutes = CASE
      WHEN j.status = 'paused' AND j.paused_at IS NOT NULL
      THEN total_pause_minutes + greatest(0, (extract(epoch FROM now() - j.paused_at)/60)::int)
      ELSE total_pause_minutes END,
    completed_at = CASE WHEN _status = 'completed' THEN now() ELSE completed_at END,
    verified_at  = CASE WHEN _status = 'verified' THEN now() ELSE verified_at END,
    updated_at = now()
  WHERE id = _job_id RETURNING * INTO j;

  ev := CASE _status
    WHEN 'on_site' THEN 'arrive'::public.job_exec_event_kind
    WHEN 'in_progress' THEN (CASE WHEN j.started_at IS NOT NULL AND j.total_pause_minutes > 0 THEN 'resume' ELSE 'start' END)::public.job_exec_event_kind
    WHEN 'paused' THEN 'pause'::public.job_exec_event_kind
    WHEN 'completed' THEN 'complete'::public.job_exec_event_kind
    ELSE 'status'::public.job_exec_event_kind END;

  INSERT INTO public.job_events_exec (job_id, kind, body, meta, actor_id, actor_kind)
  VALUES (_job_id, ev, coalesce(_note,''), jsonb_build_object('status', _status),
          auth.uid(), (CASE WHEN is_partner THEN 'partner' ELSE 'staff' END)::public.lead_actor_kind);
  RETURN j;
END; $function$
;
CREATE OR REPLACE FUNCTION public.set_lead_owner(_lead_id uuid, _owner_id uuid, _note text DEFAULT ''::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE prev uuid;
BEGIN
  IF NOT (public.is_staff() OR public.has_role('ops_manager')) THEN
    RAISE EXCEPTION 'not authorised' USING ERRCODE = '42501';
  END IF;
  SELECT lead_owner_id INTO prev FROM public.leads WHERE id = _lead_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'lead not found' USING ERRCODE = 'P0002'; END IF;

  UPDATE public.leads
     SET lead_owner_id = _owner_id, last_activity_at = now()
   WHERE id = _lead_id;

  INSERT INTO public.lead_activities (lead_id, kind, body, meta, actor_id, actor_kind)
  VALUES (_lead_id, 'assignment', coalesce(_note, ''),
          jsonb_build_object('from_owner', prev, 'to_owner', _owner_id), auth.uid(), 'staff');
  RETURN _lead_id;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.set_lead_reference()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  candidate text; i int;
BEGIN
  IF NEW.reference IS NOT NULL AND NEW.reference <> '' AND NEW.reference <> 'pending' THEN
    RETURN NEW;
  END IF;
  LOOP
    candidate := 'MF-LEAD-' || to_char(now(), 'YYYY') || '-';
    FOR i IN 1..8 LOOP
      candidate := candidate || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.leads WHERE reference = candidate);
  END LOOP;
  NEW.reference := candidate;
  RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.set_lead_status(_lead_id uuid, _new_status lead_status, _note text DEFAULT ''::text)
 RETURNS lead_status
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE old_status public.lead_status;
BEGIN
  IF NOT (public.is_staff() OR public.has_role('ops_manager') OR public.has_role('sales')) THEN
    RAISE EXCEPTION 'not authorised' USING ERRCODE = '42501';
  END IF;
  SELECT status INTO old_status FROM public.leads WHERE id = _lead_id FOR UPDATE;
  IF old_status IS NULL THEN RAISE EXCEPTION 'lead not found' USING ERRCODE = 'P0002'; END IF;

  UPDATE public.leads SET status = _new_status, last_activity_at = now() WHERE id = _lead_id;

  INSERT INTO public.lead_activities (lead_id, kind, body, meta, actor_id, actor_kind)
  VALUES (_lead_id, 'status_change', coalesce(_note,''),
          jsonb_build_object('from', old_status, 'to', _new_status), auth.uid(), 'staff');
  RETURN _new_status;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.set_market_active(_country text, _active boolean)
 RETURNS markets
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare m public.markets;
begin
  if not public.is_staff() then raise exception 'not authorised' using errcode = '42501'; end if;
  select * into m from public.markets where country = _country for update;
  if m.country is null then raise exception 'unknown market' using errcode = 'P0002'; end if;

  if _active then
    if not (m.legal_ready and m.entity_ready and m.tax_ready) then
      raise exception 'market_not_ready' using errcode = '55006',
        detail = format('legal_ready=%s entity_ready=%s tax_ready=%s', m.legal_ready, m.entity_ready, m.tax_ready);
    end if;
  end if;

  update public.markets
     set active = _active,
         activated_at = case when _active and activated_at is null then now() else activated_at end,
         updated_at = now()
   where country = _country
   returning * into m;
  return m;
end $function$
;
CREATE OR REPLACE FUNCTION public.set_market_readiness(_country text, _legal boolean, _entity boolean, _tax boolean)
 RETURNS markets
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare m public.markets;
begin
  if not public.is_staff() then raise exception 'not authorised' using errcode = '42501'; end if;
  update public.markets set legal_ready = _legal, entity_ready = _entity, tax_ready = _tax, updated_at = now()
   where country = _country returning * into m;
  if m.country is null then raise exception 'unknown market' using errcode = 'P0002'; end if;
  return m;
end $function$
;
CREATE OR REPLACE FUNCTION public.set_partner_account_manager(_partner_id uuid, _manager_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'not authorised' USING ERRCODE = '42501';
  END IF;
  IF _manager_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = _manager_id AND role = 'zuegelwerk_admin'
  ) THEN
    RAISE EXCEPTION 'account manager must be staff' USING ERRCODE = '22023';
  END IF;
  UPDATE public.partners
     SET account_manager_id = _manager_id, updated_at = now()
   WHERE id = _partner_id;
  RETURN _manager_id;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.set_partner_assessment(_partner_id uuid, _ratings jsonb, _classification text)
 RETURNS numeric
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  total numeric;
BEGIN
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'not authorised' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.partners WHERE id = _partner_id) THEN
    RAISE EXCEPTION 'partner not found' USING ERRCODE = 'P0002';
  END IF;

  DELETE FROM public.partner_ratings WHERE partner_id = _partner_id;

  INSERT INTO public.partner_ratings (partner_id, criterion, score, max_score, note, actor_id)
  SELECT _partner_id,
         r->>'criterion',
         (r->>'score')::numeric,
         coalesce((r->>'max_score')::numeric, 10),
         coalesce(r->>'note', ''),
         auth.uid()
    FROM jsonb_array_elements(coalesce(_ratings, '[]'::jsonb)) AS r;

  SELECT coalesce(sum(score), 0) INTO total
    FROM public.partner_ratings WHERE partner_id = _partner_id;

  UPDATE public.partners
     SET internal_score = total,
         classification = nullif(btrim(coalesce(_classification, '')), ''),
         updated_at = now()
   WHERE id = _partner_id;

  RETURN total;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.set_partner_quote_lead()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF NEW.opportunity_id IS NOT NULL THEN
    SELECT o.lead_id INTO NEW.lead_id
      FROM public.partner_opportunities o WHERE o.id = NEW.opportunity_id;
  END IF;
  IF NEW.status = 'submitted' AND NEW.submitted_at IS NULL THEN
    NEW.submitted_at := now();
  END IF;
  RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.set_partner_reference()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  candidate text;
  i integer;
BEGIN
  IF NEW.reference IS NOT NULL AND NEW.reference <> '' AND NEW.reference <> 'pending' THEN
    RETURN NEW;
  END IF;
  LOOP
    candidate := 'PART-' || to_char(now(), 'YYYY') || '-';
    FOR i IN 1..8 LOOP
      candidate := candidate || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.partners WHERE reference = candidate);
  END LOOP;
  NEW.reference := candidate;
  RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.set_partner_service_approval(_service_id uuid, _approved boolean, _cities text[] DEFAULT '{}'::text[])
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'not authorised' USING ERRCODE = '42501';
  END IF;
  UPDATE public.partner_services
     SET approved = coalesce(_approved, false),
         approved_cities = coalesce(_cities, '{}'),
         updated_at = now()
   WHERE id = _service_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'service not found' USING ERRCODE = 'P0002';
  END IF;
  RETURN coalesce(_approved, false);
END;
$function$
;
CREATE OR REPLACE FUNCTION public.set_partner_status(_partner_id uuid, _new_status partner_status, _note text DEFAULT ''::text)
 RETURNS partner_status
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  old_status public.partner_status;
BEGIN
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'not authorised' USING ERRCODE = '42501';
  END IF;
  SELECT status INTO old_status FROM public.partners WHERE id = _partner_id FOR UPDATE;
  IF old_status IS NULL THEN
    RAISE EXCEPTION 'partner not found' USING ERRCODE = 'P0002';
  END IF;
  UPDATE public.partners SET status = _new_status WHERE id = _partner_id;
  INSERT INTO public.partner_status_history (partner_id, from_status, to_status, note, actor_id)
  VALUES (_partner_id, old_status, _new_status, coalesce(_note, ''), auth.uid());
  RETURN _new_status;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.set_quote_reference()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  NEW.reference := public.generate_quote_reference();
  RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.set_sla_automation(_enabled boolean, _minutes integer DEFAULT 5)
 RETURNS dispatch_automation
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  row public.dispatch_automation;
  mins int := greatest(1, least(1440, coalesce(_minutes, 5)));
  has_cron boolean;
  sched text := 'external';
BEGIN
  IF NOT (public.is_staff() OR public.has_role('ops_manager')) THEN
    RAISE EXCEPTION 'not authorised' USING ERRCODE = '42501';
  END IF;

  SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') INTO has_cron;

  -- The schedule stays registered in every case; only its cadence follows the
  -- setting. Disabling is recorded as state and reported as a skipped run.
  IF has_cron THEN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'mf-sla-timeouts') THEN
      PERFORM cron.alter_job(jobid, schedule => '*/' || mins::text || ' * * * *')
        FROM cron.job WHERE jobname = 'mf-sla-timeouts';
    ELSE
      PERFORM cron.schedule('mf-sla-timeouts', '*/' || mins::text || ' * * * *',
        $j$select set_config('request.jwt.claims', '{"role":"service_role"}', true); select public.run_sla_timeouts_job('scheduler');$j$);
    END IF;
    sched := 'pg_cron';
  END IF;

  UPDATE public.dispatch_automation
     SET enabled = coalesce(_enabled, false),
         interval_minutes = mins,
         scheduler = sched,
         updated_at = now()
   WHERE id
  RETURNING * INTO row;

  RETURN row;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.set_work_order_reference()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; candidate text; i int;
begin
  if new.reference is not null and new.reference <> '' and new.reference <> 'pending' then return new; end if;
  loop
    candidate := 'MF-WO-' || to_char(now(),'YYYY') || '-';
    for i in 1..8 loop candidate := candidate || substr(alphabet, 1 + floor(random()*length(alphabet))::int, 1); end loop;
    exit when not exists (select 1 from public.work_orders where reference = candidate);
  end loop;
  new.reference := candidate; return new;
end $function$
;
CREATE OR REPLACE FUNCTION public.sla_target(_work_order_id uuid)
 RETURNS TABLE(sla_id uuid, sla_name text, coverage sla_coverage, response_due_at timestamp with time zone, resolution_due_at timestamp with time zone, hours_source text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare wo public.work_orders; sla public.slas; site public.account_sites; hours jsonb; src text; always boolean;
begin
  select * into wo from public.work_orders where id = _work_order_id;
  if wo.id is null then raise exception 'work order not found' using errcode = 'P0002'; end if;
  if not (public.account_visible(wo.account_id) or public.is_service_role()) then
    raise exception 'not authorised' using errcode = '42501';
  end if;
  select * into sla from public.slas where id = wo.sla_id;
  if sla.id is null then return; end if;
  select * into site from public.account_sites where id = wo.site_id;
  if site.operating_hours is not null and site.operating_hours <> '{}'::jsonb then
    hours := site.operating_hours; src := 'site';
  else hours := sla.business_hours; src := 'sla'; end if;
  always := sla.coverage = '24_7';
  if always then src := '24_7'; end if;
  sla_id := sla.id; sla_name := sla.name; coverage := sla.coverage;
  response_due_at := public.add_coverage_minutes(wo.reported_at, sla.response_minutes, hours, always);
  resolution_due_at := public.add_coverage_minutes(wo.reported_at, sla.resolution_hours * 60, hours, always);
  hours_source := src;
  return next;
end $function$
;
CREATE OR REPLACE FUNCTION public.source_performance(_from date, _to date)
 RETURNS TABLE(source_id uuid, source_key text, leads bigint, qualified bigint, won bigint, conversion numeric, revenue numeric, gross_margin numeric, spend numeric, cost_per_lead numeric, cost_per_qualified numeric, cac numeric, roas numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF NOT (public.is_staff() OR public.has_role('ops_manager') OR public.has_role('finance')) THEN
    RAISE EXCEPTION 'not authorised' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH base AS (
    SELECT s.id, s.key,
           count(l.id) AS leads,
           count(l.id) FILTER (WHERE l.status NOT IN ('new','lost','cancelled')) AS qualified,
           count(l.id) FILTER (WHERE l.status IN ('won','scheduled','in_progress','completed')) AS won,
           coalesce(sum(q.total) FILTER (WHERE q.status = 'accepted'), 0) AS revenue,
           coalesce(sum(l.expected_margin) FILTER (WHERE l.status IN ('won','scheduled','in_progress','completed')), 0) AS margin
      FROM public.lead_sources s
      LEFT JOIN public.leads l ON l.source_id = s.id
        AND l.created_at >= _from AND l.created_at < (_to + 1)
      LEFT JOIN LATERAL (
        SELECT qc.total, qc.status FROM public.quotes_customer qc
         WHERE qc.lead_id = l.id AND qc.status = 'accepted'
         ORDER BY qc.accepted_at DESC NULLS LAST LIMIT 1) q ON true
     GROUP BY s.id, s.key
  ), sp AS (
    SELECT c.source_id, sum(c.spend) AS spend
      FROM public.source_costs c
     WHERE c.period_start <= _to AND c.period_end >= _from
     GROUP BY c.source_id
  )
  SELECT b.id, b.key, b.leads, b.qualified, b.won,
         CASE WHEN b.leads = 0 THEN 0 ELSE round(b.won::numeric * 100 / b.leads, 1) END,
         b.revenue, b.margin,
         sp.spend,
         CASE WHEN sp.spend IS NULL OR b.leads = 0 THEN NULL ELSE round(sp.spend / b.leads, 2) END,
         CASE WHEN sp.spend IS NULL OR b.qualified = 0 THEN NULL ELSE round(sp.spend / b.qualified, 2) END,
         CASE WHEN sp.spend IS NULL OR b.won = 0 THEN NULL ELSE round(sp.spend / b.won, 2) END,
         CASE WHEN sp.spend IS NULL OR sp.spend = 0 THEN NULL ELSE round(b.revenue / sp.spend, 2) END
    FROM base b LEFT JOIN sp ON sp.source_id = b.id
   ORDER BY b.leads DESC;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.submit_partner_application(_note text DEFAULT ''::text)
 RETURNS partner_status
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  pid uuid;
  old_status public.partner_status;
BEGIN
  SELECT id, status INTO pid, old_status FROM public.partners WHERE created_by = auth.uid() ORDER BY created_at LIMIT 1;
  IF pid IS NULL THEN
    RAISE EXCEPTION 'no partner record' USING ERRCODE = 'P0002';
  END IF;
  IF old_status NOT IN ('draft','more_info_required') THEN
    RAISE EXCEPTION 'application is frozen' USING ERRCODE = '42501';
  END IF;
  UPDATE public.partners SET status = 'submitted' WHERE id = pid;
  INSERT INTO public.partner_status_history (partner_id, from_status, to_status, note, actor_id)
  VALUES (pid, old_status, 'submitted', coalesce(_note, ''), auth.uid());
  RETURN 'submitted';
END;
$function$
;
CREATE OR REPLACE FUNCTION public.sync_market_legal_ready()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  complete boolean;
begin
  complete := coalesce(nullif(btrim(NEW.legal_name), ''), null) is not null
          and coalesce(nullif(btrim(NEW.register_number), ''), null) is not null
          and coalesce(nullif(btrim(NEW.vat_number), ''), null) is not null
          and coalesce(nullif(btrim(NEW.address_line), ''), null) is not null
          and coalesce(nullif(btrim(NEW.postal_code), ''), null) is not null
          and coalesce(nullif(btrim(NEW.city), ''), null) is not null;

  update public.markets m
     set legal_ready = complete,
         updated_at = now()
   where m.country = NEW.country
     and m.legal_ready is distinct from complete;

  return NEW;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.work_orders_set_deadlines()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare sla public.slas; site public.account_sites; hours jsonb; always boolean;
begin
  if new.sla_id is null then new.response_due_at := null; new.resolution_due_at := null; return new; end if;
  select * into sla from public.slas where id = new.sla_id;
  select * into site from public.account_sites where id = new.site_id;
  hours := coalesce(nullif(site.operating_hours, '{}'::jsonb), sla.business_hours);
  always := sla.coverage = '24_7';
  new.response_due_at := public.add_coverage_minutes(new.reported_at, sla.response_minutes, hours, always);
  new.resolution_due_at := public.add_coverage_minutes(new.reported_at, sla.resolution_hours * 60, hours, always);
  return new;
end $function$
;

SET check_function_bodies = on;

-- Foreign keys (after all tables exist)
ALTER TABLE public.account_contacts DROP CONSTRAINT IF EXISTS account_contacts_account_id_fkey;
ALTER TABLE public.account_contacts ADD CONSTRAINT account_contacts_account_id_fkey FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE;
ALTER TABLE public.account_contacts DROP CONSTRAINT IF EXISTS account_contacts_site_id_fkey;
ALTER TABLE public.account_contacts ADD CONSTRAINT account_contacts_site_id_fkey FOREIGN KEY (site_id) REFERENCES account_sites(id) ON DELETE CASCADE;
ALTER TABLE public.account_services DROP CONSTRAINT IF EXISTS account_services_account_id_fkey;
ALTER TABLE public.account_services ADD CONSTRAINT account_services_account_id_fkey FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE;
ALTER TABLE public.account_services DROP CONSTRAINT IF EXISTS account_services_catalogue_id_fkey;
ALTER TABLE public.account_services ADD CONSTRAINT account_services_catalogue_id_fkey FOREIGN KEY (catalogue_id) REFERENCES service_catalogue(id) ON DELETE RESTRICT;
ALTER TABLE public.account_services DROP CONSTRAINT IF EXISTS account_services_sla_fk;
ALTER TABLE public.account_services ADD CONSTRAINT account_services_sla_fk FOREIGN KEY (sla_id) REFERENCES slas(id) ON DELETE SET NULL;
ALTER TABLE public.account_sites DROP CONSTRAINT IF EXISTS account_sites_account_id_fkey;
ALTER TABLE public.account_sites ADD CONSTRAINT account_sites_account_id_fkey FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE;
ALTER TABLE public.accounts DROP CONSTRAINT IF EXISTS accounts_account_manager_id_fkey;
ALTER TABLE public.accounts ADD CONSTRAINT accounts_account_manager_id_fkey FOREIGN KEY (account_manager_id) REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE public.accounts DROP CONSTRAINT IF EXISTS accounts_country_fkey;
ALTER TABLE public.accounts ADD CONSTRAINT accounts_country_fkey FOREIGN KEY (country) REFERENCES markets(country);
ALTER TABLE public.accounts DROP CONSTRAINT IF EXISTS accounts_organization_id_fkey;
ALTER TABLE public.accounts ADD CONSTRAINT accounts_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL;
ALTER TABLE public.allocation_exceptions DROP CONSTRAINT IF EXISTS allocation_exceptions_lead_id_fkey;
ALTER TABLE public.allocation_exceptions ADD CONSTRAINT allocation_exceptions_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE;
ALTER TABLE public.allocation_rules DROP CONSTRAINT IF EXISTS allocation_rules_category_id_fkey;
ALTER TABLE public.allocation_rules ADD CONSTRAINT allocation_rules_category_id_fkey FOREIGN KEY (category_id) REFERENCES partner_categories(id) ON DELETE CASCADE;
ALTER TABLE public.approval_requests DROP CONSTRAINT IF EXISTS approval_requests_decided_by_fkey;
ALTER TABLE public.approval_requests ADD CONSTRAINT approval_requests_decided_by_fkey FOREIGN KEY (decided_by) REFERENCES auth.users(id);
ALTER TABLE public.approval_requests DROP CONSTRAINT IF EXISTS approval_requests_lead_id_fkey;
ALTER TABLE public.approval_requests ADD CONSTRAINT approval_requests_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES leads(id);
ALTER TABLE public.approval_requests DROP CONSTRAINT IF EXISTS approval_requests_requested_by_fkey;
ALTER TABLE public.approval_requests ADD CONSTRAINT approval_requests_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES auth.users(id);
ALTER TABLE public.approval_requests DROP CONSTRAINT IF EXISTS approval_requests_rule_id_fkey;
ALTER TABLE public.approval_requests ADD CONSTRAINT approval_requests_rule_id_fkey FOREIGN KEY (rule_id) REFERENCES approval_rules(id);
ALTER TABLE public.approval_rules DROP CONSTRAINT IF EXISTS approval_rules_country_fkey;
ALTER TABLE public.approval_rules ADD CONSTRAINT approval_rules_country_fkey FOREIGN KEY (country) REFERENCES markets(country);
ALTER TABLE public.cancellation_rules DROP CONSTRAINT IF EXISTS cancellation_rules_country_fkey;
ALTER TABLE public.cancellation_rules ADD CONSTRAINT cancellation_rules_country_fkey FOREIGN KEY (country) REFERENCES markets(country);
ALTER TABLE public.change_orders DROP CONSTRAINT IF EXISTS change_orders_approval_request_id_fkey;
ALTER TABLE public.change_orders ADD CONSTRAINT change_orders_approval_request_id_fkey FOREIGN KEY (approval_request_id) REFERENCES approval_requests(id);
ALTER TABLE public.change_orders DROP CONSTRAINT IF EXISTS change_orders_job_id_fkey;
ALTER TABLE public.change_orders ADD CONSTRAINT change_orders_job_id_fkey FOREIGN KEY (job_id) REFERENCES jobs_execution(id) ON DELETE CASCADE;
ALTER TABLE public.change_orders DROP CONSTRAINT IF EXISTS change_orders_lead_id_fkey;
ALTER TABLE public.change_orders ADD CONSTRAINT change_orders_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES leads(id);
ALTER TABLE public.change_orders DROP CONSTRAINT IF EXISTS change_orders_requested_by_fkey;
ALTER TABLE public.change_orders ADD CONSTRAINT change_orders_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES auth.users(id);
ALTER TABLE public.chat_messages DROP CONSTRAINT IF EXISTS chat_messages_session_id_fkey;
ALTER TABLE public.chat_messages ADD CONSTRAINT chat_messages_session_id_fkey FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE;
ALTER TABLE public.chat_sessions DROP CONSTRAINT IF EXISTS chat_sessions_lead_id_fkey;
ALTER TABLE public.chat_sessions ADD CONSTRAINT chat_sessions_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL;
ALTER TABLE public.consent_records DROP CONSTRAINT IF EXISTS consent_records_legal_entity_id_fkey;
ALTER TABLE public.consent_records ADD CONSTRAINT consent_records_legal_entity_id_fkey FOREIGN KEY (legal_entity_id) REFERENCES legal_entities(id) ON DELETE SET NULL;
ALTER TABLE public.contract_sites DROP CONSTRAINT IF EXISTS contract_sites_contract_id_fkey;
ALTER TABLE public.contract_sites ADD CONSTRAINT contract_sites_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE;
ALTER TABLE public.contract_sites DROP CONSTRAINT IF EXISTS contract_sites_site_id_fkey;
ALTER TABLE public.contract_sites ADD CONSTRAINT contract_sites_site_id_fkey FOREIGN KEY (site_id) REFERENCES account_sites(id) ON DELETE CASCADE;
ALTER TABLE public.contracts DROP CONSTRAINT IF EXISTS contracts_account_id_fkey;
ALTER TABLE public.contracts ADD CONSTRAINT contracts_account_id_fkey FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE;
ALTER TABLE public.contracts DROP CONSTRAINT IF EXISTS contracts_sla_id_fkey;
ALTER TABLE public.contracts ADD CONSTRAINT contracts_sla_id_fkey FOREIGN KEY (sla_id) REFERENCES slas(id) ON DELETE SET NULL;
ALTER TABLE public.contracts DROP CONSTRAINT IF EXISTS contracts_terms_document_id_fkey;
ALTER TABLE public.contracts ADD CONSTRAINT contracts_terms_document_id_fkey FOREIGN KEY (terms_document_id) REFERENCES legal_documents(id) ON DELETE SET NULL;
ALTER TABLE public.email_assignments DROP CONSTRAINT IF EXISTS email_assignments_assigned_by_fkey;
ALTER TABLE public.email_assignments ADD CONSTRAINT email_assignments_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.email_assignments DROP CONSTRAINT IF EXISTS email_assignments_assigned_to_fkey;
ALTER TABLE public.email_assignments ADD CONSTRAINT email_assignments_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.email_assignments DROP CONSTRAINT IF EXISTS email_assignments_thread_id_fkey;
ALTER TABLE public.email_assignments ADD CONSTRAINT email_assignments_thread_id_fkey FOREIGN KEY (thread_id) REFERENCES email_threads(id) ON DELETE CASCADE;
ALTER TABLE public.email_attachments DROP CONSTRAINT IF EXISTS email_attachments_message_id_fkey;
ALTER TABLE public.email_attachments ADD CONSTRAINT email_attachments_message_id_fkey FOREIGN KEY (message_id) REFERENCES email_messages(id) ON DELETE CASCADE;
ALTER TABLE public.email_links DROP CONSTRAINT IF EXISTS email_links_linked_by_fkey;
ALTER TABLE public.email_links ADD CONSTRAINT email_links_linked_by_fkey FOREIGN KEY (linked_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.email_links DROP CONSTRAINT IF EXISTS email_links_thread_id_fkey;
ALTER TABLE public.email_links ADD CONSTRAINT email_links_thread_id_fkey FOREIGN KEY (thread_id) REFERENCES email_threads(id) ON DELETE CASCADE;
ALTER TABLE public.email_messages DROP CONSTRAINT IF EXISTS email_messages_created_by_fkey;
ALTER TABLE public.email_messages ADD CONSTRAINT email_messages_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.email_messages DROP CONSTRAINT IF EXISTS email_messages_thread_id_fkey;
ALTER TABLE public.email_messages ADD CONSTRAINT email_messages_thread_id_fkey FOREIGN KEY (thread_id) REFERENCES email_threads(id) ON DELETE CASCADE;
ALTER TABLE public.email_tags DROP CONSTRAINT IF EXISTS email_tags_created_by_fkey;
ALTER TABLE public.email_tags ADD CONSTRAINT email_tags_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.email_tags DROP CONSTRAINT IF EXISTS email_tags_thread_id_fkey;
ALTER TABLE public.email_tags ADD CONSTRAINT email_tags_thread_id_fkey FOREIGN KEY (thread_id) REFERENCES email_threads(id) ON DELETE CASCADE;
ALTER TABLE public.email_threads DROP CONSTRAINT IF EXISTS email_threads_account_id_fkey;
ALTER TABLE public.email_threads ADD CONSTRAINT email_threads_account_id_fkey FOREIGN KEY (account_id) REFERENCES email_accounts(id) ON DELETE SET NULL;
ALTER TABLE public.email_threads DROP CONSTRAINT IF EXISTS email_threads_assigned_to_fkey;
ALTER TABLE public.email_threads ADD CONSTRAINT email_threads_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.invoice_lines DROP CONSTRAINT IF EXISTS invoice_lines_invoice_id_fkey;
ALTER TABLE public.invoice_lines ADD CONSTRAINT invoice_lines_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE;
ALTER TABLE public.invoice_lines DROP CONSTRAINT IF EXISTS invoice_lines_site_id_fkey;
ALTER TABLE public.invoice_lines ADD CONSTRAINT invoice_lines_site_id_fkey FOREIGN KEY (site_id) REFERENCES account_sites(id) ON DELETE SET NULL;
ALTER TABLE public.invoice_lines DROP CONSTRAINT IF EXISTS invoice_lines_work_order_id_fkey;
ALTER TABLE public.invoice_lines ADD CONSTRAINT invoice_lines_work_order_id_fkey FOREIGN KEY (work_order_id) REFERENCES work_orders(id) ON DELETE SET NULL;
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_account_id_fkey;
ALTER TABLE public.invoices ADD CONSTRAINT invoices_account_id_fkey FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE;
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_country_fkey;
ALTER TABLE public.invoices ADD CONSTRAINT invoices_country_fkey FOREIGN KEY (country) REFERENCES markets(country);
ALTER TABLE public.job_events DROP CONSTRAINT IF EXISTS job_events_actor_id_fkey;
ALTER TABLE public.job_events ADD CONSTRAINT job_events_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.job_events DROP CONSTRAINT IF EXISTS job_events_job_id_fkey;
ALTER TABLE public.job_events ADD CONSTRAINT job_events_job_id_fkey FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE;
ALTER TABLE public.job_events DROP CONSTRAINT IF EXISTS job_events_organization_id_fkey;
ALTER TABLE public.job_events ADD CONSTRAINT job_events_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE public.job_events_exec DROP CONSTRAINT IF EXISTS job_events_exec_actor_id_fkey;
ALTER TABLE public.job_events_exec ADD CONSTRAINT job_events_exec_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES auth.users(id);
ALTER TABLE public.job_events_exec DROP CONSTRAINT IF EXISTS job_events_exec_job_id_fkey;
ALTER TABLE public.job_events_exec ADD CONSTRAINT job_events_exec_job_id_fkey FOREIGN KEY (job_id) REFERENCES jobs_execution(id) ON DELETE CASCADE;
ALTER TABLE public.job_materials DROP CONSTRAINT IF EXISTS job_materials_approval_request_id_fkey;
ALTER TABLE public.job_materials ADD CONSTRAINT job_materials_approval_request_id_fkey FOREIGN KEY (approval_request_id) REFERENCES approval_requests(id);
ALTER TABLE public.job_materials DROP CONSTRAINT IF EXISTS job_materials_change_order_id_fkey;
ALTER TABLE public.job_materials ADD CONSTRAINT job_materials_change_order_id_fkey FOREIGN KEY (change_order_id) REFERENCES change_orders(id);
ALTER TABLE public.job_materials DROP CONSTRAINT IF EXISTS job_materials_created_by_fkey;
ALTER TABLE public.job_materials ADD CONSTRAINT job_materials_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);
ALTER TABLE public.job_materials DROP CONSTRAINT IF EXISTS job_materials_job_id_fkey;
ALTER TABLE public.job_materials ADD CONSTRAINT job_materials_job_id_fkey FOREIGN KEY (job_id) REFERENCES jobs_execution(id) ON DELETE CASCADE;
ALTER TABLE public.job_photos DROP CONSTRAINT IF EXISTS job_photos_job_id_fkey;
ALTER TABLE public.job_photos ADD CONSTRAINT job_photos_job_id_fkey FOREIGN KEY (job_id) REFERENCES jobs_execution(id) ON DELETE CASCADE;
ALTER TABLE public.job_photos DROP CONSTRAINT IF EXISTS job_photos_uploaded_by_fkey;
ALTER TABLE public.job_photos ADD CONSTRAINT job_photos_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES auth.users(id);
ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_organization_id_fkey;
ALTER TABLE public.jobs ADD CONSTRAINT jobs_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_quote_id_fkey;
ALTER TABLE public.jobs ADD CONSTRAINT jobs_quote_id_fkey FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE SET NULL;
ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_unit_id_fkey;
ALTER TABLE public.jobs ADD CONSTRAINT jobs_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE SET NULL;
ALTER TABLE public.jobs_execution DROP CONSTRAINT IF EXISTS jobs_execution_lead_id_fkey;
ALTER TABLE public.jobs_execution ADD CONSTRAINT jobs_execution_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES leads(id);
ALTER TABLE public.jobs_execution DROP CONSTRAINT IF EXISTS jobs_execution_opportunity_id_fkey;
ALTER TABLE public.jobs_execution ADD CONSTRAINT jobs_execution_opportunity_id_fkey FOREIGN KEY (opportunity_id) REFERENCES partner_opportunities(id);
ALTER TABLE public.jobs_execution DROP CONSTRAINT IF EXISTS jobs_execution_partner_id_fkey;
ALTER TABLE public.jobs_execution ADD CONSTRAINT jobs_execution_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES partners(id);
ALTER TABLE public.jobs_execution DROP CONSTRAINT IF EXISTS jobs_execution_team_id_fkey;
ALTER TABLE public.jobs_execution ADD CONSTRAINT jobs_execution_team_id_fkey FOREIGN KEY (team_id) REFERENCES internal_teams(id);
ALTER TABLE public.lead_activities DROP CONSTRAINT IF EXISTS lead_activities_actor_id_fkey;
ALTER TABLE public.lead_activities ADD CONSTRAINT lead_activities_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.lead_activities DROP CONSTRAINT IF EXISTS lead_activities_lead_id_fkey;
ALTER TABLE public.lead_activities ADD CONSTRAINT lead_activities_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE;
ALTER TABLE public.lead_attachments DROP CONSTRAINT IF EXISTS lead_attachments_lead_id_fkey;
ALTER TABLE public.lead_attachments ADD CONSTRAINT lead_attachments_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE;
ALTER TABLE public.lead_attachments DROP CONSTRAINT IF EXISTS lead_attachments_uploaded_by_fkey;
ALTER TABLE public.lead_attachments ADD CONSTRAINT lead_attachments_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.lead_duplicates DROP CONSTRAINT IF EXISTS lead_duplicates_existing_lead_id_fkey;
ALTER TABLE public.lead_duplicates ADD CONSTRAINT lead_duplicates_existing_lead_id_fkey FOREIGN KEY (existing_lead_id) REFERENCES leads(id) ON DELETE CASCADE;
ALTER TABLE public.lead_duplicates DROP CONSTRAINT IF EXISTS lead_duplicates_lead_id_fkey;
ALTER TABLE public.lead_duplicates ADD CONSTRAINT lead_duplicates_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE;
ALTER TABLE public.lead_duplicates DROP CONSTRAINT IF EXISTS lead_duplicates_resolved_by_fkey;
ALTER TABLE public.lead_duplicates ADD CONSTRAINT lead_duplicates_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.lead_followups DROP CONSTRAINT IF EXISTS lead_followups_actor_id_fkey;
ALTER TABLE public.lead_followups ADD CONSTRAINT lead_followups_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.lead_followups DROP CONSTRAINT IF EXISTS lead_followups_lead_id_fkey;
ALTER TABLE public.lead_followups ADD CONSTRAINT lead_followups_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE;
ALTER TABLE public.lead_notes DROP CONSTRAINT IF EXISTS lead_notes_actor_id_fkey;
ALTER TABLE public.lead_notes ADD CONSTRAINT lead_notes_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.lead_notes DROP CONSTRAINT IF EXISTS lead_notes_lead_id_fkey;
ALTER TABLE public.lead_notes ADD CONSTRAINT lead_notes_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE;
ALTER TABLE public.lead_queues DROP CONSTRAINT IF EXISTS lead_queues_default_owner_id_fkey;
ALTER TABLE public.lead_queues ADD CONSTRAINT lead_queues_default_owner_id_fkey FOREIGN KEY (default_owner_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.lead_queues DROP CONSTRAINT IF EXISTS lead_queues_default_team_id_fkey;
ALTER TABLE public.lead_queues ADD CONSTRAINT lead_queues_default_team_id_fkey FOREIGN KEY (default_team_id) REFERENCES internal_teams(id) ON DELETE SET NULL;
ALTER TABLE public.lead_risk_signals DROP CONSTRAINT IF EXISTS lead_risk_signals_lead_id_fkey;
ALTER TABLE public.lead_risk_signals ADD CONSTRAINT lead_risk_signals_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE;
ALTER TABLE public.lead_routing_rules DROP CONSTRAINT IF EXISTS lead_routing_rules_queue_id_fkey;
ALTER TABLE public.lead_routing_rules ADD CONSTRAINT lead_routing_rules_queue_id_fkey FOREIGN KEY (queue_id) REFERENCES lead_queues(id) ON DELETE CASCADE;
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_assigned_partner_id_fkey;
ALTER TABLE public.leads ADD CONSTRAINT leads_assigned_partner_id_fkey FOREIGN KEY (assigned_partner_id) REFERENCES partners(id) ON DELETE SET NULL;
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_assigned_team_id_fkey;
ALTER TABLE public.leads ADD CONSTRAINT leads_assigned_team_id_fkey FOREIGN KEY (assigned_team_id) REFERENCES internal_teams(id) ON DELETE SET NULL;
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_category_id_fkey;
ALTER TABLE public.leads ADD CONSTRAINT leads_category_id_fkey FOREIGN KEY (category_id) REFERENCES partner_categories(id) ON DELETE SET NULL;
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_lead_owner_id_fkey;
ALTER TABLE public.leads ADD CONSTRAINT leads_lead_owner_id_fkey FOREIGN KEY (lead_owner_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_locked_by_fkey;
ALTER TABLE public.leads ADD CONSTRAINT leads_locked_by_fkey FOREIGN KEY (locked_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_lost_reason_id_fkey;
ALTER TABLE public.leads ADD CONSTRAINT leads_lost_reason_id_fkey FOREIGN KEY (lost_reason_id) REFERENCES lead_loss_reasons(id) ON DELETE SET NULL;
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_queue_id_fkey;
ALTER TABLE public.leads ADD CONSTRAINT leads_queue_id_fkey FOREIGN KEY (queue_id) REFERENCES lead_queues(id) ON DELETE SET NULL;
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_referred_by_partner_id_fkey;
ALTER TABLE public.leads ADD CONSTRAINT leads_referred_by_partner_id_fkey FOREIGN KEY (referred_by_partner_id) REFERENCES partners(id) ON DELETE SET NULL;
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_source_id_fkey;
ALTER TABLE public.leads ADD CONSTRAINT leads_source_id_fkey FOREIGN KEY (source_id) REFERENCES lead_sources(id) ON DELETE SET NULL;
ALTER TABLE public.notification_log DROP CONSTRAINT IF EXISTS notification_log_lead_id_fkey;
ALTER TABLE public.notification_log ADD CONSTRAINT notification_log_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL;
ALTER TABLE public.notification_log DROP CONSTRAINT IF EXISTS notification_log_partner_id_fkey;
ALTER TABLE public.notification_log ADD CONSTRAINT notification_log_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE SET NULL;
ALTER TABLE public.partner_allocation_stats DROP CONSTRAINT IF EXISTS partner_allocation_stats_category_id_fkey;
ALTER TABLE public.partner_allocation_stats ADD CONSTRAINT partner_allocation_stats_category_id_fkey FOREIGN KEY (category_id) REFERENCES partner_categories(id) ON DELETE SET NULL;
ALTER TABLE public.partner_allocation_stats DROP CONSTRAINT IF EXISTS partner_allocation_stats_partner_id_fkey;
ALTER TABLE public.partner_allocation_stats ADD CONSTRAINT partner_allocation_stats_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE CASCADE;
ALTER TABLE public.partner_contacts DROP CONSTRAINT IF EXISTS partner_contacts_partner_id_fkey;
ALTER TABLE public.partner_contacts ADD CONSTRAINT partner_contacts_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE CASCADE;
ALTER TABLE public.partner_coverage DROP CONSTRAINT IF EXISTS partner_coverage_category_id_fkey;
ALTER TABLE public.partner_coverage ADD CONSTRAINT partner_coverage_category_id_fkey FOREIGN KEY (category_id) REFERENCES partner_categories(id) ON DELETE CASCADE;
ALTER TABLE public.partner_coverage DROP CONSTRAINT IF EXISTS partner_coverage_partner_id_fkey;
ALTER TABLE public.partner_coverage ADD CONSTRAINT partner_coverage_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE CASCADE;
ALTER TABLE public.partner_coverage DROP CONSTRAINT IF EXISTS partner_coverage_zone_id_fkey;
ALTER TABLE public.partner_coverage ADD CONSTRAINT partner_coverage_zone_id_fkey FOREIGN KEY (zone_id) REFERENCES service_zones(id) ON DELETE SET NULL;
ALTER TABLE public.partner_documents DROP CONSTRAINT IF EXISTS partner_documents_partner_id_fkey;
ALTER TABLE public.partner_documents ADD CONSTRAINT partner_documents_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE CASCADE;
ALTER TABLE public.partner_documents DROP CONSTRAINT IF EXISTS partner_documents_reviewed_by_fkey;
ALTER TABLE public.partner_documents ADD CONSTRAINT partner_documents_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.partner_fleet DROP CONSTRAINT IF EXISTS partner_fleet_partner_id_fkey;
ALTER TABLE public.partner_fleet ADD CONSTRAINT partner_fleet_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE CASCADE;
ALTER TABLE public.partner_notes DROP CONSTRAINT IF EXISTS partner_notes_actor_id_fkey;
ALTER TABLE public.partner_notes ADD CONSTRAINT partner_notes_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.partner_notes DROP CONSTRAINT IF EXISTS partner_notes_partner_id_fkey;
ALTER TABLE public.partner_notes ADD CONSTRAINT partner_notes_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE CASCADE;
ALTER TABLE public.partner_opportunities DROP CONSTRAINT IF EXISTS partner_opportunities_lead_id_fkey;
ALTER TABLE public.partner_opportunities ADD CONSTRAINT partner_opportunities_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE;
ALTER TABLE public.partner_opportunities DROP CONSTRAINT IF EXISTS partner_opportunities_partner_id_fkey;
ALTER TABLE public.partner_opportunities ADD CONSTRAINT partner_opportunities_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE CASCADE;
ALTER TABLE public.partner_performance DROP CONSTRAINT IF EXISTS partner_performance_partner_id_fkey;
ALTER TABLE public.partner_performance ADD CONSTRAINT partner_performance_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE CASCADE;
ALTER TABLE public.partner_quotations DROP CONSTRAINT IF EXISTS partner_quotations_opportunity_id_fkey;
ALTER TABLE public.partner_quotations ADD CONSTRAINT partner_quotations_opportunity_id_fkey FOREIGN KEY (opportunity_id) REFERENCES partner_opportunities(id) ON DELETE SET NULL;
ALTER TABLE public.partner_quotations DROP CONSTRAINT IF EXISTS partner_quotations_partner_id_fkey;
ALTER TABLE public.partner_quotations ADD CONSTRAINT partner_quotations_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE CASCADE;
ALTER TABLE public.partner_quotes DROP CONSTRAINT IF EXISTS partner_quotes_lead_id_fkey;
ALTER TABLE public.partner_quotes ADD CONSTRAINT partner_quotes_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE;
ALTER TABLE public.partner_quotes DROP CONSTRAINT IF EXISTS partner_quotes_opportunity_id_fkey;
ALTER TABLE public.partner_quotes ADD CONSTRAINT partner_quotes_opportunity_id_fkey FOREIGN KEY (opportunity_id) REFERENCES partner_opportunities(id) ON DELETE CASCADE;
ALTER TABLE public.partner_quotes DROP CONSTRAINT IF EXISTS partner_quotes_partner_id_fkey;
ALTER TABLE public.partner_quotes ADD CONSTRAINT partner_quotes_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE CASCADE;
ALTER TABLE public.partner_ratings DROP CONSTRAINT IF EXISTS partner_ratings_actor_id_fkey;
ALTER TABLE public.partner_ratings ADD CONSTRAINT partner_ratings_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.partner_ratings DROP CONSTRAINT IF EXISTS partner_ratings_partner_id_fkey;
ALTER TABLE public.partner_ratings ADD CONSTRAINT partner_ratings_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE CASCADE;
ALTER TABLE public.partner_services DROP CONSTRAINT IF EXISTS partner_services_category_id_fkey;
ALTER TABLE public.partner_services ADD CONSTRAINT partner_services_category_id_fkey FOREIGN KEY (category_id) REFERENCES partner_categories(id) ON DELETE RESTRICT;
ALTER TABLE public.partner_services DROP CONSTRAINT IF EXISTS partner_services_partner_id_fkey;
ALTER TABLE public.partner_services ADD CONSTRAINT partner_services_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE CASCADE;
ALTER TABLE public.partner_status_history DROP CONSTRAINT IF EXISTS partner_status_history_actor_id_fkey;
ALTER TABLE public.partner_status_history ADD CONSTRAINT partner_status_history_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.partner_status_history DROP CONSTRAINT IF EXISTS partner_status_history_partner_id_fkey;
ALTER TABLE public.partner_status_history ADD CONSTRAINT partner_status_history_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE CASCADE;
ALTER TABLE public.partner_work_orders DROP CONSTRAINT IF EXISTS partner_work_orders_partner_id_fkey;
ALTER TABLE public.partner_work_orders ADD CONSTRAINT partner_work_orders_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE CASCADE;
ALTER TABLE public.partner_work_orders DROP CONSTRAINT IF EXISTS partner_work_orders_quotation_id_fkey;
ALTER TABLE public.partner_work_orders ADD CONSTRAINT partner_work_orders_quotation_id_fkey FOREIGN KEY (quotation_id) REFERENCES partner_quotations(id) ON DELETE SET NULL;
ALTER TABLE public.partner_workforce DROP CONSTRAINT IF EXISTS partner_workforce_partner_id_fkey;
ALTER TABLE public.partner_workforce ADD CONSTRAINT partner_workforce_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE CASCADE;
ALTER TABLE public.partners DROP CONSTRAINT IF EXISTS partners_account_manager_id_fkey;
ALTER TABLE public.partners ADD CONSTRAINT partners_account_manager_id_fkey FOREIGN KEY (account_manager_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.partners DROP CONSTRAINT IF EXISTS partners_created_by_fkey;
ALTER TABLE public.partners ADD CONSTRAINT partners_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.portfolio_price_overrides DROP CONSTRAINT IF EXISTS portfolio_price_overrides_organization_id_fkey;
ALTER TABLE public.portfolio_price_overrides ADD CONSTRAINT portfolio_price_overrides_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE public.portfolio_price_overrides DROP CONSTRAINT IF EXISTS portfolio_price_overrides_property_id_fkey;
ALTER TABLE public.portfolio_price_overrides ADD CONSTRAINT portfolio_price_overrides_property_id_fkey FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE;
ALTER TABLE public.portfolio_price_overrides DROP CONSTRAINT IF EXISTS portfolio_price_overrides_unit_id_fkey;
ALTER TABLE public.portfolio_price_overrides ADD CONSTRAINT portfolio_price_overrides_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE CASCADE;
ALTER TABLE public.pricing_rules DROP CONSTRAINT IF EXISTS pricing_rules_configuration_id_fkey;
ALTER TABLE public.pricing_rules ADD CONSTRAINT pricing_rules_configuration_id_fkey FOREIGN KEY (configuration_id) REFERENCES pricing_configurations(id) ON DELETE CASCADE;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_organization_id_fkey;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL;
ALTER TABLE public.properties DROP CONSTRAINT IF EXISTS properties_organization_id_fkey;
ALTER TABLE public.properties ADD CONSTRAINT properties_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE public.quotes DROP CONSTRAINT IF EXISTS quotes_pricing_configuration_id_fkey;
ALTER TABLE public.quotes ADD CONSTRAINT quotes_pricing_configuration_id_fkey FOREIGN KEY (pricing_configuration_id) REFERENCES pricing_configurations(id);
ALTER TABLE public.quotes_customer DROP CONSTRAINT IF EXISTS quotes_customer_lead_id_fkey;
ALTER TABLE public.quotes_customer ADD CONSTRAINT quotes_customer_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE;
ALTER TABLE public.quotes_customer DROP CONSTRAINT IF EXISTS quotes_customer_source_quote_id_fkey;
ALTER TABLE public.quotes_customer ADD CONSTRAINT quotes_customer_source_quote_id_fkey FOREIGN KEY (source_quote_id) REFERENCES partner_quotes(id) ON DELETE SET NULL;
ALTER TABLE public.readiness_attestations DROP CONSTRAINT IF EXISTS readiness_attestations_confirmed_by_fkey;
ALTER TABLE public.readiness_attestations ADD CONSTRAINT readiness_attestations_confirmed_by_fkey FOREIGN KEY (confirmed_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.service_catalogue DROP CONSTRAINT IF EXISTS service_catalogue_category_id_fkey;
ALTER TABLE public.service_catalogue ADD CONSTRAINT service_catalogue_category_id_fkey FOREIGN KEY (category_id) REFERENCES partner_categories(id);
ALTER TABLE public.service_rates DROP CONSTRAINT IF EXISTS service_rates_catalogue_id_fkey;
ALTER TABLE public.service_rates ADD CONSTRAINT service_rates_catalogue_id_fkey FOREIGN KEY (catalogue_id) REFERENCES service_catalogue(id) ON DELETE CASCADE;
ALTER TABLE public.service_rates DROP CONSTRAINT IF EXISTS service_rates_country_fkey;
ALTER TABLE public.service_rates ADD CONSTRAINT service_rates_country_fkey FOREIGN KEY (country) REFERENCES markets(country);
ALTER TABLE public.service_schedules DROP CONSTRAINT IF EXISTS service_schedules_site_service_id_fkey;
ALTER TABLE public.service_schedules ADD CONSTRAINT service_schedules_site_service_id_fkey FOREIGN KEY (site_service_id) REFERENCES site_services(id) ON DELETE CASCADE;
ALTER TABLE public.site_services DROP CONSTRAINT IF EXISTS site_services_catalogue_id_fkey;
ALTER TABLE public.site_services ADD CONSTRAINT site_services_catalogue_id_fkey FOREIGN KEY (catalogue_id) REFERENCES service_catalogue(id) ON DELETE RESTRICT;
ALTER TABLE public.site_services DROP CONSTRAINT IF EXISTS site_services_preferred_partner_id_fkey;
ALTER TABLE public.site_services ADD CONSTRAINT site_services_preferred_partner_id_fkey FOREIGN KEY (preferred_partner_id) REFERENCES partners(id) ON DELETE SET NULL;
ALTER TABLE public.site_services DROP CONSTRAINT IF EXISTS site_services_preferred_team_id_fkey;
ALTER TABLE public.site_services ADD CONSTRAINT site_services_preferred_team_id_fkey FOREIGN KEY (preferred_team_id) REFERENCES internal_teams(id) ON DELETE SET NULL;
ALTER TABLE public.site_services DROP CONSTRAINT IF EXISTS site_services_site_id_fkey;
ALTER TABLE public.site_services ADD CONSTRAINT site_services_site_id_fkey FOREIGN KEY (site_id) REFERENCES account_sites(id) ON DELETE CASCADE;
ALTER TABLE public.site_services DROP CONSTRAINT IF EXISTS site_services_sla_fk;
ALTER TABLE public.site_services ADD CONSTRAINT site_services_sla_fk FOREIGN KEY (sla_id) REFERENCES slas(id) ON DELETE SET NULL;
ALTER TABLE public.site_visits DROP CONSTRAINT IF EXISTS site_visits_lead_id_fkey;
ALTER TABLE public.site_visits ADD CONSTRAINT site_visits_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE;
ALTER TABLE public.slas DROP CONSTRAINT IF EXISTS slas_country_fkey;
ALTER TABLE public.slas ADD CONSTRAINT slas_country_fkey FOREIGN KEY (country) REFERENCES markets(country);
ALTER TABLE public.source_costs DROP CONSTRAINT IF EXISTS source_costs_source_id_fkey;
ALTER TABLE public.source_costs ADD CONSTRAINT source_costs_source_id_fkey FOREIGN KEY (source_id) REFERENCES lead_sources(id) ON DELETE CASCADE;
ALTER TABLE public.unit_occupants DROP CONSTRAINT IF EXISTS unit_occupants_organization_id_fkey;
ALTER TABLE public.unit_occupants ADD CONSTRAINT unit_occupants_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE public.unit_occupants DROP CONSTRAINT IF EXISTS unit_occupants_unit_id_fkey;
ALTER TABLE public.unit_occupants ADD CONSTRAINT unit_occupants_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE CASCADE;
ALTER TABLE public.units DROP CONSTRAINT IF EXISTS units_organization_id_fkey;
ALTER TABLE public.units ADD CONSTRAINT units_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE public.units DROP CONSTRAINT IF EXISTS units_property_id_fkey;
ALTER TABLE public.units ADD CONSTRAINT units_property_id_fkey FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE;
ALTER TABLE public.work_orders DROP CONSTRAINT IF EXISTS work_orders_account_id_fkey;
ALTER TABLE public.work_orders ADD CONSTRAINT work_orders_account_id_fkey FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE;
ALTER TABLE public.work_orders DROP CONSTRAINT IF EXISTS work_orders_catalogue_id_fkey;
ALTER TABLE public.work_orders ADD CONSTRAINT work_orders_catalogue_id_fkey FOREIGN KEY (catalogue_id) REFERENCES service_catalogue(id) ON DELETE SET NULL;
ALTER TABLE public.work_orders DROP CONSTRAINT IF EXISTS work_orders_contract_id_fkey;
ALTER TABLE public.work_orders ADD CONSTRAINT work_orders_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE SET NULL;
ALTER TABLE public.work_orders DROP CONSTRAINT IF EXISTS work_orders_invoice_fk;
ALTER TABLE public.work_orders ADD CONSTRAINT work_orders_invoice_fk FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE SET NULL;
ALTER TABLE public.work_orders DROP CONSTRAINT IF EXISTS work_orders_job_execution_id_fkey;
ALTER TABLE public.work_orders ADD CONSTRAINT work_orders_job_execution_id_fkey FOREIGN KEY (job_execution_id) REFERENCES jobs_execution(id) ON DELETE SET NULL;
ALTER TABLE public.work_orders DROP CONSTRAINT IF EXISTS work_orders_lead_id_fkey;
ALTER TABLE public.work_orders ADD CONSTRAINT work_orders_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL;
ALTER TABLE public.work_orders DROP CONSTRAINT IF EXISTS work_orders_opportunity_id_fkey;
ALTER TABLE public.work_orders ADD CONSTRAINT work_orders_opportunity_id_fkey FOREIGN KEY (opportunity_id) REFERENCES partner_opportunities(id) ON DELETE SET NULL;
ALTER TABLE public.work_orders DROP CONSTRAINT IF EXISTS work_orders_partner_id_fkey;
ALTER TABLE public.work_orders ADD CONSTRAINT work_orders_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE SET NULL;
ALTER TABLE public.work_orders DROP CONSTRAINT IF EXISTS work_orders_schedule_id_fkey;
ALTER TABLE public.work_orders ADD CONSTRAINT work_orders_schedule_id_fkey FOREIGN KEY (schedule_id) REFERENCES service_schedules(id) ON DELETE SET NULL;
ALTER TABLE public.work_orders DROP CONSTRAINT IF EXISTS work_orders_site_id_fkey;
ALTER TABLE public.work_orders ADD CONSTRAINT work_orders_site_id_fkey FOREIGN KEY (site_id) REFERENCES account_sites(id) ON DELETE CASCADE;
ALTER TABLE public.work_orders DROP CONSTRAINT IF EXISTS work_orders_sla_id_fkey;
ALTER TABLE public.work_orders ADD CONSTRAINT work_orders_sla_id_fkey FOREIGN KEY (sla_id) REFERENCES slas(id) ON DELETE SET NULL;
ALTER TABLE public.work_orders DROP CONSTRAINT IF EXISTS work_orders_team_id_fkey;
ALTER TABLE public.work_orders ADD CONSTRAINT work_orders_team_id_fkey FOREIGN KEY (team_id) REFERENCES internal_teams(id) ON DELETE SET NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS account_contacts_account_id_idx ON public.account_contacts USING btree (account_id);
CREATE INDEX IF NOT EXISTS account_sites_account_id_idx ON public.account_sites USING btree (account_id);
CREATE INDEX IF NOT EXISTS change_orders_job_idx ON public.change_orders USING btree (job_id);
CREATE UNIQUE INDEX IF NOT EXISTS change_orders_token_idx ON public.change_orders USING btree (public_token) WHERE (public_token <> ''::text);
CREATE INDEX IF NOT EXISTS chat_messages_session_idx ON public.chat_messages USING btree (session_id, created_at);
CREATE INDEX IF NOT EXISTS chat_sessions_ip_idx ON public.chat_sessions USING btree (ip_hash, created_at);
CREATE INDEX IF NOT EXISTS chat_sessions_lead_idx ON public.chat_sessions USING btree (lead_id);
CREATE INDEX IF NOT EXISTS consent_records_booking ON public.consent_records USING btree (booking_reference);
CREATE INDEX IF NOT EXISTS consent_records_partner ON public.consent_records USING btree (partner_reference);
CREATE INDEX IF NOT EXISTS dispatch_runs_started_idx ON public.dispatch_runs USING btree (started_at DESC);
CREATE INDEX IF NOT EXISTS email_assignments_thread_idx ON public.email_assignments USING btree (thread_id, created_at DESC);
CREATE INDEX IF NOT EXISTS email_attachments_message_idx ON public.email_attachments USING btree (message_id);
CREATE INDEX IF NOT EXISTS email_links_entity_idx ON public.email_links USING btree (entity_type, entity_id);
CREATE UNIQUE INDEX IF NOT EXISTS email_messages_message_id_key ON public.email_messages USING btree (message_id) WHERE (message_id <> ''::text);
CREATE INDEX IF NOT EXISTS email_messages_search_idx ON public.email_messages USING gin (to_tsvector('simple'::regconfig, ((((COALESCE(subject, ''::text) || ' '::text) || COALESCE(body_text, ''::text)) || ' '::text) || COALESCE(from_address, ''::text))));
CREATE INDEX IF NOT EXISTS email_messages_thread_idx ON public.email_messages USING btree (thread_id, received_at);
CREATE INDEX IF NOT EXISTS email_threads_assigned_idx ON public.email_threads USING btree (assigned_to);
CREATE INDEX IF NOT EXISTS email_threads_folder_idx ON public.email_threads USING btree (folder, last_message_at DESC);
CREATE INDEX IF NOT EXISTS email_threads_participants_idx ON public.email_threads USING gin (participants);
CREATE UNIQUE INDEX IF NOT EXISTS invoices_one_draft_per_account_period ON public.invoices USING btree (account_id, period_start, period_end) WHERE (status = 'draft'::invoice_status);
CREATE INDEX IF NOT EXISTS job_events_exec_job_idx ON public.job_events_exec USING btree (job_id, created_at DESC);
CREATE INDEX IF NOT EXISTS job_materials_job_idx ON public.job_materials USING btree (job_id);
CREATE INDEX IF NOT EXISTS job_photos_job_idx ON public.job_photos USING btree (job_id);
CREATE INDEX IF NOT EXISTS jobs_execution_lead_idx ON public.jobs_execution USING btree (lead_id);
CREATE INDEX IF NOT EXISTS jobs_execution_partner_idx ON public.jobs_execution USING btree (partner_id);
CREATE INDEX IF NOT EXISTS lead_activities_lead_idx ON public.lead_activities USING btree (lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS lead_duplicates_status_idx ON public.lead_duplicates USING btree (status, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS lead_risk_signals_key ON public.lead_risk_signals USING btree (lead_id, signal);
CREATE INDEX IF NOT EXISTS leads_canton_idx ON public.leads USING btree (canton);
CREATE INDEX IF NOT EXISTS leads_email_key_idx ON public.leads USING btree (lower(customer_email)) WHERE (customer_email <> ''::text);
CREATE INDEX IF NOT EXISTS leads_partner_idx ON public.leads USING btree (assigned_partner_id);
CREATE INDEX IF NOT EXISTS leads_phone_key_idx ON public.leads USING btree (phone_key(customer_phone)) WHERE (customer_phone <> ''::text);
CREATE INDEX IF NOT EXISTS leads_queue_idx ON public.leads USING btree (queue_id, status);
CREATE INDEX IF NOT EXISTS leads_status_idx ON public.leads USING btree (status);
CREATE INDEX IF NOT EXISTS legal_documents_lookup ON public.legal_documents USING btree (country, language, doc_type, status);
CREATE INDEX IF NOT EXISTS notification_log_event_at_idx ON public.notification_log USING btree (event_at DESC);
CREATE INDEX IF NOT EXISTS notification_log_message_id_idx ON public.notification_log USING btree (provider_message_id);
CREATE INDEX IF NOT EXISTS notification_log_status_idx ON public.notification_log USING btree (status, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS partner_allocation_stats_key ON public.partner_allocation_stats USING btree (partner_id, period_start, COALESCE(category_id, '00000000-0000-0000-0000-000000000000'::uuid), canton);
CREATE INDEX IF NOT EXISTS partner_contacts_partner_idx ON public.partner_contacts USING btree (partner_id);
CREATE INDEX IF NOT EXISTS partner_documents_partner_idx ON public.partner_documents USING btree (partner_id);
CREATE INDEX IF NOT EXISTS partner_fleet_partner_idx ON public.partner_fleet USING btree (partner_id);
CREATE INDEX IF NOT EXISTS partner_notes_partner_idx ON public.partner_notes USING btree (partner_id);
CREATE UNIQUE INDEX IF NOT EXISTS partner_quotes_one_accepted_per_lead ON public.partner_quotes USING btree (lead_id) WHERE (status = 'accepted'::partner_quote_status);
CREATE INDEX IF NOT EXISTS partner_ratings_partner_idx ON public.partner_ratings USING btree (partner_id);
CREATE INDEX IF NOT EXISTS partner_services_partner_idx ON public.partner_services USING btree (partner_id);
CREATE INDEX IF NOT EXISTS partner_status_history_partner_idx ON public.partner_status_history USING btree (partner_id);
CREATE INDEX IF NOT EXISTS partner_workforce_partner_idx ON public.partner_workforce USING btree (partner_id);
CREATE INDEX IF NOT EXISTS partners_created_by_idx ON public.partners USING btree (created_by);
CREATE INDEX IF NOT EXISTS portfolio_overrides_property_idx ON public.portfolio_price_overrides USING btree (property_id);
CREATE INDEX IF NOT EXISTS portfolio_overrides_unit_idx ON public.portfolio_price_overrides USING btree (unit_id);
CREATE INDEX IF NOT EXISTS pricing_rules_configuration_idx ON public.pricing_rules USING btree (configuration_id);
CREATE INDEX IF NOT EXISTS service_rates_lookup ON public.service_rates USING btree (catalogue_id, scope, scope_ref);
CREATE INDEX IF NOT EXISTS service_schedules_next_due_on_idx ON public.service_schedules USING btree (next_due_on) WHERE active;
CREATE INDEX IF NOT EXISTS site_services_site_id_idx ON public.site_services USING btree (site_id);
CREATE INDEX IF NOT EXISTS unit_occupants_unit_idx ON public.unit_occupants USING btree (unit_id);
CREATE INDEX IF NOT EXISTS work_orders_account_id_idx ON public.work_orders USING btree (account_id);
CREATE INDEX IF NOT EXISTS work_orders_site_id_idx ON public.work_orders USING btree (site_id);
CREATE INDEX IF NOT EXISTS work_orders_status_idx ON public.work_orders USING btree (status);

-- Views

-- Triggers
DROP TRIGGER IF EXISTS account_contacts_touch ON public.account_contacts;
CREATE TRIGGER account_contacts_touch BEFORE UPDATE ON public.account_contacts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS account_services_touch ON public.account_services;
CREATE TRIGGER account_services_touch BEFORE UPDATE ON public.account_services FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS account_sites_touch ON public.account_sites;
CREATE TRIGGER account_sites_touch BEFORE UPDATE ON public.account_sites FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS accounts_touch ON public.accounts;
CREATE TRIGGER accounts_touch BEFORE UPDATE ON public.accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS allocation_exceptions_updated_at ON public.allocation_exceptions;
CREATE TRIGGER allocation_exceptions_updated_at BEFORE UPDATE ON public.allocation_exceptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS allocation_rules_updated_at ON public.allocation_rules;
CREATE TRIGGER allocation_rules_updated_at BEFORE UPDATE ON public.allocation_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS approval_requests_updated ON public.approval_requests;
CREATE TRIGGER approval_requests_updated BEFORE UPDATE ON public.approval_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS approval_rules_updated ON public.approval_rules;
CREATE TRIGGER approval_rules_updated BEFORE UPDATE ON public.approval_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS cancellation_rules_updated_at ON public.cancellation_rules;
CREATE TRIGGER cancellation_rules_updated_at BEFORE UPDATE ON public.cancellation_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS change_orders_reference ON public.change_orders;
CREATE TRIGGER change_orders_reference BEFORE INSERT ON public.change_orders FOR EACH ROW EXECUTE FUNCTION set_change_order_reference();
DROP TRIGGER IF EXISTS change_orders_updated_at ON public.change_orders;
CREATE TRIGGER change_orders_updated_at BEFORE UPDATE ON public.change_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_chat_sessions_updated_at ON public.chat_sessions;
CREATE TRIGGER update_chat_sessions_updated_at BEFORE UPDATE ON public.chat_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS contracts_reference ON public.contracts;
CREATE TRIGGER contracts_reference BEFORE INSERT ON public.contracts FOR EACH ROW EXECUTE FUNCTION set_contract_reference();
DROP TRIGGER IF EXISTS contracts_touch ON public.contracts;
CREATE TRIGGER contracts_touch BEFORE UPDATE ON public.contracts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS dispatch_automation_updated_at ON public.dispatch_automation;
CREATE TRIGGER dispatch_automation_updated_at BEFORE UPDATE ON public.dispatch_automation FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS exception_rules_updated ON public.exception_rules;
CREATE TRIGGER exception_rules_updated BEFORE UPDATE ON public.exception_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS fairness_rules_updated ON public.fairness_rules;
CREATE TRIGGER fairness_rules_updated BEFORE UPDATE ON public.fairness_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS internal_teams_updated_at ON public.internal_teams;
CREATE TRIGGER internal_teams_updated_at BEFORE UPDATE ON public.internal_teams FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS invoices_qr_reference ON public.invoices;
CREATE TRIGGER invoices_qr_reference BEFORE INSERT ON public.invoices FOR EACH ROW EXECUTE FUNCTION invoices_set_qr_reference();
DROP TRIGGER IF EXISTS invoices_reference ON public.invoices;
CREATE TRIGGER invoices_reference BEFORE INSERT ON public.invoices FOR EACH ROW EXECUTE FUNCTION set_invoice_reference();
DROP TRIGGER IF EXISTS invoices_touch ON public.invoices;
CREATE TRIGGER invoices_touch BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS job_materials_updated_at ON public.job_materials;
CREATE TRIGGER job_materials_updated_at BEFORE UPDATE ON public.job_materials FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS jobs_set_reference ON public.jobs;
CREATE TRIGGER jobs_set_reference BEFORE INSERT ON public.jobs FOR EACH ROW EXECUTE FUNCTION set_job_reference();
DROP TRIGGER IF EXISTS jobs_updated_at ON public.jobs;
CREATE TRIGGER jobs_updated_at BEFORE UPDATE ON public.jobs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS jobs_execution_reference ON public.jobs_execution;
CREATE TRIGGER jobs_execution_reference BEFORE INSERT ON public.jobs_execution FOR EACH ROW EXECUTE FUNCTION set_job_exec_reference();
DROP TRIGGER IF EXISTS jobs_execution_updated_at ON public.jobs_execution;
CREATE TRIGGER jobs_execution_updated_at BEFORE UPDATE ON public.jobs_execution FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS lead_attachments_updated_at ON public.lead_attachments;
CREATE TRIGGER lead_attachments_updated_at BEFORE UPDATE ON public.lead_attachments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS lead_followups_updated_at ON public.lead_followups;
CREATE TRIGGER lead_followups_updated_at BEFORE UPDATE ON public.lead_followups FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS lead_loss_reasons_updated_at ON public.lead_loss_reasons;
CREATE TRIGGER lead_loss_reasons_updated_at BEFORE UPDATE ON public.lead_loss_reasons FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS lead_queues_updated_at ON public.lead_queues;
CREATE TRIGGER lead_queues_updated_at BEFORE UPDATE ON public.lead_queues FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS lead_routing_rules_updated_at ON public.lead_routing_rules;
CREATE TRIGGER lead_routing_rules_updated_at BEFORE UPDATE ON public.lead_routing_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS lead_sources_updated_at ON public.lead_sources;
CREATE TRIGGER lead_sources_updated_at BEFORE UPDATE ON public.lead_sources FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS leads_economics ON public.leads;
CREATE TRIGGER leads_economics AFTER INSERT OR UPDATE OF category_id, canton, city, postcode, estimated_value, travel_cost, acquisition_cost ON public.leads FOR EACH ROW EXECUTE FUNCTION leads_recompute_economics();
DROP TRIGGER IF EXISTS leads_identity_match ON public.leads;
CREATE TRIGGER leads_identity_match AFTER INSERT ON public.leads FOR EACH ROW EXECUTE FUNCTION leads_identity_trigger();
DROP TRIGGER IF EXISTS leads_risk_after_insert ON public.leads;
CREATE TRIGGER leads_risk_after_insert AFTER INSERT ON public.leads FOR EACH ROW EXECUTE FUNCTION leads_risk_trigger();
DROP TRIGGER IF EXISTS leads_set_reference ON public.leads;
CREATE TRIGGER leads_set_reference BEFORE INSERT ON public.leads FOR EACH ROW EXECUTE FUNCTION set_lead_reference();
DROP TRIGGER IF EXISTS leads_updated_at ON public.leads;
CREATE TRIGGER leads_updated_at BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS legal_documents_updated_at ON public.legal_documents;
CREATE TRIGGER legal_documents_updated_at BEFORE UPDATE ON public.legal_documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS legal_entities_sync_market_legal_ready ON public.legal_entities;
CREATE TRIGGER legal_entities_sync_market_legal_ready AFTER INSERT OR UPDATE ON public.legal_entities FOR EACH ROW EXECUTE FUNCTION sync_market_legal_ready();
DROP TRIGGER IF EXISTS legal_entities_updated_at ON public.legal_entities;
CREATE TRIGGER legal_entities_updated_at BEFORE UPDATE ON public.legal_entities FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS notification_log_updated ON public.notification_log;
CREATE TRIGGER notification_log_updated BEFORE UPDATE ON public.notification_log FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS organizations_updated_at ON public.organizations;
CREATE TRIGGER organizations_updated_at BEFORE UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS partner_allocation_stats_updated ON public.partner_allocation_stats;
CREATE TRIGGER partner_allocation_stats_updated BEFORE UPDATE ON public.partner_allocation_stats FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS partner_categories_updated_at ON public.partner_categories;
CREATE TRIGGER partner_categories_updated_at BEFORE UPDATE ON public.partner_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS partner_contacts_updated_at ON public.partner_contacts;
CREATE TRIGGER partner_contacts_updated_at BEFORE UPDATE ON public.partner_contacts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS partner_coverage_updated_at ON public.partner_coverage;
CREATE TRIGGER partner_coverage_updated_at BEFORE UPDATE ON public.partner_coverage FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS partner_documents_protect_review_trg ON public.partner_documents;
CREATE TRIGGER partner_documents_protect_review_trg BEFORE UPDATE ON public.partner_documents FOR EACH ROW EXECUTE FUNCTION partner_documents_protect_review();
DROP TRIGGER IF EXISTS partner_documents_updated_at ON public.partner_documents;
CREATE TRIGGER partner_documents_updated_at BEFORE UPDATE ON public.partner_documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS partner_fleet_updated_at ON public.partner_fleet;
CREATE TRIGGER partner_fleet_updated_at BEFORE UPDATE ON public.partner_fleet FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS partner_opportunities_stats ON public.partner_opportunities;
CREATE TRIGGER partner_opportunities_stats AFTER INSERT OR UPDATE OF status ON public.partner_opportunities FOR EACH ROW EXECUTE FUNCTION opportunity_stats_trigger();
DROP TRIGGER IF EXISTS partner_opportunities_updated_at ON public.partner_opportunities;
CREATE TRIGGER partner_opportunities_updated_at BEFORE UPDATE ON public.partner_opportunities FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS partner_performance_updated_at ON public.partner_performance;
CREATE TRIGGER partner_performance_updated_at BEFORE UPDATE ON public.partner_performance FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS partner_quotations_updated_at ON public.partner_quotations;
CREATE TRIGGER partner_quotations_updated_at BEFORE UPDATE ON public.partner_quotations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS partner_quotes_conflict ON public.partner_quotes;
CREATE TRIGGER partner_quotes_conflict AFTER INSERT ON public.partner_quotes FOR EACH ROW EXECUTE FUNCTION partner_quote_conflict_trigger();
DROP TRIGGER IF EXISTS partner_quotes_set_lead ON public.partner_quotes;
CREATE TRIGGER partner_quotes_set_lead BEFORE INSERT OR UPDATE ON public.partner_quotes FOR EACH ROW EXECUTE FUNCTION set_partner_quote_lead();
DROP TRIGGER IF EXISTS partner_quotes_updated_at ON public.partner_quotes;
CREATE TRIGGER partner_quotes_updated_at BEFORE UPDATE ON public.partner_quotes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS partner_services_updated_at ON public.partner_services;
CREATE TRIGGER partner_services_updated_at BEFORE UPDATE ON public.partner_services FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS partner_work_orders_updated_at ON public.partner_work_orders;
CREATE TRIGGER partner_work_orders_updated_at BEFORE UPDATE ON public.partner_work_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS partner_workforce_updated_at ON public.partner_workforce;
CREATE TRIGGER partner_workforce_updated_at BEFORE UPDATE ON public.partner_workforce FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS partners_set_reference ON public.partners;
CREATE TRIGGER partners_set_reference BEFORE INSERT ON public.partners FOR EACH ROW EXECUTE FUNCTION set_partner_reference();
DROP TRIGGER IF EXISTS partners_updated_at ON public.partners;
CREATE TRIGGER partners_updated_at BEFORE UPDATE ON public.partners FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS portfolio_price_overrides_updated_at ON public.portfolio_price_overrides;
CREATE TRIGGER portfolio_price_overrides_updated_at BEFORE UPDATE ON public.portfolio_price_overrides FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS pricing_configurations_guard_trg ON public.pricing_configurations;
CREATE TRIGGER pricing_configurations_guard_trg BEFORE UPDATE ON public.pricing_configurations FOR EACH ROW EXECUTE FUNCTION pricing_configurations_guard();
DROP TRIGGER IF EXISTS pricing_configurations_updated_at ON public.pricing_configurations;
CREATE TRIGGER pricing_configurations_updated_at BEFORE UPDATE ON public.pricing_configurations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS pricing_rules_guard_trg ON public.pricing_rules;
CREATE TRIGGER pricing_rules_guard_trg BEFORE INSERT OR DELETE OR UPDATE ON public.pricing_rules FOR EACH ROW EXECUTE FUNCTION pricing_rules_guard();
DROP TRIGGER IF EXISTS pricing_rules_updated_at ON public.pricing_rules;
CREATE TRIGGER pricing_rules_updated_at BEFORE UPDATE ON public.pricing_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS profiles_protect_privileged_columns ON public.profiles;
CREATE TRIGGER profiles_protect_privileged_columns BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION profiles_protect_privileged_columns();
DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS properties_updated_at ON public.properties;
CREATE TRIGGER properties_updated_at BEFORE UPDATE ON public.properties FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS quotes_set_reference ON public.quotes;
CREATE TRIGGER quotes_set_reference BEFORE INSERT ON public.quotes FOR EACH ROW EXECUTE FUNCTION set_quote_reference();
DROP TRIGGER IF EXISTS quotes_updated_at ON public.quotes;
CREATE TRIGGER quotes_updated_at BEFORE UPDATE ON public.quotes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS quotes_customer_set_reference ON public.quotes_customer;
CREATE TRIGGER quotes_customer_set_reference BEFORE INSERT ON public.quotes_customer FOR EACH ROW EXECUTE FUNCTION set_customer_quote_reference();
DROP TRIGGER IF EXISTS quotes_customer_updated_at ON public.quotes_customer;
CREATE TRIGGER quotes_customer_updated_at BEFORE UPDATE ON public.quotes_customer FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS resource_availability_updated_at ON public.resource_availability;
CREATE TRIGGER resource_availability_updated_at BEFORE UPDATE ON public.resource_availability FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS retention_rules_updated ON public.retention_rules;
CREATE TRIGGER retention_rules_updated BEFORE UPDATE ON public.retention_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS risk_rules_updated ON public.risk_rules;
CREATE TRIGGER risk_rules_updated BEFORE UPDATE ON public.risk_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS service_catalogue_updated ON public.service_catalogue;
CREATE TRIGGER service_catalogue_updated BEFORE UPDATE ON public.service_catalogue FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS service_rates_updated ON public.service_rates;
CREATE TRIGGER service_rates_updated BEFORE UPDATE ON public.service_rates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS schedules_touch ON public.service_schedules;
CREATE TRIGGER schedules_touch BEFORE UPDATE ON public.service_schedules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS service_zones_updated_at ON public.service_zones;
CREATE TRIGGER service_zones_updated_at BEFORE UPDATE ON public.service_zones FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS site_services_touch ON public.site_services;
CREATE TRIGGER site_services_touch BEFORE UPDATE ON public.site_services FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS site_visits_updated_at ON public.site_visits;
CREATE TRIGGER site_visits_updated_at BEFORE UPDATE ON public.site_visits FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS slas_touch ON public.slas;
CREATE TRIGGER slas_touch BEFORE UPDATE ON public.slas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS source_costs_updated ON public.source_costs;
CREATE TRIGGER source_costs_updated BEFORE UPDATE ON public.source_costs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS unit_occupants_updated_at ON public.unit_occupants;
CREATE TRIGGER unit_occupants_updated_at BEFORE UPDATE ON public.unit_occupants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS units_updated_at ON public.units;
CREATE TRIGGER units_updated_at BEFORE UPDATE ON public.units FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS work_orders_deadlines ON public.work_orders;
CREATE TRIGGER work_orders_deadlines BEFORE INSERT OR UPDATE OF sla_id, reported_at, site_id ON public.work_orders FOR EACH ROW EXECUTE FUNCTION work_orders_set_deadlines();
DROP TRIGGER IF EXISTS work_orders_reference ON public.work_orders;
CREATE TRIGGER work_orders_reference BEFORE INSERT ON public.work_orders FOR EACH ROW EXECUTE FUNCTION set_work_order_reference();
DROP TRIGGER IF EXISTS work_orders_touch ON public.work_orders;
CREATE TRIGGER work_orders_touch BEFORE UPDATE ON public.work_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grants

-- Row level security
ALTER TABLE public.account_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.allocation_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.allocation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cancellation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.change_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consent_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispatch_automation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispatch_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exception_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fairness_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.internal_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_events_exec ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs_execution ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_duplicates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_followups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_loss_reasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_queues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_risk_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_routing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.markets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_allocation_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_coverage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_fleet ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_workforce ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_price_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes_customer ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.readiness_attestations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retention_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retention_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_email_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_catalogue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.source_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unit_occupants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Contacts managed by dispatchers" ON public.account_contacts;
CREATE POLICY "Contacts managed by dispatchers" ON public.account_contacts AS PERMISSIVE FOR ALL TO authenticated
  USING (is_dispatcher())
  WITH CHECK (is_dispatcher());
DROP POLICY IF EXISTS "Contacts readable" ON public.account_contacts;
CREATE POLICY "Contacts readable" ON public.account_contacts AS PERMISSIVE FOR SELECT TO authenticated
  USING (account_visible(account_id));
DROP POLICY IF EXISTS "Account services managed by dispatchers" ON public.account_services;
CREATE POLICY "Account services managed by dispatchers" ON public.account_services AS PERMISSIVE FOR ALL TO authenticated
  USING (is_dispatcher())
  WITH CHECK (is_dispatcher());
DROP POLICY IF EXISTS "Account services readable" ON public.account_services;
CREATE POLICY "Account services readable" ON public.account_services AS PERMISSIVE FOR SELECT TO authenticated
  USING (account_visible(account_id));
DROP POLICY IF EXISTS "Sites managed by dispatchers" ON public.account_sites;
CREATE POLICY "Sites managed by dispatchers" ON public.account_sites AS PERMISSIVE FOR ALL TO authenticated
  USING (is_dispatcher())
  WITH CHECK (is_dispatcher());
DROP POLICY IF EXISTS "Sites readable" ON public.account_sites;
CREATE POLICY "Sites readable" ON public.account_sites AS PERMISSIVE FOR SELECT TO authenticated
  USING (account_visible(account_id));
DROP POLICY IF EXISTS "Accounts managed by dispatchers" ON public.accounts;
CREATE POLICY "Accounts managed by dispatchers" ON public.accounts AS PERMISSIVE FOR ALL TO authenticated
  USING (is_dispatcher())
  WITH CHECK (is_dispatcher());
DROP POLICY IF EXISTS "Accounts readable by staff or owning organisation" ON public.accounts;
CREATE POLICY "Accounts readable by staff or owning organisation" ON public.accounts AS PERMISSIVE FOR SELECT TO authenticated
  USING (account_visible(id));
DROP POLICY IF EXISTS "internal read exceptions" ON public.allocation_exceptions;
CREATE POLICY "internal read exceptions" ON public.allocation_exceptions AS PERMISSIVE FOR SELECT TO authenticated
  USING ((is_staff() OR has_role('ops_manager'::text) OR has_role('partner_manager'::text) OR has_role('sales'::text)));
DROP POLICY IF EXISTS "internal update exceptions" ON public.allocation_exceptions;
CREATE POLICY "internal update exceptions" ON public.allocation_exceptions AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((is_staff() OR has_role('ops_manager'::text)))
  WITH CHECK ((is_staff() OR has_role('ops_manager'::text)));
DROP POLICY IF EXISTS "internal write exceptions" ON public.allocation_exceptions;
CREATE POLICY "internal write exceptions" ON public.allocation_exceptions AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((is_staff() OR has_role('ops_manager'::text)));
DROP POLICY IF EXISTS "internal read rules" ON public.allocation_rules;
CREATE POLICY "internal read rules" ON public.allocation_rules AS PERMISSIVE FOR SELECT TO authenticated
  USING ((is_staff() OR has_role('ops_manager'::text) OR has_role('partner_manager'::text) OR has_role('sales'::text)));
DROP POLICY IF EXISTS "ops update rules" ON public.allocation_rules;
CREATE POLICY "ops update rules" ON public.allocation_rules AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((is_staff() OR has_role('ops_manager'::text)))
  WITH CHECK ((is_staff() OR has_role('ops_manager'::text)));
DROP POLICY IF EXISTS "ops write rules" ON public.allocation_rules;
CREATE POLICY "ops write rules" ON public.allocation_rules AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((is_staff() OR has_role('ops_manager'::text)));
DROP POLICY IF EXISTS "approvals readable by staff" ON public.approval_requests;
CREATE POLICY "approvals readable by staff" ON public.approval_requests AS PERMISSIVE FOR SELECT TO authenticated
  USING (is_dispatcher());
DROP POLICY IF EXISTS "rules readable by staff" ON public.approval_rules;
CREATE POLICY "rules readable by staff" ON public.approval_rules AS PERMISSIVE FOR SELECT TO authenticated
  USING (is_dispatcher());
DROP POLICY IF EXISTS "admins manage cancellation rules" ON public.cancellation_rules;
CREATE POLICY "admins manage cancellation rules" ON public.cancellation_rules AS PERMISSIVE FOR ALL TO authenticated
  USING (is_staff())
  WITH CHECK (is_staff());
DROP POLICY IF EXISTS "cancellation rules readable by signed-in staff" ON public.cancellation_rules;
CREATE POLICY "cancellation rules readable by signed-in staff" ON public.cancellation_rules AS PERMISSIVE FOR SELECT TO authenticated
  USING ((is_dispatcher() OR has_role('finance'::text)));
DROP POLICY IF EXISTS "change orders readable with the job" ON public.change_orders;
CREATE POLICY "change orders readable with the job" ON public.change_orders AS PERMISSIVE FOR SELECT TO authenticated
  USING ((is_dispatcher() OR has_role('finance'::text) OR ((job_id IS NOT NULL) AND can_access_job(job_id))));
DROP POLICY IF EXISTS "Staff read chat messages" ON public.chat_messages;
CREATE POLICY "Staff read chat messages" ON public.chat_messages AS PERMISSIVE FOR SELECT TO authenticated
  USING ((is_staff() OR is_dispatcher()));
DROP POLICY IF EXISTS "Staff read chat sessions" ON public.chat_sessions;
CREATE POLICY "Staff read chat sessions" ON public.chat_sessions AS PERMISSIVE FOR SELECT TO authenticated
  USING ((is_staff() OR is_dispatcher()));
DROP POLICY IF EXISTS "anyone may record their own consent" ON public.consent_records;
CREATE POLICY "anyone may record their own consent" ON public.consent_records AS PERMISSIVE FOR INSERT TO anon,authenticated
  WITH CHECK (true);
DROP POLICY IF EXISTS "staff read consent evidence" ON public.consent_records;
CREATE POLICY "staff read consent evidence" ON public.consent_records AS PERMISSIVE FOR SELECT TO authenticated
  USING (is_zw_admin());
DROP POLICY IF EXISTS "Contract sites managed by dispatchers" ON public.contract_sites;
CREATE POLICY "Contract sites managed by dispatchers" ON public.contract_sites AS PERMISSIVE FOR ALL TO authenticated
  USING (is_dispatcher())
  WITH CHECK (is_dispatcher());
DROP POLICY IF EXISTS "Contract sites readable" ON public.contract_sites;
CREATE POLICY "Contract sites readable" ON public.contract_sites AS PERMISSIVE FOR SELECT TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM contracts c
  WHERE ((c.id = contract_sites.contract_id) AND account_visible(c.account_id)))));
DROP POLICY IF EXISTS "Contracts managed by dispatchers" ON public.contracts;
CREATE POLICY "Contracts managed by dispatchers" ON public.contracts AS PERMISSIVE FOR ALL TO authenticated
  USING (is_dispatcher())
  WITH CHECK (is_dispatcher());
DROP POLICY IF EXISTS "Contracts readable" ON public.contracts;
CREATE POLICY "Contracts readable" ON public.contracts AS PERMISSIVE FOR SELECT TO authenticated
  USING (account_visible(account_id));
DROP POLICY IF EXISTS "Dispatchers can read automation settings" ON public.dispatch_automation;
CREATE POLICY "Dispatchers can read automation settings" ON public.dispatch_automation AS PERMISSIVE FOR SELECT TO authenticated
  USING (is_dispatcher());
DROP POLICY IF EXISTS "Dispatchers can read sweep history" ON public.dispatch_runs;
CREATE POLICY "Dispatchers can read sweep history" ON public.dispatch_runs AS PERMISSIVE FOR SELECT TO authenticated
  USING (is_dispatcher());
DROP POLICY IF EXISTS "email_accounts_staff_read" ON public.email_accounts;
CREATE POLICY "email_accounts_staff_read" ON public.email_accounts AS PERMISSIVE FOR SELECT TO authenticated
  USING (is_staff());
DROP POLICY IF EXISTS "email_accounts_staff_write" ON public.email_accounts;
CREATE POLICY "email_accounts_staff_write" ON public.email_accounts AS PERMISSIVE FOR ALL TO authenticated
  USING (is_staff())
  WITH CHECK (is_staff());
DROP POLICY IF EXISTS "email_assignments_staff_read" ON public.email_assignments;
CREATE POLICY "email_assignments_staff_read" ON public.email_assignments AS PERMISSIVE FOR SELECT TO authenticated
  USING (is_staff());
DROP POLICY IF EXISTS "email_assignments_staff_write" ON public.email_assignments;
CREATE POLICY "email_assignments_staff_write" ON public.email_assignments AS PERMISSIVE FOR ALL TO authenticated
  USING (is_staff())
  WITH CHECK (is_staff());
DROP POLICY IF EXISTS "email_attachments_staff_read" ON public.email_attachments;
CREATE POLICY "email_attachments_staff_read" ON public.email_attachments AS PERMISSIVE FOR SELECT TO authenticated
  USING (is_staff());
DROP POLICY IF EXISTS "email_attachments_staff_write" ON public.email_attachments;
CREATE POLICY "email_attachments_staff_write" ON public.email_attachments AS PERMISSIVE FOR ALL TO authenticated
  USING (is_staff())
  WITH CHECK (is_staff());
DROP POLICY IF EXISTS "email_links_staff_read" ON public.email_links;
CREATE POLICY "email_links_staff_read" ON public.email_links AS PERMISSIVE FOR SELECT TO authenticated
  USING (is_staff());
DROP POLICY IF EXISTS "email_links_staff_write" ON public.email_links;
CREATE POLICY "email_links_staff_write" ON public.email_links AS PERMISSIVE FOR ALL TO authenticated
  USING (is_staff())
  WITH CHECK (is_staff());
DROP POLICY IF EXISTS "email_messages_staff_read" ON public.email_messages;
CREATE POLICY "email_messages_staff_read" ON public.email_messages AS PERMISSIVE FOR SELECT TO authenticated
  USING (is_staff());
DROP POLICY IF EXISTS "email_messages_staff_write" ON public.email_messages;
CREATE POLICY "email_messages_staff_write" ON public.email_messages AS PERMISSIVE FOR ALL TO authenticated
  USING (is_staff())
  WITH CHECK (is_staff());
DROP POLICY IF EXISTS "email_tags_staff_read" ON public.email_tags;
CREATE POLICY "email_tags_staff_read" ON public.email_tags AS PERMISSIVE FOR SELECT TO authenticated
  USING (is_staff());
DROP POLICY IF EXISTS "email_tags_staff_write" ON public.email_tags;
CREATE POLICY "email_tags_staff_write" ON public.email_tags AS PERMISSIVE FOR ALL TO authenticated
  USING (is_staff())
  WITH CHECK (is_staff());
DROP POLICY IF EXISTS "email_threads_staff_read" ON public.email_threads;
CREATE POLICY "email_threads_staff_read" ON public.email_threads AS PERMISSIVE FOR SELECT TO authenticated
  USING (is_staff());
DROP POLICY IF EXISTS "email_threads_staff_write" ON public.email_threads;
CREATE POLICY "email_threads_staff_write" ON public.email_threads AS PERMISSIVE FOR ALL TO authenticated
  USING (is_staff())
  WITH CHECK (is_staff());
DROP POLICY IF EXISTS "Staff can read enquiries" ON public.enquiries;
CREATE POLICY "Staff can read enquiries" ON public.enquiries AS PERMISSIVE FOR SELECT TO authenticated
  USING ((is_staff() OR is_dispatcher()));
DROP POLICY IF EXISTS "exception_rules_read" ON public.exception_rules;
CREATE POLICY "exception_rules_read" ON public.exception_rules AS PERMISSIVE FOR SELECT TO authenticated
  USING (is_dispatcher());
DROP POLICY IF EXISTS "exception_rules_write" ON public.exception_rules;
CREATE POLICY "exception_rules_write" ON public.exception_rules AS PERMISSIVE FOR ALL TO authenticated
  USING ((is_staff() OR has_role('ops_manager'::text)))
  WITH CHECK ((is_staff() OR has_role('ops_manager'::text)));
DROP POLICY IF EXISTS "fairness_rules_read" ON public.fairness_rules;
CREATE POLICY "fairness_rules_read" ON public.fairness_rules AS PERMISSIVE FOR SELECT TO authenticated
  USING (is_dispatcher());
DROP POLICY IF EXISTS "fairness_rules_write" ON public.fairness_rules;
CREATE POLICY "fairness_rules_write" ON public.fairness_rules AS PERMISSIVE FOR ALL TO authenticated
  USING ((is_staff() OR has_role('ops_manager'::text)))
  WITH CHECK ((is_staff() OR has_role('ops_manager'::text)));
DROP POLICY IF EXISTS "ops update teams" ON public.internal_teams;
CREATE POLICY "ops update teams" ON public.internal_teams AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((is_staff() OR has_role('ops_manager'::text)))
  WITH CHECK ((is_staff() OR has_role('ops_manager'::text)));
DROP POLICY IF EXISTS "ops write teams" ON public.internal_teams;
CREATE POLICY "ops write teams" ON public.internal_teams AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((is_staff() OR has_role('ops_manager'::text)));
DROP POLICY IF EXISTS "staff read teams" ON public.internal_teams;
CREATE POLICY "staff read teams" ON public.internal_teams AS PERMISSIVE FOR SELECT TO authenticated
  USING ((is_staff() OR has_role('ops_manager'::text) OR has_role('sales'::text) OR has_role('partner_manager'::text) OR has_role('finance'::text)));
DROP POLICY IF EXISTS "Invoice lines managed by finance and staff" ON public.invoice_lines;
CREATE POLICY "Invoice lines managed by finance and staff" ON public.invoice_lines AS PERMISSIVE FOR ALL TO authenticated
  USING ((is_staff() OR has_role('finance'::text)))
  WITH CHECK ((is_staff() OR has_role('finance'::text)));
DROP POLICY IF EXISTS "Invoice lines readable" ON public.invoice_lines;
CREATE POLICY "Invoice lines readable" ON public.invoice_lines AS PERMISSIVE FOR SELECT TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM invoices i
  WHERE ((i.id = invoice_lines.invoice_id) AND account_visible(i.account_id)))));
DROP POLICY IF EXISTS "Invoices managed by finance and staff" ON public.invoices;
CREATE POLICY "Invoices managed by finance and staff" ON public.invoices AS PERMISSIVE FOR ALL TO authenticated
  USING ((is_staff() OR has_role('finance'::text)))
  WITH CHECK ((is_staff() OR has_role('finance'::text)));
DROP POLICY IF EXISTS "Invoices readable" ON public.invoices;
CREATE POLICY "Invoices readable" ON public.invoices AS PERMISSIVE FOR SELECT TO authenticated
  USING (account_visible(account_id));
DROP POLICY IF EXISTS "Org members create job events" ON public.job_events;
CREATE POLICY "Org members create job events" ON public.job_events AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((organization_id = current_org_id()) OR is_zw_admin()));
DROP POLICY IF EXISTS "Org members read job events" ON public.job_events;
CREATE POLICY "Org members read job events" ON public.job_events AS PERMISSIVE FOR SELECT TO authenticated
  USING (((organization_id = current_org_id()) OR is_zw_admin()));
DROP POLICY IF EXISTS "job events appended with the job" ON public.job_events_exec;
CREATE POLICY "job events appended with the job" ON public.job_events_exec AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((can_access_job(job_id) AND (kind = ANY (ARRAY['note'::job_exec_event_kind, 'photo'::job_exec_event_kind, 'material'::job_exec_event_kind]))));
DROP POLICY IF EXISTS "job events readable with the job" ON public.job_events_exec;
CREATE POLICY "job events readable with the job" ON public.job_events_exec AS PERMISSIVE FOR SELECT TO authenticated
  USING (can_access_job(job_id));
DROP POLICY IF EXISTS "materials readable with the job" ON public.job_materials;
CREATE POLICY "materials readable with the job" ON public.job_materials AS PERMISSIVE FOR SELECT TO authenticated
  USING (can_access_job(job_id));
DROP POLICY IF EXISTS "job photos added with the job" ON public.job_photos;
CREATE POLICY "job photos added with the job" ON public.job_photos AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (can_access_job(job_id));
DROP POLICY IF EXISTS "job photos readable with the job" ON public.job_photos;
CREATE POLICY "job photos readable with the job" ON public.job_photos AS PERMISSIVE FOR SELECT TO authenticated
  USING (can_access_job(job_id));
DROP POLICY IF EXISTS "Org members create jobs" ON public.jobs;
CREATE POLICY "Org members create jobs" ON public.jobs AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((organization_id = current_org_id()) OR is_zw_admin()));
DROP POLICY IF EXISTS "Org members read jobs" ON public.jobs;
CREATE POLICY "Org members read jobs" ON public.jobs AS PERMISSIVE FOR SELECT TO authenticated
  USING (((organization_id = current_org_id()) OR is_zw_admin()));
DROP POLICY IF EXISTS "Org members update jobs" ON public.jobs;
CREATE POLICY "Org members update jobs" ON public.jobs AS PERMISSIVE FOR UPDATE TO authenticated
  USING (((organization_id = current_org_id()) OR is_zw_admin()))
  WITH CHECK (((organization_id = current_org_id()) OR is_zw_admin()));
DROP POLICY IF EXISTS "dispatchers create jobs" ON public.jobs_execution;
CREATE POLICY "dispatchers create jobs" ON public.jobs_execution AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (is_dispatcher());
DROP POLICY IF EXISTS "dispatchers update job planning" ON public.jobs_execution;
CREATE POLICY "dispatchers update job planning" ON public.jobs_execution AS PERMISSIVE FOR UPDATE TO authenticated
  USING (is_dispatcher())
  WITH CHECK (is_dispatcher());
DROP POLICY IF EXISTS "jobs readable by dispatchers and own partner" ON public.jobs_execution;
CREATE POLICY "jobs readable by dispatchers and own partner" ON public.jobs_execution AS PERMISSIVE FOR SELECT TO authenticated
  USING ((is_dispatcher() OR has_role('finance'::text) OR ((partner_id IS NOT NULL) AND (partner_id = current_partner_id()))));
DROP POLICY IF EXISTS "staff append activities" ON public.lead_activities;
CREATE POLICY "staff append activities" ON public.lead_activities AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((is_staff() OR has_role('ops_manager'::text) OR has_role('sales'::text) OR has_role('partner_manager'::text)) AND (actor_id = auth.uid())));
DROP POLICY IF EXISTS "staff read activities" ON public.lead_activities;
CREATE POLICY "staff read activities" ON public.lead_activities AS PERMISSIVE FOR SELECT TO authenticated
  USING ((is_staff() OR has_role('ops_manager'::text) OR has_role('sales'::text) OR has_role('partner_manager'::text) OR has_role('finance'::text)));
DROP POLICY IF EXISTS "internal read attachments" ON public.lead_attachments;
CREATE POLICY "internal read attachments" ON public.lead_attachments AS PERMISSIVE FOR SELECT TO authenticated
  USING ((is_staff() OR has_role('ops_manager'::text) OR has_role('sales'::text) OR has_role('partner_manager'::text)));
DROP POLICY IF EXISTS "internal write attachments" ON public.lead_attachments;
CREATE POLICY "internal write attachments" ON public.lead_attachments AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((is_staff() OR has_role('ops_manager'::text) OR has_role('sales'::text)));
DROP POLICY IF EXISTS "lead_duplicates_staff_read" ON public.lead_duplicates;
CREATE POLICY "lead_duplicates_staff_read" ON public.lead_duplicates AS PERMISSIVE FOR SELECT TO authenticated
  USING (is_staff());
DROP POLICY IF EXISTS "lead_duplicates_staff_write" ON public.lead_duplicates;
CREATE POLICY "lead_duplicates_staff_write" ON public.lead_duplicates AS PERMISSIVE FOR ALL TO authenticated
  USING (is_staff())
  WITH CHECK (is_staff());
DROP POLICY IF EXISTS "internal read followups" ON public.lead_followups;
CREATE POLICY "internal read followups" ON public.lead_followups AS PERMISSIVE FOR SELECT TO authenticated
  USING ((is_staff() OR has_role('ops_manager'::text) OR has_role('sales'::text)));
DROP POLICY IF EXISTS "internal update followups" ON public.lead_followups;
CREATE POLICY "internal update followups" ON public.lead_followups AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((is_staff() OR has_role('ops_manager'::text) OR has_role('sales'::text)))
  WITH CHECK ((is_staff() OR has_role('ops_manager'::text) OR has_role('sales'::text)));
DROP POLICY IF EXISTS "internal write followups" ON public.lead_followups;
CREATE POLICY "internal write followups" ON public.lead_followups AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((is_staff() OR has_role('ops_manager'::text) OR has_role('sales'::text)));
DROP POLICY IF EXISTS "staff read loss reasons" ON public.lead_loss_reasons;
CREATE POLICY "staff read loss reasons" ON public.lead_loss_reasons AS PERMISSIVE FOR SELECT TO authenticated
  USING ((is_staff() OR is_dispatcher()));
DROP POLICY IF EXISTS "internal read notes" ON public.lead_notes;
CREATE POLICY "internal read notes" ON public.lead_notes AS PERMISSIVE FOR SELECT TO authenticated
  USING ((is_staff() OR has_role('ops_manager'::text) OR has_role('sales'::text) OR has_role('partner_manager'::text) OR has_role('finance'::text)));
DROP POLICY IF EXISTS "internal write notes" ON public.lead_notes;
CREATE POLICY "internal write notes" ON public.lead_notes AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((is_staff() OR has_role('ops_manager'::text) OR has_role('sales'::text) OR has_role('partner_manager'::text) OR has_role('finance'::text)) AND (actor_id = auth.uid())));
DROP POLICY IF EXISTS "Admins manage queues" ON public.lead_queues;
CREATE POLICY "Admins manage queues" ON public.lead_queues AS PERMISSIVE FOR ALL TO authenticated
  USING (is_zw_admin())
  WITH CHECK (is_zw_admin());
DROP POLICY IF EXISTS "Staff read queues" ON public.lead_queues;
CREATE POLICY "Staff read queues" ON public.lead_queues AS PERMISSIVE FOR SELECT TO authenticated
  USING ((is_staff() OR is_dispatcher()));
DROP POLICY IF EXISTS "lead_risk_signals_read" ON public.lead_risk_signals;
CREATE POLICY "lead_risk_signals_read" ON public.lead_risk_signals AS PERMISSIVE FOR SELECT TO authenticated
  USING (is_dispatcher());
DROP POLICY IF EXISTS "Admins manage routing" ON public.lead_routing_rules;
CREATE POLICY "Admins manage routing" ON public.lead_routing_rules AS PERMISSIVE FOR ALL TO authenticated
  USING (is_zw_admin())
  WITH CHECK (is_zw_admin());
DROP POLICY IF EXISTS "Staff read routing" ON public.lead_routing_rules;
CREATE POLICY "Staff read routing" ON public.lead_routing_rules AS PERMISSIVE FOR SELECT TO authenticated
  USING ((is_staff() OR is_dispatcher()));
DROP POLICY IF EXISTS "staff read lead sources" ON public.lead_sources;
CREATE POLICY "staff read lead sources" ON public.lead_sources AS PERMISSIVE FOR SELECT TO authenticated
  USING ((is_staff() OR has_role('ops_manager'::text) OR has_role('sales'::text) OR has_role('partner_manager'::text) OR has_role('finance'::text)));
DROP POLICY IF EXISTS "staff insert leads" ON public.leads;
CREATE POLICY "staff insert leads" ON public.leads AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((is_staff() OR has_role('ops_manager'::text) OR has_role('sales'::text)));
DROP POLICY IF EXISTS "staff read leads" ON public.leads;
CREATE POLICY "staff read leads" ON public.leads AS PERMISSIVE FOR SELECT TO authenticated
  USING ((is_staff() OR has_role('ops_manager'::text) OR has_role('sales'::text) OR has_role('partner_manager'::text) OR has_role('finance'::text)));
DROP POLICY IF EXISTS "staff update leads" ON public.leads;
CREATE POLICY "staff update leads" ON public.leads AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((is_staff() OR has_role('ops_manager'::text) OR has_role('sales'::text)))
  WITH CHECK ((is_staff() OR has_role('ops_manager'::text) OR has_role('sales'::text)));
DROP POLICY IF EXISTS "published legal documents are public" ON public.legal_documents;
CREATE POLICY "published legal documents are public" ON public.legal_documents AS PERMISSIVE FOR SELECT TO anon,authenticated
  USING ((status = 'published'::legal_doc_status));
DROP POLICY IF EXISTS "staff add legal documents" ON public.legal_documents;
CREATE POLICY "staff add legal documents" ON public.legal_documents AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (is_zw_admin());
DROP POLICY IF EXISTS "staff edit draft legal documents" ON public.legal_documents;
CREATE POLICY "staff edit draft legal documents" ON public.legal_documents AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((is_zw_admin() AND (status = 'draft'::legal_doc_status)))
  WITH CHECK (is_zw_admin());
DROP POLICY IF EXISTS "staff read all legal documents" ON public.legal_documents;
CREATE POLICY "staff read all legal documents" ON public.legal_documents AS PERMISSIVE FOR SELECT TO authenticated
  USING (is_zw_admin());
DROP POLICY IF EXISTS "staff add legal entities" ON public.legal_entities;
CREATE POLICY "staff add legal entities" ON public.legal_entities AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (is_zw_admin());
DROP POLICY IF EXISTS "staff manage legal entities" ON public.legal_entities;
CREATE POLICY "staff manage legal entities" ON public.legal_entities AS PERMISSIVE FOR UPDATE TO authenticated
  USING (is_zw_admin())
  WITH CHECK (is_zw_admin());
DROP POLICY IF EXISTS "staff read all legal entities" ON public.legal_entities;
CREATE POLICY "staff read all legal entities" ON public.legal_entities AS PERMISSIVE FOR SELECT TO authenticated
  USING (is_zw_admin());
DROP POLICY IF EXISTS "staff read legal entities" ON public.legal_entities;
CREATE POLICY "staff read legal entities" ON public.legal_entities AS PERMISSIVE FOR SELECT TO authenticated
  USING (is_staff());
DROP POLICY IF EXISTS "Markets are readable" ON public.markets;
CREATE POLICY "Markets are readable" ON public.markets AS PERMISSIVE FOR SELECT TO anon,authenticated
  USING (true);
DROP POLICY IF EXISTS "notification_log_read" ON public.notification_log;
CREATE POLICY "notification_log_read" ON public.notification_log AS PERMISSIVE FOR SELECT TO authenticated
  USING (is_dispatcher());
DROP POLICY IF EXISTS "notification_settings_staff_insert" ON public.notification_settings;
CREATE POLICY "notification_settings_staff_insert" ON public.notification_settings AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (is_staff());
DROP POLICY IF EXISTS "notification_settings_staff_read" ON public.notification_settings;
CREATE POLICY "notification_settings_staff_read" ON public.notification_settings AS PERMISSIVE FOR SELECT TO authenticated
  USING (is_staff());
DROP POLICY IF EXISTS "notification_settings_staff_write" ON public.notification_settings;
CREATE POLICY "notification_settings_staff_write" ON public.notification_settings AS PERMISSIVE FOR UPDATE TO authenticated
  USING (is_staff())
  WITH CHECK (is_staff());
DROP POLICY IF EXISTS "Members read own organization" ON public.organizations;
CREATE POLICY "Members read own organization" ON public.organizations AS PERMISSIVE FOR SELECT TO authenticated
  USING (((id = current_org_id()) OR is_zw_admin()));
DROP POLICY IF EXISTS "partner_allocation_stats_read" ON public.partner_allocation_stats;
CREATE POLICY "partner_allocation_stats_read" ON public.partner_allocation_stats AS PERMISSIVE FOR SELECT TO authenticated
  USING (is_dispatcher());
DROP POLICY IF EXISTS "Authenticated read active categories" ON public.partner_categories;
CREATE POLICY "Authenticated read active categories" ON public.partner_categories AS PERMISSIVE FOR SELECT TO authenticated
  USING ((active OR is_staff()));
DROP POLICY IF EXISTS "delete own contacts" ON public.partner_contacts;
CREATE POLICY "delete own contacts" ON public.partner_contacts AS PERMISSIVE FOR DELETE TO authenticated
  USING (((partner_id = current_partner_id()) AND current_partner_editable()));
DROP POLICY IF EXISTS "insert own contacts" ON public.partner_contacts;
CREATE POLICY "insert own contacts" ON public.partner_contacts AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((partner_id = current_partner_id()) AND current_partner_editable()));
DROP POLICY IF EXISTS "read own contacts" ON public.partner_contacts;
CREATE POLICY "read own contacts" ON public.partner_contacts AS PERMISSIVE FOR SELECT TO authenticated
  USING (((partner_id = current_partner_id()) OR is_staff()));
DROP POLICY IF EXISTS "update own contacts" ON public.partner_contacts;
CREATE POLICY "update own contacts" ON public.partner_contacts AS PERMISSIVE FOR UPDATE TO authenticated
  USING (((partner_id = current_partner_id()) AND current_partner_editable()))
  WITH CHECK (((partner_id = current_partner_id()) AND current_partner_editable()));
DROP POLICY IF EXISTS "partner deletes own coverage" ON public.partner_coverage;
CREATE POLICY "partner deletes own coverage" ON public.partner_coverage AS PERMISSIVE FOR DELETE TO authenticated
  USING ((((partner_id = current_partner_id()) AND current_partner_editable()) OR is_staff() OR has_role('partner_manager'::text)));
DROP POLICY IF EXISTS "partner reads own coverage" ON public.partner_coverage;
CREATE POLICY "partner reads own coverage" ON public.partner_coverage AS PERMISSIVE FOR SELECT TO authenticated
  USING (((partner_id = current_partner_id()) OR is_staff() OR has_role('ops_manager'::text) OR has_role('partner_manager'::text)));
DROP POLICY IF EXISTS "partner updates own coverage" ON public.partner_coverage;
CREATE POLICY "partner updates own coverage" ON public.partner_coverage AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((((partner_id = current_partner_id()) AND current_partner_editable()) OR is_staff() OR has_role('partner_manager'::text)))
  WITH CHECK ((((partner_id = current_partner_id()) AND current_partner_editable()) OR is_staff() OR has_role('partner_manager'::text)));
DROP POLICY IF EXISTS "partner writes own coverage" ON public.partner_coverage;
CREATE POLICY "partner writes own coverage" ON public.partner_coverage AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((((partner_id = current_partner_id()) AND current_partner_editable()) OR is_staff() OR has_role('partner_manager'::text)));
DROP POLICY IF EXISTS "insert own documents" ON public.partner_documents;
CREATE POLICY "insert own documents" ON public.partner_documents AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((partner_id = current_partner_id()) AND (status = 'uploaded'::partner_document_status)));
DROP POLICY IF EXISTS "read own documents" ON public.partner_documents;
CREATE POLICY "read own documents" ON public.partner_documents AS PERMISSIVE FOR SELECT TO authenticated
  USING (((partner_id = current_partner_id()) OR is_staff()));
DROP POLICY IF EXISTS "update own documents" ON public.partner_documents;
CREATE POLICY "update own documents" ON public.partner_documents AS PERMISSIVE FOR UPDATE TO authenticated
  USING (((partner_id = current_partner_id()) AND current_partner_editable() AND (status = 'uploaded'::partner_document_status)))
  WITH CHECK (((partner_id = current_partner_id()) AND current_partner_editable() AND (status = 'uploaded'::partner_document_status)));
DROP POLICY IF EXISTS "delete own fleet" ON public.partner_fleet;
CREATE POLICY "delete own fleet" ON public.partner_fleet AS PERMISSIVE FOR DELETE TO authenticated
  USING (((partner_id = current_partner_id()) AND current_partner_editable()));
DROP POLICY IF EXISTS "insert own fleet" ON public.partner_fleet;
CREATE POLICY "insert own fleet" ON public.partner_fleet AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((partner_id = current_partner_id()) AND current_partner_editable()));
DROP POLICY IF EXISTS "read own fleet" ON public.partner_fleet;
CREATE POLICY "read own fleet" ON public.partner_fleet AS PERMISSIVE FOR SELECT TO authenticated
  USING (((partner_id = current_partner_id()) OR is_staff()));
DROP POLICY IF EXISTS "update own fleet" ON public.partner_fleet;
CREATE POLICY "update own fleet" ON public.partner_fleet AS PERMISSIVE FOR UPDATE TO authenticated
  USING (((partner_id = current_partner_id()) AND current_partner_editable()))
  WITH CHECK (((partner_id = current_partner_id()) AND current_partner_editable()));
DROP POLICY IF EXISTS "staff delete notes" ON public.partner_notes;
CREATE POLICY "staff delete notes" ON public.partner_notes AS PERMISSIVE FOR DELETE TO authenticated
  USING (is_staff());
DROP POLICY IF EXISTS "staff read notes" ON public.partner_notes;
CREATE POLICY "staff read notes" ON public.partner_notes AS PERMISSIVE FOR SELECT TO authenticated
  USING (is_staff());
DROP POLICY IF EXISTS "staff update notes" ON public.partner_notes;
CREATE POLICY "staff update notes" ON public.partner_notes AS PERMISSIVE FOR UPDATE TO authenticated
  USING (is_staff())
  WITH CHECK (is_staff());
DROP POLICY IF EXISTS "staff write notes" ON public.partner_notes;
CREATE POLICY "staff write notes" ON public.partner_notes AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((is_staff() AND (actor_id = auth.uid())));
DROP POLICY IF EXISTS "partner reads own opportunities" ON public.partner_opportunities;
CREATE POLICY "partner reads own opportunities" ON public.partner_opportunities AS PERMISSIVE FOR SELECT TO authenticated
  USING (((partner_id = current_partner_id()) OR is_staff() OR has_role('ops_manager'::text) OR has_role('partner_manager'::text) OR has_role('sales'::text)));
DROP POLICY IF EXISTS "read own opportunities" ON public.partner_opportunities;
CREATE POLICY "read own opportunities" ON public.partner_opportunities AS PERMISSIVE FOR SELECT TO authenticated
  USING (((partner_id = current_partner_id()) OR is_staff()));
DROP POLICY IF EXISTS "read performance" ON public.partner_performance;
CREATE POLICY "read performance" ON public.partner_performance AS PERMISSIVE FOR SELECT TO authenticated
  USING (((partner_id = current_partner_id()) OR is_staff() OR has_role('ops_manager'::text) OR has_role('partner_manager'::text) OR has_role('sales'::text)));
DROP POLICY IF EXISTS "read own quotations" ON public.partner_quotations;
CREATE POLICY "read own quotations" ON public.partner_quotations AS PERMISSIVE FOR SELECT TO authenticated
  USING (((partner_id = current_partner_id()) OR is_staff()));
DROP POLICY IF EXISTS "cost visible to owner or permitted roles" ON public.partner_quotes;
CREATE POLICY "cost visible to owner or permitted roles" ON public.partner_quotes AS PERMISSIVE FOR SELECT TO authenticated
  USING (((partner_id = current_partner_id()) OR can_see_costs()));
DROP POLICY IF EXISTS "partner submits own quote" ON public.partner_quotes;
CREATE POLICY "partner submits own quote" ON public.partner_quotes AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((partner_id = current_partner_id()));
DROP POLICY IF EXISTS "partner updates own quote" ON public.partner_quotes;
CREATE POLICY "partner updates own quote" ON public.partner_quotes AS PERMISSIVE FOR UPDATE TO authenticated
  USING (((partner_id = current_partner_id()) OR can_see_costs()))
  WITH CHECK (((partner_id = current_partner_id()) OR can_see_costs()));
DROP POLICY IF EXISTS "staff delete ratings" ON public.partner_ratings;
CREATE POLICY "staff delete ratings" ON public.partner_ratings AS PERMISSIVE FOR DELETE TO authenticated
  USING (is_staff());
DROP POLICY IF EXISTS "staff read ratings" ON public.partner_ratings;
CREATE POLICY "staff read ratings" ON public.partner_ratings AS PERMISSIVE FOR SELECT TO authenticated
  USING (is_staff());
DROP POLICY IF EXISTS "staff update ratings" ON public.partner_ratings;
CREATE POLICY "staff update ratings" ON public.partner_ratings AS PERMISSIVE FOR UPDATE TO authenticated
  USING (is_staff())
  WITH CHECK (is_staff());
DROP POLICY IF EXISTS "staff write ratings" ON public.partner_ratings;
CREATE POLICY "staff write ratings" ON public.partner_ratings AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((is_staff() AND (actor_id = auth.uid())));
DROP POLICY IF EXISTS "delete own services" ON public.partner_services;
CREATE POLICY "delete own services" ON public.partner_services AS PERMISSIVE FOR DELETE TO authenticated
  USING (((partner_id = current_partner_id()) AND current_partner_editable()));
DROP POLICY IF EXISTS "insert own services" ON public.partner_services;
CREATE POLICY "insert own services" ON public.partner_services AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((partner_id = current_partner_id()) AND current_partner_editable()));
DROP POLICY IF EXISTS "read own services" ON public.partner_services;
CREATE POLICY "read own services" ON public.partner_services AS PERMISSIVE FOR SELECT TO authenticated
  USING (((partner_id = current_partner_id()) OR is_staff()));
DROP POLICY IF EXISTS "update own services" ON public.partner_services;
CREATE POLICY "update own services" ON public.partner_services AS PERMISSIVE FOR UPDATE TO authenticated
  USING (((partner_id = current_partner_id()) AND current_partner_editable()))
  WITH CHECK (((partner_id = current_partner_id()) AND current_partner_editable()));
DROP POLICY IF EXISTS "read own status history" ON public.partner_status_history;
CREATE POLICY "read own status history" ON public.partner_status_history AS PERMISSIVE FOR SELECT TO authenticated
  USING (((partner_id = current_partner_id()) OR is_staff()));
DROP POLICY IF EXISTS "read own work orders" ON public.partner_work_orders;
CREATE POLICY "read own work orders" ON public.partner_work_orders AS PERMISSIVE FOR SELECT TO authenticated
  USING (((partner_id = current_partner_id()) OR is_staff()));
DROP POLICY IF EXISTS "delete own workforce" ON public.partner_workforce;
CREATE POLICY "delete own workforce" ON public.partner_workforce AS PERMISSIVE FOR DELETE TO authenticated
  USING (((partner_id = current_partner_id()) AND current_partner_editable()));
DROP POLICY IF EXISTS "insert own workforce" ON public.partner_workforce;
CREATE POLICY "insert own workforce" ON public.partner_workforce AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((partner_id = current_partner_id()) AND current_partner_editable()));
DROP POLICY IF EXISTS "read own workforce" ON public.partner_workforce;
CREATE POLICY "read own workforce" ON public.partner_workforce AS PERMISSIVE FOR SELECT TO authenticated
  USING (((partner_id = current_partner_id()) OR is_staff()));
DROP POLICY IF EXISTS "update own workforce" ON public.partner_workforce;
CREATE POLICY "update own workforce" ON public.partner_workforce AS PERMISSIVE FOR UPDATE TO authenticated
  USING (((partner_id = current_partner_id()) AND current_partner_editable()))
  WITH CHECK (((partner_id = current_partner_id()) AND current_partner_editable()));
DROP POLICY IF EXISTS "Partner creates own draft" ON public.partners;
CREATE POLICY "Partner creates own draft" ON public.partners AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((created_by = auth.uid()) AND (status = 'draft'::partner_status)));
DROP POLICY IF EXISTS "Partner reads own record" ON public.partners;
CREATE POLICY "Partner reads own record" ON public.partners AS PERMISSIVE FOR SELECT TO authenticated
  USING (((created_by = auth.uid()) OR is_staff()));
DROP POLICY IF EXISTS "Partner updates own editable record" ON public.partners;
CREATE POLICY "Partner updates own editable record" ON public.partners AS PERMISSIVE FOR UPDATE TO authenticated
  USING (((created_by = auth.uid()) AND (status = ANY (ARRAY['draft'::partner_status, 'more_info_required'::partner_status]))))
  WITH CHECK (((created_by = auth.uid()) AND (status = ANY (ARRAY['draft'::partner_status, 'more_info_required'::partner_status]))));
DROP POLICY IF EXISTS "portfolio_overrides_insert_own_org" ON public.portfolio_price_overrides;
CREATE POLICY "portfolio_overrides_insert_own_org" ON public.portfolio_price_overrides AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((organization_id = current_org_id()) OR is_zw_admin()));
DROP POLICY IF EXISTS "portfolio_overrides_select_own_org" ON public.portfolio_price_overrides;
CREATE POLICY "portfolio_overrides_select_own_org" ON public.portfolio_price_overrides AS PERMISSIVE FOR SELECT TO authenticated
  USING (((organization_id = current_org_id()) OR is_zw_admin()));
DROP POLICY IF EXISTS "portfolio_overrides_update_own_org" ON public.portfolio_price_overrides;
CREATE POLICY "portfolio_overrides_update_own_org" ON public.portfolio_price_overrides AS PERMISSIVE FOR UPDATE TO authenticated
  USING (((organization_id = current_org_id()) OR is_zw_admin()))
  WITH CHECK (((organization_id = current_org_id()) OR is_zw_admin()));
DROP POLICY IF EXISTS "Staff manage pricing configurations" ON public.pricing_configurations;
CREATE POLICY "Staff manage pricing configurations" ON public.pricing_configurations AS PERMISSIVE FOR ALL TO authenticated
  USING (is_staff())
  WITH CHECK (is_staff());
DROP POLICY IF EXISTS "Staff read pricing configurations" ON public.pricing_configurations;
CREATE POLICY "Staff read pricing configurations" ON public.pricing_configurations AS PERMISSIVE FOR SELECT TO authenticated
  USING (is_staff());
DROP POLICY IF EXISTS "Staff manage pricing rules" ON public.pricing_rules;
CREATE POLICY "Staff manage pricing rules" ON public.pricing_rules AS PERMISSIVE FOR ALL TO authenticated
  USING (is_staff())
  WITH CHECK (is_staff());
DROP POLICY IF EXISTS "Staff read pricing rules" ON public.pricing_rules;
CREATE POLICY "Staff read pricing rules" ON public.pricing_rules AS PERMISSIVE FOR SELECT TO authenticated
  USING (is_staff());
DROP POLICY IF EXISTS "Users read own profile" ON public.profiles;
CREATE POLICY "Users read own profile" ON public.profiles AS PERMISSIVE FOR SELECT TO authenticated
  USING (((id = auth.uid()) OR is_zw_admin()));
DROP POLICY IF EXISTS "Users update own profile language" ON public.profiles;
CREATE POLICY "Users update own profile language" ON public.profiles AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((id = auth.uid()))
  WITH CHECK ((id = auth.uid()));
DROP POLICY IF EXISTS "Org members create properties" ON public.properties;
CREATE POLICY "Org members create properties" ON public.properties AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((organization_id = current_org_id()) OR is_zw_admin()));
DROP POLICY IF EXISTS "Org members read properties" ON public.properties;
CREATE POLICY "Org members read properties" ON public.properties AS PERMISSIVE FOR SELECT TO authenticated
  USING (((organization_id = current_org_id()) OR is_zw_admin()));
DROP POLICY IF EXISTS "Org members update properties" ON public.properties;
CREATE POLICY "Org members update properties" ON public.properties AS PERMISSIVE FOR UPDATE TO authenticated
  USING (((organization_id = current_org_id()) OR is_zw_admin()))
  WITH CHECK (((organization_id = current_org_id()) OR is_zw_admin()));
DROP POLICY IF EXISTS "Staff can read quotes" ON public.quotes;
CREATE POLICY "Staff can read quotes" ON public.quotes AS PERMISSIVE FOR SELECT TO authenticated
  USING ((is_staff() OR is_dispatcher()));
DROP POLICY IF EXISTS "Staff can update quotes" ON public.quotes;
CREATE POLICY "Staff can update quotes" ON public.quotes AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((is_staff() OR is_dispatcher()))
  WITH CHECK ((is_staff() OR is_dispatcher()));
DROP POLICY IF EXISTS "internal read customer quotes" ON public.quotes_customer;
CREATE POLICY "internal read customer quotes" ON public.quotes_customer AS PERMISSIVE FOR SELECT TO authenticated
  USING ((is_staff() OR has_role('ops_manager'::text) OR has_role('sales'::text) OR has_role('finance'::text)));
DROP POLICY IF EXISTS "internal update customer quotes" ON public.quotes_customer;
CREATE POLICY "internal update customer quotes" ON public.quotes_customer AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((is_staff() OR has_role('ops_manager'::text) OR has_role('sales'::text)))
  WITH CHECK ((is_staff() OR has_role('ops_manager'::text) OR has_role('sales'::text)));
DROP POLICY IF EXISTS "internal write customer quotes" ON public.quotes_customer;
CREATE POLICY "internal write customer quotes" ON public.quotes_customer AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((is_staff() OR has_role('ops_manager'::text) OR has_role('sales'::text)));
DROP POLICY IF EXISTS "staff read attestations" ON public.readiness_attestations;
CREATE POLICY "staff read attestations" ON public.readiness_attestations AS PERMISSIVE FOR SELECT TO authenticated
  USING (is_staff());
DROP POLICY IF EXISTS "staff update attestations" ON public.readiness_attestations;
CREATE POLICY "staff update attestations" ON public.readiness_attestations AS PERMISSIVE FOR UPDATE TO authenticated
  USING (is_staff())
  WITH CHECK (is_staff());
DROP POLICY IF EXISTS "staff write attestations" ON public.readiness_attestations;
CREATE POLICY "staff write attestations" ON public.readiness_attestations AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((is_staff() AND (confirmed_by = auth.uid())));
DROP POLICY IF EXISTS "delete availability" ON public.resource_availability;
CREATE POLICY "delete availability" ON public.resource_availability AS PERMISSIVE FOR DELETE TO authenticated
  USING ((is_staff() OR has_role('ops_manager'::text) OR ((resource_kind = 'partner'::resource_kind) AND (resource_id = current_partner_id()))));
DROP POLICY IF EXISTS "read availability" ON public.resource_availability;
CREATE POLICY "read availability" ON public.resource_availability AS PERMISSIVE FOR SELECT TO authenticated
  USING ((is_staff() OR has_role('ops_manager'::text) OR has_role('partner_manager'::text) OR has_role('sales'::text) OR ((resource_kind = 'partner'::resource_kind) AND (resource_id = current_partner_id()))));
DROP POLICY IF EXISTS "update availability" ON public.resource_availability;
CREATE POLICY "update availability" ON public.resource_availability AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((is_staff() OR has_role('ops_manager'::text) OR ((resource_kind = 'partner'::resource_kind) AND (resource_id = current_partner_id()))))
  WITH CHECK ((is_staff() OR has_role('ops_manager'::text) OR ((resource_kind = 'partner'::resource_kind) AND (resource_id = current_partner_id()))));
DROP POLICY IF EXISTS "write availability" ON public.resource_availability;
CREATE POLICY "write availability" ON public.resource_availability AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((is_staff() OR has_role('ops_manager'::text) OR ((resource_kind = 'partner'::resource_kind) AND (resource_id = current_partner_id()))));
DROP POLICY IF EXISTS "retention_rules_read" ON public.retention_rules;
CREATE POLICY "retention_rules_read" ON public.retention_rules AS PERMISSIVE FOR SELECT TO authenticated
  USING (is_dispatcher());
DROP POLICY IF EXISTS "retention_rules_write" ON public.retention_rules;
CREATE POLICY "retention_rules_write" ON public.retention_rules AS PERMISSIVE FOR ALL TO authenticated
  USING (is_staff())
  WITH CHECK (is_staff());
DROP POLICY IF EXISTS "retention_runs_read" ON public.retention_runs;
CREATE POLICY "retention_runs_read" ON public.retention_runs AS PERMISSIVE FOR SELECT TO authenticated
  USING (is_dispatcher());
DROP POLICY IF EXISTS "risk_email_domains_read" ON public.risk_email_domains;
CREATE POLICY "risk_email_domains_read" ON public.risk_email_domains AS PERMISSIVE FOR SELECT TO authenticated
  USING (is_dispatcher());
DROP POLICY IF EXISTS "risk_email_domains_write" ON public.risk_email_domains;
CREATE POLICY "risk_email_domains_write" ON public.risk_email_domains AS PERMISSIVE FOR ALL TO authenticated
  USING ((is_staff() OR has_role('ops_manager'::text)))
  WITH CHECK ((is_staff() OR has_role('ops_manager'::text)));
DROP POLICY IF EXISTS "risk_rules_read" ON public.risk_rules;
CREATE POLICY "risk_rules_read" ON public.risk_rules AS PERMISSIVE FOR SELECT TO authenticated
  USING (is_dispatcher());
DROP POLICY IF EXISTS "risk_rules_write" ON public.risk_rules;
CREATE POLICY "risk_rules_write" ON public.risk_rules AS PERMISSIVE FOR ALL TO authenticated
  USING ((is_staff() OR has_role('ops_manager'::text)))
  WITH CHECK ((is_staff() OR has_role('ops_manager'::text)));
DROP POLICY IF EXISTS "catalogue readable by staff" ON public.service_catalogue;
CREATE POLICY "catalogue readable by staff" ON public.service_catalogue AS PERMISSIVE FOR SELECT TO authenticated
  USING (is_dispatcher());
DROP POLICY IF EXISTS "rates readable by staff" ON public.service_rates;
CREATE POLICY "rates readable by staff" ON public.service_rates AS PERMISSIVE FOR SELECT TO authenticated
  USING (is_dispatcher());
DROP POLICY IF EXISTS "Schedules managed by dispatchers" ON public.service_schedules;
CREATE POLICY "Schedules managed by dispatchers" ON public.service_schedules AS PERMISSIVE FOR ALL TO authenticated
  USING (is_dispatcher())
  WITH CHECK (is_dispatcher());
DROP POLICY IF EXISTS "Schedules readable" ON public.service_schedules;
CREATE POLICY "Schedules readable" ON public.service_schedules AS PERMISSIVE FOR SELECT TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM (site_services ss
     JOIN account_sites s ON ((s.id = ss.site_id)))
  WHERE ((ss.id = service_schedules.site_service_id) AND account_visible(s.account_id)))));
DROP POLICY IF EXISTS "authenticated read zones" ON public.service_zones;
CREATE POLICY "authenticated read zones" ON public.service_zones AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);
DROP POLICY IF EXISTS "Site services managed by dispatchers" ON public.site_services;
CREATE POLICY "Site services managed by dispatchers" ON public.site_services AS PERMISSIVE FOR ALL TO authenticated
  USING (is_dispatcher())
  WITH CHECK (is_dispatcher());
DROP POLICY IF EXISTS "Site services readable" ON public.site_services;
CREATE POLICY "Site services readable" ON public.site_services AS PERMISSIVE FOR SELECT TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM account_sites s
  WHERE ((s.id = site_services.site_id) AND account_visible(s.account_id)))));
DROP POLICY IF EXISTS "internal read visits" ON public.site_visits;
CREATE POLICY "internal read visits" ON public.site_visits AS PERMISSIVE FOR SELECT TO authenticated
  USING ((is_staff() OR has_role('ops_manager'::text) OR has_role('sales'::text) OR ((assigned_kind = 'partner'::resource_kind) AND (assigned_id = current_partner_id()))));
DROP POLICY IF EXISTS "internal update visits" ON public.site_visits;
CREATE POLICY "internal update visits" ON public.site_visits AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((is_staff() OR has_role('ops_manager'::text) OR has_role('sales'::text)))
  WITH CHECK ((is_staff() OR has_role('ops_manager'::text) OR has_role('sales'::text)));
DROP POLICY IF EXISTS "internal write visits" ON public.site_visits;
CREATE POLICY "internal write visits" ON public.site_visits AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((is_staff() OR has_role('ops_manager'::text) OR has_role('sales'::text)));
DROP POLICY IF EXISTS "SLAs managed by staff" ON public.slas;
CREATE POLICY "SLAs managed by staff" ON public.slas AS PERMISSIVE FOR ALL TO authenticated
  USING (is_staff())
  WITH CHECK (is_staff());
DROP POLICY IF EXISTS "SLAs readable by staff and linked customers" ON public.slas;
CREATE POLICY "SLAs readable by staff and linked customers" ON public.slas AS PERMISSIVE FOR SELECT TO authenticated
  USING ((is_dispatcher() OR is_staff() OR (EXISTS ( SELECT 1
   FROM contracts c
  WHERE ((c.sla_id = slas.id) AND account_visible(c.account_id)))) OR (EXISTS ( SELECT 1
   FROM account_services s
  WHERE ((s.sla_id = slas.id) AND account_visible(s.account_id)))) OR (EXISTS ( SELECT 1
   FROM (site_services ss
     JOIN account_sites st ON ((st.id = ss.site_id)))
  WHERE ((ss.sla_id = slas.id) AND account_visible(st.account_id))))));
DROP POLICY IF EXISTS "source_costs_read" ON public.source_costs;
CREATE POLICY "source_costs_read" ON public.source_costs AS PERMISSIVE FOR SELECT TO authenticated
  USING ((is_staff() OR has_role('ops_manager'::text) OR has_role('finance'::text)));
DROP POLICY IF EXISTS "source_costs_write" ON public.source_costs;
CREATE POLICY "source_costs_write" ON public.source_costs AS PERMISSIVE FOR ALL TO authenticated
  USING ((is_staff() OR has_role('finance'::text)))
  WITH CHECK ((is_staff() OR has_role('finance'::text)));
DROP POLICY IF EXISTS "unit_occupants_insert_own_org" ON public.unit_occupants;
CREATE POLICY "unit_occupants_insert_own_org" ON public.unit_occupants AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((organization_id = current_org_id()) OR is_zw_admin()));
DROP POLICY IF EXISTS "unit_occupants_select_own_org" ON public.unit_occupants;
CREATE POLICY "unit_occupants_select_own_org" ON public.unit_occupants AS PERMISSIVE FOR SELECT TO authenticated
  USING (((organization_id = current_org_id()) OR is_zw_admin()));
DROP POLICY IF EXISTS "unit_occupants_update_own_org" ON public.unit_occupants;
CREATE POLICY "unit_occupants_update_own_org" ON public.unit_occupants AS PERMISSIVE FOR UPDATE TO authenticated
  USING (((organization_id = current_org_id()) OR is_zw_admin()))
  WITH CHECK (((organization_id = current_org_id()) OR is_zw_admin()));
DROP POLICY IF EXISTS "Org members create units" ON public.units;
CREATE POLICY "Org members create units" ON public.units AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((organization_id = current_org_id()) OR is_zw_admin()));
DROP POLICY IF EXISTS "Org members read units" ON public.units;
CREATE POLICY "Org members read units" ON public.units AS PERMISSIVE FOR SELECT TO authenticated
  USING (((organization_id = current_org_id()) OR is_zw_admin()));
DROP POLICY IF EXISTS "Org members update units" ON public.units;
CREATE POLICY "Org members update units" ON public.units AS PERMISSIVE FOR UPDATE TO authenticated
  USING (((organization_id = current_org_id()) OR is_zw_admin()))
  WITH CHECK (((organization_id = current_org_id()) OR is_zw_admin()));
DROP POLICY IF EXISTS "Work orders managed by dispatchers" ON public.work_orders;
CREATE POLICY "Work orders managed by dispatchers" ON public.work_orders AS PERMISSIVE FOR ALL TO authenticated
  USING (is_dispatcher())
  WITH CHECK (is_dispatcher());
DROP POLICY IF EXISTS "Work orders readable" ON public.work_orders;
CREATE POLICY "Work orders readable" ON public.work_orders AS PERMISSIVE FOR SELECT TO authenticated
  USING (account_visible(account_id));
