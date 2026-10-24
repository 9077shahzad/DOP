ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS customer_street text,
  ADD COLUMN IF NOT EXISTS customer_zip text,
  ADD COLUMN IF NOT EXISTS customer_city text,
  ADD COLUMN IF NOT EXISTS customer_country text;

CREATE OR REPLACE FUNCTION public.create_quote(payload jsonb)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  new_reference text;
BEGIN
  INSERT INTO public.quotes (
    reference, language, customer_name, customer_company, customer_phone, customer_email,
    customer_street, customer_zip, customer_city, customer_country,
    from_address, from_zip, to_address, to_zip,
    room_units, floor_out, floor_in, lift, property_type,
    parking, carry, narrow_stairs, permit, hoist,
    services, items, move_date,
    distance_km, volume_m3, boxes, vans, crew, load_hours, total_hours,
    access_score, score_label,
    price_net, price_vat, price_total, price_low, price_high, discount_rate,
    source, pricing_configuration_id
  ) VALUES (
    'pending',
    coalesce(payload->>'language', 'de'),
    payload->>'customer_name',
    payload->>'customer_company',
    payload->>'customer_phone',
    payload->>'customer_email',
    nullif(btrim(coalesce(payload->>'customer_street','')), ''),
    nullif(btrim(coalesce(payload->>'customer_zip','')), ''),
    nullif(btrim(coalesce(payload->>'customer_city','')), ''),
    nullif(btrim(coalesce(payload->>'customer_country','')), ''),
    payload->>'from_address',
    payload->>'from_zip',
    payload->>'to_address',
    payload->>'to_zip',
    (payload->>'room_units')::numeric,
    (payload->>'floor_out')::int,
    (payload->>'floor_in')::int,
    payload->>'lift',
    payload->>'property_type',
    (payload->>'parking')::int,
    (payload->>'carry')::int,
    (payload->>'narrow_stairs')::boolean,
    (payload->>'permit')::boolean,
    (payload->>'hoist')::boolean,
    payload->'services',
    payload->'items',
    nullif(payload->>'move_date', '')::date,
    (payload->>'distance_km')::int,
    (payload->>'volume_m3')::numeric,
    (payload->>'boxes')::int,
    (payload->>'vans')::int,
    (payload->>'crew')::int,
    (payload->>'load_hours')::numeric,
    (payload->>'total_hours')::numeric,
    (payload->>'access_score')::int,
    payload->>'score_label',
    (payload->>'price_net')::numeric,
    (payload->>'price_vat')::numeric,
    (payload->>'price_total')::numeric,
    (payload->>'price_low')::numeric,
    (payload->>'price_high')::numeric,
    (payload->>'discount_rate')::numeric,
    'planner',
    public.active_pricing_configuration(coalesce(payload->>'market','CH'))
  )
  RETURNING reference INTO new_reference;

  RETURN new_reference;
END;
$function$;

-- Identity block of one quote, released only to whoever proves the contact
-- the quote was requested with. Never part of the public projection.
CREATE OR REPLACE FUNCTION public.get_quote_customer(_reference text, _contact text)
 RETURNS TABLE (
   customer_name text,
   customer_company text,
   customer_street text,
   customer_zip text,
   customer_city text,
   customer_country text,
   customer_email text,
   customer_phone text
 )
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  q_id uuid;
BEGIN
  SELECT id INTO q_id FROM public.quotes WHERE reference = _reference;
  IF q_id IS NULL THEN RETURN; END IF;
  IF NOT public.quote_contact_matches(q_id, _contact) THEN RETURN; END IF;

  RETURN QUERY
  SELECT q.customer_name, q.customer_company, q.customer_street, q.customer_zip,
         q.customer_city, q.customer_country, q.customer_email, q.customer_phone
  FROM public.quotes q
  WHERE q.id = q_id;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_quote_customer(text, text) TO anon, authenticated, service_role;