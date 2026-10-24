-- Customer acceptance moves the offer to "Offerte angenommen" and writes a history entry.
CREATE OR REPLACE FUNCTION public.quotes_acceptance_stage()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.accepted_at IS NULL AND NEW.accepted_at IS NOT NULL
     AND coalesce(NEW.workflow_stage,'') NOT IN ('order','offer_accepted') THEN
    NEW.workflow_stage := 'offer_accepted';
    PERFORM public.dop_log('quote', NEW.id, NEW.reference, 'offer_accepted',
      jsonb_build_object('version', NEW.accepted_version, 'by', NEW.accepted_by_name, 'total', NEW.price_total));
  END IF;
  RETURN NEW;
END $function$;
DROP TRIGGER IF EXISTS trg_quotes_acceptance_stage ON public.quotes;
CREATE TRIGGER trg_quotes_acceptance_stage BEFORE UPDATE OF accepted_at ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION public.quotes_acceptance_stage();