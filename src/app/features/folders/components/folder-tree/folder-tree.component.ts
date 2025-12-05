import { Component, Input, Output, EventEmitter, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FolderTree } from '../../../../core/models/folder.model';
import { FolderService } from '../../../folders/services/folder.service';
import { AuthStateService } from '../../../../core/services/auth-state.service';
import { ToastService } from '../../../../core/services/toast.service';
import { DropdownComponent } from '../../../../shared/components/ui/dropdown/dropdown.component';
import { NoteService } from '../../../../core/services/note.service';
import { ShareService } from '../../../../core/services/share.service';
import { WorkspaceStateService } from '../../../../core/services/workspace-state.service';
import { SupabaseService } from '../../../../core/services/supabase.service';
import { FolderNameModalComponent } from '../../../../shared/components/ui/dialog/folder-name-modal.component';
import { NoteNameModalComponent } from '../../../../shared/components/ui/dialog/note-name-modal.component';
import { ConfirmModalComponent } from '../../../../shared/components/ui/dialog/confirm-modal.component';
import { ShareNoteModalComponent } from '../../../../shared/components/ui/dialog/share-note-modal.component';
import {
  NotePropertiesModalComponent,
  NoteProperties,
} from '../../../../shared/components/ui/dialog/note-properties-modal.component';
import { NoteIconPipe } from '../../../../shared/pipes/note-icon.pipe';
@Component({
  selector: 'app-folder-tree',
  standalone: true,
  imports: [
    CommonModule,
    DropdownComponent,
    FolderNameModalComponent,
    NoteNameModalComponent,
    ConfirmModalComponent,
    ShareNoteModalComponent,
    NotePropertiesModalComponent,
    NoteIconPipe,
  ],
  template: `
    <div class="folder-tree">
      <!-- Name modal -->
      @if (showNameModal()) {
        <app-folder-name-modal
          (cancel)="closeNameModal()"
          (submit)="handleCreateName($event)"
        />
      }
      <!-- Note rename modal -->
      @if (showNoteRenameModal()) {
        <app-note-name-modal
          [initial]="renamingNote?.title"
          [existingNames]="renamingExistingNames()"
          (cancel)="closeNoteRenameModal()"
          (submit)="handleNoteRename($event)"
        />
      }

      <!-- Generic confirm modal -->
      @if (showConfirmModal()) {
        <app-confirm-modal
          [title]="confirmTitle()"
          [message]="confirmMessage()"
          (confirm)="performConfirmAction()"
          (cancel)="closeConfirmModal()"
        />
      }

      <!-- Note properties modal -->
      @if (showPropertiesModal() && noteProperties()) {
        <app-note-properties-modal
          [properties]="noteProperties()!"
          (cancel)="closePropertiesModal()"
        />
      }

      <!-- Share note modal -->
      @if (showShareModal() && sharingNote) {
        <app-share-note-modal
          [note]="sharingNote"
          (cancel)="closeShareModal()"
          (shared)="handleNoteShared($event)"
        />
      }
      @for (folder of folders; track folder.id) {
        <div 
          class="folder-item"
          [ngClass]="{
            'ring-2 ring-primary-500 bg-primary-50 dark:bg-primary-900': dragOverFolderId() === folder.id
          }"
          (dragover)="onFolderDragOver($event, folder)"
          (dragleave)="onFolderDragLeave($event, folder)"
          (drop)="onFolderDrop($event, folder)"
        >
          <div 
            class="folder-header flex items-center gap-2 px-2 sm:px-3 py-2.5 sm:py-2 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors touch-manipulation"
            [class.bg-gray-100]="selectedFolderId === folder.id"
            [class.dark:bg-gray-800]="selectedFolderId === folder.id"
            (click)="onFolderClick(folder)"
          >
            <!-- Expand/Collapse Icon -->
            @if (folder.children && folder.children.length > 0) {
              <button 
                class="expand-btn w-6 h-6 sm:w-4 sm:h-4 flex items-center justify-center touch-manipulation"
                (click)="toggleExpand(folder.id, $event)"
              >
                  @if (isExpanded(folder.id)) {
                    <i class="fa-solid fa-chevron-down text-xs"></i>
                  } @else {
                    <i class="fa-solid fa-chevron-right text-xs"></i>
                  }
              </button>
            } @else {
              <span class="w-4"></span>
            }

            <!-- Folder Icon -->
            <span class="folder-icon text-lg">
              <i class="fa-solid" [ngClass]="folder.icon ? folder.icon : (folder.is_root ? 'fa-folder' : 'fa-folder-open')"></i>
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
            @if (folder.notes && folder.notes.length > 0) {
              <span class="notes-count px-2 py-0.5 text-xs rounded-full bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300">
                {{ folder.notes.length }}
              </span>
            }

            <!-- Actions Dropdown (root: limited, others: full) -->
            <app-dropdown align="right">
              <button dropdownTrigger class="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700">
                  <i class="fa-solid fa-ellipsis-vertical text-base"></i>
              </button>
              <div dropdownMenu class="text-sm">
                <button class="dropdown-item w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between" (click)="openCreateSubfolderModal(folder)">
                  <span>New Subfolder</span>
                    <i class="fa-solid fa-folder-plus text-base"></i>
                </button>
                <button class="dropdown-item w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between" (click)="createNoteDirect(folder)">
                  <span>New Note (.md)</span>
                    <i class="fa-solid fa-file-circle-plus text-base"></i>
                </button>
                <button class="dropdown-item w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between" (click)="uploadDocument(folder)">
                  <span>Upload Document</span>
                    <i class="fa-solid fa-upload text-base"></i>
                </button>
                <hr class="my-1 border-gray-200 dark:border-gray-700" />
                <button class="dropdown-item w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between" (click)="startRename(folder)">
                  <span>Rename Folder</span>
                    <i class="fa-solid fa-pen text-base"></i>
                </button>
                @if (!folder.is_root) {
                  <button class="dropdown-item w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 flex items-center justify-between" (click)="deleteFolder(folder)">
                    <span>Delete Folder</span>
                      <i class="fa-solid fa-trash text-base"></i>
                  </button>
                } @else {
                  <button class="dropdown-item w-full text-left px-4 py-2 text-gray-400 cursor-not-allowed flex items-center justify-between" disabled>
                    <span>Delete Folder (root)</span>
                      <i class="fa-solid fa-trash text-base"></i>
                  </button>
                }
              </div>
            </app-dropdown>
          </div>

          <!-- Notes under this folder -->
          @if (folder.notes && folder.notes.length > 0 && (isExpanded(folder.id) || !folder.children || folder.children.length === 0)) {
            <ul class="ml-8 mt-1 space-y-0.5">
              @for (note of folder.notes; track note.id) {
                <li
                  class="note-row flex items-center gap-2 px-2 py-1 rounded cursor-default text-xs hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  [class.bg-gray-200]="workspaceState.selectedNoteId() === note.id"
                  [class.dark:bg-gray-600]="workspaceState.selectedNoteId() === note.id"
                  [class.opacity-50]="draggedNoteId() === note.id"
                  draggable="true"
                  (click)="onNoteClick(note, folder, $event)"
                  (dragstart)="onNoteDragStart($event, note, folder)"
                  (dragend)="onNoteDragEnd($event)"
                >
                    <span class="drag-handle w-4 text-xs text-gray-400 cursor-move select-none">⋮⋮</span>
                    <i class="fa-solid {{ note | noteIcon }} note-icon w-4 h-4 pointer-events-none" style="font-size:16px;"></i>
                    <span class="truncate flex-1" [title]="note.title || 'Untitled'">{{ note.title || 'Untitled' }}</span>
                  <!-- <span class="text-[10px] text-gray-400 pointer-events-none mr-2" [appRelativeTime]="note.updated_at"></span> -->
                  <!-- Note Actions Dropdown -->
                  <div class="dropdown-wrapper" (click)="$event.stopPropagation()">
                    <app-dropdown align="right">
                      <button dropdownTrigger class="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600">
                        <i class="fa-solid fa-ellipsis-vertical text-xs"></i>
                      </button>
                      <div dropdownMenu class="text-xs">
                        <button class="dropdown-item w-full text-left px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between" (click)="downloadDocument(note)">
                          <span>Download</span>
                          <i class="fa-solid fa-download text-xs"></i>
                        </button>
                        <button class="dropdown-item w-full text-left px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between" (click)="shareNote(note)">
                          <span>Share</span>
                          <i class="fa-solid fa-share-nodes text-xs"></i>
                        </button>
                        <hr class="my-1 border-gray-200 dark:border-gray-700" />
                        <button class="dropdown-item w-full text-left px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between" (click)="startNoteRename(note, folder)">
                          <span>Rename</span>
                          <i class="fa-solid fa-pen text-xs"></i>
                        </button>
                        <button class="dropdown-item w-full text-left px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between" (click)="showNoteProperties(note, folder)">
                          <span>Properties</span>
                          <i class="fa-solid fa-circle-info text-xs"></i>
                        </button>
                        <hr class="my-1 border-gray-200 dark:border-gray-700" />
                        <button class="dropdown-item w-full text-left px-3 py-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 flex items-center justify-between" (click)="deleteNote(note, folder)">
                          <span>Delete</span>
                          <i class="fa-solid fa-trash text-xs"></i>
                        </button>
                      </div>
                    </app-dropdown>
                  </div>
                </li>
              }
            </ul>
          }

          <!-- Nested Children -->
          @if (folder.children && folder.children.length > 0 && isExpanded(folder.id)) {
            <div class="folder-children ml-6 mt-1">
              <app-folder-tree
                [folders]="folder.children"
                [selectedFolderId]="selectedFolderId"
                (folderSelected)="folderSelected.emit($event)"
                (folderMore)="folderMore.emit($event)"
                (treeChanged)="treeChanged.emit()"
                (noteSelected)="noteSelected.emit($event)"
              />
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [
    `
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

      /* Drag and drop styles */
      .note-row {
        @apply transition-all duration-200;
        cursor: default !important;
      }

      .drag-handle {
        cursor: move !important;
      }

      .folder-header {
        @apply transition-all duration-200;
      }
    `,
  ],
})
export class FolderTreeComponent {
  @Input() folders: FolderTree[] = [];
  @Input() selectedFolderId?: string;
  @Output() folderSelected = new EventEmitter<FolderTree>();
  @Output() folderMore = new EventEmitter<FolderTree>();
  @Output() treeChanged = new EventEmitter<void>();
  @Output() noteSelected = new EventEmitter<any>();

  private expandedFolders = signal<Set<string>>(new Set());
  private folderService = inject(FolderService);
  private noteService = inject(NoteService);
  private shareService = inject(ShareService);
  private authState = inject(AuthStateService);
  private toast = inject(ToastService);
  private supabase = inject(SupabaseService);
  workspaceState = inject(WorkspaceStateService);

  // Inline edit state
  private _editingId = signal<string | null>(null);
  editingId = this._editingId.asReadonly();
  private _nameDraft = signal<string>('');
  nameDraft = this._nameDraft.asReadonly();

  // Modal state for creating
  showNameModal = signal(false);
  private pendingParentId: string | null = null;

  // Note rename modal state
  showNoteRenameModal = signal(false);
  renamingNote: any = null;
  renamingFolder: FolderTree | null = null;

  // Generic confirm modal state (used for deletes)
  showConfirmModal = signal(false);
  confirmTitle = signal('');
  confirmMessage = signal('');
  private pendingDeleteNote: { note: any; folder: FolderTree } | null = null;

  // Note properties modal state
  showPropertiesModal = signal(false);
  noteProperties = signal<NoteProperties | null>(null);

  // Share note modal state
  showShareModal = signal(false);
  sharingNote: any = null;

  // Drag and drop state
  draggedNoteId = signal<string | null>(null);
  draggedNote: any = null;
  draggedSourceFolder: FolderTree | null = null;
  dragOverFolderId = signal<string | null>(null);

  ngOnInit() {
    // Auto-expand root folders
    this.folders.forEach((folder) => {
      if (folder.is_root) {
        this.expandedFolders.update((set) => {
          set.add(folder.id);
          return new Set(set);
        });
      }
    });
    // Lazy load notes counts/notes for expanded folders
    this.loadNotesForExpanded();
  }

  // Auto-focus input when entering edit mode
  private focusEditInput() {
    const id = this.editingId();
    if (!id) return;
    setTimeout(() => {
      const el = document.querySelector(
        `[data-folder-id="${id}"] input`,
      ) as HTMLInputElement | null;
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
    const currentSet = this.expandedFolders();
    const newSet = new Set(currentSet);
    
    if (newSet.has(folderId)) {
      newSet.delete(folderId);
    } else {
      newSet.add(folderId);
    }
    
    this.expandedFolders.set(newSet);
    
    // After toggling, attempt lazy load for newly expanded folder
    if (newSet.has(folderId)) {
      this.loadNotesForExpanded(folderId);
    }
  }

  onFolderClick(folder: FolderTree) {
    // If folder is already selected and expanded, collapse it
    if (this.workspaceState.selectedFolderId() === folder.id && this.isExpanded(folder.id)) {
      const currentSet = this.expandedFolders();
      const newSet = new Set(currentSet);
      newSet.delete(folder.id);
      this.expandedFolders.set(newSet);
    } else {
      // Otherwise, select and expand it
      this.workspaceState.setSelectedFolder(folder.id);
      this.folderSelected.emit(folder);
      
      // Expand if it has children
      if (folder.children && folder.children.length > 0) {
        const currentSet = this.expandedFolders();
        if (!currentSet.has(folder.id)) {
          const newSet = new Set(currentSet);
          newSet.add(folder.id);
          this.expandedFolders.set(newSet);
          this.loadNotesForExpanded(folder.id);
        }
      }
      
      // For leaf folders (no child folders), ensure notes are loaded on selection
      if (!folder.children || folder.children.length === 0) {
        if (!folder.notes) {
          this.fetchNotesForFolder(folder);
        }
      }
    }
  }

  private async loadNotesForExpanded(targetId?: string) {
    const userId = this.authState.userId();
    if (!userId) return;
    // Iterate folders that are expanded (or just targetId if provided)
    const loadFor = (folder: FolderTree) => {
      const shouldLoad = this.isExpanded(folder.id) && (!targetId || folder.id === targetId);
      if (shouldLoad) {
        // Only fetch if not already loaded
        if (!folder.notes) {
          this.fetchNotesForFolder(folder);
        }
      }
      folder.children?.forEach((child) => loadFor(child));
    };
    this.folders.forEach((f) => loadFor(f));
  }

  private async fetchNotesForFolder(folder: FolderTree) {
    try {
      const userId = this.authState.userId();
      if (!userId) return;

      // Check if this is the Public folder
      const { data: profile } = await this.supabase.client
        .from('user_profiles')
        .select('public_folder_id')
        .eq('user_id', userId)
        .single();

      if (profile?.public_folder_id === folder.id) {
        // This is the Public folder - load shared notes
        const sharedNotes = await this.shareService.getSharedNotesForUser(userId);
        folder.notes = sharedNotes.map((n: any) => ({
          id: n.id,
          title: n.title,
          updated_at: n.updated_at,
          folder_id: n.folder_id,
          content: n.content,
          icon: (n as any).icon || undefined,
        }));
      } else {
        // Regular folder - load notes normally
        const list = await this.noteService.getNotesForFolder(folder.id, userId);
        folder.notes = list.map((n) => ({
          id: n.id,
          title: n.title,
          updated_at: n.updated_at,
          folder_id: n.folder_id,
          content: n.content,
          icon: (n as any).icon || undefined,
        }));
      }
    } catch (e: any) {
      console.error('Failed to fetch notes for folder', folder.id, e);
    }
  }

  onNoteClick(note: any, folder: FolderTree, event: Event) {
    // Don't trigger click when dragging
    if (this.draggedNoteId()) return;

    event.stopPropagation();

    console.log('Note clicked:', note);
    this.workspaceState.setSelectedFolder(folder.id);
    this.workspaceState.emitNoteSelected(note);
    this.noteSelected.emit(note);
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
    this.expandedFolders.update((set) => new Set(set.add(parent.id)));
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
    } catch (e: any) {
      console.error(e);
      this.toast.error('Failed to rename folder');
    } finally {
      this._editingId.set(null);
    }
  }

  cancelRename(folder: FolderTree) {
    void folder;
    const id = this.editingId();
    if (!id) return;
    this._editingId.set(null);
  }

  // Modal handlers for creation are added at bottom

  async createNoteDirect(folder: FolderTree) {
    const userId = this.authState.userId();
    if (!userId) {
      this.toast.error('User not authenticated');
      return;
    }
    try {
      const existingTitles: string[] = []; // could fetch notes for folder if needed
      const titleBase = 'Untitled';
      const unique = this.uniqueName(titleBase, existingTitles, '.md');
      console.log('Creating note in folder:', folder.id, 'with title:', unique);
      const created = await this.noteService.createNote(userId, {
        title: unique,
        content: '',
        folder_id: folder.id,
      });
      console.log('Note created successfully:', created);
      this.toast.success(`Note "${created.title}" created`);
      // Refresh folder tree as files changed (e.g., notes count badges)
      this.treeChanged.emit();
      // Emit selection for workspace
      this.noteSelected.emit(created);
      // Ensure workspace switches to this folder so the new note becomes visible
      this.workspaceState.setSelectedFolder(folder.id);
      this.workspaceState.emitNoteCreated(created);
      // Ensure the folder is expanded so the new note is visible
      this.expandedFolders.update((set) => new Set(set.add(folder.id)));
      // Optimistically insert into local notes array if present
      if ((folder as any).notes) {
        (folder as any).notes.unshift({
          id: created.id,
          title: created.title,
          updated_at: created.updated_at,
          folder_id: created.folder_id,
          content: created.content,
          icon: (created as any).icon || undefined,
        });
      } else {
        (folder as any).notes = [
          {
            id: created.id,
            title: created.title,
            updated_at: created.updated_at,
            folder_id: created.folder_id,
            content: created.content,
            icon: (created as any).icon || undefined,
          },
        ];
      }
      // Fetch latest notes for this folder in background to ensure consistency
      this.fetchNotesForFolder(folder);
    } catch (e: any) {
      console.error('Failed to create note:', e);
      const errorMsg = e?.message || e?.error?.message || 'Failed to create note';
      this.toast.error(errorMsg);
    }
  }

  uploadDocument(folder: FolderTree) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '*/*';
    input.multiple = false;
    input.onchange = async (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const userId = this.authState.userId();
        if (!userId) {
          this.toast.error('User not authenticated');
          return;
        }

        const created = await this.noteService.uploadDocument(userId, file, folder.id);
        this.toast.success(`Document "${file.name}" uploaded`);

        // Refresh folder tree
        this.treeChanged.emit();

        // Optimistically add to local notes
        if (folder.notes) {
          folder.notes.unshift({
            id: created.id,
            title: created.title,
            updated_at: created.updated_at,
            folder_id: created.folder_id,
            content: created.content,
            icon: '📄', // document icon
          });
        } else {
          folder.notes = [
            {
              id: created.id,
              title: created.title,
              updated_at: created.updated_at,
              folder_id: created.folder_id,
              content: created.content,
              icon: '📄',
            },
          ];
        }

        // Expand folder to show the new document
        this.expandedFolders.update((set) => new Set(set.add(folder.id)));
      } catch (error: any) {
        console.error('Upload failed:', error);
        this.toast.error(error.message || 'Failed to upload document');
      }
    };
    input.click();
  }

  async downloadDocument(note: any) {
    try {
      if (!note.content || !note.content.startsWith('storage://')) return;

      const path = note.content.replace('storage://notes/', '');
      const { data, error } = await this.supabase.storage.from('notes').createSignedUrl(path, 60);
      if (error || !data?.signedUrl) throw error;

      // Extract file extension from storage path
      const fileName = path.split('/').pop() || note.title;
      const extension = fileName.includes('.') ? '' : '.txt';
      const downloadName = fileName.includes('.') ? fileName : `${note.title}${extension}`;

      // Fetch the file as blob and create download link
      const response = await fetch(data.signedUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = downloadName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);

      this.toast.success('Download started');
    } catch (error: any) {
      console.error('Download failed:', error);
      this.toast.error('Failed to download document');
    }
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
    } catch (e: any) {
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
    } catch (e: any) {
      console.error(e);
      this.toast.error(e?.message || 'Failed to create folder');
    } finally {
      this.closeNameModal();
    }
  }

  // Note operations
  startNoteRename(note: any, folder: FolderTree) {
    // Open rename modal
    this.renamingNote = note;
    this.renamingFolder = folder;
    this.showNoteRenameModal.set(true);
  }

  async renameNote(note: any, folder: FolderTree, newTitle: string) {
    void folder;
    const userId = this.authState.userId();
    try {
      await this.noteService.updateNote(note.id, userId, { title: newTitle });
      note.title = newTitle;
      this.toast.success('Note renamed');
      this.treeChanged.emit();
    } catch (e: any) {
      console.error(e);
      this.toast.error('Failed to rename note');
    }
  }

  async deleteNote(note: any, folder: FolderTree) {
    // Open confirm modal before deleting
    this.pendingDeleteNote = { note, folder };
    this.confirmTitle.set('Delete note');
    this.confirmMessage.set(`Delete note "${note.title}"?`);
    this.showConfirmModal.set(true);
  }

  // Called when confirm modal confirms
  private async performDeleteNote() {
    if (!this.pendingDeleteNote) return;
    const { note, folder } = this.pendingDeleteNote;
    const userId = this.authState.userId();
    try {
      await this.noteService.deleteNote(note.id, userId);
      this.toast.success('Note deleted');
      // Remove from local folder notes array
      if (folder.notes) {
        const idx = folder.notes.findIndex((n) => n.id === note.id);
        if (idx !== -1) folder.notes.splice(idx, 1);
      }
      // If this was the selected note, clear selection
      if (this.workspaceState.selectedNoteId() === note.id) {
        this.workspaceState.setSelectedNote(null);
      }
      this.treeChanged.emit();
    } catch (e: any) {
      console.error(e);
      this.toast.error('Failed to delete note');
    } finally {
      this.closeConfirmModal();
    }
  }

  // Confirm modal handlers
  closeConfirmModal() {
    this.showConfirmModal.set(false);
    this.pendingDeleteNote = null;
    this.confirmTitle.set('');
    this.confirmMessage.set('');
  }

  // Note rename handlers
  closeNoteRenameModal() {
    this.showNoteRenameModal.set(false);
    this.renamingNote = null;
    this.renamingFolder = null;
  }

  async handleNoteRename(newTitle: string) {
    if (!this.renamingNote || !this.renamingFolder) {
      this.closeNoteRenameModal();
      return;
    }
    await this.renameNote(this.renamingNote, this.renamingFolder, newTitle);
    this.closeNoteRenameModal();
  }

  renamingExistingNames(): string[] {
    if (!this.renamingFolder || !this.renamingFolder.notes) return [];
    return this.renamingFolder.notes
      .filter((n: any) => n.id !== this.renamingNote?.id)
      .map((n: any) => n.title || '');
  }

  // Note properties handlers
  async showNoteProperties(note: any, folder: FolderTree) {
    try {
      // Fetch full note details including size
      const fullNote = await this.noteService.getNote(note.id, this.authState.userId());

      const props: NoteProperties = {
        id: note.id,
        title: note.title || 'Untitled',
        created_at: fullNote?.created_at || note.created_at,
        updated_at: fullNote?.updated_at || note.updated_at,
        folder_name: folder.name,
        tags: fullNote?.tags || [],
        is_favorite: fullNote?.is_favorite || false,
        is_archived: fullNote?.is_archived || false,
        owner: this.authState.user()?.email || 'You',
        size: fullNote?.content ? new Blob([fullNote.content]).size : 0,
      };

      this.noteProperties.set(props);
      this.showPropertiesModal.set(true);
    } catch (error) {
      console.error('Failed to load note properties:', error);
      this.toast.error('Failed to load note properties');
    }
  }

  closePropertiesModal() {
    this.showPropertiesModal.set(false);
    this.noteProperties.set(null);
  }

  performConfirmAction() {
    // Currently only wired for note deletes
    if (this.pendingDeleteNote) {
      this.performDeleteNote();
    }
  }

  // Drag and Drop handlers
  onNoteDragStart(event: DragEvent, note: any, folder: FolderTree) {
    try {
      this.draggedNoteId.set(note.id);
      this.draggedNote = note;
      this.draggedSourceFolder = folder;

      // Set drag effect and data
      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', note.id);
        // Use the currentTarget as drag image if available
        const el = (event.currentTarget || event.target) as HTMLElement | null;
        try {
          if (el && event.dataTransfer.setDragImage) {
            // clone to avoid layout shift
            const img = el.cloneNode(true) as HTMLElement;
            img.style.position = 'absolute';
            img.style.top = '-9999px';
            img.style.left = '-9999px';
            document.body.appendChild(img);
            event.dataTransfer.setDragImage(
              img,
              Math.floor(el.clientWidth / 2),
              Math.floor(el.clientHeight / 2),
            );
            // remove clone shortly after (defer)
            setTimeout(() => img.remove(), 0);
          }
        } catch (err) {
          // Non-critical if setDragImage fails in some browsers
          console.warn('setDragImage failed', err);
        }
      }

      // Add visual feedback on the row element (use currentTarget)
      const row = (event.currentTarget || event.target) as HTMLElement | null;
      if (row) row.style.opacity = '0.5';
    } catch (err) {
      console.error('onNoteDragStart error', err, { note, folder });
    }
  }

  onNoteDragEnd(event: DragEvent) {
    try {
      this.draggedNoteId.set(null);
      this.draggedNote = null;
      this.draggedSourceFolder = null;
      this.dragOverFolderId.set(null);

      // Reset visual feedback safely using currentTarget
      const row = (event.currentTarget || event.target) as HTMLElement | null;
      if (row) row.style.opacity = '1';
    } catch (err) {
      console.error('onNoteDragEnd error', err);
    }
  }

  onFolderDragOver(event: DragEvent, folder: FolderTree) {
    try {
      // Allow drops if dataTransfer has text/plain type (don't call getData during dragover)
      const hasData = !!(
        event.dataTransfer &&
        event.dataTransfer.types &&
        event.dataTransfer.types.includes('text/plain')
      );
      if (!hasData) return;

      // Prevent default to allow drop
      event.preventDefault();
      event.stopPropagation();

      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'move';
      }

      // Visual feedback
      this.dragOverFolderId.set(folder.id);
    } catch (err) {
      console.error('onFolderDragOver error', err, { folder });
    }
  }

  onFolderDragLeave(event: DragEvent, folder: FolderTree) {
    event.stopPropagation();

    // Only clear if we're actually leaving the folder element
    const relatedTarget = event.relatedTarget as HTMLElement;
    const currentTarget = event.currentTarget as HTMLElement;

    if (!currentTarget.contains(relatedTarget)) {
      if (this.dragOverFolderId() === folder.id) {
        this.dragOverFolderId.set(null);
      }
    }
  }

  async onFolderDrop(event: DragEvent, targetFolder: FolderTree) {
    console.log('onFolderDrop called', {
      targetFolder: targetFolder.id,
      dataTransfer: !!event.dataTransfer,
    });
    event.preventDefault();
    event.stopPropagation();

    this.dragOverFolderId.set(null);

    // Determine note id from dataTransfer or local draggedNote
    let noteId: string | null = null;
    try {
      if (event.dataTransfer) noteId = event.dataTransfer.getData('text/plain') || null;
    } catch (e) {
      /* ignore */
    }
    if (!noteId && this.draggedNote) noteId = this.draggedNote.id;
    if (!noteId) {
      console.log('Drop cancelled: no note id available');
      return;
    }

    const note =
      this.draggedNote && this.draggedNote.id === noteId
        ? this.draggedNote
        : ({ id: noteId } as any);
    const sourceFolder = this.draggedSourceFolder;

    // Don't move if dropping on the same folder (if we know the source)
    if (sourceFolder && sourceFolder.id === targetFolder.id) {
      this.toast.info('Note is already in this folder');
      this.draggedNoteId.set(null);
      this.draggedNote = null;
      this.draggedSourceFolder = null;
      return;
    }

    try {
      const userId = this.authState.userId();
      if (!userId) {
        this.toast.error('User not authenticated');
        return;
      }

      console.log(
        'Moving note:',
        note.id,
        'from folder:',
        sourceFolder?.id,
        'to folder:',
        targetFolder.id,
      );

      // Update the note's folder_id
      await this.noteService.updateNote(note.id, userId, {
        folder_id: targetFolder.id,
      });

      console.log('Note moved successfully');

      // Update local state - remove from source folder if known
      if (sourceFolder && sourceFolder.notes) {
        const index = sourceFolder.notes.findIndex((n: any) => n.id === note.id);
        if (index > -1) {
          sourceFolder.notes.splice(index, 1);
        }
      }

      // Add to target folder
      if (targetFolder.notes) {
        targetFolder.notes.unshift({ ...note, folder_id: targetFolder.id });
      } else {
        targetFolder.notes = [{ ...note, folder_id: targetFolder.id }];
      }

      // Expand target folder to show the moved note
      this.expandedFolders.update((set) => new Set(set.add(targetFolder.id)));

      this.toast.success(`Moved "${note.title}" to "${targetFolder.name}"`);
      this.treeChanged.emit();
    } catch (error: any) {
      console.error('Failed to move note:', error);
      const errorMsg = error?.message || error?.error?.message || 'Failed to move note';
      this.toast.error(errorMsg);
    } finally {
      this.draggedNoteId.set(null);
      this.draggedNote = null;
      this.draggedSourceFolder = null;
    }
  }

  // Share note handlers
  shareNote(note: any) {
    this.sharingNote = note;
    this.showShareModal.set(true);
  }

  closeShareModal() {
    this.showShareModal.set(false);
    this.sharingNote = null;
  }

  handleNoteShared(share: any) {
    console.log('Note shared:', share);
    // Optionally refresh the tree to show updated state
    this.treeChanged.emit();
  }

}
