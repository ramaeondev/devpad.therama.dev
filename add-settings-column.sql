-- Add settings column to integrations table for storing selected files
-- This enables persistence of Google Drive file selections across sessions

ALTER TABLE "public"."integrations" 
ADD COLUMN IF NOT EXISTS "settings" jsonb DEFAULT '{}'::jsonb;

COMMENT ON COLUMN "public"."integrations"."settings" 
IS 'Stores integration-specific settings and state (e.g. selected files)';

-- Verify the column was added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'integrations' 
AND column_name = 'settings';
