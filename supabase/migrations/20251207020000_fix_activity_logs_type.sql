-- Fix device_info column type to be jsonb instead of text
-- This resolves the "operator does not exist: text ->> unknown" error in the trigger

DO $$
BEGIN
    -- Check if column is text (optional safety check, or just force alter)
    -- We'll just force the alter with a USING clause to handle conversion
    ALTER TABLE "public"."activity_logs" 
    ALTER COLUMN "device_info" TYPE jsonb 
    USING "device_info"::jsonb;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error altering column: %', SQLERRM;
END $$;

-- Drop and recreate the trigger function to ensure it uses the new column type correctly
-- (Postgres functions usually cache plan/types)
CREATE OR REPLACE FUNCTION "public"."create_notification_for_activity"() RETURNS "trigger"
    LANGUAGE "plpgsql"
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
  -- Extract device name from device_info
  -- Now that device_info is jsonb, ->> operator will work correctly
  device_name := COALESCE(
    NEW.device_info->>'device_name',
    NEW.device_info->>'browser_name' || ' on ' || NEW.device_info->>'os_name',
    'Unknown Device'
  );

  -- Check if this is a new or untrusted device for login events
  IF NEW.action_type = 'login' AND NEW.resource_type = 'auth' THEN
    -- Check if device exists and is trusted
    SELECT 
      CASE WHEN COUNT(*) = 0 THEN true ELSE false END,
      COALESCE(bool_or(is_trusted), false)
    INTO is_new_device, is_untrusted_device
    FROM user_devices
    WHERE user_id = NEW.user_id 
      AND fingerprint_id = NEW.device_fingerprint;
    
    is_untrusted_device := NOT is_untrusted_device;
  END IF;

  -- Determine if we should create a notification
  CASE 
    -- Login from new device
    WHEN NEW.action_type = 'login' AND NEW.resource_type = 'auth' AND is_new_device THEN
      should_notify := true;
      notification_type := 'security';
      notification_title := 'New device login';
      notification_message := 'You signed in from a new device: ' || device_name;
    
    -- Login from untrusted device
    WHEN NEW.action_type = 'login' AND NEW.resource_type = 'auth' AND is_untrusted_device AND NOT is_new_device THEN
      should_notify := true;
      notification_type := 'security';
      notification_title := 'Untrusted device login';
      notification_message := 'You signed in from an untrusted device: ' || device_name;
    
    -- Note deletion
    WHEN NEW.action_type = 'delete' AND NEW.resource_type = 'note' THEN
      should_notify := true;
      notification_type := 'activity';
      notification_title := 'Note deleted';
      notification_message := 'You deleted a note: ' || COALESCE(NEW.resource_name, 'Untitled');
    
    -- Folder deletion
    WHEN NEW.action_type = 'delete' AND NEW.resource_type = 'folder' THEN
      should_notify := true;
      notification_type := 'activity';
      notification_title := 'Folder deleted';
      notification_message := 'You deleted a folder: ' || COALESCE(NEW.resource_name, 'Untitled');
    
    ELSE
      should_notify := false;
  END CASE;

  -- Create notification if needed
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
