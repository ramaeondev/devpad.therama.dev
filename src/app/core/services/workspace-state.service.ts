import { Injectable, signal } from '@angular/core';
import { Subject } from 'rxjs';
import { Note } from '../models/note.model';
import { GoogleDriveFile, OneDriveFile } from '../models/integration.model';

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

  // Emits when a Google Drive file is selected for preview
  private _googleDriveFileSelected$ = new Subject<GoogleDriveFile>();
  googleDriveFileSelected$ = this._googleDriveFileSelected$.asObservable();

  // Emits when a OneDrive file is selected for preview
  private _oneDriveFileSelected$ = new Subject<OneDriveFile>();
  oneDriveFileSelected$ = this._oneDriveFileSelected$.asObservable();

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

  emitGoogleDriveFileSelected(file: GoogleDriveFile) {
    this._googleDriveFileSelected$.next(file);
  }

  emitOneDriveFileSelected(file: OneDriveFile) {
    this._oneDriveFileSelected$.next(file);
  }
}
