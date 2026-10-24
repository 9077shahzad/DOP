ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS is_test boolean NOT NULL DEFAULT false;
COMMENT ON TABLE public.quotes_customer IS 'LEGACY: no longer a KPI source; public.quotes is the canonical quote source for management KPIs.';

CREATE OR REPLACE FUNCTION public.management_kpis(_from date, _to date, _include_test boolean DEFAULT false)
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE f timestamptz := _from::timestamptz; t timestamptz := (_to + 1)::timestamptz;
BEGIN
  IF NOT (public.is_staff() OR public.is_finance() OR public.is_dispatcher()) THEN
    RAISE EXCEPTION 'not_authorised';
  END IF;
  RETURN (
  WITH cases AS (
    SELECT q.* FROM public.quotes q
     WHERE (_include_test OR NOT q.is_test) AND q.created_at >= f AND q.created_at < t
  ), offers AS (
    SELECT c.*,
      (c.accepted_at IS NOT NULL AND c.accepted_version IS NOT NULL) AS is_accepted,
      (c.sent_at IS NOT NULL OR c.sent_version IS NOT NULL OR (c.accepted_at IS NOT NULL AND c.accepted_version IS NOT NULL)) AS is_sent,
      CASE WHEN c.accepted_at IS NOT NULL AND c.accepted_version IS NOT NULL
           THEN coalesce((SELECT v.total FROM public.quote_versions v WHERE v.quote_id = c.id AND v.version = c.accepted_version LIMIT 1), c.price_total, 0)
           ELSE coalesce(c.price_total, 0) END AS current_value
    FROM cases c WHERE coalesce(c.workflow_stage, 'offer_draft') <> 'new_request'
  )
  SELECT jsonb_build_object(
    'range', jsonb_build_object('from', _from, 'to', _to),
    'quote_source', 'quotes',
    'leads', (SELECT count(*) FROM public.leads WHERE (_include_test OR NOT is_test) AND created_at >= f AND created_at < t),
    'leads_won', (SELECT count(*) FROM public.leads WHERE (_include_test OR NOT is_test) AND created_at >= f AND created_at < t AND status = 'won'),
    'leads_lost', (SELECT count(*) FROM public.leads WHERE (_include_test OR NOT is_test) AND created_at >= f AND created_at < t AND status = 'lost'),
    'dop_cases', (SELECT count(*) FROM cases),
    'quotes', (SELECT count(*) FROM offers),
    'quotes_sent', (SELECT count(*) FROM offers WHERE is_sent),
    'quotes_accepted', (SELECT count(*) FROM offers WHERE is_accepted),
    'quotes_value', (SELECT coalesce(sum(current_value), 0) FROM offers),
    'quotes_accepted_value', (SELECT coalesce(sum(current_value), 0) FROM offers WHERE is_accepted),
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
    'invoiced_total', (SELECT coalesce(sum(total), 0) FROM public.invoices WHERE (_include_test OR NOT (is_test OR public.job_is_test(job_id) OR public.lead_is_test(lead_id))) AND issued_at >= f AND issued_at < t AND status <> 'cancelled'),
    'paid_total', (SELECT coalesce(sum(amount_paid), 0) FROM public.invoices WHERE (_include_test OR NOT (is_test OR public.job_is_test(job_id) OR public.lead_is_test(lead_id))) AND issued_at >= f AND issued_at < t),
    'open_total', (SELECT coalesce(sum(total - amount_paid), 0) FROM public.invoices WHERE (_include_test OR NOT (is_test OR public.job_is_test(job_id) OR public.lead_is_test(lead_id))) AND status IN ('issued','overdue')),
    'overdue_count', (SELECT count(*) FROM public.invoices WHERE (_include_test OR NOT (is_test OR public.job_is_test(job_id) OR public.lead_is_test(lead_id))) AND status = 'overdue'),
    'crew_hours', (SELECT coalesce(round(sum(extract(epoch FROM (coalesce(te.ended_at, te.started_at) - te.started_at)) / 3600.0)::numeric, 1), 0)
                     FROM public.time_entries te WHERE (_include_test OR NOT public.job_is_test(te.job_id)) AND te.started_at >= f AND te.started_at < t)
  ));
END;
$function$;