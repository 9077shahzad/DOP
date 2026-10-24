CREATE OR REPLACE FUNCTION public.resolve_route_distance(_origin text, _destination text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  provider text := nullif(current_setting('app.routing_provider', true), '');
BEGIN
  IF auth.uid() IS NULL AND NOT public.is_service_role() THEN
    RAISE EXCEPTION 'not_authorised' USING ERRCODE = '42501';
  END IF;
  IF NOT (public.is_staff() OR public.is_dispatcher() OR public.is_service_role()) THEN
    RAISE EXCEPTION 'not_authorised' USING ERRCODE = '42501';
  END IF;
  IF provider IS NULL THEN
    RETURN jsonb_build_object(
      'status','external_input_required','provider', NULL, 'km', NULL, 'duration_min', NULL,
      'source','unconfirmed','origin', _origin, 'destination', _destination);
  END IF;
  -- With a provider configured, the routing worker resolves the road distance
  -- and writes it back through set_quote_distance(..., 'routing').
  RETURN jsonb_build_object(
    'status','provider_configured','provider', provider, 'km', NULL, 'duration_min', NULL,
    'source','routing','origin', _origin, 'destination', _destination);
END;
$function$;

-- Visitor-safe projection of the same adapter: availability only, no provider
-- name, no fabricated kilometres. SECURITY INVOKER — it reads no table.
CREATE OR REPLACE FUNCTION public.public_route_distance(_origin text, _destination text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY INVOKER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  provider text := nullif(current_setting('app.routing_provider', true), '');
BEGIN
  IF provider IS NULL THEN
    RETURN jsonb_build_object(
      'status','external_input_required','km', NULL, 'duration_min', NULL, 'source','unconfirmed');
  END IF;
  RETURN jsonb_build_object(
    'status','provider_configured','km', NULL, 'duration_min', NULL, 'source','routing');
END;
$function$;

REVOKE ALL ON FUNCTION public.public_route_distance(text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_route_distance(text,text) TO anon, authenticated, service_role;