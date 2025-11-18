import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { SupabaseService } from '../../../../core/services/supabase.service';
import { ToastService } from '../../../../core/services/toast.service';
import { LogoComponent } from '../../../../shared/components/ui/logo/logo.component';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, LogoComponent],
  template: `
    <div
      class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4"
    >
      <div class="max-w-md w-full space-y-8">
        <div class="text-center">
          <div class="flex justify-center mb-4">
            <app-logo></app-logo>
          </div>
          <h2 class="text-3xl font-bold text-gray-900 dark:text-white">Forgot password?</h2>
          <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Enter your email and we'll send you a reset link
          </p>
        </div>
        <form class="space-y-6" [formGroup]="form" (ngSubmit)="onSubmit()">
          <input
            type="email"
            formControlName="email"
            class="input"
            placeholder="Email address"
            required
          />
          <button
            type="submit"
            [disabled]="loading() || form.invalid"
            class="btn btn-primary w-full py-2"
          >
            {{ loading() ? 'Sending...' : 'Send Reset Link' }}
          </button>
          <div class="text-center">
            <a routerLink="/auth/signin" class="text-sm text-primary-600 hover:text-primary-500">
              Back to Sign In
            </a>
          </div>
        </form>
      </div>
    </div>
  `,
})
export class ForgotPasswordComponent {
  private fb = inject(FormBuilder);
  private supabase = inject(SupabaseService);
  private toast = inject(ToastService);

  loading = signal(false);

  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  async onSubmit() {
    if (this.form.invalid) return;
    this.loading.set(true);

    try {
      const { error } = await this.supabase.auth.resetPasswordForEmail(this.form.value.email!);
      if (error) throw error;
      this.toast.success('Password reset email sent!');
    } catch (error: any) {
      this.toast.error(error.message || 'Failed to send reset email');
    } finally {
      this.loading.set(false);
    }
  }
}
