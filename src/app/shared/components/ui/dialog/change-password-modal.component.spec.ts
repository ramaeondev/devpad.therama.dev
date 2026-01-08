import { TestBed } from '@angular/core/testing';
import { ChangePasswordModalComponent } from './change-password-modal.component';

class MockSupabase { auth = { getSession: jest.fn(() => Promise.resolve({ data: { session: { user: { email: 'a@b.com' } } } })), signInWithPassword: jest.fn(() => Promise.resolve({ error: null })), updateUser: jest.fn(() => Promise.resolve({ error: null })) } }
class MockToast { success = jest.fn(); error = jest.fn(); }
class MockLoading { withLoading = (fn: any) => fn(); }

describe('ChangePasswordModalComponent', () => {
  it('canSubmit validates correctly', async () => {
    await TestBed.configureTestingModule({ imports: [ChangePasswordModalComponent], providers: [ { provide: (await import('../../../../core/services/supabase.service')).SupabaseService, useClass: MockSupabase }, { provide: (await import('../../../../core/services/toast.service')).ToastService, useClass: MockToast }, { provide: (await import('../../../../core/services/loading.service')).LoadingService, useClass: MockLoading } ] }).compileComponents();
    const fixture = TestBed.createComponent(ChangePasswordModalComponent);
    const comp = fixture.componentInstance;

    comp.currentPassword = 'old'; comp.newPassword = '123'; comp.confirmPassword = '123';
    expect(comp.canSubmit()).toBe(false);

    comp.newPassword = '123456'; comp.confirmPassword = '123456';
    expect(comp.canSubmit()).toBe(true);
  });

  it('trySubmit success path emits success', async () => {
    const mock = new MockSupabase();
    await TestBed.configureTestingModule({ imports: [ChangePasswordModalComponent], providers: [ { provide: (await import('../../../../core/services/supabase.service')).SupabaseService, useValue: mock }, { provide: (await import('../../../../core/services/toast.service')).ToastService, useClass: MockToast }, { provide: (await import('../../../../core/services/loading.service')).LoadingService, useClass: MockLoading } ] }).compileComponents();
    const fixture = TestBed.createComponent(ChangePasswordModalComponent);
    const comp = fixture.componentInstance;

    comp.currentPassword = 'old'; comp.newPassword = '123456'; comp.confirmPassword = '123456';
    const spy = jest.fn();
    comp.success.subscribe(spy);

    await comp.trySubmit();
    expect(spy).toHaveBeenCalled();
  });
});