import { Routes } from '@angular/router';

export default [
  {
    path: '',
    loadComponent: () => import('./pages/dashboard-home/dashboard-home.component').then(m => m.DashboardHomeComponent)
  }
] as Routes;
