-- An offer below the four-hour minimum cannot be sent/released, whichever button is used.
CREATE OR REPLACE FUNCTION public.quotes_release_tracking()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE gate jsonb;
BEGIN
  IF NEW.workflow_stage = 'offer_sent' AND OLD.workflow_stage IS DISTINCT FROM 'offer_sent' THEN
    IF NEW.accepted_at IS NULL THEN
      gate := public.minimum_gate_state(NULL::timestamptz, NEW.price_total, NEW.min_hours_people,
                                        public.quote_minimum_rate(NEW.services));
      IF NOT coalesce((gate->>'ok')::boolean, false) THEN
        RAISE EXCEPTION 'minimum_hours_unverified' USING ERRCODE = '22023';
      END IF;
    END IF;
    NEW.sent_version := NEW.version;
  END IF;
  IF NEW.accepted_at IS NULL AND coalesce(NEW.version,1) > coalesce(OLD.version,1)
     AND NEW.workflow_stage IN ('offer_ready','offer_sent') THEN
    NEW.workflow_stage := 'offer_draft';
  END IF;
  RETURN NEW;
END $function$;