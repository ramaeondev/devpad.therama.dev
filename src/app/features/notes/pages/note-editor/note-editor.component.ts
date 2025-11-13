import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MarkdownEditorComponent } from '../../components/markdown-editor/markdown-editor.component';
import { NoteService } from '../../../../core/services/note.service';
import { AuthStateService } from '../../../../core/services/auth-state.service';
import { ToastService } from '../../../../core/services/toast.service';

@Component({
  selector: 'app-note-editor',
  standalone: true,
  imports: [CommonModule, RouterLink, MarkdownEditorComponent],
  template: `
    <div class="h-full w-full p-4 md:p-6">
      <div class="max-w-6xl mx-auto flex flex-col gap-4">
        <!-- Header -->
        <div class="flex flex-col md:flex-row md:items-center gap-3">
          <input
            class="w-full md:flex-1 text-2xl font-semibold bg-transparent border-b border-gray-300 dark:border-gray-700 focus:outline-none focus:border-primary-500 text-gray-900 dark:text-gray-100 py-1"
            [value]="title()"
            (input)="onTitleInput($event)"
            placeholder="Note title" />
          <div class="flex gap-2">
            <button class="px-4 py-2 rounded bg-primary-600 text-white disabled:opacity-40" [disabled]="saving()" (click)="onSave()">
              {{ isNew() ? (saving() ? 'Creating…' : 'Create') : (saving() ? 'Saving…' : 'Save') }}
            </button>
            @if (!isNew()) {
              <button class="px-4 py-2 rounded border border-red-600 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30" (click)="onDelete()">Delete</button>
            }
            <a routerLink="/notes" class="px-4 py-2 rounded border border-gray-300 dark:border-gray-600">Back</a>
          </div>
        </div>

        <!-- Editor Component -->
        <app-markdown-editor
          [initialContent]="content()"
          (contentChange)="content.set($event)"
        ></app-markdown-editor>
      </div>
    </div>
  `
})
export class NoteEditorComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private noteService = inject(NoteService);
  private auth = inject(AuthStateService);
  private toast = inject(ToastService);

  // state signals
  title = signal('');
  content = signal('');
  saving = signal(false);
  noteId = signal<string | null>(null);
  isNew = signal(true);

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id && id !== 'new') {
      this.isNew.set(false);
      this.noteId.set(id);
      await this.loadNote(id);
    } else {
      this.isNew.set(true);
    }
  }

  private async loadNote(id: string) {
    try {
      const userId = this.auth.userId();
      const note = await this.noteService.getNote(id, userId);
      if (!note) {
        this.toast.error('Note not found');
        this.router.navigate(['/notes']);
        return;
      }
      this.title.set(note.title);
      this.content.set(note.content || '');
    } catch (e:any) {
      console.error(e);
      this.toast.error('Failed to load note');
    }
  }

  async onSave() {
    const userId = this.auth.userId();
    const t = (this.title() || 'Untitled').trim();
    const c = this.content();
    this.saving.set(true);
    try {
      if (this.isNew()) {
        const created = await this.noteService.createNote(userId, { title: t, content: c, folder_id: null });
        this.toast.success('Note created');
        this.isNew.set(false);
        this.noteId.set(created.id);
        // navigate to edit route (keeping content)
        this.router.navigate(['/notes', created.id, 'edit']);
      } else if (this.noteId()) {
        const updated = await this.noteService.updateNote(this.noteId()!, userId, { title: t, content: c });
        this.toast.success('Note saved');
        this.title.set(updated.title);
      }
    } catch (e:any) {
      console.error(e);
      this.toast.error('Failed to save note');
    } finally {
      this.saving.set(false);
    }
  }

  async onDelete() {
    if (!this.noteId()) return;
    const userId = this.auth.userId();
    try {
      await this.noteService.deleteNote(this.noteId()!, userId);
      this.toast.success('Note deleted');
      this.router.navigate(['/notes']);
    } catch (e:any) {
      console.error(e);
      this.toast.error('Failed to delete note');
    }
  }
  onTitleInput(e: Event) {
    const input = e.target as HTMLInputElement;
    this.title.set(input.value);
  }
}
