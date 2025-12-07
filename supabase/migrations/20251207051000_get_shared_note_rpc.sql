-- Secure function to fetch shared note content without exposing service key
-- Allows anonymous/ authenticated callers to fetch a shared note by share token
-- while honoring expiry and max view constraints. Does NOT increment view counts;
-- that remains in application logic.

-- Drop existing function if it exists (return type changed)
DROP FUNCTION IF EXISTS public.get_shared_note(text);

CREATE OR REPLACE FUNCTION public.get_shared_note(p_share_token text)
RETURNS TABLE (
  share_id uuid,
  note_id uuid,
  user_id uuid,
  permission text,
  view_count integer,
  max_views integer,
  expires_at timestamptz,
  note_title text,
  note_content text,
  is_encrypted boolean,
  encryption_version text,
  created_at timestamptz,
  updated_at timestamptz
) AS $$
DECLARE
  v_share public.public_shares%rowtype;
BEGIN
  -- Locate the share
  SELECT * INTO v_share
  FROM public.public_shares
  WHERE share_token = p_share_token;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Validate expiry
  IF v_share.expires_at IS NOT NULL AND v_share.expires_at < now() THEN
    RETURN;
  END IF;

  -- Validate max views
  IF v_share.max_views IS NOT NULL AND v_share.view_count >= v_share.max_views THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    v_share.id,
    v_share.note_id,
    v_share.user_id,
    v_share.permission,
    v_share.view_count,
    v_share.max_views,
    v_share.expires_at,
    n.title AS note_title,
    n.content AS note_content,
    n.is_encrypted,
    n.encryption_version,
    v_share.created_at,
    v_share.updated_at
  FROM public.notes n
  WHERE n.id = v_share.note_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Allow anonymous and authenticated callers to execute
GRANT EXECUTE ON FUNCTION public.get_shared_note(text) TO anon, authenticated;
