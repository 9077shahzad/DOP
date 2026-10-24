-- P1: review requests are created by the database, never by an unrestricted client insert
CREATE OR REPLACE FUNCTION public.create_review_request(_job_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE j public.jobs_execution%ROWTYPE; existing public.job_reviews%ROWTYPE; created public.job_reviews%ROWTYPE;
BEGIN
  IF NOT (public.is_dispatcher() OR public.is_finance()) THEN RAISE EXCEPTION 'not_authorised'; END IF;

  SELECT * INTO j FROM public.jobs_execution WHERE id = _job_id;
  IF j.id IS NULL THEN RAISE EXCEPTION 'job_not_found'; END IF;
  IF j.status NOT IN ('completed','verified') THEN RAISE EXCEPTION 'job_not_completed'; END IF;

  SELECT * INTO existing FROM public.job_reviews WHERE job_id = _job_id ORDER BY created_at LIMIT 1;
  IF existing.id IS NOT NULL THEN
    RETURN jsonb_build_object('token', existing.token, 'created', false,
                              'submitted', existing.submitted_at IS NOT NULL);
  END IF;

  INSERT INTO public.job_reviews (job_id, token)
  VALUES (_job_id, encode(extensions.gen_random_bytes(24), 'hex'))
  RETURNING * INTO created;

  INSERT INTO public.job_events_exec (job_id, kind, body, meta, actor_id, actor_kind)
  VALUES (_job_id, 'note', 'review_requested',
          jsonb_build_object('review_id', created.id), auth.uid(), 'staff');

  RETURN jsonb_build_object('token', created.token, 'created', true, 'submitted', false);
END;
$function$;

REVOKE ALL ON FUNCTION public.create_review_request(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_review_request(uuid) TO authenticated;

-- one active review request per job
CREATE UNIQUE INDEX IF NOT EXISTS job_reviews_job_id_key ON public.job_reviews (job_id);

-- clients may no longer insert review rows directly
DROP POLICY IF EXISTS "job_reviews staff manage" ON public.job_reviews;
CREATE POLICY "job_reviews staff read" ON public.job_reviews
  FOR SELECT TO authenticated USING (public.is_staff() OR public.is_dispatcher() OR public.is_finance());

-- P2.1: exactly one canonical invoice per job, and safe concurrent creation
CREATE UNIQUE INDEX IF NOT EXISTS invoices_job_id_key ON public.invoices (job_id) WHERE job_id IS NOT NULL;

-- P2.2: price-list provenance (nullable; never recalculates frozen amounts)
ALTER TABLE public.quotes_customer
  ADD COLUMN IF NOT EXISTS price_list_version_id uuid REFERENCES public.pricing_configurations(id) ON DELETE SET NULL;
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS price_list_version_id uuid REFERENCES public.pricing_configurations(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.create_invoice_from_job(_job_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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

  BEGIN
    INSERT INTO public.invoices (
      reference, account_id, job_id, lead_id, quote_id,
      customer_name, customer_email, customer_language,
      customer_address, period_start, period_end,
      status, net, vat, total, currency, payment_terms_days, price_list_version_id
    ) VALUES (
      public.next_invoice_reference(), NULL, j.id, j.lead_id, j.quote_id,
      coalesce(j.customer_name,''), coalesce(j.customer_email,''), coalesce(j.customer_language,'de'),
      coalesce(j.origin, '{}'::jsonb),
      coalesce(j.completed_at, j.scheduled_start, now())::date,
      coalesce(j.completed_at, j.scheduled_start, now())::date,
      'draft', v_net, v_vat, v_total, coalesce(q.currency, 'CHF'), terms, q.price_list_version_id
    ) RETURNING id INTO inv_id;
  EXCEPTION WHEN unique_violation THEN
    SELECT id INTO existing FROM public.invoices WHERE job_id = _job_id;
    IF existing IS NOT NULL THEN RETURN existing; END IF;
    RAISE;
  END;

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
$function$;