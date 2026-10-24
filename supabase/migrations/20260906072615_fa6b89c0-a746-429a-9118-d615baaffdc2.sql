CREATE TABLE public.swiss_postcodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plz integer NOT NULL CHECK (plz BETWEEN 1000 AND 9999),
  locality text NOT NULL,
  canton text NOT NULL CHECK (canton ~ '^[A-Z]{2}$'),
  municipality text,
  bfs_nr integer,
  language text,
  source text NOT NULL,
  dataset_version text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (plz, locality, canton)
);

CREATE INDEX swiss_postcodes_plz_idx ON public.swiss_postcodes (plz);

GRANT SELECT ON public.swiss_postcodes TO anon, authenticated;
GRANT ALL ON public.swiss_postcodes TO service_role;

ALTER TABLE public.swiss_postcodes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Postcode directory is public reference data"
  ON public.swiss_postcodes FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE TRIGGER update_swiss_postcodes_updated_at
  BEFORE UPDATE ON public.swiss_postcodes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();