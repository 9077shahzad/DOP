-- Customer projection carries the manual price adjustment so the offer/PDF shows it as its own line
-- (instead of it being misread as a date surcharge).
DROP FUNCTION IF EXISTS public.get_public_quote(text, text);
CREATE FUNCTION public.get_public_quote(_reference text, _contact text DEFAULT NULL::text)
 RETURNS TABLE(reference text, language text, status text, created_at timestamp with time zone, move_date text, from_zip text, to_zip text, room_units numeric, floor_out integer, floor_in integer, lift text, property_type text, parking integer, carry integer, narrow_stairs boolean, permit boolean, hoist boolean, services jsonb, items jsonb, distance_km numeric, volume_m3 numeric, boxes integer, vans integer, crew integer, load_hours numeric, total_hours numeric, access_score integer, score_label text, price_net numeric, price_vat numeric, price_total numeric, price_low numeric, price_high numeric, discount_rate numeric, pricing_version integer, pricing_effective_from date, manual_adjustment numeric, calculated_total numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  c text := btrim(coalesce(_contact, ''));
  c_digits text := regexp_replace(coalesce(_contact, ''), '\D', '', 'g');
BEGIN
  IF btrim(coalesce(_reference, '')) = '' OR c = '' THEN
    RETURN;
  END IF;
  IF length(c_digits) >= 9 AND left(c_digits, 1) = '0' THEN
    c_digits := substr(c_digits, 2);
  ELSIF length(c_digits) >= 11 AND left(c_digits, 2) = '41' THEN
    c_digits := substr(c_digits, 3);
  END IF;
  RETURN QUERY
    SELECT q.reference, q.language, q.status::text, q.created_at, q.move_date::text,
           q.from_zip, q.to_zip, q.room_units, q.floor_out, q.floor_in, q.lift,
           q.property_type, q.parking, q.carry, q.narrow_stairs, q.permit, q.hoist,
           q.services, q.items, q.distance_km, q.volume_m3, q.boxes, q.vans, q.crew,
           q.load_hours, q.total_hours, q.access_score, q.score_label,
           q.price_net, q.price_vat, q.price_total, q.price_low, q.price_high,
           q.discount_rate, pc.version, pc.effective_from,
           coalesce(q.manual_adjustment, 0), q.calculated_total
      FROM public.quotes q
      LEFT JOIN public.pricing_configurations pc ON pc.id = q.pricing_configuration_id
     WHERE q.reference = btrim(_reference)
       AND q.created_at > now() - interval '30 days'
       AND (
         (position('@' in c) > 0 AND lower(btrim(coalesce(q.customer_email, ''))) = lower(c))
         OR (
           length(c_digits) >= 6
           AND length(regexp_replace(coalesce(q.customer_phone, ''), '\D', '', 'g')) >= 6
           AND right(regexp_replace(coalesce(q.customer_phone, ''), '\D', '', 'g'), length(c_digits)) = c_digits
         )
       )
     LIMIT 1;
END;
$function$;
REVOKE ALL ON FUNCTION public.get_public_quote(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_quote(text, text) TO anon, authenticated, service_role;