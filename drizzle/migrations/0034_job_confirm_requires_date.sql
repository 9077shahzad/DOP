CREATE OR REPLACE FUNCTION public.guard_job_confirm_requires_date()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status
     AND OLD.status = 'scheduled'
     AND NEW.status NOT IN ('scheduled','cancelled')
     AND NEW.scheduled_start IS NULL THEN
    RAISE EXCEPTION 'move_date_required' USING ERRCODE = '22023',
      HINT = 'Ein Auftrag kann erst mit gültigem Umzugsdatum bestätigt werden.';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_job_confirm_requires_date ON public.jobs_execution;
CREATE TRIGGER trg_job_confirm_requires_date
BEFORE UPDATE OF status ON public.jobs_execution
FOR EACH ROW EXECUTE FUNCTION public.guard_job_confirm_requires_date();