-- ============================================================ invoices: job billing
ALTER TABLE public.invoices ALTER COLUMN account_id DROP NOT NULL;

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS job_id uuid REFERENCES public.jobs_execution(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS quote_id uuid,
  ADD COLUMN IF NOT EXISTS customer_name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS customer_email text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS customer_address jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS customer_language text NOT NULL DEFAULT 'de',
  ADD COLUMN IF NOT EXISTS payment_terms_days integer NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS notes text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS cancellation_reason text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS issued_by uuid,
  ADD COLUMN IF NOT EXISTS access_token text NOT NULL DEFAULT encode(extensions.gen_random_bytes(24), 'hex');

CREATE UNIQUE INDEX IF NOT EXISTS invoices_job_id_key ON public.invoices(job_id) WHERE job_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS invoices_access_token_key ON public.invoices(access_token);

-- ============================================================ invoice audit trail
CREATE TABLE IF NOT EXISTS public.invoice_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  kind text NOT NULL,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  actor uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS invoice_events_invoice_idx ON public.invoice_events(invoice_id, created_at DESC);

GRANT SELECT, INSERT ON public.invoice_events TO authenticated;
GRANT ALL ON public.invoice_events TO service_role;
ALTER TABLE public.invoice_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "invoice events readable by finance and staff" ON public.invoice_events;
CREATE POLICY "invoice events readable by finance and staff"
  ON public.invoice_events FOR SELECT TO authenticated
  USING (public.is_staff() OR public.has_role('finance'));

DROP POLICY IF EXISTS "invoice events written by finance and staff" ON public.invoice_events;
CREATE POLICY "invoice events written by finance and staff"
  ON public.invoice_events FOR INSERT TO authenticated
  WITH CHECK (public.is_staff() OR public.has_role('finance'));

-- ============================================================ helpers
CREATE OR REPLACE FUNCTION public.is_finance()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public','pg_temp'
AS $$ SELECT public.is_staff() OR public.has_role('finance') OR public.has_role('ops_manager') $$;

-- Which legally required company values are still missing.
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
  IF coalesce(e.qr_iban,'') = '' THEN missing := missing || 'qr_iban'; END IF;
  RETURN jsonb_build_object('complete', cardinality(missing) = 0, 'missing', to_jsonb(missing));
END;
$$;

CREATE OR REPLACE FUNCTION public.next_invoice_reference()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_temp'
AS $$
DECLARE y text := to_char(now(), 'YYYY'); n integer;
BEGIN
  SELECT coalesce(max((regexp_replace(reference, '^PSU-INV-\d{4}-', ''))::integer), 0) + 1
    INTO n
    FROM public.invoices
   WHERE reference ~ ('^PSU-INV-' || y || '-\d+$');
  RETURN 'PSU-INV-' || y || '-' || lpad(n::text, 4, '0');
END;
$$;

-- ============================================================ create from job
CREATE OR REPLACE FUNCTION public.create_invoice_from_job(_job_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_temp'
AS $$
DECLARE
  j public.jobs_execution%ROWTYPE;
  q public.quotes_customer%ROWTYPE;
  inv_id uuid;
  existing uuid;
  v_net numeric; v_vat numeric; v_total numeric;
  item jsonb;
  terms integer := 30;
BEGIN
  IF NOT public.is_finance() THEN RAISE EXCEPTION 'not_authorised'; END IF;
  SELECT * INTO j FROM public.jobs_execution WHERE id = _job_id;
  IF j.id IS NULL THEN RAISE EXCEPTION 'job_not_found'; END IF;
  IF j.status NOT IN ('completed','verified') THEN RAISE EXCEPTION 'job_not_completed'; END IF;

  SELECT id INTO existing FROM public.invoices WHERE job_id = _job_id;
  IF existing IS NOT NULL THEN RETURN existing; END IF;

  IF j.quote_id IS NOT NULL THEN
    SELECT * INTO q FROM public.quotes_customer WHERE id = j.quote_id;
  END IF;

  v_total := coalesce(q.total, j.job_value);
  IF v_total IS NULL OR v_total <= 0 THEN RAISE EXCEPTION 'pricing_required'; END IF;
  v_vat := coalesce(q.vat, round(v_total - (v_total / 1.081), 2));
  v_net := round(v_total - v_vat, 2);

  INSERT INTO public.invoices (
    reference, account_id, job_id, lead_id, quote_id,
    customer_name, customer_email, customer_language,
    customer_address, period_start, period_end,
    status, net, vat, total, currency, payment_terms_days
  ) VALUES (
    public.next_invoice_reference(), NULL, j.id, j.lead_id, j.quote_id,
    coalesce(j.customer_name,''), coalesce(j.customer_email,''), coalesce(j.customer_language,'de'),
    coalesce(j.origin, '{}'::jsonb),
    coalesce(j.completed_at, j.scheduled_start, now())::date,
    coalesce(j.completed_at, j.scheduled_start, now())::date,
    'draft', v_net, v_vat, v_total, coalesce(q.currency, 'CHF'), terms
  ) RETURNING id INTO inv_id;

  IF q.id IS NOT NULL AND jsonb_typeof(q.line_items) = 'array' AND jsonb_array_length(q.line_items) > 0 THEN
    FOR item IN SELECT * FROM jsonb_array_elements(q.line_items) LOOP
      INSERT INTO public.invoice_lines (invoice_id, description, quantity, unit_price, net, vat_rate)
      VALUES (
        inv_id,
        coalesce(item->>'description',''),
        coalesce((item->>'quantity')::numeric, 1),
        coalesce((item->>'unit_price')::numeric, coalesce((item->>'net')::numeric, 0)),
        coalesce((item->>'net')::numeric, coalesce((item->>'unit_price')::numeric, 0)),
        0.081);
    END LOOP;
  ELSE
    INSERT INTO public.invoice_lines (invoice_id, description, quantity, unit_price, net, vat_rate)
    VALUES (inv_id, coalesce(j.service_key, 'service') || ' ' || coalesce(j.reference,''), 1, v_net, v_net, 0.081);
  END IF;

  INSERT INTO public.invoice_events (invoice_id, kind, detail, actor)
  VALUES (inv_id, 'created', jsonb_build_object('job', j.reference), auth.uid());

  RETURN inv_id;
END;
$$;

-- ============================================================ issue / pay / cancel
CREATE OR REPLACE FUNCTION public.issue_invoice(_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_temp'
AS $$
DECLARE cfg jsonb; inv public.invoices%ROWTYPE;
BEGIN
  IF NOT public.is_finance() THEN RAISE EXCEPTION 'not_authorised'; END IF;
  SELECT * INTO inv FROM public.invoices WHERE id = _id;
  IF inv.id IS NULL THEN RAISE EXCEPTION 'invoice_not_found'; END IF;
  IF inv.status <> 'draft' THEN RAISE EXCEPTION 'invoice_not_draft'; END IF;

  cfg := public.invoice_config_state();
  IF NOT (cfg->>'complete')::boolean THEN
    RETURN jsonb_build_object('status', 'config_incomplete', 'missing', cfg->'missing');
  END IF;

  UPDATE public.invoices
     SET status = 'issued',
         issued_at = now(),
         issued_by = auth.uid(),
         due_on = (current_date + make_interval(days => payment_terms_days))::date,
         updated_at = now()
   WHERE id = _id;

  INSERT INTO public.invoice_events (invoice_id, kind, detail, actor)
  VALUES (_id, 'issued', '{}'::jsonb, auth.uid());

  RETURN jsonb_build_object('status', 'issued');
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
  SELECT * INTO inv FROM public.invoices WHERE id = _id;
  IF inv.id IS NULL THEN RAISE EXCEPTION 'invoice_not_found'; END IF;
  IF inv.status IN ('draft','cancelled') THEN RAISE EXCEPTION 'invoice_not_payable'; END IF;

  new_paid := inv.amount_paid + _amount;
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
          jsonb_build_object('amount', _amount, 'paid_on', _paid_on, 'method', _method), auth.uid());

  RETURN jsonb_build_object(
    'amount_paid', new_paid,
    'settled', new_paid >= inv.total,
    'partially_paid', new_paid > 0 AND new_paid < inv.total);
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_invoice(_id uuid, _reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_temp'
AS $$
BEGIN
  IF NOT public.is_finance() THEN RAISE EXCEPTION 'not_authorised'; END IF;
  IF coalesce(_reason,'') = '' THEN RAISE EXCEPTION 'reason_required'; END IF;
  UPDATE public.invoices
     SET status = 'cancelled', cancelled_at = now(), cancellation_reason = _reason, updated_at = now()
   WHERE id = _id AND status <> 'paid';
  IF NOT FOUND THEN RAISE EXCEPTION 'invoice_not_cancellable'; END IF;
  INSERT INTO public.invoice_events (invoice_id, kind, detail, actor)
  VALUES (_id, 'cancelled', jsonb_build_object('reason', _reason), auth.uid());
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_overdue_invoices()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_temp'
AS $$
DECLARE n integer;
BEGIN
  IF NOT (public.is_finance() OR public.is_service_role()) THEN RAISE EXCEPTION 'not_authorised'; END IF;
  WITH upd AS (
    UPDATE public.invoices
       SET status = 'overdue', updated_at = now()
     WHERE status = 'issued' AND due_on IS NOT NULL AND due_on < current_date AND amount_paid < total
     RETURNING id)
  SELECT count(*) INTO n FROM upd;
  RETURN n;
END;
$$;

-- ============================================================ customer document access
CREATE OR REPLACE FUNCTION public.invoice_by_token(_token text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public','pg_temp'
AS $$
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
      'customer_name', inv.customer_name, 'customer_language', inv.customer_language),
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
$$;

REVOKE ALL ON FUNCTION public.invoice_by_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.invoice_by_token(text) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.create_invoice_from_job(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.issue_invoice(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.apply_invoice_payment(uuid, numeric, date, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cancel_invoice(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mark_overdue_invoices() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.invoice_config_state() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.next_invoice_reference() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_finance() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_invoice_from_job(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.issue_invoice(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.apply_invoice_payment(uuid, numeric, date, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_invoice(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_overdue_invoices() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.invoice_config_state() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_finance() TO authenticated;

-- ============================================================ finance visibility on invoices
DROP POLICY IF EXISTS "Invoices readable" ON public.invoices;
CREATE POLICY "Invoices readable"
  ON public.invoices FOR SELECT TO authenticated
  USING (public.account_visible(account_id) OR public.is_finance());

-- ============================================================ management KPIs (real data only)
CREATE OR REPLACE FUNCTION public.management_kpis(_from date, _to date)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public','pg_temp'
AS $$
DECLARE f timestamptz := _from::timestamptz; t timestamptz := (_to + 1)::timestamptz;
BEGIN
  IF NOT (public.is_staff() OR public.is_finance() OR public.is_dispatcher()) THEN
    RAISE EXCEPTION 'not_authorised';
  END IF;
  RETURN jsonb_build_object(
    'range', jsonb_build_object('from', _from, 'to', _to),
    'leads', (SELECT count(*) FROM public.leads WHERE created_at >= f AND created_at < t),
    'leads_won', (SELECT count(*) FROM public.leads WHERE created_at >= f AND created_at < t AND status = 'won'),
    'leads_lost', (SELECT count(*) FROM public.leads WHERE created_at >= f AND created_at < t AND status = 'lost'),
    'quotes', (SELECT count(*) FROM public.quotes_customer WHERE created_at >= f AND created_at < t),
    'quotes_accepted', (SELECT count(*) FROM public.quotes_customer WHERE created_at >= f AND created_at < t AND status = 'accepted'),
    'quotes_value', (SELECT coalesce(sum(total), 0) FROM public.quotes_customer WHERE created_at >= f AND created_at < t AND status = 'accepted'),
    'jobs', (SELECT count(*) FROM public.jobs_execution WHERE coalesce(scheduled_start, created_at) >= f AND coalesce(scheduled_start, created_at) < t),
    'jobs_by_status', (SELECT coalesce(jsonb_object_agg(status, c), '{}'::jsonb) FROM (
        SELECT status::text AS status, count(*) AS c FROM public.jobs_execution
         WHERE coalesce(scheduled_start, created_at) >= f AND coalesce(scheduled_start, created_at) < t
         GROUP BY status) s),
    'jobs_completed', (SELECT count(*) FROM public.jobs_execution WHERE completed_at >= f AND completed_at < t),
    'jobs_cancelled', (SELECT count(*) FROM public.jobs_execution WHERE cancelled_at >= f AND cancelled_at < t),
    'incidents', (SELECT count(*) FROM public.incidents WHERE created_at >= f AND created_at < t),
    'reviews', (SELECT count(*) FROM public.job_reviews WHERE submitted_at >= f AND submitted_at < t),
    'rating_avg', (SELECT round(avg(rating)::numeric, 2) FROM public.job_reviews WHERE submitted_at >= f AND submitted_at < t),
    'invoiced_total', (SELECT coalesce(sum(total), 0) FROM public.invoices WHERE issued_at >= f AND issued_at < t AND status <> 'cancelled'),
    'paid_total', (SELECT coalesce(sum(amount_paid), 0) FROM public.invoices WHERE issued_at >= f AND issued_at < t),
    'open_total', (SELECT coalesce(sum(total - amount_paid), 0) FROM public.invoices WHERE status IN ('issued','overdue')),
    'overdue_count', (SELECT count(*) FROM public.invoices WHERE status = 'overdue'),
    'crew_hours', (SELECT coalesce(round(sum(extract(epoch FROM (coalesce(te.ended_at, te.started_at) - te.started_at)) / 3600.0)::numeric, 1), 0)
                     FROM public.time_entries te WHERE te.started_at >= f AND te.started_at < t)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.management_kpis(date, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.management_kpis(date, date) TO authenticated;

-- ============================================================ PS Umzug invoice numbering
CREATE OR REPLACE FUNCTION public.set_invoice_reference()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public','pg_temp'
AS $function$
BEGIN
  IF new.reference IS NOT NULL AND new.reference <> '' AND new.reference <> 'pending' THEN
    RETURN new;
  END IF;
  new.reference := public.next_invoice_reference();
  RETURN new;
END;
$function$;