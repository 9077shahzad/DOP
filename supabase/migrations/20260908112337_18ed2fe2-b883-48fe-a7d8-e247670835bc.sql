
-- 1) consent_records: validate anon-supplied references against real records
CREATE OR REPLACE FUNCTION public.consent_reference_exists(_ref text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT coalesce(_ref, '') = ''
      OR EXISTS (SELECT 1 FROM public.leads l WHERE l.reference = _ref)
      OR EXISTS (SELECT 1 FROM public.quotes q WHERE q.reference = _ref)
      OR EXISTS (SELECT 1 FROM public.quotes_customer qc WHERE qc.reference = _ref)
      OR EXISTS (SELECT 1 FROM public.jobs j WHERE j.reference = _ref)
$$;

REVOKE ALL ON FUNCTION public.consent_reference_exists(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consent_reference_exists(text) TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "anyone may record their own consent" ON public.consent_records;
CREATE POLICY "anyone may record their own consent"
ON public.consent_records
FOR INSERT
TO anon, authenticated
WITH CHECK (
  (NOT (created_by IS DISTINCT FROM auth.uid()))
  AND (
    auth.uid() IS NOT NULL
    OR (
      coalesce(partner_reference, '') = ''
      AND subject_type = 'customer'::consent_subject_type
      AND public.consent_reference_exists(booking_reference)
      AND public.consent_reference_exists(subject_ref)
    )
  )
);

-- 2) deterministic partner identity mapping
CREATE TABLE IF NOT EXISTS public.partner_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.partner_users TO authenticated;
GRANT ALL ON public.partner_users TO service_role;
ALTER TABLE public.partner_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "partner users read own link" ON public.partner_users;
CREATE POLICY "partner users read own link"
ON public.partner_users FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_staff());

DROP POLICY IF EXISTS "staff manage partner links" ON public.partner_users;
CREATE POLICY "staff manage partner links"
ON public.partner_users FOR ALL TO authenticated
USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP TRIGGER IF EXISTS update_partner_users_updated_at ON public.partner_users;
CREATE TRIGGER update_partner_users_updated_at
BEFORE UPDATE ON public.partner_users
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- backfill: only unambiguous, non-rejected records
INSERT INTO public.partner_users (user_id, partner_id)
SELECT created_by, id FROM (
  SELECT p.created_by, p.id, count(*) OVER (PARTITION BY p.created_by) AS n
  FROM public.partners p
  WHERE p.created_by IS NOT NULL AND p.status <> 'rejected'::partner_status
) s
WHERE s.n = 1
ON CONFLICT (user_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.current_partner_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
  -- Explicit mapping wins: exactly one partner record per signed-in account.
  SELECT COALESCE(
    (SELECT pu.partner_id
       FROM public.partner_users pu
       JOIN public.partners p ON p.id = pu.partner_id
      WHERE pu.user_id = auth.uid()
        AND p.status <> 'rejected'::partner_status),
    -- Fallback for accounts created before the mapping existed: only an
    -- unambiguous, non-rejected record resolves.
    (SELECT id FROM (
       SELECT p.id, count(*) OVER () AS n
       FROM public.partners p
       WHERE p.created_by = auth.uid()
         AND p.status <> 'rejected'::partner_status
     ) m WHERE m.n = 1)
  )
$$;

-- keep the mapping current for new partner registrations
CREATE OR REPLACE FUNCTION public.partners_link_owner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  IF NEW.created_by IS NOT NULL THEN
    INSERT INTO public.partner_users (user_id, partner_id)
    VALUES (NEW.created_by, NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS partners_link_owner_trg ON public.partners;
CREATE TRIGGER partners_link_owner_trg
AFTER INSERT ON public.partners
FOR EACH ROW EXECUTE FUNCTION public.partners_link_owner();

-- 3) storage: scope lead-attachment uploads
DROP POLICY IF EXISTS "intake_uploads_insert" ON storage.objects;
CREATE POLICY "intake_uploads_insert"
ON storage.objects FOR INSERT TO anon, authenticated
WITH CHECK (
  bucket_id = 'lead-attachments'
  AND array_length(storage.foldername(name), 1) = 2
  AND (storage.foldername(name))[1] = 'intake'
  AND (storage.foldername(name))[2] ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
  AND lower(substring(name, '\.([^.]+)$')) = ANY (ARRAY['jpg','jpeg','png','webp','heic','heif','gif','avif','mp4','mov','m4v','webm','avi','mkv','pdf'])
  AND COALESCE((metadata ->> 'size')::bigint, (metadata ->> 'contentLength')::bigint, 0::bigint) <= 26214400
);

DROP POLICY IF EXISTS "internal upload lead attachments" ON storage.objects;
CREATE POLICY "internal upload lead attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'lead-attachments'
  AND (public.is_staff() OR public.has_role('ops_manager') OR public.has_role('sales'))
  AND array_length(storage.foldername(name), 1) = 1
  AND (storage.foldername(name))[1] ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
  AND EXISTS (
    SELECT 1 FROM public.leads l WHERE l.id = ((storage.foldername(name))[1])::uuid
  )
  AND lower(substring(name, '\.([^.]+)$')) = ANY (ARRAY['jpg','jpeg','png','pdf','heic','webp'])
);
