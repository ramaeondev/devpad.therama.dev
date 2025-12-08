-- Migration: Enable Realtime for notifications and add notification flag to activity_logs

-- 1. Enable Realtime for notifications table (if not already enabled)
-- Check if table is already in publication, if not add it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND schemaname = 'public'
    AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE "public"."notifications";
  END IF;
END
$$;

-- 2. Add requires_notification column to activity_logs
-- Default to false as requested ("Keep all false except...")
ALTER TABLE "public"."activity_logs" 
ADD COLUMN IF NOT EXISTS "requires_notification" BOOLEAN DEFAULT false;

-- 3. Comment explaining the usage
COMMENT ON COLUMN "public"."activity_logs"."requires_notification" IS 'Flag to indicate if this activity should trigger a notification (managed by application logic)';
