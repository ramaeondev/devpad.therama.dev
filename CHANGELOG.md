# Changelog

All notable changes to this project are documented in this file.


## [Unreleased] - 2025-11-28

### Added
- **Change Password**: Added change password functionality to settings panel.

## [Unreleased] - 2025-11-27

### Added
- **Dashboard Layout**: Implemented responsive header, sidebar, and main content area.
- **AuthStateService**: Integrated to manage user state directly after sign-in and simplify post-signin navigation logic.
- **Terms and Conditions**: Added acceptance checkbox and validation to signup form.

### Changed
- **CI/CD Workflow**: Triggered on pushes to the master branch.
- **Vercel Deployment**: Replaced multi-stage CI/CD pipeline with streamlined workflow.

### Refactored
- **Changelog Modal**: Updated to emit a close event and consume it in the settings panel.

## [Unreleased] - 2025-11-25

### Changed
- Privacy policy and terms routes updated to top-level (`/policy`, `/terms`).
- Navigation links updated for Google OAuth compliance.
- Removed redundant `/legal` route.
- Simplifies legal routes and updates navigation links.
- Integrates Google Picker for user-driven file selection.

## [2025-11-24]
### Changed
- Updates changelog entries and removes homepage note.


## [Unreleased] - 2025-11-22

### Changed
- **Iconography Overhaul**: Migrated all document/file type icons from custom SVGs and local assets to Font Awesome CDN icons for consistency and performance.
  - Removed all usages of local SVG icon assets and custom icon directive (`appIcon`).
  - Updated all components and pipes to use `<i class="fa-solid ...">` with dynamic FA class names.
  - Ensured no local icon requests are made; all icons now load from the CDN.


### Added
- **Features Section**: Added a "Key Features" section to the homepage to highlight application capabilities.
- **Google User Data Policy**: Added a new section to the privacy policy to comply with Google's API Services User Data Policy.
### Changed
- **Routing**: Updated application routing to direct root URL to the new homepage.
- **Branding**: Replaced the default SVG with the `app-logo` component for consistent branding on the homepage.
- **Privacy Policy Path**: The privacy policy is now accessible at `/policy`.
- **UI**: Added a GitHub repository link with an icon in the homepage header.

### Fixed
- **Google OAuth Compliance**: Addressed issues from the Google OAuth verification team by providing a homepage with a privacy policy link and updating the privacy policy content.

### Changed
- **Iconography Overhaul**: Replaced all custom SVG icons with Google Material Icons for a consistent and modern UI.
  - Refactored the `IconComponent` to dynamically render Material Icons.
  - Replaced loading spinners with animated `autorenew` icon.
  - Standardized icon usage across all components, including buttons, menus, and file trees.

### Fixed
- **UI Consistency**: Corrected icon alignment and visibility issues in dropdown menus and the folder tree.
- **Kebab Menus**: Ensured kebab menu icons (`more_vert`) are consistent and properly sized across the application.

## [Unreleased] - 2025-11-17

### Added - Google Drive Integration Epic
- **Google Drive OAuth Integration**: Complete OAuth 2.0 flow with Google Identity Services
  - Client-side authentication using Google's official SDK
  - Secure token storage in Supabase with access/refresh tokens
  - Automatic connection status detection and token validation
  - Integration management in user settings
  
- **Google Drive File Browser**: Full file/folder tree navigation in sidebar
  - Recursive folder structure display with expand/collapse functionality
  - Real-time file listing with proper MIME type detection
  - Collapsible root folder accordion to reduce visual clutter
  - File type icons (📁 folders, 📝 docs, 📊 sheets, 📽️ slides, 🖼️ images, 📄 PDFs)
  - Refresh button to sync latest changes from Google Drive

- **File Management Kebab Menu**: Comprehensive file operations
  - **Download**: Download files directly to local machine with proper extensions
  - **Import to DevPad**: Import Google Drive files to DevPad "Imports" folder
  - **Rename**: Rename files directly in Google Drive
  - **Delete**: Delete files from Google Drive with confirmation
  - **Properties**: View file metadata in modal (name, type, size, modified date, ID)
  - Menu appears on hover with proper positioning and dark mode support

- **File Preview System**: Preview Google Drive files in DevPad workspace
  - Click any file in tree to open preview in center area
  - Google Workspace documents use native Google preview (webViewLink)
  - Full metadata display with file icons and information
  - Close button to return to note editing

- **Properties Modal Component**: Reusable modal for file metadata
  - `PropertiesModalComponent` - Generic property display with icons
  - Shows detailed file information (name, type, size, dates, ID)
  - Dark mode compatible with smooth animations
  - Used for both Google Drive and DevPad file properties

### Added - Document Preview Enhancements
- **MS Office Document Preview**: View Office files directly in DevPad
  - Microsoft Office Online Viewer integration for Word, Excel, PowerPoint
  - Supports .doc, .docx, .xls, .xlsx, .ppt, .pptx formats
  - Full document rendering with scroll, zoom, and search capabilities
  - Uses signed URLs with Microsoft's official viewer service

- **Enhanced Media Preview**: Improved video and audio playback
  - Video files (.mp4, .avi, .mov, .webm, .mkv) play in iframe with native controls
  - Audio files (.mp3, .wav, .ogg, .flac, .m4a) play in iframe with controls
  - Fullscreen support for videos
  - Proper permissions for autoplay and encrypted media

- **Text File Preview**: View text-based files in browser
  - Support for .txt, .md, .json, .xml, .csv, .log files
  - Code file preview (.html, .css, .js, .ts)
  - Rendered in iframe for proper formatting

### Changed
- **File Download Behavior**: DevPad files now download directly instead of opening in new tab
  - Fetches files as blobs from Supabase storage
  - Creates proper download links with correct filenames and extensions
  - Automatically revokes object URLs after download
  - Improved user experience with "Download started" toast notification

- **Google Drive API Integration**: Migrated from HttpClient to native fetch API
  - Better authentication header handling
  - Proper support for Google Workspace file exports
  - Export format mapping (Docs→.docx, Sheets→.xlsx, Slides→.pptx, Drawings→.png)
  - Improved error handling and retry logic

- **Workspace State Management**: Enhanced cross-component communication
  - Added `googleDriveFileSelected$` Subject for file selection events
  - `emitGoogleDriveFileSelected()` method for broadcasting selections
  - Proper cleanup in component lifecycle hooks

- **Sidebar Layout**: Integrated Google Drive tree in sidebar
  - Added "Cloud Storage" section below folders
  - Automatic connection status check on component initialization
  - Seamless integration with existing folder navigation

### Technical Details
- **Services Modified**:
  - `google-drive.service.ts`: File operations, OAuth, API integration
  - `workspace-state.service.ts`: Google Drive file selection state
  - `note.service.ts`: Document upload enhancements

- **Components Modified**:
  - `google-drive-tree.component.ts`: File tree, kebab menu, actions
  - `google-drive-preview.component.ts`: File preview display
  - `note-workspace.component.ts`: Preview integration
  - `folder-tree.component.ts`: Download behavior fix
  - `document-preview.component.ts`: Office/media preview support
  - `sidebar.component.ts`: Google Drive integration

- **New Components**:
  - `properties-modal.component.ts`: Generic file properties modal
  - `google-drive-preview.component.ts`: Google file preview

### Fixed
- Google Drive API 401/403 authentication errors resolved with fetch API
- Workspace file export now uses proper Google API export endpoints
- Duplicate key violations in Supabase integrations table fixed with onConflict
- DevPad file downloads now properly extract filename and extension
- Office document preview works with signed URLs and Microsoft viewer

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

