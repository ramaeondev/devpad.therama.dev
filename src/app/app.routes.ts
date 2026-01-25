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
    path: 'd-chat',
    canActivate: [authGuard],
    loadChildren: () => import('./features/d-chat/d-chat.routes').then(m => m.dChatRoutes),
  },
  {
    path: 'share/:shareToken',
    loadComponent: () => import('./features/notes/pages/public-note/public-note.component').then(m => m.PublicNoteComponent),
    title: 'Shared Note - DevPad',
  },
  {
    path: 'policy',
    loadComponent: () => import('./features/legal/pages/privacy/privacy.component').then(m => m.PrivacyComponent),
    title: 'Privacy Policy - DevPad',
  },
  {
    path: 'terms',
    loadComponent: () => import('./features/legal/pages/terms/terms.component').then(m => m.TermsComponent),
    title: 'Terms of Service - DevPad',
  },
  {
    path: '**',
    redirectTo: 'dashboard',
  },
];
