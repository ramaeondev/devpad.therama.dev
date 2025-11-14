-- =============================================
-- Supabase Storage Setup for Avatars
-- =============================================
-- Run this script in Supabase SQL Editor to:
-- 1. Create 'avatars' storage bucket
-- 2. Set up RLS policies for secure access
-- =============================================

-- Create the avatars bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- Storage Policies for 'avatars' bucket
-- =============================================

-- Policy 1: Allow users to upload their own avatar
-- Users can INSERT files with path format: avatars/{user_id}.*
CREATE POLICY "Users can upload own avatar"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy 2: Allow users to update their own avatar
-- Users can UPDATE files with path format: avatars/{user_id}.*
CREATE POLICY "Users can update own avatar"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy 3: Allow users to delete their own avatar
-- Users can DELETE files with path format: avatars/{user_id}.*
CREATE POLICY "Users can delete own avatar"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy 4: Public read access for all avatars
-- Anyone can view/download avatars (public bucket)
CREATE POLICY "Public avatar access"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- =============================================
-- Verification Queries (Optional)
-- =============================================
-- Run these to verify the setup:

-- Check bucket creation
-- SELECT * FROM storage.buckets WHERE id = 'avatars';

-- Check policies
-- SELECT * FROM pg_policies WHERE tablename = 'objects' AND policyname LIKE '%avatar%';
