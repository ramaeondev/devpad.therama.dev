import { Routes } from '@angular/router';

export default [
  {
    path: '',
    loadComponent: () =>
      import('./pages/note-list/note-list.component').then((m) => m.NoteListComponent),
  },
  {
    path: 'new',
    loadComponent: () =>
      import('./pages/note-editor/note-editor.component').then((m) => m.NoteEditorComponent),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./pages/note-detail/note-detail.component').then((m) => m.NoteDetailComponent),
  },
  {
    path: ':id/edit',
    loadComponent: () =>
      import('./pages/note-editor/note-editor.component').then((m) => m.NoteEditorComponent),
  },
] as Routes;
