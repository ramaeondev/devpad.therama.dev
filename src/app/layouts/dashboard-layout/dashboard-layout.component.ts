import { Component, inject, signal, computed, effect, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SidebarComponent } from '../../features/dashboard/components/sidebar/sidebar.component';
import { ToastContainerComponent } from '../../shared/components/ui/toast/toast-container.component';
import { LogoComponent } from '../../shared/components/ui/logo/logo.component';
import { SettingsPanelComponent } from '../../shared/components/settings/settings-panel.component';
import { AuthStateService } from '../../core/services/auth-state.service';
import { ThemeService } from '../../core/services/theme.service';
import { GlobalSpinnerComponent } from '../../shared/components/ui/spinner/global-spinner.component';
import { UserService } from '../../core/services/user.service';
import { AvatarComponent } from '../../shared/components/ui/avatar/avatar.component';
import { SupabaseService } from '../../core/services/supabase.service';
import { LoadingService } from '../../core/services/loading.service';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { NotificationIconComponent } from '../../shared/components/notification-icon/notification-icon';
import { ActivityLogService } from '../../core/services/activity-log.service';
import { ActivityAction, ActivityResource } from '../../core/models/activity-log.model';

@Component({
  selector: 'app-dashboard-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    SidebarComponent,
    ToastContainerComponent,
    GlobalSpinnerComponent,
    LogoComponent,
    SettingsPanelComponent,
    AvatarComponent,
    NotificationIconComponent,
  ],
  templateUrl: './dashboard-layout.component.html',
  styles: [],
})
export class DashboardLayoutComponent {
  auth = inject(AuthStateService);
  theme = inject(ThemeService);
  showSettings = signal(false);
  showMobileSidebar = signal(false);
  showDropdown = signal(false);

  private userService = inject(UserService);
  private loading = inject(LoadingService);
  private supabase = inject(SupabaseService);
  private router = inject(Router);
  private activityLog = inject(ActivityLogService);

  // Hide sidebar on activity log page
  isActivityLogPage = signal(false);

  constructor() {
    // Listen to route changes
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        this.isActivityLogPage.set(event.url.includes('/activity-log'));
      });

    // Set initial value
    this.isActivityLogPage.set(this.router.url.includes('/activity-log'));

    effect(() => {
      const userId = this.auth.userId();
      if (userId) {
        this.loadProfile();
      }
    });
  }

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
    this.showMobileSidebar.update((v) => !v);
  }

  closeMobileSidebar() {
    this.showMobileSidebar.set(false);
  }

  openSettings() {
    this.showSettings.set(true);
    this.closeMobileSidebar(); // Close sidebar when opening settings
    this.showDropdown.set(false);
  }
  toggleDropdown() {
    this.showDropdown.update((v) => !v);
  }

  async signOut() {
    await this.loading.withLoading(async () => {
      const userId = this.auth.userId();
      if (userId) {
        await this.activityLog.logActivity(userId, {
          action_type: ActivityAction.Logout,
          resource_type: ActivityResource.Auth,
          resource_name: 'Sign Out',
        });
      }
      await this.supabase.auth.signOut();
    });
    this.auth.clear();
    this.router.navigate(['/auth/signin']);
  }

  setTheme(theme: 'light' | 'dark' | 'system' | 'auto') {
    this.theme.setTheme(theme);
    this.showDropdown.set(false);
  }

  closeSettings() {
    this.showSettings.set(false);
    // Reload profile when settings close (in case it was updated)
    this.loadProfile();
  }

  // Close mobile sidebar on window resize to desktop
  @HostListener('window:resize')
  onResize() {
    if (window.innerWidth >= 1024) {
      // lg breakpoint
      this.closeMobileSidebar();
    }
  }

  // Close dropdown when clicking outside
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    // If dropdown is not shown, do nothing
    if (!this.showDropdown()) return;

    const target = event.target as HTMLElement;

    // Check if the click target is the trigger button or inside it
    const triggerButton = document.getElementById('user-menu-button');
    if (triggerButton && (triggerButton === target || triggerButton.contains(target))) {
      return; // Let the toggleDropdown method handle it
    }

    // Check if the click target is inside the dropdown content
    // We look for the dropdown content by its data attribute
    const dropdownContent = document.querySelector('[data-dropdown-content="true"]');
    if (dropdownContent && dropdownContent.contains(target)) {
      return; // Clicked inside dropdown, don't close
    }

    // Clicked outside both trigger and content, close it
    this.showDropdown.set(false);
  }
}
