-- Create integrations table for storing cloud storage connections
CREATE TABLE IF NOT EXISTS integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('google_drive', 'onedrive', 'dropbox')),
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at BIGINT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, provider)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_integrations_user_provider ON integrations(user_id, provider);

-- Enable Row Level Security
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Users can only read their own integrations
CREATE POLICY "Users can view their own integrations"
  ON integrations
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only insert their own integrations
CREATE POLICY "Users can insert their own integrations"
  ON integrations
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can only update their own integrations
CREATE POLICY "Users can update their own integrations"
  ON integrations
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can only delete their own integrations
CREATE POLICY "Users can delete their own integrations"
  ON integrations
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_integrations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER trigger_update_integrations_updated_at
  BEFORE UPDATE ON integrations
  FOR EACH ROW
  EXECUTE FUNCTION update_integrations_updated_at();


ALTER TABLE folders ADD CONSTRAINT unique_user_root UNIQUE (user_id, is_root);







-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own integrations" ON integrations;
DROP POLICY IF EXISTS "Users can insert their own integrations" ON integrations;
DROP POLICY IF EXISTS "Users can update their own integrations" ON integrations;
DROP POLICY IF EXISTS "Users can delete their own integrations" ON integrations;

-- Recreate with correct role
CREATE POLICY "Users can view their own integrations"
ON integrations
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own integrations"
ON integrations
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own integrations"
ON integrations
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own integrations"
ON integrations
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);