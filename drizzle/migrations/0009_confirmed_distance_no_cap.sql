-- A confirmed distance is billed as confirmed: no 180 km cap (owner decision 25.09.2026).
CREATE OR REPLACE FUNCTION public.set_quote_distance(_quote_id uuid, _km numeric, _source text DEFAULT 'manual'::text)
 RETURNS quotes
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  row public.quotes;
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