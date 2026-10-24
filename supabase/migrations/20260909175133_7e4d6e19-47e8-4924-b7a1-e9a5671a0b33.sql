ALTER TABLE public.jobs_execution
  ADD COLUMN IF NOT EXISTS billing_status text NOT NULL DEFAULT 'unpaid'
  CHECK (billing_status IN ('unpaid', 'partially_paid', 'paid'));

CREATE TABLE public.bank_payment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  external_id text NOT NULL,
  account_iban text NOT NULL DEFAULT '',
  amount numeric NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'CHF',
  booked_on date NOT NULL,
  reference text NOT NULL DEFAULT '',
  payer_name text NOT NULL DEFAULT '',
  raw_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'matched', 'unmatched', 'rejected')),
  detail text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  UNIQUE (provider, external_id)
);
GRANT SELECT ON public.bank_payment_events TO authenticated;
GRANT ALL ON public.bank_payment_events TO service_role;
ALTER TABLE public.bank_payment_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bank payments readable by finance"
  ON public.bank_payment_events FOR SELECT TO authenticated
  USING (public.is_finance());

CREATE OR REPLACE FUNCTION public.valid_iban(_value text)
RETURNS boolean
LANGUAGE plpgsql IMMUTABLE
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  iban text := upper(regexp_replace(coalesce(_value, ''), '\s', '', 'g'));
  rearranged text;
  expanded text := '';
  ch text;
  i integer;
  remainder integer := 0;
BEGIN
  IF iban !~ '^[A-Z]{2}[0-9]{2}[A-Z0-9]{10,30}$' THEN RETURN false; END IF;
  rearranged := substring(iban from 5) || substring(iban from 1 for 4);
  FOR i IN 1..length(rearranged) LOOP
    ch := substring(rearranged from i for 1);
    expanded := expanded || CASE WHEN ch ~ '[0-9]' THEN ch ELSE (ascii(ch) - 55)::text END;
  END LOOP;
  FOR i IN 1..length(expanded) LOOP
    remainder := (remainder * 10 + substring(expanded from i for 1)::integer) % 97;
  END LOOP;
  RETURN remainder = 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.valid_qr_iban(_value text)
RETURNS boolean
LANGUAGE sql IMMUTABLE
SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT public.valid_iban(_value)
    AND upper(regexp_replace(coalesce(_value, ''), '\s', '', 'g')) ~ '^(CH|LI)'
    AND substring(upper(regexp_replace(coalesce(_value, ''), '\s', '', 'g')) from 5 for 5)::integer BETWEEN 30000 AND 31999
$$;

REVOKE ALL ON FUNCTION public.valid_iban(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.valid_qr_iban(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.valid_iban(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.valid_qr_iban(text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.invoice_config_state()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public','pg_temp'
AS $$
DECLARE e public.legal_entities%ROWTYPE; missing text[] := '{}';
BEGIN
  SELECT * INTO e FROM public.legal_entities ORDER BY created_at LIMIT 1;
  IF e.id IS NULL THEN
    RETURN jsonb_build_object('complete', false, 'missing', to_jsonb(ARRAY['legal_entity']));
  END IF;
  IF coalesce(e.legal_name,'') = '' THEN missing := missing || 'legal_name'; END IF;
  IF coalesce(e.address_line,'') = '' THEN missing := missing || 'address_line'; END IF;
  IF coalesce(e.postal_code,'') = '' THEN missing := missing || 'postal_code'; END IF;
  IF coalesce(e.city,'') = '' THEN missing := missing || 'city'; END IF;
  IF coalesce(e.register_number,'') = '' THEN missing := missing || 'register_number'; END IF;
  IF coalesce(e.vat_number,'') = '' THEN missing := missing || 'vat_number'; END IF;
  IF coalesce(e.bank_name,'') = '' THEN missing := missing || 'bank_name'; END IF;
  IF coalesce(e.iban,'') = '' THEN missing := missing || 'iban';
  ELSIF NOT public.valid_iban(e.iban) THEN missing := missing || 'iban_invalid'; END IF;
  IF coalesce(e.qr_iban,'') = '' THEN missing := missing || 'qr_iban';
  ELSIF NOT public.valid_qr_iban(e.qr_iban) THEN missing := missing || 'qr_iban_invalid'; END IF;
  RETURN jsonb_build_object('complete', cardinality(missing) = 0, 'missing', to_jsonb(missing));
END;
$$;

CREATE OR REPLACE FUNCTION public.create_booking_from_quote(
  _quote_id uuid,
  _scheduled_start timestamptz DEFAULT NULL,
  _scheduled_end timestamptz DEFAULT NULL,
  _team_id uuid DEFAULT NULL,
  _vehicle_id uuid DEFAULT NULL,
  _notes text DEFAULT ''
) RETURNS public.jobs_execution
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  q public.quotes_customer;
  l public.leads;
  j public.jobs_execution;
  d jsonb;
  atts jsonb;
  start_ts timestamptz;
  inv_id uuid;
  cfg jsonb;
  v_net numeric;
  v_vat numeric;
  item jsonb;
BEGIN
  IF NOT public.is_dispatcher() THEN RAISE EXCEPTION 'not authorised' USING ERRCODE = '42501'; END IF;
  SELECT * INTO q FROM public.quotes_customer WHERE id = _quote_id;
  IF q.id IS NULL THEN RAISE EXCEPTION 'quote not found' USING ERRCODE = 'P0002'; END IF;
  IF q.status <> 'accepted' THEN RAISE EXCEPTION 'quote is not accepted' USING ERRCODE = '22023'; END IF;

  SELECT * INTO j FROM public.jobs_execution WHERE quote_id = _quote_id LIMIT 1;
  IF j.id IS NOT NULL THEN RETURN j; END IF;
  SELECT * INTO l FROM public.leads WHERE id = q.lead_id;
  IF l.id IS NULL THEN RAISE EXCEPTION 'quote has no inquiry' USING ERRCODE = '22023'; END IF;
  IF q.total IS NULL OR q.total <= 0 THEN RAISE EXCEPTION 'pricing_required'; END IF;

  d := coalesce(l.service_details, '{}'::jsonb);
  SELECT coalesce(jsonb_agg(jsonb_build_object(
           'id', a.id, 'file_name', a.file_name, 'storage_path', a.storage_path,
           'mime_type', a.mime_type, 'size_bytes', a.size_bytes)), '[]'::jsonb)
    INTO atts FROM public.lead_attachments a WHERE a.lead_id = l.id;
  start_ts := coalesce(_scheduled_start, (l.preferred_date)::timestamptz);

  INSERT INTO public.jobs_execution (
    lead_id, quote_id, quote_reference, lead_reference, partner_id, team_id, vehicle_id,
    status, scheduled_start, scheduled_end, job_value,
    customer_name, customer_email, customer_phone, customer_language,
    service_key, origin, destination, inventory, extras, attachments,
    booking_notes, booked_at, booked_by, billing_status
  ) VALUES (
    l.id, q.id, q.reference, l.reference, l.assigned_partner_id, _team_id, _vehicle_id,
    (CASE WHEN _team_id IS NOT NULL THEN 'assigned' ELSE 'scheduled' END)::public.job_exec_status,
    start_ts, _scheduled_end, q.total,
    l.customer_name, l.customer_email, l.customer_phone, l.language,
    coalesce(d->>'service', (d->'services'->>0), ''),
    coalesce(d->'origin', '{}'::jsonb), coalesce(d->'destination', '{}'::jsonb),
    coalesce(d->'items', '[]'::jsonb), coalesce(d->'extras', '[]'::jsonb), atts,
    coalesce(_notes, ''), now(), auth.uid(), 'unpaid'
  ) RETURNING * INTO j;

  v_vat := coalesce(q.vat, round(q.total - (q.total / 1.081), 2));
  v_net := round(q.total - v_vat, 2);
  cfg := public.invoice_config_state();

  INSERT INTO public.invoices (
    reference, account_id, job_id, lead_id, quote_id,
    customer_name, customer_email, customer_language, customer_address,
    period_start, period_end, status, net, vat, total, currency,
    payment_terms_days, price_list_version_id, issued_at, issued_by, due_on
  ) VALUES (
    public.next_invoice_reference(), NULL, j.id, l.id, q.id,
    coalesce(l.customer_name,''), coalesce(l.customer_email,''), coalesce(l.language,'de'),
    coalesce(j.origin, '{}'::jsonb),
    coalesce(start_ts, now())::date, coalesce(start_ts, now())::date,
    CASE WHEN (cfg->>'complete')::boolean THEN 'issued'::public.invoice_status ELSE 'draft'::public.invoice_status END,
    v_net, v_vat, q.total, coalesce(q.currency, 'CHF'), 30, q.price_list_version_id,
    CASE WHEN (cfg->>'complete')::boolean THEN now() ELSE NULL END,
    CASE WHEN (cfg->>'complete')::boolean THEN auth.uid() ELSE NULL END,
    CASE WHEN (cfg->>'complete')::boolean THEN (current_date + 30) ELSE NULL END
  ) RETURNING id INTO inv_id;

  IF jsonb_typeof(q.line_items) = 'array' AND jsonb_array_length(q.line_items) > 0 THEN
    FOR item IN SELECT * FROM jsonb_array_elements(q.line_items) LOOP
      INSERT INTO public.invoice_lines (invoice_id, description, quantity, unit_price, net, vat_rate)
      VALUES (inv_id, coalesce(item->>'description',''), coalesce((item->>'quantity')::numeric, 1),
              coalesce((item->>'unit_price')::numeric, coalesce((item->>'net')::numeric, 0)),
              coalesce((item->>'net')::numeric, coalesce((item->>'unit_price')::numeric, 0)), 0.081);
    END LOOP;
  ELSE
    INSERT INTO public.invoice_lines (invoice_id, description, quantity, unit_price, net, vat_rate)
    VALUES (inv_id, coalesce(j.service_key, 'service') || ' ' || coalesce(j.reference,''), 1, v_net, v_net, 0.081);
  END IF;

  INSERT INTO public.invoice_events (invoice_id, kind, detail, actor)
  VALUES (inv_id, CASE WHEN (cfg->>'complete')::boolean THEN 'issued' ELSE 'created' END,
          jsonb_build_object('job', j.reference, 'booking_confirmation', true, 'configuration', cfg), auth.uid());
  INSERT INTO public.job_events_exec (job_id, kind, body, meta, actor_id, actor_kind)
  VALUES (j.id, 'status', 'Buchung aus angenommener Offerte',
          jsonb_build_object('status', j.status, 'quote', q.reference, 'lead', l.reference, 'invoice_id', inv_id),
          auth.uid(), 'staff');
  INSERT INTO public.lead_activities (lead_id, kind, body, meta, actor_id, actor_kind)
  VALUES (l.id, 'system', 'Buchung erstellt',
          jsonb_build_object('job', j.id, 'reference', j.reference, 'quote', q.reference, 'invoice_id', inv_id),
          auth.uid(), 'staff');
  UPDATE public.leads SET status = 'scheduled', last_activity_at = now() WHERE id = l.id;
  RETURN j;
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_invoice_payment(
  _id uuid, _amount numeric, _paid_on date DEFAULT current_date,
  _method text DEFAULT '', _reference text DEFAULT '', _note text DEFAULT '')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_temp'
AS $$
DECLARE inv public.invoices%ROWTYPE; new_paid numeric;
BEGIN
  IF NOT public.is_finance() THEN RAISE EXCEPTION 'not_authorised'; END IF;
  IF _amount IS NULL OR _amount <= 0 THEN RAISE EXCEPTION 'invalid_amount'; END IF;
  SELECT * INTO inv FROM public.invoices WHERE id = _id FOR UPDATE;
  IF inv.id IS NULL THEN RAISE EXCEPTION 'invoice_not_found'; END IF;
  IF inv.status IN ('draft','cancelled') THEN RAISE EXCEPTION 'invoice_not_payable'; END IF;
  IF inv.amount_paid + _amount > inv.total THEN RAISE EXCEPTION 'amount_exceeds_outstanding'; END IF;
  new_paid := inv.amount_paid + _amount;
  UPDATE public.invoices SET amount_paid = new_paid, paid_on = _paid_on,
    payment_method = _method, payment_reference = _reference, payment_note = _note,
    status = CASE WHEN new_paid = inv.total THEN 'paid'::public.invoice_status ELSE status END,
    paid_at = CASE WHEN new_paid = inv.total THEN now() ELSE paid_at END, updated_at = now()
  WHERE id = _id;
  IF inv.job_id IS NOT NULL THEN
    UPDATE public.jobs_execution SET billing_status = CASE WHEN new_paid = inv.total THEN 'paid' ELSE 'partially_paid' END,
      updated_at = now() WHERE id = inv.job_id;
  END IF;
  INSERT INTO public.invoice_events (invoice_id, kind, detail, actor)
  VALUES (_id, 'payment_recorded', jsonb_build_object('amount', _amount, 'paid_on', _paid_on, 'method', _method, 'reference', _reference), auth.uid());
  RETURN jsonb_build_object('amount_paid', new_paid, 'outstanding', inv.total - new_paid,
    'settled', new_paid = inv.total, 'partially_paid', new_paid > 0 AND new_paid < inv.total);
END;
$$;

CREATE OR REPLACE FUNCTION public.import_bank_payment(
  _provider text, _external_id text, _account_iban text, _amount numeric,
  _currency text, _booked_on date, _reference text, _payer_name text, _raw_payload jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_temp'
AS $$
DECLARE event_id uuid; inv public.invoices%ROWTYPE; new_paid numeric; matches integer;
BEGIN
  IF NOT public.is_service_role() THEN RAISE EXCEPTION 'not_authorised'; END IF;
  IF coalesce(btrim(_provider),'') = '' OR coalesce(btrim(_external_id),'') = '' OR _amount <= 0 THEN
    RAISE EXCEPTION 'invalid_payment_event';
  END IF;
  SELECT id INTO event_id FROM public.bank_payment_events WHERE provider = _provider AND external_id = _external_id;
  IF event_id IS NOT NULL THEN RETURN jsonb_build_object('status','duplicate','event_id',event_id); END IF;

  INSERT INTO public.bank_payment_events(provider, external_id, account_iban, amount, currency, booked_on, reference, payer_name, raw_payload)
  VALUES (_provider, _external_id, regexp_replace(upper(coalesce(_account_iban,'')), '\s','','g'), _amount, upper(coalesce(_currency,'CHF')), _booked_on, coalesce(_reference,''), coalesce(_payer_name,''), coalesce(_raw_payload,'{}'::jsonb))
  RETURNING id INTO event_id;

  SELECT count(*) INTO matches FROM public.invoices
   WHERE status IN ('issued','overdue')
     AND currency = upper(coalesce(_currency,'CHF'))
     AND (regexp_replace(qr_reference, '\s','','g') = regexp_replace(coalesce(_reference,''), '\s','','g')
          OR reference = btrim(coalesce(_reference,'')));
  IF matches <> 1 THEN
    UPDATE public.bank_payment_events SET status='unmatched', detail=CASE WHEN matches=0 THEN 'no_invoice_match' ELSE 'ambiguous_invoice_match' END, processed_at=now() WHERE id=event_id;
    RETURN jsonb_build_object('status','unmatched','event_id',event_id);
  END IF;

  SELECT * INTO inv FROM public.invoices
   WHERE status IN ('issued','overdue') AND currency = upper(coalesce(_currency,'CHF'))
     AND (regexp_replace(qr_reference, '\s','','g') = regexp_replace(coalesce(_reference,''), '\s','','g') OR reference = btrim(coalesce(_reference,'')))
   FOR UPDATE;
  IF inv.amount_paid + _amount > inv.total THEN
    UPDATE public.bank_payment_events SET status='rejected', invoice_id=inv.id, detail='amount_exceeds_outstanding', processed_at=now() WHERE id=event_id;
    RETURN jsonb_build_object('status','rejected','event_id',event_id,'reason','amount_exceeds_outstanding');
  END IF;
  new_paid := inv.amount_paid + _amount;
  UPDATE public.invoices SET amount_paid=new_paid, paid_on=_booked_on, payment_method='bank_feed', payment_reference=_reference,
    status=CASE WHEN new_paid=inv.total THEN 'paid'::public.invoice_status ELSE status END,
    paid_at=CASE WHEN new_paid=inv.total THEN now() ELSE paid_at END, updated_at=now() WHERE id=inv.id;
  IF inv.job_id IS NOT NULL THEN UPDATE public.jobs_execution SET billing_status=CASE WHEN new_paid=inv.total THEN 'paid' ELSE 'partially_paid' END, updated_at=now() WHERE id=inv.job_id; END IF;
  UPDATE public.bank_payment_events SET status='matched', invoice_id=inv.id, detail='payment_applied', processed_at=now() WHERE id=event_id;
  INSERT INTO public.invoice_events(invoice_id, kind, detail, actor) VALUES(inv.id, 'payment_recorded', jsonb_build_object('amount',_amount,'paid_on',_booked_on,'method','bank_feed','reference',_reference,'event_id',event_id), NULL);
  RETURN jsonb_build_object('status','matched','event_id',event_id,'invoice_id',inv.id,'settled',new_paid=inv.total);
END;
$$;
REVOKE ALL ON FUNCTION public.import_bank_payment(text,text,text,numeric,text,date,text,text,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.import_bank_payment(text,text,text,numeric,text,date,text,text,jsonb) TO service_role;