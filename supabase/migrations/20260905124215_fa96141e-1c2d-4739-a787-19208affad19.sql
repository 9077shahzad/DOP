REVOKE EXECUTE ON FUNCTION public.is_crew_of_job(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_crew_of_job(uuid) TO authenticated;