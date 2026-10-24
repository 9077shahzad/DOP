ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS review_submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS review_status text NOT NULL DEFAULT 'not_submitted',
  ADD COLUMN IF NOT EXISTS internal_notified_at timestamptz,
  ADD COLUMN IF NOT EXISTS internal_notify_error text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS customer_notified_at timestamptz,
  ADD COLUMN IF NOT EXISTS customer_notify_error text NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS quotes_review_submitted_at_idx ON public.quotes (review_submitted_at DESC);