CREATE OR REPLACE FUNCTION public.is_crew_of_job(_job_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.jobs_execution j
    JOIN public.crew_members cm ON cm.team_id = j.team_id
    JOIN public.employees e ON e.id = cm.employee_id
    WHERE j.id = _job_id
      AND j.team_id IS NOT NULL
      AND e.user_id = auth.uid()
      AND e.active
  )
$$;
REVOKE EXECUTE ON FUNCTION public.is_crew_of_job(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.is_crew_of_job(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.can_access_job(_job_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.jobs_execution j
     WHERE j.id = _job_id
       AND (public.is_dispatcher() OR public.has_role('finance')
            OR (j.partner_id IS NOT NULL AND j.partner_id = public.current_partner_id()))
  ) OR public.is_crew_of_job(_job_id)
$$;

CREATE POLICY "crew reads assigned jobs" ON public.jobs_execution
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (public.is_crew_of_job(id));

CREATE POLICY "crew reads assigned job events" ON public.job_events_exec
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (public.is_crew_of_job(job_id));

CREATE POLICY "crew reads assigned job photos" ON public.job_photos
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (public.is_crew_of_job(job_id));

CREATE POLICY "crew adds assigned job photos" ON public.job_photos
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (public.is_crew_of_job(job_id));