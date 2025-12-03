-- Device Fingerprint & Session Tracking Migration
-- Date: 2025-11-28
-- Description: Tracks user devices and sessions using FingerprintJS

-- Create user_devices table
CREATE TABLE IF NOT EXISTS user_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Fingerprint information
  fingerprint_id TEXT NOT NULL,
  visitor_id TEXT, -- Optional: FingerprintJS Pro visitor ID
  
  -- Device information
  device_name TEXT, -- User-friendly name (e.g., "My MacBook Pro")
  device_type TEXT, -- mobile, tablet, desktop
  browser_name TEXT,
  browser_version TEXT,
  os_name TEXT,
  os_version TEXT,
  
  -- Location information (optional)
  ip_address INET,
  country TEXT,
  city TEXT,
  
  -- Session tracking
  first_seen_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  last_login_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  -- Trust and security
  is_trusted BOOLEAN DEFAULT false,
  is_current BOOLEAN DEFAULT false, -- Marks the current active device
  
  -- Metadata
  user_agent TEXT,
  additional_data JSONB, -- For storing extra fingerprint data
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  -- Unique constraint: one fingerprint per user
  UNIQUE(user_id, fingerprint_id)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_user_devices_user_id ON user_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_user_devices_fingerprint_id ON user_devices(fingerprint_id);
CREATE INDEX IF NOT EXISTS idx_user_devices_user_fingerprint ON user_devices(user_id, fingerprint_id);
CREATE INDEX IF NOT EXISTS idx_user_devices_last_seen ON user_devices(last_seen_at);
CREATE INDEX IF NOT EXISTS idx_user_devices_is_current ON user_devices(user_id, is_current);

-- Enable Row Level Security
ALTER TABLE user_devices ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_devices
DO $$ 
BEGIN
  -- Policy for viewing devices
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'user_devices' 
      AND policyname = 'Users can view their own devices'
  ) THEN
    CREATE POLICY "Users can view their own devices"
      ON user_devices FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  -- Policy for inserting devices
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'user_devices' 
      AND policyname = 'Users can insert their own devices'
  ) THEN
    CREATE POLICY "Users can insert their own devices"
      ON user_devices FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

  -- Policy for updating devices
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'user_devices' 
      AND policyname = 'Users can update their own devices'
  ) THEN
    CREATE POLICY "Users can update their own devices"
      ON user_devices FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;

  -- Policy for deleting devices
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'user_devices' 
      AND policyname = 'Users can delete their own devices'
  ) THEN
    CREATE POLICY "Users can delete their own devices"
      ON user_devices FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_user_devices_updated_at ON user_devices;
CREATE TRIGGER update_user_devices_updated_at
  BEFORE UPDATE ON user_devices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically update last_seen_at when updating device
CREATE OR REPLACE FUNCTION update_device_last_seen()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_seen_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for last_seen_at
DROP TRIGGER IF EXISTS update_user_devices_last_seen ON user_devices;
CREATE TRIGGER update_user_devices_last_seen
  BEFORE UPDATE ON user_devices
  FOR EACH ROW
  EXECUTE FUNCTION update_device_last_seen();

-- Function to ensure only one device is marked as current per user
CREATE OR REPLACE FUNCTION ensure_single_current_device()
RETURNS TRIGGER AS $$
BEGIN
  -- If marking this device as current, unmark all others
  IF NEW.is_current = true THEN
    UPDATE user_devices
    SET is_current = false
    WHERE user_id = NEW.user_id
      AND id != NEW.id
      AND is_current = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for current device management
DROP TRIGGER IF EXISTS ensure_single_current_device_trigger ON user_devices;
CREATE TRIGGER ensure_single_current_device_trigger
  BEFORE INSERT OR UPDATE ON user_devices
  FOR EACH ROW
  WHEN (NEW.is_current = true)
  EXECUTE FUNCTION ensure_single_current_device();

-- Comments for documentation
COMMENT ON TABLE user_devices IS 'Tracks user devices and sessions using fingerprinting';
COMMENT ON COLUMN user_devices.fingerprint_id IS 'Unique browser fingerprint from FingerprintJS';
COMMENT ON COLUMN user_devices.visitor_id IS 'FingerprintJS Pro visitor ID (optional, for Pro users)';
COMMENT ON COLUMN user_devices.is_trusted IS 'Whether user has marked this device as trusted';
COMMENT ON COLUMN user_devices.is_current IS 'Whether this is the currently active device';
COMMENT ON COLUMN user_devices.device_name IS 'User-friendly device name';
