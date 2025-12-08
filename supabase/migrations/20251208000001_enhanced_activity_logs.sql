-- Migration: Enhanced Activity Logs Architecture
-- Description: Introduces ENUMs, robust table structure, and analytics columns.

-- 1. Clean up old artifacts (Robust Drop)
DROP TRIGGER IF EXISTS "on_activity_log_created" ON "public"."activity_logs";
DROP FUNCTION IF EXISTS "public"."create_notification_for_activity"();
-- Drop FK from notifications to allow table drop
ALTER TABLE IF EXISTS "public"."notifications" DROP CONSTRAINT IF EXISTS "notifications_activity_log_id_fkey";
DROP TABLE IF EXISTS "public"."activity_logs";

-- 2. Define ENUMs
-- Drop types if they exist to ensure clean state (or use CREATE TYPE IF NOT EXISTS in newer PG, but DROP is safer for re-runs)
DROP TYPE IF EXISTS "public"."activity_action_type";
CREATE TYPE "public"."activity_action_type" AS ENUM (
    'create', 'update', 'delete', 
    'login', 'logout', 
    'share_create', 'share_update', 'share_delete', 
    'view', 'download', 
    'archive', 'restore'
);

DROP TYPE IF EXISTS "public"."activity_resource_type";
CREATE TYPE "public"."activity_resource_type" AS ENUM (
    'note', 'folder', 'tag', 
    'user', 'profile', 'device', 
    'integration', 'public_share', 'auth'
);

DROP TYPE IF EXISTS "public"."activity_category";
CREATE TYPE "public"."activity_category" AS ENUM (
    'access', 'content', 'system', 'security'
);

-- 3. Create Enhanced Table
CREATE TABLE "public"."activity_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid", -- Nullable for anonymous views
    "resource_owner_id" "uuid", -- NEW: Owner of the resource (for sharing context)
    "action_type" "public"."activity_action_type" NOT NULL,
    "resource_type" "public"."activity_resource_type" NOT NULL,
    "resource_id" "uuid",
    "resource_name" "text",
    "category" "public"."activity_category" DEFAULT 'system'::"public"."activity_category" NOT NULL,
    "device_fingerprint" "text",
    "device_info" "jsonb",
    "ip_address" "inet",
    "session_id" "uuid", -- NEW: For grouping session actions
    "is_anonymous" boolean DEFAULT false,
    "metadata" "jsonb" DEFAULT '{}'::jsonb,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    
    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- Add Foreign Key for user_id (if not anonymous)
ALTER TABLE "public"."activity_logs"
    ADD CONSTRAINT "activity_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;

-- 4. Enable RLS
ALTER TABLE "public"."activity_logs" ENABLE ROW LEVEL SECURITY;

-- 5. Indexes
CREATE INDEX "idx_activity_logs_action" ON "public"."activity_logs" ("action_type");
CREATE INDEX "idx_activity_logs_resource" ON "public"."activity_logs" ("resource_type", "resource_id");
CREATE INDEX "idx_activity_logs_user" ON "public"."activity_logs" ("user_id");
CREATE INDEX "idx_activity_logs_owner" ON "public"."activity_logs" ("resource_owner_id");
CREATE INDEX "idx_activity_logs_created_at" ON "public"."activity_logs" ("created_at" DESC);
CREATE INDEX "idx_activity_logs_category" ON "public"."activity_logs" ("category");
CREATE INDEX "idx_activity_logs_session" ON "public"."activity_logs" ("session_id");

-- 6. RLS Policies
-- Policy: Users can view logs where they are the actor OR the resource owner
CREATE POLICY "Users can view relevant activity" ON "public"."activity_logs"
    FOR SELECT
    USING (
        ("auth"."uid"() = "user_id") OR 
        ("auth"."uid"() = "resource_owner_id")
    );

-- Policy: Users can insert their own logs (application logic handles anonymous insertions via service_role)
CREATE POLICY "Users can insert their own activity" ON "public"."activity_logs"
    FOR INSERT
    WITH CHECK (
        ("auth"."uid"() = "user_id") OR 
        ("is_anonymous" = true) -- Allow anon if flagged
    );

-- 7. Grants
GRANT ALL ON TABLE "public"."activity_logs" TO "service_role";
GRANT ALL ON TABLE "public"."activity_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."activity_logs" TO "anon";

-- 8. Recreate Trigger Function (Updated for Enum types)
CREATE OR REPLACE FUNCTION "public"."create_notification_for_activity"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SECURITY DEFINER SET search_path = public
    AS $$
DECLARE
  notification_title TEXT;
  notification_message TEXT;
  notification_type TEXT;
  should_notify BOOLEAN := false;
  device_name TEXT;
  is_new_device BOOLEAN := false;
  is_untrusted_device BOOLEAN := true;
BEGIN
  -- Handle device name extraction safely
  device_name := COALESCE(
    (NEW.device_info)::jsonb->>'device_name',
    (NEW.device_info)::jsonb->>'browser_name' || ' on ' || (NEW.device_info)::jsonb->>'os_name',
    'Unknown Device'
  );

  -- 1. Security Alerts (Login)
  IF NEW.action_type = 'login' AND NEW.resource_type = 'auth' THEN
    -- Check for previous devices
    SELECT 
      CASE WHEN COUNT(*) = 0 THEN true ELSE false END,
      COALESCE(bool_or(is_trusted), false)
    INTO is_new_device, is_untrusted_device
    FROM user_devices
    WHERE user_id = NEW.user_id 
      AND fingerprint_id = NEW.device_fingerprint;
    
    is_untrusted_device := NOT is_untrusted_device; -- Flip boolean for clarity

    IF is_new_device THEN
        should_notify := true;
        notification_type := 'security';
        notification_title := 'New device login';
        notification_message := 'You signed in from a new device: ' || device_name;
    ELSIF is_untrusted_device THEN
        should_notify := true;
        notification_type := 'security';
        notification_title := 'Untrusted device login';
        notification_message := 'You signed in from an untrusted device: ' || device_name;
    END IF;
  END IF;

  -- 2. Content Deletion Alerts
  IF NEW.action_type = 'delete' THEN
    IF NEW.resource_type = 'note' THEN
        should_notify := true;
        notification_type := 'activity';
        notification_title := 'Note deleted';
        notification_message := 'You deleted a note: ' || COALESCE(NEW.resource_name, 'Untitled');
    ELSIF NEW.resource_type = 'folder' THEN
        should_notify := true;
        notification_type := 'activity';
        notification_title := 'Folder deleted';
        notification_message := 'You deleted a folder: ' || COALESCE(NEW.resource_name, 'Untitled');
    END IF;
  END IF;

  -- Insert Notification if needed
  IF should_notify AND NEW.user_id IS NOT NULL THEN
    INSERT INTO notifications (
      user_id,
      activity_log_id, -- Note: FK constraint was dropped, but column exists
      title,
      message,
      type
    ) VALUES (
      NEW.user_id,
      NEW.id,
      notification_title,
      notification_message,
      notification_type
    );
  END IF;

  RETURN NEW;
END;
$$;

ALTER FUNCTION "public"."create_notification_for_activity"() OWNER TO "postgres";
GRANT ALL ON FUNCTION "public"."create_notification_for_activity"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_notification_for_activity"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_notification_for_activity"() TO "service_role";

-- 9. Trigger
CREATE TRIGGER "on_activity_log_created" AFTER INSERT ON "public"."activity_logs" FOR EACH ROW EXECUTE FUNCTION "public"."create_notification_for_activity"();
