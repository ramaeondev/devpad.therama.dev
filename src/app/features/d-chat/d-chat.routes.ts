import { Routes } from '@angular/router';

export const dChatRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/d-chat.component').then((m) => m.DChatComponent),
    title: 'D-Chat - Retro Chat',
  },
];
