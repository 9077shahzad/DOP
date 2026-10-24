CREATE TABLE public.quote_attachments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id uuid NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  storage_path text NOT NULL UNIQUE,
  file_name text NOT NULL DEFAULT '',
  mime_type text NOT NULL DEFAULT '',
  size_bytes bigint NOT NULL DEFAULT 0,
  kind text NOT NULL DEFAULT 'other',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX quote_attachments_quote_idx ON public.quote_attachments(quote_id);

GRANT SELECT, DELETE ON public.quote_attachments TO authenticated;
GRANT ALL ON public.quote_attachments TO service_role;

ALTER TABLE public.quote_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff read quote attachments" ON public.quote_attachments
  FOR SELECT TO authenticated USING (public.is_staff());

CREATE POLICY "staff delete quote attachments" ON public.quote_attachments
  FOR DELETE TO authenticated USING (public.is_staff());

CREATE TRIGGER quote_attachments_updated_at
  BEFORE UPDATE ON public.quote_attachments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Customer-side linking: verified by the contact the offer was requested with.
-- Stores files only; the offer, its price and its scope are never touched.
CREATE OR REPLACE FUNCTION public.attach_quote_files(
  _reference text, _contact text, _draft text, _files jsonb
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  q public.quotes%ROWTYPE;
  f jsonb;
  path text;
  mime text;
  n int := 0;
BEGIN
  IF _draft IS NULL OR btrim(_draft) = '' THEN RETURN 0; END IF;

  SELECT * INTO q FROM public.quotes WHERE reference = btrim(_reference);
  IF NOT FOUND THEN RETURN 0; END IF;
  IF NOT public.quote_contact_matches(q.id, _contact) THEN RETURN 0; END IF;

  FOR f IN SELECT * FROM jsonb_array_elements(coalesce(_files, '[]'::jsonb)) LOOP
    path := coalesce(f->>'storage_path', '');
    mime := lower(coalesce(f->>'mime_type', ''));
    CONTINUE WHEN path NOT LIKE 'intake/' || _draft || '/%';
    CONTINUE WHEN mime NOT IN ('application/pdf', 'image/jpeg', 'image/jpg', 'image/png');
    INSERT INTO public.quote_attachments (quote_id, storage_path, file_name, mime_type, size_bytes, kind)
    VALUES (q.id, path, coalesce(f->>'file_name', ''), mime,
            coalesce((f->>'size_bytes')::bigint, 0),
            coalesce(nullif(f->>'kind', ''), 'other'))
    ON CONFLICT (storage_path) DO NOTHING;
    n := n + 1;
  END LOOP;

  RETURN n;
END;
$$;

REVOKE ALL ON FUNCTION public.attach_quote_files(text, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.attach_quote_files(text, text, text, jsonb) TO anon, authenticated, service_role;