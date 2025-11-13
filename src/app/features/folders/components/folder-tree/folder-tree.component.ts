import { Component, Input, Output, EventEmitter, signal, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FolderTree } from '../../../../core/models/folder.model';
import { FolderService } from '../../../folders/services/folder.service';
import { NoteService } from '../../../../core/services/note.service';
import { AuthStateService } from '../../../../core/services/auth-state.service';
import { ToastService } from '../../../../core/services/toast.service';
import { DropdownComponent } from '../../../../shared/components/ui/dropdown/dropdown.component';
import { Router } from '@angular/router';
import { FolderNameModalComponent } from '../../../../shared/components/ui/dialog/folder-name-modal.component';

@Component({
  selector: 'app-folder-tree',
  standalone: true,
  imports: [CommonModule, DropdownComponent, FolderNameModalComponent],
  template: `
    <div class="folder-tree">
      <!-- Name modal -->
      @if (showNameModal()) {
        <app-folder-name-modal
          (cancel)="closeNameModal()"
          (submit)="handleCreateName($event)"
        />
      }
      @for (folder of folders; track folder.id) {
        <div class="folder-item">
          <div 
            class="folder-header flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            [class.bg-gray-100]="selectedFolderId === folder.id"
            [class.dark:bg-gray-800]="selectedFolderId === folder.id"
            (click)="onFolderClick(folder)"
          >
            <!-- Expand/Collapse Icon -->
            @if (folder.children && folder.children.length > 0) {
              <button 
                class="expand-btn w-4 h-4 flex items-center justify-center"
                (click)="toggleExpand(folder.id, $event)"
              >
                @if (isExpanded(folder.id)) {
                  <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"/>
                  </svg>
                } @else {
                  <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"/>
                  </svg>
                }
              </button>
            } @else {
              <span class="w-4"></span>
            }

            <!-- Folder Icon -->
            <span class="folder-icon text-lg">
              {{ folder.icon || (folder.is_root ? '📁' : '📂') }}
            </span>

            <!-- Folder Name / Inline Edit -->
            <span class="folder-name flex-1 text-sm font-medium text-gray-700 dark:text-gray-300" [attr.data-folder-id]="folder.id">
              @if (editingId() === folder.id) {
                <input
                  class="w-full bg-transparent border border-primary-300 dark:border-primary-700 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  [value]="nameDraft()"
                  (input)="onNameInput($event)"
                  (keydown.enter)="commitRename(folder)"
                  (keydown.escape)="cancelRename(folder)"
                  (click)="$event.stopPropagation()"
                  (blur)="commitRename(folder)"
                  autofocus
                />
              } @else {
                {{ folder.name }}
                @if (folder.is_root) {
                  <span class="ml-1 text-xs text-gray-500">(Root)</span>
                }
              }
            </span>

            <!-- Notes Count Badge -->
            @if (folder.notes_count !== undefined && folder.notes_count > 0) {
              <span class="notes-count px-2 py-0.5 text-xs rounded-full bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300">
                {{ folder.notes_count }}
              </span>
            }

            <!-- Actions Dropdown (root: limited, others: full) -->
            <app-dropdown align="right">
              <button dropdownTrigger class="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700">
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"/>
                </svg>
              </button>
              <div dropdownMenu class="text-sm">
                <button class="dropdown-item w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700" (click)="openCreateSubfolderModal(folder)">New Subfolder</button>
                <button class="dropdown-item w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700" (click)="createNoteDirect(folder)">New Note (.md)</button>
                <button class="dropdown-item w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700" (click)="uploadDocument(folder)">Upload Document</button>
                <hr class="my-1 border-gray-200 dark:border-gray-700" />
                <button class="dropdown-item w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700" (click)="startRename(folder)">Rename Folder</button>
                @if (!folder.is_root) {
                  <button class="dropdown-item w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30" (click)="deleteFolder(folder)">Delete Folder</button>
                } @else {
                  <button class="dropdown-item w-full text-left px-4 py-2 text-gray-400 cursor-not-allowed" disabled>Delete Folder (root)</button>
                }
              </div>
            </app-dropdown>
          </div>

          <!-- Nested Children -->
          @if (folder.children && folder.children.length > 0 && isExpanded(folder.id)) {
            <div class="folder-children ml-6 mt-1">
              <app-folder-tree
                [folders]="folder.children"
                [selectedFolderId]="selectedFolderId"
                (folderSelected)="folderSelected.emit($event)"
                (folderMore)="folderMore.emit($event)"
                (treeChanged)="treeChanged.emit()"
              />
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .folder-tree {
      @apply space-y-1;
    }

    .folder-item {
      @apply relative;
    }

    .folder-header {
      @apply relative;
      
      &:hover .action-btn {
        @apply opacity-100;
      }
    }

    .action-btn {
      @apply opacity-0 transition-opacity;
    }

    .expand-btn {
      @apply transition-transform;
      
      &:hover {
        @apply scale-110;
      }
    }
  `]
})
export class FolderTreeComponent {
  @Input() folders: FolderTree[] = [];
  @Input() selectedFolderId?: string;
  @Output() folderSelected = new EventEmitter<FolderTree>();
  @Output() folderMore = new EventEmitter<FolderTree>();
  @Output() treeChanged = new EventEmitter<void>();

  private expandedFolders = signal<Set<string>>(new Set());
  private folderService = inject(FolderService);
  private noteService = inject(NoteService);
  private authState = inject(AuthStateService);
  private toast = inject(ToastService);
  private router = inject(Router);

  // Inline edit state
  private _editingId = signal<string | null>(null);
  editingId = this._editingId.asReadonly();
  private _nameDraft = signal<string>('');
  nameDraft = this._nameDraft.asReadonly();

  // Modal state for creating
  showNameModal = signal(false);
  private pendingParentId: string | null = null;

  ngOnInit() {
    // Auto-expand root folders
    this.folders.forEach(folder => {
      if (folder.is_root) {
        this.expandedFolders.update(set => {
          set.add(folder.id);
          return new Set(set);
        });
      }
    });
  }

  // Auto-focus input when entering edit mode
  private focusEditInput() {
    const id = this.editingId();
    if (!id) return;
    setTimeout(() => {
      const el = document.querySelector(`[data-folder-id="${id}"] input`) as HTMLInputElement | null;
      if (el) {
        el.focus();
        el.select();
      }
    }, 0);
  }

  isExpanded(folderId: string): boolean {
    return this.expandedFolders().has(folderId);
  }

  toggleExpand(folderId: string, event: Event) {
    event.stopPropagation();
    this.expandedFolders.update(set => {
      if (set.has(folderId)) {
        set.delete(folderId);
      } else {
        set.add(folderId);
      }
      return new Set(set);
    });
  }

  onFolderClick(folder: FolderTree) {
    this.folderSelected.emit(folder);
  }

  onMoreClick(folder: FolderTree, event: Event) {
    event.stopPropagation();
    this.folderMore.emit(folder);
  }

  // Helpers

  private uniqueName(base: string, existing: string[], ext?: string): string {
    let name = base;
    let suffix = 1;
    const exists = (n: string) => existing.includes(ext ? `${n}${ext}` : n) || existing.includes(n);
    while (exists(name)) {
      suffix += 1;
      name = `${base} ${suffix}`;
    }
    return ext ? `${name}${ext}` : name;
  }

  openCreateSubfolderModal(parent: FolderTree) {
    this.pendingParentId = parent.id;
    this.expandedFolders.update(set => new Set(set.add(parent.id)));
    this.showNameModal.set(true);
  }

  startRename(folder: FolderTree) {
    this._editingId.set(folder.id);
    this._nameDraft.set(folder.name);
    this.focusEditInput();
  }

  onNameInput(e: Event) {
    const target = e.target as HTMLInputElement;
    this._nameDraft.set(target.value);
  }

  async commitRename(folder: FolderTree) {
    const id = this.editingId();
    if (!id) return;
    const draft = (this.nameDraft() || '').trim();
    const userId = this.authState.userId();

    // If empty name: cancel temp or revert rename
    if (!draft) {
      this._editingId.set(null);
      return;
    }

    try {
      const updated = await this.folderService.updateFolder(folder.id, userId, { name: draft });
      folder.name = updated.name;
      this.toast.success('Folder renamed');
      this.treeChanged.emit();
    } catch (e:any) {
      console.error(e);
      this.toast.error('Failed to rename folder');
    } finally {
      this._editingId.set(null);
    }
  }

  cancelRename(folder: FolderTree) {
    const id = this.editingId();
    if (!id) return;
    this._editingId.set(null);
  }

  // Modal handlers for creation are added at bottom

  async createNoteDirect(folder: FolderTree) {
    const userId = this.authState.userId();
    try {
      const existingTitles: string[] = []; // could fetch notes for folder if needed
      const titleBase = 'Untitled';
      const unique = this.uniqueName(titleBase, existingTitles, '.md');
      const created = await this.noteService.createNote(userId, { title: unique, content: '', folder_id: folder.id });
      this.toast.success(`Note "${created.title}" created`);
      // Refresh folder tree as files changed (e.g., notes count badges)
      this.treeChanged.emit();
      // Navigate to editor for immediate editing
      this.router.navigate(['/notes', created.id, 'edit']);
    } catch (e:any) {
      console.error(e);
      this.toast.error('Failed to create note');
    }
  }

  uploadDocument(folder: FolderTree) {
    this.toast.info('Upload document flow not implemented yet');
  }

  async deleteFolder(folder: FolderTree) {
    if (folder.is_root) {
      this.toast.error('Root folder cannot be deleted');
      return;
    }
    const userId = this.authState.userId();
    try {
      await this.folderService.deleteFolder(folder.id, userId);
      this.toast.success('Folder deleted');
      // Optimistically remove from local tree for immediate UX feedback
      this.removeById(folder.id);
      this.treeChanged.emit();
    } catch (e:any) {
      console.error(e);
      this.toast.error('Failed to delete folder');
    }
  }

  private removeById(id: string) {
    const removeFrom = (nodes: FolderTree[]): boolean => {
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        if (n.id === id) {
          nodes.splice(i, 1);
          return true;
        }
        if (n.children && n.children.length && removeFrom(n.children)) return true;
      }
      return false;
    };
    removeFrom(this.folders);
  }

  // Modal handlers
  closeNameModal() {
    this.showNameModal.set(false);
    this.pendingParentId = null;
  }

  async handleCreateName(name: string) {
    const userId = this.authState.userId();
    const parentId = this.pendingParentId ?? null;
    try {
      const created = await this.folderService.createFolder(userId, { name, parent_id: parentId });
      this.toast.success(`Folder "${created.name}" created`);
      this.treeChanged.emit();
    } catch (e:any) {
      console.error(e);
      this.toast.error(e?.message || 'Failed to create folder');
    } finally {
      this.closeNameModal();
    }
  }
}
