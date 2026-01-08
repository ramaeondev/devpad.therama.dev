# Root Folder Implementation Guide

## Overview

This implementation adds automatic root folder creation for users when they first authenticate. The system uses a flag in the user profile to ensure a root folder is only created once per user.

## Database Changes

### New Tables

#### `user_profiles`

Tracks user-specific settings and flags:

- `id` (UUID, Primary Key)
- `user_id` (UUID, References auth.users, Unique)
- `is_root_folder_created` (Boolean) - Flag to track root folder creation
- `created_at` (Timestamp)
- `updated_at` (Timestamp)

### Updated Tables

#### `folders`

Added new column:

- `is_root` (Boolean) - Identifies root folders

## Code Changes

### 1. Models Updated

#### `src/app/core/models/user.model.ts`

- Added `UserProfile` interface with `is_root_folder_created` flag

#### `src/app/core/models/folder.model.ts`

- Added `is_root: boolean` to `Folder` interface

### 2. New Services

#### `src/app/core/services/user.service.ts`

Handles user profile operations:

- `getUserProfile(userId)` - Get or create user profile
- `createUserProfile(userId)` - Create new profile
- `updateUserProfile(userId, updates)` - Update profile
- `markRootFolderCreated(userId)` - Set flag to true
- `hasRootFolder(userId)` - Check if root folder exists

#### `src/app/features/folders/services/folder.service.ts`

Handles all folder operations:

- `createRootFolder(userId)` - Create root folder "My Notes"
- `getRootFolder(userId)` - Get existing root folder
- `initializeUserFolders(userId)` - Main initialization method
- `createFolder(userId, dto)` - Create regular folder
- `getFolders(userId)` - Get all folders
- `getFolderTree(userId)` - Get hierarchical tree structure
- `updateFolder(folderId, userId, dto)` - Update folder
- `deleteFolder(folderId, userId)` - Delete folder (prevents root deletion)
- `getChildFolders(parentId, userId)` - Get subfolders

### 3. Updated Components & Guards

#### `src/app/core/guards/auth.guard.ts`

- Added folder initialization after successful authentication
- Calls `folderService.initializeUserFolders()` when user is authenticated

#### `src/app/features/auth/pages/signin/signin.component.ts`

- Added folder initialization after successful sign-in
- Ensures root folder is created before navigating to dashboard

#### `src/app/features/auth/pages/signup/signup.component.ts`

- Injected `FolderService` for future use (initialization happens on first login)

## How It Works

### First-Time User Flow

1. **User signs up** → Account created in Supabase Auth
2. **User confirms email** → Email verified
3. **User signs in for the first time**:
   - `signin.component.ts` authenticates user
   - `folderService.initializeUserFolders()` is called
   - Service checks `user_profiles.is_root_folder_created` flag
   - If `false` or profile doesn't exist:
     - Creates `user_profiles` entry
     - Creates root folder "My Notes" with `is_root: true`
     - Sets `is_root_folder_created: true`
   - User navigates to dashboard

4. **Auth Guard Protection**:
   - Every protected route checks authentication
   - On successful auth, calls `initializeUserFolders()`
   - If root folder already exists, does nothing
   - If not, creates it (fallback safety)

### Returning User Flow

1. **User signs in**:
   - Authentication successful
   - `initializeUserFolders()` checks flag
   - Flag is `true` → Returns existing root folder
   - No new folder created
   - User navigates to dashboard

## Database Migration

Run the provided SQL migration in your Supabase SQL Editor:

```bash
# File: supabase-migration.sql
```

This will:

1. Create `user_profiles` table
2. Add `is_root` column to `folders` table
3. Set up RLS policies
4. Create necessary indexes
5. Add triggers for `updated_at` timestamps

## Key Features

### Safety Mechanisms

1. **Double-check Prevention**:
   - Checks both `user_profiles.is_root_folder_created` flag
   - Queries for existing root folder before creating

2. **Root Folder Protection**:
   - `deleteFolder()` method prevents deletion of folders with `is_root: true`

3. **Error Handling**:
   - Folder initialization errors don't block authentication
   - Logged but user can still access dashboard

4. **Idempotent Operations**:
   - `initializeUserFolders()` can be called multiple times safely
   - Always returns root folder (existing or newly created)

### Folder Organization

The root folder "My Notes" serves as:

- Top-level container for all user folders
- Starting point for folder tree structure
- Parent folder (`parent_id: null`, `is_root: true`)

Users can then create subfolders:

```
📁 My Notes (Root)
  ├── 📁 Work
  │   ├── 📝 Meeting Notes
  │   └── 📝 Project Ideas
  ├── 📁 Personal
  │   └── 📝 Shopping List
  └── 📁 Learning
      └── 📝 Study Notes
```

## API Methods

### Folder Service

```typescript
// Initialize folders (main method)
await folderService.initializeUserFolders(userId);

// Get folder tree for sidebar
const tree = await folderService.getFolderTree(userId);

// Create subfolder
await folderService.createFolder(userId, {
  name: 'Work',
  parent_id: rootFolderId,
  icon: '💼',
});

// Get root folder
const root = await folderService.getRootFolder(userId);
```

### User Service

```typescript
// Check if root folder created
const hasRoot = await userService.hasRootFolder(userId);

// Get user profile
const profile = await userService.getUserProfile(userId);

// Mark root folder as created
await userService.markRootFolderCreated(userId);
```

## Testing Checklist

- [ ] New user signs up → Receives email
- [ ] User confirms email → Verification successful
- [ ] User signs in first time → Root folder created
- [ ] Check database: `user_profiles.is_root_folder_created = true`
- [ ] Check database: One folder with `is_root = true` exists
- [ ] User signs out and back in → No duplicate root folder
- [ ] User navigates protected routes → Root folder exists
- [ ] User cannot delete root folder → Error thrown
- [ ] User can create subfolders under root → Success
- [ ] Folder tree displays correctly in sidebar → Visual check

## Future Enhancements

1. **Custom Root Folder Name**: Allow users to rename their root folder
2. **Multiple Root Folders**: Support project-based organization
3. **Shared Folders**: Collaboration features
4. **Folder Templates**: Quick-start folder structures
5. **Folder Colors & Icons**: Better visual organization
6. **Folder Archive**: Soft delete instead of hard delete

## Troubleshooting

### Root folder not appearing

- Check Supabase logs for errors
- Verify `user_profiles` table exists
- Check RLS policies are enabled
- Ensure `is_root` column exists in `folders` table

### Multiple root folders created

- Check `user_profiles.is_root_folder_created` flag
- Verify unique constraint on `user_id` in `user_profiles`
- Review `initializeUserFolders()` logic

### Cannot create folders

- Verify user is authenticated
- Check Supabase RLS policies for `folders` table
- Ensure foreign key constraints are valid

## Support

For issues or questions, please check:

1. Supabase dashboard for database errors
2. Browser console for frontend errors
3. Network tab for API request/response details
