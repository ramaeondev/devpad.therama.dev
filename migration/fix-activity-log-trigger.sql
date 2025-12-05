-- Corrected fix for activity log trigger function
-- Run this in Supabase SQL Editor

-- Drop and recreate with proper JSONB type handling
CREATE OR REPLACE FUNCTION create_notification_for_activity()
RETURNS TRIGGER AS $$
DECLARE
  notification_title TEXT;
  notification_message TEXT;
  notification_type TEXT;
  should_notify BOOLEAN := false;
  device_name TEXT;
  browser_name TEXT;
  os_name TEXT;
BEGIN
  -- Extract device name with proper type casting
  browser_name := COALESCE(NEW.device_info->>'browser_name', '');
  os_name := COALESCE(NEW.device_info->>'os_name', '');
  
  device_name := COALESCE(
    NEW.device_info->>'device_name',
    CASE 
      WHEN browser_name != '' AND os_name != '' THEN browser_name || ' on ' || os_name
      WHEN browser_name != '' THEN browser_name
      WHEN os_name != '' THEN os_name
      ELSE 'Unknown Device'
    END
  );

  -- Determine if we should create a notification
  CASE 
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
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail the insert
  RAISE WARNING 'Notification creation failed: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS create_notification_on_activity ON activity_logs;
CREATE TRIGGER create_notification_on_activity
  AFTER INSERT ON activity_logs
  FOR EACH ROW
  EXECUTE FUNCTION create_notification_for_activity();
