-- Verification Script for Google Drive Persistence Feature
-- Run this in Supabase SQL Editor to check if everything is set up correctly

-- 1. Check if settings column exists
SELECT 
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public'
  AND table_name = 'integrations' 
  AND column_name = 'settings';

-- Expected result: One row showing:
-- column_name: settings
-- data_type: jsonb
-- column_default: '{}'::jsonb
-- is_nullable: YES

-- 2. Check current integrations (if any)
SELECT 
    id,
    user_id,
    provider,
    email,
    settings,
    created_at,
    updated_at
FROM public.integrations
WHERE provider = 'google_drive'
ORDER BY updated_at DESC
LIMIT 5;

-- Expected result: Shows your Google Drive integrations
-- If settings column shows NULL or {}, that's normal if you haven't picked files yet

-- 3. Check if settings column can store data (test write)
-- This will only work if you have a Google Drive integration
-- Replace 'YOUR_USER_ID' with your actual user_id from the query above
/*
UPDATE public.integrations
SET settings = '{"test": "verification", "selected_files": []}'::jsonb
WHERE provider = 'google_drive'
  AND user_id = 'YOUR_USER_ID';

-- Then verify it was saved:
SELECT settings 
FROM public.integrations
WHERE provider = 'google_drive'
  AND user_id = 'YOUR_USER_ID';
*/

-- 4. Summary check - count integrations by provider
SELECT 
    provider,
    COUNT(*) as count,
    COUNT(settings) as has_settings_count
FROM public.integrations
GROUP BY provider;
