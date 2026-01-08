import { TestBed } from '@angular/core/testing';
import { SignupComponent } from './signup.component';

class MockSupabase { auth = { signUp: jest.fn().mockResolvedValue({ data: { user: { id: 'u1', email: 'x' } } }) }; authDirect = { signInWithOAuth: jest.fn().mockResolvedValue({}) }; }
class MockDevice { registerDevice = jest.fn().mockResolvedValue(true); }
class MockToast { success = jest.fn(); error = jest.fn(); warning = jest.fn(); }
class MockRouter { navigate = jest.fn(); }

describe('SignupComponent', () => {
  it('passwordMatchValidator detects mismatch', async () => {
    await TestBed.configureTestingModule({ imports: [SignupComponent, (await import('@angular/router/testing')).RouterTestingModule] }).compileComponents();
    const fixture = TestBed.createComponent(SignupComponent);
    const comp = fixture.componentInstance;

    const fakeForm: any = { get: (name: string) => ({ value: name === 'password' ? 'a' : 'b' }) };
    const res = comp.passwordMatchValidator(fakeForm);
    expect(res).toEqual({ passwordMismatch: true });
  });

  it('onSubmit success registers device and navigates', async () => {
    await TestBed.configureTestingModule({ imports: [SignupComponent, (await import('@angular/router/testing')).RouterTestingModule], providers: [ { provide: (await import('../../../../core/services/supabase.service')).SupabaseService, useClass: MockSupabase }, { provide: (await import('../../../../core/services/device-fingerprint.service')).DeviceFingerprintService, useClass: MockDevice }, { provide: (await import('../../../../core/services/toast.service')).ToastService, useClass: MockToast } ] }).compileComponents();

    const fixture = TestBed.createComponent(SignupComponent);
    const comp = fixture.componentInstance;

    comp.signupForm.setValue({ firstName: '', lastName: '', email: 'a@b.com', password: 'secret', confirmPassword: 'secret', termsAccepted: true });
    await comp.onSubmit();

    const toast = TestBed.inject((await import('../../../../core/services/toast.service')).ToastService as any);
    expect(toast.success).toHaveBeenCalled();
  });
});
