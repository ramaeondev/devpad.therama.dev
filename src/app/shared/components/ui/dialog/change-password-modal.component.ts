import { Component, EventEmitter, Output, signal, inject } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../../../core/services/supabase.service';
import { ToastService } from '../../../../core/services/toast.service';
import { LoadingService } from '../../../../core/services/loading.service';

@Component({
  selector: 'app-change-password-modal',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div
      class="fixed inset-0 z-[70] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div class="absolute inset-0 bg-black/40" (click)="onCancel()"></div>
      <div
        class="relative w-full max-w-md rounded-lg bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700 p-5"
        (click)="$event.stopPropagation()"
      >
        <h3 class="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">Change Password</h3>
        
        <div class="space-y-4">
          <div>
            <label class="block text-sm text-gray-600 dark:text-gray-400 mb-1" for="currentPassword">
              Current Password
            </label>
            <input
              id="currentPassword"
              type="password"
              class="w-full rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              [(ngModel)]="currentPassword"
              (keydown.escape)="onCancel()"
              autofocus
              autocomplete="current-password"
            />
          </div>

          <div>
            <label class="block text-sm text-gray-600 dark:text-gray-400 mb-1" for="newPassword">
              New Password
            </label>
            <input
              id="newPassword"
              type="password"
              class="w-full rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              [(ngModel)]="newPassword"
              autocomplete="new-password"
            />
            @if (newPassword && newPassword.length < 6) {
              <p class="mt-1 text-xs text-amber-600 dark:text-amber-400">
                Password must be at least 6 characters
              </p>
            }
          </div>

          <div>
            <label class="block text-sm text-gray-600 dark:text-gray-400 mb-1" for="confirmPassword">
              Confirm New Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              class="w-full rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              [(ngModel)]="confirmPassword"
              (keydown.enter)="trySubmit()"
              autocomplete="new-password"
            />
            @if (confirmPassword && newPassword !== confirmPassword) {
              <p class="mt-1 text-xs text-red-600 dark:text-red-400">
                Passwords do not match
              </p>
            }
          </div>

          @if (error()) {
            <div class="rounded-md bg-red-50 dark:bg-red-900/20 p-3">
              <p class="text-sm text-red-800 dark:text-red-200">{{ error() }}</p>
            </div>
          }
        </div>

        <div class="mt-6 flex justify-end gap-2">
          <button
            type="button"
            class="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            (click)="onCancel()"
            [disabled]="loading()"
          >
            Cancel
          </button>
          <button
            type="button"
            class="px-4 py-2 text-sm rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            [disabled]="!canSubmit() || loading()"
            (click)="trySubmit()"
          >
            @if (loading()) {
              <span>Changing...</span>
            } @else {
              <span>Change Password</span>
            }
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [],
})
export class ChangePasswordModalComponent {
  @Output() cancel = new EventEmitter<void>();
  @Output() success = new EventEmitter<void>();

  private supabase = inject(SupabaseService);
  private toast = inject(ToastService);
  private loadingService = inject(LoadingService);

  currentPassword = '';
  newPassword = '';
  confirmPassword = '';
  error = signal<string | null>(null);
  loading = signal(false);

  canSubmit(): boolean {
    return (
      !!this.currentPassword &&
      !!this.newPassword &&
      this.newPassword.length >= 6 &&
      this.newPassword === this.confirmPassword
    );
  }

  onCancel() {
    this.cancel.emit();
  }

  async trySubmit() {
    if (!this.canSubmit()) return;

    this.error.set(null);
    this.loading.set(true);

    try {
      await this.loadingService.withLoading(async () => {
        // First, verify the current password by attempting to sign in
        const session = await this.supabase.auth.getSession();
        if (!session.data.session) {
          throw new Error('Not authenticated');
        }

        const email = session.data.session.user.email;
        if (!email) {
          throw new Error('Email not found');
        }

        // Verify current password
        const { error: signInError } = await this.supabase.auth.signInWithPassword({
          email,
          password: this.currentPassword,
        });

        if (signInError) {
          throw new Error('Current password is incorrect');
        }

        // Update password
        const { error: updateError } = await this.supabase.auth.updateUser({
          password: this.newPassword,
        });

        if (updateError) {
          throw updateError;
        }
      });

      this.toast.success('Password changed successfully');
      this.success.emit();
    } catch (error: any) {
      this.error.set(error.message || 'Failed to change password');
      this.toast.error(error.message || 'Failed to change password');
    } finally {
      this.loading.set(false);
    }
  }
}


