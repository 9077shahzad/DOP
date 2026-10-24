ALTER TABLE public.jobs_execution DROP CONSTRAINT IF EXISTS jobs_execution_resource_ck;
ALTER TABLE public.jobs_execution
  ADD CONSTRAINT jobs_execution_resource_ck
  CHECK (partner_id IS NULL OR team_id IS NULL);

CREATE OR REPLACE FUNCTION public.next_job_exec_reference()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE candidate text;
BEGIN
  LOOP
    candidate := 'PSU-JOB-' || to_char(now(), 'YYYY') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.jobs_execution WHERE reference = candidate);
  END LOOP;
  RETURN candidate;
END; $$;

REVOKE EXECUTE ON FUNCTION public.next_job_exec_reference() FROM PUBLIC, anon, authenticated;