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
  -- Force use jsonb operators
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
