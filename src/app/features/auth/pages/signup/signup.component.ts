import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { SupabaseService } from '../../../../core/services/supabase.service';
import { ToastService } from '../../../../core/services/toast.service';
import { LogoComponent } from '../../../../shared/components/ui/logo/logo.component';
import { DeviceFingerprintService } from '../../../../core/services/device-fingerprint.service';

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

            <div class="flex items-start">
              <div class="flex items-center h-5">
                <input
                  id="terms"
                  type="checkbox"
                  formControlName="termsAccepted"
                  class="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:ring-offset-gray-800 touch-manipulation"
                />
              </div>
              <div class="ml-3 text-sm">
                <label for="terms" class="font-medium text-gray-700 dark:text-gray-300">
                  I agree to the
                  <a routerLink="/terms" class="text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300">Terms and Conditions</a>
                  and
                  <a routerLink="/policy" class="text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300">Privacy Policy</a>
                </label>
              </div>
            </div>

            @if (signupForm.get('termsAccepted')?.touched && signupForm.get('termsAccepted')?.invalid) {
              <div class="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
                <p class="text-sm text-red-800 dark:text-red-200">You must accept the terms and conditions</p>
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

            <div class="relative my-6">
              <div class="absolute inset-0 flex items-center">
                <div class="w-full border-t border-gray-300 dark:border-gray-600"></div>
              </div>
              <div class="relative flex justify-center text-sm">
                <span class="px-2 bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400">OR</span>
              </div>
            </div>

            <div>
              <button
                type="button"
                (click)="signUpWithGitHub()"
                [disabled]="loading()"
                class="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
              >
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clip-rule="evenodd" />
                </svg>
                <span>Sign up with GitHub</span>
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
  private deviceFingerprint = inject(DeviceFingerprintService);

  loading = signal(false);
  errorMessage = signal('');

  signupForm = this.fb.nonNullable.group(
    {
      firstName: ['', []],
      lastName: ['', []],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]],
      termsAccepted: [false, [Validators.requiredTrue]],
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
      const { data, error } = await this.supabase.auth.signUp({
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

      // Register device fingerprint if user is immediately confirmed
      if (data.user?.id) {
        try {
          await this.deviceFingerprint.registerDevice(data.user.id);
        } catch (deviceError) {
          console.error('Failed to register device:', deviceError);
          this.toast.error('Device registration failed. Please try again later.');
          // Don't block signup if device registration fails
        }
      } else {
        console.warn('User ID is not available; skipping device registration.');
        this.toast.warning('User ID unavailable. Device registration skipped.');
      }

      this.toast.success('Account created! Please check your email to confirm.');
      this.router.navigate(['/auth/confirm-email'], { queryParams: { email: data.user?.email } });
    } catch (error: any) {
      this.errorMessage.set(error.message || 'Failed to create account');
      this.toast.error('Failed to create account');
    } finally {
      this.loading.set(false);
    }
  }

  async signUpWithGitHub() {
    this.loading.set(true);
    this.errorMessage.set('');

    try {
      const { error } = await this.supabase.authDirect.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: `https://devpad.therama.dev/auth/callback`,
          skipBrowserRedirect: false,
        },
      });

      if (error) throw error;
    } catch (error: any) {
      this.errorMessage.set(error.message || 'Failed to sign up with GitHub');
      this.toast.error('Failed to sign up with GitHub');
      this.loading.set(false);
    }
  }
}
