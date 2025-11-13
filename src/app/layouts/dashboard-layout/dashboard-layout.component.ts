import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
// Removed RouterOutlet as workspace replaces routed content
import { SidebarComponent } from '../../features/dashboard/components/sidebar/sidebar.component';
import { ToastContainerComponent } from '../../shared/components/ui/toast/toast-container.component';
import { LogoComponent } from '../../shared/components/ui/logo/logo.component';
import { AuthStateService } from '../../core/services/auth-state.service';
import { ThemeService, Theme } from '../../core/services/theme.service';
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
          <div class="flex items-center space-x-4 text-gray-900 dark:text-gray-100">
            <app-logo [animate]="'once'" [persist]="true"></app-logo>
          </div>
          <div class="flex items-center space-x-4 relative">
            <span class="text-sm text-gray-600 dark:text-gray-400">{{ auth.userEmail() }}</span>
            <div class="relative">
              <button (click)="toggleThemeMenu()" class="btn btn-ghost p-2" title="Theme">
                <!-- Render an icon for the active mode -->
                <ng-container *ngIf="theme.theme() === 'dark'; else notDark">
                  <!-- sun icon when currently dark -->
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path d="M10 3.5a.75.75 0 01.75-.75h0a.75.75 0 010 1.5H10.75A.75.75 0 0110 3.5zM10 16.25a.75.75 0 01.75-.75h0a.75.75 0 010 1.5H10.75a.75.75 0 01-.75-.75zM3.5 10a.75.75 0 01-.75-.75v0a.75.75 0 011.5 0V9.25A.75.75 0 013.5 10zM16.25 10a.75.75 0 01-.75-.75v0a.75.75 0 011.5 0V9.25a.75.75 0 01-.75.75zM5.22 5.22a.75.75 0 011.06 0l0 0a.75.75 0 01-1.06 1.06l0 0a.75.75 0 010-1.06zM13.72 13.72a.75.75 0 011.06 0l0 0a.75.75 0 01-1.06 1.06l0 0a.75.75 0 010-1.06zM5.22 14.78a.75.75 0 010-1.06l0 0a.75.75 0 011.06 1.06l0 0a.75.75 0 01-1.06 0zM13.72 6.28a.75.75 0 010-1.06l0 0a.75.75 0 011.06 1.06l0 0a.75.75 0 01-1.06 0zM10 6.25a3.75 3.75 0 100 7.5 3.75 3.75 0 000-7.5z" />
                  </svg>
                </ng-container>
                <ng-template #notDark>
                  <ng-container *ngIf="theme.theme() === 'light'; else otherModes">
                    <!-- moon icon when currently light -->
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-700 dark:text-gray-200" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path d="M17.293 13.293A8 8 0 116.707 2.707 7 7 0 0017.293 13.293z" />
                    </svg>
                  </ng-container>
                  <ng-template #otherModes>
                    <ng-container *ngIf="theme.theme() === 'auto'; else systemMode">
                      <!-- clock icon for 'auto' mode -->
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-600 dark:text-gray-200" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10 2a8 8 0 100 16 8 8 0 000-16zm1 8.5V5a1 1 0 10-2 0v5a1 1 0 00.293.707l2 2a1 1 0 001.414-1.414L11 10.5z" />
                      </svg>
                    </ng-container>
                    <ng-template #systemMode>
                      <!-- monitor icon for 'system' mode -->
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-600 dark:text-gray-200" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M4 3a2 2 0 00-2 2v6a2 2 0 002 2h4v2H6a1 1 0 000 2h8a1 1 0 000-2h-2v-2h4a2 2 0 002-2V5a2 2 0 00-2-2H4z" />
                      </svg>
                    </ng-template>
                  </ng-template>
                </ng-template>
              </button>

              <!-- Theme selector menu -->
               @if(showThemeMenu()) {
              <div class="absolute right-0 mt-2 w-40 bg-white dark:bg-gray-800 shadow-lg rounded-md z-50 ring-1 ring-black ring-opacity-5 py-1">
                <button (click)="setTheme('light')" class="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700">Light</button>
                <button (click)="setTheme('dark')" class="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700">Dark</button>
                <button (click)="setTheme('auto')" class="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700">Auto (time)</button>
                <button (click)="setTheme('system')" class="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700">System</button>
              </div>
               }
            </div>
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
  showThemeMenu = signal(false);
  private supabase = inject(SupabaseService);
  private router = inject(Router);
  private loading = inject(LoadingService);

  toggleThemeMenu() {
    this.showThemeMenu.update(v => !v);
  }

  setTheme(mode: Theme) {
    this.theme.setTheme(mode);
    this.showThemeMenu.set(false);
  }

  async signOut() {
    await this.loading.withLoading(async () => {
      await this.supabase.auth.signOut();
    });
    this.auth.clear();
    this.router.navigate(['/auth/signin']);
  }
}
