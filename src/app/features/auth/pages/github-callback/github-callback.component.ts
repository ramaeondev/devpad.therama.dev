import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { SupabaseService } from '../../../../core/services/supabase.service';
import { AuthStateService } from '../../../../core/services/auth-state.service';
import { ToastService } from '../../../../core/services/toast.service';
import { DeviceFingerprintService } from '../../../../core/services/device-fingerprint.service';

@Component({
  selector: 'app-github-callback',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900"
    >
      <div class="text-center">
        @if (loading()) {
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p class="mt-4 text-gray-600 dark:text-gray-400">
            Completing GitHub sign in...
          </p>
        }
        @if (error()) {
          <div class="max-w-md mx-auto p-6">
            <div class="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
              <p class="text-sm text-red-800 dark:text-red-200">{{ error() }}</p>
            </div>
            <button
              (click)="goToSignIn()"
              class="mt-4 btn btn-primary"
            >
              Return to Sign In
            </button>
          </div>
        }
      </div>
    </div>
  `,
  styles: [],
})
export class GithubCallbackComponent implements OnInit {
  private router = inject(Router);
  private supabase = inject(SupabaseService);
  private authState = inject(AuthStateService);
  private toast = inject(ToastService);
  private deviceFingerprint = inject(DeviceFingerprintService);

  loading = signal(true);
  error = signal('');

  async ngOnInit() {
    try {
      // Check for error in URL first
      const searchParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      
      const errorParam = searchParams.get('error') || hashParams.get('error');
      const errorDescription = searchParams.get('error_description') || hashParams.get('error_description');
      
      if (errorParam) {
        throw new Error(errorDescription || 'Authentication failed');
      }

      // Supabase automatically detects and processes the session from the URL hash
      // We just need to wait a moment for it to process, then get the session
      await new Promise(resolve => setTimeout(resolve, 100));

      const { data, error } = await this.supabase.auth.getSession();

      if (error) throw error;

      if (data.session?.user) {
        // Set auth state
        this.authState.setUser(data.session.user);

        // Register device fingerprint
        try {
          await this.deviceFingerprint.registerDevice(data.session.user.id);
        } catch (deviceError) {
          console.error('Failed to register device:', deviceError);
          // Don't block sign-in if device registration fails
        }

        this.toast.success('Successfully signed in with GitHub!');
        
        // Navigate to dashboard
        await this.router.navigate(['/dashboard'], { replaceUrl: true });
      } else {
        throw new Error('No session found after authentication');
      }
    } catch (err: any) {
      console.error('GitHub OAuth callback error:', err);
      this.error.set(err.message || 'Failed to complete GitHub sign in');
      this.toast.error('Failed to sign in with GitHub');
    } finally {
      this.loading.set(false);
    }
  }

  goToSignIn() {
    this.router.navigate(['/auth/signin']);
  }
}
