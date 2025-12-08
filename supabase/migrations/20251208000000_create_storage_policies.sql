-- Storage bucket policies for notes
-- These policies control who can upload, read, update, and delete files in the 'notes' bucket

-- Policy 1: Allow authenticated users to INSERT (upload) their own files
-- Users can only upload to their own folder: userId/noteId.md
DROP POLICY IF EXISTS "Allow users to upload their own note files" ON storage.objects;
CREATE POLICY "Allow users to upload their own note files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'notes' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 2: Allow authenticated users to UPDATE (overwrite) their own files
DROP POLICY IF EXISTS "Allow users to update their own note files" ON storage.objects;
CREATE POLICY "Allow users to update their own note files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'notes' 
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'notes' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 3: Allow authenticated users to DELETE their own files
DROP POLICY IF EXISTS "Allow users to delete their own note files" ON storage.objects;
CREATE POLICY "Allow users to delete their own note files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'notes' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 4: Allow authenticated users to SELECT (read) their own files
DROP POLICY IF EXISTS "Allow users to read their own note files" ON storage.objects;
CREATE POLICY "Allow users to read their own note files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'notes' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 5: Allow public (anonymous) read access to shared note files
-- This is the policy we created earlier for share links
-- Recreate it here with DROP IF EXISTS to ensure it's properly set up
DROP POLICY IF EXISTS "Allow read access to shared note files" ON storage.objects;

CREATE POLICY "Allow read access to shared note files"
ON storage.objects FOR SELECT
TO public
USING (
  bucket_id = 'notes' 
  AND (
    -- Owner can always access their own files
    (storage.foldername(name))[1] = auth.uid()::text
    OR
    -- Anyone can access if the note is shared
    -- Extract noteId from path: userId/noteId.md -> noteId
    EXISTS (
      SELECT 1
      FROM public.public_shares ps
      JOIN public.notes n ON n.id = ps.note_id
      WHERE n.id::text = regexp_replace(name, '^.+/([^/]+)\.md$', '\1')
        AND (ps.expires_at IS NULL OR ps.expires_at > now())
        AND (ps.max_views IS NULL OR ps.view_count < ps.max_views)
    )
  )
);
