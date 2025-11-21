import {
  Component,
  Input,
  signal,
  inject,
  OnInit,
  OnDestroy,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconDirective } from '../../../../shared/directives';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { getExtensionFromPath, getIconNameFromExt, getTypeLabelFromExt } from '../../../utils/file-type.util';

@Component({
  selector: 'app-document-viewer',
  standalone: true,
  imports: [CommonModule, IconDirective],
  template: `
    <div class="h-full flex flex-col bg-white dark:bg-gray-800">
      <!-- Header -->
      <div
        class="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700"
      >
        <div class="flex items-center gap-3">
          <span
            class="w-8 h-8 text-gray-600 dark:text-gray-400 flex-shrink-0"
            appIcon
            [appIcon]="getFileIconName()"
            [size]="32"
          ></span>
          <div>
            <h1 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {{ title || 'Document Viewer' }}
            </h1>
            <p class="text-sm text-gray-500 dark:text-gray-400">{{ getFileType() }} Preview</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          @if (showDownloadButton) {
            <button
              (click)="downloadDocument()"
              class="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
              [disabled]="isLoading()"
            >
              @if (isLoading()) {
                <span class="inline-flex items-center gap-2">
                  <i class="fa-solid fa-spinner fa-spin"></i>
                  Loading...
                </span>
              } @else {
                Download
              }
            </button>
          }
        </div>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-hidden">
        @if (isLoading()) {
          <div class="h-full flex items-center justify-center">
            <div class="text-center">
              <i class="fa-solid fa-spinner fa-spin text-3xl mx-auto mb-4 text-primary-600"></i>
              <p class="text-gray-500 dark:text-gray-400">Loading document...</p>
            </div>
          </div>
        } @else if (safeUrl()) {
          @if (canPreviewInIframe()) {
            <iframe
              [src]="safeUrl()!"
              class="w-full h-full border-0"
              [title]="title || 'Document Preview'"
              allowfullscreen
            ></iframe>
          } @else if (isImage()) {
            <div class="h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
              <img
                [src]="documentUrl!"
                [alt]="title || 'Document'"
                class="max-w-full max-h-full object-contain rounded-lg shadow-lg"
              />
            </div>
          } @else {
            <div class="h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-8">
              <div class="text-center max-w-md">
                <span
                  class="w-16 h-16 mx-auto mb-4 text-gray-400 flex-shrink-0"
                  appIcon
                  [appIcon]="getFileIconName()"
                  [size]="64"
                ></span>
                <h3 class="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  {{ title || 'Document' }}
                </h3>
                <p class="text-gray-600 dark:text-gray-400 mb-6">
                  This {{ getFileType() }} document cannot be previewed directly in the browser.
                </p>
                @if (showDownloadButton) {
                  <button
                    (click)="downloadDocument()"
                    class="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
                  >
                    Download File
                  </button>
                }
              </div>
            </div>
          }
        } @else {
          <div class="h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900">
            <div class="text-center">
              <span
                class="w-16 h-16 mx-auto mb-4 text-gray-400 flex-shrink-0"
                appIcon
                [appIcon]="getFileIconName()"
                [size]="64"
              ></span>
              <h3 class="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Preview Unavailable
              </h3>
              <p class="text-gray-600 dark:text-gray-400 mb-6">
                Unable to load preview for this document.
              </p>
              @if (showDownloadButton) {
                <button
                  (click)="downloadDocument()"
                  class="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
                >
                  Download File
                </button>
              }
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [],
})
export class DocumentViewerComponent implements OnInit, OnDestroy, OnChanges {
  @Input() documentUrl: string | null = null;
  @Input() title: string | null = null;
  @Input() showDownloadButton = true;

  private sanitizer = inject(DomSanitizer);

  isLoading = signal(false);
  safeUrl = signal<SafeResourceUrl | null>(null);

  ngOnInit() {
    this.updatePreview();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['documentUrl']) {
      this.updatePreview();
    }
  }

  ngOnDestroy() {
    // Clean up if needed
  }

  private updatePreview() {
    if (!this.documentUrl) {
      this.safeUrl.set(null);
      return;
    }

    this.isLoading.set(true);

    try {
      // Sanitize the URL for iframe
      const safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.documentUrl);
      this.safeUrl.set(safeUrl);
    } catch (error) {
      console.error('Failed to create safe URL:', error);
      this.safeUrl.set(null);
    } finally {
      this.isLoading.set(false);
    }
  }

  downloadDocument() {
    if (!this.documentUrl) return;

    try {
      const link = document.createElement('a');
      link.href = this.documentUrl;
      link.download = this.title || 'document';
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Failed to download document:', error);
    }
  }

  canPreviewInIframe(): boolean {
    if (!this.documentUrl) return false;
    const url = this.documentUrl.toLowerCase();

    // Can preview PDFs, some office docs, and other embeddable formats
    return (
      url.includes('.pdf') ||
      url.includes('.doc') ||
      url.includes('.docx') ||
      url.includes('.xls') ||
      url.includes('.xlsx') ||
      url.includes('.ppt') ||
      url.includes('.pptx') ||
      url.includes('.txt') ||
      url.includes('docs.google.com') ||
      url.includes('drive.google.com')
    );
  }

  isImage(): boolean {
    if (!this.documentUrl) return false;
    const url = this.documentUrl.toLowerCase();
    return (
      url.includes('.jpg') ||
      url.includes('.jpeg') ||
      url.includes('.png') ||
      url.includes('.gif') ||
      url.includes('.webp') ||
      url.includes('.svg')
    );
  }

  getFileExtension(): string {
    return getExtensionFromPath(this.documentUrl);
  }

  getFileType(): string {
    return getTypeLabelFromExt(this.getFileExtension());
  }

  getFileIconName(): string {
    return getIconNameFromExt(this.getFileExtension());
  }
}
