-- 1. Admin-managed inventory catalogue -------------------------------------
CREATE TABLE IF NOT EXISTS public.inventory_catalogue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  name_de text NOT NULL,
  category text NOT NULL DEFAULT 'wohnen',
  m3 numeric NOT NULL DEFAULT 0 CHECK (m3 >= 0),
  special boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 100,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.inventory_catalogue TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_catalogue TO authenticated;
GRANT ALL ON public.inventory_catalogue TO service_role;

ALTER TABLE public.inventory_catalogue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "inventory_public_read" ON public.inventory_catalogue;
CREATE POLICY "inventory_public_read" ON public.inventory_catalogue
  FOR SELECT TO anon, authenticated USING (active);

DROP POLICY IF EXISTS "inventory_staff_manage" ON public.inventory_catalogue;
CREATE POLICY "inventory_staff_manage" ON public.inventory_catalogue
  FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP TRIGGER IF EXISTS inventory_catalogue_updated_at ON public.inventory_catalogue;
CREATE TRIGGER inventory_catalogue_updated_at BEFORE UPDATE ON public.inventory_catalogue
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.inventory_catalogue (key, name_de, category, m3, special, sort_order) VALUES
  ('sofa',   'Sofa',            'wohnen',  1.2,  false, 10),
  ('chairA', 'Sessel',          'wohnen',  0.5,  false, 20),
  ('table',  'Esstisch',        'wohnen',  0.8,  false, 30),
  ('chair',  'Stuhl',           'wohnen',  0.15, false, 40),
  ('tv',     'TV',              'wohnen',  0.2,  false, 50),
  ('bed',    'Bett',            'schlafen',0.9,  false, 60),
  ('wardr',  'Kleiderschrank',  'schlafen',1.4,  false, 70),
  ('comm',   'Kommode',         'schlafen',0.5,  false, 80),
  ('wash',   'Waschmaschine',   'geraete', 0.5,  false, 90),
  ('fridge', 'Kühlschrank',     'geraete', 0.5,  false, 100),
  ('desk',   'Bürotisch',       'buero',   0.6,  false, 110),
  ('garden', 'Gartenmöbel',     'aussen',  0.8,  false, 120),
  ('cellar', 'Kellerregal',     'keller',  0.4,  false, 130),
  ('box',    'Kiste',           'keller',  0.07, false, 140),
  ('piano',  'Klavier',         'speziell',1.6,  true,  150),
  ('safe',   'Tresor',          'speziell',0.6,  true,  160)
ON CONFLICT (key) DO NOTHING;

-- 2. PS Umzug enquiry reference PSU-YYMMDD-NNNN ------------------------------
CREATE OR REPLACE FUNCTION public.set_lead_reference()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  day_part text;
  seq int;
  candidate text;
BEGIN
  IF NEW.reference IS NOT NULL AND NEW.reference <> '' AND NEW.reference <> 'pending' THEN
    RETURN NEW;
  END IF;
  day_part := to_char(now() AT TIME ZONE 'Europe/Zurich', 'YYMMDD');
  SELECT count(*) INTO seq FROM public.leads
   WHERE reference LIKE 'PSU-' || day_part || '-%';
  LOOP
    seq := seq + 1;
    candidate := 'PSU-' || day_part || '-' || lpad(seq::text, 4, '0');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.leads WHERE reference = candidate);
  END LOOP;
  NEW.reference := candidate;
  RETURN NEW;
END;
$function$;

-- 3. Duplicate detection on intake -------------------------------------------
CREATE OR REPLACE FUNCTION public.flag_lead_duplicate(_lead_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  me public.leads%ROWTYPE;
  em text; ph text;
  other uuid; matched text;
BEGIN
  SELECT * INTO me FROM public.leads WHERE id = _lead_id;
  IF NOT FOUND THEN RETURN NULL; END IF;
  em := lower(btrim(coalesce(me.customer_email, '')));
  ph := regexp_replace(coalesce(me.customer_phone, ''), '\D', '', 'g');
  IF em = '' AND length(ph) < 6 THEN RETURN NULL; END IF;

  SELECT x.id,
         CASE WHEN em <> '' AND lower(btrim(x.customer_email)) = em THEN 'email' ELSE 'phone' END
    INTO other, matched
    FROM public.leads x
   WHERE x.id <> me.id
     AND x.created_at > now() - interval '14 days'
     AND x.status NOT IN ('lost', 'cancelled', 'spam_review')
     AND ((em <> '' AND lower(btrim(x.customer_email)) = em)
       OR (length(ph) >= 6 AND regexp_replace(coalesce(x.customer_phone, ''), '\D', '', 'g') = ph))
   ORDER BY x.created_at DESC
   LIMIT 1;

  IF other IS NULL THEN RETURN NULL; END IF;

  INSERT INTO public.lead_duplicates (lead_id, existing_lead_id, matched_on, status)
  VALUES (me.id, other, matched, 'open');

  INSERT INTO public.lead_activities (lead_id, kind, body, meta, actor_kind)
  VALUES (me.id, 'system', 'Mögliches Duplikat erkannt',
          jsonb_build_object('matched_on', matched, 'existing_lead_id', other), 'system');

  RETURN other;
END;
$function$;

REVOKE ALL ON FUNCTION public.flag_lead_duplicate(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.flag_lead_duplicate(uuid) TO authenticated, service_role;

-- 4. Attach intake uploads to the created lead --------------------------------
CREATE OR REPLACE FUNCTION public.attach_lead_files(_reference text, _draft text, _files jsonb)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  lead public.leads%ROWTYPE;
  f jsonb;
  path text;
  n int := 0;
BEGIN
  IF _draft IS NULL OR btrim(_draft) = '' THEN RETURN 0; END IF;

  SELECT * INTO lead FROM public.leads
   WHERE reference = _reference AND created_at > now() - interval '60 minutes';
  IF NOT FOUND THEN RETURN 0; END IF;

  FOR f IN SELECT * FROM jsonb_array_elements(coalesce(_files, '[]'::jsonb)) LOOP
    path := coalesce(f->>'storage_path', '');
    -- Only files uploaded under this submission's own folder may be attached.
    CONTINUE WHEN path NOT LIKE 'intake/' || _draft || '/%';
    INSERT INTO public.lead_attachments (lead_id, storage_path, file_name, mime_type, size_bytes)
    VALUES (lead.id, path, coalesce(f->>'file_name', ''), coalesce(f->>'mime_type', ''),
            coalesce((f->>'size_bytes')::bigint, 0));
    n := n + 1;
  END LOOP;

  IF n > 0 THEN
    INSERT INTO public.lead_activities (lead_id, kind, body, meta, actor_kind)
    VALUES (lead.id, 'system', 'Dateien aus dem Anfrageformular übernommen',
            jsonb_build_object('count', n), 'customer');
  END IF;
  RETURN n;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.attach_lead_files(text, text, jsonb) TO anon, authenticated, service_role;

-- 5. Customer uploads into the private attachment bucket ----------------------
DROP POLICY IF EXISTS "intake_uploads_insert" ON storage.objects;
CREATE POLICY "intake_uploads_insert" ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'lead-attachments' AND (storage.foldername(name))[1] = 'intake');
