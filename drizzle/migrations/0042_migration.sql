DROP POLICY IF EXISTS "authenticated read zones" ON public.service_zones;
CREATE POLICY "Signed-in users read active zones" ON public.service_zones
  FOR SELECT TO authenticated USING (active OR public.is_staff());

DROP POLICY IF EXISTS review_settings_read_all ON public.review_settings;
CREATE POLICY review_settings_read_default ON public.review_settings
  FOR SELECT TO anon, authenticated USING (id = 'default' OR public.is_staff());
REVOKE SELECT ON public.review_settings FROM anon;
GRANT SELECT (id, google_review_url, low_rating_threshold) ON public.review_settings TO anon;