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

            <div class="grid grid-cols-2 gap-3">
              <button
                type="button"
                (click)="signUpWithGoogle()"
                [disabled]="loading()"
                class="flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
              >
                <svg class="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                <span>Google</span>
              </button>
              <button
                type="button"
                (click)="signUpWithGitHub()"
                [disabled]="loading()"
                class="flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
              >
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clip-rule="evenodd" />
                </svg>
                <span>GitHub</span>
              </button>
              <button
              type="button"
              (click)="signUpWithGitLab()"
              [disabled]="loading()"
              class="flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
            >
              <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.65 14.39L19.005 3.18C18.905 2.87 18.495 2.87 18.395 3.18L15.575 11.85H8.425L5.605 3.18C5.505 2.87 5.095 2.87 4.995 3.18L1.35 14.39C1.28 14.6 1.34 14.83 1.5 14.98L12 22.66L22.5 14.98C22.66 14.83 22.72 14.6 22.65 14.39Z" fill="#E24329"/>
                <path d="M1.35 14.39L4.995 3.18L8.425 11.85H1.35V14.39Z" fill="#FC6D26"/>
                <path d="M12 22.66L15.575 11.85H8.425L12 22.66Z" fill="#E24329"/>
                <path d="M22.65 14.39L19.005 3.18L15.575 11.85H22.65V14.39Z" fill="#FC6D26"/>
              </svg>
              <span>GitLab</span>
            </button>
            <button
              type="button"
              (click)="signUpWithDiscord()"
              [disabled]="loading()"
              class="flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
            >
              <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20.317 4.36983C18.7903 3.66983 17.157 3.16983 15.432 2.86983C15.407 2.86983 15.382 2.89483 15.357 2.91983C15.157 3.26983 14.932 3.71983 14.782 4.09483C12.957 3.81983 11.132 3.81983 9.33196 4.09483C9.18196 3.71983 8.95696 3.26983 8.73196 2.91983C8.70696 2.89483 8.68196 2.86983 8.65696 2.86983C6.93196 3.16983 5.29863 3.66983 3.77196 4.36983C3.74696 4.36983 3.72196 4.39483 3.72196 4.41983C0.621963 9.04483 -0.228037 13.5698 0.196963 18.0198C0.196963 18.0448 0.221963 18.0698 0.246963 18.0948C2.27196 19.5698 4.22196 20.4698 6.14696 21.0698C6.17196 21.0698 6.22196 21.0448 6.24696 21.0198C6.69696 20.4198 7.09696 19.7698 7.44696 19.0948C7.47196 19.0448 7.42196 18.9948 7.37196 18.9698C6.72196 18.7198 6.09696 18.4198 5.49696 18.0948C5.44696 18.0698 5.44696 17.9948 5.49696 17.9448C5.62196 17.8448 5.74696 17.7448 5.87196 17.6448C5.89696 17.6198 5.92196 17.6198 5.94696 17.6198C9.84696 19.4198 14.172 19.4198 18.047 17.6198C18.072 17.6198 18.097 17.6198 18.122 17.6448C18.247 17.7448 18.372 17.8448 18.497 17.9448C18.547 17.9948 18.547 18.0698 18.497 18.0948C17.897 18.4198 17.272 18.7198 16.622 18.9698C16.572 18.9948 16.522 19.0448 16.547 19.0948C16.897 19.7698 17.297 20.4198 17.747 21.0198C17.772 21.0448 17.797 21.0698 17.847 21.0698C19.772 20.4698 21.722 19.5698 23.747 18.0948C23.772 18.0698 23.797 18.0448 23.797 18.0198C24.322 12.7198 22.922 8.29483 20.292 4.41983C20.267 4.39483 20.242 4.36983 20.317 4.36983ZM8.00696 15.3198C6.83196 15.3198 5.85696 14.2448 5.85696 12.9198C5.85696 11.5948 6.80696 10.5198 8.00696 10.5198C9.20696 10.5198 10.182 11.5948 10.157 12.9198C10.157 14.2448 9.20696 15.3198 8.00696 15.3198ZM16.007 15.3198C14.832 15.3198 13.857 14.2448 13.857 12.9198C13.857 11.5948 14.807 10.5198 16.007 10.5198C17.207 10.5198 18.182 11.5948 18.157 12.9198C18.157 14.2448 17.207 15.3198 16.007 15.3198Z" fill="#5865F2"/>
              </svg>
              <span>Discord</span>
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

  async signUpWithGoogle() {
    this.loading.set(true);
    this.errorMessage.set('');

    try {
      const { error } = await this.supabase.authDirect.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback/google`,
          skipBrowserRedirect: false,
        },
      });

      if (error) throw error;
    } catch (error: any) {
      console.error('Google sign up error:', error);
      this.toast.error('Failed to start Google sign up');
      this.loading.set(false);
    }
  }

  async signUpWithGitLab() {
    this.loading.set(true);
    this.errorMessage.set('');

    try {
      const { error } = await this.supabase.authDirect.signInWithOAuth({
        provider: 'gitlab',
        options: {
          redirectTo: `${window.location.origin}/auth/callback/gitlab`,
          skipBrowserRedirect: false,
        },
      });

      if (error) throw error;
    } catch (error: any) {
      console.error('GitLab sign up error:', error);
      this.toast.error('Failed to start GitLab sign up');
      this.loading.set(false);
    }
  }

  async signUpWithDiscord() {
    this.loading.set(true);
    this.errorMessage.set('');

    try {
      const { error } = await this.supabase.authDirect.signInWithOAuth({
        provider: 'discord',
        options: {
          redirectTo: `${window.location.origin}/auth/callback/discord`,
          skipBrowserRedirect: false,
        },
      });

      if (error) throw error;
    } catch (error: any) {
      console.error('Discord sign up error:', error);
      this.toast.error('Failed to start Discord sign up');
      this.loading.set(false);
    }
  }
}
