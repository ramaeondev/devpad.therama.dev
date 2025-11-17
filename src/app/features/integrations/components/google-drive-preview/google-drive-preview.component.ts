import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { GoogleDriveFile } from '../../../../core/models/integration.model';
import { IconDirective, RelativeTimeDirective, FileSizeDirective } from '../../../../shared/directives';
import { IconComponent } from '../../../../shared/components/ui/icon/icon.component';
import { getIconNameFromNameAndMime } from '../../../../shared/utils/file-type.util';


@Component({
  selector: 'app-google-drive-preview',
  standalone: true,
  imports: [CommonModule, IconDirective, RelativeTimeDirective, FileSizeDirective, IconComponent],
  template: `
    <div class="google-drive-preview h-full flex flex-col bg-white dark:bg-gray-900">
      <!-- Header -->
      <div class="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
        <div class="flex items-center gap-3 flex-1">
          <span class="w-6 h-6 text-gray-600 dark:text-gray-300 flex-shrink-0" appIcon [appIcon]="getFileIconName(file)" [size]="24"></span>
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
            <app-icon name="close" [size]="20" class="text-gray-600 dark:text-gray-400"></app-icon>
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
              <span class="w-16 h-16 mx-auto mb-4 text-gray-400 flex-shrink-0" appIcon [appIcon]="getFileIconName(file)" [size]="64"></span>
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
