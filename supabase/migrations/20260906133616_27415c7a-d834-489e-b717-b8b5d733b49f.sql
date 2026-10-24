DROP POLICY IF EXISTS "Markets are readable" ON public.markets;
CREATE POLICY "Staff read markets" ON public.markets FOR SELECT TO authenticated USING (public.is_staff());
REVOKE SELECT ON public.markets FROM anon;

DROP POLICY IF EXISTS "partner updates own documents" ON storage.objects;
CREATE POLICY "partner updates own documents" ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'partner-documents'
  AND (storage.foldername(name))[1] = (public.current_partner_id())::text
  AND public.current_partner_editable()
)
WITH CHECK (
  bucket_id = 'partner-documents'
  AND (storage.foldername(name))[1] = (public.current_partner_id())::text
  AND public.current_partner_editable()
  AND lower(storage.extension(name)) = ANY (ARRAY['pdf','jpg','jpeg','png','doc','docx','xls','xlsx','csv'])
);