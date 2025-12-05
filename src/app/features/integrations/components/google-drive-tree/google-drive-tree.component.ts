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
import { ConfirmModalComponent } from '../../../../shared/components/ui/dialog/confirm-modal.component';
import { GoogleDriveIconPipe } from '../../../../shared/pipes/google-drive-icon.pipe';
import { DropdownComponent } from '../../../../shared/components/ui/dropdown/dropdown.component';

@Component({
  selector: 'app-google-drive-tree',
  standalone: true,
  imports: [CommonModule, PropertiesModalComponent, GoogleDriveIconPipe, DropdownComponent, ConfirmModalComponent],
  templateUrl: './google-drive-tree.component.html',
  styleUrls: ['./google-drive-tree.component.scss'],
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
  showDisconnectConfirm = signal<boolean>(false);
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

  disconnectGoogleDrive() {
    this.showDisconnectConfirm.set(true);
  }

  async onDisconnectConfirm() {
    await this.googleDrive.disconnect();
    this.showDisconnectConfirm.set(false);
  }

  onDisconnectCancel() {
    this.showDisconnectConfirm.set(false);
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
      
      // Refresh DevPad folder tree
      this.workspaceState.emitFoldersChanged();
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
