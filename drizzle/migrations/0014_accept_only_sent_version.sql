-- Customers can accept only the version that was actually sent.
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS sent_version integer;
GRANT SELECT (sent_version) ON public.quotes TO authenticated;

CREATE OR REPLACE FUNCTION public.quotes_release_tracking()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  -- Sending releases exactly the current version.
  IF NEW.workflow_stage = 'offer_sent' AND OLD.workflow_stage IS DISTINCT FROM 'offer_sent' THEN
    NEW.sent_version := NEW.version;
  END IF;
  -- A new version after release must be sent again.
  IF NEW.accepted_at IS NULL AND coalesce(NEW.version,1) > coalesce(OLD.version,1)
     AND NEW.workflow_stage IN ('offer_ready','offer_sent') THEN
    NEW.workflow_stage := 'offer_draft';
  END IF;
  RETURN NEW;
END $function$;
DROP TRIGGER IF EXISTS trg_quotes_release_tracking ON public.quotes;
CREATE TRIGGER trg_quotes_release_tracking BEFORE UPDATE ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION public.quotes_release_tracking();

CREATE OR REPLACE FUNCTION public.quotes_acceptance_stage()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.accepted_at IS NULL AND NEW.accepted_at IS NOT NULL THEN
    IF NOT (OLD.workflow_stage = 'offer_sent' AND OLD.sent_version IS NOT NULL
            AND OLD.sent_version = NEW.accepted_version AND OLD.version = OLD.sent_version) THEN
      RAISE EXCEPTION 'quote_not_released' USING ERRCODE = '22023';
    END IF;
    NEW.workflow_stage := 'offer_accepted';
    PERFORM public.dop_log('quote', NEW.id, NEW.reference, 'offer_accepted',
      jsonb_build_object('version', NEW.accepted_version, 'by', NEW.accepted_by_name, 'total', NEW.price_total, 'at', NEW.accepted_at));
  END IF;
  RETURN NEW;
END $function$;

DROP FUNCTION IF EXISTS public.public_quote_snapshot(text, text);
CREATE FUNCTION public.public_quote_snapshot(_reference text, _contact text)
 RETURNS TABLE(version integer, total numeric, options jsonb, accepted_at timestamp with time zone, acceptable boolean)
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  RETURN QUERY
  SELECT v.version, v.total, v.options, q.accepted_at,
         (q.workflow_stage = 'offer_sent' AND q.sent_version IS NOT NULL AND q.sent_version = v.version)
    FROM public.quotes q
    JOIN public.quote_versions v ON v.quote_id = q.id
   WHERE q.reference = btrim(_reference)
     AND public.quote_contact_matches(q.id, _contact)
   ORDER BY v.version DESC
   LIMIT 1;
END;
$function$;
REVOKE ALL ON FUNCTION public.public_quote_snapshot(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_quote_snapshot(text, text) TO anon, authenticated, service_role;