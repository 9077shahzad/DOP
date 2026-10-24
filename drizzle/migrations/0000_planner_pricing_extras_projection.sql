-- The public estimator must also see the approved cleaning and moving
-- surcharges. They are ordinary versioned price-list rows; only the internal
-- "cost" service stays excluded from the customer-facing projection.
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
    AND r.service IN ('move','packing','endcleaning','disposal','engine','labour','cleanextra','moveextra')
  ORDER BY r.service, r.sort_order;
END;
$function$;

REVOKE ALL ON FUNCTION public.public_planner_pricing(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_planner_pricing(text) TO anon, authenticated, service_role;