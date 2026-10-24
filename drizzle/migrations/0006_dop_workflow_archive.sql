ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS workflow_stage text NOT NULL DEFAULT 'new_request',
  ADD COLUMN IF NOT EXISTS archived_at timestamptz, ADD COLUMN IF NOT EXISTS archived_by uuid;
ALTER TABLE public.enquiries ADD COLUMN IF NOT EXISTS workflow_stage text NOT NULL DEFAULT 'new_request',
  ADD COLUMN IF NOT EXISTS archived_at timestamptz, ADD COLUMN IF NOT EXISTS archived_by uuid;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS workflow_stage text NOT NULL DEFAULT 'new_request',
  ADD COLUMN IF NOT EXISTS archived_at timestamptz, ADD COLUMN IF NOT EXISTS archived_by uuid,
  ADD COLUMN IF NOT EXISTS lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS job_id uuid REFERENCES public.jobs_execution(id) ON DELETE SET NULL;
ALTER TABLE public.jobs_execution ADD COLUMN IF NOT EXISTS archived_at timestamptz, ADD COLUMN IF NOT EXISTS archived_by uuid;

-- Backfill: link planner quotes to their lead through the shared reference.
UPDATE public.quotes q SET lead_id = l.id
  FROM public.leads l
 WHERE q.lead_id IS NULL AND l.service_details->>'quote_reference' = q.reference;
UPDATE public.quotes q SET job_id = j.id
  FROM public.jobs_execution j
 WHERE q.job_id IS NULL AND j.quote_reference = q.reference;
UPDATE public.quotes SET workflow_stage = CASE
    WHEN job_id IS NOT NULL THEN 'order'
    WHEN accepted_at IS NOT NULL THEN 'offer_accepted'
    WHEN sent_at IS NOT NULL THEN 'offer_sent'
    WHEN lead_id IS NULL THEN 'offer_draft'
    ELSE 'new_request' END;
UPDATE public.leads l SET workflow_stage = CASE
    WHEN EXISTS (SELECT 1 FROM public.jobs_execution j WHERE j.lead_id = l.id) THEN 'order'
    WHEN l.status::text IN ('won','scheduled','in_progress','completed') THEN 'order'
    WHEN l.status::text IN ('lost','cancelled','unqualified') THEN 'closed'
    WHEN EXISTS (SELECT 1 FROM public.quotes q WHERE q.lead_id = l.id AND q.workflow_stage <> 'new_request') THEN 'offer'
    WHEN l.status::text IN ('quote_sent','negotiation') THEN 'offer'
    ELSE 'new_request' END;

CREATE INDEX IF NOT EXISTS leads_stage_idx ON public.leads (workflow_stage) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS quotes_stage_idx ON public.quotes (workflow_stage) WHERE archived_at IS NULL;

-- Workflow history across request, offer and order.
CREATE TABLE public.workflow_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity text NOT NULL,
  entity_id uuid NOT NULL,
  reference text NOT NULL DEFAULT '',
  action text NOT NULL,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  actor_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.workflow_events TO authenticated;
GRANT ALL ON public.workflow_events TO service_role;
ALTER TABLE public.workflow_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read workflow events" ON public.workflow_events FOR SELECT TO authenticated
  USING (public.is_staff() OR public.is_dispatcher());
CREATE INDEX workflow_events_entity_idx ON public.workflow_events (entity_id, created_at);

-- Manual price changes: old and new value, never overwriting the customer calculation.
CREATE TABLE public.quote_price_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  old_total numeric NOT NULL,
  new_total numeric NOT NULL,
  reason text NOT NULL DEFAULT '',
  version integer NOT NULL,
  actor_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.quote_price_overrides TO authenticated;
GRANT ALL ON public.quote_price_overrides TO service_role;
ALTER TABLE public.quote_price_overrides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read price overrides" ON public.quote_price_overrides FOR SELECT TO authenticated
  USING (public.is_staff() OR public.is_dispatcher());

CREATE OR REPLACE FUNCTION public.dop_log(_entity text, _id uuid, _ref text, _action text, _detail jsonb DEFAULT '{}'::jsonb)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.workflow_events(entity, entity_id, reference, action, detail, actor_id)
  VALUES (_entity, _id, coalesce(_ref,''), _action, coalesce(_detail,'{}'::jsonb), auth.uid());
$$;
REVOKE ALL ON FUNCTION public.dop_log(text,uuid,text,text,jsonb) FROM PUBLIC, anon, authenticated;

-- Archive / restore (soft delete) for requests, offers and orders.
CREATE OR REPLACE FUNCTION public.dop_archive(_kind text, _id uuid, _restore boolean DEFAULT false)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE ref text; ts timestamptz := CASE WHEN _restore THEN NULL ELSE now() END;
        who uuid := CASE WHEN _restore THEN NULL ELSE auth.uid() END;
BEGIN
  IF NOT (public.is_staff() OR public.is_dispatcher()) THEN RAISE EXCEPTION 'not authorised' USING ERRCODE='42501'; END IF;
  IF _kind = 'lead' THEN UPDATE leads SET archived_at = ts, archived_by = who WHERE id = _id RETURNING reference INTO ref;
  ELSIF _kind = 'enquiry' THEN UPDATE enquiries SET archived_at = ts, archived_by = who WHERE id = _id RETURNING name INTO ref;
  ELSIF _kind = 'quote' THEN UPDATE quotes SET archived_at = ts, archived_by = who WHERE id = _id RETURNING reference INTO ref;
  ELSIF _kind = 'job' THEN UPDATE jobs_execution SET archived_at = ts, archived_by = who WHERE id = _id RETURNING reference INTO ref;
  ELSE RAISE EXCEPTION 'unknown kind' USING ERRCODE='22023'; END IF;
  IF NOT FOUND THEN RAISE EXCEPTION 'not found' USING ERRCODE='P0002'; END IF;
  PERFORM public.dop_log(_kind, _id, ref, CASE WHEN _restore THEN 'restored' ELSE 'archived' END);
END $$;
REVOKE ALL ON FUNCTION public.dop_archive(text,uuid,boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dop_archive(text,uuid,boolean) TO authenticated;

-- Neue Anfrage -> Offerte. One record moves; nothing is duplicated.
CREATE OR REPLACE FUNCTION public.dop_request_to_offer(_kind text, _id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE q public.quotes; l public.leads;
BEGIN
  IF NOT (public.is_staff() OR public.is_dispatcher()) THEN RAISE EXCEPTION 'not authorised' USING ERRCODE='42501'; END IF;
  IF _kind = 'enquiry' THEN
    UPDATE enquiries SET workflow_stage = 'offer' WHERE id = _id;
    PERFORM public.dop_log('enquiry', _id, '', 'offer_created');
    RETURN NULL;
  END IF;
  SELECT * INTO l FROM leads WHERE id = _id;
  IF l.id IS NULL THEN RAISE EXCEPTION 'not found' USING ERRCODE='P0002'; END IF;
  SELECT * INTO q FROM quotes WHERE lead_id = l.id ORDER BY created_at DESC LIMIT 1;
  UPDATE leads SET workflow_stage = 'offer', quoted_at = coalesce(quoted_at, now()) WHERE id = l.id;
  IF q.id IS NOT NULL AND q.workflow_stage = 'new_request' THEN
    UPDATE quotes SET workflow_stage = 'offer_draft' WHERE id = q.id;
  END IF;
  PERFORM public.dop_log('lead', l.id, l.reference, 'offer_created', jsonb_build_object('quote', q.reference));
  RETURN q.id;
END $$;
REVOKE ALL ON FUNCTION public.dop_request_to_offer(text,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dop_request_to_offer(text,uuid) TO authenticated;

-- Offer stage changes made from the DOP (ready / sent), with history.
CREATE OR REPLACE FUNCTION public.dop_set_offer_stage(_quote_id uuid, _stage text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE ref text;
BEGIN
  IF NOT (public.is_staff() OR public.is_dispatcher()) THEN RAISE EXCEPTION 'not authorised' USING ERRCODE='42501'; END IF;
  IF _stage NOT IN ('offer_draft','offer_ready','offer_sent','offer_accepted') THEN RAISE EXCEPTION 'bad stage' USING ERRCODE='22023'; END IF;
  UPDATE quotes SET workflow_stage = _stage WHERE id = _quote_id AND workflow_stage <> 'order' RETURNING reference INTO ref;
  IF ref IS NULL THEN RAISE EXCEPTION 'not found' USING ERRCODE='P0002'; END IF;
  PERFORM public.dop_log('quote', _quote_id, ref, 'stage_' || _stage);
END $$;
REVOKE ALL ON FUNCTION public.dop_set_offer_stage(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dop_set_offer_stage(uuid,text) TO authenticated;

-- Manual price change: new version, old value kept in the log.
CREATE OR REPLACE FUNCTION public.dop_override_price(_quote_id uuid, _new_total numeric, _reason text)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE q public.quotes; v integer; vat numeric;
BEGIN
  IF NOT public.is_staff() THEN RAISE EXCEPTION 'not authorised' USING ERRCODE='42501'; END IF;
  IF _new_total IS NULL OR _new_total <= 0 THEN RAISE EXCEPTION 'invalid amount' USING ERRCODE='22023'; END IF;
  IF coalesce(trim(_reason),'') = '' THEN RAISE EXCEPTION 'reason required' USING ERRCODE='22023'; END IF;
  SELECT * INTO q FROM quotes WHERE id = _quote_id FOR UPDATE;
  IF q.id IS NULL THEN RAISE EXCEPTION 'not found' USING ERRCODE='P0002'; END IF;
  IF q.accepted_at IS NOT NULL OR q.workflow_stage = 'order' THEN RAISE EXCEPTION 'accepted offers are frozen' USING ERRCODE='22023'; END IF;
  v := coalesce(q.version,1) + 1;
  vat := round(_new_total - _new_total / (1 + coalesce(nullif(q.price_vat,0) / nullif(q.price_net,0), 0.081)), 2);
  INSERT INTO quote_price_overrides(quote_id, old_total, new_total, reason, version, actor_id)
  VALUES (q.id, coalesce(q.price_total,0), _new_total, trim(_reason), v, auth.uid());
  UPDATE quotes SET price_total = _new_total, price_vat = vat, price_net = _new_total - vat,
         version = v, workflow_stage = CASE WHEN workflow_stage IN ('offer_sent','offer_ready') THEN 'offer_draft' ELSE workflow_stage END
   WHERE id = q.id;
  PERFORM public.dop_log('quote', q.id, q.reference, 'price_changed',
    jsonb_build_object('old', q.price_total, 'new', _new_total, 'version', v, 'reason', trim(_reason)));
  RETURN v;
END $$;
REVOKE ALL ON FUNCTION public.dop_override_price(uuid,numeric,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dop_override_price(uuid,numeric,text) TO authenticated;

-- Offerte -> Auftrag. Exactly one job per offer; the offer snapshot stays untouched.
CREATE OR REPLACE FUNCTION public.dop_offer_to_order(_quote_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE q public.quotes; l public.leads; j public.jobs_execution; atts jsonb := '[]'::jsonb; s jsonb;
BEGIN
  IF NOT (public.is_staff() OR public.is_dispatcher()) THEN RAISE EXCEPTION 'not authorised' USING ERRCODE='42501'; END IF;
  SELECT * INTO q FROM quotes WHERE id = _quote_id FOR UPDATE;
  IF q.id IS NULL THEN RAISE EXCEPTION 'not found' USING ERRCODE='P0002'; END IF;
  IF q.job_id IS NOT NULL THEN RETURN q.job_id; END IF;
  IF coalesce(q.price_total,0) <= 0 THEN RAISE EXCEPTION 'pricing_required' USING ERRCODE='22023'; END IF;
  SELECT * INTO l FROM leads WHERE id = q.lead_id;
  IF l.id IS NOT NULL THEN
    SELECT coalesce(jsonb_agg(jsonb_build_object('id',a.id,'file_name',a.file_name,'storage_path',a.storage_path,
             'mime_type',a.mime_type,'size_bytes',a.size_bytes)),'[]'::jsonb)
      INTO atts FROM lead_attachments a WHERE a.lead_id = l.id;
  END IF;
  s := coalesce(q.services,'{}'::jsonb);
  INSERT INTO jobs_execution (lead_id, quote_reference, lead_reference, status, scheduled_start, job_value,
    customer_name, customer_email, customer_phone, customer_language, service_key,
    origin, destination, inventory, extras, attachments, booking_notes, booked_at, booked_by, billing_status)
  VALUES (l.id, q.reference, l.reference, 'scheduled',
    CASE WHEN q.move_date IS NOT NULL THEN (q.move_date::text || ' 08:00')::timestamp AT TIME ZONE 'Europe/Zurich' END,
    q.price_total, q.customer_name, q.customer_email, q.customer_phone, q.language,
    CASE WHEN (s->'flags'->>'move')::boolean OR (s->>'move')::boolean THEN 'move' ELSE '' END,
    jsonb_build_object('street', q.from_address, 'zip', q.from_zip),
    jsonb_build_object('street', q.to_address, 'zip', q.to_zip),
    coalesce(q.items,'{}'::jsonb), coalesce(s->'extras','[]'::jsonb), atts,
    coalesce(q.customer_notes,''), now(), auth.uid(), 'unpaid')
  RETURNING * INTO j;
  UPDATE quotes SET job_id = j.id, workflow_stage = 'order' WHERE id = q.id;
  IF l.id IS NOT NULL THEN UPDATE leads SET workflow_stage = 'order' WHERE id = l.id; END IF;
  PERFORM public.dop_log('quote', q.id, q.reference, 'converted_to_order', jsonb_build_object('job', j.reference, 'version', q.version));
  PERFORM public.dop_log('job', j.id, j.reference, 'order_created', jsonb_build_object('quote', q.reference));
  RETURN j.id;
END $$;
REVOKE ALL ON FUNCTION public.dop_offer_to_order(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dop_offer_to_order(uuid) TO authenticated;

-- Record a send attempt with the exact version.
CREATE OR REPLACE FUNCTION public.dop_log_send(_quote_id uuid, _recipient text, _status text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE q public.quotes;
BEGIN
  IF NOT (public.is_staff() OR public.is_dispatcher()) THEN RAISE EXCEPTION 'not authorised' USING ERRCODE='42501'; END IF;
  SELECT * INTO q FROM quotes WHERE id = _quote_id;
  IF q.id IS NULL THEN RAISE EXCEPTION 'not found' USING ERRCODE='P0002'; END IF;
  PERFORM public.dop_log('quote', q.id, q.reference, 'sent',
    jsonb_build_object('recipient', _recipient, 'version', q.version, 'status', _status));
  IF _status = 'sent' AND q.workflow_stage IN ('offer_draft','offer_ready','new_request') THEN
    UPDATE quotes SET workflow_stage = 'offer_sent' WHERE id = q.id;
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.dop_log_send(uuid,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dop_log_send(uuid,text,text) TO authenticated;

-- New planner quotes: link to the lead once the lead is written.
CREATE OR REPLACE FUNCTION public.leads_link_quote() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.service_details ? 'quote_reference' THEN
    UPDATE quotes SET lead_id = NEW.id WHERE reference = NEW.service_details->>'quote_reference' AND lead_id IS NULL;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER leads_link_quote AFTER INSERT ON public.leads FOR EACH ROW EXECUTE FUNCTION public.leads_link_quote();