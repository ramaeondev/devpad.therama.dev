import { Routes } from '@angular/router';

export default [
  {
    path: '',
    loadComponent: () => import('./pages/d-chat.component').then((m) => m.DChatComponent),
  },
] as Routes;
