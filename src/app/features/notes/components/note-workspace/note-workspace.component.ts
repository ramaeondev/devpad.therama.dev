import { Component, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MarkdownEditorComponent } from '../markdown-editor/markdown-editor.component';
import { DocumentPreviewComponent } from '../../../../shared/components/ui/document-preview/document-preview.component';
import { FolderTree } from '../../../../core/models/folder.model';
import { AuthStateService } from '../../../../core/services/auth-state.service';
import { FolderService } from '../../../folders/services/folder.service';
import { NoteService } from '../../../../core/services/note.service';
import { ToastService } from '../../../../core/services/toast.service';
import { WorkspaceStateService } from '../../../../core/services/workspace-state.service';

@Component({
  selector: 'app-note-workspace',
  standalone: true,
  imports: [CommonModule, MarkdownEditorComponent, DocumentPreviewComponent],
  template: `
    <div class="h-full flex flex-col">
      <!-- Toolbar -->
      <div class="flex-1 h-full overflow-y-auto p-3 sm:p-4 md:p-6 flex flex-col gap-3 sm:gap-4">
        <div class="flex items-center gap-2 sm:gap-3 flex-wrap">
          <button
            class="px-3 sm:px-4 py-2 rounded bg-primary-600 text-white text-sm font-medium touch-manipulation"
            (click)="createNewNote()"
          >
            New Note
          </button>
          @if (selectedNoteId()) {
            <span class="text-xs text-gray-500 hidden sm:inline">ID: {{ selectedNoteId() }}</span>
          }
        </div>

        <!-- Title input -->
        @if (currentMode() !== 'empty') {
          <input
            class="text-lg sm:text-xl font-semibold bg-transparent border-b border-gray-300 dark:border-gray-700 focus:outline-none focus:border-primary-500 text-gray-900 dark:text-gray-100 py-2 px-1 touch-manipulation"
            [value]="title()"
            (input)="onTitleInput($event)"
            placeholder="Note title"
          />
        }

        <!-- Content Area -->
        @if (currentMode() !== 'empty') {
          @if (isDocument()) {
            <app-document-preview [note]="currentNote()!" />
          } @else {
            <app-markdown-editor
              [initialContent]="content()"
              (contentChange)="content.set($event)"
            />
          }
        }

        <!-- Empty state -->
        @if (currentMode() === 'empty') {
          <div class="text-center py-24 text-gray-500 dark:text-gray-400">
            Select a folder and create a note to begin.
          </div>
        }

        <!-- Actions -->
        @if (currentMode() === 'editing') {
          <div class="flex gap-2 sm:gap-3 flex-wrap">
            <button
              class="px-4 sm:px-6 py-2.5 rounded bg-primary-600 text-white text-sm font-medium disabled:opacity-40 touch-manipulation min-w-[100px]"
              [disabled]="saving()"
              (click)="saveNote()"
            >
              {{ saving() ? 'Saving…' : selectedNoteId() ? 'Save' : 'Create' }}
            </button>
            @if (selectedNoteId()) {
              <button
                class="px-4 sm:px-6 py-2.5 rounded border border-red-600 text-red-600 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/30 touch-manipulation"
                (click)="deleteNote()"
              >
                Delete
              </button>
            }
          </div>
        }

        <!-- Notes list removed; rely on folder tree for navigation -->
      </div>
    </div>
  `,
  styles: [],
})
export class NoteWorkspaceComponent {
  private folderService = inject(FolderService);
  private noteService = inject(NoteService);
  private auth = inject(AuthStateService);
  private toast = inject(ToastService);
  private workspaceState = inject(WorkspaceStateService);

  folders = signal<FolderTree[]>([]);
  // Use shared selected folder state from workspaceState
  selectedFolderId = this.workspaceState.selectedFolderId;

  notes = signal<any[]>([]); // could type Note
  selectedNoteId = signal<string | null>(null);
  currentNote = signal<any>(null); // Full note object

  title = signal('');
  content = signal('');
  saving = signal(false);

  isDocument = computed(() => {
    const note = this.currentNote();
    if (!note?.content || typeof note.content !== 'string') return false;

    // Check if content starts with storage:// (indicates uploaded file)
    if (!note.content.startsWith('storage://')) return false;

    // Extract file extension
    const path = note.content.replace('storage://notes/', '');
    const ext = path.split('.').pop()?.toLowerCase();

    // Define document extensions that should use iframe preview
    const documentExtensions = [
      'pdf',
      'doc',
      'docx',
      'xls',
      'xlsx',
      'ppt',
      'pptx',
      'txt',
      'jpg',
      'jpeg',
      'png',
      'gif',
      'webp',
      'mp4',
      'avi',
      'mov',
      'mp3',
      'wav',
    ];

    return documentExtensions.includes(ext || '');
  });

  currentMode = computed(() => {
    if (!this.selectedFolderId()) return 'empty';
    return 'editing';
  });

  flatFolders = computed(() => {
    const all: FolderTree[] = [];
    const walk = (list: FolderTree[]) =>
      list.forEach((f) => {
        all.push(f);
        if (f.children) walk(f.children);
      });
    walk(this.folders());
    return all;
  });

  constructor() {
    // React to folder selection changes - moved to constructor for proper injection context
    effect(() => {
      const fid = this.selectedFolderId();
      if (fid) {
        // Reset editor when switching folders unless editing existing note inside same folder
        this.selectedNoteId.set(null);
        this.title.set('');
        this.content.set('');
        this.currentNote.set(null);
        this.loadNotes(fid);
      } else {
        this.notes.set([]);
      }
    });
  }

  async ngOnInit() {
    await this.reloadFolders();
    // If no folder selected yet, auto-select root
    if (!this.selectedFolderId()) {
      const root = this.folders().find((f) => f.is_root);
      if (root) {
        this.workspaceState.setSelectedFolder(root.id);
      }
    }
    // Initial notes load if pre-selected
    if (this.selectedFolderId()) {
      await this.loadNotes(this.selectedFolderId()!);
    }
    // React to external note creation (e.g., from sidebar tree dropdown)
    this.workspaceState.noteCreated$.subscribe((note) => {
      // Folder should already be selected by creator; if not, select now
      if (note.folder_id && note.folder_id !== this.selectedFolderId()) {
        this.workspaceState.setSelectedFolder(note.folder_id);
      }
      if (note.folder_id === this.selectedFolderId()) {
        this.openNote(note);
        // Inject into list optimistically before full reload
        this.notes.update((list) => [note, ...list.filter((n) => n.id !== note.id)]);
        // Refresh list for authoritative data (timestamps, etc.)
        this.loadNotes(note.folder_id!);
      }
    });

    // React to note selection from folder tree
    this.workspaceState.noteSelected$.subscribe(async (noteRef) => {
      try {
        // Ensure correct folder is active
        if (noteRef.folder_id && noteRef.folder_id !== this.selectedFolderId()) {
          this.workspaceState.setSelectedFolder(noteRef.folder_id);
        }
        // Immediately set selection and basic metadata to avoid races where a save
        // happens before the full note content has loaded.
        this.selectedNoteId.set(noteRef.id);
        this.title.set(noteRef.title || '');
        // optimistic placeholder while content downloads
        this.content.set('');
        this.currentNote.set(noteRef); // Set basic note info immediately

        // Fetch full note to ensure content is loaded and then update fields
        const userId = this.auth.userId();
        const full = await this.noteService.getNote(noteRef.id, userId);
        if (full) {
          this.selectedNoteId.set(full.id);
          this.title.set(full.title);
          this.content.set(full.content || '');
          this.currentNote.set(full); // Update with full note data
        }
      } catch (e: any) {
        console.error(e);
        this.toast.error('Failed to open note');
      }
    });
  }

  async reloadFolders() {
    try {
      const userId = this.auth.userId();
      const tree = await this.folderService.getFolderTree(userId);
      this.folders.set(tree);
    } catch (e: any) {
      console.error(e);
      this.toast.error('Failed to load folders');
    }
  }

  async loadNotes(folderId: string) {
    try {
      const userId = this.auth.userId();
      const list = await this.noteService.getNotesForFolder(folderId, userId);
      this.notes.set(list);
    } catch (e: any) {
      console.error(e);
      this.toast.error('Failed to load notes');
    }
  }

  onFolderDropdownChange(e: Event) {
    const val = (e.target as HTMLSelectElement).value;
    this.workspaceState.setSelectedFolder(val);
  }

  createNewNote() {
    if (!this.selectedFolderId()) {
      this.toast.info('Select a folder first');
      return;
    }
    this.selectedNoteId.set(null);
    this.title.set('Untitled');
    this.content.set('');
    this.currentNote.set(null);
  }

  async saveNote() {
    if (!this.selectedFolderId()) return;
    const userId = this.auth.userId();
    const t = (this.title() || 'Untitled').trim();
    const c = this.content();
    this.saving.set(true);
    try {
      if (!this.selectedNoteId()) {
        const created = await this.noteService.createNote(userId, {
          title: t,
          content: c,
          folder_id: this.selectedFolderId()!,
        });
        this.selectedNoteId.set(created.id);
        this.toast.success('Note created');
        // Notify folder tree to refresh counts/listings. Note: we do not emit
        // `noteCreated` here because this workspace already opens the created note
        // locally; emitting `noteCreated` caused duplicate open/selection races.
        try {
          this.workspaceState.emitFoldersChanged();
        } catch (e) {
          // noop
        }
      } else {
        const updated = await this.noteService.updateNote(this.selectedNoteId()!, userId, {
          title: t,
          content: c,
          folder_id: this.selectedFolderId()!,
        });
        this.toast.success('Note saved');
        this.title.set(updated.title);
      }
      await this.loadNotes(this.selectedFolderId()!);
    } catch (e: any) {
      console.error(e);
      this.toast.error('Failed to save note');
    } finally {
      this.saving.set(false);
    }
  }

  async deleteNote() {
    if (!this.selectedNoteId()) return;
    const userId = this.auth.userId();
    try {
      await this.noteService.deleteNote(this.selectedNoteId()!, userId);
      this.toast.success('Note deleted');
      this.selectedNoteId.set(null);
      this.title.set('');
      this.content.set('');
      await this.loadNotes(this.selectedFolderId()!);
    } catch (e: any) {
      console.error(e);
      this.toast.error('Failed to delete note');
    }
  }

  openNote(note: any) {
    this.selectedNoteId.set(note.id);
    this.title.set(note.title);
    if (note.content === undefined) {
      // Defensive: fetch if content missing
      const userId = this.auth.userId();
      this.noteService
        .getNote(note.id, userId)
        .then((full) => {
          if (full) this.content.set(full.content || '');
        })
        .catch((err) => {
          console.error(err);
          this.content.set('');
        });
    } else {
      this.content.set(note.content || '');
    }
  }

  onTitleInput(e: Event) {
    const input = e.target as HTMLInputElement;
    this.title.set(input.value);
  }
}
