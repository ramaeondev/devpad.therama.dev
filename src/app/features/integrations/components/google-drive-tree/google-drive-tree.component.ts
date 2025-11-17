import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GoogleDriveService } from '../../../../core/services/google-drive.service';
import { GoogleDriveFolder, GoogleDriveFile } from '../../../../core/models/integration.model';
import { NoteService } from '../../../../core/services/note.service';
import { AuthStateService } from '../../../../core/services/auth-state.service';
import { ToastService } from '../../../../core/services/toast.service';
import { WorkspaceStateService } from '../../../../core/services/workspace-state.service';
import { FolderService } from '../../../folders/services/folder.service';
import { PropertiesModalComponent, PropertyItem } from '../../../../shared/components/ui/properties-modal/properties-modal.component';

@Component({
  selector: 'app-google-drive-tree',
  standalone: true,
  imports: [CommonModule, PropertiesModalComponent],
  template: `
    <div class="google-drive-tree-container">
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
            <!-- Root Folder Accordion Header -->
            <div 
              class="flex items-center justify-between mb-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-lg p-2 -mx-2 transition-colors"
              (click)="toggleRootFolder()"
            >
              <div class="flex items-center gap-2">
                <span class="text-lg">{{ isRootExpanded() ? '📂' : '📁' }}</span>
                <h3 class="font-semibold text-gray-900 dark:text-gray-100">{{ root.name }}</h3>
                <span class="text-xs text-gray-500 dark:text-gray-400">
                  {{ root.files.length + root.folders.length }} items
                </span>
              </div>
              <button
                (click)="googleDrive.loadFiles(); $event.stopPropagation()"
                class="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                title="Refresh"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                </svg>
              </button>
            </div>
            
            <!-- Root Folder Content -->
            @if (isRootExpanded()) {
              <div class="space-y-1">
                <ng-container *ngTemplateOutlet="folderTemplate; context: { $implicit: root, level: 0 }"></ng-container>
              </div>
            }
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
        <div 
          class="file-item group" 
          [style.padding-left.rem]="level * 1.5"
        >
          <div class="flex items-center gap-2 flex-1 min-w-0 cursor-pointer" (click)="onFileClick(file)">
            <span class="text-base flex-shrink-0">{{ getFileIcon(file) }}</span>
            <span class="flex-1 truncate text-gray-900 dark:text-gray-100">{{ file.name }}</span>
          </div>
          
          <!-- Kebab Menu -->
          <div class="relative flex-shrink-0">
            <button
              (click)="toggleFileMenu(file.id); $event.stopPropagation()"
              class="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors opacity-0 group-hover:opacity-100"
              [class.opacity-100]="openMenuId() === file.id"
            >
              <svg class="w-4 h-4 text-gray-600 dark:text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="5" r="2"/>
                <circle cx="12" cy="12" r="2"/>
                <circle cx="12" cy="19" r="2"/>
              </svg>
            </button>
            
            @if (openMenuId() === file.id) {
              <div class="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20">
                <button
                  (click)="handleDownload(file); $event.stopPropagation()"
                  class="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-2 rounded-t-lg"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                  </svg>
                  <span>Download</span>
                </button>
                
                <button
                  (click)="handleImportToDevPad(file); $event.stopPropagation()"
                  class="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
                  </svg>
                  <span>Import to DevPad</span>
                </button>
                
                <button
                  (click)="handleRename(file); $event.stopPropagation()"
                  class="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
                  </svg>
                  <span>Rename</span>
                </button>
                
                <div class="border-t border-gray-200 dark:border-gray-700"></div>
                
                <button
                  (click)="handleProperties(file); $event.stopPropagation()"
                  class="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  <span>Properties</span>
                </button>
                
                <div class="border-t border-gray-200 dark:border-gray-700"></div>
                
                <button
                  (click)="handleDelete(file); $event.stopPropagation()"
                  class="w-full text-left px-3 py-2 text-sm hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 transition-colors flex items-center gap-2 rounded-b-lg"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                  </svg>
                  <span>Delete</span>
                </button>
              </div>
            }
          </div>
        </div>
      }
    </ng-template>

    <!-- Properties Modal -->
    <app-properties-modal
      [isOpen]="showPropertiesModal()"
      [title]="propertiesModalTitle()"
      [properties]="propertiesModalData()"
      (onClose)="closePropertiesModal()"
    />
  `,
  styles: [
    `
      .google-drive-tree-container {
        @apply bg-transparent;
      }

      .folder-item {
        @apply py-2 px-3 rounded hover:bg-gray-100 dark:hover:bg-gray-700/50 cursor-pointer transition-colors;
      }

      .file-item {
        @apply py-1.5 px-3 text-sm rounded hover:bg-gray-50 dark:hover:bg-gray-800/50 flex items-center gap-2 justify-between transition-colors;
      }
    `,
  ],
})
export class GoogleDriveTreeComponent implements OnInit {
  googleDrive = inject(GoogleDriveService);
  private noteService = inject(NoteService);
  private auth = inject(AuthStateService);
  private toast = inject(ToastService);
  private workspaceState = inject(WorkspaceStateService);
  private folderService = inject(FolderService);

  expandedFolders = signal<Set<string>>(new Set());
  openMenuId = signal<string | null>(null);
  isRootExpanded = signal<boolean>(true);
  showPropertiesModal = signal<boolean>(false);
  propertiesModalTitle = signal<string>('Properties');
  propertiesModalData = signal<PropertyItem[]>([]);

  async ngOnInit() {
    await this.googleDrive.checkConnection();
  }

  toggleRootFolder() {
    this.isRootExpanded.update(v => !v);
  }

  async connectGoogleDrive() {
    await this.googleDrive.connect();
  }

  onFileClick(file: GoogleDriveFile) {
    console.log('Google Drive file clicked:', file);
    this.workspaceState.emitGoogleDriveFileSelected(file);
  }

  toggleFileMenu(fileId: string) {
    if (this.openMenuId() === fileId) {
      this.openMenuId.set(null);
    } else {
      this.openMenuId.set(fileId);
    }
  }

  async handleDownload(file: GoogleDriveFile) {
    this.openMenuId.set(null);
    try {
      const blob = await this.googleDrive.downloadFile(file.id, file.mimeType);
      if (!blob) return;

      // Determine file name with correct extension
      let fileName = file.name;
      const exportExtensions: Record<string, string> = {
        'application/vnd.google-apps.document': '.docx',
        'application/vnd.google-apps.spreadsheet': '.xlsx',
        'application/vnd.google-apps.presentation': '.pptx',
        'application/vnd.google-apps.drawing': '.png',
      };

      if (exportExtensions[file.mimeType]) {
        const ext = exportExtensions[file.mimeType];
        if (!fileName.endsWith(ext)) {
          fileName += ext;
        }
      }

      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      this.toast.success(`Downloaded ${fileName}`);
    } catch (error) {
      console.error('Download error:', error);
      this.toast.error('Failed to download file');
    }
  }

  async handleImportToDevPad(file: GoogleDriveFile) {
    this.openMenuId.set(null);
    try {
      const userId = this.auth.userId();
      
      // Find or create "Imports" folder
      const folders = await this.folderService.getFolders(userId);
      let importsFolder = folders.find((f: any) => f.name === 'Imports' && !f.parent_id);
      
      if (!importsFolder) {
        importsFolder = await this.folderService.createFolder(userId, {
          name: 'Imports',
          parent_id: null,
        });
      }

      // Download file from Google Drive
      const blob = await this.googleDrive.downloadFile(file.id, file.mimeType);
      if (!blob) return;

      // Determine file name with correct extension
      let fileName = file.name;
      const exportExtensions: Record<string, string> = {
        'application/vnd.google-apps.document': '.docx',
        'application/vnd.google-apps.spreadsheet': '.xlsx',
        'application/vnd.google-apps.presentation': '.pptx',
        'application/vnd.google-apps.drawing': '.png',
      };

      if (exportExtensions[file.mimeType]) {
        const ext = exportExtensions[file.mimeType];
        if (!fileName.endsWith(ext)) {
          fileName += ext;
        }
      }

      // Create File object and upload to DevPad
      const fileObj = new File([blob], fileName, { type: blob.type });
      await this.noteService.uploadDocument(userId, fileObj, importsFolder.id);

      this.toast.success(`Imported ${fileName} to DevPad`);
    } catch (error) {
      console.error('Import error:', error);
      this.toast.error('Failed to import file');
    }
  }

  async handleRename(file: GoogleDriveFile) {
    this.openMenuId.set(null);
    const newName = prompt('Enter new name:', file.name);
    if (!newName || newName === file.name) return;

    await this.googleDrive.renameFile(file.id, newName);
  }

  async handleDelete(file: GoogleDriveFile) {
    this.openMenuId.set(null);
    if (!confirm(`Are you sure you want to delete "${file.name}"?`)) return;

    await this.googleDrive.deleteFile(file.id);
  }

  handleProperties(file: GoogleDriveFile) {
    this.openMenuId.set(null);
    const sizeInMB = file.size ? (parseInt(file.size) / (1024 * 1024)).toFixed(2) : 'Unknown';
    const modifiedDate = file.modifiedTime ? new Date(file.modifiedTime).toLocaleString() : 'Unknown';
    
    const properties: PropertyItem[] = [
      { label: 'Name', value: file.name, icon: '📄' },
      { label: 'Type', value: file.mimeType, icon: '🏷️' },
      { label: 'Size', value: `${sizeInMB} MB`, icon: '💾' },
      { label: 'Modified', value: modifiedDate, icon: '📅' },
      { label: 'File ID', value: file.id, icon: '🔑' },
    ];
    
    this.propertiesModalTitle.set('Google Drive File Properties');
    this.propertiesModalData.set(properties);
    this.showPropertiesModal.set(true);
  }

  closePropertiesModal() {
    this.showPropertiesModal.set(false);
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
      const blob = await this.googleDrive.downloadFile(file.id, file.mimeType);
      if (!blob) return;

      // Determine the correct file extension based on exported format
      let fileName = file.name;
      const exportExtensions: Record<string, string> = {
        'application/vnd.google-apps.document': '.docx',
        'application/vnd.google-apps.spreadsheet': '.xlsx',
        'application/vnd.google-apps.presentation': '.pptx',
        'application/vnd.google-apps.drawing': '.png',
      };

      // Add extension if it's a Google Workspace file
      if (file.mimeType && exportExtensions[file.mimeType]) {
        const ext = exportExtensions[file.mimeType];
        if (!fileName.endsWith(ext)) {
          fileName += ext;
        }
      }

      // Create a note in local storage with the file
      const userId = this.auth.userId();
      const fileObj = new File([blob], fileName, { type: blob.type });

      await this.noteService.uploadDocument(userId, fileObj, null);
      this.toast.success(`${fileName} downloaded to local storage`);
    } catch (error) {
      console.error('Failed to download file:', error);
      this.toast.error('Failed to download file');
    }
  }
}
