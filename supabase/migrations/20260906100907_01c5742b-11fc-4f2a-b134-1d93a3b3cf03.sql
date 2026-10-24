-- Harden the anonymous intake upload policy: enforce extension allow-list and size cap server-side.
DROP POLICY IF EXISTS "intake_uploads_insert" ON storage.objects;

CREATE POLICY "intake_uploads_insert" ON storage.objects
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    bucket_id = 'lead-attachments'
    AND (storage.foldername(name))[1] = 'intake'
    -- file type allow-list (matches the browser wizard: images, videos, PDFs)
    AND lower(substring(name from '\.([^.]+)$')) = ANY (ARRAY[
      'jpg','jpeg','png','webp','heic','heif','gif','avif',
      'mp4','mov','m4v','webm','avi','mkv',
      'pdf'
    ])
    -- 25 MB cap, enforced server-side via upload metadata
    AND COALESCE((metadata->>'size')::bigint, (metadata->>'contentLength')::bigint, 0) <= 26214400
  );