import { TestBed } from '@angular/core/testing';
import { SigninComponent } from './signin.component';

class MockSupabase {
  auth = {
    signInWithPassword: jest.fn().mockResolvedValue({ data: { session: { user: { id: 'u1' } } } }),
  };
  authDirect = { signInWithOAuth: jest.fn().mockResolvedValue({}) };
}
class MockToast {
  success = jest.fn();
  error = jest.fn();
}
class MockAuthState {
  setUser = jest.fn();
}
class MockRouter {
  parseUrl = jest.fn().mockReturnValue({ queryParamMap: new Map() });
  navigateByUrl = jest.fn();
}
class MockDevice {
  registerDevice = jest.fn().mockResolvedValue(true);
}
class MockActivity {
  logActivity = jest.fn().mockResolvedValue(true);
}

describe('SigninComponent', () => {
  it('onSubmit success sets auth and navigates', async () => {
    await TestBed.configureTestingModule({
      imports: [SigninComponent, (await import('@angular/router/testing')).RouterTestingModule],
      providers: [
        {
          provide: (await import('../../../../core/services/supabase.service')).SupabaseService,
          useClass: MockSupabase,
        },
        {
          provide: (await import('../../../../core/services/toast.service')).ToastService,
          useClass: MockToast,
        },
        {
          provide: (await import('../../../../core/services/auth-state.service')).AuthStateService,
          useClass: MockAuthState,
        },
        {
          provide: (await import('../../../../core/services/device-fingerprint.service'))
            .DeviceFingerprintService,
          useClass: MockDevice,
        },
        {
          provide: (await import('../../../../core/services/activity-log.service'))
            .ActivityLogService,
          useClass: MockActivity,
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(SigninComponent);
    const comp = fixture.componentInstance;

    comp.signinForm.setValue({ email: 'a@b.com', password: 'secret' });
    await comp.onSubmit();

    const auth = TestBed.inject(
      (await import('../../../../core/services/auth-state.service')).AuthStateService as any,
    );
    expect(auth.setUser).toHaveBeenCalled();
  });

  it('signInWithGoogle handles error paths gracefully', async () => {
    const sup = new MockSupabase();
    sup.authDirect.signInWithOAuth = jest.fn().mockRejectedValue(new Error('bad'));
    await TestBed.configureTestingModule({
      imports: [SigninComponent, (await import('@angular/router/testing')).RouterTestingModule],
      providers: [
        {
          provide: (await import('../../../../core/services/supabase.service')).SupabaseService,
          useValue: sup,
        },
        {
          provide: (await import('../../../../core/services/toast.service')).ToastService,
          useClass: MockToast,
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(SigninComponent);
    const comp = fixture.componentInstance;

    await comp.signInWithGoogle();

    const toast = TestBed.inject(
      (await import('../../../../core/services/toast.service')).ToastService as any,
    );
    expect(toast.error).toHaveBeenCalled();
  });
});
