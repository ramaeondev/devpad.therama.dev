import { Component, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MarkdownEditorComponent } from '../markdown-editor/markdown-editor.component';
import { FolderTree } from '../../../../core/models/folder.model';
import { AuthStateService } from '../../../../core/services/auth-state.service';
import { FolderService } from '../../../folders/services/folder.service';
import { NoteService } from '../../../../core/services/note.service';
import { ToastService } from '../../../../core/services/toast.service';
import { WorkspaceStateService } from '../../../../core/services/workspace-state.service';

@Component({
  selector: 'app-note-workspace',
  standalone: true,
  imports: [CommonModule, MarkdownEditorComponent],
  template: `
    <div class="h-full flex flex-col">
      <!-- Toolbar -->
      <div class="flex-1 h-full overflow-y-auto p-4 flex flex-col gap-4">
        <div class="flex items-center gap-3 flex-wrap">
          <button class="px-3 py-1.5 rounded bg-primary-600 text-white text-sm" (click)="createNewNote()">New Note</button>
          <span *ngIf="selectedNoteId()" class="text-xs text-gray-500">ID: {{ selectedNoteId() }}</span>
        </div>

        <!-- Title input -->
        <input
          *ngIf="currentMode() !== 'empty'"
          class="text-xl font-semibold bg-transparent border-b border-gray-300 dark:border-gray-700 focus:outline-none focus:border-primary-500 text-gray-900 dark:text-gray-100 py-1"
          [value]="title()"
          (input)="onTitleInput($event)"
          placeholder="Note title" />

        <!-- Editor -->
        <app-markdown-editor
          *ngIf="currentMode() !== 'empty'"
          [initialContent]="content()"
          (contentChange)="content.set($event)"
        />

        <!-- Empty state -->
        <div *ngIf="currentMode() === 'empty'" class="text-center py-24 text-gray-500 dark:text-gray-400">
          Select a folder and create a note to begin.
        </div>

        <!-- Actions -->
        <div *ngIf="currentMode() === 'editing'" class="flex gap-2 flex-wrap">
          <button class="px-4 py-2 rounded bg-primary-600 text-white text-sm disabled:opacity-40" [disabled]="saving()" (click)="saveNote()">
            {{ saving() ? 'Saving…' : (selectedNoteId() ? 'Save' : 'Create') }}
          </button>
          <button *ngIf="selectedNoteId()" class="px-4 py-2 rounded border border-red-600 text-red-600 text-sm hover:bg-red-50 dark:hover:bg-red-900/30" (click)="deleteNote()">Delete</button>
        </div>

        <!-- Notes list removed; rely on folder tree for navigation -->
      </div>
    </div>
  `,
  styles: []
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

  title = signal('');
  content = signal('');
  saving = signal(false);

  currentMode = computed(() => {
    if (!this.selectedFolderId()) return 'empty';
    return 'editing';
  });

  flatFolders = computed(() => {
    const all: FolderTree[] = [];
    const walk = (list: FolderTree[]) => list.forEach(f => { all.push(f); if (f.children) walk(f.children); });
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
      const root = this.folders().find(f => f.is_root);
      if (root) {
        this.workspaceState.setSelectedFolder(root.id);
      }
    }
    // Initial notes load if pre-selected
    if (this.selectedFolderId()) {
      await this.loadNotes(this.selectedFolderId()!);
    }
    // React to external note creation (e.g., from sidebar tree dropdown)
    this.workspaceState.noteCreated$.subscribe(note => {
      // Folder should already be selected by creator; if not, select now
      if (note.folder_id && note.folder_id !== this.selectedFolderId()) {
        this.workspaceState.setSelectedFolder(note.folder_id);
      }
      if (note.folder_id === this.selectedFolderId()) {
        this.openNote(note);
        // Inject into list optimistically before full reload
        this.notes.update(list => [note, ...list.filter(n => n.id !== note.id)]);
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

        // Fetch full note to ensure content is loaded and then update fields
        const userId = this.auth.userId();
        const full = await this.noteService.getNote(noteRef.id, userId);
        if (full) {
          this.selectedNoteId.set(full.id);
          this.title.set(full.title);
          this.content.set(full.content || '');
        }
      } catch (e:any) {
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
    } catch (e:any) {
      console.error(e); this.toast.error('Failed to load folders');
    }
  }

  async loadNotes(folderId: string) {
    try {
      const userId = this.auth.userId();
      const list = await this.noteService.getNotesForFolder(folderId, userId);
      this.notes.set(list);
    } catch (e:any) {
      console.error(e); this.toast.error('Failed to load notes');
    }
  }

  onFolderDropdownChange(e: Event) {
    const val = (e.target as HTMLSelectElement).value;
    this.workspaceState.setSelectedFolder(val);
  }

  createNewNote() {
    if (!this.selectedFolderId()) { this.toast.info('Select a folder first'); return; }
    this.selectedNoteId.set(null);
    this.title.set('Untitled');
    this.content.set('');
  }

  async saveNote() {
    if (!this.selectedFolderId()) return;
    const userId = this.auth.userId();
    const t = (this.title() || 'Untitled').trim();
    const c = this.content();
    this.saving.set(true);
    try {
      if (!this.selectedNoteId()) {
        const created = await this.noteService.createNote(userId, { title: t, content: c, folder_id: this.selectedFolderId()! });
        this.selectedNoteId.set(created.id);
        this.toast.success('Note created');
      } else {
        const updated = await this.noteService.updateNote(this.selectedNoteId()!, userId, { title: t, content: c, folder_id: this.selectedFolderId()! });
        this.toast.success('Note saved');
        this.title.set(updated.title);
      }
      await this.loadNotes(this.selectedFolderId()!);
    } catch (e:any) {
      console.error(e); this.toast.error('Failed to save note');
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
      this.title.set(''); this.content.set('');
      await this.loadNotes(this.selectedFolderId()!);
    } catch (e:any) {
      console.error(e); this.toast.error('Failed to delete note');
    }
  }

  openNote(note: any) {
    this.selectedNoteId.set(note.id);
    this.title.set(note.title);
    if (note.content === undefined) {
      // Defensive: fetch if content missing
      const userId = this.auth.userId();
      this.noteService.getNote(note.id, userId)
        .then(full => {
          if (full) this.content.set(full.content || '');
        })
        .catch(err => {
          console.error(err);
          this.content.set('');
        });
    } else {
      this.content.set(note.content || '');
    }
  }


  onTitleInput(e: Event) {
    const input = e.target as HTMLInputElement; this.title.set(input.value);
  }
}
