import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { SupabaseService } from '../../../../core/services/supabase.service';
import { AuthStateService } from '../../../../core/services/auth-state.service';
import { ToastService } from '../../../../core/services/toast.service';
import { FolderService } from '../../../folders/services/folder.service';
import { LogoComponent } from '../../../../shared/components/ui/logo/logo.component';

@Component({
  selector: 'app-signin',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, LogoComponent],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div class="max-w-md w-full space-y-8">
        <div>
          <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
          <app-logo [text]="'DevPad'" [animate]="'once'" [persist]="true"></app-logo>
          </h2>
          <p class="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            Sign in to your account
          </p>
        </div>
        <form class="mt-8 space-y-6" [formGroup]="signinForm" (ngSubmit)="onSubmit()">
          <div class="rounded-md shadow-sm -space-y-px">
            <div>
              <label for="email" class="sr-only">Email address</label>
              <input
                id="email"
                type="email"
                formControlName="email"
                class="input rounded-t-md"
                placeholder="Email address"
                required
              />
            </div>
            <div>
              <label for="password" class="sr-only">Password</label>
              <input
                id="password"
                type="password"
                formControlName="password"
                class="input rounded-b-md"
                placeholder="Password"
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
              <a routerLink="/auth/forgot-password" class="font-medium text-primary-600 hover:text-primary-500">
                Forgot your password?
              </a>
            </div>
          </div>

          <div>
            <button
              type="submit"
              [disabled]="loading() || signinForm.invalid"
              class="btn btn-primary w-full py-2 px-4"
            >
              @if (loading()) {
                <span>Signing in...</span>
              } @else {
                <span>Sign in</span>
              }
            </button>
          </div>

          <div class="text-center">
            <p class="text-sm text-gray-600 dark:text-gray-400">
              Don't have an account?
              <a routerLink="/auth/signup" class="font-medium text-primary-600 hover:text-primary-500">
                Sign up
              </a>
            </p>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: []
})
export class SigninComponent {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private supabase = inject(SupabaseService);
  private authState = inject(AuthStateService);
  private toast = inject(ToastService);
  private folderService = inject(FolderService);

  loading = signal(false);
  errorMessage = signal('');

  signinForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  async onSubmit() {
    if (this.signinForm.invalid) return;

    this.loading.set(true);
    this.errorMessage.set('');

    const { email, password } = this.signinForm.getRawValue();

    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      if (data.user) {
        this.authState.setUser(data.user);
        
        // Initialize root folder for first-time users
        try {
          await this.folderService.initializeUserFolders(data.user.id);
        } catch (folderError) {
          console.error('Error initializing folders:', folderError);
          // Don't block sign-in if folder initialization fails
        }
        
        this.toast.success('Welcome back!');
        this.router.navigate(['/dashboard']);
      }
    } catch (error: any) {
      this.errorMessage.set(error.message || 'Failed to sign in');
      this.toast.error('Failed to sign in');
    } finally {
      this.loading.set(false);
    }
  }
}
