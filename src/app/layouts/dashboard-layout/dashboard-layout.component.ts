import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
// Removed RouterOutlet as workspace replaces routed content
import { SidebarComponent } from '../../features/dashboard/components/sidebar/sidebar.component';
import { ToastContainerComponent } from '../../shared/components/ui/toast/toast-container.component';
import { AuthStateService } from '../../core/services/auth-state.service';
import { SupabaseService } from '../../core/services/supabase.service';
import { Router } from '@angular/router';
import { GlobalSpinnerComponent } from '../../shared/components/ui/spinner/global-spinner.component';
import { NoteWorkspaceComponent } from '../../features/notes/components/note-workspace/note-workspace.component';
import { LoadingService } from '../../core/services/loading.service';

@Component({
  selector: 'app-dashboard-layout',
  standalone: true,
  imports: [CommonModule, SidebarComponent, ToastContainerComponent, GlobalSpinnerComponent, NoteWorkspaceComponent],
  template: `
    <div class="h-screen w-screen overflow-hidden bg-gray-50 dark:bg-gray-900 flex flex-col">
      <!-- Header -->
      <header class="bg-white dark:bg-gray-800 shadow-sm">
        <div class="px-4 py-4 flex items-center justify-between">
          <div class="flex items-center space-x-4">
            <h1 class="text-2xl font-bold text-gray-900 dark:text-white">CloudNotes</h1>
          </div>
          <div class="flex items-center space-x-4">
            <span class="text-sm text-gray-600 dark:text-gray-400">{{ auth.userEmail() }}</span>
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
