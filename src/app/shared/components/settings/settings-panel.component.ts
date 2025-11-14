import { Component, EventEmitter, Input, Output, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeService, Theme } from '../../../core/services/theme.service';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { SupabaseService } from '../../../core/services/supabase.service';
import { Router } from '@angular/router';
import { LoadingService } from '../../../core/services/loading.service';
import { ConfirmModalComponent } from '../../components/ui/dialog/confirm-modal.component';
import { TermsModalComponent } from '../../components/ui/dialog/terms-modal.component';
import { ToastService } from '../../../core/services/toast.service';
import { UserService } from '../../../core/services/user.service';
import { AvatarComponent } from '../ui/avatar/avatar.component';

@Component({
  selector: 'app-settings-panel',
  standalone: true,
  imports: [CommonModule, ConfirmModalComponent, TermsModalComponent, AvatarComponent],
  template: `
    <div class="hidden"></div>
    @if (open) {
      <div class="fixed inset-0 z-[60]" aria-modal="true" role="dialog">
        <div class="absolute inset-0 bg-black/40" (click)="onClose()"></div>
        <div class="absolute right-0 top-0 h-full w-full sm:w-[420px] bg-white dark:bg-gray-900 shadow-xl border-l border-gray-200 dark:border-gray-800 flex flex-col">
          <div class="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800">
            <h2 class="text-base font-semibold text-gray-900 dark:text-gray-100">Settings</h2>
            <button class="px-2 py-1 text-sm text-gray-600 dark:text-gray-300" (click)="onClose()">Close</button>
          </div>

          <div class="flex-1 overflow-y-auto p-4 space-y-6 text-gray-900 dark:text-gray-100">
            <!-- Profile -->
            <section>
              <h3 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Profile</h3>
              <div class="flex items-start gap-3">
                <div class="shrink-0 border border-gray-200 dark:border-gray-700 rounded-full">
                  <app-avatar 
                    [avatarUrl]="avatarUrl()" 
                    [firstName]="firstName()" 
                    [lastName]="lastName()" 
                    [email]="auth.userEmail()"
                    size="lg"
                  />
                </div>
                <div class="flex-1 space-y-2">
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label class="sr-only" for="firstName">First name</label>
                      <input id="firstName" type="text" class="input" [value]="firstName()" (input)="firstName.set($any($event.target).value)" placeholder="First name" />
                    </div>
                    <div>
                      <label class="sr-only" for="lastName">Last name</label>
                      <input id="lastName" type="text" class="input" [value]="lastName()" (input)="lastName.set($any($event.target).value)" placeholder="Last name" />
                    </div>
                  </div>
                  <div class="text-xs text-gray-600 dark:text-gray-400">{{ auth.userEmail() }}</div>
                  <div class="flex flex-wrap gap-2 pt-1">
                    <label class="px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-700 cursor-pointer inline-flex items-center gap-2">
                      <input type="file" accept="image/*" class="hidden" (change)="onAvatarSelected($event)" />
                      <span>@if (uploading()) { Uploading... } @else { Change photo }</span>
                    </label>
                    <button class="px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-700" [disabled]="saving()" (click)="saveProfile()">
                      @if (saving()) { Saving... } @else { Save changes }
                    </button>
                    <button class="px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-700" (click)="signOut()">Sign out</button>
                  </div>
                </div>
              </div>
            </section>

            <!-- Theme -->
            <section>
              <h3 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Theme</h3>
              <div class="flex gap-2 flex-wrap">
                <button class="px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-700" [class.bg-gray-100]="theme.theme() === 'light'" (click)="setTheme('light')">Light</button>
                <button class="px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-700" [class.bg-gray-100]="theme.theme() === 'dark'" (click)="setTheme('dark')">Dark</button>
                <button class="px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-700" [class.bg-gray-100]="theme.theme() === 'auto'" (click)="setTheme('auto')">Auto (time)</button>
                <button class="px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-700" [class.bg-gray-100]="theme.theme() === 'system'" (click)="setTheme('system')">System</button>
              </div>
            </section>

            <!-- Legal -->
            <section class="pt-3 border-t border-gray-200 dark:border-gray-800">
              <h3 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Legal</h3>
              <button class="px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-700" (click)="openTerms()">Terms & Conditions</button>
            </section>

            <!-- Danger Zone -->
            <section class="pt-3 border-t border-gray-200 dark:border-gray-800">
              <h3 class="text-sm font-medium text-red-600 mb-2">Danger Zone</h3>
              <p class="text-xs text-gray-600 dark:text-gray-400 mb-3">Delete account will permanently remove your data. This requires admin action and may not complete immediately.</p>
              <button class="px-3 py-1.5 text-sm rounded bg-red-600 text-white" (click)="confirmDeleteStep1()">Delete Account</button>
            </section>
          </div>
        </div>
      </div>

      <!-- Double confirmation modals -->
      @if (showConfirm1()) {
        <app-confirm-modal
          title="Delete account?"
          message="Are you absolutely sure you want to delete your account?"
          confirmLabel="Yes, continue"
          cancelLabel="Cancel"
          (confirm)="onConfirm1()"
          (cancel)="onCancelConfirm()"
        />
      }
      @if (showConfirm2()) {
        <app-confirm-modal
          title="Final confirmation"
          message="This action is irreversible. Proceed to delete your account?"
          confirmLabel="Delete permanently"
          cancelLabel="Cancel"
          (confirm)="onConfirm2()"
          (cancel)="onCancelConfirm()"
        />
      }
      @if (showTerms()) {
        <app-terms-modal (close)="closeTerms()" />
      }
    }
  `,
  styles: []
})
export class SettingsPanelComponent {
  private _open = false;
  @Input() set open(val: boolean) {
    const opening = !this._open && !!val;
    this._open = !!val;
    if (opening) {
      this.loadProfile();
    }
  }
  get open() { return this._open; }
  @Output() close = new EventEmitter<void>();

  auth = inject(AuthStateService);
  theme = inject(ThemeService);
  private supabase = inject(SupabaseService);
  private router = inject(Router);
  private loading = inject(LoadingService);
  private toast = inject(ToastService);
  private userService = inject(UserService);

  showConfirm1 = signal(false);
  showConfirm2 = signal(false);
  showTerms = signal(false);

  // Profile state
  firstName = signal<string>('');
  lastName = signal<string>('');
  avatarUrl = signal<string | null>(null);
  saving = signal(false);
  uploading = signal(false);

  initials = computed(() => {
    const f = (this.firstName() || '').trim();
    const l = (this.lastName() || '').trim();
    if (f && l) return (f[0] + l[0]).toUpperCase();
    if (f) return f.slice(0, 2).toUpperCase();
    const email = this.auth.userEmail();
    return email ? email[0].toUpperCase() : '?';
  });

  constructor() {}

  private async loadProfile() {
    const userId = this.auth.userId();
    if (!userId) return;
    try {
      const profile = await this.userService.getUserProfile(userId);
      this.firstName.set(profile?.first_name ?? '');
      this.lastName.set(profile?.last_name ?? '');
      this.avatarUrl.set(profile?.avatar_url ?? null);
    } catch (e) {
      this.toast.error('Failed to load profile');
    }
  }

  async saveProfile() {
    const userId = this.auth.userId();
    if (!userId) return;
    try {
      this.saving.set(true);
      const updated = await this.userService.updateUserProfile(userId, {
        first_name: this.firstName().trim() || null,
        last_name: this.lastName().trim() || null,
        avatar_url: this.avatarUrl()
      });
      this.firstName.set(updated.first_name ?? '');
      this.lastName.set(updated.last_name ?? '');
      this.avatarUrl.set(updated.avatar_url ?? null);
      this.toast.success('Profile updated');
    } catch (e) {
      this.toast.error('Failed to update profile');
    } finally {
      this.saving.set(false);
    }
  }

  async onAvatarSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const userId = this.auth.userId();
    if (!userId) return;
    try {
      this.uploading.set(true);
      const url = await this.userService.uploadAvatar(userId, file);
      this.avatarUrl.set(url);
      await this.saveProfile();
    } catch (e) {
      this.toast.error('Failed to upload avatar');
    } finally {
      // reset input to allow re-selecting same file
      input.value = '';
      this.uploading.set(false);
    }
  }

  onClose() { this.close.emit(); }

  setTheme(mode: Theme) {
    this.theme.setTheme(mode);
  }

  async signOut() {
    await this.loading.withLoading(async () => {
      await this.supabase.auth.signOut();
    });
    this.auth.clear();
    this.onClose();
    this.router.navigate(['/auth/signin']);
  }

  confirmDeleteStep1() { this.showConfirm1.set(true); }
  onCancelConfirm() { this.showConfirm1.set(false); this.showConfirm2.set(false); }
  onConfirm1() { this.showConfirm1.set(false); this.showConfirm2.set(true); }

  async onConfirm2() {
    this.showConfirm2.set(false);
    this.toast.error('Account deletion requires server-side action. Please contact support.');
  }

  openTerms() { this.showTerms.set(true); }
  closeTerms() { this.showTerms.set(false); }
}
