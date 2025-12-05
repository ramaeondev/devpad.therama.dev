-- Activity Logs & Notifications Migration
-- Date: 2025-12-05
-- Description: Tracks user activities and provides notifications for important events

-- ============================================================================
-- ACTIVITY LOGS TABLE
-- ============================================================================

-- Create activity_logs table
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Activity information
  action_type TEXT NOT NULL, -- 'create', 'edit', 'delete', 'upload', 'login', 'logout', etc.
  resource_type TEXT NOT NULL, -- 'note', 'folder', 'integration', 'auth', etc.
  resource_id UUID, -- ID of the affected resource (nullable for auth actions)
  resource_name TEXT, -- Name/title of the resource for display
  
  -- Device tracking
  device_fingerprint TEXT NOT NULL,
  device_info JSONB, -- Browser, OS, device type, etc.
  
  -- Additional context (non-sensitive data only)
  metadata JSONB,
  ip_address INET,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for activity_logs
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action_type ON activity_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_resource_type ON activity_logs(resource_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_device_fingerprint ON activity_logs(device_fingerprint);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_created ON activity_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_resource ON activity_logs(resource_type, resource_id);

-- Enable Row Level Security
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for activity_logs
DO $$ 
BEGIN
  -- Policy for viewing activity logs
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'activity_logs' 
      AND policyname = 'Users can view their own activity logs'
  ) THEN
    CREATE POLICY "Users can view their own activity logs"
      ON activity_logs FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  -- Policy for inserting activity logs
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'activity_logs' 
      AND policyname = 'Users can insert their own activity logs'
  ) THEN
    CREATE POLICY "Users can insert their own activity logs"
      ON activity_logs FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================================================
-- NOTIFICATIONS TABLE
-- ============================================================================

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_log_id UUID REFERENCES activity_logs(id) ON DELETE CASCADE,
  
  -- Notification content
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info', -- 'security', 'activity', 'info'
  
  -- Read status
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_activity_log_id ON notifications(activity_log_id);

-- Enable Row Level Security
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notifications
DO $$ 
BEGIN
  -- Policy for viewing notifications
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'notifications' 
      AND policyname = 'Users can view their own notifications'
  ) THEN
    CREATE POLICY "Users can view their own notifications"
      ON notifications FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  -- Policy for inserting notifications
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'notifications' 
      AND policyname = 'Users can insert their own notifications'
  ) THEN
    CREATE POLICY "Users can insert their own notifications"
      ON notifications FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

  -- Policy for updating notifications
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'notifications' 
      AND policyname = 'Users can update their own notifications'
  ) THEN
    CREATE POLICY "Users can update their own notifications"
      ON notifications FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;

  -- Policy for deleting notifications
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'notifications' 
      AND policyname = 'Users can delete their own notifications'
  ) THEN
    CREATE POLICY "Users can delete their own notifications"
      ON notifications FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Create trigger for notifications updated_at
DROP TRIGGER IF EXISTS update_notifications_updated_at ON notifications;
CREATE TRIGGER update_notifications_updated_at
  BEFORE UPDATE ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- NOTIFICATION CREATION FUNCTION
-- ============================================================================

-- Function to create notifications for important activities
CREATE OR REPLACE FUNCTION create_notification_for_activity()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Create trigger to auto-create notifications
DROP TRIGGER IF EXISTS create_notification_on_activity ON activity_logs;
CREATE TRIGGER create_notification_on_activity
  AFTER INSERT ON activity_logs
  FOR EACH ROW
  EXECUTE FUNCTION create_notification_for_activity();

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE activity_logs IS 'Tracks user activities with device fingerprinting';
COMMENT ON TABLE notifications IS 'User notifications for important activities';
COMMENT ON COLUMN activity_logs.action_type IS 'Type of action performed (create, edit, delete, upload, login, logout)';
COMMENT ON COLUMN activity_logs.resource_type IS 'Type of resource affected (note, folder, integration, auth)';
COMMENT ON COLUMN activity_logs.device_fingerprint IS 'Device fingerprint from FingerprintJS';
COMMENT ON COLUMN activity_logs.metadata IS 'Additional non-sensitive context data';
COMMENT ON COLUMN notifications.type IS 'Notification type (security, activity, info)';
COMMENT ON COLUMN notifications.is_read IS 'Whether the notification has been read';
