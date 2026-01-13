import { TestBed } from '@angular/core/testing';
import { DocumentPreviewModalComponent } from './document-preview-modal.component';

class MockSupabase {
  storage = {
    from: () => ({
      createSignedUrl: jest.fn(async () => ({ data: { signedUrl: 'https://s' }, error: null })),
    }),
  };
}
class MockToast {
  error = jest.fn();
}

describe('DocumentPreviewModalComponent', () => {
  it('detects pdf and image correctly', async () => {
    await TestBed.configureTestingModule({
      imports: [DocumentPreviewModalComponent],
    }).compileComponents();
    const fixture = TestBed.createComponent(DocumentPreviewModalComponent);
    const comp = fixture.componentInstance;

    comp.note = { content: 'storage://notes/file.pdf', title: 'F' } as any;
    expect(comp.isPdf()).toBe(true);

    comp.note = { content: 'storage://notes/image.jpg', title: 'I' } as any;
    expect(comp.isImage()).toBe(true);
    expect(comp.getExtension()).toBe('jpg');
  });

  it('loadPreview sets previewUrl when storage path present', async () => {
    await TestBed.configureTestingModule({
      imports: [DocumentPreviewModalComponent],
      providers: [
        {
          provide: (await import('../../../../core/services/supabase.service')).SupabaseService,
          useClass: MockSupabase,
        },
        {
          provide: (await import('../../../../core/services/toast.service')).ToastService,
          useClass: MockToast,
        },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(DocumentPreviewModalComponent);
    const comp = fixture.componentInstance;
    comp.note = { content: 'storage://notes/file.pdf', title: 'F' } as any;

    await comp.ngOnInit();
    await new Promise((r) => setTimeout(r, 0));
    expect(comp.previewUrl()).toBe('https://s');
  });

  it('does not call supabase when content is not a storage path', async () => {
    const createSignedUrlSpy = jest.fn(async () => ({
      data: { signedUrl: 'https://s' },
      error: null,
    }));
    class SpySupabase {
      storage = { from: () => ({ createSignedUrl: createSignedUrlSpy }) };
    }

    await TestBed.configureTestingModule({
      imports: [DocumentPreviewModalComponent],
      providers: [
        {
          provide: (await import('../../../../core/services/supabase.service')).SupabaseService,
          useClass: SpySupabase,
        },
        {
          provide: (await import('../../../../core/services/toast.service')).ToastService,
          useClass: MockToast,
        },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(DocumentPreviewModalComponent);
    const comp = fixture.componentInstance;

    comp.note = { content: 'https://example.com/file.pdf' } as any;
    await comp.ngOnInit();
    expect(createSignedUrlSpy).not.toHaveBeenCalled();
    expect(comp.previewUrl()).toBeNull();
  });

  it('shows toast error when supabase createSignedUrl fails', async () => {
    class ErrorSupabase {
      storage = {
        from: () => ({
          createSignedUrl: jest.fn(async () => ({ data: null, error: new Error('boom') })),
        }),
      };
    }
    const toast = new MockToast();

    await TestBed.configureTestingModule({
      imports: [DocumentPreviewModalComponent],
      providers: [
        {
          provide: (await import('../../../../core/services/supabase.service')).SupabaseService,
          useClass: ErrorSupabase,
        },
        {
          provide: (await import('../../../../core/services/toast.service')).ToastService,
          useValue: toast,
        },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(DocumentPreviewModalComponent);
    const comp = fixture.componentInstance;

    comp.note = { content: 'storage://notes/file.pdf', title: 'F' } as any;
    await comp.ngOnInit();
    await new Promise((r) => setTimeout(r, 0));
    expect(toast.error).toHaveBeenCalledWith('Failed to load document preview');
    expect(comp.previewUrl()).toBeNull();
  });

  it('getExtension handles missing content and files without extension', async () => {
    await TestBed.configureTestingModule({
      imports: [DocumentPreviewModalComponent],
    }).compileComponents();
    const fixture = TestBed.createComponent(DocumentPreviewModalComponent);
    const comp = fixture.componentInstance;

    // no content
    comp.note = {} as any;
    expect(comp.getExtension()).toBe('');

    // content without extension
    comp.note = { content: 'storage://notes/file' } as any;
    expect(comp.getExtension()).toBe('file');
    expect(comp.isImage()).toBe(false);
  });

  it('download creates and clicks link when previewUrl present', async () => {
    await TestBed.configureTestingModule({
      imports: [DocumentPreviewModalComponent],
    }).compileComponents();
    const fixture = TestBed.createComponent(DocumentPreviewModalComponent);
    const comp = fixture.componentInstance;

    comp.note = { title: 'File' } as any;
    comp.previewUrl.set('https://example.com/file');

    const clickSpy = jest.spyOn(HTMLAnchorElement.prototype, 'click');
    comp.download();
    expect(clickSpy).toHaveBeenCalled();
    clickSpy.mockRestore();
  });
});
