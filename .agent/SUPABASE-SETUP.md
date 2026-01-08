# Supabase Setup Instructions

## Step 1: Run Database Migration

1. Open your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Create a new query
4. Copy and paste the contents of `supabase-migration.sql`
5. Run the query

This will:

- Create the `user_profiles` table
- Add `is_root` column to existing `folders` table
- Set up Row Level Security (RLS) policies
- Create necessary indexes
- Add triggers for auto-updating timestamps

## Step 2: Verify Tables Exist

Check that you have these tables:

- `auth.users` (provided by Supabase)
- `folders` (should already exist)
- `user_profiles` (newly created)

## Step 3: Verify Folders Table Structure

Your `folders` table should have:

```sql
CREATE TABLE folders (
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
```

## Step 4: Set Up RLS Policies for Folders (if not already done)

```sql
-- Enable RLS
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;

-- Users can view their own folders
CREATE POLICY "Users can view their own folders"
  ON folders FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own folders
CREATE POLICY "Users can insert their own folders"
  ON folders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own folders
CREATE POLICY "Users can update their own folders"
  ON folders FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own folders (except root)
CREATE POLICY "Users can delete their own folders"
  ON folders FOR DELETE
  USING (auth.uid() = user_id AND is_root = false);
```

## Step 5: Set Up Notes Table (if needed)

Your `notes` table should reference folders:

```sql
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

-- Enable RLS
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own notes"
  ON notes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notes"
  ON notes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notes"
  ON notes FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notes"
  ON notes FOR DELETE
  USING (auth.uid() = user_id);
```

## Step 6: Verify Environment Variables

Update your `src/environments/environment.ts`:

```typescript
export const environment = {
  production: false,
  supabase: {
    url: 'YOUR_SUPABASE_URL',
    anonKey: 'YOUR_SUPABASE_ANON_KEY',
  },
};
```

And `src/environments/environment.prod.ts`:

```typescript
export const environment = {
  production: true,
  supabase: {
    url: 'YOUR_SUPABASE_URL',
    anonKey: 'YOUR_SUPABASE_ANON_KEY',
  },
};
```

## Step 7: Test the Setup

1. Clear any existing data (optional, for testing):

```sql
DELETE FROM folders WHERE user_id = 'YOUR_TEST_USER_ID';
DELETE FROM user_profiles WHERE user_id = 'YOUR_TEST_USER_ID';
```

2. Start your Angular app:

```bash
npm start
```

3. Sign up a new user
4. Confirm email
5. Sign in
6. Check database:
   - One entry in `user_profiles` with `is_root_folder_created = true`
   - One folder in `folders` with `is_root = true` and `name = 'My Notes'`

## Step 8: Verify Folder Tree Query

Test folder tree retrieval:

```sql
-- Get all folders for a user in hierarchical order
WITH RECURSIVE folder_tree AS (
  -- Root folders
  SELECT
    id,
    name,
    parent_id,
    user_id,
    is_root,
    icon,
    color,
    0 as depth,
    ARRAY[name] as path
  FROM folders
  WHERE user_id = 'YOUR_USER_ID'
    AND parent_id IS NULL

  UNION ALL

  -- Child folders
  SELECT
    f.id,
    f.name,
    f.parent_id,
    f.user_id,
    f.is_root,
    f.icon,
    f.color,
    ft.depth + 1,
    ft.path || f.name
  FROM folders f
  INNER JOIN folder_tree ft ON f.parent_id = ft.id
)
SELECT * FROM folder_tree
ORDER BY path;
```

## Troubleshooting

### Issue: "permission denied for table folders"

**Solution**: Check RLS policies are correctly set up

### Issue: "null value in column user_id violates not-null constraint"

**Solution**: Ensure user is authenticated before creating folders

### Issue: Root folder created multiple times

**Solution**:

1. Check `user_profiles.is_root_folder_created` flag
2. Verify `getUserProfile()` in UserService works correctly
3. Clear duplicate folders:

```sql
-- Find duplicates
SELECT user_id, COUNT(*)
FROM folders
WHERE is_root = true
GROUP BY user_id
HAVING COUNT(*) > 1;

-- Keep only the oldest root folder per user
DELETE FROM folders f1
WHERE is_root = true
  AND EXISTS (
    SELECT 1 FROM folders f2
    WHERE f2.user_id = f1.user_id
      AND f2.is_root = true
      AND f2.created_at < f1.created_at
  );
```

### Issue: Cannot delete folder

**Solution**: Check if it's a root folder - root folders cannot be deleted

## Additional Indexes (Optional for Performance)

```sql
-- Improve query performance
CREATE INDEX IF NOT EXISTS idx_folders_parent_id ON folders(parent_id);
CREATE INDEX IF NOT EXISTS idx_folders_user_id_parent_id ON folders(user_id, parent_id);
CREATE INDEX IF NOT EXISTS idx_notes_folder_id ON notes(folder_id);
CREATE INDEX IF NOT EXISTS idx_notes_user_id_folder_id ON notes(user_id, folder_id);
```

## Security Checklist

- [ ] RLS enabled on all tables
- [ ] Users can only access their own data
- [ ] Root folders cannot be deleted
- [ ] Foreign key constraints are in place
- [ ] Cascade deletes configured properly
- [ ] API keys are in environment files (not committed to git)
