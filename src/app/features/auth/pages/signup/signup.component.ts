import { Component, inject, signal } from '@angular/core';

import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { SupabaseService } from '../../../../core/services/supabase.service';
import { ToastService } from '../../../../core/services/toast.service';
import { LogoComponent } from '../../../../shared/components/ui/logo/logo.component';
import { DeviceFingerprintService } from '../../../../core/services/device-fingerprint.service';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, LogoComponent],
  template: `
    <div class="min-h-screen grid lg:grid-cols-2">
      <!-- Left Side - Bento Grid Visuals (Desktop Only) -->
      <div class="hidden lg:flex flex-col justify-center p-12 bg-gray-50 dark:bg-gray-900 relative overflow-hidden">
         <!-- Background Decoration -->
         <div class="absolute inset-0 z-0">
            <div class="absolute -top-[20%] -right-[10%] w-[60%] h-[60%] rounded-full bg-primary-200/30 blur-3xl dark:bg-primary-900/10"></div>
            <div class="absolute bottom-[10%] -left-[10%] w-[50%] h-[50%] rounded-full bg-blue-200/30 blur-3xl dark:bg-blue-900/10"></div>
        </div>

        <div class="relative z-10 max-w-lg mx-auto w-full space-y-8">
            <div class="space-y-2">
                <h1 class="text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white">
                    Join <span class="text-primary-600 dark:text-primary-400">DevPad</span> today
                </h1>
                <p class="text-lg text-gray-600 dark:text-gray-400">
                    Start organizing your thoughts securely and efficiently.
                </p>
            </div>

            <!-- Mini Bento Grid -->
            <div class="grid grid-cols-2 gap-4 auto-rows-[140px]">
                <!-- Tile 1: Encryption -->
                <div class="col-span-2 row-span-1 rounded-3xl bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl border border-white/20 dark:border-gray-700/50 p-6 flex flex-col justify-center shadow-sm">
                    <div class="flex items-center gap-4">
                        <div class="h-10 w-10 rounded-xl bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400 flex items-center justify-center">
                             <i class="fa-solid fa-user-shield text-lg"></i>
                        </div>
                        <div>
                            <h3 class="font-bold text-gray-900 dark:text-gray-100">End-to-End Encrypted</h3>
                             <p class="text-sm text-gray-500 dark:text-gray-400">Your notes, your eyes only.</p>
                        </div>
                    </div>
                </div>

                 <!-- Tile 2: Cloud -->
                 <div class="row-span-1 rounded-3xl bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl border border-white/20 dark:border-gray-700/50 p-6 flex flex-col justify-between shadow-sm">
                    <div class="h-10 w-10 rounded-xl bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400 flex items-center justify-center">
                        <i class="fa-solid fa-cloud text-lg"></i>
                    </div>
                    <div>
                         <h3 class="font-bold text-gray-900 dark:text-gray-100">Cloud Sync</h3>
                         <p class="text-xs text-gray-500 dark:text-gray-400">Drive & OneDrive</p>
                    </div>
                </div>

                 <!-- Tile 3: Open Source -->
                 <div class="row-span-1 rounded-3xl bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl border border-white/20 dark:border-gray-700/50 p-6 flex flex-col justify-between shadow-sm">
                    <div class="h-10 w-10 rounded-xl bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-gray-100 flex items-center justify-center">
                        <i class="fa-brands fa-github text-lg"></i>
                    </div>
                    <div>
                         <h3 class="font-bold text-gray-900 dark:text-gray-100">Open Source</h3>
                         <p class="text-xs text-gray-500 dark:text-gray-400">Transparent & Free</p>
                    </div>
                </div>
                <!-- Tile 4: Public Beta -->
                 <div class="row-span-1 rounded-3xl bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl border border-white/20 dark:border-gray-700/50 p-6 flex flex-col justify-between shadow-sm">
                    <div class="h-10 w-10 rounded-xl bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400 flex items-center justify-center">
                        <i class="fa-solid fa-flask text-lg"></i>
                    </div>
                    <div>
                         <h3 class="font-bold text-gray-900 dark:text-gray-100">Public Beta</h3>
                         <p class="text-xs text-gray-500 dark:text-gray-400">Evolving Fast</p>
                    </div>
                </div>
            </div>
        </div>
      </div>

      <!-- Right Side - Form -->
      <div class="flex items-center justify-center p-4 sm:p-12 bg-white dark:bg-gray-950">
        <div class="max-w-md w-full space-y-8">
            <div class="text-center lg:text-left">
                <div class="flex justify-center lg:justify-start">
                     <app-logo [isClickable]="true"></app-logo>
                </div>
                <h2 class="mt-4 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                    Create your account
                </h2>
                <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
                     Already have an account? <a routerLink="/auth/signin" class="font-medium text-primary-600 hover:text-primary-500">Sign in</a>
                </p>
            </div>

            <form
              class="mt-8 space-y-6"
              [formGroup]="signupForm"
              (ngSubmit)="onSubmit()"
            >
               <div class="grid grid-cols-2 gap-3">
                 <!-- OAuth Buttons Grid -->
                 <button
                  type="button"
                  (click)="signUpWithGoogle()"
                  [disabled]="loading()"
                  class="flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm bg-white dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 transition-all touch-manipulation"
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
                  class="flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm bg-white dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 transition-all touch-manipulation"
                >
                  <i class="fa-brands fa-github text-gray-900 dark:text-white text-lg"></i>
                  <span>GitHub</span>
                </button>
                 <button
                  type="button"
                  (click)="signUpWithGitLab()"
                   [disabled]="loading()"
                   class="flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm bg-white dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 transition-all touch-manipulation"
                >
                  <i class="fa-brands fa-gitlab text-[#FC6D26] text-lg"></i>
                  <span>GitLab</span>
                </button>
                <button
                  type="button"
                  (click)="signUpWithDiscord()"
                   [disabled]="loading()"
                   class="flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm bg-white dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 transition-all touch-manipulation"
                >
                   <i class="fa-brands fa-discord text-[#5865F2] text-lg"></i>
                  <span>Discord</span>
                </button>
              </div>

              <div class="relative">
                <div class="absolute inset-0 flex items-center">
                  <div class="w-full border-t border-gray-300 dark:border-gray-600"></div>
                </div>
                <div class="relative flex justify-center text-sm">
                  <span class="px-2 bg-white dark:bg-gray-950 text-gray-500 dark:text-gray-400">Or continue with email</span>
                </div>
              </div>

              <div class="space-y-4">
                 <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label for="firstName" class="block text-sm font-medium text-gray-700 dark:text-gray-300">First name</label>
                    <div class="mt-1">
                         <input
                          id="firstName"
                          type="text"
                          formControlName="firstName"
                          class="input w-full rounded-lg text-base touch-manipulation"
                          placeholder="John"
                          autocomplete="given-name"
                        />
                    </div>
                  </div>
                  <div>
                    <label for="lastName" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Last name</label>
                    <div class="mt-1">
                        <input
                          id="lastName"
                          type="text"
                          formControlName="lastName"
                          class="input w-full rounded-lg text-base touch-manipulation"
                          placeholder="Doe"
                          autocomplete="family-name"
                        />
                    </div>
                  </div>
                </div>

                <div>
                  <label for="email" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Email address</label>
                  <div class="mt-1">
                      <input
                        id="email"
                        type="email"
                        formControlName="email"
                        class="input w-full rounded-lg text-base touch-manipulation"
                        placeholder="you@example.com"
                        autocomplete="email"
                        required
                      />
                  </div>
                </div>
                
                <div>
                   <label for="password" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
                   <div class="mt-1">
                      <input
                        id="password"
                        type="password"
                        formControlName="password"
                        class="input w-full rounded-lg text-base touch-manipulation"
                        placeholder="Min. 6 characters"
                        autocomplete="new-password"
                         required
                      />
                  </div>
                </div>

                 <div>
                   <label for="confirmPassword" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Confirm Password</label>
                   <div class="mt-1">
                      <input
                        id="confirmPassword"
                        type="password"
                        formControlName="confirmPassword"
                        class="input w-full rounded-lg text-base touch-manipulation"
                        placeholder="Min. 6 characters"
                        autocomplete="new-password"
                         required
                      />
                  </div>
                </div>
              </div>

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

                @if (errorMessage()) {
                   <div class="rounded-lg bg-red-50 dark:bg-red-900/20 p-4 border border-red-200 dark:border-red-800">
                      <div class="flex">
                        <div class="flex-shrink-0">
                           <i class="fa-solid fa-circle-exclamation text-red-400"></i>
                        </div>
                        <div class="ml-3">
                            <p class="text-sm text-red-800 dark:text-red-200">{{ errorMessage() }}</p>
                        </div>
                      </div>
                    </div>
                }

                 @if (signupForm.errors?.['passwordMismatch'] && signupForm.get('confirmPassword')?.touched) {
                    <div class="rounded-lg bg-yellow-50 dark:bg-yellow-900/20 p-4 border border-yellow-200 dark:border-yellow-800">
                       <p class="text-sm text-yellow-800 dark:text-yellow-200">Passwords do not match</p>
                    </div>
                 }
                
                @if (signupForm.get('termsAccepted')?.touched && signupForm.get('termsAccepted')?.invalid) {
                     <div class="rounded-lg bg-red-50 dark:bg-red-900/20 p-4 border border-red-200 dark:border-red-800">
                        <p class="text-sm text-red-800 dark:text-red-200">You must accept the terms and conditions</p>
                     </div>
                }

              <div>
                <button
                  type="submit"
                  [disabled]="loading() || signupForm.invalid"
                   class="btn btn-primary w-full py-3 rounded-lg text-base font-medium shadow-sm active:scale-[0.98] transition-all"
                >
                   @if (loading()) {
                     <i class="fa-solid fa-circle-notch fa-spin mr-2"></i>
                    <span>Creating account...</span>
                  } @else {
                    <span>Sign up</span>
                  }
                </button>
              </div>
            </form>
        </div>
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
          redirectTo: `${window.location.origin}/auth/callback`,
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
