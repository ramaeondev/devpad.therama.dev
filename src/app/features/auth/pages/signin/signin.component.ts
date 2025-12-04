import { Component, inject, signal } from '@angular/core';
import { AuthStateService } from '../../../../core/services/auth-state.service';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { SupabaseService } from '../../../../core/services/supabase.service';
import { ToastService } from '../../../../core/services/toast.service';
import { LogoComponent } from '../../../../shared/components/ui/logo/logo.component';
import { DeviceFingerprintService } from '../../../../core/services/device-fingerprint.service';

@Component({
  selector: 'app-signin',
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
            Sign in to your account
          </p>
        </div>

        <form
          class="mt-6 sm:mt-8 space-y-5 sm:space-y-6"
          [formGroup]="signinForm"
          (ngSubmit)="onSubmit()"
        >
          <div class="rounded-md shadow-sm space-y-3">
            <div>
              <label for="email" class="sr-only">Email address</label>
              <input
                id="email"
                type="email"
                formControlName="email"
                class="input rounded-md text-base touch-manipulation"
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
                class="input rounded-md text-base touch-manipulation"
                placeholder="Password"
                autocomplete="current-password"
                required
              />
            </div>
          </div>

          @if (errorMessage()) {
            <div class="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
              <p class="text-sm text-red-800 dark:text-red-200">{{ errorMessage() }}</p>
            </div>
          }

          <div class="flex items-center justify-between">
            <div class="text-sm">
              <a
                routerLink="/auth/forgot-password"
                class="font-medium text-primary-600 hover:text-primary-500"
              >
                Forgot your password?
              </a>
            </div>
          </div>

          <div>
            <button
              type="submit"
              [disabled]="loading() || signinForm.invalid"
              class="btn btn-primary w-full py-3 px-4 text-base font-medium touch-manipulation"
            >
              @if (loading()) {
                <span>Signing in...</span>
              } @else {
                <span>Sign in</span>
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
              (click)="signInWithGoogle()"
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
              (click)="signInWithGitHub()"
              [disabled]="loading()"
              class="flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
            >
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path fill-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clip-rule="evenodd" />
              </svg>
              <span>GitHub</span>
            </button>
          </div>

          <div class="text-center">
            <p class="text-sm sm:text-base text-gray-600 dark:text-gray-400">
              Don't have an account?
              <a
                routerLink="/auth/signup"
                class="font-medium text-primary-600 hover:text-primary-500 touch-manipulation"
              >
                Sign up
              </a>
            </p>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [],
})
export class SigninComponent {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private supabase = inject(SupabaseService);
  private toast = inject(ToastService);
  private authState = inject(AuthStateService);
  private deviceFingerprint = inject(DeviceFingerprintService);

  loading = signal(false);
  errorMessage = signal('');

  signinForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  async onSubmit() {
    if (this.signinForm.invalid) return;

    this.loading.set(true);
    this.errorMessage.set('');

    const { email, password } = this.signinForm.getRawValue();

    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Set auth state directly from the returned session
      if (data.session?.user) {
        this.authState.setUser(data.session.user);

        // Register device fingerprint
        try {
          await this.deviceFingerprint.registerDevice(data.session.user.id);
        } catch (deviceError) {
          console.error('Failed to register device:', deviceError);
          // Don't block sign-in if device registration fails
        }
      }

      this.toast.success('Welcome back!');

      // Navigate to dashboard after auth state is set
      await this.router.navigate(['/dashboard'], { replaceUrl: true });
    } catch (error: any) {
      this.errorMessage.set(error.message || 'Failed to sign in');
      this.toast.error('Failed to sign in');
    } finally {
      this.loading.set(false);
    }
  }

  async signInWithGitHub() {
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
      this.errorMessage.set(error.message || 'Failed to sign in with GitHub');
      this.toast.error('Failed to sign in with GitHub');
      this.loading.set(false);
    }
  }

  async signInWithGoogle() {
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
      console.error('Google sign in error:', error);
      this.toast.error('Failed to start Google sign in');
      this.loading.set(false);
    }
  }
}