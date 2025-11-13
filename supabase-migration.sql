-- Migration: Add root folder support for users
-- Date: 2025-11-13
-- Description: Adds user_profiles table and updates folders table with is_root flag

-- Create folders table if it doesn't exist
CREATE TABLE IF NOT EXISTS folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  parent_id UUID REFERENCES folders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_root BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  color TEXT,
  icon TEXT
);

-- Add is_root column to folders table if it doesn't exist (for existing tables)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'folders'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'folders' AND column_name = 'is_root'
  ) THEN
    ALTER TABLE folders ADD COLUMN is_root BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;

-- Create user_profiles table to track user-specific settings
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_root_folder_created BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_folders_user_id ON folders(user_id);
CREATE INDEX IF NOT EXISTS idx_folders_is_root ON folders(is_root);
CREATE INDEX IF NOT EXISTS idx_folders_user_id_is_root ON folders(user_id, is_root);
CREATE INDEX IF NOT EXISTS idx_folders_parent_id ON folders(parent_id);

-- Enable Row Level Security
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_profiles
CREATE POLICY "Users can view their own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
  ON user_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for user_profiles
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create RLS policies for folders
DO $$ 
BEGIN
  -- Policy for viewing folders
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'folders' 
      AND policyname = 'Users can view their own folders'
  ) THEN
    CREATE POLICY "Users can view their own folders"
      ON folders FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  -- Policy for inserting folders
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'folders' 
      AND policyname = 'Users can insert their own folders'
  ) THEN
    CREATE POLICY "Users can insert their own folders"
      ON folders FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

  -- Policy for updating folders
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'folders' 
      AND policyname = 'Users can update their own folders'
  ) THEN
    CREATE POLICY "Users can update their own folders"
      ON folders FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;

  -- Policy for deleting folders (except root)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'folders' 
      AND policyname = 'Users can delete their own folders except root'
  ) THEN
    CREATE POLICY "Users can delete their own folders except root"
      ON folders FOR DELETE
      USING (auth.uid() = user_id AND is_root = false);
  END IF;
END $$;

-- Create trigger for folders updated_at
DROP TRIGGER IF EXISTS update_folders_updated_at ON folders;
CREATE TRIGGER update_folders_updated_at
  BEFORE UPDATE ON folders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create notes table if it doesn't exist
CREATE TABLE IF NOT EXISTS notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT,
  folder_id UUID REFERENCES folders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  is_favorite BOOLEAN DEFAULT false,
  tags TEXT[]
);

-- Create indexes for notes
CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_folder_id ON notes(folder_id);
CREATE INDEX IF NOT EXISTS idx_notes_user_id_folder_id ON notes(user_id, folder_id);

-- Enable RLS for notes
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for notes
DO $$ 
BEGIN
  -- Policy for viewing notes
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'notes' 
      AND policyname = 'Users can view their own notes'
  ) THEN
    CREATE POLICY "Users can view their own notes"
      ON notes FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  -- Policy for inserting notes
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'notes' 
      AND policyname = 'Users can insert their own notes'
  ) THEN
    CREATE POLICY "Users can insert their own notes"
      ON notes FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

  -- Policy for updating notes
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'notes' 
      AND policyname = 'Users can update their own notes'
  ) THEN
    CREATE POLICY "Users can update their own notes"
      ON notes FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;

  -- Policy for deleting notes
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'notes' 
      AND policyname = 'Users can delete their own notes'
  ) THEN
    CREATE POLICY "Users can delete their own notes"
      ON notes FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Create trigger for notes updated_at
DROP TRIGGER IF EXISTS update_notes_updated_at ON notes;
CREATE TRIGGER update_notes_updated_at
  BEFORE UPDATE ON notes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE folders IS 'Stores folder hierarchy for organizing notes';
COMMENT ON TABLE notes IS 'Stores user notes with markdown content';
COMMENT ON TABLE user_profiles IS 'Stores user-specific profile settings and flags';
COMMENT ON COLUMN user_profiles.is_root_folder_created IS 'Flag to track if root folder has been created for the user';
COMMENT ON COLUMN folders.is_root IS 'Flag to identify root folders in the hierarchy';
COMMENT ON COLUMN notes.folder_id IS 'References the folder containing this note';
