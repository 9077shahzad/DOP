ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS accepted_snapshot jsonb;
COMMENT ON COLUMN public.quotes.accepted_snapshot IS 'Immutable copy of the complete offer (commercial + operational), its accepted quote_versions row and all documents, captured at the moment of customer acceptance.';

CREATE OR REPLACE FUNCTION public.quotes_capture_accepted_snapshot()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE qv jsonb; atts jsonb;
BEGIN
  IF OLD.accepted_snapshot IS NOT NULL AND NEW.accepted_snapshot IS DISTINCT FROM OLD.accepted_snapshot THEN
    RAISE EXCEPTION 'accepted snapshot is immutable' USING ERRCODE = '22023';
  END IF;
  IF OLD.accepted_at IS NULL AND NEW.accepted_at IS NOT NULL AND NEW.accepted_snapshot IS NULL THEN
    SELECT to_jsonb(v) INTO qv FROM quote_versions v
     WHERE v.quote_id = NEW.id AND v.version = coalesce(NEW.accepted_version, NEW.version);
    SELECT coalesce(jsonb_agg(x), '[]'::jsonb) INTO atts FROM (
      SELECT jsonb_build_object('source','lead','id',a.id,'file_name',a.file_name,'storage_path',a.storage_path,'mime_type',a.mime_type,'size_bytes',a.size_bytes) x
        FROM lead_attachments a WHERE NEW.lead_id IS NOT NULL AND a.lead_id = NEW.lead_id
      UNION ALL
      SELECT jsonb_build_object('source','offer','id',a.id,'file_name',a.file_name,'storage_path',a.storage_path,'mime_type',a.mime_type,'size_bytes',a.size_bytes,'kind',a.kind)
        FROM quote_attachments a WHERE a.quote_id = NEW.id) t;
    NEW.accepted_snapshot := jsonb_build_object(
      'quote', to_jsonb(NEW) - 'accepted_snapshot' - 'updated_at',
      'accepted_version', qv,
      'attachments', atts,
      'captured_at', now(),
      'source', 'acceptance');
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS quotes_accepted_snapshot ON public.quotes;
CREATE TRIGGER quotes_accepted_snapshot BEFORE UPDATE ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION public.quotes_capture_accepted_snapshot();

UPDATE public.quotes q SET accepted_snapshot = jsonb_build_object(
    'quote', to_jsonb(q) - 'accepted_snapshot' - 'updated_at',
    'accepted_version', (SELECT to_jsonb(v) FROM quote_versions v WHERE v.quote_id = q.id AND v.version = q.accepted_version),
    'attachments', '[]'::jsonb, 'captured_at', now(), 'source', 'backfill')
 WHERE q.accepted_at IS NOT NULL AND q.accepted_snapshot IS NULL AND q.accepted_version = q.version;

CREATE OR REPLACE FUNCTION public.dop_attach_offer_file(_quote_id uuid, _storage_path text, _file_name text, _mime text, _size bigint)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE q public.quotes; nid uuid;
BEGIN
  IF NOT (public.is_staff() OR public.is_dispatcher()) THEN RAISE EXCEPTION 'not authorised' USING ERRCODE='42501'; END IF;
  SELECT * INTO q FROM quotes WHERE id = _quote_id;
  IF q.id IS NULL THEN RAISE EXCEPTION 'not found' USING ERRCODE='P0002'; END IF;
  IF _storage_path !~ '^intake/[0-9a-fA-F-]{36}/' OR _mime NOT IN ('application/pdf','image/jpeg','image/png') OR _size <= 0 OR _size > 10485760 THEN
    RAISE EXCEPTION 'invalid file' USING ERRCODE='22023';
  END IF;
  INSERT INTO quote_attachments (quote_id, storage_path, file_name, mime_type, size_bytes, kind)
  VALUES (_quote_id, _storage_path, left(_file_name, 200), _mime, _size, 'staff') RETURNING id INTO nid;
  PERFORM public.dop_log('quote', q.id, q.reference, 'document_added', jsonb_build_object('file', left(_file_name,200)));
  RETURN nid;
END $$;
REVOKE ALL ON FUNCTION public.dop_attach_offer_file(uuid, text, text, text, bigint) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.dop_attach_offer_file(uuid, text, text, text, bigint) TO authenticated;

CREATE OR REPLACE FUNCTION public.dop_offer_to_order(_quote_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE q public.quotes; live public.quotes; l public.leads; j public.jobs_execution; atts jsonb := '[]'::jsonb; s jsonb; a jsonb; qv jsonb;
BEGIN
  IF NOT (public.is_staff() OR public.is_dispatcher()) THEN RAISE EXCEPTION 'not authorised' USING ERRCODE='42501'; END IF;
  SELECT * INTO q FROM quotes WHERE id = _quote_id FOR UPDATE;
  IF q.id IS NULL THEN RAISE EXCEPTION 'not found' USING ERRCODE='P0002'; END IF;
  IF q.job_id IS NOT NULL THEN RETURN q.job_id; END IF;
  live := q;
  IF q.accepted_snapshot IS NOT NULL THEN
    q := jsonb_populate_record(q, (q.accepted_snapshot->'quote') - 'id' - 'lead_id' - 'job_id' - 'workflow_stage' - 'is_test' - 'accepted_snapshot');
  END IF;
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
    UPDATE quotes SET lead_id = l.id WHERE id = q.id; q.lead_id := l.id;
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
    CASE WHEN q.move_date IS NOT NULL THEN (q.move_date::text || ' ' || coalesce(nullif(q.services->>'start_time',''),'08:00'))::timestamp AT TIME ZONE 'Europe/Zurich' END,
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
    coalesce(live.accepted_snapshot || jsonb_build_object('order_attachments', atts, 'converted_at', now()),
      jsonb_build_object('quote', to_jsonb(q) - 'updated_at' - 'accepted_snapshot', 'accepted_version', qv, 'attachments', atts, 'captured_at', now(), 'source', 'conversion')))
  RETURNING * INTO j;
  UPDATE quotes SET job_id = j.id, workflow_stage = 'order' WHERE id = q.id;
  UPDATE leads SET workflow_stage = 'order' WHERE id = l.id;
  PERFORM set_config('app.allow_test_flag', 'off', true);
  PERFORM public.dop_log('quote', q.id, q.reference, 'converted_to_order', jsonb_build_object('job', j.reference, 'version', q.version, 'from_snapshot', live.accepted_snapshot IS NOT NULL));
  PERFORM public.dop_log('job', j.id, j.reference, 'order_created', jsonb_build_object('quote', q.reference));
  RETURN j.id;
END $function$;