import { Routes } from '@angular/router';

export const legalRoutes: Routes = [
  {
    path: 'policy',
    loadComponent: () =>
      import('./pages/privacy/privacy.component').then((m) => m.PrivacyComponent),
    title: 'Privacy Policy - DevPad',
  },
  {
    path: 'terms',
    loadComponent: () =>
      import('./pages/terms/terms.component').then((m) => m.TermsComponent),
    title: 'Terms of Service - DevPad',
  },
];
