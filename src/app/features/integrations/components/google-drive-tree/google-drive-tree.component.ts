import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GoogleDriveService } from '../../../../core/services/google-drive.service';
import { GoogleDriveFile } from '../../../../core/models/integration.model';
import { NoteService } from '../../../../core/services/note.service';
import { AuthStateService } from '../../../../core/services/auth-state.service';
import { ToastService } from '../../../../core/services/toast.service';
import { WorkspaceStateService } from '../../../../core/services/workspace-state.service';
import { FolderService } from '../../../folders/services/folder.service';
import { PropertiesModalComponent, PropertyItem } from '../../../../shared/components/ui/properties-modal/properties-modal.component';
import { IconDirective } from '../../../../shared/directives';
import { GoogleDriveIconPipe } from '../../../../shared/pipes/google-drive-icon.pipe';
import { DropdownComponent } from '../../../../shared/components/ui/dropdown/dropdown.component';

@Component({
  selector: 'app-google-drive-tree',
  standalone: true,
  imports: [CommonModule, PropertiesModalComponent, IconDirective, GoogleDriveIconPipe, DropdownComponent],
  template: `
    <div class="google-drive-tree-container p-2">
      @if (!googleDrive.isConnected()) {
        <div class="text-center py-8">
          <div class="text-gray-500 dark:text-gray-400 mb-4">
            <i class="fa-brands fa-google-drive text-6xl"></i>
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
          <div class="folder-item">
            <!-- Root Folder Accordion Header -->
            <div 
              class="folder-header flex items-center gap-2 px-2 sm:px-3 py-2.5 sm:py-2 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              (click)="toggleRootFolder()"
            >
              <div class="flex items-center gap-2 flex-1 min-w-0">
                <span class="text-lg">{{ isRootExpanded() ? '📂' : '📁' }}</span>
                <h3 class="font-semibold text-gray-700 dark:text-gray-300 flex-1 truncate">{{ root.name }}</h3>
              </div>
              @if (root.files.length + root.folders.length > 0) {
                <span class="notes-count px-2 py-0.5 text-xs rounded-full bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300">
                  {{ root.files.length + root.folders.length }}
                </span>
              }
              <button
                (click)="googleDrive.loadFiles(); $event.stopPropagation()"
                class="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                title="Refresh"
              >
                <i class="fa-solid fa-rotate-right text-base"></i>
              </button>
            </div>
            
            <!-- Root Folder Content -->
            @if (isRootExpanded()) {
              <div class="space-y-1 mt-1">
                <ng-container *ngTemplateOutlet="folderTemplate; context: { $implicit: root, level: 1 }"></ng-container>
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
      <div [style.padding-left.rem]="level * 1.5">
        <!-- Render subfolders -->
        @for (subFolder of folder.folders; track subFolder.id) {
          <div class="folder-item">
            <div class="folder-header flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800" (click)="toggleFolder(subFolder.id)">
              @if (subFolder.folders.length > 0) {
                <button 
                  class="expand-btn w-4 h-4 flex items-center justify-center"
                  (click)="toggleFolder(subFolder.id); $event.stopPropagation()"
                >
                  @if (isExpanded(subFolder.id)) {
                    <i class="fa-solid fa-chevron-down text-xs"></i>
                  } @else {
                    <i class="fa-solid fa-chevron-right text-xs"></i>
                  }
                </button>
              } @else {
                <span class="w-4"></span>
              }
              <span class="text-lg">📂</span>
              <span class="flex-1 text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{{ subFolder.name }}</span>
              @if (subFolder.files.length + subFolder.folders.length > 0) {
                <span class="notes-count px-2 py-0.5 text-xs rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                  {{ subFolder.files.length + subFolder.folders.length }}
                </span>
              }
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
            class="note-row flex items-center gap-2 px-2 py-1 rounded cursor-pointer text-xs hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            (click)="onFileClick(file)"
          >
            <span class="w-4"></span> <!-- Spacer -->
            <span class="note-icon w-4 h-4 pointer-events-none" appIcon [appIcon]="file | googleDriveIcon" [size]="16"></span>
            <span class="truncate flex-1" [title]="file.name">{{ file.name }}</span>
            
            <!-- Kebab Menu -->
            <div class="dropdown-wrapper" (click)="$event.stopPropagation()">
              <app-dropdown align="right">
                <button dropdownTrigger class="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600">
                  <i class="fa-solid fa-ellipsis-vertical text-xs"></i>
                </button>
                <div dropdownMenu class="text-xs">
                  <button class="dropdown-item" (click)="handleDownload(file)">
                    <span>Download</span>
                    <i class="fa-solid fa-download text-xs"></i>
                  </button>
                  <button class="dropdown-item" (click)="handleImportToDevPad(file)">
                    <span>Import to DevPad</span>
                    <i class="fa-solid fa-upload text-xs"></i>
                  </button>
                  <button class="dropdown-item" (click)="handleRename(file)">
                    <span>Rename</span>
                    <i class="fa-solid fa-pen text-xs"></i>
                  </button>
                  <hr class="my-1 border-gray-200 dark:border-gray-700" />
                  <button class="dropdown-item" (click)="handleProperties(file)">
                    <span>Properties</span>
                    <i class="fa-solid fa-circle-info text-xs"></i>
                  </button>
                  <hr class="my-1 border-gray-200 dark:border-gray-700" />
                  <button class="dropdown-item text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30" (click)="handleDelete(file)">
                    <span>Delete</span>
                    <i class="fa-solid fa-trash text-xs"></i>
                  </button>
                </div>
              </app-dropdown>
            </div>
          </div>
        }
      </div>
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
      .folder-item {
        @apply space-y-1;
      }
      .dropdown-item {
        @apply w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between;
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
