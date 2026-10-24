CREATE OR REPLACE FUNCTION public.dop_set_offer_stage(_quote_id uuid, _stage text, _reason text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE q public.quotes; stages text[] := ARRAY['offer_draft','offer_ready','offer_sent','offer_accepted'];
        cur int; nxt int; skip boolean;
BEGIN
  IF NOT (public.is_staff() OR public.is_dispatcher()) THEN RAISE EXCEPTION 'not authorised' USING ERRCODE='42501'; END IF;
  nxt := array_position(stages, _stage);
  IF nxt IS NULL THEN RAISE EXCEPTION 'bad stage' USING ERRCODE='22023'; END IF;
  SELECT * INTO q FROM quotes WHERE id = _quote_id FOR UPDATE;
  IF q.id IS NULL OR q.workflow_stage = 'order' THEN RAISE EXCEPTION 'not found' USING ERRCODE='P0002'; END IF;
  -- A rejected offer may only be reopened as a draft.
  IF q.workflow_stage = 'offer_rejected' THEN
    IF nxt <> 1 THEN RAISE EXCEPTION 'stage_skip_forbidden' USING ERRCODE='42501'; END IF;
    UPDATE quotes SET workflow_stage = 'offer_draft' WHERE id = q.id;
    PERFORM public.dop_log('quote', q.id, q.reference, 'stage_offer_draft',
      jsonb_build_object('from', q.workflow_stage, 'override', false, 'reason', nullif(trim(coalesce(_reason,'')),'')));
    RETURN;
  END IF;
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
END $function$;