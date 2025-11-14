import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
// Removed RouterOutlet as workspace replaces routed content
import { SidebarComponent } from '../../features/dashboard/components/sidebar/sidebar.component';
import { ToastContainerComponent } from '../../shared/components/ui/toast/toast-container.component';
import { LogoComponent } from '../../shared/components/ui/logo/logo.component';
import { SettingsPanelComponent } from '../../shared/components/settings/settings-panel.component';
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
  imports: [CommonModule, SidebarComponent, ToastContainerComponent, GlobalSpinnerComponent, NoteWorkspaceComponent, LogoComponent, SettingsPanelComponent],
  template: `
    <div class="h-screen w-screen overflow-hidden bg-gray-50 dark:bg-gray-900 flex flex-col">
      <!-- Header -->
      <header class="bg-white dark:bg-gray-800 shadow-sm">
          <div class="px-4 py-4 flex items-center justify-between">
          <div class="flex items-center space-x-4 text-gray-900 dark:text-gray-100">
            <app-logo></app-logo>
          </div>
          <div class="flex items-center space-x-4 relative">            
            <button (click)="openSettings()" class="btn btn-ghost p-2" title="Settings">
              <!-- gear icon -->
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-700 dark:text-gray-200" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fill-rule="evenodd" d="M11.983 1.725a1 1 0 00-1.966 0l-.094.564a7.977 7.977 0 00-1.77.732l-.5-.289a1 1 0 00-1.366.366l-.983 1.703a1 1 0 00.366 1.366l.5.289a7.977 7.977 0 000 1.463l-.5.289a1 1 0 00-.366 1.366l.983 1.703a1 1 0 001.366.366l.5-.289c.558.312 1.151.56 1.77.732l.094.564a1 1 0 001.966 0l.094-.564c.619-.172 1.212-.42 1.77-.732l.5.289a1 1 0 001.366-.366l.983-1.703a1 1 0 00-.366-1.366l-.5-.289a7.977 7.977 0 000-1.463l.5-.289a1 1 0 00.366-1.366l-.983-1.703a1 1 0 00-1.366-.366l-.5.289a7.977 7.977 0 00-1.77-.732l-.094-.564zM10 12a2 2 0 110-4 2 2 0 010 4z" clip-rule="evenodd" />
              </svg>
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
      <!-- Settings Panel mounted (no *ngIf) -->
      <app-settings-panel [open]="showSettings()" (close)="closeSettings()" />
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
  showSettings = signal(false);
  private supabase = inject(SupabaseService);
  private router = inject(Router);
  private loading = inject(LoadingService);

  openSettings() { this.showSettings.set(true); }
  closeSettings() { this.showSettings.set(false); }
}
