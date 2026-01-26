# Document Viewer Component

A reusable Angular component for previewing documents with iframe support.

## Features

- **Iframe Preview**: Supports PDF and Office document preview in iframes
- **Image Display**: Direct display of images (JPG, PNG, GIF, WebP, SVG)
- **File Type Detection**: Automatic file type detection and appropriate icons
- **Download Support**: Optional download button for documents
- **Loading States**: Built-in loading indicators
- **Responsive Design**: Works on all screen sizes with Tailwind CSS
- **Dark Mode**: Full dark mode support

## Usage

```typescript
import { DocumentViewerComponent } from './shared/components/ui/document-viewer/document-viewer';

// In your component
<app-document-viewer
  [documentUrl]="documentUrl"
  [title]="documentTitle"
  [showDownloadButton]="true">
</app-document-viewer>
```

## Inputs

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `documentUrl` | `string \| null` | `null` | URL of the document to preview |
| `title` | `string \| null` | `null` | Title to display for the document |
| `showDownloadButton` | `boolean` | `true` | Whether to show the download button |

## Supported File Types

### Iframe Preview (Recommended)
- PDF (.pdf)
- Word Documents (.doc, .docx)
- Excel Spreadsheets (.xls, .xlsx)
- PowerPoint Presentations (.ppt, .pptx)
- Text Files (.txt)
- Google Docs/Drive URLs

### Direct Display
- Images (.jpg, .jpeg, .png, .gif, .webp, .svg)

### Download Only
- Videos (.mp4, .avi, .mov)
- Audio (.mp3, .wav)
- Archives (.zip, .rar)
- Other file types

## Example Usage

```typescript
// PDF Preview
<app-document-viewer
  documentUrl="https://example.com/document.pdf"
  title="Annual Report 2024"
  [showDownloadButton]="true">
</app-document-viewer>

// Image Display
<app-document-viewer
  documentUrl="https://example.com/photo.jpg"
  title="Company Logo"
  [showDownloadButton]="false">
</app-document-viewer>

// Office Document
<app-document-viewer
  documentUrl="https://example.com/presentation.pptx"
  title="Q4 Presentation">
</app-document-viewer>
```

## Security

The component uses Angular's `DomSanitizer` to safely bypass security restrictions for iframe URLs. Only trusted URLs should be passed to this component.</content>
<parameter name="filePath">/Users/ramu/Documents/GitHub/devpad.therama.dev/src/app/shared/components/ui/document-viewer/README.md