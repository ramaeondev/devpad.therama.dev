import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
// import { FileSizeDirective } from '../../../../shared/directives';
import { getIconNameFromNameAndMime } from '../../../../shared/utils/file-type.util';
import { OneDriveService } from '../../../../core/services/onedrive.service';
import { OneDriveFile } from '../../../../core/models/integration.model';
import { NoteService } from '../../../../core/services/note.service';
import { AuthStateService } from '../../../../core/services/auth-state.service';
import { ToastService } from '../../../../core/services/toast.service';
// import { WorkspaceStateService } from '../../../../core/services/workspace-state.service';
import { FolderService } from '../../../folders/services/folder.service';
import { PropertiesModalComponent, PropertyItem } from '../../../../shared/components/ui/properties-modal/properties-modal.component';
import { DropdownComponent } from '../../../../shared/components/ui/dropdown/dropdown.component';

@Component({
  selector: 'app-onedrive-tree',
  standalone: true,
  imports: [CommonModule, PropertiesModalComponent, DropdownComponent],
  template: `
    <div class="onedrive-tree-container p-2">
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
          <div class="folder-item">
            <!-- Root Folder Header -->
            <div class="folder-header flex items-center gap-2 px-2 sm:px-3 py-2.5 sm:py-2 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <div class="flex items-center gap-2 flex-1 min-w-0">
                <span class="text-lg">
                  <i class="fa-brands fa-microsoft text-blue-600"></i>
                </span>
                <h3 class="font-semibold text-gray-700 dark:text-gray-300 flex-1 truncate">{{ root.name }}</h3>
              </div>
              <div class="flex gap-1">
                <button
                  class="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
                  (click)="oneDrive.loadFiles()"
                  title="Refresh"
                >
                  <i class="fa-solid fa-rotate-right text-sm"></i>
                </button>
                <button
                  class="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 dark:text-red-400"
                  (click)="disconnectOneDrive()"
                  title="Disconnect"
                >
                  <i class="fa-solid fa-power-off text-sm"></i>
                </button>
              </div>
            </div>

            <!-- Root Content -->
            <div class="space-y-1 mt-1">
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
      <div [style.padding-left.rem]="level * 1.5">
        <!-- Render subfolders -->
        @for (subFolder of folder.folders; track subFolder.id) {
          <div class="folder-item">
            <div
              class="folder-header flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
              (click)="toggleFolder(subFolder.id)"
            >
              @if (subFolder.folders.length > 0) {
                <button class="expand-btn w-4 h-4 flex items-center justify-center"
                  (click)="toggleFolder(subFolder.id); $event.stopPropagation()">
                  @if (isExpanded(subFolder.id)) {
                    <i class="fa-solid fa-chevron-down text-xs"></i>
                  } @else {
                    <i class="fa-solid fa-chevron-right text-xs"></i>
                  }
                </button>
              } @else {
                <span class="w-4"></span>
              }
              <span class="text-lg text-yellow-500">
                <i class="fa-solid" [ngClass]="isExpanded(subFolder.id) ? 'fa-folder-open' : 'fa-folder'"></i>
              </span>
              <span class="flex-1 text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{{ subFolder.name }}</span>
              <span class="text-xs text-gray-500 dark:text-gray-400">
                {{ subFolder.files.length + subFolder.folders.length }}
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
          <div class="file-item group relative px-2 py-1 rounded cursor-pointer text-xs hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
               (click)="onFileClick(file)">
            <span class="w-4"></span> <!-- Spacer -->
            <i class="fa-solid {{ getFileIconName(file) }} w-4 h-4 text-gray-600 dark:text-gray-300 flex-shrink-0" style="font-size:16px;"></i>
            <span class="flex-1 truncate text-gray-700 dark:text-gray-300" [title]="file.name">{{ file.name }}</span>
            
            <!-- Dropdown Menu -->
            <div class="dropdown-wrapper" (click)="$event.stopPropagation()">
              <app-dropdown align="right">
                <button dropdownTrigger class="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 opacity-0 group-hover:opacity-100 transition-opacity">
                  <i class="fa-solid fa-ellipsis-vertical text-xs"></i>
                </button>
                
                <div dropdownMenu class="text-xs min-w-40">
                  <button class="dropdown-item w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                          (click)="handleDownload(file)">
                    <i class="fa-solid fa-download w-4"></i> Download
                  </button>
                  <button class="dropdown-item w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                          (click)="handleImportToDevPad(file)">
                    <i class="fa-solid fa-file-import w-4"></i> Import to DevPad
                  </button>
                  <button class="dropdown-item w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                          (click)="handleRename(file)">
                    <i class="fa-solid fa-pen w-4"></i> Rename
                  </button>
                  <div class="border-t border-gray-200 dark:border-gray-700 my-1"></div>
                  <button class="dropdown-item w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                          (click)="handleProperties(file)">
                    <i class="fa-solid fa-circle-info w-4"></i> Properties
                  </button>
                  <div class="border-t border-gray-200 dark:border-gray-700 my-1"></div>
                  <button class="dropdown-item w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                          (click)="handleDelete(file)">
                    <i class="fa-solid fa-trash w-4"></i> Delete
                  </button>
                </div>
              </app-dropdown>
            </div>
          </div>
        }
      </div>
    </ng-template>

    <app-properties-modal
      [isOpen]="showPropertiesModal()"
      [title]="propertiesModalTitle()"
      [properties]="propertiesModalData()"
      (onClose)="closePropertiesModal()"
    ></app-properties-modal>
  `,
  styles: [
    `
      .onedrive-tree-container {
        @apply text-sm;
      }
    `,
  ],
})
export class OneDriveTreeComponent implements OnInit {
  oneDrive = inject(OneDriveService);
  private noteService = inject(NoteService);
  private auth = inject(AuthStateService);
  private toast = inject(ToastService);
  // private workspaceState = inject(WorkspaceStateService);
  private folderService = inject(FolderService);

  expandedFolders = signal<Set<string>>(new Set());
  showPropertiesModal = signal<boolean>(false);
  propertiesModalTitle = signal<string>('Properties');
  propertiesModalData = signal<PropertyItem[]>([]);

  async ngOnInit() {
    await this.oneDrive.checkConnection();
  }

  async connectOneDrive() {
    await this.oneDrive.connect();
  }

  async disconnectOneDrive() {
    if (confirm('Are you sure you want to disconnect OneDrive?')) {
      await this.oneDrive.disconnect();
    }
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

  onFileClick(file: OneDriveFile) {
    console.log('OneDrive file clicked:', file);
  }

  async handleDownload(file: OneDriveFile) {
    try {
      const blob = await this.oneDrive.downloadFile(file.id);
      if (!blob) return;

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      this.toast.success(`Downloaded ${file.name}`);
    } catch (error) {
      console.error('Download error:', error);
      this.toast.error('Failed to download file');
    }
  }

  async handleImportToDevPad(file: OneDriveFile) {
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

      // Download file from OneDrive
      const blob = await this.oneDrive.downloadFile(file.id);
      if (!blob) return;

      // Create File object and upload to DevPad
      const fileObj = new File([blob], file.name, { type: file.mimeType || 'application/octet-stream' });
      await this.noteService.uploadDocument(userId, fileObj, importsFolder.id);

      this.toast.success(`Imported ${file.name} to DevPad`);
    } catch (error) {
      console.error('Import error:', error);
      this.toast.error('Failed to import file');
    }
  }

  async handleRename(file: OneDriveFile) {
    const newName = prompt('Enter new name:', file.name);
    if (!newName || newName === file.name) return;

    await this.oneDrive.renameFile(file.id, newName);
  }

  async handleDelete(file: OneDriveFile) {
    if (!confirm(`Are you sure you want to delete "${file.name}"?`)) return;

    await this.oneDrive.deleteFile(file.id);
  }

  handleProperties(file: OneDriveFile) {
    const sizeInMB = file.size ? (file.size / (1024 * 1024)).toFixed(2) : 'Unknown';
    const modifiedDate = file.lastModifiedDateTime ? new Date(file.lastModifiedDateTime).toLocaleString() : 'Unknown';

    const properties: PropertyItem[] = [
      { label: 'Name', value: file.name, icon: '📄' },
      { label: 'Type', value: file.mimeType || 'Unknown', icon: '🏷️' },
      { label: 'Size', value: `${sizeInMB} MB`, icon: '💾' },
      { label: 'Modified', value: modifiedDate, icon: '📅' },
      { label: 'File ID', value: file.id, icon: '🔑' },
    ];

    this.propertiesModalTitle.set('OneDrive File Properties');
    this.propertiesModalData.set(properties);
    this.showPropertiesModal.set(true);
  }

  closePropertiesModal() {
    this.showPropertiesModal.set(false);
  }
}
