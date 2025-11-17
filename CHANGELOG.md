# Changelog

All notable changes to this project are documented in this file.

## [Unreleased] - 2025-11-13

### Added
- `app/shared/components/ui/dialog/confirm-modal.component.ts` - reusable confirmation modal component to replace native `confirm()` calls.
- Drag and drop notes anywhere within folder areas: users can now drop notes on folder headers, notes lists, or any part of the folder container for improved usability.
- Document upload feature: upload any general documents less than 5MB, excluding executable files (exe, bat, cmd, etc.). Documents are stored in Supabase storage and appear in the folder tree with download functionality.

### Changed
- `src/app/features/folders/components/folder-tree/folder-tree.component.ts`
  - Replaced native `prompt()`/`confirm()` flows with modal-based dialogs for note rename and delete.
  - Added modal state and handlers (note rename modal, generic confirm modal).

- `src/app/core/services/note.service.ts`
  - Notes storage migrated to deterministic paths: `notes/{userId}/{noteId}.md`.
  - Uploads use `File` for browser compatibility and include verification via signed URLs.
  - `getNote()` now retrieves stored note content via signed URLs to support private buckets (fallback removed; always use signed URL for reads).
  - Added upload verification to detect empty-upload or permission issues early.

- `src/app/features/notes/components/note-workspace/note-workspace.component.ts`
  - Fixed race condition when selecting notes: selection id and title are set immediately before content download to avoid saving to the wrong note.

- `src/app/features/notes/components/markdown-editor/markdown-editor.component.ts`
  - Editor now reacts to changes to `initialContent` via an input setter; preview is updated when parent sets content.

### Fixed
- Resolved issue where saving a second note could overwrite the first note due to a selection/content race.
- Addressed blank-note retrievals by using signed URL fetches for stored note content.

### Notes
- Signed URL TTL is currently set to 60 seconds. Consider increasing TTL or returning signed URLs to the UI for direct use if needed.
- Folder-delete still uses the existing delete flow; can be wired to the confirm modal on request.

