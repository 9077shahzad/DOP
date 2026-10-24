DROP FUNCTION IF EXISTS public.minimum_gate_state(timestamp with time zone, numeric, integer);

CREATE OR REPLACE FUNCTION public.minimum_gate_state(_accepted timestamp with time zone, _total numeric, _people integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  p public.minimum_billing_policy;
  rate numeric;
  heads integer;
  floor_amount numeric;
BEGIN
  SELECT * INTO p FROM public.minimum_billing_policy
   WHERE status = 'active' ORDER BY effective_from DESC LIMIT 1;
  IF p.id IS NULL THEN
    RETURN jsonb_build_object('ok', true, 'reason', 'no_active_policy');
  END IF;

  -- Only a commitment already accepted before the rule took effect keeps its terms.
  IF _accepted IS NOT NULL AND _accepted < p.effective_from THEN
    RETURN jsonb_build_object('ok', true, 'reason', 'accepted_before_policy', 'min_hours', p.min_hours);
  END IF;

  SELECT r.price INTO rate
    FROM public.pricing_rules r
    JOIN public.pricing_configurations c ON c.id = r.configuration_id
   WHERE c.status = 'published'
     AND c.effective_from <= current_date
     AND r.service = 'labour'
     AND r.unit_type = (CASE WHEN p.basis = 'team' THEN 'per_team_hour' ELSE 'per_person_hour' END)
     AND r.price > 0
   ORDER BY c.effective_from DESC
   LIMIT 1;

  IF rate IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'no_approved_calculation_basis',
                              'min_hours', p.min_hours, 'basis', p.basis);
  END IF;

  IF p.basis = 'team' THEN
    floor_amount := p.min_hours * rate;
  ELSE
    heads := _people;
    IF heads IS NULL OR heads < 1 THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'staffing_unknown',
                                'min_hours', p.min_hours, 'basis', p.basis, 'rate', rate);
    END IF;
    floor_amount := p.min_hours * rate * heads;
  END IF;

  IF _total IS NULL OR round(_total, 2) + 0.005 < round(floor_amount, 2) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'below_minimum',
                              'min_hours', p.min_hours, 'basis', p.basis,
                              'rate', rate, 'floor', floor_amount, 'total', _total);
  END IF;

  RETURN jsonb_build_object('ok', true, 'reason', 'meets_minimum',
                            'min_hours', p.min_hours, 'basis', p.basis,
                            'rate', rate, 'floor', floor_amount);
END;
$function$;

CREATE OR REPLACE FUNCTION public.accept_public_quote(_reference text, _contact text, _version integer, _total numeric, _accepted_by_name text DEFAULT NULL::text)
 RETURNS TABLE(reference text, accepted_version integer, accepted_at timestamp with time zone, total numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  q public.quotes;
  snapshot public.quote_versions;
  gate jsonb;
BEGIN
  SELECT * INTO q FROM public.quotes WHERE quotes.reference = btrim(_reference) LIMIT 1;
  IF q.id IS NULL OR NOT public.quote_contact_matches(q.id, _contact) THEN
    RAISE EXCEPTION 'quote_not_found';
  END IF;

  SELECT * INTO snapshot
    FROM public.quote_versions v
   WHERE v.quote_id = q.id
   ORDER BY v.version DESC
   LIMIT 1;

  IF snapshot.id IS NULL THEN RAISE EXCEPTION 'quote_version_missing'; END IF;
  IF snapshot.version <> _version THEN RAISE EXCEPTION 'quote_version_stale'; END IF;
  IF round(snapshot.total, 2) IS DISTINCT FROM round(_total, 2) THEN
    RAISE EXCEPTION 'quote_total_mismatch';
  END IF;

  IF q.accepted_at IS NULL THEN
    -- Not yet accepted: the age of the draft grants no exemption.
    gate := public.minimum_gate_state(NULL::timestamptz, snapshot.total, q.min_hours_people);
    IF NOT (gate->>'ok')::boolean THEN
      RAISE EXCEPTION 'minimum_hours_unverified';
    END IF;
  END IF;

  UPDATE public.quotes
     SET accepted_at = COALESCE(quotes.accepted_at, now()),
         accepted_version = snapshot.version,
         accepted_options = snapshot.options,
         accepted_by_name = COALESCE(_accepted_by_name, quotes.accepted_by_name),
         price_list_number = COALESCE(quotes.price_list_number, snapshot.price_list_number)
   WHERE quotes.id = q.id
   RETURNING quotes.reference, quotes.accepted_version, quotes.accepted_at, snapshot.total
   INTO reference, accepted_version, accepted_at, total;

  RETURN NEXT;
END;
$function$;

CREATE OR REPLACE FUNCTION public.quotes_customer_minimum_gate()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE gate jsonb;
BEGIN
  IF NEW.status IN ('sent','accepted') AND NEW.status IS DISTINCT FROM OLD.status THEN
    gate := public.minimum_gate_state(OLD.accepted_at, NEW.total, NEW.min_hours_people);
    IF NOT (gate->>'ok')::boolean THEN
      RAISE EXCEPTION 'minimum_hours_unverified';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.jobs_execution_minimum_gate()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE q public.quotes_customer; gate jsonb;
BEGIN
  IF NEW.quote_id IS NULL THEN RETURN NEW; END IF;
  SELECT * INTO q FROM public.quotes_customer WHERE id = NEW.quote_id;
  IF q.id IS NULL THEN RETURN NEW; END IF;
  gate := public.minimum_gate_state(q.accepted_at, q.total, q.min_hours_people);
  IF NOT (gate->>'ok')::boolean THEN
    RAISE EXCEPTION 'minimum_hours_unverified';
  END IF;
  RETURN NEW;
END;
$function$;