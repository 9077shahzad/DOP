-- AI Assist foundation ------------------------------------------------------

CREATE TABLE public.ai_feature_flags (
  feature TEXT PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT false,
  rollout_note TEXT NOT NULL DEFAULT '',
  monthly_budget_chf NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.ai_feature_flags TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.ai_feature_flags TO authenticated;
GRANT ALL ON public.ai_feature_flags TO service_role;
ALTER TABLE public.ai_feature_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai flags readable by staff"
  ON public.ai_feature_flags FOR SELECT TO authenticated
  USING (public.is_staff() OR public.is_dispatcher() OR public.has_role('finance'));

CREATE POLICY "ai flags managed by admin"
  ON public.ai_feature_flags FOR ALL TO authenticated
  USING (public.is_zw_admin()) WITH CHECK (public.is_zw_admin());

CREATE TABLE public.ai_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature TEXT NOT NULL,
  day DATE NOT NULL DEFAULT (now() AT TIME ZONE 'Europe/Zurich')::date,
  calls INTEGER NOT NULL DEFAULT 0,
  tokens_in BIGINT NOT NULL DEFAULT 0,
  tokens_out BIGINT NOT NULL DEFAULT 0,
  cost_estimate NUMERIC(10,4) NOT NULL DEFAULT 0,
  blocked_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (feature, day)
);

GRANT SELECT ON public.ai_usage TO authenticated;
GRANT ALL ON public.ai_usage TO service_role;
ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai usage readable by staff"
  ON public.ai_usage FOR SELECT TO authenticated
  USING (public.is_staff() OR public.is_dispatcher() OR public.has_role('finance'));

CREATE TABLE public.ai_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'proposed'
    CHECK (status IN ('proposed','accepted','edited','rejected','expired')),
  subject_type TEXT NOT NULL
    CHECK (subject_type IN ('lead','quote','job','incident','none')),
  subject_id UUID,
  language TEXT NOT NULL DEFAULT 'de',
  input_summary TEXT NOT NULL DEFAULT '',
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  edited_payload JSONB,
  output_text TEXT NOT NULL DEFAULT '',
  confidence NUMERIC(4,3),
  provider TEXT NOT NULL DEFAULT '',
  model TEXT NOT NULL DEFAULT '',
  model_version TEXT NOT NULL DEFAULT '',
  prompt_version TEXT NOT NULL DEFAULT '',
  tokens_in INTEGER NOT NULL DEFAULT 0,
  tokens_out INTEGER NOT NULL DEFAULT 0,
  cost_estimate NUMERIC(10,4) NOT NULL DEFAULT 0,
  reject_reason TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ai_suggestions_feature_status_idx
  ON public.ai_suggestions (feature, status, created_at DESC);
CREATE INDEX ai_suggestions_subject_idx
  ON public.ai_suggestions (subject_type, subject_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_suggestions TO authenticated;
GRANT ALL ON public.ai_suggestions TO service_role;
ALTER TABLE public.ai_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai suggestions staff manage"
  ON public.ai_suggestions FOR ALL TO authenticated
  USING (public.is_staff() OR public.is_dispatcher() OR public.has_role('finance'))
  WITH CHECK (public.is_staff() OR public.is_dispatcher() OR public.has_role('finance'));

CREATE POLICY "ai suggestions crew reads own job"
  ON public.ai_suggestions FOR SELECT TO authenticated
  USING (subject_type = 'job' AND subject_id IS NOT NULL AND public.is_crew_of_job(subject_id));

CREATE POLICY "ai suggestions crew reviews own job"
  ON public.ai_suggestions FOR UPDATE TO authenticated
  USING (subject_type = 'job' AND subject_id IS NOT NULL AND public.is_crew_of_job(subject_id))
  WITH CHECK (subject_type = 'job' AND subject_id IS NOT NULL AND public.is_crew_of_job(subject_id));

CREATE TABLE public.ai_media_consent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_kind TEXT NOT NULL CHECK (media_kind IN ('photo','audio')),
  storage_bucket TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  subject_type TEXT NOT NULL DEFAULT 'none'
    CHECK (subject_type IN ('lead','quote','job','incident','none')),
  subject_id UUID,
  consent_given BOOLEAN NOT NULL DEFAULT false,
  consent_at TIMESTAMPTZ,
  consent_source TEXT NOT NULL DEFAULT '',
  retain_until DATE,
  deleted_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (storage_bucket, storage_path)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_media_consent TO authenticated;
GRANT ALL ON public.ai_media_consent TO service_role;
ALTER TABLE public.ai_media_consent ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai consent staff manage"
  ON public.ai_media_consent FOR ALL TO authenticated
  USING (public.is_staff() OR public.is_dispatcher())
  WITH CHECK (public.is_staff() OR public.is_dispatcher());

CREATE POLICY "ai consent crew records own job"
  ON public.ai_media_consent FOR INSERT TO authenticated
  WITH CHECK (subject_type = 'job' AND subject_id IS NOT NULL AND public.is_crew_of_job(subject_id));

CREATE POLICY "ai consent crew reads own job"
  ON public.ai_media_consent FOR SELECT TO authenticated
  USING (subject_type = 'job' AND subject_id IS NOT NULL AND public.is_crew_of_job(subject_id));

-- shared touch trigger (SECURITY INVOKER, no elevated rights)
CREATE OR REPLACE FUNCTION public.ai_touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER ai_feature_flags_touch BEFORE UPDATE ON public.ai_feature_flags
  FOR EACH ROW EXECUTE FUNCTION public.ai_touch_updated_at();
CREATE TRIGGER ai_usage_touch BEFORE UPDATE ON public.ai_usage
  FOR EACH ROW EXECUTE FUNCTION public.ai_touch_updated_at();
CREATE TRIGGER ai_suggestions_touch BEFORE UPDATE ON public.ai_suggestions
  FOR EACH ROW EXECUTE FUNCTION public.ai_touch_updated_at();
CREATE TRIGGER ai_media_consent_touch BEFORE UPDATE ON public.ai_media_consent
  FOR EACH ROW EXECUTE FUNCTION public.ai_touch_updated_at();

INSERT INTO public.ai_feature_flags (feature, enabled, rollout_note) VALUES
  ('lead_triage', false, 'Wave 6.1 — office review only'),
  ('crew_voice_note', false, 'Wave 6.1 — crew confirms before submit'),
  ('photo_inventory', false, 'Wave 6.1 pilot — staff-reviewed examples only'),
  ('crew_briefing', false, 'Wave 6.2'),
  ('owner_assistant', false, 'Wave 6.2 — read-only'),
  ('translation', false, 'Wave 6.3'),
  ('completion_protocol', false, 'Wave 6.3'),
  ('quote_followup', false, 'Wave 6.3'),
  ('faq_assistant', false, 'Wave 6.4'),
  ('dispatch_recommendation', false, 'Wave 6.5 — blocked on availability/routing data');
