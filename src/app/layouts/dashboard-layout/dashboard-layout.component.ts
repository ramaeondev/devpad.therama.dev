import { Component, inject, signal, computed, effect, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from '../../features/dashboard/components/sidebar/sidebar.component';
import { ToastContainerComponent } from '../../shared/components/ui/toast/toast-container.component';
import { LogoComponent } from '../../shared/components/ui/logo/logo.component';
import { SettingsPanelComponent } from '../../shared/components/settings/settings-panel.component';
import { AuthStateService } from '../../core/services/auth-state.service';
import { ThemeService, Theme } from '../../core/services/theme.service';
import { GlobalSpinnerComponent } from '../../shared/components/ui/spinner/global-spinner.component';
import { NoteWorkspaceComponent } from '../../features/notes/components/note-workspace/note-workspace.component';
import { UserService } from '../../core/services/user.service';
import { AvatarComponent } from '../../shared/components/ui/avatar/avatar.component';

@Component({
  selector: 'app-dashboard-layout',
  standalone: true,
  imports: [CommonModule, SidebarComponent, ToastContainerComponent, GlobalSpinnerComponent, NoteWorkspaceComponent, LogoComponent, SettingsPanelComponent, AvatarComponent],
  template: `
    <div class="h-screen w-screen overflow-hidden bg-gray-50 dark:bg-gray-900 flex flex-col">
      <!-- Header -->
      <header class="bg-white dark:bg-gray-800 shadow-sm z-40">
        <div class="px-3 sm:px-4 py-3 sm:py-4 flex items-center justify-between">
          <div class="flex items-center gap-2 sm:gap-4 text-gray-900 dark:text-gray-100">
            <!-- Mobile menu button -->
            <button 
              (click)="toggleMobileSidebar()" 
              class="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              aria-label="Toggle menu"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                @if (showMobileSidebar()) {
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                } @else {
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
                }
              </svg>
            </button>
            <app-logo></app-logo>
          </div>
          <div class="flex items-center gap-2 sm:gap-4 relative">            
            <button 
              (click)="openSettings()" 
              class="p-0 rounded-full border-2 border-transparent hover:border-gray-300 dark:hover:border-gray-600 transition-colors" 
              title="Settings" 
              aria-label="Open settings"
            >
              <app-avatar 
                [avatarUrl]="avatarUrl()" 
                [firstName]="firstName()" 
                [lastName]="lastName()" 
                [email]="auth.userEmail()"
                size="sm"
                class="sm:hidden"
              />
              <app-avatar 
                [avatarUrl]="avatarUrl()" 
                [firstName]="firstName()" 
                [lastName]="lastName()" 
                [email]="auth.userEmail()"
                size="md"
                class="hidden sm:block"
              />
            </button>
          </div>
        </div>
      </header>

      <!-- Body -->
      <div class="flex flex-1 min-h-0 relative">
        <!-- Mobile sidebar overlay -->
        @if (showMobileSidebar()) {
          <div 
            class="fixed inset-0 bg-black/50 z-30 lg:hidden" 
            (click)="closeMobileSidebar()"
            aria-hidden="true"
          ></div>
        }

        <!-- Sidebar -->
        <div 
          class="fixed lg:static inset-y-0 left-0 z-40 transform transition-transform duration-300 ease-in-out lg:transform-none"
          [class.-translate-x-full]="!showMobileSidebar()"
          [class.translate-x-0]="showMobileSidebar()"
        >
          <app-sidebar />
        </div>

        <!-- Main content: Note workspace -->
        <main class="flex-1 h-full overflow-y-auto w-full lg:w-auto">
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
  showMobileSidebar = signal(false);
  private userService = inject(UserService);

  // Profile state
  firstName = signal<string>('');
  lastName = signal<string>('');
  avatarUrl = signal<string | null>(null);

  initials = computed(() => {
    const f = (this.firstName() || '').trim();
    const l = (this.lastName() || '').trim();
    if (f && l) return (f[0] + l[0]).toUpperCase();
    if (f) return f.slice(0, 2).toUpperCase();
    const email = this.auth.userEmail();
    return email ? email[0].toUpperCase() : '?';
  });

  constructor() {
    effect(() => {
      const userId = this.auth.userId();
      if (userId) {
        this.loadProfile();
      }
    });
  }

  private async loadProfile() {
    const userId = this.auth.userId();
    if (!userId) return;
    try {
      const profile = await this.userService.getUserProfile(userId);
      this.firstName.set(profile?.first_name ?? '');
      this.lastName.set(profile?.last_name ?? '');
      this.avatarUrl.set(profile?.avatar_url ?? null);
    } catch (e) {
      // Silent fail - avatar not critical for header
    }
  }

  toggleMobileSidebar() { 
    this.showMobileSidebar.update(v => !v); 
  }

  closeMobileSidebar() { 
    this.showMobileSidebar.set(false); 
  }

  openSettings() { 
    this.showSettings.set(true);
    this.closeMobileSidebar(); // Close sidebar when opening settings
  }

  closeSettings() { 
    this.showSettings.set(false);
    // Reload profile when settings close (in case it was updated)
    this.loadProfile();
  }

  // Close mobile sidebar on window resize to desktop
  @HostListener('window:resize')
  onResize() {
    if (window.innerWidth >= 1024) { // lg breakpoint
      this.closeMobileSidebar();
    }
  }
}
