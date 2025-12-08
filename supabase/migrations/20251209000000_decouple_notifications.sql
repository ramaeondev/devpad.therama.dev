-- Migration: Decouple notifications from activity logs
-- Description: Removes the automatic trigger that creates notifications when activity logs are inserted.
-- This resolves potential runtime errors (like 42883 text->>unknown) by decoupling the two systems.

-- 1. Drop the trigger on activity_logs table
DROP TRIGGER IF EXISTS "on_activity_log_created" ON "public"."activity_logs";

-- 2. Drop the function that the trigger used
DROP FUNCTION IF EXISTS "public"."create_notification_for_activity"();

-- 3. Ensure activity_log_id in notifications table is nullable (it is by default in schema, but good to ensure)
ALTER TABLE "public"."notifications" ALTER COLUMN "activity_log_id" DROP NOT NULL;
