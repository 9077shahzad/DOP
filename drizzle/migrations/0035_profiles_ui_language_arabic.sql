ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_ui_language_supported;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_ui_language_supported
  CHECK (ui_language = ANY (ARRAY['de'::text, 'fr'::text, 'it'::text, 'en'::text, 'ar'::text]));