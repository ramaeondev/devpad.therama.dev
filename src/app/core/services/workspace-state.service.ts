import { Injectable, signal } from '@angular/core';
import { Subject } from 'rxjs';
import { Note } from '../models/note.model';

@Injectable({ providedIn: 'root' })
export class WorkspaceStateService {
  // Currently selected folder across app (null = none)
  selectedFolderId = signal<string | null>(null);
  // Currently selected note across app (null = none)
  selectedNoteId = signal<string | null>(null);

  // Emits when a note is created (from any component)
  private _noteCreated$ = new Subject<Note>();
  noteCreated$ = this._noteCreated$.asObservable();

  // Emits when folders / folder tree changed and consumers should reload
  private _foldersChanged$ = new Subject<void>();
  foldersChanged$ = this._foldersChanged$.asObservable();

  // Emits when a note is selected (e.g., from folder tree)
  private _noteSelected$ = new Subject<Note>();
  noteSelected$ = this._noteSelected$.asObservable();

  setSelectedFolder(id: string | null) {
    this.selectedFolderId.set(id);
  }

  emitNoteCreated(note: Note) {
    this._noteCreated$.next(note);
  }

  emitFoldersChanged() {
    this._foldersChanged$.next();
  }

  emitNoteSelected(note: Note) {
    this._noteSelected$.next(note);
    this.selectedNoteId.set(note.id);
  }

  setSelectedNote(id: string | null) {
    this.selectedNoteId.set(id);
  }
}
