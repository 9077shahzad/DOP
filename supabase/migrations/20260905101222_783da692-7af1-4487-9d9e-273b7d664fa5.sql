-- 1. Company record: extra contact fields, then the PS Umzug values.
ALTER TABLE public.legal_entities
  ADD COLUMN IF NOT EXISTS mobile_phone text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS website text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS opening_hours jsonb NOT NULL DEFAULT '[]'::jsonb;

UPDATE public.legal_entities
   SET legal_name    = 'PS Umzug AG',
       address_line  = 'Bahnhofstrasse 85',
       postal_code   = '3613',
       city          = 'Steffisburg',
       canton        = 'BE',
       email         = 'info@ps-umzug.ch',
       phone         = '0800 800 255',
       mobile_phone  = '079 821 97 35',
       currency      = 'CHF',
       opening_hours = '[{"days":"Mo-Fr","from":"08:00","to":"17:00"},{"days":"Sa","from":"08:00","to":"11:00"}]'::jsonb,
       updated_at    = now()
 WHERE country = 'CH';

-- 2. Service catalogue — admin editable, replaces the hard-coded list in code.
INSERT INTO public.service_catalogue (key, label_de, label_fr, label_it, label_en, unit, sort_order, active)
VALUES
  ('umzug',        'Umzüge',                'Déménagements',      'Traslochi',            'Removals',            'quotation'::public.service_unit, 10, true),
  ('reinigung',    'Reinigung',             'Nettoyage',          'Pulizie',              'Cleaning',            'quotation'::public.service_unit, 20, true),
  ('entsorgung',   'Räumung / Entsorgung',  'Débarras',           'Sgomberi',             'Clearance / disposal','quotation'::public.service_unit, 30, true),
  ('lagerung',     'Lagerung',              'Stockage',           'Deposito',             'Storage',             'per_m3'::public.service_unit,    40, true),
  ('transport',    'Transport',             'Transport',          'Trasporto',            'Transport',           'per_trip'::public.service_unit,  50, true),
  ('besichtigung', 'Offerte / Besichtigung','Devis / visite',     'Preventivo / visita',  'Quote / survey',      'per_visit'::public.service_unit, 60, true)
ON CONFLICT (key) DO UPDATE
   SET label_de = EXCLUDED.label_de,
       label_fr = EXCLUDED.label_fr,
       label_it = EXCLUDED.label_it,
       label_en = EXCLUDED.label_en,
       unit = EXCLUDED.unit,
       sort_order = EXCLUDED.sort_order,
       active = true,
       updated_at = now();

-- Retire catalogue rows inherited from the previous product, if any.
UPDATE public.service_catalogue
   SET active = false, updated_at = now()
 WHERE key NOT IN ('umzug','reinigung','entsorgung','lagerung','transport','besichtigung');

-- 3. Service areas — seeded conservatively, extended in the admin area.
INSERT INTO public.service_zones (country, canton, city, postcode_prefix, active)
SELECT * FROM (VALUES
  ('CH','BE','Steffisburg','3613', true),
  ('CH','BE','Thun','36', true),
  ('CH','BE','Bern','30', true)
) AS v(country, canton, city, postcode_prefix, active)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_zones z
   WHERE z.country = v.country AND z.city = v.city AND z.postcode_prefix = v.postcode_prefix
);

-- 4. Staged role migration, step 2: the new administration roles get the same
--    access as the legacy admin role. Legacy role keeps working unchanged.
CREATE OR REPLACE FUNCTION public.is_zw_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('zuegelwerk_admin', 'super_admin', 'management')
  )
$function$;

CREATE OR REPLACE FUNCTION public.is_staff()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('zuegelwerk_admin', 'super_admin', 'management')
  )
$function$;