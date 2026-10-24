CREATE OR REPLACE FUNCTION public.send_quote(_reference text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE row public.quotes;
BEGIN
  IF NOT (public.is_staff() OR public.is_dispatcher()) THEN
    RAISE EXCEPTION 'not_authorised' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO row FROM public.quotes WHERE reference = _reference;
  IF row.id IS NULL THEN RAISE EXCEPTION 'quote_not_found' USING ERRCODE = 'P0002'; END IF;
  IF row.distance_source = 'unconfirmed' THEN RAISE EXCEPTION 'distance_unconfirmed' USING ERRCODE = '22023'; END IF;
  IF row.accepted_at IS NOT NULL THEN RAISE EXCEPTION 'quote_already_accepted' USING ERRCODE = '22023'; END IF;
  -- Sending releases the current version to the customer (sent_version is set by trg_quotes_release_tracking).
  UPDATE public.quotes
     SET sent_at = now(), price_stage = 'offerte',
         status = CASE WHEN status = 'new' THEN 'contacted' ELSE status END,
         workflow_stage = 'offer_sent'
   WHERE id = row.id RETURNING * INTO row;
  PERFORM public.dop_log('quote', row.id, row.reference, 'offer_sent', jsonb_build_object('label','Offerte gesendet','version',row.version));
  RETURN jsonb_build_object('status','ok','reference', row.reference, 'sent_at', row.sent_at,
    'sent_version', row.sent_version, 'distance_km', row.distance_km, 'distance_source', row.distance_source);
END;
$function$;