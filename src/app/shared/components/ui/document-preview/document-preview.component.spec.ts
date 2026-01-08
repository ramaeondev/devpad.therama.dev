import { TestBed } from '@angular/core/testing';
import { DocumentPreviewComponent } from './document-preview.component';

class MockAuthState { userId() { return 'user-1'; } }
class MockToast { error = jest.fn(); }
class MockSanitizer {
  bypassSecurityTrustResourceUrl(v: any) { return `safe:${v}`; }
}

describe('DocumentPreviewComponent', () => {
  it('renders image preview when note is an image', async () => {
    const mockNoteService = { getFileObjectUrl: jest.fn().mockResolvedValue({ url: 'blob:img', revoke: jest.fn() }) };

    await TestBed.configureTestingModule({
      imports: [DocumentPreviewComponent],
      providers: [
        { provide: (await import('../../../../core/services/note.service')).NoteService, useValue: mockNoteService },
        { provide: (await import('../../../../core/services/auth-state.service')).AuthStateService, useClass: MockAuthState },
        { provide: (await import('../../../../core/services/toast.service')).ToastService, useClass: MockToast }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(DocumentPreviewComponent);
    const comp = fixture.componentInstance;
    comp.note = { id: 'n1', content: 'storage://notes/image.png', title: 'Img' };
    fixture.detectChanges();

    await fixture.whenStable();
    fixture.detectChanges();

    const img = fixture.nativeElement.querySelector('img');
    expect(img).toBeTruthy();
    expect(img.getAttribute('src')).toBe('blob:img');
    expect(comp.isImage()).toBe(true);
  });

  it('renders PDF iframe for pdf note and uses sanitizer', async () => {
    const mockNoteService = { getFileObjectUrl: jest.fn().mockResolvedValue({ url: 'https://example.com/doc.pdf', revoke: jest.fn() }) };
    await TestBed.configureTestingModule({
      imports: [DocumentPreviewComponent],
      providers: [
        { provide: (await import('../../../../core/services/note.service')).NoteService, useValue: mockNoteService },
        { provide: (await import('../../../../core/services/auth-state.service')).AuthStateService, useClass: MockAuthState },
        { provide: (await import('../../../../core/services/toast.service')).ToastService, useClass: MockToast }
      ]
    }).compileComponents();

    // use the real DomSanitizer and spy on its bypass method
    const sanitizer = TestBed.inject((await import('@angular/platform-browser')).DomSanitizer as any);
    jest.spyOn(sanitizer, 'bypassSecurityTrustResourceUrl');

    const fixture = TestBed.createComponent(DocumentPreviewComponent);
    const comp = fixture.componentInstance;
    comp.note = { id: 'n2', content: 'storage://notes/doc.pdf', title: 'Doc' };
    fixture.detectChanges();

    await fixture.whenStable();
    fixture.detectChanges();

    const iframe = fixture.nativeElement.querySelector('iframe[title="PDF Preview"]');
    expect(iframe).toBeTruthy();
    expect(sanitizer.bypassSecurityTrustResourceUrl).toHaveBeenCalled();
    expect(comp.isPdf()).toBe(true);
  });

  it('openInNewTab calls window.open when previewUrl exists', async () => {
    const mockNoteService = { getFileObjectUrl: jest.fn().mockResolvedValue({ url: 'https://example.com/doc.txt', revoke: jest.fn() }) };

    await TestBed.configureTestingModule({
      imports: [DocumentPreviewComponent],
      providers: [
        { provide: (await import('../../../../core/services/note.service')).NoteService, useValue: mockNoteService },
        { provide: (await import('../../../../core/services/auth-state.service')).AuthStateService, useClass: MockAuthState },
        { provide: (await import('../../../../core/services/toast.service')).ToastService, useClass: MockToast }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(DocumentPreviewComponent);
    const comp = fixture.componentInstance;
    comp.note = { id: 'n3', content: 'storage://notes/doc.txt', title: 'Text' };
    fixture.detectChanges();

    await fixture.whenStable();
    fixture.detectChanges();

    const openSpy = jest.spyOn(window, 'open').mockImplementation(() => null as any);
    comp.openInNewTab();
    expect(openSpy).toHaveBeenCalledWith('https://example.com/doc.txt', '_blank');
    openSpy.mockRestore();
  });

  it('shows toast error when note service throws', async () => {
    const mockNoteService = { getFileObjectUrl: jest.fn().mockRejectedValue(new Error('fail')) };
    const mockToast = new MockToast();

    await TestBed.configureTestingModule({
      imports: [DocumentPreviewComponent],
      providers: [
        { provide: (await import('../../../../core/services/note.service')).NoteService, useValue: mockNoteService },
        { provide: (await import('../../../../core/services/auth-state.service')).AuthStateService, useClass: MockAuthState },
        { provide: (await import('../../../../core/services/toast.service')).ToastService, useValue: mockToast }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(DocumentPreviewComponent);
    const comp = fixture.componentInstance;
    comp.note = { id: 'n4', content: 'storage://notes/doc.txt', title: 'Text' };
    fixture.detectChanges();

    await fixture.whenStable();
    fixture.detectChanges();

    expect((mockToast as any).error).toHaveBeenCalled();
    expect(comp.previewUrl()).toBeNull();
  });

  it('calls revoke function on destroy if provided', async () => {
    const revoke = jest.fn();
    const mockNoteService = { getFileObjectUrl: jest.fn().mockResolvedValue({ url: 'blob:1', revoke }) };

    await TestBed.configureTestingModule({
      imports: [DocumentPreviewComponent],
      providers: [
        { provide: (await import('../../../../core/services/note.service')).NoteService, useValue: mockNoteService },
        { provide: (await import('../../../../core/services/auth-state.service')).AuthStateService, useClass: MockAuthState },
        { provide: (await import('../../../../core/services/toast.service')).ToastService, useClass: MockToast }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(DocumentPreviewComponent);
    const comp = fixture.componentInstance;
    comp.note = { id: 'n5', content: 'storage://notes/image.png', title: 'Img' };
    fixture.detectChanges();

    await fixture.whenStable();
    fixture.detectChanges();

    fixture.destroy();
    expect(revoke).toHaveBeenCalled();
  });
});