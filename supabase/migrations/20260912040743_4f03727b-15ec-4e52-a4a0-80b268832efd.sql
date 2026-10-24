CREATE OR REPLACE FUNCTION public.is_dispatcher()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_staff()
      OR public.has_role('ops_manager')
      OR public.has_role('dispatcher')
      OR public.has_role('sales')
      OR public.has_role('partner_manager')
$$;