-- Add email column to user_profiles for searchability (if not exists)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'email'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN email TEXT;
  END IF;
END $$;

-- Create index on email (if not exists)
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);

-- Sync existing emails from auth.users (only if NULL)
UPDATE user_profiles up
SET email = au.email
FROM auth.users au
WHERE up.user_id = au.id
AND up.email IS NULL;

-- Create missing user_profiles for orphaned auth.users
INSERT INTO user_profiles (user_id, email, created_at, updated_at)
SELECT au.id, au.email, au.created_at, now()
FROM auth.users au
LEFT JOIN user_profiles up ON au.id = up.user_id
WHERE up.id IS NULL
ON CONFLICT (user_id) DO UPDATE
SET email = EXCLUDED.email;

-- Create or replace function to sync email
CREATE OR REPLACE FUNCTION public.sync_email_to_user_profiles()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.user_profiles
  SET email = NEW.email, updated_at = now()
  WHERE user_id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists (for idempotency)
DROP TRIGGER IF EXISTS sync_auth_email_trigger ON auth.users;

-- Create trigger on auth.users update
CREATE TRIGGER sync_auth_email_trigger
AFTER UPDATE ON auth.users
FOR EACH ROW
WHEN (OLD.email IS DISTINCT FROM NEW.email)
EXECUTE FUNCTION public.sync_email_to_user_profiles();

-- Check existing RLS policies and ensure email is readable for all authenticated users
DO $$ BEGIN
  -- Enable RLS if not already enabled
  ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
  
  -- Drop conflicting policies if they exist
  DROP POLICY IF EXISTS "users_select_all" ON user_profiles;
  
  -- Create SELECT policy for public role (REST API) - view all profiles
  CREATE POLICY "public_select_all_profiles"
    ON user_profiles
    FOR SELECT
    TO public
    USING (true);
    
  -- Create SELECT policy for authenticated role - view all profiles
  CREATE POLICY "authenticated_select_all_profiles"
    ON user_profiles
    FOR SELECT
    TO authenticated
    USING (true);
    
EXCEPTION WHEN OTHERS THEN
  -- If policy creation fails, it likely already exists - that's ok
  NULL;
END $$;
