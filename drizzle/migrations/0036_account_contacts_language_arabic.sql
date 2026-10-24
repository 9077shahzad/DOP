ALTER TABLE public.account_contacts DROP CONSTRAINT IF EXISTS account_contacts_preferred_language_check;
ALTER TABLE public.account_contacts ADD CONSTRAINT account_contacts_preferred_language_check
  CHECK (preferred_language = ANY (ARRAY['de'::text, 'fr'::text, 'it'::text, 'en'::text, 'ar'::text]));