-- Allow authenticated users to INSERT (upsert) storage files for editable shares
-- This is needed when using upsert:true and the file doesn't exist yet

-- Drop existing INSERT policy and recreate with editable share support
DROP POLICY IF EXISTS "Allow users to upload their own note files" ON storage.objects;

CREATE POLICY "Allow users to upload their own note files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'notes' 
  AND (
    -- User can upload to their own folder
    (storage.foldername(name))[1] = auth.uid()::text
    OR
    -- OR user can upload/upsert files if they have editable share access
    EXISTS (
      SELECT 1 FROM public.public_shares ps
      WHERE ps.permission = 'editable'
      AND ps.note_id::text = (regexp_match(name, '([^/]+)\.md$'))[1]
      AND (storage.foldername(name))[1] = ps.user_id::text
    )
  )
);
