import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OneDriveService } from '../../../../core/services/onedrive.service';
import { OneDriveFolder, OneDriveFile } from '../../../../core/models/integration.model';
import { NoteService } from '../../../../core/services/note.service';
import { AuthStateService } from '../../../../core/services/auth-state.service';
import { ToastService } from '../../../../core/services/toast.service';

@Component({
  selector: 'app-onedrive-tree',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="onedrive-tree">
      @if (!oneDrive.isConnected()) {
        <div class="text-center py-8">
          <div class="text-gray-500 dark:text-gray-400 mb-4">
            <svg class="w-16 h-16 mx-auto mb-2" fill="currentColor" viewBox="0 0 24 24">
              <path d="M13.98 3.37A6.5 6.5 0 0 0 7.5 9.5a6.5 6.5 0 0 0 .1 1.13A5.73 5.73 0 0 0 0 16.5C0 19.54 2.46 22 5.5 22h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96A6.5 6.5 0 0 0 13.98 3.37z"/>
            </svg>
            <p>OneDrive not connected</p>
          </div>
          <button
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            (click)="connectOneDrive()"
          >
            Connect OneDrive
          </button>
        </div>
      } @else {
        @if (oneDrive.rootFolder(); as root) {
          <div class="p-4">
            <div class="flex items-center justify-between mb-4">
              <h3 class="font-semibold text-gray-900 dark:text-gray-100">{{ root.name }}</h3>
              <button
                class="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                (click)="oneDrive.loadFiles()"
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
          <span class="text-xs text-gray-500 dark:text-gray-400 mr-2">
            {{ formatFileSize(file.size) }}
          </span>
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
      .onedrive-tree {
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
export class OneDriveTreeComponent implements OnInit {
  oneDrive = inject(OneDriveService);
  private noteService = inject(NoteService);
  private auth = inject(AuthStateService);
  private toast = inject(ToastService);

  expandedFolders = signal<Set<string>>(new Set());

  async ngOnInit() {
    await this.oneDrive.checkConnection();
  }

  async connectOneDrive() {
    await this.oneDrive.connect();
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

  getFileIcon(file: OneDriveFile): string {
    const name = file.name.toLowerCase();
    const mimeType = file.mimeType?.toLowerCase() || '';

    if (file.isFolder) return '📁';
    if (name.endsWith('.docx') || name.endsWith('.doc')) return '📝';
    if (name.endsWith('.xlsx') || name.endsWith('.xls')) return '📊';
    if (name.endsWith('.pptx') || name.endsWith('.ppt')) return '📽️';
    if (name.endsWith('.pdf')) return '📄';
    if (mimeType.includes('image') || /\.(jpg|jpeg|png|gif|bmp|svg)$/.test(name)) return '🖼️';
    if (mimeType.includes('video') || /\.(mp4|mov|avi|wmv)$/.test(name)) return '🎬';
    if (mimeType.includes('audio') || /\.(mp3|wav|ogg|m4a)$/.test(name)) return '🎵';
    if (name.endsWith('.zip') || name.endsWith('.rar')) return '📦';
    if (name.endsWith('.txt')) return '📋';
    return '📄';
  }

  formatFileSize(bytes?: number): string {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }

  async downloadToLocal(file: OneDriveFile) {
    try {
      const blob = await this.oneDrive.downloadFile(file.id);
      if (!blob) return;

      // Create a note in local storage with the file
      const userId = this.auth.userId();
      const fileObj = new File([blob], file.name, { type: file.mimeType || 'application/octet-stream' });

      await this.noteService.uploadDocument(userId, fileObj, null);
      this.toast.success(`${file.name} downloaded to local storage`);
    } catch (error) {
      console.error('Failed to download file:', error);
      this.toast.error('Failed to download file');
    }
  }
}
