import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LogoComponent } from '../../../../shared/components/ui/logo/logo.component';

@Component({
  selector: 'app-confirm-email',
  standalone: true,
  imports: [CommonModule, RouterLink, LogoComponent],
  template: `
    <div
      class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4"
    >
      <div class="max-w-md w-full text-center space-y-6">
        <div class="flex justify-center mb-4">
          <app-logo></app-logo>
        </div>
        <div class="text-6xl">📧</div>
        <h2 class="text-3xl font-bold text-gray-900 dark:text-white">Check your email</h2>
        <p class="text-gray-600 dark:text-gray-400">
          We've sent you a confirmation link. Please check your email and click the link to activate
          your account.
        </p>
        <a routerLink="/auth/signin" class="btn btn-primary inline-block px-6 py-2">
          Go to Sign In
        </a>
      </div>
    </div>
  `,
})
export class ConfirmEmailComponent {}
