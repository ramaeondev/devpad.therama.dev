import { Component, Input, signal, inject, OnInit, OnDestroy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer } from '@angular/platform-browser';
import {
  getExtensionFromPath,
  getIconNameFromExt,
  getTypeLabelFromExt,
} from '../../../utils/file-type.util';
import { NoteService } from '../../../../core/services/note.service';
import { AuthStateService } from '../../../../core/services/auth-state.service';
import { ToastService } from '../../../../core/services/toast.service';

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
              <i class="fa-solid fa-spinner fa-spin text-3xl mx-auto mb-4 text-primary-600"></i>
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
            <div class="h-full w-full">
              <iframe
                [src]="safeOfficePreviewUrl()"
                class="w-full h-full border-0"
                [title]="note?.title + ' Preview'"
              ></iframe>
            </div>
          } @else if (isVideo()) {
            <div class="h-full w-full bg-black">
              <iframe
                [src]="safePreviewUrl()"
                class="w-full h-full border-0"
                [title]="note?.title + ' Video'"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowfullscreen
              ></iframe>
            </div>
          } @else if (isAudio()) {
            <div class="h-full w-full">
              <iframe
                [src]="safePreviewUrl()"
                class="w-full h-full border-0"
                [title]="note?.title + ' Audio'"
                allow="autoplay"
              ></iframe>
            </div>
          } @else if (isText()) {
            <div class="h-full w-full">
              <iframe
                [src]="safePreviewUrl()"
                class="w-full h-full border-0 bg-white dark:bg-gray-900"
                [title]="note?.title + ' Text'"
              ></iframe>
            </div>
          } @else {
            <div class="h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-8">
              <div class="text-center max-w-md">
                <i
                  class="fa-solid {{
                    getFileIconName()
                  }} w-16 h-16 mx-auto mb-4 text-gray-400 flex-shrink-0"
                  style="font-size:64px;"
                ></i>
                <h3 class="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  {{ note?.title }}
                </h3>
                <p class="text-gray-600 dark:text-gray-400">
                  This file type is not supported for preview.
                </p>
              </div>
            </div>
          }
        } @else {
          <div class="h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900">
            <div class="text-center">
              <i
                class="fa-solid {{
                  getFileIconName()
                }} w-16 h-16 mx-auto mb-4 text-gray-400 flex-shrink-0"
                style="font-size:64px;"
              ></i>
              <h3 class="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Preview Unavailable
              </h3>
              <p class="text-gray-600 dark:text-gray-400">
                Unable to load preview for this document.
              </p>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [],
})
export class DocumentPreviewComponent implements OnInit, OnDestroy {
  @Input() note: any;

  private noteService = inject(NoteService);
  private authState = inject(AuthStateService);
  private toast = inject(ToastService);
  private sanitizer = inject(DomSanitizer);

  isLoading = signal(false);
  previewUrl = signal<string | null>(null);
  private revokeFn: (() => void) | null = null;
  safePreviewUrl = computed(() => {
    const url = this.previewUrl();
    return url ? this.sanitizer.bypassSecurityTrustResourceUrl(url) : null;
  });

  safeOfficePreviewUrl = computed(() => {
    const url = this.previewUrl();
    if (!url) return null;
    // Use Microsoft Office Online Viewer
    const viewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(viewerUrl);
  });

  ngOnInit() {
    if (this.note) {
      this.loadDocumentPreview();
    }
  }

  ngOnDestroy() {
    // Clean up object URL if it exists
    if (this.revokeFn) {
      this.revokeFn();
      this.revokeFn = null;
    } else {
      const url = this.previewUrl();
      if (url && url.startsWith('blob:')) URL.revokeObjectURL(url);
    }
  }

  private async loadDocumentPreview() {
    if (!this.note?.id) return;

    this.isLoading.set(true);
    try {
      const userId = this.authState.userId();
      if (!userId) throw new Error('User not authenticated');

      // Prefer decrypted blob URL when encrypted; fallback to signed URL internally
      const { url, revoke } = await this.noteService.getFileObjectUrl(this.note.id, userId);
      this.revokeFn = revoke;
      this.previewUrl.set(url);
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

  isVideo(): boolean {
    const ext = this.getFileExtension();
    return ['mp4', 'avi', 'mov'].includes(ext);
  }

  isAudio(): boolean {
    const ext = this.getFileExtension();
    return ['mp3', 'wav'].includes(ext);
  }

  isText(): boolean {
    const ext = this.getFileExtension();
    return ['txt', 'md', 'csv'].includes(ext);
  }
  getFileExtension(): string {
    return getExtensionFromPath(this.note?.content);
  }

  getFileType(): string {
    return getTypeLabelFromExt(this.getFileExtension());
  }

  getFileIconName(): string {
    return getIconNameFromExt(this.getFileExtension());
  }
}
