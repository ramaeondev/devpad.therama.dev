# Google Drive File Persistence - Testing Guide

## Prerequisites

Before testing, you MUST apply the database migration:

### Apply Migration to Supabase

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Click **SQL Editor** in the left sidebar
4. Click **New Query**
5. Paste this SQL:
   ```sql
   ALTER TABLE "public"."integrations"
   ADD COLUMN IF NOT EXISTS "settings" jsonb DEFAULT '{}'::jsonb;
   ```
6. Click **Run** (or press Cmd/Ctrl + Enter)
7. You should see: "Success. No rows returned"

## Testing Steps

### Test 1: Save Files

1. Open your app in the browser
2. Open Browser DevTools (F12 or Cmd+Option+I)
3. Go to the **Console** tab
4. Connect to Google Drive (if not already connected)
5. Click the **Refresh** button (🔄) or **Actions** menu in Google Drive tree
6. Pick some files using Google Picker
7. **Look for this in console**: `💾 Saved X files to database`
   - If you see this ✅ = Files are being saved!
   - If you DON'T see this ❌ = Migration not applied or error occurred

### Test 2: Load Files (Page Refresh)

1. After picking files (Test 1), refresh the page (F5 or Cmd+R)
2. Wait for the app to load
3. **Look for this in console**: `✅ Loaded X saved files from database`
4. Check if the Google Drive tree shows your previously selected files
   - If files appear ✅ = Persistence is working!
   - If files are gone ❌ = Check console for errors

### Test 3: Load Files (Logout/Login)

1. After picking files, logout from your account
2. Login again
3. Navigate to the Google Drive section
4. **Look for this in console**: `✅ Loaded X saved files from database`
5. Files should reappear automatically

### Test 4: Delete Files

1. Pick some files
2. Delete one file from the tree
3. **Look for this in console**: `💾 Saved X files to database` (X should be reduced by 1)
4. Refresh the page
5. The deleted file should NOT reappear

## Console Messages Reference

| Message                                    | Meaning                                    |
| ------------------------------------------ | ------------------------------------------ |
| `💾 Saved X files to database`             | Files successfully saved to Supabase       |
| `✅ Loaded X saved files from database`    | Files successfully loaded from Supabase    |
| `ℹ️ No saved files found in database`      | No files saved yet (first time)            |
| `Failed to save selected files:`           | Error saving - check migration was applied |
| `Failed to check Google Drive connection:` | Error loading - check network/auth         |

## Troubleshooting

### Files Not Saving

**Symptom**: No `💾 Saved` message appears
**Solution**:

1. Check if migration was applied to database
2. Open Network tab in DevTools
3. Look for failed requests to Supabase
4. Check if `settings` column exists in `integrations` table

### Files Not Loading

**Symptom**: `ℹ️ No saved files` appears even after saving
**Solution**:

1. Check browser console for errors
2. Verify you're logged in with the same account
3. Check Supabase dashboard > Table Editor > integrations
4. Look at the `settings` column - it should contain JSON with `selected_files`

### Migration Not Applied

**Symptom**: Error in console about `settings` column
**Solution**:

1. Go to Supabase SQL Editor
2. Run this to check if column exists:
   ```sql
   SELECT column_name
   FROM information_schema.columns
   WHERE table_name = 'integrations'
   AND column_name = 'settings';
   ```
3. If no results, run the ALTER TABLE command again

## Verify in Database

To manually check if files are being saved:

1. Go to Supabase Dashboard
2. Click **Table Editor**
3. Select `integrations` table
4. Find your Google Drive row
5. Check the `settings` column
6. It should show JSON like:
   ```json
   {
     "selected_files": [
       {
         "id": "...",
         "name": "...",
         ...
       }
     ]
   }
   ```

## Success Criteria

✅ Console shows save messages when picking files
✅ Console shows load messages on page refresh
✅ Files persist after refresh
✅ Files persist after logout/login
✅ Deleted files don't reappear
✅ Database `settings` column contains file data
