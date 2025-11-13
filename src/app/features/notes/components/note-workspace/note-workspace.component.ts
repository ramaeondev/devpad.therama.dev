import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FolderTreeComponent } from '../../../folders/components/folder-tree/folder-tree.component';
import { MarkdownEditorComponent } from '../markdown-editor/markdown-editor.component';
import { FolderTree } from '../../../../core/models/folder.model';
import { AuthStateService } from '../../../../core/services/auth-state.service';
import { FolderService } from '../../../folders/services/folder.service';
import { NoteService } from '../../../../core/services/note.service';
import { ToastService } from '../../../../core/services/toast.service';

@Component({
  selector: 'app-note-workspace',
  standalone: true,
  imports: [CommonModule, FolderTreeComponent, MarkdownEditorComponent],
  template: `
    <div class="h-full flex flex-col md:flex-row">
      <!-- Left: Folder Tree -->
      <div class="w-full md:w-64 lg:w-72 shrink-0 border-r border-gray-200 dark:border-gray-700 p-3 overflow-y-auto">
        <app-folder-tree
          [folders]="folders()"
          [selectedFolderId]="selectedFolderId() || undefined"
          (folderSelected)="onFolderSelected($event)"
          (treeChanged)="reloadFolders()"
          (noteSelected)="onNoteSelected($event)"
        />
      </div>

      <!-- Center: Editor & Note List -->
      <div class="flex-1 h-full overflow-y-auto p-4 flex flex-col gap-4">
        <div class="flex items-center gap-3 flex-wrap">
          <select class="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-800 text-sm" [value]="selectedFolderId()" (change)="onFolderDropdownChange($event)">
            <option *ngFor="let f of flatFolders()" [value]="f.id">{{ f.name }}</option>
          </select>
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

        <!-- Note list for folder -->
        <div *ngIf="notes().length > 0" class="mt-6">
          <h3 class="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2">Notes in Folder</h3>
          <ul class="space-y-1">
            <li *ngFor="let n of notes()" (click)="openNote(n)" class="px-3 py-2 rounded cursor-pointer flex justify-between items-center text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
              [class.bg-gray-100]="selectedNoteId() === n.id" [class.dark:bg-gray-800]="selectedNoteId() === n.id">
              <span class="truncate">{{ n.title }}</span>
              <span class="text-xs text-gray-400">{{ n.updated_at | date:'short' }}</span>
            </li>
          </ul>
        </div>
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

  folders = signal<FolderTree[]>([]);
  selectedFolderId = signal<string | null>(null);

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

  async ngOnInit() {
    await this.reloadFolders();
    // auto-select root
    const root = this.folders().find(f => f.is_root);
    if (root) {
      this.selectedFolderId.set(root.id);
      await this.loadNotes(root.id);
    }
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

  onFolderSelected(folder: FolderTree) {
    this.selectedFolderId.set(folder.id);
    this.selectedNoteId.set(null);
    this.title.set('');
    this.content.set('');
    this.loadNotes(folder.id);
  }

  onFolderDropdownChange(e: Event) {
    const val = (e.target as HTMLSelectElement).value;
    this.selectedFolderId.set(val);
    this.selectedNoteId.set(null);
    this.title.set(''); this.content.set('');
    this.loadNotes(val);
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
    this.content.set(note.content || '');
  }

  onNoteSelected(note: any) {
    // if folder tree emits note selection in future
    this.openNote(note);
  }

  onTitleInput(e: Event) {
    const input = e.target as HTMLInputElement; this.title.set(input.value);
  }
}
