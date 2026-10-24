-- A. Distance: confirmed value on the quotation, routing integration point
ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS distance_source text NOT NULL DEFAULT 'unconfirmed',
  ADD COLUMN IF NOT EXISTS distance_confirmed_by uuid,
  ADD COLUMN IF NOT EXISTS distance_confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS sent_at timestamptz;

ALTER TABLE public.quotes DROP CONSTRAINT IF EXISTS quotes_distance_source_check;
ALTER TABLE public.quotes ADD CONSTRAINT quotes_distance_source_check
  CHECK (distance_source IN ('manual','routing','unconfirmed'));

-- Provider-agnostic routing adapter. No provider credentials exist yet, so it
-- reports EXTERNAL INPUT REQUIRED instead of returning a fabricated distance.
CREATE OR REPLACE FUNCTION public.resolve_route_distance(_origin text, _destination text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public','pg_temp'
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
      'status','external_input_required','provider', NULL, 'km', NULL,
      'source','unconfirmed','origin', _origin, 'destination', _destination);
  END IF;
  -- With a provider configured, the routing worker resolves the road distance
  -- and writes it back through set_quote_distance(..., 'routing').
  RETURN jsonb_build_object(
    'status','provider_configured','provider', provider, 'km', NULL,
    'source','routing','origin', _origin, 'destination', _destination);
END;
$function$;

REVOKE ALL ON FUNCTION public.resolve_route_distance(text,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.resolve_route_distance(text,text) FROM anon;
GRANT EXECUTE ON FUNCTION public.resolve_route_distance(text,text) TO authenticated, service_role;

-- The chargeable distance is an authorised value entered by sales/dispatch,
-- or a real routing result. Never a postcode approximation.
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
     SET distance_km = round(_km)::integer,
         distance_source = _source,
         distance_confirmed_by = auth.uid(),
         distance_confirmed_at = now()
   WHERE id = _quote_id
   RETURNING * INTO row;

  IF row.id IS NULL THEN
    RAISE EXCEPTION 'quote_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF row.lead_id IS NOT NULL THEN
    INSERT INTO public.lead_activities (lead_id, kind, body, meta, actor_id, actor_kind)
    VALUES (row.lead_id, 'quote', '',
            jsonb_build_object('quote', row.id, 'distance_km', row.distance_km, 'distance_source', _source),
            auth.uid(), 'staff');
  END IF;

  RETURN row;
END;
$function$;

REVOKE ALL ON FUNCTION public.set_quote_distance(uuid,numeric,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_quote_distance(uuid,numeric,text) FROM anon;
GRANT EXECUTE ON FUNCTION public.set_quote_distance(uuid,numeric,text) TO authenticated, service_role;

-- A quotation with an unconfirmed distance cannot go to the customer.
CREATE OR REPLACE FUNCTION public.send_quote(_reference text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','pg_temp'
AS $function$
DECLARE
  row public.quotes;
BEGIN
  IF NOT (public.is_staff() OR public.is_dispatcher()) THEN
    RAISE EXCEPTION 'not_authorised' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO row FROM public.quotes WHERE reference = _reference;
  IF row.id IS NULL THEN
    RAISE EXCEPTION 'quote_not_found' USING ERRCODE = 'P0002';
  END IF;
  IF row.distance_source = 'unconfirmed' THEN
    RAISE EXCEPTION 'distance_unconfirmed' USING ERRCODE = '22023';
  END IF;

  UPDATE public.quotes
     SET sent_at = now(),
         price_stage = 'offerte',
         status = CASE WHEN status = 'new' THEN 'contacted' ELSE status END
   WHERE id = row.id
   RETURNING * INTO row;

  RETURN jsonb_build_object('status','ok','reference', row.reference,
                            'sent_at', row.sent_at, 'distance_km', row.distance_km,
                            'distance_source', row.distance_source);
END;
$function$;

REVOKE ALL ON FUNCTION public.send_quote(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.send_quote(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.send_quote(text) TO authenticated, service_role;

-- Price-list provenance: every new customer quotation records the version in
-- force at creation time; invoices already inherit it.
CREATE OR REPLACE FUNCTION public.quotes_customer_stamp_price_list()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','pg_temp'
AS $function$
BEGIN
  IF NEW.price_list_version_id IS NULL THEN
    NEW.price_list_version_id := public.active_pricing_configuration('CH');
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.quotes_customer_stamp_price_list() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.quotes_customer_stamp_price_list() FROM anon;
REVOKE ALL ON FUNCTION public.quotes_customer_stamp_price_list() FROM authenticated;

DROP TRIGGER IF EXISTS quotes_customer_stamp_price_list ON public.quotes_customer;
CREATE TRIGGER quotes_customer_stamp_price_list
  BEFORE INSERT ON public.quotes_customer
  FOR EACH ROW EXECUTE FUNCTION public.quotes_customer_stamp_price_list();

-- Publisher of record for a price list version, recorded by a real administrator.
CREATE OR REPLACE FUNCTION public.confirm_price_list_publisher(_id uuid)
RETURNS public.pricing_configurations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','pg_temp'
AS $function$
DECLARE
  row public.pricing_configurations;
BEGIN
  IF NOT public.is_zw_admin() THEN
    RAISE EXCEPTION 'not_authorised' USING ERRCODE = '42501';
  END IF;
  UPDATE public.pricing_configurations
     SET published_by = auth.uid(),
         published_at = coalesce(published_at, now()),
         updated_at = now()
   WHERE id = _id AND status = 'published'
   RETURNING * INTO row;
  IF row.id IS NULL THEN
    RAISE EXCEPTION 'published_configuration_not_found' USING ERRCODE = 'P0002';
  END IF;
  RETURN row;
END;
$function$;

REVOKE ALL ON FUNCTION public.confirm_price_list_publisher(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.confirm_price_list_publisher(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.confirm_price_list_publisher(uuid) TO authenticated, service_role;