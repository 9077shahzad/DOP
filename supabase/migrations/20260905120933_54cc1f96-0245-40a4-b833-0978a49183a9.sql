CREATE TABLE public.employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  full_name text NOT NULL,
  role text NOT NULL DEFAULT 'mover',
  phone text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  skills text[] NOT NULL DEFAULT '{}',
  employment text NOT NULL DEFAULT 'permanent',
  active boolean NOT NULL DEFAULT true,
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.employees TO authenticated;
GRANT ALL ON public.employees TO service_role;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "employees staff manage" ON public.employees FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());
CREATE POLICY "employees read own" ON public.employees FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plate text NOT NULL,
  label text NOT NULL DEFAULT '',
  vehicle_type text NOT NULL DEFAULT 'van',
  capacity_m3 numeric NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicles TO authenticated;
GRANT ALL ON public.vehicles TO service_role;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vehicles staff manage" ON public.vehicles FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());
CREATE POLICY "vehicles read authenticated" ON public.vehicles FOR SELECT TO authenticated USING (true);

CREATE TABLE public.crew_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.internal_teams(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  crew_role text NOT NULL DEFAULT 'mover',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (team_id, employee_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crew_members TO authenticated;
GRANT ALL ON public.crew_members TO service_role;
ALTER TABLE public.crew_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crew_members staff manage" ON public.crew_members FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());
CREATE POLICY "crew_members read own" ON public.crew_members FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.employees e WHERE e.id = crew_members.employee_id AND e.user_id = auth.uid()));

ALTER TABLE public.jobs_execution ADD COLUMN IF NOT EXISTS vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE SET NULL;

CREATE TABLE public.time_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  job_id uuid REFERENCES public.jobs_execution(id) ON DELETE SET NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  minutes integer,
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.time_entries TO authenticated;
GRANT ALL ON public.time_entries TO service_role;
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "time_entries staff manage" ON public.time_entries FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());
CREATE POLICY "time_entries own read" ON public.time_entries FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.employees e WHERE e.id = time_entries.employee_id AND e.user_id = auth.uid()));
CREATE POLICY "time_entries own write" ON public.time_entries FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.employees e WHERE e.id = time_entries.employee_id AND e.user_id = auth.uid()));
CREATE POLICY "time_entries own update" ON public.time_entries FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.employees e WHERE e.id = time_entries.employee_id AND e.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.employees e WHERE e.id = time_entries.employee_id AND e.user_id = auth.uid()));

CREATE TABLE public.incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES public.jobs_execution(id) ON DELETE SET NULL,
  kind text NOT NULL DEFAULT 'damage',
  severity text NOT NULL DEFAULT 'low',
  description text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'open',
  reported_by uuid,
  photo_paths text[] NOT NULL DEFAULT '{}',
  resolution text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.incidents TO authenticated;
GRANT ALL ON public.incidents TO service_role;
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "incidents staff manage" ON public.incidents FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());
CREATE POLICY "incidents reporter read" ON public.incidents FOR SELECT TO authenticated USING (reported_by = auth.uid());
CREATE POLICY "incidents reporter insert" ON public.incidents FOR INSERT TO authenticated WITH CHECK (reported_by = auth.uid());

CREATE TABLE public.job_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs_execution(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  rating integer,
  comment text NOT NULL DEFAULT '',
  requested_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_reviews TO authenticated;
GRANT ALL ON public.job_reviews TO service_role;
ALTER TABLE public.job_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "job_reviews staff manage" ON public.job_reviews FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

CREATE OR REPLACE FUNCTION public.review_by_token(_token text)
RETURNS TABLE (job_reference text, rating integer, comment text, submitted_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT j.reference, r.rating, r.comment, r.submitted_at
  FROM public.job_reviews r
  JOIN public.jobs_execution j ON j.id = r.job_id
  WHERE r.token = _token
$$;
GRANT EXECUTE ON FUNCTION public.review_by_token(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.submit_review(_token text, _rating integer, _comment text)
RETURNS boolean
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
DECLARE updated integer;
BEGIN
  IF _rating IS NULL OR _rating < 1 OR _rating > 5 THEN
    RAISE EXCEPTION 'invalid rating';
  END IF;
  UPDATE public.job_reviews
     SET rating = _rating, comment = coalesce(left(_comment, 2000), ''), submitted_at = now(), updated_at = now()
   WHERE token = _token AND submitted_at IS NULL;
  GET DIAGNOSTICS updated = ROW_COUNT;
  RETURN updated > 0;
END;
$$;
GRANT EXECUTE ON FUNCTION public.submit_review(text, integer, text) TO anon, authenticated;

CREATE TRIGGER employees_touch BEFORE UPDATE ON public.employees FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER vehicles_touch BEFORE UPDATE ON public.vehicles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER crew_members_touch BEFORE UPDATE ON public.crew_members FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER time_entries_touch BEFORE UPDATE ON public.time_entries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER incidents_touch BEFORE UPDATE ON public.incidents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER job_reviews_touch BEFORE UPDATE ON public.job_reviews FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();