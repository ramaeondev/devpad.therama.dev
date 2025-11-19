import { Component, inject, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MarkdownEditorComponent } from '../../components/markdown-editor/markdown-editor.component';
import { DocumentPreviewComponent } from '../../../../shared/components/ui/document-preview/document-preview.component';
import { NoteService } from '../../../../core/services/note.service';
import { SupabaseService } from '../../../../core/services/supabase.service';
import { AuthStateService } from '../../../../core/services/auth-state.service';
import { ToastService } from '../../../../core/services/toast.service';
import { WorkspaceStateService } from '../../../../core/services/workspace-state.service';

@Component({
  selector: 'app-note-editor',
  standalone: true,
  imports: [CommonModule, RouterLink, MarkdownEditorComponent, DocumentPreviewComponent],
  template: `
    <div class="h-full w-full p-4 md:p-6">
      <div class="max-w-6xl mx-auto flex flex-col gap-4">
        <!-- Header -->
        <div class="flex flex-col md:flex-row md:items-center gap-3">
          <input
            class="w-full md:flex-1 text-2xl font-semibold bg-transparent border-b border-gray-300 dark:border-gray-700 focus:outline-none focus:border-primary-500 text-gray-900 dark:text-gray-100 py-1"
            [value]="title()"
            [disabled]="isDocument()"
            (input)="onTitleInput($event)"
            placeholder="Note title"
          />
          <div class="flex gap-2">
            @if (!isDocument()) {
              <button
                class="px-4 py-2 rounded bg-primary-600 text-white disabled:opacity-40"
                [disabled]="saving()"
                (click)="onSave()"
              >
                {{ isNew() ? (saving() ? 'Creating…' : 'Create') : saving() ? 'Saving…' : 'Save' }}
              </button>
            }
            @if (!isNew()) {
              <button
                class="px-4 py-2 rounded border border-red-600 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30"
                (click)="onDelete()"
              >
                Delete
              </button>
            }
            <a
              routerLink="/notes"
              class="px-4 py-2 rounded border border-gray-300 dark:border-gray-600"
              >Back</a
            >
          </div>
        </div>

        <!-- Editor Component -->
        @if (isDocument()) {
          <app-document-preview [note]="currentNote()"></app-document-preview>
        } @else {
            <app-markdown-editor #mdEditor
              [initialContent]="content()"
              [userId]="auth.userId()"
              [noteId]="noteId() ?? undefined"
              (contentChange)="content.set($event)"
              (imagePasted)="onImagePasted($event)"
              (imageUploadRequested)="onImageUploadRequested($event)"
            ></app-markdown-editor>
        }
      </div>
    </div>
  `,
})
export class NoteEditorComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private noteService = inject(NoteService);
  auth = inject(AuthStateService);
  private toast = inject(ToastService);
  private workspaceState = inject(WorkspaceStateService);
  private supabase = inject(SupabaseService);

  // state signals
  title = signal('');
  content = signal('');
  saving = signal(false);
  noteId = signal<string | null>(null);
  isNew = signal(true);
  currentNote = signal<any>(null);
  @ViewChild('mdEditor') mdEditor?: MarkdownEditorComponent;

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
      this.currentNote.set(note);
      this.title.set(note.title);
      this.content.set(note.content || '');
    } catch (e: any) {
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
        const created = await this.noteService.createNote(userId, {
          title: t,
          content: c,
          folder_id: null,
        });
        this.toast.success('Note created');
        // Notify other parts of the app (folder tree, workspace) that a note was created
        try {
          this.workspaceState.emitNoteCreated(created);
          this.workspaceState.emitFoldersChanged();
        } catch (e) {
          // ignore
        }
        this.isNew.set(false);
        this.noteId.set(created.id);
        // navigate to edit route (keeping content)
        this.router.navigate(['/notes', created.id, 'edit']);
      } else if (this.noteId()) {
        const updated = await this.noteService.updateNote(this.noteId()!, userId, {
          title: t,
          content: c,
        });
        this.toast.success('Note saved');
        this.title.set(updated.title);
      }
    } catch (e: any) {
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
    } catch (e: any) {
      console.error(e);
      this.toast.error('Failed to delete note');
    }
  }
  isDocument(): boolean {
    return this.content().startsWith('storage://');
  }

  onTitleInput(e: Event) {
    const input = e.target as HTMLInputElement;
    this.title.set(input.value);
  }

  async onImagePasted(e: { storagePath: string; signedUrl: string; placeholder: string }) {
    // Replace the temporary signed URL with a persistent storage reference and save the note
    if (this.isNew()) {
      this.toast.error('Please save the note before adding images.');
      return;
    }
    if (!this.noteId()) {
      this.toast.error('Note ID missing');
      return;
    }
    const userId = this.auth.userId();
    try {
      const storageRef = `storage://notes/${e.storagePath}`;
      const updatedContent = this.content().replace(e.signedUrl, storageRef);
      this.content.set(updatedContent);
      // Persist the updated content to the note
      await this.noteService.updateNote(this.noteId()!, userId, { content: updatedContent });
      this.toast.success('Image saved');
    } catch (err: any) {
      console.error('Failed to persist pasted image', err);
      this.toast.error('Failed to save image to note');
    }
  }

  async onImageUploadRequested(e: { file: File; placeholderToken: string; placeholderMarkdown: string }) {
    console.log('onImageUploadRequested called', { isNew: this.isNew(), noteId: this.noteId() });
    const userId = this.auth.userId();
    if (!userId) {
      this.toast.error('User not authenticated');
      return;
    }

    // If this is a new note, create it first using current title/content (which already contains placeholder)
    try {
      if (this.isNew()) {
        const created = await this.noteService.createNote(userId, {
          title: (this.title() || 'Untitled').trim(),
          content: this.content(),
          folder_id: null,
        });
        this.toast.success('Note created');
        try {
          this.workspaceState.emitNoteCreated(created);
          this.workspaceState.emitFoldersChanged();
        } catch (err) {}
        this.isNew.set(false);
        this.noteId.set(created.id);
        // navigate to edit route
        this.router.navigate(['/notes', created.id, 'edit']);
      }

      if (!this.noteId()) {
        this.toast.error('Note ID unavailable');
        return;
      }

      // Upload the file to storage under notes bucket
      const file = e.file;
      const ext = (file.name.split('.').pop() || 'png').toLowerCase();
      const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
      const path = `${userId}/${this.noteId()}/images/${id}.${ext}`;
      const { error: upErr } = await this.supabase.storage.from('notes').upload(path, file, {
        upsert: true,
        contentType: file.type || `image/${ext}`,
      });
      if (upErr) throw upErr;

      // Create signed URL for immediate preview
      const { data: urlData, error: urlErr } = await this.supabase.storage.from('notes').createSignedUrl(path, 3600);
      if (urlErr || !urlData?.signedUrl) throw urlErr || new Error('Failed to create signed URL');

      // Replace placeholder in editor with signed URL for immediate preview
      this.mdEditor?.replacePlaceholderToken(e.placeholderToken, urlData.signedUrl);

      // Persist note content by replacing signed URL with storage:// reference and saving
      const storageRef = `storage://notes/${path}`;
      const updatedContent = this.content().replace(urlData.signedUrl, storageRef);
      this.content.set(updatedContent);
      // Also update editor textarea to show storage ref instead of the expiring signed URL
      this.mdEditor?.replacePlaceholderToken(urlData.signedUrl, storageRef);
      await this.noteService.updateNote(this.noteId()!, userId, { content: updatedContent });
      this.toast.success('Image saved');
    } catch (err: any) {
      console.error('Image upload requested failed', err);
      this.toast.error(err?.message || 'Failed to upload pasted image');
      // Replace placeholder with error text in editor
      this.mdEditor?.replacePlaceholderToken(e.placeholderToken, '[Image upload failed]');
    }
  }
}
