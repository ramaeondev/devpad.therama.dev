-- Create table for tracking access logs
CREATE TABLE IF NOT EXISTS public_share_access_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    share_id UUID REFERENCES public_shares(id) ON DELETE CASCADE,
    fingerprint TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_share_access_fingerprint ON public_share_access_logs(share_id, fingerprint);

-- Add unique_view_count to public_shares
ALTER TABLE public_shares 
ADD COLUMN IF NOT EXISTS unique_view_count INTEGER DEFAULT 0;

-- Create function to track access
CREATE OR REPLACE FUNCTION track_share_access(p_share_id UUID, p_fingerprint TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_exists BOOLEAN;
BEGIN
    -- Increment total view count (always)
    UPDATE public_shares
    SET 
        view_count = view_count + 1,
        last_accessed_at = NOW()
    WHERE id = p_share_id;

    -- Check if this fingerprint has accessed this share before
    SELECT EXISTS (
        SELECT 1 
        FROM public_share_access_logs 
        WHERE share_id = p_share_id AND fingerprint = p_fingerprint
    ) INTO v_exists;

    -- If new visitor, log it and increment unique count
    IF NOT v_exists THEN
        INSERT INTO public_share_access_logs (share_id, fingerprint)
        VALUES (p_share_id, p_fingerprint);

        UPDATE public_shares
        SET unique_view_count = unique_view_count + 1
        WHERE id = p_share_id;
    END IF;
END;
$$;

-- Grant permissions
GRANT SELECT, INSERT ON public_share_access_logs TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION track_share_access(UUID, TEXT) TO anon, authenticated, service_role;
