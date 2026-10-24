CREATE OR REPLACE FUNCTION public.invoice_config_state()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE e public.legal_entities%ROWTYPE; missing text[] := '{}'; ref_mode text;
BEGIN
  SELECT * INTO e FROM public.legal_entities ORDER BY created_at LIMIT 1;
  IF e.id IS NULL THEN
    RETURN jsonb_build_object('complete', false, 'missing', to_jsonb(ARRAY['legal_entity']), 'reference_mode', NULL);
  END IF;
  IF coalesce(e.legal_name,'') = '' THEN missing := array_append(missing, 'legal_name'); END IF;
  IF coalesce(e.address_line,'') = '' THEN missing := array_append(missing, 'address_line'); END IF;
  IF coalesce(e.postal_code,'') = '' THEN missing := array_append(missing, 'postal_code'); END IF;
  IF coalesce(e.city,'') = '' THEN missing := array_append(missing, 'city'); END IF;
  IF coalesce(e.register_number,'') = '' THEN missing := array_append(missing, 'register_number'); END IF;
  IF coalesce(e.vat_number,'') = '' THEN missing := array_append(missing, 'vat_number'); END IF;
  IF coalesce(e.bank_name,'') = '' THEN missing := array_append(missing, 'bank_name'); END IF;
  IF coalesce(e.iban,'') = '' THEN missing := array_append(missing, 'iban');
  ELSIF NOT public.valid_iban(e.iban) THEN missing := array_append(missing, 'iban_invalid'); END IF;

  -- A bank-issued QR-IBAN allows the structured QRR reference. An ordinary
  -- account is equally valid under the Swiss standard, but then the bill is
  -- issued without a structured reference (NON).
  IF coalesce(e.qr_iban,'') = '' THEN
    missing := array_append(missing, 'qr_iban');
    ref_mode := NULL;
  ELSIF NOT public.valid_iban(e.qr_iban) THEN
    missing := array_append(missing, 'qr_iban_invalid');
    ref_mode := NULL;
  ELSIF public.valid_qr_iban(e.qr_iban) THEN
    ref_mode := 'QRR';
  ELSE
    ref_mode := 'NON';
  END IF;

  RETURN jsonb_build_object('complete', cardinality(missing) = 0, 'missing', to_jsonb(missing), 'reference_mode', ref_mode);
END;
$function$;

REVOKE ALL ON FUNCTION public.invoice_config_state() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.invoice_config_state() TO authenticated, service_role;