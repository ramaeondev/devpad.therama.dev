import { Component, Input, signal, inject, OnInit, OnDestroy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
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
    <div class="h-screen flex flex-col bg-white dark:bg-gray-800 relative">
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
            <div class="h-full w-full">
              <iframe
                [src]="safePreviewUrl()"
                class="w-full h-full border-0"
                title="PDF Preview"
              ></iframe>
            </div>
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
                <div class="w-16 h-16 mx-auto mb-4 text-gray-400 flex-shrink-0" [innerHTML]="getFileIcon()"></div>
                <h3 class="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">{{ note?.title }}</h3>
                <p class="text-gray-600 dark:text-gray-400">
                  This {{ getFileType() }} document cannot be previewed directly in the browser.
                </p>
              </div>
            </div>
          } @else {
            <div class="h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-8">
              <div class="text-center max-w-md">
                <div class="text-6xl mb-4">📄</div>
                <h3 class="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">{{ note?.title }}</h3>
                <p class="text-gray-600 dark:text-gray-400">
                  This file type is not supported for preview.
                </p>
              </div>
            </div>
          }
        } @else {
          <div class="h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900">
            <div class="text-center">
              <div class="w-16 h-16 mx-auto mb-4 text-gray-400 flex-shrink-0" [innerHTML]="getFileIcon()"></div>
              <h3 class="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Preview Unavailable</h3>
              <p class="text-gray-600 dark:text-gray-400">
                Unable to load preview for this document.
              </p>
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
  private sanitizer = inject(DomSanitizer);

  isLoading = signal(false);
  previewUrl = signal<string | null>(null);
  safePreviewUrl = computed(() => {
    const url = this.previewUrl();
    return url ? this.sanitizer.bypassSecurityTrustResourceUrl(url) : null;
  });

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

      console.log('Document content:', fullNote.content);

      // Create signed URL for the document
      const path = fullNote.content.replace('storage://notes/', '');
      console.log('Document path:', path);
      
      const { data: urlData, error: urlErr } = await this.supabase.storage
        .from('notes')
        .createSignedUrl(path, 3600); // 1 hour expiry

      if (urlErr || !urlData?.signedUrl) {
        console.error('Signed URL error:', urlErr);
        throw new Error('Failed to create signed URL');
      }

      console.log('Signed URL created:', urlData.signedUrl);
      this.previewUrl.set(urlData.signedUrl);
    } catch (error: any) {
      console.error('Failed to load document preview:', error);
      this.toast.error('Failed to load document preview');
    } finally {
      this.isLoading.set(false);
    }
  }

  openInNewTab() {
    if (this.previewUrl()) {
      window.open(this.previewUrl()!, '_blank');
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
    console.log('Getting icon for extension:', ext);
    
    switch (ext) {
      case 'pdf':
        return `<svg class="w-full h-full fill-current text-red-500" viewBox="0 0 24 24"><path d="M8.5 2H15.5L19 5.5V22H5V2H8.5ZM15 3.5V7H18.5L15 3.5ZM7 4V20H17V9H13V4H7ZM9 12H11V18H9V12ZM13 10H15V18H13V10Z"/></svg>`;
      case 'doc':
      case 'docx':
        return `<svg class="w-full h-full fill-current text-blue-500" viewBox="0 0 24 24"><path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2ZM16 18H8V16H16V18ZM16 14H8V12H16V14ZM13 9V3.5L18.5 9H13Z"/></svg>`;
      case 'xls':
      case 'xlsx':
        return `<svg class="w-full h-full fill-current text-green-500" viewBox="0 0 24 24"><path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2ZM16 18H8V16H16V18ZM16 14H8V12H16V14ZM13 9V3.5L18.5 9H13Z"/></svg>`;
      case 'ppt':
      case 'pptx':
        return `<svg class="w-full h-full fill-current text-orange-500" viewBox="0 0 24 24"><path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2ZM16 18H8V16H16V18ZM16 14H8V12H16V14ZM13 9V3.5L18.5 9H13Z"/></svg>`;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'webp':
        return `<svg class="w-full h-full fill-current text-purple-500" viewBox="0 0 24 24"><path d="M21 19V5C21 3.9 20.1 3 19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19ZM8.5 13.5L11 16.51L14.5 12L19 18H5L8.5 13.5Z"/></svg>`;
      case 'mp4':
      case 'avi':
      case 'mov':
        return `<svg class="w-full h-full fill-current text-pink-500" viewBox="0 0 24 24"><path d="M17 10.5V7C17 6.45 16.55 6 16 6H4C3.45 6 3 6.45 3 7V17C3 17.55 3.45 18 4 18H16C16.55 18 17 17.55 17 17V13.5L21 17.5V6.5L17 10.5Z"/></svg>`;
      case 'mp3':
      case 'wav':
        return `<svg class="w-full h-full fill-current text-indigo-500" viewBox="0 0 24 24"><path d="M12 3V13.55C11.41 13.21 10.73 13 10 13C7.79 13 6 14.79 6 17S7.79 21 10 21 14 19.21 14 17V7H18V3H12Z"/></svg>`;
      case 'zip':
      case 'rar':
        return `<svg class="w-full h-full fill-current text-gray-500" viewBox="0 0 24 24"><path d="M20 6H12L10 4H4C2.9 4 2.01 4.9 2.01 6L2 18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V8C22 6.9 21.1 6 20 6ZM20 18H4V8H20V18Z"/></svg>`;
      default:
        return `<svg class="w-full h-full fill-current text-gray-400" viewBox="0 0 24 24"><path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2ZM16 18H8V16H16V18ZM16 14H8V12H16V14ZM13 9V3.5L18.5 9H13Z"/></svg>`;
    }
  }
}