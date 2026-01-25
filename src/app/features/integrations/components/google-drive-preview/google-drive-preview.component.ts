import { Component, Input, Output, EventEmitter, inject } from '@angular/core';

import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { GoogleDriveFile } from '../../../../core/models/integration.model';
import { RelativeTimeDirective, FileSizeDirective } from '../../../../shared/directives';
import { getIconNameFromNameAndMime } from '../../../../shared/utils/file-type.util';


@Component({
  selector: 'app-google-drive-preview',
  standalone: true,
  imports: [RelativeTimeDirective, FileSizeDirective],
  template: `
    <div class="google-drive-preview h-full flex flex-col bg-white dark:bg-gray-900">
      <!-- Header -->
      <div class="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
        <div class="flex items-center gap-3 flex-1">
          <i class="fa-solid {{ getFileIconName(file) }} w-6 h-6 text-gray-600 dark:text-gray-300 flex-shrink-0" style="font-size:24px;"></i>
          <div class="flex-1">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
              {{ file.name }}
            </h2>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              <span appFileSize [appFileSize]="file.size"></span>
              @if (file.modifiedTime) {
                • Modified <span appRelativeTime [appRelativeTime]="file.modifiedTime"></span>
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
            <i class="fa-solid fa-xmark text-gray-600 dark:text-gray-400 text-xl"></i>
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
              <i class="fa-solid {{ getFileIconName(file) }} w-16 h-16 mx-auto mb-4 text-gray-400 flex-shrink-0" style="font-size:64px;"></i>
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


  get sanitizedUrl(): SafeResourceUrl {
    if (!this.file.webViewLink) return '';
    return this.sanitizer.bypassSecurityTrustResourceUrl(this.file.webViewLink);
  }

  getFileIconName(file: GoogleDriveFile): string {
    return getIconNameFromNameAndMime(file?.name, file?.mimeType);
  }

}
