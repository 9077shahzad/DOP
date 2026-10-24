
CREATE TABLE IF NOT EXISTS public.minimum_billing_policy (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  min_hours numeric NOT NULL CHECK (min_hours > 0),
  basis text NOT NULL CHECK (basis IN ('person','team')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','superseded')),
  effective_from timestamptz NOT NULL DEFAULT now(),
  approved_by text NOT NULL,
  approved_on date NOT NULL DEFAULT current_date,
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.minimum_billing_policy TO authenticated;
GRANT ALL ON public.minimum_billing_policy TO service_role;
ALTER TABLE public.minimum_billing_policy ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff read minimum billing policy" ON public.minimum_billing_policy;
CREATE POLICY "staff read minimum billing policy"
  ON public.minimum_billing_policy FOR SELECT TO authenticated
  USING (public.is_staff());

CREATE UNIQUE INDEX IF NOT EXISTS minimum_billing_policy_one_active
  ON public.minimum_billing_policy (status) WHERE status = 'active';

INSERT INTO public.minimum_billing_policy (min_hours, basis, approved_by, note)
SELECT 4, 'person', 'Eigentümer PS Umzug AG',
       'Firmenweite Mindestverrechnung: jeder neue Auftrag und jede Dienstleistungszusage umfasst mindestens vier verrechenbare Stunden, unabhängig von Leistungsart und Buchungskanal. Die effektive Arbeitszeit wird separat erfasst.'
WHERE NOT EXISTS (SELECT 1 FROM public.minimum_billing_policy WHERE status = 'active');

ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS min_hours_attested_at timestamptz,
  ADD COLUMN IF NOT EXISTS min_hours_attested_by uuid,
  ADD COLUMN IF NOT EXISTS min_hours_note text NOT NULL DEFAULT '';

ALTER TABLE public.quotes_customer
  ADD COLUMN IF NOT EXISTS min_hours_attested_at timestamptz,
  ADD COLUMN IF NOT EXISTS min_hours_attested_by uuid,
  ADD COLUMN IF NOT EXISTS min_hours_note text NOT NULL DEFAULT '';

CREATE OR REPLACE FUNCTION public.minimum_gate_state(_created timestamptz, _attested timestamptz)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public','pg_temp'
AS $function$
DECLARE
  p public.minimum_billing_policy;
  rate numeric;
BEGIN
  SELECT * INTO p FROM public.minimum_billing_policy
   WHERE status = 'active' ORDER BY effective_from DESC LIMIT 1;
  IF p.id IS NULL THEN
    RETURN jsonb_build_object('ok', true, 'reason', 'no_active_policy');
  END IF;
  IF _created IS NOT NULL AND _created < p.effective_from THEN
    RETURN jsonb_build_object('ok', true, 'reason', 'before_policy', 'min_hours', p.min_hours);
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

  IF rate IS NOT NULL THEN
    RETURN jsonb_build_object('ok', true, 'reason', 'hourly_tariff_active',
                              'min_hours', p.min_hours, 'basis', p.basis, 'rate', rate);
  END IF;

  IF _attested IS NOT NULL THEN
    RETURN jsonb_build_object('ok', true, 'reason', 'staff_attested',
                              'min_hours', p.min_hours, 'basis', p.basis);
  END IF;

  RETURN jsonb_build_object('ok', false, 'reason', 'no_approved_minimum_basis',
                            'min_hours', p.min_hours, 'basis', p.basis);
END;
$function$;

REVOKE ALL ON FUNCTION public.minimum_gate_state(timestamptz, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.minimum_gate_state(timestamptz, timestamptz) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.attest_minimum_hours(_kind text, _id uuid, _note text DEFAULT '')
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','pg_temp'
AS $function$
BEGIN
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'not authorised' USING ERRCODE = '42501';
  END IF;
  IF coalesce(btrim(_note), '') = '' THEN
    RAISE EXCEPTION 'minimum_attestation_note_required';
  END IF;
  IF _kind = 'planner' THEN
    UPDATE public.quotes
       SET min_hours_attested_at = now(), min_hours_attested_by = auth.uid(), min_hours_note = btrim(_note)
     WHERE id = _id;
  ELSIF _kind = 'customer' THEN
    UPDATE public.quotes_customer
       SET min_hours_attested_at = now(), min_hours_attested_by = auth.uid(), min_hours_note = btrim(_note)
     WHERE id = _id;
  ELSE
    RAISE EXCEPTION 'unknown_quote_kind';
  END IF;
  RETURN true;
END;
$function$;

REVOKE ALL ON FUNCTION public.attest_minimum_hours(text, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.attest_minimum_hours(text, uuid, text) TO authenticated, service_role;

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
    gate := public.minimum_gate_state(q.created_at, q.min_hours_attested_at);
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
SET search_path TO 'public','pg_temp'
AS $function$
DECLARE gate jsonb;
BEGIN
  IF NEW.status IN ('sent','accepted') AND NEW.status IS DISTINCT FROM OLD.status THEN
    gate := public.minimum_gate_state(OLD.created_at, NEW.min_hours_attested_at);
    IF NOT (gate->>'ok')::boolean THEN
      RAISE EXCEPTION 'minimum_hours_unverified';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS quotes_customer_minimum_gate ON public.quotes_customer;
CREATE TRIGGER quotes_customer_minimum_gate
  BEFORE UPDATE ON public.quotes_customer
  FOR EACH ROW EXECUTE FUNCTION public.quotes_customer_minimum_gate();
