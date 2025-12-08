-- Disable trigger script
-- This will remove the trigger and function to allow us to test if the basic INSERT works.

DROP TRIGGER IF EXISTS "on_activity_log_created" ON "public"."activity_logs";
DROP FUNCTION IF EXISTS "public"."create_notification_for_activity"();
