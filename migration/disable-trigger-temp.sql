-- Temporary fix: Disable the problematic trigger to allow activity logging
-- Run this in Supabase SQL Editor

-- Drop the trigger (this will allow inserts to work)
DROP TRIGGER IF EXISTS create_notification_on_activity ON activity_logs;

-- Drop the function
DROP FUNCTION IF EXISTS create_notification_for_activity();

-- Now activity logging will work without automatic notifications
-- You can manually create notifications or we'll fix the trigger function later
