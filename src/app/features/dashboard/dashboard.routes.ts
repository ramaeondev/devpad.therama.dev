import { Routes } from '@angular/router';

export default [
  {
    path: '',
    loadComponent: () => import('../../layouts/dashboard-layout/dashboard-layout.component').then(m => m.DashboardLayoutComponent),
    children: [
      {
        path: '',
        loadComponent: () => import('./pages/dashboard-home/dashboard-home.component').then(m => m.DashboardHomeComponent)
      }
    ]
  }
] as Routes;
