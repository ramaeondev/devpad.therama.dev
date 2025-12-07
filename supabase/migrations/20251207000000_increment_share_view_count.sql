-- Create a function to safely increment view count
CREATE OR REPLACE FUNCTION increment_share_view_count(share_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public_shares
  SET 
    view_count = view_count + 1,
    last_accessed_at = NOW()
  WHERE id = share_id;
END;
$$;

-- Grant execute permission to anon and authenticated users
GRANT EXECUTE ON FUNCTION increment_share_view_count(UUID) TO anon, authenticated, service_role;
