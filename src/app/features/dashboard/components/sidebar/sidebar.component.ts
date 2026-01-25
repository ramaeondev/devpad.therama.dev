import { Component, OnInit, inject, signal } from '@angular/core';

import { RouterModule } from '@angular/router';
import { FolderTreeComponent } from '../../../folders/components/folder-tree/folder-tree.component';
import { GoogleDriveTreeComponent } from '../../../integrations/components/google-drive-tree/google-drive-tree.component';
import { FolderService } from '../../../folders/services/folder.service';
import { AuthStateService } from '../../../../core/services/auth-state.service';
import { FolderTree } from '../../../../core/models/folder.model';
import { Note } from '../../../../core/models/note.model';
import { WorkspaceStateService } from '../../../../core/services/workspace-state.service';
import { OneDriveTreeComponent } from '../../../integrations/components/onedrive-tree/onedrive-tree.component';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterModule, FolderTreeComponent, GoogleDriveTreeComponent, OneDriveTreeComponent],
  template: `
    <aside
      class="sidebar w-64 sm:w-72 md:w-80 lg:w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 h-full overflow-y-auto touch-pan-y"
    >
      <div class="p-3 sm:p-4">
        <!-- D-Chat Button (Retro Style) -->
        <div class="mb-4">
          <a
            routerLink="/d-chat"
            routerLinkActive="active"
            class="retro-chat-btn flex items-center gap-3 px-4 py-3 rounded-lg transition-all hover:shadow-lg"
            role="button"
            aria-label="Open D-Chat retro chat application"
          >
            <div class="retro-icon">
              <i class="fa-solid fa-comments text-xl" aria-hidden="true"></i>
            </div>
            <div class="flex-1">
              <div class="font-bold text-sm retro-title">D-CHAT</div>
              <div class="text-xs retro-subtitle">Retro Chat</div>
            </div>
            <i class="fa-solid fa-chevron-right retro-arrow" aria-hidden="true"></i>
          </a>
        </div>

        <!-- Header -->
        <div class="flex items-center justify-between mb-3 sm:mb-4">
          <h2 class="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">Folders</h2>
          <button
            class="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors"
            (click)="reloadFolders()"
            title="Refresh Folders"
          >
            <i class="fa-solid fa-rotate-right text-sm"></i>
          </button>
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
            <p class="text-sm text-gray-500 dark:text-gray-400">No folders yet</p>
            <button class="btn btn-sm btn-primary mt-4" (click)="loadFolders()">Refresh</button>
          </div>
        }

        <!-- Divider -->
        <div class="my-4 border-t border-gray-200 dark:border-gray-700"></div>

        <!-- Google Drive Integration -->
        <div>
          <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 px-1">
            Cloud Storage
          </h3>
          <app-google-drive-tree />
          <app-onedrive-tree />
        </div>

        <!-- Settings Link (open from header avatar menu) -->
      </div>
    </aside>
  `,
  styles: [
    `
      .sidebar {
        @apply flex flex-col;
      }

      .retro-chat-btn {
        background: linear-gradient(135deg, #0a0e27 0%, #151933 100%);
        border: 2px solid #00ff41;
        color: #00ff41;
        position: relative;
        overflow: hidden;
        text-decoration: none;
        display: flex;

        &::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(0, 255, 65, 0.2), transparent);
          transition: left 0.5s;
        }

        &:hover::before {
          left: 100%;
        }

        &:hover {
          border-color: #ffb000;
          box-shadow: 0 0 20px rgba(0, 255, 65, 0.5);
        }

        &.active {
          border-color: #ffb000;
          box-shadow: 0 0 20px rgba(255, 176, 0, 0.5);

          .retro-title {
            color: #ffb000;
          }
        }
      }

      .retro-icon {
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(0, 255, 65, 0.1);
        border: 1px solid #00ff41;
        border-radius: 4px;
      }

      .retro-title {
        font-family: 'Courier New', monospace;
        letter-spacing: 0.15rem;
        text-shadow: 0 0 10px rgba(0, 255, 65, 0.5);
      }

      .retro-subtitle {
        font-family: 'Courier New', monospace;
        color: #4a9c5a;
        letter-spacing: 0.05rem;
      }

      .retro-arrow {
        color: #ffb000;
        transition: transform 0.3s;
      }

      .retro-chat-btn:hover .retro-arrow {
        transform: translateX(4px);
      }
    `,
  ],
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
    // Reload folders when other parts of the app signal changes (e.g., note created from center)
    this.workspaceState.foldersChanged$.subscribe(() => {
      this.reloadFolders();
    });
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
