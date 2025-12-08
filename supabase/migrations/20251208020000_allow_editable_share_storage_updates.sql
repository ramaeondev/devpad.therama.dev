-- Allow authenticated users to update storage files for editable shares
-- This enables collaborative editing where User B can edit User A's shared note

-- Drop existing UPDATE policy and recreate with editable share support
DROP POLICY IF EXISTS "Allow users to update their own note files" ON storage.objects;

CREATE POLICY "Allow users to update their own note files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'notes' 
  AND (
    -- User can update their own files
    (storage.foldername(name))[1] = auth.uid()::text
    OR
    -- OR user can update files if they have editable share access
    EXISTS (
      SELECT 1 FROM public.public_shares ps
      WHERE ps.permission = 'editable'
      AND ps.note_id::text = (regexp_match(name, '([^/]+)\.md$'))[1]
      AND (storage.foldername(name))[1] = ps.user_id::text
    )
  )
)
WITH CHECK (
  bucket_id = 'notes' 
  AND (
    -- User can update their own files
    (storage.foldername(name))[1] = auth.uid()::text
    OR
    -- OR user can update files if they have editable share access
    EXISTS (
      SELECT 1 FROM public.public_shares ps
      WHERE ps.permission = 'editable'
      AND ps.note_id::text = (regexp_match(name, '([^/]+)\.md$'))[1]
      AND (storage.foldername(name))[1] = ps.user_id::text
    )
  )
);

-- Also update the SELECT policy to allow authenticated users to read shared notes
DROP POLICY IF EXISTS "Allow users to read their own note files" ON storage.objects;

CREATE POLICY "Allow users to read their own note files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'notes' 
  AND (
    -- User can read their own files
    (storage.foldername(name))[1] = auth.uid()::text
    OR
    -- OR user can read files if they have share access (any permission)
    EXISTS (
      SELECT 1 FROM public.public_shares ps
      WHERE ps.note_id::text = (regexp_match(name, '([^/]+)\.md$'))[1]
      AND (storage.foldername(name))[1] = ps.user_id::text
    )
  )
);
