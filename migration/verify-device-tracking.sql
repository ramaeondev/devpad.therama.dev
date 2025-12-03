-- Quick verification queries for Supabase SQL Editor
-- Copy and paste these one by one

-- 1. Check if table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'user_devices'
) as table_exists;

-- 2. Check table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_devices'
ORDER BY ordinal_position;

-- 3. Count devices
SELECT COUNT(*) as total_devices FROM user_devices;

-- 4. Check RLS policies
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'user_devices';

-- 5. Get your devices (replace with your user_id)
SELECT 
  id,
  fingerprint_id,
  device_name,
  device_type,
  browser_name,
  os_name,
  is_current,
  is_trusted,
  created_at
FROM user_devices
WHERE user_id = '475d9b83-3b30-406c-8220-b860c0c9a181'
ORDER BY created_at DESC;
