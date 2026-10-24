CREATE OR REPLACE FUNCTION public.dop_correct_customer(_quote_id uuid, _payload jsonb, _reason text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE q public.quotes; k text; before jsonb := '{}'::jsonb; after jsonb := '{}'::jsonb; nv text; ov text; jobs int := 0;
  allowed text[] := ARRAY['customer_name','customer_company','customer_phone','customer_email','customer_street','customer_zip','customer_city','customer_country'];
BEGIN
  IF NOT (public.is_staff() OR public.is_dispatcher()) THEN RAISE EXCEPTION 'not_authorised' USING ERRCODE='42501'; END IF;
  IF coalesce(trim(_reason),'') = '' THEN RAISE EXCEPTION 'reason_required' USING ERRCODE='22023'; END IF;
  SELECT * INTO q FROM quotes WHERE id = _quote_id FOR UPDATE;
  IF q.id IS NULL THEN RAISE EXCEPTION 'quote_not_found' USING ERRCODE='P0002'; END IF;
  FOR k IN SELECT jsonb_object_keys(coalesce(_payload,'{}'::jsonb)) LOOP
    IF NOT k = ANY(allowed) THEN RAISE EXCEPTION 'field_not_correctable: %', k USING ERRCODE='22023'; END IF;
    nv := left(trim(coalesce(_payload->>k,'')), 200);
    ov := coalesce(to_jsonb(q)->>k, '');
    IF nv IS DISTINCT FROM ov THEN
      before := before || jsonb_build_object(k, ov);
      after := after || jsonb_build_object(k, nv);
    END IF;
  END LOOP;
  IF after = '{}'::jsonb THEN RAISE EXCEPTION 'no_change' USING ERRCODE='22023'; END IF;
  IF after ? 'customer_name' AND after->>'customer_name' = '' THEN RAISE EXCEPTION 'name_required' USING ERRCODE='22023'; END IF;
  IF after ? 'customer_email' AND after->>'customer_email' <> '' AND after->>'customer_email' !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'invalid_email' USING ERRCODE='22023'; END IF;

  UPDATE quotes SET
    customer_name = CASE WHEN after ? 'customer_name' THEN after->>'customer_name' ELSE customer_name END,
    customer_company = CASE WHEN after ? 'customer_company' THEN nullif(after->>'customer_company','') ELSE customer_company END,
    customer_phone = CASE WHEN after ? 'customer_phone' THEN nullif(after->>'customer_phone','') ELSE customer_phone END,
    customer_email = CASE WHEN after ? 'customer_email' THEN nullif(after->>'customer_email','') ELSE customer_email END,
    customer_street = CASE WHEN after ? 'customer_street' THEN nullif(after->>'customer_street','') ELSE customer_street END,
    customer_zip = CASE WHEN after ? 'customer_zip' THEN nullif(after->>'customer_zip','') ELSE customer_zip END,
    customer_city = CASE WHEN after ? 'customer_city' THEN nullif(after->>'customer_city','') ELSE customer_city END,
    customer_country = CASE WHEN after ? 'customer_country' THEN nullif(after->>'customer_country','') ELSE customer_country END
  WHERE id = q.id;

  UPDATE jobs_execution SET
    customer_name = CASE WHEN after ? 'customer_name' THEN after->>'customer_name' ELSE customer_name END,
    customer_phone = CASE WHEN after ? 'customer_phone' THEN nullif(after->>'customer_phone','') ELSE customer_phone END,
    customer_email = CASE WHEN after ? 'customer_email' THEN nullif(after->>'customer_email','') ELSE customer_email END
  WHERE quote_id = q.id;
  GET DIAGNOSTICS jobs = ROW_COUNT;

  PERFORM public.dop_log('quote', q.id, q.reference, 'customer_corrected',
    jsonb_build_object('before', before, 'after', after, 'reason', trim(_reason), 'minor', true,
      'accepted', q.accepted_at IS NOT NULL, 'jobs_updated', jobs, 'snapshot_unchanged', true));
  RETURN jobs;
END $function$;

REVOKE ALL ON FUNCTION public.dop_correct_customer(uuid, jsonb, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dop_correct_customer(uuid, jsonb, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.dop_reject_offer(_quote_id uuid, _reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE q public.quotes;
BEGIN
  IF NOT (public.is_staff() OR public.is_dispatcher()) THEN RAISE EXCEPTION 'not_authorised' USING ERRCODE='42501'; END IF;
  IF coalesce(trim(_reason),'') = '' THEN RAISE EXCEPTION 'reason_required' USING ERRCODE='22023'; END IF;
  SELECT * INTO q FROM quotes WHERE id = _quote_id FOR UPDATE;
  IF q.id IS NULL THEN RAISE EXCEPTION 'quote_not_found' USING ERRCODE='P0002'; END IF;
  IF q.accepted_at IS NOT NULL OR q.job_id IS NOT NULL OR q.workflow_stage IN ('offer_accepted','order','closed') THEN
    RAISE EXCEPTION 'accepted offers are frozen' USING ERRCODE='22023'; END IF;
  IF q.workflow_stage = 'offer_rejected' THEN RETURN; END IF;
  UPDATE quotes SET workflow_stage = 'offer_rejected' WHERE id = q.id;
  PERFORM public.dop_log('quote', q.id, q.reference, 'stage_offer_rejected',
    jsonb_build_object('from', q.workflow_stage, 'reason', trim(_reason)));
END $function$;

REVOKE ALL ON FUNCTION public.dop_reject_offer(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dop_reject_offer(uuid, text) TO authenticated;