# Changelog

All notable changes to this project are documented in this file.

## [Unreleased] - 2025-11-17

### Added
- **Material File Icons Integration**: Implemented proper Material Design file type icons using `@ng-icons/core` and `@ng-icons/material-file-icons` packages
  - 34+ colored icons for different file types (PDF, Word, Excel, PowerPoint, images, videos, audio, archives, code files)
  - Icons automatically display based on file extension extracted from note title
  - Fallback icon system for unsupported file types
- Icon validation system with `hasIcon()` helper method to verify icon availability
- `FILE_ICONS_REGISTRY` central registry for all Material File Icons

### Changed
- **File Icon System Overhaul**:
  - `src/app/features/folders/components/folder-tree/folder-tree.component.ts`
    - Added `getFileIconName()` method to extract file extensions from note titles (not storage paths)
    - Replaced emoji icons with proper Material File Icons using `<ng-icon>` component
    - Icons now show correct colors: PDFs (red), Word docs (blue), images (purple), Excel (green), etc.
  - `src/app/core/services/note.service.ts`
    - Removed obsolete `getIconForNote()` emoji-based icon mapping method
    - Stopped adding `icon` property in `getNotesForFolder()` - icons now handled by UI layer
  - `src/app/app.config.ts`
    - Registered `FILE_ICONS_REGISTRY` globally with `NgIconsModule.withIcons()`
- **Code Formatting**: Applied Prettier formatting to 59+ files for consistency

### Removed
- `src/app/shared/icons/file-icon.directive.ts` - Removed directive-based approach as `NgIconComponent.name` is read-only
- Emoji-based icon system replaced with proper SVG Material File Icons

### Fixed
- PDF file extension extraction now correctly reads from note title instead of storage path
- Icons properly render for all supported file types with accurate visual representation

### Technical Notes
- Material File Icons imported from `@ng-icons/material-file-icons/colored` for colored variants
- Direct icon name computation in component (not directive-based) due to Angular API constraints
- Icons are registered globally for app-wide availability

## [Unreleased] - 2025-11-13

### Added
- `app/shared/components/ui/dialog/confirm-modal.component.ts` - reusable confirmation modal component to replace native `confirm()` calls.
- Drag and drop notes anywhere within folder areas: users can now drop notes on folder headers, notes lists, or any part of the folder container for improved usability.
- Document upload feature: upload any general documents less than 5MB, excluding executable files (exe, bat, cmd, etc.). Documents are stored in Supabase storage and appear in the folder tree with download functionality.
- Document preview modal: preview PDFs and images directly in the browser; shows "No Preview Available" for unsupported file types.
- File type-specific icons: documents display appropriate icons based on file extension (PDF 📄, Word 📝, Excel 📊, etc.).
- Drag handle indicator: added visual drag handles (⋮⋮) to note rows for better drag-and-drop usability.

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

