# D-Chat File Attachment System

## Overview

The file attachment system is a comprehensive, generic solution for handling file uploads and previews in D-Chat. It supports all file types, with a maximum file size of 10 MB, providing users with an intuitive interface for managing attachments in one-on-one chats.

## Features

- **Universal File Support**: No file type restrictions, supports all file extensions
- **Size Validation**: Enforced 10 MB maximum file size limit
- **Smart Categorization**: Automatic file categorization (documents, images, videos, audio, archives, code) with emoji icons
- **Drag & Drop**: Intuitive drag-and-drop file selection
- **Preview Cards**: Display file information with icons, names, sizes, and download buttons
- **Batch Operations**: Select and manage multiple files before upload
- **Error Handling**: Comprehensive validation and user-friendly error messages
- **Retro Aesthetic**: Green and black theme with arcade-game inspired design
- **Responsive Design**: Mobile-friendly interface with touchscreen support

## Architecture

### File Structure

```
src/app/features/d-chat/
├── models/
│   └── file-attachment.model.ts         # Data models and constants
├── services/
│   ├── file-attachment.service.ts       # File utilities and operations
│   └── file-attachment.service.spec.ts  # Service unit tests
└── components/
    ├── file-attachment-input/
    │   ├── file-attachment-input.component.ts
    │   └── file-attachment-input.component.spec.ts
    └── file-attachment-preview/
        ├── file-attachment-preview.component.ts
        └── file-attachment-preview.component.spec.ts
```

### Core Components

#### 1. **FileAttachmentInputComponent**

Handles file selection and validation. Features:
- Drag-and-drop support
- File input dialog
- Real-time validation
- Preview of selected files before upload
- Batch file management

**Selector**: `app-file-attachment-input`

**Outputs**:
```typescript
@Output() filesSelected = new EventEmitter<FileMetadata[]>();
```

**Usage**:
```html
<app-file-attachment-input 
  (filesSelected)="handleFilesSelected($event)">
</app-file-attachment-input>
```

#### 2. **FileAttachmentPreviewComponent**

Displays file information and download/delete options. Features:
- File icon based on category
- Truncated filename display
- Formatted file size
- Relative upload time
- Hover-activated actions (download, delete)
- Retro styled design

**Selector**: `app-file-attachment-preview`

**Inputs**:
```typescript
@Input() attachment!: FileAttachment;
@Input() showDelete = false;
```

**Outputs**:
```typescript
@Output() download = new EventEmitter<FileAttachment>();
@Output() delete = new EventEmitter<FileAttachment>();
```

**Usage**:
```html
<app-file-attachment-preview 
  [attachment]="attachment"
  [showDelete]="true"
  (download)="onDownload($event)"
  (delete)="onDelete($event)">
</app-file-attachment-preview>
```

### FileAttachmentService

Provides utility methods for file operations:

```typescript
// File categorization
getFileExtension(fileName: string): string
getFileCategory(fileName: string): string
getFileIcon(fileName: string): string
getFileCategoryLabel(fileName: string): string

// File formatting
formatFileSize(bytes: number): string

// File validation
isFileSizeValid(file: File): boolean
getFileSizeErrorMessage(file: File): string
validateFiles(files: File[]): { valid: File[], errors: string[] }

// File operations
extractFileMetadata(file: File): FileMetadata
createDownloadLink(url: string, fileName: string): void
fileToBase64(file: File): Promise<string>
```

### Data Models

#### FileAttachment
```typescript
interface FileAttachment {
  id: string;
  messageId: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  mimeType: string;
  url: string;
  uploadedAt: string;        // ISO timestamp
  uploadedBy: string;        // user ID
}
```

#### FileMetadata (Local)
```typescript
interface FileMetadata {
  name: string;
  size: number;
  type: string;
  lastModified: number;
}
```

#### FileUploadRequest/Response
```typescript
interface FileUploadRequest {
  file: File;
  messageId: string;
  userId: string;
}

interface FileUploadResponse {
  success: boolean;
  attachment?: FileAttachment;
  error?: string;
}
```

### File Categories

| Category | Icon | Extensions | Use Cases |
|----------|------|-----------|-----------|
| **Document** | 📄 | pdf, doc, docx, txt, xls, xlsx, ppt, pptx | Reports, spreadsheets, presentations |
| **Image** | 🖼️ | jpg, jpeg, png, gif, bmp, webp, svg | Photos, screenshots, graphics |
| **Video** | 🎬 | mp4, avi, mkv, mov, webm, flv | Movies, clips, tutorials |
| **Audio** | 🎵 | mp3, wav, flac, aac, m4a, ogg | Music, podcasts, sound effects |
| **Archive** | 📦 | zip, rar, 7z, tar, gz | Compressed files, backups |
| **Code** | 💻 | js, ts, py, java, cpp, c, html, css, json, xml | Source code, configurations |
| **Default** | 📎 | (any other) | Unknown file types |

### Constants

```typescript
// Maximum file size: 10 MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// File size units for formatting
const FILE_SIZE_UNITS = ['B', 'KB', 'MB', 'GB'];

// File categories configuration
const FILE_CATEGORIES = {
  document: { icon: '📄', label: 'Document', extensions: [...] },
  image: { icon: '🖼️', label: 'Image', extensions: [...] },
  // ... etc
};
```

## Styling

### Design Principles

- **Retro Aesthetic**: Green (#00FF00) and black (#000000) theme inspired by arcade games
- **CRT Monitor Effect**: Scanlines and flicker animations
- **Accessibility**: High contrast colors, semantic HTML, keyboard navigation
- **Responsiveness**: Mobile-first approach with Tailwind CSS utilities

### Color Scheme

```scss
// Primary colors
--retro-green: rgba(0, 255, 0);
--retro-black: rgba(0, 0, 0);

// Hover effects
--hover-green: rgba(0, 255, 0, 0.2);

// Border colors
--border-green: rgba(0, 255, 0, 0.3);
```

### Animations

- **Bounce**: File drop zone icon bounces continuously
- **Flicker**: Subtle flicker effect on file cards (3s cycle)
- **Scanlines**: Repeating background patterns for CRT effect
- **Scale**: Buttons scale on hover and click

## Integration Guide

### 1. **Import Components**

```typescript
import { FileAttachmentInputComponent } from './components/file-attachment-input/file-attachment-input.component';
import { FileAttachmentPreviewComponent } from './components/file-attachment-preview/file-attachment-preview.component';
import { FileAttachmentService } from './services/file-attachment.service';
```

### 2. **Add to Chat Input**

```typescript
@Component({
  selector: 'app-chat-input',
  imports: [FileAttachmentInputComponent, ...],
  template: `
    <app-file-attachment-input 
      (filesSelected)="handleFilesSelected($event)">
    </app-file-attachment-input>
  `
})
export class ChatInputComponent {
  constructor(private fileService: FileAttachmentService) {}

  async handleFilesSelected(files: FileMetadata[]): Promise<void> {
    for (const file of files) {
      // Upload file to Supabase storage
      // Create FileAttachment record in database
      // Emit file attachment message
    }
  }
}
```

### 3. **Display in Messages**

```typescript
@Component({
  selector: 'app-chat-message',
  imports: [FileAttachmentPreviewComponent, ...],
  template: `
    <div class="message-body">
      <!-- Message content -->
      <p>{{ message.content }}</p>
      
      <!-- File attachments -->
      <div class="attachments" *ngIf="message.attachments?.length">
        <app-file-attachment-preview 
          *ngFor="let attachment of message.attachments"
          [attachment]="attachment"
          (download)="downloadFile($event)">
        </app-file-attachment-preview>
      </div>
    </div>
  `
})
export class ChatMessageComponent {
  downloadFile(attachment: FileAttachment): void {
    this.fileService.createDownloadLink(attachment.url, attachment.fileName);
  }
}
```

## Validation & Error Handling

### Client-Side Validation

1. **File Size Check**: Validates each file against 10 MB limit
2. **File Type Check**: No restrictions (all extensions allowed)
3. **Batch Validation**: Separates valid from invalid files
4. **User Feedback**: Clear error messages for validation failures

### Error Messages

```
"File exceeds maximum limit of 10 MB"
"Failed to process files. Please try again."
"Failed to read file"
```

## Testing

### Test Coverage

- **FileAttachmentService**: 18 test cases covering all utility methods
- **FileAttachmentInputComponent**: 25 test cases for drag-drop, validation, and UI
- **FileAttachmentPreviewComponent**: 20 test cases for rendering and interactions

### Running Tests

```bash
# Run all tests
npm run test

# Run specific test file
npm run test -- file-attachment.service.spec.ts

# Run with coverage
npm run test:coverage
```

### Test Examples

```typescript
// Service test
it('should format file size correctly', () => {
  expect(service.formatFileSize(1024)).toBe('1 KB');
  expect(service.formatFileSize(1024 * 1024)).toBe('1 MB');
});

// Component test
it('should emit filesSelected event with selected files', (done) => {
  component.filesSelected.subscribe(files => {
    expect(files.length).toBe(1);
    done();
  });
  component.submitFiles();
});
```

## Browser Compatibility

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support (iOS 13+)
- Mobile browsers: Full support (touch-optimized)

## Performance Considerations

- **File Size Formatting**: O(1) operation using logarithmic calculation
- **Duplicate Detection**: O(n) using Map-based deduplication
- **Drag & Drop**: Event debouncing to prevent excessive state updates
- **Memory Usage**: Base64 conversion only for required operations

## Future Enhancements

1. **Chunked Uploads**: For files larger than current limit
2. **Progress Indicators**: Real-time upload progress display
3. **Image Thumbnails**: Preview images directly in chat
4. **Virus Scanning**: Integration with antivirus services
5. **File Encryption**: End-to-end encryption for sensitive files
6. **Compression**: Automatic compression for large files
7. **Cloud Storage**: Integration with AWS S3, Google Cloud Storage
8. **Expiration**: Automatic file expiration after set period

## Troubleshooting

### Files not uploading
- Check file size (must be < 10 MB)
- Verify browser supports Fetch API
- Check network connectivity

### Drag & drop not working
- Ensure component is properly imported
- Check for CSS that might prevent drop events
- Verify event handlers are bound correctly

### File icon not displaying
- Check file extension is in FILE_CATEGORIES
- Verify emoji support in browser
- Fall back to default icon if needed

## API Reference

### FileAttachmentService Methods

```typescript
// Get file information
getFileExtension(fileName: string): string
getFileCategory(fileName: string): string
getFileIcon(fileName: string): string
getFileCategoryLabel(fileName: string): string

// Format data
formatFileSize(bytes: number): string

// Validate files
isFileSizeValid(file: File): boolean
getFileSizeErrorMessage(file: File): string
validateFiles(files: File[]): { valid: File[], errors: string[] }

// File operations
extractFileMetadata(file: File): FileMetadata
createDownloadLink(url: string, fileName: string): void
fileToBase64(file: File): Promise<string>
```

## License

Part of D-Chat feature, follows project licensing.

## Support

For issues or feature requests, refer to the main project repository issues section.
