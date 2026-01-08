import { TestBed } from '@angular/core/testing';
import { ForgotPasswordComponent } from './forgot-password.component';

class MockSupabase { auth = { resetPasswordForEmail: jest.fn().mockResolvedValue({ error: null }) }; }
class MockToast { success = jest.fn(); error = jest.fn(); }

describe('ForgotPasswordComponent', () => {
  it('sends reset and shows success', async () => {
    await TestBed.configureTestingModule({ imports: [ForgotPasswordComponent, (await import('@angular/router/testing')).RouterTestingModule], providers: [ { provide: (await import('../../../../core/services/supabase.service')).SupabaseService, useClass: MockSupabase }, { provide: (await import('../../../../core/services/toast.service')).ToastService, useClass: MockToast } ] }).compileComponents();

    const fixture = TestBed.createComponent(ForgotPasswordComponent);
    const comp = fixture.componentInstance;

    comp.form.setValue({ email: 'a@b.com' });
    await comp.onSubmit();

    const toast = TestBed.inject((await import('../../../../core/services/toast.service')).ToastService as any);
    expect(toast.success).toHaveBeenCalled();
  });

  it('shows error when supabase returns error', async () => {
    const mockSup = { auth: { resetPasswordForEmail: jest.fn().mockResolvedValue({ error: { message: 'err' } }) } } as any;
    await TestBed.configureTestingModule({ imports: [ForgotPasswordComponent, (await import('@angular/router/testing')).RouterTestingModule], providers: [ { provide: (await import('../../../../core/services/supabase.service')).SupabaseService, useValue: mockSup }, { provide: (await import('../../../../core/services/toast.service')).ToastService, useClass: MockToast } ] }).compileComponents();

    const fixture = TestBed.createComponent(ForgotPasswordComponent);
    const comp = fixture.componentInstance;

    comp.form.setValue({ email: 'a@b.com' });
    await comp.onSubmit();

    const toast = TestBed.inject((await import('../../../../core/services/toast.service')).ToastService as any);
    expect(toast.error).toHaveBeenCalled();
  });

  it('does nothing when form invalid', async () => {
    await TestBed.configureTestingModule({ imports: [ForgotPasswordComponent, (await import('@angular/router/testing')).RouterTestingModule], providers: [ { provide: (await import('../../../../core/services/supabase.service')).SupabaseService, useClass: MockSupabase } ] }).compileComponents();

    const fixture = TestBed.createComponent(ForgotPasswordComponent);
    const comp = fixture.componentInstance;

    comp.form.setValue({ email: '' });
    await comp.onSubmit();

    // no exception and still loading false
    expect(comp.loading()).toBe(false);
  });
});
