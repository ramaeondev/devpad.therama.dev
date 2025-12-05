import { Routes } from '@angular/router';

export default [
  {
    path: '',
    loadComponent: () =>
      import('../../layouts/dashboard-layout/dashboard-layout.component').then(
        (m) => m.DashboardLayoutComponent,
      ),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('../notes/components/note-workspace/note-workspace.component').then(
            (m) => m.NoteWorkspaceComponent,
          ),
      },
      {
        path: 'activity-log',
        loadComponent: () =>
          import('../activity-log/pages/activity-log-page/activity-log-page').then(
            (m) => m.ActivityLogPageComponent,
          ),
        title: 'Activity Log - DevPad',
      },
      // Encryption settings now live in the Settings Panel modal, no standalone route.
    ],
  },
] as Routes;
