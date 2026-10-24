CREATE TABLE IF NOT EXISTS public.review_settings (
  id text PRIMARY KEY DEFAULT 'default',
  enabled boolean NOT NULL DEFAULT false,
  google_review_url text NOT NULL DEFAULT '',
  low_rating_threshold smallint NOT NULL DEFAULT 4,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
INSERT INTO public.review_settings (id) VALUES ('default') ON CONFLICT (id) DO NOTHING;
GRANT SELECT, INSERT, UPDATE ON public.review_settings TO authenticated;
GRANT SELECT ON public.review_settings TO anon;
GRANT ALL ON public.review_settings TO service_role;
ALTER TABLE public.review_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "review_settings_read_all" ON public.review_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "review_settings_staff_update" ON public.review_settings FOR UPDATE TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());