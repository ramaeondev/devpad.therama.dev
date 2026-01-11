import { TestBed } from '@angular/core/testing';
import { GitLabCallbackComponent } from './gitlab-callback.component';

class MockSupabase {
  authDirect = {
    getSession: jest
      .fn()
      .mockResolvedValue({ data: { session: { user: { id: 'u1' } } }, error: null }),
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

describe('GitLabCallbackComponent', () => {
  it('handles successful GitLab callback', async () => {
    await TestBed.configureTestingModule({
      imports: [GitLabCallbackComponent],
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

    const fixture = TestBed.createComponent(GitLabCallbackComponent);
    const comp = fixture.componentInstance;

    await comp.ngOnInit();

    const toast = TestBed.inject(
      (await import('../../../../core/services/toast.service')).ToastService as any,
    );
    expect(toast.success).toHaveBeenCalled();
  });

  it('sets error and toast on failure', async () => {
    const mockSup = {
      authDirect: {
        getSession: jest.fn().mockResolvedValue({ data: null, error: new Error('bad') }),
      },
    } as any;
    await TestBed.configureTestingModule({
      imports: [GitLabCallbackComponent],
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

    const fixture = TestBed.createComponent(GitLabCallbackComponent);
    const comp = fixture.componentInstance;

    await comp.ngOnInit();

    expect(comp.error()).toBeTruthy();
  });
});
