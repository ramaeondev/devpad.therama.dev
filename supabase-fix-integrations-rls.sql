-- =============================================
-- Fix RLS Policy for Integrations Table
-- =============================================
-- This script fixes the UPDATE policy that was missing the WITH CHECK clause
-- Run this in your Supabase SQL Editor
-- =============================================

-- Step 1: Drop the existing UPDATE policy
DROP POLICY IF EXISTS "Users can update their own integrations" ON integrations;

-- Step 2: Recreate the UPDATE policy with both USING and WITH CHECK clauses
-- This is required for UPDATE operations in PostgreSQL RLS
CREATE POLICY "Users can update their own integrations"
  ON integrations
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =============================================
-- Verification Queries (Optional - run to verify)
-- =============================================

-- Check all policies on the integrations table
-- SELECT 
--   policyname,
--   cmd,
--   qual as using_clause,
--   with_check as with_check_clause
-- FROM pg_policies
-- WHERE tablename = 'integrations'
-- ORDER BY policyname;

-- Test the policy (replace 'YOUR_USER_ID' with actual user ID)
-- This should work if you're authenticated:
-- INSERT INTO integrations (user_id, provider, access_token, expires_at, email)
-- VALUES (auth.uid(), 'onedrive', 'test-token', EXTRACT(EPOCH FROM NOW() + INTERVAL '1 hour')::bigint * 1000, 'test@example.com')
-- ON CONFLICT (user_id, provider) 
-- DO UPDATE SET 
--   access_token = EXCLUDED.access_token,
--   expires_at = EXCLUDED.expires_at,
--   updated_at = NOW()
-- RETURNING *;
