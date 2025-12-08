-- Add imports_folder_id column to user_profiles table
-- This tracks the user's Imports folder for forked/imported shared notes

ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS imports_folder_id uuid REFERENCES public.folders(id);

-- Add comment
COMMENT ON COLUMN public.user_profiles.imports_folder_id IS 'Reference to the user''s Imports folder for forked shared notes';
