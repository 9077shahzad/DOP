CREATE OR REPLACE FUNCTION public.can_view_fleet()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT public.is_staff()
      OR public.has_role('ops_manager')
      OR public.has_role('dispatcher')
$$;
REVOKE ALL ON FUNCTION public.can_view_fleet() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_view_fleet() TO authenticated;

DROP POLICY IF EXISTS "vehicles read authenticated" ON public.vehicles;

CREATE POLICY "vehicles fleet read" ON public.vehicles
  FOR SELECT TO authenticated
  USING (public.can_view_fleet());

CREATE POLICY "vehicles assigned crew read" ON public.vehicles
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.jobs_execution j
    WHERE j.vehicle_id = vehicles.id
      AND public.is_crew_of_job(j.id)
  ));
