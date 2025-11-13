import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FolderTreeComponent } from '../../../folders/components/folder-tree/folder-tree.component';
import { FolderService } from '../../../folders/services/folder.service';
import { AuthStateService } from '../../../../core/services/auth-state.service';
import { FolderTree } from '../../../../core/models/folder.model';
import { Note } from '../../../../core/models/note.model';
import { WorkspaceStateService } from '../../../../core/services/workspace-state.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, FolderTreeComponent],
  template: `
    <aside class="sidebar w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 h-full overflow-y-auto">
      <div class="p-4">
        <!-- Header -->
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
            Folders
          </h2>
        </div>

        <!-- Loading State -->
        @if (loading()) {
          <div class="flex items-center justify-center py-8">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        }

        <!-- Folder Tree -->
        @if (!loading() && folderTree().length > 0) {
          <app-folder-tree
            [folders]="folderTree()"
            [selectedFolderId]="selectedFolderId()"
            (folderSelected)="onFolderSelected($event)"
            (folderMore)="onFolderMore($event)"
            (treeChanged)="reloadFolders()"
            (noteSelected)="onNoteSelected($event)"
          />
        }

        <!-- Empty State -->
        @if (!loading() && folderTree().length === 0) {
          <div class="text-center py-8">
            <p class="text-sm text-gray-500 dark:text-gray-400">
              No folders yet
            </p>
            <button 
              class="btn btn-sm btn-primary mt-4"
              (click)="loadFolders()"
            >
              Refresh
            </button>
          </div>
        }
      </div>
    </aside>
  `,
  styles: [`
    .sidebar {
      @apply flex flex-col;
    }
  `]
})
export class SidebarComponent implements OnInit {
  private folderService = inject(FolderService);
  private authState = inject(AuthStateService);
  private workspaceState = inject(WorkspaceStateService);

  folderTree = signal<FolderTree[]>([]);
  selectedFolderId = signal<string | undefined>(undefined);
  loading = signal(false);

  async ngOnInit() {
    await this.loadFolders();
  }

  async loadFolders() {
    const userId = this.authState.userId();
    if (!userId) return;

    this.loading.set(true);
    try {
      const tree = await this.folderService.getFolderTree(userId);
      this.folderTree.set(tree);
    } catch (error) {
      console.error('Error loading folders:', error);
    } finally {
      this.loading.set(false);
    }
  }

  async reloadFolders() {
    await this.loadFolders();
  }

  onFolderSelected(folder: FolderTree) {
    this.selectedFolderId.set(folder.id);
    this.workspaceState.setSelectedFolder(folder.id);
    // Navigate to folder view or filter notes by folder
    console.log('Folder selected:', folder);
  }

  onFolderMore(folder: FolderTree) {
    // Show context menu with options:
    // - Rename folder
    // - Delete folder
    // - Change color/icon
    // - Create subfolder
    console.log('Show more options for:', folder);
  }

  onCreateFolder() {
    // Show create folder dialog
    console.log('Create new folder');
  }

  onNoteSelected(note: Note) {
    // Sync selected folder and broadcast selection to workspace
    this.selectedFolderId.set(note.folder_id || undefined);
    this.workspaceState.setSelectedFolder(note.folder_id ?? null);
    this.workspaceState.emitNoteSelected(note);
  }
}
