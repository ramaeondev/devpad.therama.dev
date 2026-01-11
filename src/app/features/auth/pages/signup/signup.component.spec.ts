import { TestBed } from '@angular/core/testing';
import { SignupComponent } from './signup.component';

class MockSupabase {
  auth = { signUp: jest.fn().mockResolvedValue({ data: { user: { id: 'u1', email: 'x' } } }) };
  authDirect = { signInWithOAuth: jest.fn().mockResolvedValue({}) };
}
class MockDevice {
  registerDevice = jest.fn().mockResolvedValue(true);
}
class MockToast {
  success = jest.fn();
  error = jest.fn();
  warning = jest.fn();
}
class MockRouter {
  navigate = jest.fn();
}

describe('SignupComponent', () => {
  it('passwordMatchValidator detects mismatch', async () => {
    await TestBed.configureTestingModule({
      imports: [SignupComponent, (await import('@angular/router/testing')).RouterTestingModule],
    }).compileComponents();
    const fixture = TestBed.createComponent(SignupComponent);
    const comp = fixture.componentInstance;

    const fakeForm: any = { get: (name: string) => ({ value: name === 'password' ? 'a' : 'b' }) };
    const res = comp.passwordMatchValidator(fakeForm);
    expect(res).toEqual({ passwordMismatch: true });
  });

  it('onSubmit success registers device and navigates', async () => {
    await TestBed.configureTestingModule({
      imports: [SignupComponent, (await import('@angular/router/testing')).RouterTestingModule],
      providers: [
        {
          provide: (await import('../../../../core/services/supabase.service')).SupabaseService,
          useClass: MockSupabase,
        },
        {
          provide: (await import('../../../../core/services/device-fingerprint.service'))
            .DeviceFingerprintService,
          useClass: MockDevice,
        },
        {
          provide: (await import('../../../../core/services/toast.service')).ToastService,
          useClass: MockToast,
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(SignupComponent);
    const comp = fixture.componentInstance;

    comp.signupForm.setValue({
      firstName: '',
      lastName: '',
      email: 'a@b.com',
      password: 'secret',
      confirmPassword: 'secret',
      termsAccepted: true,
    });
    await comp.onSubmit();

    const toast = TestBed.inject(
      (await import('../../../../core/services/toast.service')).ToastService as any,
    );
    expect(toast.success).toHaveBeenCalled();
  });

  it('onSubmit handles supabase error', async () => {
    class MockSupabaseErr {
      auth = { signUp: jest.fn().mockResolvedValue({ data: null, error: new Error('nope') }) };
      authDirect = { signInWithOAuth: jest.fn().mockResolvedValue({}) };
    }
    await TestBed.configureTestingModule({
      imports: [SignupComponent, (await import('@angular/router/testing')).RouterTestingModule],
      providers: [
        {
          provide: (await import('../../../../core/services/supabase.service')).SupabaseService,
          useClass: MockSupabaseErr,
        },
        {
          provide: (await import('../../../../core/services/device-fingerprint.service'))
            .DeviceFingerprintService,
          useClass: MockDevice,
        },
        {
          provide: (await import('../../../../core/services/toast.service')).ToastService,
          useClass: MockToast,
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(SignupComponent);
    const comp = fixture.componentInstance;

    comp.signupForm.setValue({
      firstName: '',
      lastName: '',
      email: 'x@y.com',
      password: 'secret',
      confirmPassword: 'secret',
      termsAccepted: true,
    });
    await comp.onSubmit();

    expect(comp.errorMessage()).toBeDefined();
    const toast = TestBed.inject(
      (await import('../../../../core/services/toast.service')).ToastService as any,
    );
    expect(toast.error).toHaveBeenCalledWith('Failed to create account');
  });

  it('onSubmit continues when device registration fails', async () => {
    class MockDeviceFail {
      registerDevice = jest.fn().mockRejectedValue(new Error('fail'));
    }

    await TestBed.configureTestingModule({
      imports: [SignupComponent, (await import('@angular/router/testing')).RouterTestingModule],
      providers: [
        {
          provide: (await import('../../../../core/services/supabase.service')).SupabaseService,
          useClass: MockSupabase,
        },
        {
          provide: (await import('../../../../core/services/device-fingerprint.service'))
            .DeviceFingerprintService,
          useClass: MockDeviceFail,
        },
        {
          provide: (await import('../../../../core/services/toast.service')).ToastService,
          useClass: MockToast,
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(SignupComponent);
    const comp = fixture.componentInstance;

    comp.signupForm.setValue({
      firstName: '',
      lastName: '',
      email: 'a@b.com',
      password: 'secret',
      confirmPassword: 'secret',
      termsAccepted: true,
    });

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    await comp.onSubmit();

    expect(consoleSpy).toHaveBeenCalled();
    const toast = TestBed.inject(
      (await import('../../../../core/services/toast.service')).ToastService as any,
    );
    expect(toast.error).toHaveBeenCalledWith('Device registration failed. Please try again later.');
    expect(toast.success).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('signUpWithGoogle handles OAuth error', async () => {
    class MockSupOAuth {
      auth = { signUp: jest.fn().mockResolvedValue({ data: null, error: null }) };
      authDirect = {
        signInWithOAuth: jest.fn().mockResolvedValue({ error: new Error('oauth fail') }),
      };
    }

    await TestBed.configureTestingModule({
      imports: [SignupComponent, (await import('@angular/router/testing')).RouterTestingModule],
      providers: [
        {
          provide: (await import('../../../../core/services/supabase.service')).SupabaseService,
          useClass: MockSupOAuth,
        },
        {
          provide: (await import('../../../../core/services/toast.service')).ToastService,
          useClass: MockToast,
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(SignupComponent);
    const comp = fixture.componentInstance;

    await comp.signUpWithGoogle();

    // Google flow does not set a visible error message, but should show a toast and clear loading
    const toast = TestBed.inject(
      (await import('../../../../core/services/toast.service')).ToastService as any,
    );
    expect(toast.error).toHaveBeenCalledWith('Failed to start Google sign up');
    expect(comp.loading()).toBe(false);
  });
});
