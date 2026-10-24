DROP FUNCTION IF EXISTS public.company_contact(text);

CREATE FUNCTION public.company_contact(_country text DEFAULT 'CH'::text)
 RETURNS TABLE(country text, legal_name text, address_line text, postal_code text, city text, canton text, email text, phone text, mobile_phone text, website text, opening_hours jsonb, register_number text, vat_number text, status text, legal_ready boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select e.country,
         e.legal_name,
         e.address_line,
         e.postal_code,
         e.city,
         e.canton,
         e.email,
         e.phone,
         nullif(e.mobile_phone, '')    as mobile_phone,
         nullif(e.website, '')         as website,
         coalesce(e.opening_hours, '[]'::jsonb) as opening_hours,
         nullif(e.register_number, '') as register_number,
         nullif(e.vat_number, '')      as vat_number,
         e.status,
         coalesce(m.legal_ready, false) as legal_ready
    from public.legal_entities e
    left join public.markets m on m.country = e.country
   where e.country = coalesce(_country, 'CH')
$function$;

REVOKE ALL ON FUNCTION public.company_contact(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.company_contact(text) TO anon, authenticated, service_role;