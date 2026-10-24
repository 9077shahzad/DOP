ALTER TABLE public.quotes
  ALTER COLUMN distance_km TYPE numeric(7,2) USING distance_km::numeric;

CREATE OR REPLACE FUNCTION public.set_quote_distance(_quote_id uuid, _km numeric, _source text DEFAULT 'manual')
RETURNS public.quotes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','pg_temp'
AS $function$
DECLARE
  row public.quotes;
  max_km numeric;
BEGIN
  IF NOT (public.is_staff() OR public.is_dispatcher()) THEN
    RAISE EXCEPTION 'not_authorised' USING ERRCODE = '42501';
  END IF;
  IF _source IS NULL OR _source NOT IN ('manual','routing') THEN
    RAISE EXCEPTION 'invalid_distance_source' USING ERRCODE = '22023';
  END IF;
  IF _km IS NULL OR _km < 0 THEN
    RAISE EXCEPTION 'invalid_distance' USING ERRCODE = '22023';
  END IF;

  SELECT r.price INTO max_km
    FROM public.pricing_rules r
    WHERE r.configuration_id = public.active_pricing_configuration('CH')
      AND r.service = 'engine' AND r.unit_type = 'distance_max_km';
  IF max_km IS NOT NULL AND _km > max_km THEN
    RAISE EXCEPTION 'distance_above_maximum' USING ERRCODE = '22023';
  END IF;

  UPDATE public.quotes
     SET distance_km = round(_km, 2),
         distance_source = _source,
         distance_confirmed_by = auth.uid(),
         distance_confirmed_at = now()
   WHERE id = _quote_id
   RETURNING * INTO row;

  IF row.id IS NULL THEN
    RAISE EXCEPTION 'quote_not_found' USING ERRCODE = 'P0002';
  END IF;

  RETURN row;
END;
$function$;

REVOKE ALL ON FUNCTION public.set_quote_distance(uuid,numeric,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_quote_distance(uuid,numeric,text) FROM anon;
GRANT EXECUTE ON FUNCTION public.set_quote_distance(uuid,numeric,text) TO authenticated, service_role;