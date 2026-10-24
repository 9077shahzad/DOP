-- 1) Function exposure: remove implicit PUBLIC execute, keep only the roles that
--    already needed it, and drop execute on helpers nothing calls.
DO $$
DECLARE r record; a boolean; u boolean;
BEGIN
  FOR r IN
    SELECT p.oid, n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prokind = 'f' AND p.prorettype <> 'trigger'::regtype
  LOOP
    a := has_function_privilege('anon', r.oid, 'EXECUTE');
    u := has_function_privilege('authenticated', r.oid, 'EXECUTE');
    EXECUTE format('REVOKE ALL ON FUNCTION public.%I(%s) FROM PUBLIC', r.proname, r.args);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO service_role', r.proname, r.args);
    IF a THEN EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO anon', r.proname, r.args); END IF;
    IF u THEN EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO authenticated', r.proname, r.args); END IF;
  END LOOP;
END $$;

REVOKE EXECUTE ON FUNCTION public.next_invoice_reference() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.flag_lead_duplicate(uuid) FROM anon, authenticated;

-- 2) consent_records: append-only evidence, identity stamped server-side.
ALTER TABLE public.consent_records
  ADD COLUMN IF NOT EXISTS created_by uuid;

REVOKE UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.consent_records FROM authenticated;
GRANT SELECT, INSERT ON public.consent_records TO authenticated;
GRANT INSERT ON public.consent_records TO anon;
GRANT ALL ON public.consent_records TO service_role;

CREATE OR REPLACE FUNCTION public.consent_records_stamp_identity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.created_by := auth.uid();
  IF auth.uid() IS NOT NULL
     AND coalesce(NEW.subject_ref, '') <> ''
     AND NEW.subject_ref <> auth.uid()::text
     AND NEW.subject_ref <> coalesce(auth.jwt() ->> 'email', '~')
  THEN
    RAISE EXCEPTION 'consent evidence must reference the signed-in subject';
  END IF;
  IF auth.uid() IS NULL AND coalesce(NEW.partner_reference, '') <> '' THEN
    RAISE EXCEPTION 'partner consent requires a signed-in partner';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.consent_records_stamp_identity() FROM PUBLIC;

DROP TRIGGER IF EXISTS consent_records_stamp_identity ON public.consent_records;
CREATE TRIGGER consent_records_stamp_identity
  BEFORE INSERT ON public.consent_records
  FOR EACH ROW EXECUTE FUNCTION public.consent_records_stamp_identity();

DROP POLICY IF EXISTS "anyone may record their own consent" ON public.consent_records;
CREATE POLICY "anyone may record their own consent"
  ON public.consent_records FOR INSERT TO anon, authenticated
  WITH CHECK (
    created_by IS NOT DISTINCT FROM auth.uid()
    AND (auth.uid() IS NOT NULL OR coalesce(partner_reference, '') = '')
  );

-- 3) enquiries: staff-only reads, no write-back surface for visitors.
REVOKE ALL ON public.enquiries FROM anon;
REVOKE UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, INSERT ON public.enquiries FROM authenticated;
GRANT SELECT ON public.enquiries TO authenticated;
GRANT ALL ON public.enquiries TO service_role;

-- 4) partners: internal fields are not client-writable.
CREATE OR REPLACE FUNCTION public.partners_protect_internal_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_service_role() OR public.is_staff() THEN
    RETURN NEW;
  END IF;
  NEW.status := OLD.status;
  NEW.reference := OLD.reference;
  NEW.internal_score := OLD.internal_score;
  NEW.classification := OLD.classification;
  NEW.account_manager_id := OLD.account_manager_id;
  NEW.created_by := OLD.created_by;
  NEW.created_at := OLD.created_at;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.partners_protect_internal_fields() FROM PUBLIC;

DROP TRIGGER IF EXISTS partners_protect_internal_fields ON public.partners;
CREATE TRIGGER partners_protect_internal_fields
  BEFORE UPDATE ON public.partners
  FOR EACH ROW EXECUTE FUNCTION public.partners_protect_internal_fields();

-- 5) storage: partners may only delete documents while their file is editable.
DROP POLICY IF EXISTS "partner deletes own draft documents" ON storage.objects;
CREATE POLICY "partner deletes own draft documents"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'partner-documents'
    AND (
      public.is_staff()
      OR (
        (storage.foldername(name))[1] = (public.current_partner_id())::text
        AND public.current_partner_editable()
      )
    )
  );