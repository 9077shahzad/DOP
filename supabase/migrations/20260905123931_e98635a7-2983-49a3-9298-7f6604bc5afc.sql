ALTER TYPE public.job_exec_status ADD VALUE IF NOT EXISTS 'assigned' BEFORE 'en_route';
ALTER TYPE public.job_exec_status ADD VALUE IF NOT EXISTS 'loading' AFTER 'in_progress';
ALTER TYPE public.job_exec_status ADD VALUE IF NOT EXISTS 'in_transit' AFTER 'loading';
ALTER TYPE public.job_exec_status ADD VALUE IF NOT EXISTS 'unloading' AFTER 'in_transit';

ALTER TABLE public.jobs_execution
  ADD COLUMN IF NOT EXISTS quote_id uuid REFERENCES public.quotes_customer(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS quote_reference text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS lead_reference text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS customer_name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS customer_email text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS customer_phone text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS customer_language text NOT NULL DEFAULT 'de',
  ADD COLUMN IF NOT EXISTS service_key text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS origin jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS destination jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS inventory jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS extras jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS scheduled_end timestamptz,
  ADD COLUMN IF NOT EXISTS vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS booking_notes text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS booked_at timestamptz,
  ADD COLUMN IF NOT EXISTS booked_by uuid;

CREATE INDEX IF NOT EXISTS jobs_execution_quote_idx ON public.jobs_execution (quote_id);
CREATE INDEX IF NOT EXISTS jobs_execution_team_window_idx ON public.jobs_execution (team_id, scheduled_start);
CREATE INDEX IF NOT EXISTS jobs_execution_vehicle_window_idx ON public.jobs_execution (vehicle_id, scheduled_start);