ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS enquiry_id uuid REFERENCES public.enquiries(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS calculated_total numeric,
  ADD COLUMN IF NOT EXISTS manual_adjustment numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS manual_adjustment_reason text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS manual_adjustment_by text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS manual_adjustment_at timestamptz;
CREATE UNIQUE INDEX IF NOT EXISTS quotes_enquiry_uidx ON public.quotes (enquiry_id) WHERE enquiry_id IS NOT NULL;
COMMENT ON FUNCTION public.dop_override_price(uuid,numeric,text) IS 'DEPRECATED: replaced by dop_adjust_price (separate manual adjustment line)';
REVOKE EXECUTE ON FUNCTION public.dop_override_price(uuid,numeric,text) FROM authenticated;

-- Contact form -> real offer, linked to the same enquiry, never duplicated.
CREATE OR REPLACE FUNCTION public.dop_request_to_offer(_kind text, _id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE q public.quotes; l public.leads; e public.enquiries; nid uuid;
BEGIN
  IF NOT (public.is_staff() OR public.is_dispatcher()) THEN RAISE EXCEPTION 'not authorised' USING ERRCODE='42501'; END IF;
  IF _kind = 'enquiry' THEN
    SELECT * INTO e FROM enquiries WHERE id = _id FOR UPDATE;
    IF e.id IS NULL THEN RAISE EXCEPTION 'not found' USING ERRCODE='P0002'; END IF;
    SELECT id INTO nid FROM quotes WHERE enquiry_id = e.id;
    IF nid IS NULL THEN
      INSERT INTO quotes (enquiry_id, source, workflow_stage, customer_name, customer_phone, customer_email,
                          from_address, to_address, customer_notes, language)
      VALUES (e.id, 'contact_form', 'offer_draft', e.name, e.phone, e.email,
              e.from_text, e.to_text, coalesce(e.message,''), coalesce(nullif(e.language,''),'de'))
      RETURNING id INTO nid;
    END IF;
    UPDATE enquiries SET workflow_stage = 'offer' WHERE id = e.id;
    SELECT * INTO q FROM quotes WHERE id = nid;
    PERFORM public.dop_log('enquiry', e.id, q.reference, 'offer_created', jsonb_build_object('quote', q.reference));
    PERFORM public.dop_log('quote', q.id, q.reference, 'offer_created', jsonb_build_object('source', 'contact_form'));
    RETURN nid;
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

-- Stage changes follow the workflow; skipping needs an admin and a logged reason.
DROP FUNCTION IF EXISTS public.dop_set_offer_stage(uuid,text);
CREATE FUNCTION public.dop_set_offer_stage(_quote_id uuid, _stage text, _reason text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE q public.quotes; stages text[] := ARRAY['offer_draft','offer_ready','offer_sent','offer_accepted'];
        cur int; nxt int; skip boolean;
BEGIN
  IF NOT (public.is_staff() OR public.is_dispatcher()) THEN RAISE EXCEPTION 'not authorised' USING ERRCODE='42501'; END IF;
  nxt := array_position(stages, _stage);
  IF nxt IS NULL THEN RAISE EXCEPTION 'bad stage' USING ERRCODE='22023'; END IF;
  SELECT * INTO q FROM quotes WHERE id = _quote_id FOR UPDATE;
  IF q.id IS NULL OR q.workflow_stage = 'order' THEN RAISE EXCEPTION 'not found' USING ERRCODE='P0002'; END IF;
  cur := coalesce(array_position(stages, q.workflow_stage), 1);
  IF nxt = cur THEN RETURN; END IF;
  skip := NOT (nxt = cur + 1 OR nxt = 1);
  IF skip THEN
    IF NOT public.is_zw_admin() THEN RAISE EXCEPTION 'stage_skip_forbidden' USING ERRCODE='42501'; END IF;
    IF coalesce(trim(_reason),'') = '' THEN RAISE EXCEPTION 'reason_required' USING ERRCODE='22023'; END IF;
  END IF;
  UPDATE quotes SET workflow_stage = _stage WHERE id = q.id;
  PERFORM public.dop_log('quote', q.id, q.reference, 'stage_' || _stage,
    jsonb_build_object('from', q.workflow_stage, 'override', skip, 'reason', nullif(trim(coalesce(_reason,'')),'')));
END $$;
REVOKE ALL ON FUNCTION public.dop_set_offer_stage(uuid,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dop_set_offer_stage(uuid,text,text) TO authenticated;

-- Manual price adjustment: separate +/- line; the calculation stays untouched.
CREATE OR REPLACE FUNCTION public.dop_adjust_price(_quote_id uuid, _delta numeric, _reason text)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE q public.quotes; v integer; base numeric; tot numeric; ratio numeric; vat numeric; who text;
BEGIN
  IF NOT public.is_staff() THEN RAISE EXCEPTION 'not authorised' USING ERRCODE='42501'; END IF;
  IF _delta IS NULL THEN RAISE EXCEPTION 'invalid amount' USING ERRCODE='22023'; END IF;
  IF coalesce(trim(_reason),'') = '' THEN RAISE EXCEPTION 'reason_required' USING ERRCODE='22023'; END IF;
  SELECT * INTO q FROM quotes WHERE id = _quote_id FOR UPDATE;
  IF q.id IS NULL THEN RAISE EXCEPTION 'not found' USING ERRCODE='P0002'; END IF;
  IF q.accepted_at IS NOT NULL OR q.workflow_stage IN ('order','offer_accepted') THEN RAISE EXCEPTION 'accepted offers are frozen' USING ERRCODE='22023'; END IF;
  base := coalesce(q.calculated_total, coalesce(q.price_total,0) - coalesce(q.manual_adjustment,0));
  IF base <= 0 THEN RAISE EXCEPTION 'pricing_required' USING ERRCODE='22023'; END IF;
  tot := round(base + _delta, 2);
  IF tot <= 0 THEN RAISE EXCEPTION 'invalid amount' USING ERRCODE='22023'; END IF;
  ratio := coalesce(nullif(q.price_vat,0) / nullif(q.price_net,0), 0.081);
  vat := round(tot - tot / (1 + ratio), 2);
  v := coalesce(q.version,1) + 1;
  SELECT coalesce(nullif(p.full_name,''), u.email, '') INTO who
    FROM auth.users u LEFT JOIN public.profiles p ON p.id = u.id WHERE u.id = auth.uid();
  INSERT INTO quote_price_overrides(quote_id, old_total, new_total, reason, version, actor_id)
  VALUES (q.id, coalesce(q.price_total,0), tot, trim(_reason), v, auth.uid());
  UPDATE quotes SET calculated_total = base, manual_adjustment = _delta, manual_adjustment_reason = trim(_reason),
         manual_adjustment_by = coalesce(who,''), manual_adjustment_at = now(),
         price_total = tot, price_vat = vat, price_net = tot - vat, version = v,
         workflow_stage = CASE WHEN workflow_stage IN ('offer_sent','offer_ready') THEN 'offer_draft' ELSE workflow_stage END
   WHERE id = q.id;
  PERFORM public.dop_log('quote', q.id, q.reference, 'price_adjusted',
    jsonb_build_object('calculated', base, 'delta', _delta, 'old', q.price_total, 'new', tot, 'version', v, 'reason', trim(_reason), 'by', who));
  RETURN v;
END $$;
REVOKE ALL ON FUNCTION public.dop_adjust_price(uuid,numeric,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dop_adjust_price(uuid,numeric,text) TO authenticated;

-- Offerte -> Auftrag: normally only after acceptance; admin override needs a reason.
CREATE OR REPLACE FUNCTION public.dop_offer_to_order_checked(_quote_id uuid, _override_reason text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE q public.quotes; jid uuid; accepted boolean;
BEGIN
  IF NOT (public.is_staff() OR public.is_dispatcher()) THEN RAISE EXCEPTION 'not authorised' USING ERRCODE='42501'; END IF;
  SELECT * INTO q FROM quotes WHERE id = _quote_id;
  IF q.id IS NULL THEN RAISE EXCEPTION 'not found' USING ERRCODE='P0002'; END IF;
  IF q.job_id IS NOT NULL THEN RETURN q.job_id; END IF;
  accepted := q.accepted_at IS NOT NULL OR q.workflow_stage = 'offer_accepted';
  IF NOT accepted THEN
    IF NOT public.is_zw_admin() THEN RAISE EXCEPTION 'acceptance_required' USING ERRCODE='42501'; END IF;
    IF coalesce(trim(_override_reason),'') = '' THEN RAISE EXCEPTION 'reason_required' USING ERRCODE='22023'; END IF;
  END IF;
  jid := public.dop_offer_to_order(_quote_id);
  IF NOT accepted THEN
    PERFORM public.dop_log('quote', q.id, q.reference, 'order_override',
      jsonb_build_object('reason', trim(_override_reason), 'stage', q.workflow_stage));
  END IF;
  RETURN jid;
END $$;
REVOKE ALL ON FUNCTION public.dop_offer_to_order_checked(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dop_offer_to_order_checked(uuid,text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.dop_offer_to_order(uuid) FROM authenticated;