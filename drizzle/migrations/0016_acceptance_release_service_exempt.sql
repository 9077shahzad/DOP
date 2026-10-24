-- Trusted back-office imports (service role) may record historical acceptances; customers and staff still need a sent version.
CREATE OR REPLACE FUNCTION public.quotes_acceptance_stage()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.accepted_at IS NULL AND NEW.accepted_at IS NOT NULL THEN
    IF NOT public.is_service_role() AND NOT (OLD.workflow_stage = 'offer_sent' AND OLD.sent_version IS NOT NULL
            AND OLD.sent_version = NEW.accepted_version AND OLD.version = OLD.sent_version) THEN
      RAISE EXCEPTION 'quote_not_released' USING ERRCODE = '22023';
    END IF;
    IF NOT public.is_service_role() THEN
      NEW.workflow_stage := 'offer_accepted';
      PERFORM public.dop_log('quote', NEW.id, NEW.reference, 'offer_accepted',
        jsonb_build_object('version', NEW.accepted_version, 'by', NEW.accepted_by_name, 'total', NEW.price_total, 'at', NEW.accepted_at));
    END IF;
  END IF;
  RETURN NEW;
END $function$;