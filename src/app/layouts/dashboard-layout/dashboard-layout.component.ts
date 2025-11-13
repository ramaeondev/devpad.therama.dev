import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
// Removed RouterOutlet as workspace replaces routed content
import { SidebarComponent } from '../../features/dashboard/components/sidebar/sidebar.component';
import { ToastContainerComponent } from '../../shared/components/ui/toast/toast-container.component';
import { LogoComponent } from '../../shared/components/ui/logo/logo.component';
import { AuthStateService } from '../../core/services/auth-state.service';
import { ThemeService } from '../../core/services/theme.service';
import { SupabaseService } from '../../core/services/supabase.service';
import { Router } from '@angular/router';
import { GlobalSpinnerComponent } from '../../shared/components/ui/spinner/global-spinner.component';
import { NoteWorkspaceComponent } from '../../features/notes/components/note-workspace/note-workspace.component';
import { LoadingService } from '../../core/services/loading.service';

@Component({
  selector: 'app-dashboard-layout',
  standalone: true,
  imports: [CommonModule, SidebarComponent, ToastContainerComponent, GlobalSpinnerComponent, NoteWorkspaceComponent, LogoComponent],
  template: `
    <div class="h-screen w-screen overflow-hidden bg-gray-50 dark:bg-gray-900 flex flex-col">
      <!-- Header -->
      <header class="bg-white dark:bg-gray-800 shadow-sm">
        <div class="px-4 py-4 flex items-center justify-between">
          <div class="flex items-center space-x-4">
            <app-logo [animate]="'once'" [persist]="true"></app-logo>
          </div>
          <div class="flex items-center space-x-4">
            <span class="text-sm text-gray-600 dark:text-gray-400">{{ auth.userEmail() }}</span>
            <button (click)="theme.toggleTheme()" class="btn btn-ghost p-2" title="Toggle theme">
              <ng-container *ngIf="theme.theme() === 'dark'; else moonIcon">
                <!-- show sun when currently dark (click to switch to light) -->
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path d="M10 3.5a.75.75 0 01.75-.75h0a.75.75 0 010 1.5H10.75A.75.75 0 0110 3.5zM10 16.25a.75.75 0 01.75-.75h0a.75.75 0 010 1.5H10.75a.75.75 0 01-.75-.75zM3.5 10a.75.75 0 01-.75-.75v0a.75.75 0 011.5 0V9.25A.75.75 0 013.5 10zM16.25 10a.75.75 0 01-.75-.75v0a.75.75 0 011.5 0V9.25a.75.75 0 01-.75.75zM5.22 5.22a.75.75 0 011.06 0l0 0a.75.75 0 01-1.06 1.06l0 0a.75.75 0 010-1.06zM13.72 13.72a.75.75 0 011.06 0l0 0a.75.75 0 01-1.06 1.06l0 0a.75.75 0 010-1.06zM5.22 14.78a.75.75 0 010-1.06l0 0a.75.75 0 011.06 1.06l0 0a.75.75 0 01-1.06 0zM13.72 6.28a.75.75 0 010-1.06l0 0a.75.75 0 011.06 1.06l0 0a.75.75 0 01-1.06 0zM10 6.25a3.75 3.75 0 100 7.5 3.75 3.75 0 000-7.5z" />
                </svg>
              </ng-container>
              <ng-template #moonIcon>
                <!-- show moon when currently light (click to switch to dark) -->
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-700 dark:text-gray-200" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path d="M17.293 13.293A8 8 0 116.707 2.707 7 7 0 0017.293 13.293z" />
                </svg>
              </ng-template>
            </button>
            <button (click)="signOut()" class="btn btn-ghost px-4 py-2">
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <!-- Body -->
      <div class="flex flex-1 min-h-0">
        <!-- Sidebar -->
        <app-sidebar />

        <!-- Main content: Note workspace (router currently unused for notes) -->
        <main class="flex-1 h-full overflow-y-auto">
          <app-note-workspace />
        </main>
      </div>
      <!-- Toasts -->
      <app-toast-container />
      <!-- Global Spinner -->
      <app-global-spinner />
    </div>
  `,
  styles: []
})
export class DashboardLayoutComponent {
  auth = inject(AuthStateService);
  theme = inject(ThemeService);
  private supabase = inject(SupabaseService);
  private router = inject(Router);
  private loading = inject(LoadingService);

  async signOut() {
    await this.loading.withLoading(async () => {
      await this.supabase.auth.signOut();
    });
    this.auth.clear();
    this.router.navigate(['/auth/signin']);
  }
}
