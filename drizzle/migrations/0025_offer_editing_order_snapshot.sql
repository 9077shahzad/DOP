ALTER TABLE public.jobs_execution ADD COLUMN IF NOT EXISTS accepted_snapshot jsonb;

-- Full staff edit of an offer: every operational field, optional re-pricing, always a new version.
CREATE OR REPLACE FUNCTION public.dop_update_offer(_quote_id uuid, _payload jsonb, _reason text)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_temp' AS $$
DECLARE q public.quotes; n public.quotes; who text; calc_total numeric; adj numeric; tot numeric; ratio numeric; vat numeric; v integer; cfg uuid; priced boolean;
BEGIN
  IF NOT (public.is_staff() OR public.is_dispatcher()) THEN RAISE EXCEPTION 'not_authorised' USING ERRCODE='42501'; END IF;
  IF coalesce(trim(_reason),'') = '' THEN RAISE EXCEPTION 'reason_required' USING ERRCODE='22023'; END IF;
  SELECT * INTO q FROM quotes WHERE id = _quote_id FOR UPDATE;
  IF q.id IS NULL THEN RAISE EXCEPTION 'quote_not_found' USING ERRCODE='P0002'; END IF;
  IF q.accepted_at IS NOT NULL OR q.job_id IS NOT NULL OR q.workflow_stage IN ('order','offer_accepted') THEN
    RAISE EXCEPTION 'accepted offers are frozen' USING ERRCODE='22023'; END IF;
  SELECT coalesce(nullif(p.full_name,''), u.email, '') INTO who FROM auth.users u LEFT JOIN profiles p ON p.id = u.id WHERE u.id = auth.uid();
  priced := (_payload->>'price_total') IS NOT NULL AND (_payload->>'price_total')::numeric > 0;

  UPDATE quotes SET
    customer_name = coalesce(_payload->>'customer_name', customer_name),
    customer_company = coalesce(_payload->>'customer_company', customer_company),
    customer_phone = coalesce(_payload->>'customer_phone', customer_phone),
    customer_email = coalesce(_payload->>'customer_email', customer_email),
    customer_street = coalesce(_payload->>'customer_street', customer_street),
    customer_zip = coalesce(_payload->>'customer_zip', customer_zip),
    customer_city = coalesce(_payload->>'customer_city', customer_city),
    customer_country = coalesce(_payload->>'customer_country', customer_country),
    customer_notes = coalesce(_payload->>'customer_notes', customer_notes),
    from_address = coalesce(_payload->>'from_address', from_address),
    from_zip = coalesce(_payload->>'from_zip', from_zip),
    to_address = coalesce(_payload->>'to_address', to_address),
    to_zip = coalesce(_payload->>'to_zip', to_zip),
    room_units = CASE WHEN _payload ? 'room_units' THEN (_payload->>'room_units')::numeric ELSE room_units END,
    floor_out = coalesce((_payload->>'floor_out')::int, floor_out),
    floor_in = coalesce((_payload->>'floor_in')::int, floor_in),
    lift = coalesce(_payload->>'lift', lift),
    property_type = coalesce(_payload->>'property_type', property_type),
    parking = coalesce((_payload->>'parking')::int, parking),
    carry = coalesce((_payload->>'carry')::int, carry),
    narrow_stairs = coalesce((_payload->>'narrow_stairs')::boolean, narrow_stairs),
    permit = coalesce((_payload->>'permit')::boolean, permit),
    hoist = coalesce((_payload->>'hoist')::boolean, hoist),
    items = coalesce(_payload->'items', items),
    move_date = CASE WHEN _payload ? 'move_date' THEN nullif(_payload->>'move_date','')::date ELSE move_date END,
    services = CASE WHEN _payload ? 'services' THEN
      (_payload->'services') || CASE WHEN q.distance_source IN ('manual','routing') THEN jsonb_build_object('confirmed_distance_km', q.distance_km) ELSE '{}'::jsonb END
      ELSE services END,
    workflow_stage = CASE WHEN workflow_stage IN ('offer_sent','offer_ready') THEN 'offer_draft' ELSE workflow_stage END
  WHERE id = q.id;

  IF priced THEN
    calc_total := (_payload->>'price_total')::numeric;
    adj := coalesce(q.manual_adjustment, 0);
    tot := round(calc_total + adj, 2);
    ratio := coalesce(nullif((_payload->>'price_vat')::numeric,0) / nullif((_payload->>'price_net')::numeric,0), 0.081);
    vat := round(tot - tot / (1 + ratio), 2);
    cfg := public.active_pricing_configuration('CH');
    UPDATE quotes SET
      volume_m3 = (_payload->>'volume_m3')::numeric, boxes = (_payload->>'boxes')::int,
      vans = (_payload->>'vans')::int, crew = (_payload->>'crew')::int,
      load_hours = (_payload->>'load_hours')::numeric, total_hours = (_payload->>'total_hours')::numeric,
      access_score = (_payload->>'access_score')::int, score_label = _payload->>'score_label',
      price_low = (_payload->>'price_low')::numeric, price_high = (_payload->>'price_high')::numeric,
      discount_rate = (_payload->>'discount_rate')::numeric,
      calculated_total = calc_total, price_total = tot, price_vat = vat, price_net = tot - vat,
      pricing_configuration_id = coalesce(cfg, pricing_configuration_id)
    WHERE id = q.id;
  ELSE
    -- Not priceable any more (e.g. inventory without approved volume): no invented price.
    UPDATE quotes SET calculated_total = NULL, price_total = NULL, price_vat = NULL, price_net = NULL,
      price_low = NULL, price_high = NULL WHERE id = q.id;
  END IF;

  SELECT coalesce(max(version),0) INTO v FROM quote_versions WHERE quote_id = q.id;
  v := greatest(v, coalesce(q.version,0)) + 1;
  INSERT INTO quote_versions (quote_id, version, pricing_mode, line_items, options, subtotal, discount, net, vat_rate, vat, total, currency, pricing_configuration_id)
  SELECT id, v, coalesce(pricing_mode,'fixed'), coalesce(services->'lines','[]'::jsonb), coalesce(options,'[]'::jsonb), coalesce(price_net,0), 0, coalesce(price_net,0),
         CASE WHEN coalesce(price_net,0) > 0 THEN round(coalesce(price_vat,0)/price_net,4) ELSE 0 END,
         coalesce(price_vat,0), coalesce(price_total,0), 'CHF', pricing_configuration_id
    FROM quotes WHERE id = q.id;
  UPDATE quotes SET version = v WHERE id = q.id RETURNING * INTO n;

  PERFORM public.dop_log('quote', q.id, q.reference, 'offer_edited', jsonb_build_object(
    'reason', _reason, 'by', who, 'version', v, 'repriced', priced,
    'old_total', q.price_total, 'new_total', n.price_total,
    'before', to_jsonb(q) - 'updated_at', 'after', to_jsonb(n) - 'updated_at'));
  RETURN v;
END $$;
REVOKE ALL ON FUNCTION public.dop_update_offer(uuid, jsonb, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dop_update_offer(uuid, jsonb, text) TO authenticated;

-- Order send audit: only for jobs; never touches the offer.
CREATE OR REPLACE FUNCTION public.dop_log_order_send(_job_id uuid, _recipient text, _status text, _detail jsonb DEFAULT '{}'::jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE j public.jobs_execution;
BEGIN
  IF NOT (public.is_staff() OR public.is_dispatcher()) THEN RAISE EXCEPTION 'not authorised' USING ERRCODE='42501'; END IF;
  SELECT * INTO j FROM jobs_execution WHERE id = _job_id;
  IF j.id IS NULL THEN RAISE EXCEPTION 'not found' USING ERRCODE='P0002'; END IF;
  PERFORM public.dop_log('job', j.id, j.reference, 'order_document_sent',
    coalesce(_detail,'{}'::jsonb) || jsonb_build_object('recipient', _recipient, 'status', _status, 'document', 'order'));
END $$;
REVOKE ALL ON FUNCTION public.dop_log_order_send(uuid, text, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dop_log_order_send(uuid, text, text, jsonb) TO authenticated;

-- Conversion keeps the complete accepted offer on the order.
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
  INSERT INTO jobs_execution (lead_id, quote_id, quote_reference, lead_reference, status, scheduled_start, job_value,
    customer_name, customer_email, customer_phone, customer_language, service_key,
    origin, destination, inventory, extras, attachments, booking_notes, booked_at, booked_by, billing_status, is_test, accepted_snapshot)
  VALUES (l.id, q.id, q.reference, l.reference, 'scheduled',
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