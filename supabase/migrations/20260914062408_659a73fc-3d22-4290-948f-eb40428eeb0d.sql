-- 1) consent_records: anonymous inserts must prove contact ownership of the referenced record
CREATE OR REPLACE FUNCTION public.consent_reference_contact_matches(_ref text, _contact text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  r text := btrim(coalesce(_ref, ''));
  c text := btrim(coalesce(_contact, ''));
  c_digits text := regexp_replace(coalesce(_contact, ''), '\D', '', 'g');
  ok boolean := false;
BEGIN
  IF r = '' OR c = '' THEN RETURN false; END IF;

  IF length(c_digits) >= 9 AND left(c_digits, 1) = '0' THEN
    c_digits := substr(c_digits, 2);
  ELSIF length(c_digits) >= 11 AND left(c_digits, 2) = '41' THEN
    c_digits := substr(c_digits, 3);
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM (
      SELECT l.customer_email AS email, l.customer_phone AS phone, l.created_at
        FROM public.leads l WHERE l.reference = r
      UNION ALL
      SELECT q.customer_email, q.customer_phone, q.created_at
        FROM public.quotes q WHERE q.reference = r
    ) s
    WHERE s.created_at > now() - interval '30 days'
      AND (
        (position('@' in c) > 0 AND lower(btrim(coalesce(s.email, ''))) = lower(c))
        OR (
          length(c_digits) >= 6
          AND length(regexp_replace(coalesce(s.phone, ''), '\D', '', 'g')) >= 6
          AND right(regexp_replace(coalesce(s.phone, ''), '\D', '', 'g'), length(c_digits)) = c_digits
        )
      )
  ) INTO ok;

  RETURN coalesce(ok, false);
END;
$$;

REVOKE ALL ON FUNCTION public.consent_reference_contact_matches(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consent_reference_contact_matches(text, text) TO anon, authenticated, service_role;

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
      AND public.consent_reference_contact_matches(booking_reference, subject_ref)
    )
  )
);

-- 2) notification_settings: secrets readable/writable by management admins only
DROP POLICY IF EXISTS "notification_settings_staff_read" ON public.notification_settings;
DROP POLICY IF EXISTS "notification_settings_staff_insert" ON public.notification_settings;
DROP POLICY IF EXISTS "notification_settings_staff_write" ON public.notification_settings;

CREATE POLICY "notification_settings_admin_read" ON public.notification_settings
  FOR SELECT TO authenticated USING (public.is_zw_admin());
CREATE POLICY "notification_settings_admin_insert" ON public.notification_settings
  FOR INSERT TO authenticated WITH CHECK (public.is_zw_admin());
CREATE POLICY "notification_settings_admin_write" ON public.notification_settings
  FOR UPDATE TO authenticated USING (public.is_zw_admin()) WITH CHECK (public.is_zw_admin());

REVOKE ALL ON public.notification_settings FROM anon;
REVOKE DELETE, TRUNCATE ON public.notification_settings FROM authenticated;
GRANT SELECT, INSERT, UPDATE ON public.notification_settings TO authenticated;
GRANT ALL ON public.notification_settings TO service_role;