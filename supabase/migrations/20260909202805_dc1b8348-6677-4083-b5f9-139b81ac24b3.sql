ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS pricing_mode text NOT NULL DEFAULT 'flat',
  ADD COLUMN IF NOT EXISTS billing_basis jsonb,
  ADD COLUMN IF NOT EXISTS options jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS accepted_version integer,
  ADD COLUMN IF NOT EXISTS accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS accepted_by_name text,
  ADD COLUMN IF NOT EXISTS accepted_options jsonb;

ALTER TABLE public.quotes
  ADD CONSTRAINT quotes_pricing_mode_check CHECK (pricing_mode IN ('flat','hourly'));

CREATE TABLE IF NOT EXISTS public.quote_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  version integer NOT NULL,
  pricing_mode text NOT NULL DEFAULT 'flat',
  line_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  billing_basis jsonb,
  subtotal numeric(12,2) NOT NULL DEFAULT 0,
  discount numeric(12,2) NOT NULL DEFAULT 0,
  net numeric(12,2) NOT NULL DEFAULT 0,
  vat_rate numeric(6,4) NOT NULL DEFAULT 0,
  vat numeric(12,2) NOT NULL DEFAULT 0,
  total numeric(12,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'CHF',
  pricing_configuration_id uuid REFERENCES public.pricing_configurations(id),
  minimum_billing jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (quote_id, version)
);

GRANT SELECT, INSERT ON public.quote_versions TO authenticated;
GRANT ALL ON public.quote_versions TO service_role;

ALTER TABLE public.quote_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff read quote versions"
  ON public.quote_versions FOR SELECT TO authenticated
  USING (public.is_staff());

CREATE POLICY "Staff create quote versions"
  ON public.quote_versions FOR INSERT TO authenticated
  WITH CHECK (public.is_staff());

CREATE INDEX IF NOT EXISTS quote_versions_quote_idx ON public.quote_versions (quote_id, version DESC);