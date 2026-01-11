import { TestBed } from '@angular/core/testing';
import { ContactUsModalComponent } from './contact-us-modal.component';

class MockToast { success(){} error(){} }
class MockAuth { userEmail() { return 'user@example.com'; } }
class MockSupabase { client = { functions: { invoke: async () => ({}) } } }

describe('ContactUsModalComponent', () => {
  it('validates canSend and rejects when fields missing', async () => {
    await TestBed.configureTestingModule({
      imports: [ContactUsModalComponent],
      providers: [
        { provide: (await import('../../../../core/services/toast.service')).ToastService, useClass: MockToast },
        { provide: (await import('../../../../core/services/auth-state.service')).AuthStateService, useClass: MockAuth },
        { provide: (await import('../../../../core/services/supabase.service')).SupabaseService, useClass: MockSupabase }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(ContactUsModalComponent);
    const comp = fixture.componentInstance;

    comp.subject = '';
    comp.message = '';
    expect(comp.canSend()).toBe(false);

    comp.subject = 'Subject only';
    expect(comp.canSend()).toBe(false);

    comp.message = 'Now both';
    expect(comp.canSend()).toBe(true);
  });

  it('sends message with attachments and emits close on success', async () => {
    // Prepare mocks
    const mockToast = new MockToast();
    const toastSuccessSpy = jest.spyOn(mockToast, 'success');
    const mockAuth = new MockAuth();

    const mockSupabase: any = { client: { functions: { invoke: jest.fn().mockResolvedValue({}) } } };

    await TestBed.configureTestingModule({
      imports: [ContactUsModalComponent],
      providers: [
        { provide: (await import('../../../../core/services/toast.service')).ToastService, useValue: mockToast },
        { provide: (await import('../../../../core/services/auth-state.service')).AuthStateService, useValue: mockAuth },
        { provide: (await import('../../../../core/services/supabase.service')).SupabaseService, useValue: mockSupabase }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(ContactUsModalComponent);
    const comp = fixture.componentInstance;

    comp.subject = 'Feedback';
    comp.message = 'Here is some feedback';

    // Add a fake file attachment and mock FileReader to resolve to base64 content
    const fakeFile = new File(['hello'], 'note.txt', { type: 'text/plain' });
    comp.attachments.set([{ file: fakeFile as any, id: 'f1', name: 'note.txt', size: 5, sizeFormatted: '5 Bytes' } as any]);

    const fakeReader: any = {
      result: 'data:text/plain;base64,SEVMTE8=',
      readAsDataURL(file: File) { 
        // call onload asynchronously so tests can assign handler after readAsDataURL is invoked (matches browser behavior)
        this.result = 'data:text/plain;base64,SEVMTE8=';
        setTimeout(() => { if (this.onload) this.onload({}); }, 0);
      },
      onload: null,
      onerror: null
    };
    const fileReaderSpy = jest.spyOn(global as any, 'FileReader').mockImplementation(() => fakeReader);

    const closeSpy = jest.spyOn((comp as any).close, 'emit');

    await comp.sendMessage();

    // ensure supabase invoke called with payload including attachments
    expect(mockSupabase.client.functions.invoke).toHaveBeenCalled();
    const callArgs = mockSupabase.client.functions.invoke.mock.calls[0][1];
    expect(callArgs.body).toMatchObject({ subject: 'Feedback', message: 'Here is some feedback', userEmail: 'user@example.com' });
    expect(callArgs.body.attachments[0].content).toBe('SEVMTE8=');

    expect(toastSuccessSpy).toHaveBeenCalled();
    expect(closeSpy).toHaveBeenCalled();

    fileReaderSpy.mockRestore();
  });

  it('shows error toast when supabase returns an error', async () => {
    const mockToast = new MockToast();
    const toastErrorSpy = jest.spyOn(mockToast, 'error');

    const mockSupabaseError: any = { client: { functions: { invoke: jest.fn().mockResolvedValue({ error: new Error('boom') }) } } };

    await TestBed.configureTestingModule({
      imports: [ContactUsModalComponent],
      providers: [
        { provide: (await import('../../../../core/services/toast.service')).ToastService, useValue: mockToast },
        { provide: (await import('../../../../core/services/auth-state.service')).AuthStateService, useClass: MockAuth },
        { provide: (await import('../../../../core/services/supabase.service')).SupabaseService, useValue: mockSupabaseError }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(ContactUsModalComponent);
    const comp = fixture.componentInstance;

    comp.subject = 'Fail case';
    comp.message = 'This will fail';
    comp.attachments.set([]);

    await comp.sendMessage();

    expect(toastErrorSpy).toHaveBeenCalled();
  });

  it('onBackdropClick emits close only when not sending', async () => {
    const mockToast = new MockToast();

    await TestBed.configureTestingModule({
      imports: [ContactUsModalComponent],
      providers: [
        { provide: (await import('../../../../core/services/toast.service')).ToastService, useValue: mockToast },
        { provide: (await import('../../../../core/services/auth-state.service')).AuthStateService, useClass: MockAuth },
        { provide: (await import('../../../../core/services/supabase.service')).SupabaseService, useClass: MockSupabase }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(ContactUsModalComponent);
    const comp = fixture.componentInstance;

    const closeSpy = jest.spyOn((comp as any).close, 'emit');

    comp.sending.set(false);
    comp.onBackdropClick();
    expect(closeSpy).toHaveBeenCalledTimes(1);

    comp.sending.set(true);
    comp.onBackdropClick();
    expect(closeSpy).toHaveBeenCalledTimes(1);
  });

  it('onFileSelected rejects oversized single file and clears input', async () => {
    const mockToast = new MockToast();
    const toastErrorSpy = jest.spyOn(mockToast, 'error');

    await TestBed.configureTestingModule({
      imports: [ContactUsModalComponent],
      providers: [
        { provide: (await import('../../../../core/services/toast.service')).ToastService, useValue: mockToast },
        { provide: (await import('../../../../core/services/auth-state.service')).AuthStateService, useClass: MockAuth },
        { provide: (await import('../../../../core/services/supabase.service')).SupabaseService, useClass: MockSupabase }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(ContactUsModalComponent);
    const comp = fixture.componentInstance;

    // Create a large file (>6MB)
    const big = new File([new Uint8Array(6 * 1024 * 1024 + 1)], 'big.bin');
    const fakeInput: any = { files: [big], value: 'some' };

    comp.onFileSelected({ target: fakeInput } as any);

    expect(toastErrorSpy).toHaveBeenCalled();
    expect(fakeInput.value).toBe('');
  });

  it('onFileSelected rejects when total size would exceed limit', async () => {
    const mockToast = new MockToast();
    const toastErrorSpy = jest.spyOn(mockToast, 'error');

    await TestBed.configureTestingModule({
      imports: [ContactUsModalComponent],
      providers: [
        { provide: (await import('../../../../core/services/toast.service')).ToastService, useValue: mockToast },
        { provide: (await import('../../../../core/services/auth-state.service')).AuthStateService, useClass: MockAuth },
        { provide: (await import('../../../../core/services/supabase.service')).SupabaseService, useClass: MockSupabase }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(ContactUsModalComponent);
    const comp = fixture.componentInstance;

    // pre-fill attachments so total is near limit
    comp.attachments.set([{ id: 'a', file: {} as any, name: 'a', size: 5 * 1024 * 1024, sizeFormatted: '5 MB' } as any]);

    const small = new File([new Uint8Array(2 * 1024 * 1024)], 'small.bin');
    const fakeInput: any = { files: [small], value: 'x' };

    comp.onFileSelected({ target: fakeInput } as any);

    expect(toastErrorSpy).toHaveBeenCalled();
    expect(fakeInput.value).toBe('');
  });

  it('onFileSelected rejects when exceeding max file count', async () => {
    const mockToast = new MockToast();
    const toastErrorSpy = jest.spyOn(mockToast, 'error');

    await TestBed.configureTestingModule({
      imports: [ContactUsModalComponent],
      providers: [
        { provide: (await import('../../../../core/services/toast.service')).ToastService, useValue: mockToast },
        { provide: (await import('../../../../core/services/auth-state.service')).AuthStateService, useClass: MockAuth },
        { provide: (await import('../../../../core/services/supabase.service')).SupabaseService, useClass: MockSupabase }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(ContactUsModalComponent);
    const comp = fixture.componentInstance;

    // Fill attachments to max
    const entries = Array.from({ length: comp.MAX_FILES }, (_, i) => ({ id: String(i), file: {} as any, name: String(i), size: 1, sizeFormatted: '1 B' } as any));
    comp.attachments.set(entries);

    const small = new File([new Uint8Array(10)], 't.bin');
    const fakeInput: any = { files: [small], value: 'x' };

    comp.onFileSelected({ target: fakeInput } as any);

    expect(toastErrorSpy).toHaveBeenCalled();
    expect(fakeInput.value).toBe('');
  });

  it('removeAttachment removes item and formatFileSize handles zero', async () => {
    await TestBed.configureTestingModule({
      imports: [ContactUsModalComponent],
      providers: [
        { provide: (await import('../../../../core/services/toast.service')).ToastService, useClass: MockToast },
        { provide: (await import('../../../../core/services/auth-state.service')).AuthStateService, useClass: MockAuth },
        { provide: (await import('../../../../core/services/supabase.service')).SupabaseService, useClass: MockSupabase }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(ContactUsModalComponent);
    const comp = fixture.componentInstance;

    comp.attachments.set([{ id: 'x', file: {} as any, name: 'x', size: 123, sizeFormatted: '123 B' } as any]);
    expect(comp.getTotalSize()).toBe(123);

    comp.removeAttachment('x');
    expect(comp.getTotalSize()).toBe(0);
    expect(comp.formatFileSize(0)).toBe('0 Bytes');
  });

  it('getUserName returns Anonymous when auth has no user', async () => {
    const mockToast = new MockToast();
    const mockAuthNull = { userEmail: () => null };

    await TestBed.configureTestingModule({
      imports: [ContactUsModalComponent],
      providers: [
        { provide: (await import('../../../../core/services/toast.service')).ToastService, useValue: mockToast },
        { provide: (await import('../../../../core/services/auth-state.service')).AuthStateService, useValue: mockAuthNull },
        { provide: (await import('../../../../core/services/supabase.service')).SupabaseService, useClass: MockSupabase }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(ContactUsModalComponent);
    const comp = fixture.componentInstance;

    expect((comp as any).getUserName()).toBe('Anonymous User');
  });
});