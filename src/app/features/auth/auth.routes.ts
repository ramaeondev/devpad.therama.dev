import { Routes } from '@angular/router';

export default [
  {
    path: '',
    redirectTo: 'signin',
    pathMatch: 'full',
  },
  {
    path: 'signin',
    loadComponent: () => import('./pages/signin/signin.component').then((m) => m.SigninComponent),
  },
  {
    path: 'signup',
    loadComponent: () => import('./pages/signup/signup.component').then((m) => m.SignupComponent),
  },
  {
    path: 'forgot-password',
    loadComponent: () =>
      import('./pages/forgot-password/forgot-password.component').then(
        (m) => m.ForgotPasswordComponent,
      ),
  },
  {
    path: 'reset-password',
    loadComponent: () =>
      import('./pages/reset-password/reset-password.component').then(
        (m) => m.ResetPasswordComponent,
      ),
  },
  {
    path: 'confirm-email',
    loadComponent: () =>
      import('./pages/confirm-email/confirm-email.component').then((m) => m.ConfirmEmailComponent),
  },
  {
    path: 'callback',
    loadComponent: () =>
      import('./pages/github-callback/github-callback.component').then(
        (m) => m.GithubCallbackComponent,
      ),
  },
  {
    path: 'callback/onedrive',
    loadComponent: () =>
      import('./pages/onedrive-callback/onedrive-callback.component').then(
        (m) => m.OneDriveCallbackComponent,
      ),
  },
  {
    path: 'callback/github',
    loadComponent: () =>
      import('./pages/github-callback/github-callback.component').then(
        (m) => m.GithubCallbackComponent,
      ),
  },
  {
    path: 'callback/google',
    loadComponent: () =>
      import('./pages/google-callback/google-callback.component').then(
        (m) => m.GoogleCallbackComponent,
      ),
  },
  {
    path: 'callback/gitlab',
    loadComponent: () =>
      import('./pages/gitlab-callback/gitlab-callback.component').then(
        (m) => m.GitLabCallbackComponent,
      ),
  },
  {
    path: 'callback/discord',
    loadComponent: () =>
      import('./pages/discord-callback/discord-callback.component').then(
        (m) => m.DiscordCallbackComponent,
      ),
  },
  {
    path: 'logout',
    loadComponent: () =>
      import('./pages/logout/logout.component').then(
        (m) => m.LogoutComponent,
      ),
  },
] as Routes;
