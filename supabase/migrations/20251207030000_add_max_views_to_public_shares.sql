-- Add max_views column to public_shares table for "Expire after N views" feature
ALTER TABLE public_shares ADD COLUMN IF NOT EXISTS max_views INTEGER;

COMMENT ON COLUMN public_shares.max_views IS 'Maximum number of views allowed before the share expires. Null means unlimited.';
