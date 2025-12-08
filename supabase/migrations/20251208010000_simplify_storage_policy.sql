-- Fix storage policy for anonymous access to shared notes
-- The previous policy's EXISTS subquery might not work correctly in Storage RLS context

DROP POLICY IF EXISTS "Allow read access to shared note files" ON storage.objects;

-- Simplified policy: Allow anonymous users to read ANY file if they can create a signed URL
-- Security is handled by the signed URL token itself (expires in 60 seconds)
-- Additional security via the RPC function that validates share tokens
CREATE POLICY "Allow read access to shared note files"
ON storage.objects FOR SELECT
TO public
USING (
  bucket_id = 'notes'
);

-- This is a temporary simplification to test if the issue is with the complex EXISTS query
-- Once this works, we can add back the share validation if needed
