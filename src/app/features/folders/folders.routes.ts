import { Routes } from '@angular/router';

export default [
  {
    path: '',
    loadComponent: () => import('./pages/folder-list/folder-list.component').then(m => m.FolderListComponent)
  },
  {
    path: ':id',
    loadComponent: () => import('./pages/folder-list/folder-list.component').then(m => m.FolderListComponent)
  }
] as Routes;
