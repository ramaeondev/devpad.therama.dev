import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconDirective, FileSizeDirective } from '../../../../shared/directives';
import { getIconNameFromNameAndMime } from '../../../../shared/utils/file-type.util';
import { OneDriveService } from '../../../../core/services/onedrive.service';
import { OneDriveFile } from '../../../../core/models/integration.model';
import { NoteService } from '../../../../core/services/note.service';
import { AuthStateService } from '../../../../core/services/auth-state.service';
import { ToastService } from '../../../../core/services/toast.service';
@Component({
  selector: 'app-onedrive-tree',
  standalone: true,
  imports: [CommonModule, IconDirective, FileSizeDirective],
  template: `
    <div class="onedrive-tree">
      @if (!oneDrive.isConnected()) {
        <div class="text-center py-8">
          <div class="text-gray-500 dark:text-gray-400 mb-4">
            <i class="fa-brands fa-microsoft text-6xl"></i>
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
                <i class="fa-solid fa-rotate-right text-base"></i>
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
          <span class="w-5 h-5 text-gray-600 dark:text-gray-300 flex-shrink-0" appIcon [appIcon]="getFileIconName(file)" [size]="20"></span>
          <span class="flex-1 truncate text-gray-900 dark:text-gray-100">{{ file.name }}</span>
          <span class="text-xs text-gray-500 dark:text-gray-400 mr-2">
            <span appFileSize [appFileSize]="file.size"></span>
          </span>
          <button
            class="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 px-2 py-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
            (click)="downloadToLocal(file)"
          >
            <i class="fa-solid fa-download text-xs"></i>
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

  getFileIconName(file: OneDriveFile): string {
    return getIconNameFromNameAndMime(file?.name, file?.mimeType);
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
