CREATE OR REPLACE FUNCTION public.leads_flag_duplicate_trg()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  PERFORM public.flag_lead_duplicate(NEW.id);
  RETURN NULL;
EXCEPTION WHEN OTHERS THEN
  -- Duplicate detection must never block an incoming enquiry.
  RETURN NULL;
END;
$function$;

DROP TRIGGER IF EXISTS leads_flag_duplicate ON public.leads;
CREATE TRIGGER leads_flag_duplicate AFTER INSERT ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.leads_flag_duplicate_trg();