import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { SupabaseService } from '../../../../core/services/supabase.service';
import { ToastService } from '../../../../core/services/toast.service';
import { LogoComponent } from '../../../../shared/components/ui/logo/logo.component';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, LogoComponent],
  template: `
    <div
      class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-8 sm:py-12 px-4 sm:px-6 lg:px-8"
    >
      <div class="max-w-md w-full space-y-6 sm:space-y-8">
        <div>
          <h2
            class="mt-4 sm:mt-6 text-center text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white"
          >
            <span class="text-gray-900 dark:text-gray-100 inline-block">
              <app-logo [isClickable]="true"></app-logo>
            </span>
          </h2>
          <p class="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            Create your account
          </p>
        </div>
        <form
          class="mt-6 sm:mt-8 space-y-5 sm:space-y-6"
          [formGroup]="signupForm"
          (ngSubmit)="onSubmit()"
        >
          <div class="rounded-md shadow-sm space-y-3 sm:space-y-4">
            <div class="grid grid-cols-2 gap-2 sm:gap-3">
              <div>
                <label for="firstName" class="sr-only">First name</label>
                <input
                  id="firstName"
                  type="text"
                  formControlName="firstName"
                  class="input text-base touch-manipulation"
                  placeholder="First name"
                  autocomplete="given-name"
                />
              </div>
              <div>
                <label for="lastName" class="sr-only">Last name</label>
                <input
                  id="lastName"
                  type="text"
                  formControlName="lastName"
                  class="input text-base touch-manipulation"
                  placeholder="Last name"
                  autocomplete="family-name"
                />
              </div>
            </div>
            <div>
              <label for="email" class="sr-only">Email address</label>
              <input
                id="email"
                type="email"
                formControlName="email"
                class="input text-base touch-manipulation"
                placeholder="Email address"
                autocomplete="email"
                required
              />
            </div>
            <div>
              <label for="password" class="sr-only">Password</label>
              <input
                id="password"
                type="password"
                formControlName="password"
                class="input text-base touch-manipulation"
                placeholder="Password (min. 6 characters)"
                autocomplete="new-password"
                required
              />
            </div>
            <div>
              <label for="confirmPassword" class="sr-only">Confirm Password</label>
              <input
                id="confirmPassword"
                type="password"
                formControlName="confirmPassword"
                class="input text-base touch-manipulation"
                placeholder="Confirm password"
                autocomplete="new-password"
                required
              />
            </div>
          </div>

          @if (errorMessage()) {
            <div class="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
              <p class="text-sm text-red-800 dark:text-red-200">{{ errorMessage() }}</p>
            </div>
          }

          @if (
            signupForm.errors?.['passwordMismatch'] && signupForm.get('confirmPassword')?.touched
          ) {
            <div class="rounded-md bg-yellow-50 dark:bg-yellow-900/20 p-4">
              <p class="text-sm text-yellow-800 dark:text-yellow-200">Passwords do not match</p>
            </div>
          }

          <div>
            <button
              type="submit"
              [disabled]="loading() || signupForm.invalid"
              class="btn btn-primary w-full py-3 px-4 text-base font-medium touch-manipulation"
            >
              @if (loading()) {
                <span>Creating account...</span>
              } @else {
                <span>Sign up</span>
              }
            </button>
          </div>

          <div class="text-center">
            <p class="text-sm sm:text-base text-gray-600 dark:text-gray-400">
              Already have an account?
              <a
                routerLink="/auth/signin"
                class="font-medium text-primary-600 hover:text-primary-500 touch-manipulation"
              >
                Sign in
              </a>
            </p>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [],
})
export class SignupComponent {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private supabase = inject(SupabaseService);
  private toast = inject(ToastService);

  loading = signal(false);
  errorMessage = signal('');

  signupForm = this.fb.nonNullable.group(
    {
      firstName: ['', []],
      lastName: ['', []],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: this.passwordMatchValidator },
  );

  passwordMatchValidator(form: any) {
    const password = form.get('password');
    const confirmPassword = form.get('confirmPassword');
    return password && confirmPassword && password.value === confirmPassword.value
      ? null
      : { passwordMismatch: true };
  }

  async onSubmit() {
    if (this.signupForm.invalid) return;

    this.loading.set(true);
    this.errorMessage.set('');

    const { email, password, firstName, lastName } = this.signupForm.getRawValue();

    try {
      const { error } = await this.supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName?.trim() || null,
            last_name: lastName?.trim() || null,
          },
        },
      });

      if (error) throw error;

      this.toast.success('Account created! Please check your email to confirm.');
      this.router.navigate(['/auth/confirm-email']);
    } catch (error: any) {
      this.errorMessage.set(error.message || 'Failed to create account');
      this.toast.error('Failed to create account');
    } finally {
      this.loading.set(false);
    }
  }
}
