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
});