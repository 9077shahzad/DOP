CREATE OR REPLACE FUNCTION public.dop_offer_to_order_checked(_quote_id uuid, _override_reason text DEFAULT NULL::text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public AS $$
DECLARE q public.quotes;
BEGIN
  IF NOT (public.is_staff() OR public.is_dispatcher()) THEN RAISE EXCEPTION 'not authorised' USING ERRCODE='42501'; END IF;
  SELECT * INTO q FROM public.quotes WHERE id = _quote_id FOR UPDATE;
  IF q.id IS NULL THEN RAISE EXCEPTION 'not found' USING ERRCODE='P0002'; END IF;
  -- Preserve idempotent reads of existing orders; never alter historical rows.
  IF q.job_id IS NOT NULL THEN RETURN q.job_id; END IF;
  IF q.accepted_at IS NULL OR q.accepted_version IS NULL OR q.accepted_version IS DISTINCT FROM q.version THEN
    RAISE EXCEPTION 'acceptance_required' USING ERRCODE='22023';
  END IF;
  IF q.accepted_snapshot->'quote'->>'accepted_at' IS NULL
     OR q.accepted_snapshot->'quote'->>'id' IS DISTINCT FROM q.id::text
     OR q.accepted_snapshot->'quote'->>'accepted_version' IS DISTINCT FROM q.accepted_version::text
     OR q.accepted_snapshot->'quote'->>'version' IS DISTINCT FROM q.accepted_version::text THEN
    RAISE EXCEPTION 'accepted_snapshot_required' USING ERRCODE='22023';
  END IF;
  RETURN public.dop_offer_to_order(_quote_id);
END;
$$;
COMMENT ON FUNCTION public.dop_offer_to_order_checked(uuid, text) IS 'Requires actual customer acceptance of the current immutable offer; override reason retained only for signature compatibility, never bypasses acceptance.';
REVOKE ALL ON FUNCTION public.dop_offer_to_order_checked(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dop_offer_to_order_checked(uuid, text) TO authenticated, service_role;
-- Only the checked SECURITY DEFINER wrapper may invoke the implementation.
REVOKE EXECUTE ON FUNCTION public.dop_offer_to_order(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dop_offer_to_order(uuid) TO service_role;