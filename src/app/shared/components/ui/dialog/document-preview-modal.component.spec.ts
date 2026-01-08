import { TestBed } from '@angular/core/testing';
import { DocumentPreviewModalComponent } from './document-preview-modal.component';

class MockSupabase { storage = { from: () => ({ createSignedUrl: jest.fn(async () => ({ data: { signedUrl: 'https://s' }, error: null })) }) } }
class MockToast { error = jest.fn(); }

describe('DocumentPreviewModalComponent', () => {
  it('detects pdf and image correctly', async () => {
    await TestBed.configureTestingModule({ imports: [DocumentPreviewModalComponent] }).compileComponents();
    const fixture = TestBed.createComponent(DocumentPreviewModalComponent);
    const comp = fixture.componentInstance;

    comp.note = { content: 'storage://notes/file.pdf', title: 'F' } as any;
    expect(comp.isPdf()).toBe(true);

    comp.note = { content: 'storage://notes/image.jpg', title: 'I' } as any;
    expect(comp.isImage()).toBe(true);
    expect(comp.getExtension()).toBe('jpg');
  });

  it('loadPreview sets previewUrl when storage path present', async () => {
    await TestBed.configureTestingModule({ imports: [DocumentPreviewModalComponent], providers: [ { provide: (await import('../../../../core/services/supabase.service')).SupabaseService, useClass: MockSupabase }, { provide: (await import('../../../../core/services/toast.service')).ToastService, useClass: MockToast } ] }).compileComponents();
    const fixture = TestBed.createComponent(DocumentPreviewModalComponent);
    const comp = fixture.componentInstance;
    comp.note = { content: 'storage://notes/file.pdf', title: 'F' } as any;

    await comp.ngOnInit();
    await new Promise((r) => setTimeout(r, 0));
    expect(comp.previewUrl()).toBe('https://s');
  });
});