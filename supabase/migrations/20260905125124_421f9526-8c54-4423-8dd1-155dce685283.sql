DROP FUNCTION IF EXISTS public.next_job_exec_reference();

CREATE OR REPLACE FUNCTION public.set_job_exec_reference()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; candidate text; i int;
BEGIN
  IF NEW.reference IS NOT NULL AND NEW.reference <> '' AND NEW.reference <> 'pending' THEN RETURN NEW; END IF;
  LOOP
    candidate := 'PSU-JOB-' || to_char(now(),'YYYY') || '-';
    FOR i IN 1..8 LOOP
      candidate := candidate || substr(alphabet, 1 + floor(random()*length(alphabet))::int, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.jobs_execution WHERE reference = candidate);
  END LOOP;
  NEW.reference := candidate; RETURN NEW;
END; $$;