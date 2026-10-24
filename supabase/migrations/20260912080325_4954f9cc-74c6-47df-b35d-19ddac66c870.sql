
CREATE OR REPLACE FUNCTION public.job_tracking_by_token(_token text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'reference', j.reference,
    'status', j.status::text,
    'scheduled_start', j.scheduled_start,
    'scheduled_end', j.scheduled_end,
    'arrived_at', j.arrived_at,
    'started_at', j.started_at,
    'completed_at', j.completed_at,
    'cancelled_at', j.cancelled_at,
    'team_name', tm.name,
    'origin_city', NULLIF(j.origin->>'city', ''),
    'destination_city', NULLIF(j.destination->>'city', ''),
    'contact_phone', (SELECT le.phone FROM public.legal_entities le
                       ORDER BY (le.status = 'active') DESC, le.created_at LIMIT 1),
    'timeline', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
               'status', COALESCE(ev.meta->>'to', ev.kind::text),
               'at', ev.created_at) ORDER BY ev.created_at)
        FROM public.job_events_exec ev
       WHERE ev.job_id = j.id
         AND ev.kind IN ('status', 'arrive', 'start', 'complete', 'cancel')
    ), '[]'::jsonb)
  )
  FROM public.jobs_execution j
  LEFT JOIN public.internal_teams tm ON tm.id = j.team_id
  WHERE j.tracking_token = _token
    AND length(_token) >= 24
  LIMIT 1;
$$;
