# File Switching and Tree Refresh Fixes

## Summary

Fixed issues with file switching between different sources (DevPad, Google Drive, OneDrive), implemented automatic folder tree refreshing after imports, and added manual refresh/disconnect controls.

## Changes Made

### 1. Fixed File Switching Logic

**File**: `src/app/features/notes/components/note-workspace/note-workspace.component.ts`

- Updated subscriptions to `googleDriveFileSelected$`, `oneDriveFileSelected$`, and `noteSelected$`.
- Now explicitly clears other selections when a new file is selected.
- Ensures that clicking a file in one tree deselects files in other trees, preventing the preview from getting stuck.

### 2. DevPad Tree Refresh

**File**: `src/app/features/dashboard/components/sidebar/sidebar.component.ts`

- Added a manual **Refresh** button to the "Folders" header.
- Button calls `reloadFolders()` to re-fetch the folder structure.

**File**: `src/app/features/notes/components/note-workspace/note-workspace.component.ts`

- Subscribed to `workspaceState.foldersChanged$` to reload folders when triggered externally.

### 3. Automatic Refresh After Import

**File**: `src/app/features/integrations/components/google-drive-tree/google-drive-tree.component.ts`
**File**: `src/app/features/integrations/components/onedrive-tree/onedrive-tree.component.ts`

- Updated `handleImportToDevPad` methods in both components.
- Now calls `this.workspaceState.emitFoldersChanged()` after a successful import.
- This triggers the sidebar and workspace to reload the folder tree, showing the new "Imports" folder and file immediately.

### 4. Google Drive Tree Enhancements

**File**: `src/app/features/integrations/components/google-drive-tree/google-drive-tree.component.html`

- Added **Refresh** button (triggers "Pick Files").
- Added **Disconnect** button (triggers disconnect).
- Aligned the UI with the OneDrive tree component.

**File**: `src/app/features/integrations/components/google-drive-tree/google-drive-tree.component.ts`

- Added `disconnectGoogleDrive()` method with confirmation dialog.

## User Benefits

- **Seamless Switching**: Users can now switch between local notes and cloud files without UI glitches.
- **Immediate Feedback**: Importing files now instantly updates the folder tree.
- **Better Control**: Users can manually refresh folders if needed.
- **Consistent UI**: Google Drive and OneDrive trees now have consistent header actions (Refresh, Disconnect).

## Testing

1. **File Switching**:
   - Open a OneDrive file.
   - Click a Google Drive file -> OneDrive preview should close, Google Drive preview should open.
   - Click a local DevPad note -> Cloud previews should close, note editor should open.

2. **Import Refresh**:
   - Import a file from OneDrive.
   - Verify that the DevPad folder tree refreshes automatically and shows the new file in "Imports".

3. **Manual Refresh**:
   - Click the refresh icon next to "Folders" in the sidebar.
   - Verify the tree reloads.

4. **Google Drive Actions**:
   - Click the refresh icon in Google Drive tree -> Should open File Picker.
   - Click the disconnect icon -> Should prompt for confirmation and disconnect.
