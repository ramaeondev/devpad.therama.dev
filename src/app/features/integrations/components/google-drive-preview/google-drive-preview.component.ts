import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { GoogleDriveFile } from '../../../../core/models/integration.model';
import { GoogleDriveService } from '../../../../core/services/google-drive.service';
import { ToastService } from '../../../../core/services/toast.service';
import { FolderService } from '../../../folders/services/folder.service';
import { NoteService } from '../../../../core/services/note.service';
import { AuthStateService } from '../../../../core/services/auth-state.service';

@Component({
  selector: 'app-google-drive-preview',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="google-drive-preview h-full flex flex-col bg-white dark:bg-gray-900">
      <!-- Header -->
      <div class="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
        <div class="flex items-center gap-3 flex-1">
          <span class="text-2xl">{{ getFileIcon(file) }}</span>
          <div class="flex-1">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
              {{ file.name }}
            </h2>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              {{ formatFileSize(file.size) }}
              @if (file.modifiedTime) {
                • Modified {{ formatDate(file.modifiedTime) }}
              }
            </p>
          </div>
        </div>
        
        <!-- Actions -->
        <div class="flex items-center gap-2">
          <button
            (click)="onClose.emit()"
            class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <svg class="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Preview -->
      <div class="flex-1 overflow-hidden">
        @if (file.webViewLink) {
          <iframe
            [src]="sanitizedUrl"
            class="w-full h-full border-0"
            title="Google Drive Preview"
          ></iframe>
        } @else {
          <div class="flex items-center justify-center h-full">
            <div class="text-center">
              <svg class="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
              <p class="text-gray-600 dark:text-gray-400">Preview not available</p>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      height: 100%;
    }
  `],
})
export class GoogleDrivePreviewComponent {
  @Input() file!: GoogleDriveFile;
  @Output() onClose = new EventEmitter<void>();
  @Output() onFileAction = new EventEmitter<{ action: string; file: GoogleDriveFile }>();

  private sanitizer = inject(DomSanitizer);
  private googleDrive = inject(GoogleDriveService);
  private toast = inject(ToastService);
  private folderService = inject(FolderService);
  private noteService = inject(NoteService);
  private auth = inject(AuthStateService);

  get sanitizedUrl(): SafeResourceUrl {
    if (!this.file.webViewLink) return '';
    return this.sanitizer.bypassSecurityTrustResourceUrl(this.file.webViewLink);
  }

  getFileIcon(file: GoogleDriveFile): string {
    if (file.mimeType.includes('folder')) return '📁';
    if (file.mimeType.includes('document')) return '📝';
    if (file.mimeType.includes('spreadsheet')) return '📊';
    if (file.mimeType.includes('presentation')) return '📽️';
    if (file.mimeType.includes('pdf')) return '📄';
    if (file.mimeType.includes('image')) return '🖼️';
    return '📄';
  }

  formatFileSize(size?: string | number): string {
    if (!size) return 'Unknown size';
    const sizeNum = typeof size === 'string' ? parseInt(size, 10) : size;
    if (isNaN(sizeNum)) return 'Unknown size';
    if (sizeNum < 1024) return `${sizeNum} B`;
    if (sizeNum < 1024 * 1024) return `${(sizeNum / 1024).toFixed(1)} KB`;
    if (sizeNum < 1024 * 1024 * 1024) return `${(sizeNum / (1024 * 1024)).toFixed(1)} MB`;
    return `${(sizeNum / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    if (days < 365) return `${Math.floor(days / 30)} months ago`;
    return date.toLocaleDateString();
  }
}
