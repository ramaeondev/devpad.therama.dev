import { Routes } from '@angular/router';
export const changelogRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('../../../../shared/components/ui/changelog-page.component').then(m => m.ChangelogPageComponent),
  },
];
