import { Component, EventEmitter, Input, Output, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeService, Theme } from '../../../core/services/theme.service';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { SupabaseService } from '../../../core/services/supabase.service';
import { Router } from '@angular/router';
import { LoadingService } from '../../../core/services/loading.service';
import { ConfirmModalComponent } from '../../components/ui/dialog/confirm-modal.component';
import { TermsModalComponent } from '../../components/ui/dialog/terms-modal.component';
import { ImageCropDialogComponent } from '../../components/ui/dialog/image-crop-dialog.component';
import { ToastService } from '../../../core/services/toast.service';
import { UserService } from '../../../core/services/user.service';
import { AvatarComponent } from '../ui/avatar/avatar.component';
import { CdkOverlayOrigin, OverlayModule } from '@angular/cdk/overlay';
import { GoogleDriveService } from '../../../core/services/google-drive.service';
import { OneDriveService } from '../../../core/services/onedrive.service';

@Component({
  selector: 'app-settings-panel',
  standalone: true,
  imports: [
    CommonModule,
    ConfirmModalComponent,
    TermsModalComponent,
    ImageCropDialogComponent,
    AvatarComponent,
    OverlayModule,
  ],
  template: `
    <div class="hidden"></div>
    @if (open) {
      <div
        class="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6 lg:p-8"
        aria-modal="true"
        role="dialog"
      >
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" (click)="onClose()"></div>
        <div
          class="relative bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-xl shadow-2xl w-full max-w-lg lg:max-w-xl border-t sm:border border-gray-200 dark:border-gray-800 flex flex-col max-h-[95vh] sm:max-h-[90vh] animate-in fade-in slide-in-from-bottom sm:zoom-in-95 duration-200"
        >
          <div
            class="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 dark:border-gray-800"
          >
            <h2 class="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100">
              Settings
            </h2>
            <button
              class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors"
              (click)="onClose()"
              aria-label="Close settings"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <div
            class="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6 text-gray-900 dark:text-gray-100 touch-pan-y"
          >
            <!-- Profile -->
            <section>
              <h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 sm:mb-4">
                Profile
              </h3>
              <div class="flex flex-col items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div class="border-2 border-gray-200 dark:border-gray-700 rounded-full">
                  <app-avatar
                    [avatarUrl]="avatarUrl()"
                    [firstName]="firstName()"
                    [lastName]="lastName()"
                    [email]="auth.userEmail()"
                    size="lg"
                    class="sm:hidden"
                  />
                  <app-avatar
                    [avatarUrl]="avatarUrl()"
                    [firstName]="firstName()"
                    [lastName]="lastName()"
                    [email]="auth.userEmail()"
                    size="xl"
                    class="hidden sm:block"
                  />
                </div>
                <label
                  class="px-4 py-2 text-sm rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer inline-flex items-center gap-2 transition-colors touch-manipulation"
                >
                  <input
                    type="file"
                    accept="image/*"
                    class="hidden"
                    (change)="onImageSelected($event)"
                  />
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                    />
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  <span>
                    @if (uploading()) {
                      Uploading...
                    } @else {
                      Change photo
                    }
                  </span>
                </label>
              </div>
              <div class="space-y-4">
                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label
                      class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5"
                      for="firstName"
                      >First name</label
                    >
                    <input
                      id="firstName"
                      type="text"
                      class="input"
                      [value]="firstName()"
                      (input)="firstName.set($any($event.target).value)"
                      placeholder="First name"
                    />
                  </div>
                  <div>
                    <label
                      class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5"
                      for="lastName"
                      >Last name</label
                    >
                    <input
                      id="lastName"
                      type="text"
                      class="input"
                      [value]="lastName()"
                      (input)="lastName.set($any($event.target).value)"
                      placeholder="Last name"
                    />
                  </div>
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5"
                    >Email</label
                  >
                  <div
                    class="text-sm text-gray-600 dark:text-gray-400 px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg"
                  >
                    {{ auth.userEmail() }}
                  </div>
                </div>
                <button
                  class="w-full px-4 py-2.5 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  [disabled]="saving()"
                  (click)="saveProfile()"
                >
                  @if (saving()) {
                    Saving...
                  } @else {
                    Save changes
                  }
                </button>
              </div>
            </section>

            <!-- Theme -->
            <section class="pt-6 border-t border-gray-200 dark:border-gray-800">
              <h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
                Appearance
              </h3>
              <div class="grid grid-cols-2 gap-2">
                <button
                  class="px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  [class.bg-blue-50]="theme.theme() === 'light'"
                  [class.border-blue-500]="theme.theme() === 'light'"
                  [class.text-blue-700]="theme.theme() === 'light'"
                  (click)="setTheme('light')"
                >
                  Light
                </button>
                <button
                  class="px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  [class.bg-blue-50]="theme.theme() === 'dark'"
                  [class.border-blue-500]="theme.theme() === 'dark'"
                  [class.text-blue-700]="theme.theme() === 'dark'"
                  (click)="setTheme('dark')"
                >
                  Dark
                </button>
                <button
                  class="px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  [class.bg-blue-50]="theme.theme() === 'auto'"
                  [class.border-blue-500]="theme.theme() === 'auto'"
                  [class.text-blue-700]="theme.theme() === 'auto'"
                  (click)="setTheme('auto')"
                >
                  Auto
                </button>
                <button
                  class="px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  [class.bg-blue-50]="theme.theme() === 'system'"
                  [class.border-blue-500]="theme.theme() === 'system'"
                  [class.text-blue-700]="theme.theme() === 'system'"
                  (click)="setTheme('system')"
                >
                  System
                </button>
              </div>
            </section>

            <!-- Integrations -->
            <section class="pt-6 border-t border-gray-200 dark:border-gray-800">
              <h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
                Cloud Storage
              </h3>
              <div class="space-y-2">
                <!-- Google Drive -->
                <div class="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <div class="flex items-center space-x-3">
                    <div class="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                      <svg class="w-5 h-5 text-blue-600 dark:text-blue-400" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M7.71 3.5L1.15 15l3.38 5.87L11.1 9.3l-3.38-5.8zm13.14 0l-3.38 5.87L23.85 15l-6.56-11.5zM12 9.3L5.53 20.87h12.94L12 9.3z"/>
                      </svg>
                    </div>
                    <div>
                      <div class="text-sm font-medium text-gray-900 dark:text-gray-100">
                        Google Drive
                      </div>
                      @if (googleDrive.isConnected()) {
                        <div class="text-xs text-green-600 dark:text-green-400">
                          Connected
                        </div>
                      } @else {
                        <div class="text-xs text-gray-500 dark:text-gray-400">
                          Not connected
                        </div>
                      }
                    </div>
                  </div>
                  @if (googleDrive.isConnected()) {
                    <button
                      class="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                      (click)="disconnectGoogleDrive()"
                    >
                      Disconnect
                    </button>
                  } @else {
                    <button
                      class="px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                      (click)="connectGoogleDrive()"
                    >
                      Connect
                    </button>
                  }
                </div>

                <!-- OneDrive -->
                <div class="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <div class="flex items-center space-x-3">
                    <div class="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                      <svg class="w-5 h-5 text-blue-600 dark:text-blue-400" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M13.98 3.37A6.5 6.5 0 0 0 7.5 9.5a6.5 6.5 0 0 0 .1 1.13A5.73 5.73 0 0 0 0 16.5C0 19.54 2.46 22 5.5 22h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96A6.5 6.5 0 0 0 13.98 3.37z"/>
                      </svg>
                    </div>
                    <div>
                      <div class="text-sm font-medium text-gray-900 dark:text-gray-100">
                        OneDrive
                      </div>
                      @if (oneDrive.isConnected()) {
                        <div class="text-xs text-green-600 dark:text-green-400">
                          Connected
                        </div>
                      } @else {
                        <div class="text-xs text-gray-500 dark:text-gray-400">
                          Not connected
                        </div>
                      }
                    </div>
                  </div>
                  @if (oneDrive.isConnected()) {
                    <button
                      class="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                      (click)="disconnectOneDrive()"
                    >
                      Disconnect
                    </button>
                  } @else {
                    <button
                      class="px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                      (click)="connectOneDrive()"
                    >
                      Connect
                    </button>
                  }
                </div>
              </div>
            </section>

            <!-- Actions -->
            <section class="pt-6 border-t border-gray-200 dark:border-gray-800 space-y-3">
              <button
                class="w-full px-4 py-2.5 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                (click)="openTerms()"
              >
                Terms & Conditions
              </button>
              <button
                class="w-full px-4 py-2.5 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                (click)="signOut()"
              >
                Sign out
              </button>
            </section>

            <!-- Danger Zone -->
            <section class="pt-6 border-t border-gray-200 dark:border-gray-800">
              <div
                class="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
              >
                <h3 class="text-sm font-semibold text-red-900 dark:text-red-200 mb-2">
                  Delete Account
                </h3>
                <p class="text-xs text-red-700 dark:text-red-300 mb-3">
                  This will permanently remove all your data. This action cannot be undone.
                </p>
                <button
                  class="px-4 py-2 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
                  (click)="confirmDeleteStep1()"
                >
                  Delete My Account
                </button>
              </div>
            </section>

            <!-- Legal Links -->
            <section class="pt-4 border-t border-gray-200 dark:border-gray-800">
              <div class="flex items-center justify-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                <a
                  href="/privacy.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                >
                  Privacy Policy
                </a>
                <span class="text-gray-300 dark:text-gray-700">|</span>
                <a
                  href="/terms.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                >
                  Terms of Service
                </a>
              </div>
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
      <app-image-crop-dialog
        [open]="showImageCrop()"
        [imageChangedEvent]="imageChangeEvent()"
        [cropSize]="200"
        (cancel)="closeCropDialog()"
        (save)="onCroppedImage($event)"
      />
    }
  `,
  styles: [],
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
  get open() {
    return this._open;
  }
  @Output() close = new EventEmitter<void>();

  auth = inject(AuthStateService);
  theme = inject(ThemeService);
  googleDrive = inject(GoogleDriveService);
  oneDrive = inject(OneDriveService);
  private supabase = inject(SupabaseService);
  private router = inject(Router);
  private loading = inject(LoadingService);
  private toast = inject(ToastService);
  private userService = inject(UserService);

  showConfirm1 = signal(false);
  showConfirm2 = signal(false);
  showTerms = signal(false);
  showImageCrop = signal(false);
  imageChangeEvent = signal<Event | null>(null);

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
        avatar_url: this.avatarUrl(),
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

  onImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    console.log('Image selected:', file);

    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      this.toast.error('Please select an image file');
      input.value = '';
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      this.toast.error('Image size must be less than 5MB');
      input.value = '';
      return;
    }

    console.log('Opening crop dialog with event:', event);

    // Open crop dialog - pass event directly without resetting input yet
    this.imageChangeEvent.set(event);
    this.showImageCrop.set(true);
  }

  closeCropDialog() {
    console.log('Closing crop dialog');
    this.showImageCrop.set(false);
    setTimeout(() => {
      this.imageChangeEvent.set(null);
    }, 300); // Delay clearing event to allow dialog to close smoothly
  }

  async onCroppedImage(blob: Blob) {
    this.showImageCrop.set(false);
    this.imageChangeEvent.set(null);

    const userId = this.auth.userId();
    if (!userId) return;

    try {
      this.uploading.set(true);
      // Convert blob to file - filename doesn't matter as service uses consistent naming
      const file = new File([blob], 'avatar.png', { type: 'image/png' });
      const url = await this.userService.uploadAvatar(userId, file);
      this.avatarUrl.set(url);
      await this.saveProfile();
      this.toast.success('Profile photo updated');
    } catch (e) {
      this.toast.error('Failed to upload avatar');
      console.error('Avatar upload error:', e);
    } finally {
      this.uploading.set(false);
    }
  }

  onClose() {
    this.close.emit();
  }

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

  confirmDeleteStep1() {
    this.showConfirm1.set(true);
  }
  onCancelConfirm() {
    this.showConfirm1.set(false);
    this.showConfirm2.set(false);
  }
  onConfirm1() {
    this.showConfirm1.set(false);
    this.showConfirm2.set(true);
  }

  async onConfirm2() {
    this.showConfirm2.set(false);
    this.toast.error('Account deletion requires server-side action. Please contact support.');
  }

  openTerms() {
    this.showTerms.set(true);
  }
  closeTerms() {
    this.showTerms.set(false);
  }

  async connectGoogleDrive() {
    try {
      await this.googleDrive.connect();
      this.toast.success('Successfully connected to Google Drive');
    } catch (error) {
      console.error('Failed to connect to Google Drive:', error);
      this.toast.error('Failed to connect to Google Drive');
    }
  }

  async disconnectGoogleDrive() {
    try {
      await this.googleDrive.disconnect();
      this.toast.success('Disconnected from Google Drive');
    } catch (error) {
      console.error('Failed to disconnect from Google Drive:', error);
      this.toast.error('Failed to disconnect from Google Drive');
    }
  }

  async connectOneDrive() {
    try {
      await this.oneDrive.connect();
      this.toast.success('Successfully connected to OneDrive');
    } catch (error) {
      console.error('Failed to connect to OneDrive:', error);
      this.toast.error('Failed to connect to OneDrive');
    }
  }

  async disconnectOneDrive() {
    try {
      await this.oneDrive.disconnect();
      this.toast.success('Disconnected from OneDrive');
    } catch (error) {
      console.error('Failed to disconnect from OneDrive:', error);
      this.toast.error('Failed to disconnect from OneDrive');
    }
  }
}
