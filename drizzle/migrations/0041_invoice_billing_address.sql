CREATE OR REPLACE FUNCTION public.invoice_billing_address(_job_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  -- Current (audited) billing contact of the linked offer; the move origin only as fallback.
  SELECT coalesce(
    (SELECT jsonb_build_object('street', q.customer_street, 'zip', q.customer_zip, 'city', q.customer_city,
                               'country', coalesce(q.customer_country, 'CH'), 'company', q.customer_company, 'source', 'billing')
       FROM public.quotes q
      WHERE q.reference = j.quote_reference AND coalesce(trim(q.customer_street), '') <> ''
      LIMIT 1),
    coalesce(j.origin, '{}'::jsonb))
  FROM public.jobs_execution j WHERE j.id = _job_id
$$;
REVOKE ALL ON FUNCTION public.invoice_billing_address(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.invoice_set_billing_address()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF NEW.job_id IS NOT NULL THEN
    NEW.customer_address := coalesce(public.invoice_billing_address(NEW.job_id), NEW.customer_address);
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.invoice_set_billing_address() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS invoice_set_billing_address ON public.invoices;
CREATE TRIGGER invoice_set_billing_address BEFORE INSERT ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.invoice_set_billing_address();

-- Correct only the test invoices that were addressed to the move origin.
UPDATE public.invoices i SET customer_address = public.invoice_billing_address(i.job_id)
 WHERE i.is_test AND i.job_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.invoice_by_token(_token text)
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE inv public.invoices%ROWTYPE; e public.legal_entities%ROWTYPE;
BEGIN
  IF coalesce(_token,'') = '' THEN RETURN NULL; END IF;
  SELECT * INTO inv FROM public.invoices WHERE access_token = _token AND status <> 'draft';
  IF inv.id IS NULL THEN RETURN NULL; END IF;
  SELECT * INTO e FROM public.legal_entities ORDER BY created_at LIMIT 1;
  RETURN jsonb_build_object(
    'invoice', jsonb_build_object(
      'id', inv.id, 'reference', inv.reference, 'status', inv.status,
      'created_at', inv.created_at, 'issued_at', inv.issued_at, 'due_on', inv.due_on,
      'net', inv.net, 'vat', inv.vat, 'total', inv.total, 'currency', inv.currency,
      'amount_paid', inv.amount_paid, 'qr_reference', inv.qr_reference,
      'customer_name', inv.customer_name, 'customer_language', inv.customer_language,
      'customer_address', inv.customer_address),
    'lines', coalesce((SELECT jsonb_agg(jsonb_build_object(
        'description', l.description, 'quantity', l.quantity,
        'unit_price', l.unit_price, 'net', l.net, 'vat_rate', l.vat_rate) ORDER BY l.created_at)
      FROM public.invoice_lines l WHERE l.invoice_id = inv.id), '[]'::jsonb),
    'entity', jsonb_build_object(
      'legal_name', e.legal_name, 'address_line', e.address_line, 'postal_code', e.postal_code,
      'city', e.city, 'country', e.country, 'register_number', e.register_number,
      'vat_number', e.vat_number, 'email', e.email, 'phone', e.phone,
      'qr_iban', e.qr_iban, 'iban', e.iban, 'bank_name', e.bank_name));
END;
$function$;