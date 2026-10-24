-- Confirming or changing the chargeable distance re-prices the offer as a new version.
CREATE OR REPLACE FUNCTION public.dop_confirm_distance(_quote_id uuid, _km numeric, _source text, _payload jsonb, _planning_km numeric DEFAULT NULL)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE q public.quotes; who text; calc_total numeric; adj numeric; tot numeric; ratio numeric; vat numeric; v integer; cfg uuid;
BEGIN
  IF NOT (public.is_staff() OR public.is_dispatcher()) THEN RAISE EXCEPTION 'not_authorised' USING ERRCODE='42501'; END IF;
  IF _source IS NULL OR _source NOT IN ('manual','routing') THEN RAISE EXCEPTION 'invalid_distance_source' USING ERRCODE='22023'; END IF;
  IF _km IS NULL OR _km < 0 THEN RAISE EXCEPTION 'invalid_distance' USING ERRCODE='22023'; END IF;
  SELECT * INTO q FROM quotes WHERE id = _quote_id FOR UPDATE;
  IF q.id IS NULL THEN RAISE EXCEPTION 'quote_not_found' USING ERRCODE='P0002'; END IF;
  IF q.accepted_at IS NOT NULL OR q.workflow_stage IN ('order','offer_accepted') THEN RAISE EXCEPTION 'accepted offers are frozen' USING ERRCODE='22023'; END IF;
  SELECT coalesce(nullif(p.full_name,''), u.email, '') INTO who FROM auth.users u LEFT JOIN profiles p ON p.id = u.id WHERE u.id = auth.uid();

  IF _payload IS NULL THEN
    -- Not yet calculated: record the distance only.
    UPDATE quotes SET distance_km = round(_km,2), distance_source = _source,
           distance_confirmed_by = auth.uid(), distance_confirmed_at = now() WHERE id = q.id;
  ELSE
    calc_total := (_payload->>'price_total')::numeric;
    IF calc_total IS NULL OR calc_total <= 0 THEN RAISE EXCEPTION 'pricing_required' USING ERRCODE='22023'; END IF;
    adj := coalesce(q.manual_adjustment, 0);
    tot := round(calc_total + adj, 2);
    ratio := coalesce(nullif((_payload->>'price_vat')::numeric,0) / nullif((_payload->>'price_net')::numeric,0), 0.081);
    vat := round(tot - tot / (1 + ratio), 2);
    cfg := public.active_pricing_configuration('CH');
    UPDATE quotes SET
      distance_km = round(_km,2), distance_source = _source,
      distance_confirmed_by = auth.uid(), distance_confirmed_at = now(),
      services = (_payload->'services') || jsonb_build_object('planning_distance_km', _planning_km, 'confirmed_distance_km', round(_km,2)),
      volume_m3 = (_payload->>'volume_m3')::numeric, boxes = (_payload->>'boxes')::int,
      vans = (_payload->>'vans')::int, crew = (_payload->>'crew')::int,
      load_hours = (_payload->>'load_hours')::numeric, total_hours = (_payload->>'total_hours')::numeric,
      access_score = (_payload->>'access_score')::int, score_label = _payload->>'score_label',
      price_low = (_payload->>'price_low')::numeric, price_high = (_payload->>'price_high')::numeric,
      discount_rate = (_payload->>'discount_rate')::numeric,
      calculated_total = calc_total, price_total = tot, price_vat = vat, price_net = tot - vat,
      pricing_configuration_id = coalesce(cfg, pricing_configuration_id),
      workflow_stage = CASE WHEN workflow_stage IN ('offer_sent','offer_ready') THEN 'offer_draft' ELSE workflow_stage END
    WHERE id = q.id;
  END IF;

  -- Always a new version, even when the total happens to stay the same.
  SELECT coalesce(max(version),0) INTO v FROM quote_versions WHERE quote_id = q.id;
  IF v <= coalesce(q.version, 0) OR (SELECT price_total FROM quotes WHERE id = q.id) IS NOT DISTINCT FROM q.price_total THEN
    INSERT INTO quote_versions (quote_id, version, pricing_mode, line_items, options, subtotal, discount, net, vat_rate, vat, total, currency, pricing_configuration_id)
    SELECT id, v + 1, coalesce(pricing_mode,'fixed'), '[]'::jsonb, coalesce(options,'[]'::jsonb), coalesce(price_net,0), 0, coalesce(price_net,0),
           CASE WHEN coalesce(price_net,0) > 0 THEN round(coalesce(price_vat,0)/price_net,4) ELSE 0 END,
           coalesce(price_vat,0), coalesce(price_total,0), 'CHF', pricing_configuration_id
      FROM quotes WHERE id = q.id;
    v := v + 1;
    UPDATE quotes SET version = v WHERE id = q.id;
  END IF;
  SELECT version INTO v FROM quotes WHERE id = q.id;

  PERFORM public.dop_log('quote', q.id, q.reference, 'distance_confirmed', jsonb_build_object(
    'old_km', q.distance_km, 'old_source', q.distance_source, 'new_km', round(_km,2), 'source', _source,
    'planning_km', _planning_km, 'old_total', q.price_total,
    'new_total', (SELECT price_total FROM quotes WHERE id = q.id), 'version', v, 'by', who, 'at', now()));
  RETURN v;
END $$;
REVOKE ALL ON FUNCTION public.dop_confirm_distance(uuid,numeric,text,jsonb,numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dop_confirm_distance(uuid,numeric,text,jsonb,numeric) TO authenticated;