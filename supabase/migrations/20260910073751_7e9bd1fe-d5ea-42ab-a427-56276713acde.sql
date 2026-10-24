CREATE OR REPLACE FUNCTION public.jobs_execution_minimum_gate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','pg_temp'
AS $function$
DECLARE q public.quotes_customer; gate jsonb;
BEGIN
  IF NEW.quote_id IS NULL THEN RETURN NEW; END IF;
  SELECT * INTO q FROM public.quotes_customer WHERE id = NEW.quote_id;
  IF q.id IS NULL THEN RETURN NEW; END IF;
  gate := public.minimum_gate_state(q.created_at, q.min_hours_attested_at);
  IF NOT (gate->>'ok')::boolean THEN
    RAISE EXCEPTION 'minimum_hours_unverified';
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.jobs_execution_minimum_gate() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.jobs_execution_minimum_gate() TO service_role;

DROP TRIGGER IF EXISTS jobs_execution_minimum_gate ON public.jobs_execution;
CREATE TRIGGER jobs_execution_minimum_gate
  BEFORE INSERT ON public.jobs_execution
  FOR EACH ROW EXECUTE FUNCTION public.jobs_execution_minimum_gate();