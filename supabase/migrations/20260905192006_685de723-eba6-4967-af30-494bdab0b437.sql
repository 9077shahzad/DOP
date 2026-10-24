REVOKE ALL ON FUNCTION public.record_invoice_payment(uuid, numeric, date, text, text, text) FROM PUBLIC, anon, authenticated, service_role;
DROP FUNCTION IF EXISTS public.record_invoice_payment(uuid, numeric, date, text, text, text);

CREATE OR REPLACE FUNCTION public.apply_invoice_payment(_id uuid, _amount numeric, _paid_on date DEFAULT CURRENT_DATE, _method text DEFAULT ''::text, _reference text DEFAULT ''::text, _note text DEFAULT ''::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE inv public.invoices%ROWTYPE; new_paid numeric; outstanding numeric;
BEGIN
  IF NOT public.is_finance() THEN RAISE EXCEPTION 'not_authorised'; END IF;
  IF _amount IS NULL OR _amount <= 0 THEN RAISE EXCEPTION 'invalid_amount'; END IF;

  SELECT * INTO inv FROM public.invoices WHERE id = _id FOR UPDATE;
  IF inv.id IS NULL THEN RAISE EXCEPTION 'invoice_not_found'; END IF;
  IF inv.status IN ('draft','cancelled') THEN RAISE EXCEPTION 'invoice_not_payable'; END IF;

  outstanding := round(coalesce(inv.total,0) - coalesce(inv.amount_paid,0), 2);
  IF round(_amount, 2) > outstanding + 0.005 THEN
    RAISE EXCEPTION 'amount_exceeds_outstanding';
  END IF;

  new_paid := round(coalesce(inv.amount_paid,0) + _amount, 2);
  UPDATE public.invoices
     SET amount_paid = new_paid,
         paid_on = _paid_on,
         payment_method = _method,
         payment_reference = _reference,
         payment_note = _note,
         status = CASE WHEN new_paid >= inv.total THEN 'paid'::public.invoice_status ELSE inv.status END,
         paid_at = CASE WHEN new_paid >= inv.total THEN now() ELSE inv.paid_at END,
         updated_at = now()
   WHERE id = _id;

  INSERT INTO public.invoice_events (invoice_id, kind, detail, actor)
  VALUES (_id, 'payment_recorded',
          jsonb_build_object('amount', round(_amount,2), 'paid_on', _paid_on, 'method', _method,
                             'amount_paid', new_paid, 'outstanding', round(inv.total - new_paid, 2)),
          auth.uid());

  RETURN jsonb_build_object(
    'amount_paid', new_paid,
    'outstanding', round(inv.total - new_paid, 2),
    'settled', new_paid >= inv.total,
    'partially_paid', new_paid > 0 AND new_paid < inv.total);
END;
$function$;