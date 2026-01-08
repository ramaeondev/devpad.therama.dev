# Google Drive File Persistence Implementation

## Summary

Implemented persistence for selected Google Drive files so they remain available after page refreshes or logout/login. This was achieved by adding a `settings` column to the `integrations` table in Supabase and updating the `GoogleDriveService` to save and load these settings.

## Changes Made

### 1. Database Schema Update

**File**: `supabase/migrations/20251203135000_add_settings_to_integrations.sql`

- Added `settings` column (JSONB) to `integrations` table.
- This allows storing arbitrary metadata for integrations, such as the list of selected files.

### 2. Frontend Model Update

**File**: `src/app/core/models/integration.model.ts`

- Updated `Integration` interface to include optional `settings` field.

### 3. Service Logic Update

**File**: `src/app/core/services/google-drive.service.ts`

- **Saving**: Added `saveSelectedFiles()` method which updates the `settings` column in Supabase.
- **Loading**: Updated `checkConnection()` to read `settings.selected_files` and populate the file tree on startup.
- **Triggers**:
  - Called `saveSelectedFiles()` after files are picked via Google Picker.
  - Called `saveSelectedFiles()` after a file is deleted.

## How it Works

1. **User Picks Files**: Google Picker returns file metadata.
2. **App Saves**: `GoogleDriveService` saves this metadata to `integrations.settings.selected_files` in Supabase.
3. **User Refreshes**: App initializes, calls `checkConnection()`.
4. **App Loads**: `checkConnection()` fetches the integration record, extracts `selected_files` from settings, and rebuilds the folder tree.

## Testing

1. **Pick Files**: Connect Google Drive and pick some files.
2. **Refresh**: Reload the page. The files should still be visible in the tree.
3. **Logout/Login**: Logout and log back in. The files should reappear after the integration loads.
4. **Delete**: Delete a file from the tree. Refresh. The file should remain deleted.
