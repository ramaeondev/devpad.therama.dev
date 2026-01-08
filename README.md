# DevPad

Modern, standalone-component based note-taking application built with Angular 20, Signals, Tailwind CSS, and Supabase.

## 🚀 Features & Functionality

- **Notes & Markdown**: Create, edit, and organize notes with full Markdown support, including code blocks, tables, images, and checklists.
- **Folder Organization**: Hierarchical folder structure for organizing notes, drag-and-drop support, and folder actions (rename, delete, move).
- **Real-Time Sync**: All notes and folders are synced instantly across devices using Supabase backend.
- **Cloud Integrations**: Connect and browse files from Google Drive and OneDrive, import documents, and preview cloud files directly in DevPad.
- **Document Preview**: Inline preview for PDFs, images, Office documents, audio, and video files. Unsupported files show type-aware icons.
- **Search & Filter**: Fast search and filtering for notes and folders, including full-text search and tag support.
- **User Authentication**: Secure login/signup with Supabase Auth, password reset, and email confirmation flows.
- **Sharing & Collaboration**: Share notes with others, copy links, and manage access (coming soon).
- **Accessibility**: Fully keyboard navigable, screen reader support, and high-contrast themes (WCAG 2.1 AA compliant).
- **Mobile Friendly**: Responsive layouts, touch-friendly controls, and optimized for mobile/tablet/desktop.
- **Customizable Themes**: Light/dark mode, system theme detection, and manual toggle.
- **Notifications & Toasts**: User feedback for actions, errors, and sync status.
- **Performance**: Lazy loading, OnPush change detection, and optimized bundle size for fast load times.
- **Security**: All data is encrypted in transit, no secrets or credentials stored in the client.
- **Open Source**: MIT licensed, easy to contribute and extend.

## 📦 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm start
```

## 🖼️ Icon System

- All document/file type icons are rendered using Font Awesome CDN (`<i class="fa-solid ...">`).
- No local SVG or PNG icon assets are used; all previous custom icons have been removed.

## 🛠️ Tech Stack

- Angular 20 (Standalone Components)
- Angular Signals
- Tailwind CSS 4.x
- Supabase
- TypeScript 5.9

## 📝 License

MIT - Ramaeon © 2025
