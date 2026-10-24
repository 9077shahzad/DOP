ALTER TABLE public.pricing_configurations
  ADD COLUMN IF NOT EXISTS min_hours numeric,
  ADD COLUMN IF NOT EXISTS min_hours_basis text;

ALTER TABLE public.pricing_configurations
  DROP CONSTRAINT IF EXISTS pricing_configurations_min_hours_basis_check;
ALTER TABLE public.pricing_configurations
  ADD CONSTRAINT pricing_configurations_min_hours_basis_check
  CHECK (min_hours_basis IS NULL OR min_hours_basis IN ('person','team'));

ALTER TABLE public.pricing_configurations
  DROP CONSTRAINT IF EXISTS pricing_configurations_min_hours_check;
ALTER TABLE public.pricing_configurations
  ADD CONSTRAINT pricing_configurations_min_hours_check
  CHECK (min_hours IS NULL OR min_hours > 0);

-- A minimum without a basis (or the reverse) is not a usable rule.
ALTER TABLE public.pricing_configurations
  DROP CONSTRAINT IF EXISTS pricing_configurations_min_hours_pair_check;
ALTER TABLE public.pricing_configurations
  ADD CONSTRAINT pricing_configurations_min_hours_pair_check
  CHECK ((min_hours IS NULL) = (min_hours_basis IS NULL));

COMMENT ON COLUMN public.pricing_configurations.min_hours IS
  'Minimum billed duration in hours for hourly offers priced from this price-list version.';
COMMENT ON COLUMN public.pricing_configurations.min_hours_basis IS
  'person = minimum applies to每 each crew member; team = minimum applies once to the team.';

-- Public projection: customer-facing labour tariffs are readable, internal
-- staffing cost rates ("cost" service) are deliberately never projected.
CREATE OR REPLACE FUNCTION public.public_planner_pricing(_market text DEFAULT 'CH'::text)
 RETURNS TABLE(version integer, effective_from date, service text, unit_type text, price numeric, currency text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  cfg uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.markets m WHERE m.country = _market AND m.active) THEN
    RETURN;
  END IF;
  cfg := public.active_pricing_configuration(_market);
  IF cfg IS NULL THEN RETURN; END IF;

  RETURN QUERY
  SELECT c.version, c.effective_from, r.service, r.unit_type, r.price, r.currency
  FROM public.pricing_configurations c
  JOIN public.pricing_rules r ON r.configuration_id = c.id
  WHERE c.id = cfg
    AND r.property_type = 'any'
    AND r.service IN ('move','packing','endcleaning','disposal','engine','labour')
  ORDER BY r.service, r.sort_order;
END;
$function$;

REVOKE ALL ON FUNCTION public.public_planner_pricing(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_planner_pricing(text) TO anon, authenticated, service_role;

-- Minimum-duration policy of the price list in force. Carries no cost data.
CREATE OR REPLACE FUNCTION public.public_minimum_billing(_market text DEFAULT 'CH'::text)
 RETURNS TABLE(version integer, effective_from date, min_hours numeric, min_hours_basis text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  cfg uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.markets m WHERE m.country = _market AND m.active) THEN
    RETURN;
  END IF;
  cfg := public.active_pricing_configuration(_market);
  IF cfg IS NULL THEN RETURN; END IF;

  RETURN QUERY
  SELECT c.version, c.effective_from, c.min_hours, c.min_hours_basis
  FROM public.pricing_configurations c
  WHERE c.id = cfg AND c.min_hours IS NOT NULL;
END;
$function$;

REVOKE ALL ON FUNCTION public.public_minimum_billing(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_minimum_billing(text) TO anon, authenticated, service_role;