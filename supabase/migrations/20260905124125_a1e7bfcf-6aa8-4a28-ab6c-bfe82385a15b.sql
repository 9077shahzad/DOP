-- ---------------------------------------------------------------- booking
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
DECLARE q public.quotes_customer; l public.leads; j public.jobs_execution;
        d jsonb; atts jsonb; start_ts timestamptz;
BEGIN
  IF NOT public.is_dispatcher() THEN RAISE EXCEPTION 'not authorised' USING ERRCODE = '42501'; END IF;

  SELECT * INTO q FROM public.quotes_customer WHERE id = _quote_id;
  IF q.id IS NULL THEN RAISE EXCEPTION 'quote not found' USING ERRCODE = 'P0002'; END IF;
  IF q.status <> 'accepted' THEN
    RAISE EXCEPTION 'quote is not accepted' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO j FROM public.jobs_execution WHERE quote_id = _quote_id LIMIT 1;
  IF j.id IS NOT NULL THEN RETURN j; END IF;

  SELECT * INTO l FROM public.leads WHERE id = q.lead_id;
  IF l.id IS NULL THEN RAISE EXCEPTION 'quote has no inquiry' USING ERRCODE = '22023'; END IF;

  d := coalesce(l.service_details, '{}'::jsonb);

  SELECT coalesce(jsonb_agg(jsonb_build_object(
           'id', a.id, 'file_name', a.file_name, 'storage_path', a.storage_path,
           'mime_type', a.mime_type, 'size_bytes', a.size_bytes)), '[]'::jsonb)
    INTO atts
    FROM public.lead_attachments a WHERE a.lead_id = l.id;

  start_ts := coalesce(_scheduled_start, (l.preferred_date)::timestamptz);

  INSERT INTO public.jobs_execution (
    lead_id, quote_id, quote_reference, lead_reference, partner_id, team_id, vehicle_id,
    status, scheduled_start, scheduled_end, job_value,
    customer_name, customer_email, customer_phone, customer_language,
    service_key, origin, destination, inventory, extras, attachments,
    booking_notes, booked_at, booked_by
  ) VALUES (
    l.id, q.id, q.reference, l.reference, l.assigned_partner_id, _team_id, _vehicle_id,
    (CASE WHEN _team_id IS NOT NULL THEN 'assigned' ELSE 'scheduled' END)::public.job_exec_status,
    start_ts, _scheduled_end, q.total,
    l.customer_name, l.customer_email, l.customer_phone, l.language,
    coalesce(d->>'service', (d->'services'->>0), ''),
    coalesce(d->'origin', '{}'::jsonb), coalesce(d->'destination', '{}'::jsonb),
    coalesce(d->'items', '[]'::jsonb), coalesce(d->'extras', '[]'::jsonb), atts,
    coalesce(_notes, ''), now(), auth.uid()
  ) RETURNING * INTO j;

  INSERT INTO public.job_events_exec (job_id, kind, body, meta, actor_id, actor_kind)
  VALUES (j.id, 'status', 'Buchung aus angenommener Offerte',
          jsonb_build_object('status', j.status, 'quote', q.reference, 'lead', l.reference),
          auth.uid(), 'staff');

  INSERT INTO public.lead_activities (lead_id, kind, body, meta, actor_id, actor_kind)
  VALUES (l.id, 'system', 'Buchung erstellt',
          jsonb_build_object('job', j.id, 'reference', j.reference, 'quote', q.reference),
          auth.uid(), 'staff');

  UPDATE public.leads SET status = 'scheduled', last_activity_at = now() WHERE id = l.id;
  RETURN j;
END; $$;
REVOKE EXECUTE ON FUNCTION public.create_booking_from_quote(uuid, timestamptz, timestamptz, uuid, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_booking_from_quote(uuid, timestamptz, timestamptz, uuid, uuid, text) TO authenticated;

-- ------------------------------------------------- double booking guard
CREATE OR REPLACE FUNCTION public.jobs_execution_no_double_booking()
RETURNS trigger
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE s timestamptz; e timestamptz; clash text;
BEGIN
  IF NEW.scheduled_start IS NULL OR NEW.status IN ('cancelled','completed','verified') THEN
    RETURN NEW;
  END IF;
  s := NEW.scheduled_start;
  e := coalesce(NEW.scheduled_end, NEW.scheduled_start + interval '4 hours');

  IF NEW.team_id IS NOT NULL THEN
    SELECT o.reference INTO clash FROM public.jobs_execution o
     WHERE o.id <> NEW.id AND o.team_id = NEW.team_id
       AND o.status NOT IN ('cancelled')
       AND o.scheduled_start IS NOT NULL
       AND o.scheduled_start < e
       AND coalesce(o.scheduled_end, o.scheduled_start + interval '4 hours') > s
     LIMIT 1;
    IF clash IS NOT NULL THEN
      RAISE EXCEPTION 'Team ist im gewählten Zeitfenster bereits auf Einsatz % eingeteilt', clash
        USING ERRCODE = '22023';
    END IF;
  END IF;

  IF NEW.vehicle_id IS NOT NULL THEN
    SELECT o.reference INTO clash FROM public.jobs_execution o
     WHERE o.id <> NEW.id AND o.vehicle_id = NEW.vehicle_id
       AND o.status NOT IN ('cancelled')
       AND o.scheduled_start IS NOT NULL
       AND o.scheduled_start < e
       AND coalesce(o.scheduled_end, o.scheduled_start + interval '4 hours') > s
     LIMIT 1;
    IF clash IS NOT NULL THEN
      RAISE EXCEPTION 'Fahrzeug ist im gewählten Zeitfenster bereits auf Einsatz % eingeteilt', clash
        USING ERRCODE = '22023';
    END IF;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS jobs_execution_double_booking ON public.jobs_execution;
CREATE TRIGGER jobs_execution_double_booking
BEFORE INSERT OR UPDATE OF team_id, vehicle_id, scheduled_start, scheduled_end
ON public.jobs_execution FOR EACH ROW EXECUTE FUNCTION public.jobs_execution_no_double_booking();

-- --------------------------------------------------------- availability
CREATE OR REPLACE FUNCTION public.resource_busy(_start timestamptz, _end timestamptz, _exclude_job uuid DEFAULT NULL)
RETURNS TABLE (resource_kind text, resource_id uuid, job_reference text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT k.kind, k.rid, j.reference
    FROM public.jobs_execution j
    CROSS JOIN LATERAL (VALUES ('team', j.team_id), ('vehicle', j.vehicle_id)) AS k(kind, rid)
   WHERE public.is_dispatcher()
     AND k.rid IS NOT NULL
     AND j.status NOT IN ('cancelled')
     AND j.scheduled_start IS NOT NULL
     AND (_exclude_job IS NULL OR j.id <> _exclude_job)
     AND j.scheduled_start < coalesce(_end, _start + interval '4 hours')
     AND coalesce(j.scheduled_end, j.scheduled_start + interval '4 hours') > _start
$$;
REVOKE EXECUTE ON FUNCTION public.resource_busy(timestamptz, timestamptz, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resource_busy(timestamptz, timestamptz, uuid) TO authenticated;

-- ------------------------------------------------------------- dispatch
CREATE OR REPLACE FUNCTION public.assign_job_resources(
  _job_id uuid, _team_id uuid, _vehicle_id uuid,
  _scheduled_start timestamptz DEFAULT NULL, _scheduled_end timestamptz DEFAULT NULL
) RETURNS public.jobs_execution
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE j public.jobs_execution;
BEGIN
  IF NOT public.is_dispatcher() THEN RAISE EXCEPTION 'not authorised' USING ERRCODE = '42501'; END IF;
  SELECT * INTO j FROM public.jobs_execution WHERE id = _job_id FOR UPDATE;
  IF j.id IS NULL THEN RAISE EXCEPTION 'job not found' USING ERRCODE = 'P0002'; END IF;
  IF j.status IN ('cancelled','completed','verified') THEN
    RAISE EXCEPTION 'Einsatz ist abgeschlossen oder storniert' USING ERRCODE = '22023';
  END IF;
  IF _team_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.crew_members WHERE team_id = _team_id) THEN
    RAISE EXCEPTION 'Team hat keine Mitglieder' USING ERRCODE = '22023';
  END IF;
  IF _vehicle_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.vehicles WHERE id = _vehicle_id AND active) THEN
    RAISE EXCEPTION 'Fahrzeug ist nicht aktiv' USING ERRCODE = '22023';
  END IF;

  UPDATE public.jobs_execution SET
    team_id = _team_id,
    vehicle_id = _vehicle_id,
    scheduled_start = coalesce(_scheduled_start, scheduled_start),
    scheduled_end = coalesce(_scheduled_end, scheduled_end),
    status = CASE WHEN _team_id IS NOT NULL AND status = 'scheduled' THEN 'assigned'::public.job_exec_status
                  WHEN _team_id IS NULL AND status = 'assigned' THEN 'scheduled'::public.job_exec_status
                  ELSE status END,
    updated_at = now()
  WHERE id = _job_id RETURNING * INTO j;

  INSERT INTO public.job_events_exec (job_id, kind, body, meta, actor_id, actor_kind)
  VALUES (_job_id, 'status', 'Disposition aktualisiert',
          jsonb_build_object('status', j.status, 'team', _team_id, 'vehicle', _vehicle_id,
                             'scheduled_start', j.scheduled_start, 'scheduled_end', j.scheduled_end),
          auth.uid(), 'staff');
  RETURN j;
END; $$;
REVOKE EXECUTE ON FUNCTION public.assign_job_resources(uuid, uuid, uuid, timestamptz, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.assign_job_resources(uuid, uuid, uuid, timestamptz, timestamptz) TO authenticated;

-- -------------------------------------------------------- status ladder
CREATE OR REPLACE FUNCTION public.set_job_status(_job_id uuid, _status job_exec_status, _note text DEFAULT ''::text)
RETURNS public.jobs_execution
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE j public.jobs_execution; ok boolean; ev public.job_exec_event_kind;
        is_partner boolean; is_crew boolean; before_shots int; after_shots int;
BEGIN
  SELECT * INTO j FROM public.jobs_execution WHERE id = _job_id FOR UPDATE;
  IF j.id IS NULL THEN RAISE EXCEPTION 'job not found' USING ERRCODE = 'P0002'; END IF;
  is_partner := j.partner_id IS NOT NULL AND j.partner_id = public.current_partner_id();
  is_crew := public.is_crew_of_job(_job_id);
  IF NOT (public.is_dispatcher() OR is_partner OR is_crew) THEN
    RAISE EXCEPTION 'not authorised' USING ERRCODE = '42501';
  END IF;
  IF _status = 'cancelled' THEN RAISE EXCEPTION 'use cancel_job to cancel' USING ERRCODE = '22023'; END IF;
  IF _status = 'verified' AND NOT public.is_dispatcher() THEN
    RAISE EXCEPTION 'not authorised' USING ERRCODE = '42501';
  END IF;
  IF _status = 'assigned' AND NOT public.is_dispatcher() THEN
    RAISE EXCEPTION 'not authorised' USING ERRCODE = '42501';
  END IF;

  ok := CASE j.status
    WHEN 'scheduled'   THEN _status IN ('assigned','en_route','on_site')
    WHEN 'assigned'    THEN _status IN ('en_route','on_site')
    WHEN 'en_route'    THEN _status IN ('on_site')
    WHEN 'on_site'     THEN _status IN ('in_progress')
    WHEN 'in_progress' THEN _status IN ('loading','paused','completed')
    WHEN 'loading'     THEN _status IN ('in_transit','paused')
    WHEN 'in_transit'  THEN _status IN ('unloading','paused')
    WHEN 'unloading'   THEN _status IN ('completed','paused')
    WHEN 'paused'      THEN _status IN ('in_progress','loading','in_transit','unloading','completed')
    WHEN 'completed'   THEN _status IN ('verified')
    ELSE false END;
  IF NOT ok THEN RAISE EXCEPTION 'invalid transition' USING ERRCODE = '22023'; END IF;

  IF _status = 'completed' THEN
    SELECT count(*) FILTER (WHERE phase = 'before'), count(*) FILTER (WHERE phase = 'after')
      INTO before_shots, after_shots FROM public.job_photos WHERE job_id = _job_id;
    IF before_shots = 0 OR after_shots = 0 THEN
      RAISE EXCEPTION 'Abschluss benötigt mindestens ein Vorher- und ein Nachher-Foto' USING ERRCODE = '22023';
    END IF;
    IF j.customer_confirmation = 'none' OR coalesce(btrim(j.signed_by_name), '') = '' THEN
      RAISE EXCEPTION 'Abschluss benötigt die Kundenbestätigung' USING ERRCODE = '22023';
    END IF;
    IF coalesce(btrim(_note), '') = '' AND coalesce(btrim(j.crew_note), '') = '' THEN
      RAISE EXCEPTION 'Abschluss benötigt eine Schlussnotiz' USING ERRCODE = '22023';
    END IF;
  END IF;

  UPDATE public.jobs_execution SET
    status = _status,
    arrived_at   = CASE WHEN _status = 'on_site' AND arrived_at IS NULL THEN now() ELSE arrived_at END,
    started_at   = CASE WHEN _status = 'in_progress' AND started_at IS NULL THEN now() ELSE started_at END,
    paused_at    = CASE WHEN _status = 'paused' THEN now() ELSE NULL END,
    total_pause_minutes = CASE
      WHEN j.status = 'paused' AND j.paused_at IS NOT NULL
      THEN total_pause_minutes + greatest(0, (extract(epoch FROM now() - j.paused_at)/60)::int)
      ELSE total_pause_minutes END,
    crew_note = CASE WHEN coalesce(btrim(_note),'') <> '' THEN _note ELSE crew_note END,
    completed_at = CASE WHEN _status = 'completed' THEN now() ELSE completed_at END,
    verified_at  = CASE WHEN _status = 'verified' THEN now() ELSE verified_at END,
    updated_at = now()
  WHERE id = _job_id RETURNING * INTO j;

  ev := CASE _status
    WHEN 'on_site' THEN 'arrive'::public.job_exec_event_kind
    WHEN 'in_progress' THEN (CASE WHEN j.total_pause_minutes > 0 THEN 'resume' ELSE 'start' END)::public.job_exec_event_kind
    WHEN 'paused' THEN 'pause'::public.job_exec_event_kind
    WHEN 'completed' THEN 'complete'::public.job_exec_event_kind
    ELSE 'status'::public.job_exec_event_kind END;

  INSERT INTO public.job_events_exec (job_id, kind, body, meta, actor_id, actor_kind)
  VALUES (_job_id, ev, coalesce(_note,''), jsonb_build_object('status', _status), auth.uid(),
          (CASE WHEN is_partner THEN 'partner' ELSE 'staff' END)::public.lead_actor_kind);
  RETURN j;
END; $$;

-- ------------------------------------------------ customer confirmation
CREATE OR REPLACE FUNCTION public.record_job_confirmation(_job_id uuid, _kind job_confirmation_kind, _name text DEFAULT ''::text, _signature_path text DEFAULT ''::text, _code text DEFAULT ''::text)
RETURNS public.jobs_execution
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE j public.jobs_execution; is_partner boolean; is_crew boolean;
BEGIN
  SELECT * INTO j FROM public.jobs_execution WHERE id = _job_id FOR UPDATE;
  IF j.id IS NULL THEN RAISE EXCEPTION 'job not found' USING ERRCODE = 'P0002'; END IF;
  is_partner := j.partner_id IS NOT NULL AND j.partner_id = public.current_partner_id();
  is_crew := public.is_crew_of_job(_job_id);
  IF NOT (public.is_dispatcher() OR is_partner OR is_crew) THEN
    RAISE EXCEPTION 'not authorised' USING ERRCODE = '42501';
  END IF;
  IF _kind = 'signature' AND coalesce(btrim(_name),'') = '' THEN
    RAISE EXCEPTION 'signer name is required' USING ERRCODE = '22023';
  END IF;

  UPDATE public.jobs_execution
     SET customer_confirmation = _kind,
         signed_by_name = coalesce(btrim(_name),''),
         signature_path = coalesce(_signature_path,''),
         confirmation_code = coalesce(btrim(_code),''),
         signed_at = now(), updated_at = now()
   WHERE id = _job_id RETURNING * INTO j;

  INSERT INTO public.job_events_exec (job_id, kind, body, meta, actor_id, actor_kind)
  VALUES (_job_id, 'signature', coalesce(btrim(_name),''),
          jsonb_build_object('confirmation', _kind), auth.uid(),
          (CASE WHEN is_partner THEN 'partner' ELSE 'staff' END)::public.lead_actor_kind);
  RETURN j;
END; $$;

-- crews may add their own time entries and incidents for their own jobs only
DROP POLICY IF EXISTS "crew inserts own time entries" ON public.time_entries;
CREATE POLICY "crew inserts own time entries" ON public.time_entries
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.employees e WHERE e.id = employee_id AND e.user_id = auth.uid())
    AND (job_id IS NULL OR public.is_crew_of_job(job_id))
  );