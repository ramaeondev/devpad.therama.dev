import { TestBed } from '@angular/core/testing';
import { SettingsPanelComponent } from './settings-panel.component';
import { RouterTestingModule } from '@angular/router/testing';

class MockAuth { userId() { return 'u1'; } userEmail() { return 'u@x'; } }
class MockUser { async getUserProfile() { return { first_name: 'Ann', last_name: 'B' }; } }
class MockSupabase { 
  auth = { getSession: async () => ({ data: { session: { user: { app_metadata: { provider: 'email' } } } } }) };
  from(table: string) {
    // Return a chainable query-like object similar to Supabase query builder
    const query: any = {
      _result: { data: [], error: null },
      select() { return query; },
      insert() { return query; },
      update() { return query; },
      delete() { return query; },
      eq() { return query; },
      order() { return Promise.resolve({ data: [], error: null }); },
      single() { return Promise.resolve({ data: null, error: { code: 'PGRST116' } }); },
    };
    return query;
  }
}
class MockToast { error(){} success(){} info(){} }

describe('SettingsPanelComponent', () => {
  async function setup(providers: any[] = []) {
    const baseProviders = [
      { provide: (await import('../../../core/services/auth-state.service')).AuthStateService, useClass: MockAuth },
      { provide: (await import('../../../core/services/user.service')).UserService, useClass: MockUser },
      { provide: (await import('../../../core/services/supabase.service')).SupabaseService, useClass: MockSupabase },
      { provide: (await import('../../../core/services/toast.service')).ToastService, useClass: MockToast },
      { provide: (await import('../../../core/services/google-drive.service')).GoogleDriveService, useValue: { isConnected: () => false, checkConnection: async () => false } },
      { provide: (await import('../../../core/services/onedrive.service')).OneDriveService, useValue: { isConnected: () => false, checkConnection: async () => false } },
      ...providers
    ];

    await TestBed.configureTestingModule({ imports: [SettingsPanelComponent, RouterTestingModule], providers: baseProviders }).compileComponents();
    const fixture = TestBed.createComponent(SettingsPanelComponent);
    const comp = fixture.componentInstance;
    return { fixture, comp };
  }

  it('loads profile when opened and sets initials', async () => {
    const { comp } = await setup();
    expect(comp.open).toBe(false);
    comp.open = true;
    await new Promise((r) => setTimeout(r, 0));
    // detect changes after load
    expect(comp.initials()).toBe('AB');
  });

  it('sets theme using ThemeService', async () => {
    const mockTheme: any = { setTheme: jest.fn() };
    const { comp } = await setup([
      { provide: (await import('../../../core/services/theme.service')).ThemeService, useValue: mockTheme }
    ]);

    comp.setTheme('dark' as any);
    expect(mockTheme.setTheme).toHaveBeenCalledWith('dark');
  });

  it('saveProfile updates profile and handles success and failure', async () => {
    const mockUser: any = {
      getUserProfile: async () => ({ first_name: 'Ann', last_name: 'B' }),
      updateUserProfile: jest.fn().mockResolvedValue({ first_name: 'Ann2', last_name: 'B2', avatar_url: null })
    };
    const mockToast = new MockToast();
    const toastSuccess = jest.spyOn(mockToast, 'success');

    const { comp } = await setup([
      { provide: (await import('../../../core/services/user.service')).UserService, useValue: mockUser },
      { provide: (await import('../../../core/services/toast.service')).ToastService, useValue: mockToast }
    ]);

    comp.firstName.set('Ann2');
    comp.lastName.set('B2');

    await comp.saveProfile();

    expect(mockUser.updateUserProfile).toHaveBeenCalled();
    expect(toastSuccess).toHaveBeenCalled();
    expect(comp.saving()).toBe(false);

    // simulate update failure
    mockUser.updateUserProfile.mockRejectedValueOnce(new Error('fail'));
    const toastError = jest.spyOn(mockToast, 'error');
    await comp.saveProfile();
    expect(toastError).toHaveBeenCalled();
  });

  it('onImageSelected validates file type and size and opens crop dialog for valid image', async () => {
    const mockToast = new MockToast();
    const toastError = jest.spyOn(mockToast, 'error');
    const { comp } = await setup([
      { provide: (await import('../../../core/services/toast.service')).ToastService, useValue: mockToast }
    ]);

    // non-image file
    const input1: any = { files: [ new File(['x'], 'note.txt', { type: 'text/plain' }) ] };
    comp.onImageSelected({ target: input1 } as any);
    expect(toastError).toHaveBeenCalled();

    // large image file (>5MB)
    const big = new File([new ArrayBuffer(6 * 1024 * 1024)], 'big.png', { type: 'image/png' });
    const input2: any = { files: [ big ] };
    comp.onImageSelected({ target: input2 } as any);
    expect(toastError).toHaveBeenCalled();

    // valid image
    const valid = new File(['a'.repeat(10)], 'img.png', { type: 'image/png' });
    const input3: any = { files: [ valid ] };
    comp.onImageSelected({ target: input3 } as any);
    expect(comp.showImageCrop()).toBe(true);
    expect(comp.imageChangeEvent()).not.toBeNull();
  });

  it('onCroppedImage uploads avatar, saves and shows toast', async () => {
    const mockUser: any = {
      getUserProfile: async () => ({ first_name: 'Ann', last_name: 'B' }),
      uploadAvatar: jest.fn().mockResolvedValue('https://cdn/avatar.png'),
      updateUserProfile: jest.fn().mockResolvedValue({ first_name: 'Ann', last_name: 'B', avatar_url: 'https://cdn/avatar.png' })
    };
    const mockToast = new MockToast();
    const toastSuccess = jest.spyOn(mockToast, 'success');

    const { comp } = await setup([
      { provide: (await import('../../../core/services/user.service')).UserService, useValue: mockUser },
      { provide: (await import('../../../core/services/toast.service')).ToastService, useValue: mockToast }
    ]);

    // ensure auth.userId exists
    comp.auth = TestBed.inject((await import('../../../core/services/auth-state.service')).AuthStateService as any);

    await comp.onCroppedImage(new Blob(['a'], { type: 'image/png' }));

    expect(mockUser.uploadAvatar).toHaveBeenCalled();
    expect(mockUser.updateUserProfile).toHaveBeenCalled();
    expect(toastSuccess).toHaveBeenCalled();
    expect(comp.uploading()).toBe(false);
  });

  it('onConfirm2 disables user, clears auth, shows toast and navigates', async () => {
    const mockUser: any = { disableUser: jest.fn().mockResolvedValue({}) };
    const mockToast = new MockToast();
    const toastInfo = jest.spyOn(mockToast, 'info');
    const mockAuth: any = { userId: () => 'u1', clear: jest.fn() };
    const mockRouter: any = { navigate: jest.fn() };

    const { comp } = await setup([
      { provide: (await import('../../../core/services/user.service')).UserService, useValue: mockUser },
      { provide: (await import('../../../core/services/toast.service')).ToastService, useValue: mockToast },
      { provide: (await import('@angular/router')).Router, useValue: mockRouter },
      { provide: (await import('../../../core/services/auth-state.service')).AuthStateService, useValue: mockAuth }
    ]);

    await comp.onConfirm2();

    expect(mockUser.disableUser).toHaveBeenCalledWith('u1');
    expect(mockAuth.clear).toHaveBeenCalled();
    expect(toastInfo).toHaveBeenCalled();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/auth/login']);
  });

  it('onCroppedImage handles upload failure and shows toast', async () => {
    const mockUser: any = {
      getUserProfile: async () => ({ first_name: 'Ann', last_name: 'B' }),
      uploadAvatar: jest.fn().mockRejectedValue(new Error('upload fail')),
      updateUserProfile: jest.fn()
    };
    const mockToast = new MockToast();
    const toastError = jest.spyOn(mockToast, 'error');

    const { comp } = await setup([
      { provide: (await import('../../../core/services/user.service')).UserService, useValue: mockUser },
      { provide: (await import('../../../core/services/toast.service')).ToastService, useValue: mockToast }
    ]);

    comp.auth = TestBed.inject((await import('../../../core/services/auth-state.service')).AuthStateService as any);

    await comp.onCroppedImage(new Blob(['a'], { type: 'image/png' }));

    expect(mockUser.uploadAvatar).toHaveBeenCalled();
    expect(toastError).toHaveBeenCalled();
    expect(comp.uploading()).toBe(false);
  });

  it('onConfirm2 propagates error when disableUser fails', async () => {
    const disableSpy = jest.fn(async (id: string) => { throw new Error('fail'); });
    const mockUser: any = { disableUser: disableSpy };
    const mockToast = new MockToast();
    const toastError = jest.spyOn(mockToast, 'error');
    const mockAuth: any = { userId: () => 'u1', clear: jest.fn() };
    const mockRouter: any = { navigate: jest.fn() };

    const { comp } = await setup([
      { provide: (await import('../../../core/services/user.service')).UserService, useValue: mockUser },
      { provide: (await import('../../../core/services/toast.service')).ToastService, useValue: mockToast },
      { provide: (await import('@angular/router')).Router, useValue: mockRouter },
      { provide: (await import('../../../core/services/auth-state.service')).AuthStateService, useValue: mockAuth }
    ]);

    await expect(comp.onConfirm2()).rejects.toThrow('fail');
    expect(disableSpy).toHaveBeenCalledWith('u1');
    expect(mockAuth.clear).not.toHaveBeenCalled();
    expect(mockRouter.navigate).not.toHaveBeenCalled();
    // since the component doesn't catch, toast.error is not expected here
    expect(toastError).not.toHaveBeenCalled();
  });

  it('loadProfile returns early when no userId', async () => {
    const mockToast = new MockToast();

    const mockAuth1: any = { userId: () => null, userEmail: () => 'x@y' };
    const { comp } = await setup([
      { provide: (await import('../../../core/services/auth-state.service')).AuthStateService, useValue: mockAuth1 },
      { provide: (await import('../../../core/services/toast.service')).ToastService, useValue: mockToast }
    ]);

    await (comp as any).loadProfile();
    expect(comp.firstName()).toBe('');
  });

  it('loadProfile shows toast.error when userService throws', async () => {
    const mockToast = new MockToast();
    const toastError = jest.spyOn(mockToast, 'error');

    const mockAuth2: any = { userId: () => 'u1', userEmail: () => 'x@y' };
    const mockUserErr: any = { getUserProfile: jest.fn().mockRejectedValue(new Error('nope')) };

    const { comp: comp2 } = await setup([
      { provide: (await import('../../../core/services/auth-state.service')).AuthStateService, useValue: mockAuth2 },
      { provide: (await import('../../../core/services/user.service')).UserService, useValue: mockUserErr },
      { provide: (await import('../../../core/services/toast.service')).ToastService, useValue: mockToast }
    ]);

    await (comp2 as any).loadProfile();
    expect(toastError).toHaveBeenCalled();
  });

  it('closeCropDialog clears event after timeout', async () => {
    const { comp } = await setup();
    comp.showImageCrop.set(true);
    comp.imageChangeEvent.set(new Event('foo'));

    jest.useFakeTimers();
    comp.closeCropDialog();
    expect(comp.showImageCrop()).toBe(false);
    // advance timers to clear event
    jest.advanceTimersByTime(300);
    expect(comp.imageChangeEvent()).toBeNull();
    jest.useRealTimers();
  });

  it('onCroppedImage returns early when no userId', async () => {
    const mockAuth: any = { userId: () => null };
    const mockUser: any = { uploadAvatar: jest.fn() };

    const { comp } = await setup([
      { provide: (await import('../../../core/services/auth-state.service')).AuthStateService, useValue: mockAuth },
      { provide: (await import('../../../core/services/user.service')).UserService, useValue: mockUser }
    ]);

    await comp.onCroppedImage(new Blob(['a'], { type: 'image/png' }));
    expect(mockUser.uploadAvatar).not.toHaveBeenCalled();
    expect(comp.uploading()).toBe(false);
  });

  it('signOut clears auth, signs out supabase, closes panel and navigates', async () => {
    const mockSupabase: any = { auth: { signOut: jest.fn().mockResolvedValue({}) } };
    const mockLoading: any = { withLoading: jest.fn(async (fn: any) => { await fn(); }) };
    const mockAuth: any = { clear: jest.fn() };
    const mockRouter: any = { navigate: jest.fn() };

    const { comp } = await setup([
      { provide: (await import('../../../core/services/supabase.service')).SupabaseService, useValue: mockSupabase },
      { provide: (await import('../../../core/services/loading.service')).LoadingService, useValue: mockLoading },
      { provide: (await import('../../../core/services/auth-state.service')).AuthStateService, useValue: mockAuth },
      { provide: (await import('@angular/router')).Router, useValue: mockRouter }
    ]);

    const closeSpy = jest.spyOn(comp.close, 'emit');
    await comp.signOut();

    expect(mockSupabase.auth.signOut).toHaveBeenCalled();
    expect(mockAuth.clear).toHaveBeenCalled();
    expect(closeSpy).toHaveBeenCalled();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/auth/signin']);
  });

  it('confirm/cancel flows toggle confirmations correctly', async () => {
    const { comp } = await setup();
    comp.confirmDeleteStep1();
    expect(comp.showConfirm1()).toBe(true);
    comp.onConfirm1();
    expect(comp.showConfirm1()).toBe(false);
    expect(comp.showConfirm2()).toBe(true);
    comp.onCancelConfirm();
    expect(comp.showConfirm1()).toBe(false);
    expect(comp.showConfirm2()).toBe(false);
  });

  it('connect/disconnect google drive and one drive success and failure', async () => {
    const mockToast = new MockToast();
    const toastSuccess = jest.spyOn(mockToast, 'success');
    const toastError = jest.spyOn(mockToast, 'error');

    // success connect/disconnect
    const google: any = { connect: jest.fn().mockResolvedValue({}), disconnect: jest.fn().mockResolvedValue({}) };
    const one: any = { connect: jest.fn().mockResolvedValue({}), disconnect: jest.fn().mockResolvedValue({}) };

    const { comp } = await setup([
      { provide: (await import('../../../core/services/google-drive.service')).GoogleDriveService, useValue: google },
      { provide: (await import('../../../core/services/onedrive.service')).OneDriveService, useValue: one },
      { provide: (await import('../../../core/services/toast.service')).ToastService, useValue: mockToast }
    ]);

    await comp.connectGoogleDrive();
    expect(toastSuccess).toHaveBeenCalled();
    await comp.disconnectGoogleDrive();
    expect(toastSuccess).toHaveBeenCalled();

    await comp.connectOneDrive();
    expect(toastSuccess).toHaveBeenCalled();
    await comp.disconnectOneDrive();
    expect(toastSuccess).toHaveBeenCalled();

    // failure paths
    google.connect.mockRejectedValueOnce(new Error('gfail'));
    await comp.connectGoogleDrive();
    expect(toastError).toHaveBeenCalled();

    root: one.disconnect.mockRejectedValueOnce(new Error('ofail'));
    await comp.disconnectOneDrive();
    expect(toastError).toHaveBeenCalled();
  });

  it('open/close terms/privacy/change-password/about-me/contact-us behave correctly', async () => {
    const mockRouter: any = { navigate: jest.fn() };
    const { comp } = await setup([{ provide: (await import('@angular/router')).Router, useValue: mockRouter }]);

    comp.openTerms();
    expect(comp.showTerms()).toBe(true);
    comp.closeTerms();
    expect(comp.showTerms()).toBe(false);

    comp.openPrivacy();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/privacy']);

    comp.openChangePassword();
    expect(comp.showChangePassword()).toBe(true);
    comp.closeChangePassword();
    expect(comp.showChangePassword()).toBe(false);

    comp.showChangePassword.set(true);
    comp.onPasswordChanged();
    expect(comp.showChangePassword()).toBe(false);

    comp.openAboutMe();
    expect(comp.showAboutMe()).toBe(true);
    comp.closeAboutMe();
    expect(comp.showAboutMe()).toBe(false);

    comp.showContactUs.set(true);
    comp.closeContactUs();
    expect(comp.showContactUs()).toBe(false);
  });

  it('onImageSelected with no file does nothing', async () => {
    const mockToast = new MockToast();
    const toastError = jest.spyOn(mockToast, 'error');
    const { comp } = await setup([{ provide: (await import('../../../core/services/toast.service')).ToastService, useValue: mockToast }]);

    const input: any = { target: { files: [] } };
    comp.onImageSelected(input as any);
    expect(comp.imageChangeEvent()).toBeNull();
    expect(toastError).not.toHaveBeenCalled();
  });
});