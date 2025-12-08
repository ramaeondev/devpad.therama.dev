-- DANGEROUS: This script will delete the activity_logs table and all its data.
-- Run this only if you are sure you want to reset the table.

-- 1. Drop the table and dependencies (including triggers and FKs from other tables)
DROP TABLE IF EXISTS "public"."activity_logs" CASCADE;

-- 2. Drop the function to ensure clean slate
DROP FUNCTION IF EXISTS "public"."create_notification_for_activity"();

-- 3. Recreate the table
CREATE TABLE "public"."activity_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "action_type" "text" NOT NULL,
    "resource_type" "text" NOT NULL,
    "resource_id" "uuid",
    "resource_name" "text",
    "device_fingerprint" "text" NOT NULL,
    "device_info" "jsonb",
    "metadata" "jsonb",
    "ip_address" "inet",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    PRIMARY KEY ("id"),
    CONSTRAINT "activity_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE
);

ALTER TABLE "public"."activity_logs" OWNER TO "postgres";

COMMENT ON TABLE "public"."activity_logs" IS 'Tracks user activities with device fingerprinting';
COMMENT ON COLUMN "public"."activity_logs"."action_type" IS 'Type of action performed (create, edit, delete, upload, login, logout)';
COMMENT ON COLUMN "public"."activity_logs"."resource_type" IS 'Type of resource affected (note, folder, integration, auth)';
COMMENT ON COLUMN "public"."activity_logs"."device_fingerprint" IS 'Device fingerprint from FingerprintJS';
COMMENT ON COLUMN "public"."activity_logs"."metadata" IS 'Additional non-sensitive context data';

-- 4. Recreate Indexes
CREATE INDEX "idx_activity_logs_action_type" ON "public"."activity_logs" USING "btree" ("action_type");
CREATE INDEX "idx_activity_logs_created_at" ON "public"."activity_logs" USING "btree" ("created_at" DESC);
CREATE INDEX "idx_activity_logs_device_fingerprint" ON "public"."activity_logs" USING "btree" ("device_fingerprint");
CREATE INDEX "idx_activity_logs_resource" ON "public"."activity_logs" USING "btree" ("resource_type", "resource_id");
CREATE INDEX "idx_activity_logs_resource_type" ON "public"."activity_logs" USING "btree" ("resource_type");
CREATE INDEX "idx_activity_logs_user_created" ON "public"."activity_logs" USING "btree" ("user_id", "created_at" DESC);
CREATE INDEX "idx_activity_logs_user_id" ON "public"."activity_logs" USING "btree" ("user_id");

-- 5. Re-enable RLS and Policies
ALTER TABLE "public"."activity_logs" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own activity logs" ON "public"."activity_logs" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));
CREATE POLICY "Users can view their own activity logs" ON "public"."activity_logs" FOR SELECT USING (("auth"."uid"() = "user_id"));

-- 6. Grants
GRANT ALL ON TABLE "public"."activity_logs" TO "anon";
GRANT ALL ON TABLE "public"."activity_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."activity_logs" TO "service_role";

-- 7. FK from notifications is removed by CASCADE above.
-- We are NOT re-adding it to decouple the tables as requested.
-- If you want to restore it later, you can add it manually.

-- 8. Recreate the fixed function
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
  -- Force use jsonb operators with explicit casting
  device_name := COALESCE(
    (NEW.device_info)::jsonb->>'device_name',
    (NEW.device_info)::jsonb->>'browser_name' || ' on ' || (NEW.device_info)::jsonb->>'os_name',
    'Unknown Device'
  );

  IF NEW.action_type = 'login' AND NEW.resource_type = 'auth' THEN
    SELECT 
      CASE WHEN COUNT(*) = 0 THEN true ELSE false END,
      COALESCE(bool_or(is_trusted), false)
    INTO is_new_device, is_untrusted_device
    FROM user_devices
    WHERE user_id = NEW.user_id 
      AND fingerprint_id = NEW.device_fingerprint;
    
    is_untrusted_device := NOT is_untrusted_device;
  END IF;

  CASE 
    WHEN NEW.action_type = 'login' AND NEW.resource_type = 'auth' AND is_new_device THEN
      should_notify := true;
      notification_type := 'security';
      notification_title := 'New device login';
      notification_message := 'You signed in from a new device: ' || device_name;
    
    WHEN NEW.action_type = 'login' AND NEW.resource_type = 'auth' AND is_untrusted_device AND NOT is_new_device THEN
      should_notify := true;
      notification_type := 'security';
      notification_title := 'Untrusted device login';
      notification_message := 'You signed in from an untrusted device: ' || device_name;
    
    WHEN NEW.action_type = 'delete' AND NEW.resource_type = 'note' THEN
      should_notify := true;
      notification_type := 'activity';
      notification_title := 'Note deleted';
      notification_message := 'You deleted a note: ' || COALESCE(NEW.resource_name, 'Untitled');
    
    WHEN NEW.action_type = 'delete' AND NEW.resource_type = 'folder' THEN
      should_notify := true;
      notification_type := 'activity';
      notification_title := 'Folder deleted';
      notification_message := 'You deleted a folder: ' || COALESCE(NEW.resource_name, 'Untitled');
    
    ELSE
      should_notify := false;
  END CASE;

  IF should_notify THEN
    INSERT INTO notifications (
      user_id,
      activity_log_id,
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

-- 9. Recreate the trigger
CREATE TRIGGER "on_activity_log_created" AFTER INSERT ON "public"."activity_logs" FOR EACH ROW EXECUTE FUNCTION "public"."create_notification_for_activity"();
