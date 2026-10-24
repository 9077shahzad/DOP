CREATE OR REPLACE FUNCTION public.dop_offer_to_order(_quote_id uuid)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE q public.quotes; l public.leads; j public.jobs_execution; atts jsonb := '[]'::jsonb; s jsonb;
BEGIN
  IF NOT (public.is_staff() OR public.is_dispatcher()) THEN RAISE EXCEPTION 'not authorised' USING ERRCODE='42501'; END IF;
  SELECT * INTO q FROM quotes WHERE id = _quote_id FOR UPDATE;
  IF q.id IS NULL THEN RAISE EXCEPTION 'not found' USING ERRCODE='P0002'; END IF;
  IF q.job_id IS NOT NULL THEN RETURN q.job_id; END IF;
  IF coalesce(q.price_total,0) <= 0 THEN RAISE EXCEPTION 'pricing_required' USING ERRCODE='22023'; END IF;
  -- test flag of the quote is inherited by any lead/job created here
  PERFORM set_config('app.allow_test_flag', 'on', true);
  SELECT * INTO l FROM leads WHERE id = q.lead_id;
  IF l.id IS NULL THEN
    -- calculator quotes have no lead; create one from the quote so the job is always traceable
    INSERT INTO leads (customer_name, customer_email, customer_phone, postcode, service_address, language,
                       service_details, description, status, workflow_stage, is_test)
    VALUES (q.customer_name, q.customer_email, q.customer_phone, q.from_zip, coalesce(q.from_address,''), coalesce(q.language,'de'),
            jsonb_build_object('quote_reference', q.reference, 'created_by', 'offer_to_order'),
            coalesce(q.customer_notes,''), 'won', 'order', q.is_test)
    RETURNING * INTO l;
    UPDATE quotes SET lead_id = l.id WHERE id = q.id;
  ELSE
    SELECT coalesce(jsonb_agg(jsonb_build_object('id',a.id,'file_name',a.file_name,'storage_path',a.storage_path,
             'mime_type',a.mime_type,'size_bytes',a.size_bytes)),'[]'::jsonb)
      INTO atts FROM lead_attachments a WHERE a.lead_id = l.id;
  END IF;
  s := coalesce(q.services,'{}'::jsonb);
  INSERT INTO jobs_execution (lead_id, quote_id, quote_reference, lead_reference, status, scheduled_start, job_value,
    customer_name, customer_email, customer_phone, customer_language, service_key,
    origin, destination, inventory, extras, attachments, booking_notes, booked_at, booked_by, billing_status, is_test)
  VALUES (l.id, q.id, q.reference, l.reference, 'scheduled',
    CASE WHEN q.move_date IS NOT NULL THEN (q.move_date::text || ' 08:00')::timestamp AT TIME ZONE 'Europe/Zurich' END,
    q.price_total, q.customer_name, q.customer_email, q.customer_phone, q.language,
    CASE WHEN (s->'flags'->>'move')::boolean OR (s->>'move')::boolean THEN 'move' ELSE '' END,
    jsonb_build_object('street', q.from_address, 'zip', q.from_zip),
    jsonb_build_object('street', q.to_address, 'zip', q.to_zip),
    coalesce(q.items,'{}'::jsonb), coalesce(s->'extras','[]'::jsonb), atts,
    coalesce(q.customer_notes,''), now(), auth.uid(), 'unpaid', q.is_test)
  RETURNING * INTO j;
  UPDATE quotes SET job_id = j.id, workflow_stage = 'order' WHERE id = q.id;
  UPDATE leads SET workflow_stage = 'order' WHERE id = l.id;
  PERFORM set_config('app.allow_test_flag', 'off', true);
  PERFORM public.dop_log('quote', q.id, q.reference, 'converted_to_order', jsonb_build_object('job', j.reference, 'version', q.version));
  PERFORM public.dop_log('job', j.id, j.reference, 'order_created', jsonb_build_object('quote', q.reference));
  RETURN j.id;
END $function$;

CREATE OR REPLACE FUNCTION public.dop_offer_to_order_checked(_quote_id uuid, _override_reason text DEFAULT NULL::text)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE q public.quotes; jid uuid; jref text; accepted boolean;
BEGIN
  IF NOT (public.is_staff() OR public.is_dispatcher()) THEN RAISE EXCEPTION 'not authorised' USING ERRCODE='42501'; END IF;
  SELECT * INTO q FROM quotes WHERE id = _quote_id FOR UPDATE;
  IF q.id IS NULL THEN RAISE EXCEPTION 'not found' USING ERRCODE='P0002'; END IF;
  IF q.job_id IS NOT NULL THEN RETURN q.job_id; END IF;
  accepted := q.accepted_at IS NOT NULL OR q.workflow_stage = 'offer_accepted';
  IF NOT accepted THEN
    IF NOT public.is_zw_admin() THEN RAISE EXCEPTION 'acceptance_required' USING ERRCODE='42501'; END IF;
    IF coalesce(trim(_override_reason),'') = '' THEN RAISE EXCEPTION 'reason_required' USING ERRCODE='22023'; END IF;
  END IF;
  jid := public.dop_offer_to_order(_quote_id);
  IF NOT accepted THEN
    SELECT reference INTO jref FROM jobs_execution WHERE id = jid;
    PERFORM public.dop_log('quote', q.id, q.reference, 'order_override',
      jsonb_build_object('reason', trim(_override_reason), 'stage', q.workflow_stage, 'job', jref,
                         'customer_accepted', false, 'note', 'Auftrag durch Admin-Override erstellt, ohne Kundenannahme'));
    PERFORM public.dop_log('job', jid, jref, 'order_override',
      jsonb_build_object('reason', trim(_override_reason), 'quote', q.reference, 'customer_accepted', false,
                         'note', 'Auftrag durch Admin-Override erstellt, ohne Kundenannahme'));
  END IF;
  RETURN jid;
END $function$;