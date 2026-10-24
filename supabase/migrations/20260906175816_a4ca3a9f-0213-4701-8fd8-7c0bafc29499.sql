-- 1) Partners: internal assessment fields must never reach the partner themselves.
DROP POLICY IF EXISTS "Partner reads own record" ON public.partners;

CREATE POLICY "Staff read partners"
  ON public.partners FOR SELECT TO authenticated
  USING (is_staff());

-- Partner-safe projection of the applicant's own record: no internal_score,
-- no classification, no account_manager_id.
DROP VIEW IF EXISTS public.partner_self;
CREATE VIEW public.partner_self
WITH (security_invoker = off) AS
  SELECT id, reference, status, entity_type, legal_name, trading_name, country, city,
         areas_served, year_established, website, company_size, employee_count,
         technician_count, vehicle_count, registration_number, vat_number, address,
         workforce_notes, created_by, created_at, updated_at
  FROM public.partners
  WHERE created_by = auth.uid();

REVOKE ALL ON public.partner_self FROM PUBLIC, anon;
GRANT SELECT ON public.partner_self TO authenticated;
GRANT SELECT ON public.partner_self TO service_role;

-- 2) Deterministic partner resolution: never resolve across several records.
CREATE OR REPLACE FUNCTION public.current_partner_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
  -- Only an unambiguous, non-rejected record of the signed-in user resolves.
  -- With several candidate records the result is NULL, so no policy can grant
  -- access across two partner records that happen to share one user account.
  SELECT id FROM (
    SELECT id, count(*) OVER () AS n
    FROM public.partners
    WHERE created_by = auth.uid()
      AND status <> 'rejected'::partner_status
  ) m
  WHERE m.n = 1
$function$;

REVOKE ALL ON FUNCTION public.current_partner_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_partner_id() TO authenticated, service_role;