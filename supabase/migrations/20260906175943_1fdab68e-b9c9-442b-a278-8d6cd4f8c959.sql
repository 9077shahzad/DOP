-- Internal partner assessment moves off the partner-readable row entirely.
DROP VIEW IF EXISTS public.partner_self;

CREATE TABLE IF NOT EXISTS public.partner_internal (
  partner_id uuid PRIMARY KEY REFERENCES public.partners(id) ON DELETE CASCADE,
  internal_score numeric,
  classification text,
  account_manager_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.partner_internal TO authenticated;
GRANT ALL ON public.partner_internal TO service_role;
ALTER TABLE public.partner_internal ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff read partner internal" ON public.partner_internal;
CREATE POLICY "Staff read partner internal"
  ON public.partner_internal FOR SELECT TO authenticated
  USING (is_staff());

INSERT INTO public.partner_internal (partner_id, internal_score, classification, account_manager_id)
SELECT id, internal_score, classification, account_manager_id
  FROM public.partners
 WHERE internal_score IS NOT NULL OR classification IS NOT NULL OR account_manager_id IS NOT NULL
ON CONFLICT (partner_id) DO NOTHING;

ALTER TABLE public.partners
  DROP COLUMN IF EXISTS internal_score,
  DROP COLUMN IF EXISTS classification,
  DROP COLUMN IF EXISTS account_manager_id;

-- The owning applicant may read their own record again: it no longer carries
-- any internal-only field.
DROP POLICY IF EXISTS "Staff read partners" ON public.partners;
DROP POLICY IF EXISTS "Partner reads own record" ON public.partners;
CREATE POLICY "Partner reads own record"
  ON public.partners FOR SELECT TO authenticated
  USING ((created_by = auth.uid()) OR is_staff());

CREATE OR REPLACE FUNCTION public.partners_protect_internal_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF public.is_service_role() OR public.is_staff() THEN
    RETURN NEW;
  END IF;
  NEW.status := OLD.status;
  NEW.reference := OLD.reference;
  NEW.created_by := OLD.created_by;
  NEW.created_at := OLD.created_at;
  RETURN NEW;
END $function$;

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

  INSERT INTO public.partner_internal (partner_id, internal_score, classification)
  VALUES (_partner_id, total, nullif(btrim(coalesce(_classification, '')), ''))
  ON CONFLICT (partner_id) DO UPDATE
    SET internal_score = excluded.internal_score,
        classification = excluded.classification,
        updated_at = now();

  UPDATE public.partners SET updated_at = now() WHERE id = _partner_id;

  RETURN total;
END;
$function$;

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
  INSERT INTO public.partner_internal (partner_id, account_manager_id)
  VALUES (_partner_id, _manager_id)
  ON CONFLICT (partner_id) DO UPDATE
    SET account_manager_id = excluded.account_manager_id,
        updated_at = now();
  UPDATE public.partners SET updated_at = now() WHERE id = _partner_id;
  RETURN _manager_id;
END;
$function$;