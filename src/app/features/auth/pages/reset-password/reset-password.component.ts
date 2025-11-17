import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div
      class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4"
    >
      <div class="max-w-md w-full text-center">
        <h2 class="text-3xl font-bold text-gray-900 dark:text-white">Reset Password</h2>
        <p class="mt-4 text-gray-600 dark:text-gray-400">
          Password reset functionality coming soon
        </p>
        <a routerLink="/auth/signin" class="btn btn-primary inline-block mt-6 px-6 py-2">
          Back to Sign In
        </a>
      </div>
    </div>
  `,
})
export class ResetPasswordComponent {}
