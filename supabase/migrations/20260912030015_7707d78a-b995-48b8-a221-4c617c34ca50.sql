CREATE OR REPLACE FUNCTION public.get_verified_quote_document(_reference text, _contact text)
RETURNS TABLE(
  reference text,
  language text,
  status text,
  created_at timestamptz,
  move_date text,
  customer_name text,
  customer_company text,
  customer_phone text,
  customer_email text,
  from_address text,
  from_zip text,
  to_address text,
  to_zip text,
  room_units numeric,
  floor_out integer,
  floor_in integer,
  lift text,
  property_type text,
  parking integer,
  carry integer,
  narrow_stairs boolean,
  permit boolean,
  hoist boolean,
  services jsonb,
  items jsonb,
  distance_km numeric,
  distance_source text,
  volume_m3 numeric,
  boxes integer,
  vans integer,
  crew integer,
  load_hours numeric,
  total_hours numeric,
  access_score integer,
  score_label text,
  price_net numeric,
  price_vat numeric,
  price_total numeric,
  price_low numeric,
  price_high numeric,
  discount_rate numeric,
  pricing_version integer,
  pricing_effective_from date,
  quote_version integer,
  accepted_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    q.reference,
    q.language,
    q.status::text,
    q.created_at,
    q.move_date::text,
    q.customer_name,
    q.customer_company,
    q.customer_phone,
    q.customer_email,
    q.from_address,
    q.from_zip,
    q.to_address,
    q.to_zip,
    q.room_units,
    q.floor_out,
    q.floor_in,
    q.lift,
    q.property_type,
    q.parking,
    q.carry,
    q.narrow_stairs,
    q.permit,
    q.hoist,
    q.services,
    q.items,
    q.distance_km,
    q.distance_source,
    q.volume_m3,
    q.boxes,
    q.vans,
    q.crew,
    q.load_hours,
    q.total_hours,
    q.access_score,
    q.score_label,
    q.price_net,
    q.price_vat,
    q.price_total,
    q.price_low,
    q.price_high,
    q.discount_rate,
    pc.version,
    pc.effective_from,
    coalesce(q.version, 1),
    q.accepted_at
  FROM public.quotes q
  LEFT JOIN public.pricing_configurations pc ON pc.id = q.pricing_configuration_id
  WHERE q.reference = btrim(_reference)
    AND q.created_at > now() - interval '30 days'
    AND public.quote_contact_matches(q.id, _contact)
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.get_verified_quote_document(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_verified_quote_document(text, text) TO anon, authenticated, service_role;