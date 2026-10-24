CREATE OR REPLACE FUNCTION public.invoice_config_state()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE e public.legal_entities%ROWTYPE; missing text[] := ARRAY[]::text[];
BEGIN
  SELECT * INTO e FROM public.legal_entities ORDER BY created_at LIMIT 1;
  IF e.id IS NULL THEN
    RETURN jsonb_build_object('complete', false, 'missing', to_jsonb(ARRAY['legal_entity']::text[]));
  END IF;
  IF coalesce(e.legal_name,'') = '' THEN missing := missing || ARRAY['legal_name']::text[]; END IF;
  IF coalesce(e.address_line,'') = '' THEN missing := missing || ARRAY['address_line']::text[]; END IF;
  IF coalesce(e.postal_code,'') = '' THEN missing := missing || ARRAY['postal_code']::text[]; END IF;
  IF coalesce(e.city,'') = '' THEN missing := missing || ARRAY['city']::text[]; END IF;
  IF coalesce(e.register_number,'') = '' THEN missing := missing || ARRAY['register_number']::text[]; END IF;
  IF coalesce(e.vat_number,'') = '' THEN missing := missing || ARRAY['vat_number']::text[]; END IF;
  IF coalesce(e.qr_iban,'') = '' THEN missing := missing || ARRAY['qr_iban']::text[]; END IF;
  RETURN jsonb_build_object('complete', cardinality(missing) = 0, 'missing', to_jsonb(missing));
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.invoice_config_state() FROM anon;