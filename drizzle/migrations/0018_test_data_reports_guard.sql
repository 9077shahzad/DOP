CREATE OR REPLACE FUNCTION public.lead_is_test(_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$ SELECT coalesce((SELECT is_test FROM public.leads WHERE id=_id),false) $$;
CREATE OR REPLACE FUNCTION public.job_is_test(_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$ SELECT coalesce((SELECT is_test FROM public.jobs_execution WHERE id=_id),false) $$;
DROP FUNCTION IF EXISTS public.management_kpis(date,date);
CREATE OR REPLACE FUNCTION public.management_kpis(_from date, _to date, _include_test boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE f timestamptz := _from::timestamptz; t timestamptz := (_to + 1)::timestamptz;
BEGIN
  IF NOT (public.is_staff() OR public.is_finance() OR public.is_dispatcher()) THEN
    RAISE EXCEPTION 'not_authorised';
  END IF;
  RETURN jsonb_build_object(
    'range', jsonb_build_object('from', _from, 'to', _to),
    'leads', (SELECT count(*) FROM public.leads WHERE (_include_test OR NOT is_test) AND created_at >= f AND created_at < t),
    'leads_won', (SELECT count(*) FROM public.leads WHERE (_include_test OR NOT is_test) AND created_at >= f AND created_at < t AND status = 'won'),
    'leads_lost', (SELECT count(*) FROM public.leads WHERE (_include_test OR NOT is_test) AND created_at >= f AND created_at < t AND status = 'lost'),
    'quotes', (SELECT count(*) FROM public.quotes_customer WHERE (_include_test OR NOT public.lead_is_test(lead_id)) AND created_at >= f AND created_at < t),
    'quotes_accepted', (SELECT count(*) FROM public.quotes_customer WHERE (_include_test OR NOT public.lead_is_test(lead_id)) AND created_at >= f AND created_at < t AND status = 'accepted'),
    'quotes_value', (SELECT coalesce(sum(total), 0) FROM public.quotes_customer WHERE (_include_test OR NOT public.lead_is_test(lead_id)) AND created_at >= f AND created_at < t AND status = 'accepted'),
    'jobs', (SELECT count(*) FROM public.jobs_execution WHERE (_include_test OR NOT is_test) AND coalesce(scheduled_start, created_at) >= f AND coalesce(scheduled_start, created_at) < t),
    'jobs_by_status', (SELECT coalesce(jsonb_object_agg(status, c), '{}'::jsonb) FROM (
        SELECT status::text AS status, count(*) AS c FROM public.jobs_execution
         WHERE (_include_test OR NOT is_test) AND coalesce(scheduled_start, created_at) >= f AND coalesce(scheduled_start, created_at) < t
         GROUP BY status) s),
    'jobs_completed', (SELECT count(*) FROM public.jobs_execution WHERE (_include_test OR NOT is_test) AND completed_at >= f AND completed_at < t),
    'jobs_cancelled', (SELECT count(*) FROM public.jobs_execution WHERE (_include_test OR NOT is_test) AND cancelled_at >= f AND cancelled_at < t),
    'incidents', (SELECT count(*) FROM public.incidents WHERE (_include_test OR NOT public.job_is_test(job_id)) AND created_at >= f AND created_at < t),
    'reviews', (SELECT count(*) FROM public.job_reviews WHERE (_include_test OR NOT public.job_is_test(job_id)) AND submitted_at >= f AND submitted_at < t),
    'rating_avg', (SELECT round(avg(rating)::numeric, 2) FROM public.job_reviews WHERE (_include_test OR NOT public.job_is_test(job_id)) AND submitted_at >= f AND submitted_at < t),
    'invoiced_total', (SELECT coalesce(sum(total), 0) FROM public.invoices WHERE (_include_test OR NOT (public.job_is_test(job_id) OR public.lead_is_test(lead_id))) AND issued_at >= f AND issued_at < t AND status <> 'cancelled'),
    'paid_total', (SELECT coalesce(sum(amount_paid), 0) FROM public.invoices WHERE (_include_test OR NOT (public.job_is_test(job_id) OR public.lead_is_test(lead_id))) AND issued_at >= f AND issued_at < t),
    'open_total', (SELECT coalesce(sum(total - amount_paid), 0) FROM public.invoices WHERE (_include_test OR NOT (public.job_is_test(job_id) OR public.lead_is_test(lead_id))) AND status IN ('issued','overdue')),
    'overdue_count', (SELECT count(*) FROM public.invoices WHERE (_include_test OR NOT (public.job_is_test(job_id) OR public.lead_is_test(lead_id))) AND status = 'overdue'),
    'crew_hours', (SELECT coalesce(round(sum(extract(epoch FROM (coalesce(te.ended_at, te.started_at) - te.started_at)) / 3600.0)::numeric, 1), 0)
                     FROM public.time_entries te WHERE (_include_test OR NOT public.job_is_test(te.job_id)) AND te.started_at >= f AND te.started_at < t)
  );
END;
$function$;
GRANT EXECUTE ON FUNCTION public.management_kpis(date,date,boolean) TO authenticated;
CREATE OR REPLACE FUNCTION public.source_performance(_from date, _to date)
 RETURNS TABLE(source_id uuid, source_key text, leads bigint, qualified bigint, won bigint, conversion numeric, revenue numeric, gross_margin numeric, spend numeric, cost_per_lead numeric, cost_per_qualified numeric, cac numeric, roas numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF NOT (public.is_staff() OR public.has_role('ops_manager') OR public.has_role('finance')) THEN
    RAISE EXCEPTION 'not authorised' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH base AS (
    SELECT s.id, s.key,
           count(l.id) AS leads,
           count(l.id) FILTER (WHERE l.status NOT IN ('new','lost','cancelled')) AS qualified,
           count(l.id) FILTER (WHERE l.status IN ('won','scheduled','in_progress','completed')) AS won,
           coalesce(sum(q.total) FILTER (WHERE q.status = 'accepted'), 0) AS revenue,
           coalesce(sum(l.expected_margin) FILTER (WHERE l.status IN ('won','scheduled','in_progress','completed')), 0) AS margin
      FROM public.lead_sources s
      LEFT JOIN public.leads l ON l.source_id = s.id
        AND NOT l.is_test AND l.created_at >= _from AND l.created_at < (_to + 1)
      LEFT JOIN LATERAL (
        SELECT qc.total, qc.status FROM public.quotes_customer qc
         WHERE qc.lead_id = l.id AND qc.status = 'accepted'
         ORDER BY qc.accepted_at DESC NULLS LAST LIMIT 1) q ON true
     GROUP BY s.id, s.key
  ), sp AS (
    SELECT c.source_id, sum(c.spend) AS spend
      FROM public.source_costs c
     WHERE c.period_start <= _to AND c.period_end >= _from
     GROUP BY c.source_id
  )
  SELECT b.id, b.key, b.leads, b.qualified, b.won,
         CASE WHEN b.leads = 0 THEN 0 ELSE round(b.won::numeric * 100 / b.leads, 1) END,
         b.revenue, b.margin,
         sp.spend,
         CASE WHEN sp.spend IS NULL OR b.leads = 0 THEN NULL ELSE round(sp.spend / b.leads, 2) END,
         CASE WHEN sp.spend IS NULL OR b.qualified = 0 THEN NULL ELSE round(sp.spend / b.qualified, 2) END,
         CASE WHEN sp.spend IS NULL OR b.won = 0 THEN NULL ELSE round(sp.spend / b.won, 2) END,
         CASE WHEN sp.spend IS NULL OR sp.spend = 0 THEN NULL ELSE round(b.revenue / sp.spend, 2) END
    FROM base b LEFT JOIN sp ON sp.source_id = b.id
   ORDER BY b.leads DESC;
END;
$function$;

-- is_test may only be set by the service role or the staff RPC dop_set_test_flag (never by public forms).
CREATE OR REPLACE FUNCTION public.guard_is_test() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF public.is_service_role() OR current_setting('app.allow_test_flag', true) = 'on' THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN NEW.is_test := false;
  ELSIF NEW.is_test IS DISTINCT FROM OLD.is_test THEN NEW.is_test := OLD.is_test; END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_guard_is_test ON public.leads;
CREATE TRIGGER trg_guard_is_test BEFORE INSERT OR UPDATE OF is_test ON public.leads FOR EACH ROW EXECUTE FUNCTION public.guard_is_test();
DROP TRIGGER IF EXISTS trg_guard_is_test ON public.quotes;
CREATE TRIGGER trg_guard_is_test BEFORE INSERT OR UPDATE OF is_test ON public.quotes FOR EACH ROW EXECUTE FUNCTION public.guard_is_test();
DROP TRIGGER IF EXISTS trg_guard_is_test ON public.jobs_execution;
CREATE TRIGGER trg_guard_is_test BEFORE INSERT OR UPDATE OF is_test ON public.jobs_execution FOR EACH ROW EXECUTE FUNCTION public.guard_is_test();
DROP TRIGGER IF EXISTS trg_guard_is_test ON public.enquiries;
CREATE TRIGGER trg_guard_is_test BEFORE INSERT OR UPDATE OF is_test ON public.enquiries FOR EACH ROW EXECUTE FUNCTION public.guard_is_test();

CREATE OR REPLACE FUNCTION public.dop_set_test_flag(_kind text, _id uuid, _is_test boolean) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE ref text; prev boolean;
BEGIN
  IF NOT (public.is_zw_admin() OR public.has_role('super_admin')) THEN RAISE EXCEPTION 'not authorised' USING ERRCODE='42501'; END IF;
  PERFORM set_config('app.allow_test_flag','on',true);
  IF _kind='lead' THEN SELECT is_test INTO prev FROM leads WHERE id=_id; UPDATE leads SET is_test=_is_test WHERE id=_id RETURNING reference INTO ref;
  ELSIF _kind='quote' THEN SELECT is_test INTO prev FROM quotes WHERE id=_id; UPDATE quotes SET is_test=_is_test WHERE id=_id RETURNING reference INTO ref;
  ELSIF _kind='job' THEN SELECT is_test INTO prev FROM jobs_execution WHERE id=_id; UPDATE jobs_execution SET is_test=_is_test WHERE id=_id RETURNING reference INTO ref;
  ELSIF _kind='enquiry' THEN SELECT is_test INTO prev FROM enquiries WHERE id=_id; UPDATE enquiries SET is_test=_is_test WHERE id=_id RETURNING name INTO ref;
  ELSE RAISE EXCEPTION 'unknown kind' USING ERRCODE='22023'; END IF;
  IF NOT FOUND THEN RAISE EXCEPTION 'not found' USING ERRCODE='P0002'; END IF;
  PERFORM set_config('app.allow_test_flag','off',true);
  PERFORM public.dop_log(_kind,_id,ref,'test_flag_changed',jsonb_build_object('label',CASE WHEN _is_test THEN 'Als Testdatensatz markiert' ELSE 'Testmarkierung entfernt' END,'previous',prev,'new',_is_test));
END $$;
REVOKE ALL ON FUNCTION public.dop_set_test_flag(text,uuid,boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dop_set_test_flag(text,uuid,boolean) TO authenticated;
CREATE OR REPLACE FUNCTION public.customer_value()
 RETURNS TABLE(contact_key text, customer_name text, customer_email text, customer_phone text, jobs bigint, revenue numeric, gross_margin numeric, average_ticket numeric, complaints bigint, first_job timestamp with time zone, last_job timestamp with time zone, repeat_customer boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF NOT (public.is_staff() OR public.has_role('ops_manager') OR public.has_role('sales')
          OR public.has_role('finance')) THEN
    RAISE EXCEPTION 'not authorised' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH keyed AS (
    SELECT coalesce(nullif(lower(l.customer_email), ''), nullif(l.customer_phone, ''), l.id::text) AS k,
           l.*
      FROM public.leads l
     WHERE NOT l.is_test
  ), agg AS (
    SELECT k.k,
           max(k.customer_name) AS nm,
           max(k.customer_email) AS em,
           max(k.customer_phone) AS ph,
           count(DISTINCT je.id) AS jobs,
           coalesce(sum(q.total), 0) AS revenue,
           coalesce(sum(k.expected_margin) FILTER (WHERE je.id IS NOT NULL), 0) AS margin,
           min(je.completed_at) AS first_job,
           max(je.completed_at) AS last_job
      FROM keyed k
      LEFT JOIN public.jobs_execution je ON je.lead_id = k.id AND je.status IN ('completed','verified')
      LEFT JOIN LATERAL (
        SELECT qc.total FROM public.quotes_customer qc
         WHERE qc.lead_id = k.id AND qc.status = 'accepted'
         ORDER BY qc.accepted_at DESC NULLS LAST LIMIT 1) q ON true
     GROUP BY k.k
  ), comp AS (
    SELECT coalesce(nullif(lower(l.customer_email), ''), nullif(l.customer_phone, ''), l.id::text) AS k,
           count(*) AS n
      FROM public.lead_activities a
      JOIN public.leads l ON l.id = a.lead_id
     WHERE NOT l.is_test AND a.meta->>'complaint' = 'true'
     GROUP BY 1
  )
  SELECT a.k, a.nm, a.em, a.ph, a.jobs, a.revenue, a.margin,
         CASE WHEN a.jobs = 0 THEN 0 ELSE round(a.revenue / a.jobs, 2) END,
         coalesce(c.n, 0), a.first_job, a.last_job, a.jobs > 1
    FROM agg a LEFT JOIN comp c ON c.k = a.k
   WHERE a.jobs > 0
   ORDER BY a.revenue DESC;
END;
$function$;