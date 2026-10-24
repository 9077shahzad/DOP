-- Separate customer-visible note for a manual price adjustment; internal reason stays admin-only.
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS manual_adjustment_customer_note text;
GRANT SELECT (manual_adjustment_customer_note) ON public.quotes TO authenticated;

CREATE OR REPLACE FUNCTION public.dop_adjust_price(_quote_id uuid, _delta numeric, _reason text, _customer_note text)
 RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v integer;
BEGIN
  v := public.dop_adjust_price(_quote_id, _delta, _reason);
  UPDATE quotes SET manual_adjustment_customer_note = nullif(trim(coalesce(_customer_note,'')),'') WHERE id = _quote_id;
  RETURN v;
END $function$;
REVOKE ALL ON FUNCTION public.dop_adjust_price(uuid, numeric, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.dop_adjust_price(uuid, numeric, text, text) TO authenticated, service_role;
DROP FUNCTION IF EXISTS public.get_public_quote(text, text);
CREATE FUNCTION public.get_public_quote(_reference text, _contact text DEFAULT NULL::text)
 RETURNS TABLE(reference text, language text, status text, created_at timestamp with time zone, move_date text, from_zip text, to_zip text, room_units numeric, floor_out integer, floor_in integer, lift text, property_type text, parking integer, carry integer, narrow_stairs boolean, permit boolean, hoist boolean, services jsonb, items jsonb, distance_km numeric, volume_m3 numeric, boxes integer, vans integer, crew integer, load_hours numeric, total_hours numeric, access_score integer, score_label text, price_net numeric, price_vat numeric, price_total numeric, price_low numeric, price_high numeric, discount_rate numeric, pricing_version integer, pricing_effective_from date, manual_adjustment numeric, calculated_total numeric, manual_adjustment_customer_note text)
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
           coalesce(q.manual_adjustment, 0), q.calculated_total, q.manual_adjustment_customer_note
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