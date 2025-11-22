import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/home/pages/home/home.component').then(m => m.HomeComponent),
  },
  {
    path: 'changelog',
    loadChildren: () => import('./features/home/pages/changelog/changelog.routes').then(m => m.changelogRoutes),
  },
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.routes'),
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadChildren: () => import('./features/dashboard/dashboard.routes'),
  },
  {
    path: 'notes',
    canActivate: [authGuard],
    loadChildren: () => import('./features/notes/notes.routes'),
  },
  {
    path: 'folders',
    canActivate: [authGuard],
    loadChildren: () => import('./features/folders/folders.routes'),
  },
  {
    path: 'legal',
    loadChildren: () => import('./features/legal/legal.routes').then(m => m.legalRoutes),
  },
  {
    path: '**',
    redirectTo: 'dashboard',
  },
];
