CREATE OR REPLACE FUNCTION public.dop_offer_to_order(_quote_id uuid)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE q public.quotes; l public.leads; j public.jobs_execution; atts jsonb := '[]'::jsonb; s jsonb; a jsonb; qv jsonb;
BEGIN
  IF NOT (public.is_staff() OR public.is_dispatcher()) THEN RAISE EXCEPTION 'not authorised' USING ERRCODE='42501'; END IF;
  SELECT * INTO q FROM quotes WHERE id = _quote_id FOR UPDATE;
  IF q.id IS NULL THEN RAISE EXCEPTION 'not found' USING ERRCODE='P0002'; END IF;
  IF q.job_id IS NOT NULL THEN RETURN q.job_id; END IF;
  IF coalesce(q.price_total,0) <= 0 THEN RAISE EXCEPTION 'pricing_required' USING ERRCODE='22023'; END IF;
  PERFORM set_config('app.allow_test_flag', 'on', true);
  SELECT * INTO l FROM leads WHERE id = q.lead_id;
  IF l.id IS NULL THEN
    INSERT INTO leads (customer_name, customer_email, customer_phone, postcode, service_address, language,
                       service_details, description, status, workflow_stage, is_test)
    VALUES (q.customer_name, q.customer_email, q.customer_phone, q.from_zip, coalesce(q.from_address,''), coalesce(q.language,'de'),
            jsonb_build_object('quote_reference', q.reference, 'created_by', 'offer_to_order'),
            coalesce(q.customer_notes,''), 'won', 'order', q.is_test)
    RETURNING * INTO l;
    UPDATE quotes SET lead_id = l.id WHERE id = q.id;
  ELSE
    SELECT coalesce(jsonb_agg(jsonb_build_object('id',x.id,'file_name',x.file_name,'storage_path',x.storage_path,
             'mime_type',x.mime_type,'size_bytes',x.size_bytes)),'[]'::jsonb)
      INTO atts FROM lead_attachments x WHERE x.lead_id = l.id;
  END IF;
  atts := atts || coalesce((SELECT jsonb_agg(jsonb_build_object('id',x.id,'file_name',x.file_name,'storage_path',x.storage_path,
             'mime_type',x.mime_type,'size_bytes',x.size_bytes,'kind',x.kind)) FROM quote_attachments x WHERE x.quote_id = q.id),'[]'::jsonb);
  s := coalesce(q.services,'{}'::jsonb);
  a := coalesce(s->'access','{}'::jsonb);
  SELECT to_jsonb(v) INTO qv FROM quote_versions v WHERE v.quote_id = q.id AND v.version = coalesce(q.accepted_version, q.version);
  INSERT INTO jobs_execution (lead_id, quote_reference, lead_reference, status, scheduled_start, job_value,
    customer_name, customer_email, customer_phone, customer_language, service_key,
    origin, destination, inventory, extras, attachments, booking_notes, booked_at, booked_by, billing_status, is_test, accepted_snapshot)
  VALUES (l.id, q.reference, l.reference, 'scheduled',
    CASE WHEN q.move_date IS NOT NULL THEN (q.move_date::text || ' 08:00')::timestamp AT TIME ZONE 'Europe/Zurich' END,
    q.price_total, q.customer_name, q.customer_email, q.customer_phone, q.language,
    CASE WHEN (s->'flags'->>'move')::boolean OR (s->>'move')::boolean THEN 'move'
         WHEN (s->>'clean')::boolean THEN 'clean' WHEN (s->>'disp')::boolean THEN 'disposal' ELSE '' END,
    jsonb_build_object('street', q.from_address, 'zip', q.from_zip, 'city', s->'places'->>'fromCity', 'floor', q.floor_out,
      'lift', coalesce(a->>'liftOut', q.lift), 'parking', coalesce(a->'parkingOut', to_jsonb(q.parking)), 'carry', q.carry,
      'narrow_stairs', q.narrow_stairs, 'permit', q.permit, 'hoist', q.hoist),
    jsonb_build_object('street', q.to_address, 'zip', q.to_zip, 'city', s->'places'->>'toCity', 'floor', q.floor_in,
      'lift', a->>'liftIn', 'parking', a->'parkingIn', 'carry', a->'carryIn', 'narrow_stairs', a->'narrowStairsIn',
      'permit', a->'permitIn', 'hoist', a->'hoistIn'),
    coalesce(q.items,'{}'::jsonb), coalesce(s->'extras','[]'::jsonb), atts,
    coalesce(q.customer_notes,''), now(), auth.uid(), 'unpaid', q.is_test,
    jsonb_build_object('quote', to_jsonb(q) - 'updated_at', 'accepted_version', qv, 'attachments', atts, 'captured_at', now()))
  RETURNING * INTO j;
  UPDATE quotes SET job_id = j.id, workflow_stage = 'order' WHERE id = q.id;
  UPDATE leads SET workflow_stage = 'order' WHERE id = l.id;
  PERFORM set_config('app.allow_test_flag', 'off', true);
  PERFORM public.dop_log('quote', q.id, q.reference, 'converted_to_order', jsonb_build_object('job', j.reference, 'version', q.version));
  PERFORM public.dop_log('job', j.id, j.reference, 'order_created', jsonb_build_object('quote', q.reference));
  RETURN j.id;
END $function$;