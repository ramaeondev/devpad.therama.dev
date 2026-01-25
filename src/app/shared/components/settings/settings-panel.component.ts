import { Component, EventEmitter, Input, Output, inject, signal, computed } from '@angular/core';

import { ThemeService, Theme } from '../../../core/services/theme.service';
import { ChangelogModalComponent } from '../ui/changelog-modal.component';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { SupabaseService } from '../../../core/services/supabase.service';
import { Router, RouterLink } from '@angular/router';
import { LoadingService } from '../../../core/services/loading.service';
import { ConfirmModalComponent } from '../../components/ui/dialog/confirm-modal.component';
import { TermsModalComponent } from '../../components/ui/dialog/terms-modal.component';
import { ImageCropDialogComponent } from '../../components/ui/dialog/image-crop-dialog.component';
import { ChangePasswordModalComponent } from '../../components/ui/dialog/change-password-modal.component';
import { ToastService } from '../../../core/services/toast.service';
import { UserService } from '../../../core/services/user.service';
import { AvatarComponent } from '../ui/avatar/avatar.component';
import { OverlayModule } from '@angular/cdk/overlay';
import { GoogleDriveService } from '../../../core/services/google-drive.service';
import { OneDriveService } from '../../../core/services/onedrive.service';
import { AboutMeModalComponent } from '../ui/dialog/about-me-modal.component';
import { UserDevicesComponent } from '../user-devices/user-devices.component';
import { ContactUsModalComponent } from '../ui/dialog/contact-us-modal.component';

@Component({
  selector: 'app-settings-panel',
  standalone: true,
  imports: [
    RouterLink,
    ConfirmModalComponent,
    TermsModalComponent,
    ImageCropDialogComponent,
    ChangePasswordModalComponent,
    AvatarComponent,
    OverlayModule,
    ChangelogModalComponent,
    AboutMeModalComponent,
    UserDevicesComponent,
    ContactUsModalComponent,
  ],
  templateUrl: './settings-panel.component.html',
  styles: [],
})
export class SettingsPanelComponent {
  deleteInput = '';
  showChangelog = signal(false);
  showContactUs = signal(false);
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
  showChangePassword = signal(false);
  showAboutMe = signal(false);
  imageChangeEvent = signal<Event | null>(null);

  // Profile state
  firstName = signal<string>('');
  lastName = signal<string>('');
  avatarUrl = signal<string | null>(null);
  saving = signal(false);
  uploading = signal(false);
  authProvider = signal<string | null>(null);

  initials = computed(() => {
    const f = (this.firstName() || '').trim();
    const l = (this.lastName() || '').trim();
    if (f && l) return (f[0] + l[0]).toUpperCase();
    if (f) return f.slice(0, 2).toUpperCase();
    const email = this.auth.userEmail();
    return email ? email[0].toUpperCase() : '?';
  });

  // Check if user signed in with OAuth (Google/GitHub)
  isOAuthUser = computed(() => {
    const provider = this.authProvider();
    return provider === 'google' || provider === 'github';
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

      // Get auth provider from session
      const { data } = await this.supabase.auth.getSession();
      if (data.session?.user) {
        // Check app_metadata for provider info
        const provider = data.session.user.app_metadata?.['provider'];
        this.authProvider.set(provider || 'email');
      }
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
    // Disable user account immediately
    const userId = this.auth.userId();
    if (userId) {
      await this.userService.disableUser(userId);
    }
    // Log out user
    this.auth.clear();
    // Show toast notification
    this.toast.info(
      'Your account will be deleted in 24 hours. You will be notified. You are now logged out and cannot log in again.',
    );
    // Redirect to login page
    this.router.navigate(['/auth/login']);
  }

  openTerms() {
    this.showTerms.set(true);
  }
  openPrivacy() {
    this.router.navigate(['/privacy']);
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

  openChangePassword() {
    this.showChangePassword.set(true);
  }

  closeChangePassword() {
    this.showChangePassword.set(false);
  }

  onPasswordChanged() {
    this.showChangePassword.set(false);
  }

  openAboutMe() {
    this.showAboutMe.set(true);
  }

  closeAboutMe() {
    this.showAboutMe.set(false);
  }

  closeContactUs() {
    this.showContactUs.set(false);
  }
}
