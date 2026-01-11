import { TestBed } from '@angular/core/testing';
import { DiscordCallbackComponent } from './discord-callback.component';

class MockSupabase {
  authDirect = {
    getSession: jest.fn().mockResolvedValue({
      data: {
        session: {
          user: { id: 'u1', user_metadata: { full_name: 'John Doe', avatar_url: 'a' } },
        },
      },
      error: null,
    }),
  };
}
class MockAuth {
  setUser = jest.fn();
}
class MockToast {
  success = jest.fn();
  error = jest.fn();
}
class MockDevice {
  registerDevice = jest.fn().mockResolvedValue(true);
}
class MockUser {
  upsertUserProfile = jest.fn().mockResolvedValue({});
}
class MockRouter {
  navigateByUrl = jest.fn();
  navigate = jest.fn();
}

describe('DiscordCallbackComponent', () => {
  it('handles successful callback and navigates', async () => {
    await TestBed.configureTestingModule({
      imports: [DiscordCallbackComponent],
      providers: [
        {
          provide: (await import('../../../../core/services/supabase.service')).SupabaseService,
          useClass: MockSupabase,
        },
        {
          provide: (await import('../../../../core/services/auth-state.service')).AuthStateService,
          useClass: MockAuth,
        },
        {
          provide: (await import('../../../../core/services/toast.service')).ToastService,
          useClass: MockToast,
        },
        {
          provide: (await import('../../../../core/services/device-fingerprint.service'))
            .DeviceFingerprintService,
          useClass: MockDevice,
        },
        {
          provide: (await import('../../../../core/services/user.service')).UserService,
          useClass: MockUser,
        },
        { provide: (await import('@angular/router')).Router, useClass: MockRouter },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(DiscordCallbackComponent);
    const comp = fixture.componentInstance;

    await comp.ngOnInit();

    const auth = TestBed.inject(
      (await import('../../../../core/services/auth-state.service')).AuthStateService as any,
    );
    const toast = TestBed.inject(
      (await import('../../../../core/services/toast.service')).ToastService as any,
    );
    expect(auth.setUser).toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalled();
  });

  it('sets error and shows toast on failure', async () => {
    const mockSup = {
      authDirect: {
        getSession: jest.fn().mockResolvedValue({ data: null, error: new Error('fail') }),
      },
    } as any;
    await TestBed.configureTestingModule({
      imports: [DiscordCallbackComponent],
      providers: [
        {
          provide: (await import('../../../../core/services/supabase.service')).SupabaseService,
          useValue: mockSup,
        },
        {
          provide: (await import('../../../../core/services/toast.service')).ToastService,
          useClass: MockToast,
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(DiscordCallbackComponent);
    const comp = fixture.componentInstance;

    await comp.ngOnInit();

    expect(comp.error()).toBeTruthy();
    const toast = TestBed.inject(
      (await import('../../../../core/services/toast.service')).ToastService as any,
    );
    expect(toast.error).toHaveBeenCalled();
  });

  it('goToSignIn navigates to signin route', async () => {
    await TestBed.configureTestingModule({
      imports: [DiscordCallbackComponent],
      providers: [{ provide: (await import('@angular/router')).Router, useClass: MockRouter }],
    }).compileComponents();
    const fixture = TestBed.createComponent(DiscordCallbackComponent);
    const comp = fixture.componentInstance;
    const router = TestBed.inject((await import('@angular/router')).Router as any);
    comp.goToSignIn();
    expect(router.navigate).toHaveBeenCalledWith(['/auth/signin']);
  });
});
