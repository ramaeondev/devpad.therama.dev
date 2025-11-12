import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthStateService } from '../../../../core/services/auth-state.service';
import { SupabaseService } from '../../../../core/services/supabase.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-dashboard-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
      <!-- Header -->
      <header class="bg-white dark:bg-gray-800 shadow-sm">
        <div class="container mx-auto px-4 py-4 flex items-center justify-between">
          <div class="flex items-center space-x-4">
            <h1 class="text-2xl font-bold text-gray-900 dark:text-white">CloudNotes</h1>
          </div>
          <div class="flex items-center space-x-4">
            <span class="text-sm text-gray-600 dark:text-gray-400">{{ authState.userEmail() }}</span>
            <button (click)="signOut()" class="btn btn-ghost px-4 py-2">
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <!-- Main Content -->
      <main class="container mx-auto px-4 py-8">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <!-- Quick Actions -->
          <div class="card p-6">
            <h2 class="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Quick Actions</h2>
            <div class="space-y-3">
              <a routerLink="/notes/new" class="btn btn-primary w-full py-2">
                Create New Note
              </a>
              <a routerLink="/notes" class="btn btn-secondary w-full py-2">
                View All Notes
              </a>
              <a routerLink="/folders" class="btn btn-secondary w-full py-2">
                Manage Folders
              </a>
            </div>
          </div>

          <!-- Recent Notes -->
          <div class="col-span-2 card p-6">
            <h2 class="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Recent Notes</h2>
            <div class="text-center py-8 text-gray-500 dark:text-gray-400">
              <p>No notes yet. Create your first note to get started!</p>
            </div>
          </div>
        </div>

        <!-- Features Overview -->
        <div class="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div class="card p-6 text-center">
            <div class="text-primary-600 text-3xl mb-3">📝</div>
            <h3 class="font-semibold mb-2 text-gray-900 dark:text-white">Markdown Support</h3>
            <p class="text-sm text-gray-600 dark:text-gray-400">Write with rich Markdown formatting</p>
          </div>
          <div class="card p-6 text-center">
            <div class="text-primary-600 text-3xl mb-3">📁</div>
            <h3 class="font-semibold mb-2 text-gray-900 dark:text-white">Organized</h3>
            <p class="text-sm text-gray-600 dark:text-gray-400">Keep notes organized in folders</p>
          </div>
          <div class="card p-6 text-center">
            <div class="text-primary-600 text-3xl mb-3">☁️</div>
            <h3 class="font-semibold mb-2 text-gray-900 dark:text-white">Cloud Sync</h3>
            <p class="text-sm text-gray-600 dark:text-gray-400">Access from anywhere, anytime</p>
          </div>
        </div>
      </main>
    </div>
  `,
  styles: []
})
export class DashboardHomeComponent {
  authState = inject(AuthStateService);
  private supabase = inject(SupabaseService);
  private router = inject(Router);

  async signOut() {
    await this.supabase.auth.signOut();
    this.authState.clear();
    this.router.navigate(['/auth/signin']);
  }
}
