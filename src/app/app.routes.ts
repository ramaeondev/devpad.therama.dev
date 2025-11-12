import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.routes')
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadChildren: () => import('./features/dashboard/dashboard.routes')
  },
  {
    path: 'notes',
    canActivate: [authGuard],
    loadChildren: () => import('./features/notes/notes.routes')
  },
  {
    path: 'folders',
    canActivate: [authGuard],
    loadChildren: () => import('./features/folders/folders.routes')
  },
  {
    path: '**',
    redirectTo: 'dashboard'
  }
];
