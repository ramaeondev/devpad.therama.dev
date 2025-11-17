import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GoogleDriveService } from '../../../../core/services/google-drive.service';
import { GoogleDriveFolder, GoogleDriveFile } from '../../../../core/models/integration.model';
import { NoteService } from '../../../../core/services/note.service';
import { AuthStateService } from '../../../../core/services/auth-state.service';
import { ToastService } from '../../../../core/services/toast.service';

@Component({
  selector: 'app-google-drive-tree',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="google-drive-tree">
      @if (!googleDrive.isConnected()) {
        <div class="text-center py-8">
          <div class="text-gray-500 dark:text-gray-400 mb-4">
            <svg class="w-16 h-16 mx-auto mb-2" fill="currentColor" viewBox="0 0 24 24">
              <path d="M7.71 3.5L1.15 15l3.38 5.87L11.1 9.3l-3.38-5.8zm13.14 0l-3.38 5.87L23.85 15l-6.56-11.5zM12 9.3L5.53 20.87h12.94L12 9.3z"/>
            </svg>
            <p>Google Drive not connected</p>
          </div>
          <button
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            (click)="connectGoogleDrive()"
          >
            Connect Google Drive
          </button>
        </div>
      } @else {
        @if (googleDrive.rootFolder(); as root) {
          <div class="p-4">
            <div class="flex items-center justify-between mb-4">
              <h3 class="font-semibold text-gray-900 dark:text-gray-100">{{ root.name }}</h3>
              <button
                class="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                (click)="googleDrive.loadFiles()"
              >
                Refresh
              </button>
            </div>
            <div class="space-y-1">
              <ng-container *ngTemplateOutlet="folderTemplate; context: { $implicit: root, level: 0 }"></ng-container>
            </div>
          </div>
        } @else {
          <div class="text-center py-8 text-gray-500 dark:text-gray-400">Loading...</div>
        }
      }
    </div>

    <!-- Recursive folder template -->
    <ng-template #folderTemplate let-folder let-level="level">
      <!-- Render subfolders -->
      @for (subFolder of folder.folders; track subFolder.id) {
        <div class="folder-item" [style.padding-left.rem]="level * 1.5">
          <div class="flex items-center gap-2" (click)="toggleFolder(subFolder.id)">
            <span class="text-lg">{{ isExpanded(subFolder.id) ? '📂' : '📁' }}</span>
            <span class="flex-1 text-gray-900 dark:text-gray-100">{{ subFolder.name }}</span>
            <span class="text-xs text-gray-500 dark:text-gray-400">
              {{ subFolder.files.length + subFolder.folders.length }} items
            </span>
          </div>
          @if (isExpanded(subFolder.id)) {
            <div class="mt-1">
              <ng-container *ngTemplateOutlet="folderTemplate; context: { $implicit: subFolder, level: level + 1 }"></ng-container>
            </div>
          }
        </div>
      }
      
      <!-- Render files -->
      @for (file of folder.files; track file.id) {
        <div class="file-item" [style.padding-left.rem]="level * 1.5">
          <span class="text-base">{{ getFileIcon(file) }}</span>
          <span class="flex-1 truncate text-gray-900 dark:text-gray-100">{{ file.name }}</span>
          <button
            class="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 px-2 py-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
            (click)="downloadToLocal(file)"
          >
            Download
          </button>
        </div>
      }
    </ng-template>
  `,
  styles: [
    `
      .google-drive-tree {
        @apply bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700;
      }

      .folder-item {
        @apply py-2 px-3 rounded hover:bg-gray-100 dark:hover:bg-gray-700/50 cursor-pointer transition-colors;
      }

      .file-item {
        @apply py-1.5 px-3 text-sm rounded hover:bg-gray-50 dark:hover:bg-gray-800/50 flex items-center gap-2 transition-colors;
      }
    `,
  ],
})
export class GoogleDriveTreeComponent implements OnInit {
  googleDrive = inject(GoogleDriveService);
  private noteService = inject(NoteService);
  private auth = inject(AuthStateService);
  private toast = inject(ToastService);

  expandedFolders = signal<Set<string>>(new Set());

  async ngOnInit() {
    await this.googleDrive.checkConnection();
  }

  async connectGoogleDrive() {
    await this.googleDrive.connect();
  }

  isExpanded(folderId: string): boolean {
    return this.expandedFolders().has(folderId);
  }

  toggleFolder(folderId: string) {
    this.expandedFolders.update((set) => {
      const newSet = new Set(set);
      if (newSet.has(folderId)) {
        newSet.delete(folderId);
      } else {
        newSet.add(folderId);
      }
      return newSet;
    });
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

  async downloadToLocal(file: GoogleDriveFile) {
    try {
      const blob = await this.googleDrive.downloadFile(file.id);
      if (!blob) return;

      // Create a note in local storage with the file
      const userId = this.auth.userId();
      const fileObj = new File([blob], file.name, { type: file.mimeType });

      await this.noteService.uploadDocument(userId, fileObj, null);
      this.toast.success(`${file.name} downloaded to local storage`);
    } catch (error) {
      console.error('Failed to download file:', error);
      this.toast.error('Failed to download file');
    }
  }
}
