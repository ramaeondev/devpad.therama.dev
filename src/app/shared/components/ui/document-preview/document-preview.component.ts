import { Component, Input, signal, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NoteService } from '../../../../core/services/note.service';
import { AuthStateService } from '../../../../core/services/auth-state.service';
import { ToastService } from '../../../../core/services/toast.service';
import { LoadingService } from '../../../../core/services/loading.service';
import { SupabaseService } from '../../../../core/services/supabase.service';

@Component({
  selector: 'app-document-preview',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="h-full flex flex-col bg-white dark:bg-gray-800">
      <!-- Header -->
      <div class="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 text-gray-600 dark:text-gray-400" [innerHTML]="getFileIcon()"></div>
          <div>
            <h1 class="text-lg font-semibold text-gray-900 dark:text-gray-100">{{ note?.title || 'Untitled' }}</h1>
            <p class="text-sm text-gray-500 dark:text-gray-400">Document Preview</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <button
            (click)="downloadDocument()"
            class="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
            [disabled]="isLoading()"
          >
            @if (isLoading()) {
              <span class="inline-flex items-center gap-2">
                <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Loading...
              </span>
            } @else {
              Download
            }
          </button>
        </div>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-hidden">
        @if (isLoading()) {
          <div class="h-full flex items-center justify-center">
            <div class="text-center">
              <svg class="animate-spin h-8 w-8 mx-auto mb-4 text-primary-600" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p class="text-gray-500 dark:text-gray-400">Loading document...</p>
            </div>
          </div>
        } @else if (previewUrl()) {
          @if (isPdf()) {
            <iframe
              [src]="previewUrl()!"
              class="w-full h-full border-0"
              title="Document Preview"
            ></iframe>
          } @else if (isImage()) {
            <div class="h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
              <img
                [src]="previewUrl()!"
                [alt]="note?.title || 'Document'"
                class="max-w-full max-h-full object-contain rounded-lg shadow-lg"
              />
            </div>
          } @else if (isOfficeDocument()) {
            <div class="h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-8">
              <div class="text-center max-w-md">
                <div class="w-16 h-16 mx-auto mb-4 text-gray-400" [innerHTML]="getFileIcon()"></div>
                <h3 class="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">{{ note?.title }}</h3>
                <p class="text-gray-600 dark:text-gray-400 mb-6">
                  This {{ getFileType() }} document cannot be previewed directly in the browser.
                </p>
                <button
                  (click)="downloadDocument()"
                  class="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
                >
                  Download to View
                </button>
              </div>
            </div>
          } @else {
            <div class="h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-8">
              <div class="text-center max-w-md">
                <div class="text-6xl mb-4">📄</div>
                <h3 class="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">{{ note?.title }}</h3>
                <p class="text-gray-600 dark:text-gray-400 mb-6">
                  This file type is not supported for preview.
                </p>
                <button
                  (click)="downloadDocument()"
                  class="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
                >
                  Download File
                </button>
              </div>
            </div>
          }
        } @else {
          <div class="h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900">
            <div class="text-center">
              <div class="w-16 h-16 mx-auto mb-4 text-gray-400" [innerHTML]="getFileIcon()"></div>
              <h3 class="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Preview Unavailable</h3>
              <p class="text-gray-600 dark:text-gray-400 mb-6">
                Unable to load preview for this document.
              </p>
              <button
                (click)="downloadDocument()"
                class="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
              >
                Download File
              </button>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: []
})
export class DocumentPreviewComponent implements OnInit, OnDestroy {
  @Input() note: any;

  private noteService = inject(NoteService);
  private authState = inject(AuthStateService);
  private toast = inject(ToastService);
  private loading = inject(LoadingService);
  private supabase = inject(SupabaseService);

  isLoading = signal(false);
  previewUrl = signal<string | null>(null);

  ngOnInit() {
    if (this.note) {
      this.loadDocumentPreview();
    }
  }

  ngOnDestroy() {
    // Clean up object URL if it exists
    const url = this.previewUrl();
    if (url && url.startsWith('blob:')) {
      URL.revokeObjectURL(url);
    }
  }

  private async loadDocumentPreview() {
    if (!this.note?.id) return;

    this.isLoading.set(true);
    try {
      const userId = this.authState.userId();
      if (!userId) throw new Error('User not authenticated');

      // Get the full note with content
      const fullNote = await this.noteService.getNote(this.note.id, userId);
      if (!fullNote?.content) throw new Error('Note content not found');

      // Create signed URL for the document
      const path = fullNote.content.replace('storage://notes/', '');
      const { data: urlData, error: urlErr } = await this.supabase.storage
        .from('notes')
        .createSignedUrl(path, 3600); // 1 hour expiry

      if (urlErr || !urlData?.signedUrl) {
        throw new Error('Failed to create signed URL');
      }

      this.previewUrl.set(urlData.signedUrl);
    } catch (error: any) {
      console.error('Failed to load document preview:', error);
      this.toast.error('Failed to load document preview');
    } finally {
      this.isLoading.set(false);
    }
  }

  async downloadDocument() {
    if (!this.note?.id) return;

    try {
      const userId = this.authState.userId();
      if (!userId) throw new Error('User not authenticated');

      // Get the full note with content
      const fullNote = await this.noteService.getNote(this.note.id, userId);
      if (!fullNote?.content) throw new Error('Note content not found');

      // Create signed URL for download
      const path = fullNote.content.replace('storage://notes/', '');
      const { data: urlData, error: urlErr } = await this.supabase.storage
        .from('notes')
        .createSignedUrl(path, 3600);

      if (urlErr || !urlData?.signedUrl) {
        throw new Error('Failed to create download URL');
      }

      // Trigger download
      const link = document.createElement('a');
      link.href = urlData.signedUrl;
      link.download = this.note.title || 'document';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      this.toast.success('Download started');
    } catch (error: any) {
      console.error('Failed to download document:', error);
      this.toast.error('Failed to download document');
    }
  }

  isPdf(): boolean {
    if (!this.note?.content) return false;
    const path = this.note.content.replace('storage://notes/', '');
    return path.toLowerCase().endsWith('.pdf');
  }

  isImage(): boolean {
    if (!this.note?.content) return false;
    const path = this.note.content.replace('storage://notes/', '');
    const ext = path.split('.').pop()?.toLowerCase();
    return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '');
  }

  isOfficeDocument(): boolean {
    if (!this.note?.content) return false;
    const path = this.note.content.replace('storage://notes/', '');
    const ext = path.split('.').pop()?.toLowerCase();
    return ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext || '');
  }

  getFileExtension(): string {
    if (!this.note?.content) return '';
    const path = this.note.content.replace('storage://notes/', '');
    return path.split('.').pop()?.toLowerCase() || '';
  }

  getFileType(): string {
    const ext = this.getFileExtension();
    switch (ext) {
      case 'doc':
      case 'docx': return 'Word';
      case 'xls':
      case 'xlsx': return 'Excel';
      case 'ppt':
      case 'pptx': return 'PowerPoint';
      case 'pdf': return 'PDF';
      case 'txt': return 'Text';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'webp': return 'Image';
      case 'mp4':
      case 'avi':
      case 'mov': return 'Video';
      case 'mp3':
      case 'wav': return 'Audio';
      case 'zip':
      case 'rar': return 'Archive';
      default: return 'Document';
    }
  }

  getFileIcon(): string {
    const ext = this.getFileExtension();
    switch (ext) {
      case 'pdf':
        return `<svg fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd"/></svg>`;
      case 'doc':
      case 'docx':
        return `<svg fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd"/></svg>`;
      case 'xls':
      case 'xlsx':
        return `<svg fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>`;
      case 'ppt':
      case 'pptx':
        return `<svg fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd"/></svg>`;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'webp':
        return `<svg fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clip-rule="evenodd"/></svg>`;
      case 'mp4':
      case 'avi':
      case 'mov':
        return `<svg fill="currentColor" viewBox="0 0 20 20"><path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z"/></svg>`;
      case 'mp3':
      case 'wav':
        return `<svg fill="currentColor" viewBox="0 0 20 20"><path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z"/></svg>`;
      case 'zip':
      case 'rar':
        return `<svg fill="currentColor" viewBox="0 0 20 20"><path d="M4 3a2 2 0 100 4h12a2 2 0 100-4H4z"/><path fill-rule="evenodd" d="M3 8h14v7a2 2 0 01-2 2H5a2 2 0 01-2-2V8zm5 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" clip-rule="evenodd"/></svg>`;
      default:
        return `<svg fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd"/></svg>`;
    }
  }
}