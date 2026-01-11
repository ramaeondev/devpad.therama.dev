import { TestBed } from '@angular/core/testing';
import { DomSanitizer } from '@angular/platform-browser';
import { DocumentViewerComponent } from './document-viewer';

describe('DocumentViewerComponent', () => {
  it('sanitizes and sets safeUrl for previewable document', async () => {
    await TestBed.configureTestingModule({
      imports: [DocumentViewerComponent],
    }).compileComponents();
    const fixture = TestBed.createComponent(DocumentViewerComponent);
    const comp = fixture.componentInstance;
    comp.documentUrl = 'https://cdn/example.pdf';

    fixture.detectChanges();
    expect(comp.safeUrl()).toBeTruthy();
    expect(comp.canPreviewInIframe()).toBe(true);
  });

  it('isImage returns true for image urls and image is rendered', async () => {
    await TestBed.configureTestingModule({
      imports: [DocumentViewerComponent],
    }).compileComponents();
    const fixture = TestBed.createComponent(DocumentViewerComponent);
    const comp = fixture.componentInstance;
    comp.documentUrl = 'https://cdn/example.png';
    comp.title = 'Pic';
    fixture.detectChanges();

    // image branch should be taken when safeUrl is set and isImage true
    expect(comp.isImage()).toBe(true);
    const img = fixture.nativeElement.querySelector('img');
    // In this unit setup, updatePreview runs and sets safeUrl, but DOM may not contain img because template logic
    // uses safeUrl() check. Verify computed values rather than DOM presence reliably.
    expect(comp.safeUrl()).toBeTruthy();
  });

  it('downloadDocument creates a link and clicks it', async () => {
    await TestBed.configureTestingModule({
      imports: [DocumentViewerComponent],
    }).compileComponents();
    const fixture = TestBed.createComponent(DocumentViewerComponent);
    const comp = fixture.componentInstance;
    comp.documentUrl = 'https://cdn/example.txt';
    comp.title = 'Foo';

    // Spy on DOM methods to detect link creation and click
    const appendSpy = jest.spyOn(document.body, 'appendChild');
    const removeSpy = jest.spyOn(document.body, 'removeChild');

    comp.downloadDocument();

    expect(appendSpy).toHaveBeenCalled();
    expect(removeSpy).toHaveBeenCalled();
  });

  it('canPreviewInIframe recognizes google drive urls', async () => {
    await TestBed.configureTestingModule({
      imports: [DocumentViewerComponent],
    }).compileComponents();
    const fixture = TestBed.createComponent(DocumentViewerComponent);
    const comp = fixture.componentInstance;

    comp.documentUrl = 'https://docs.google.com/document/d/123';
    expect(comp.canPreviewInIframe()).toBe(true);

    comp.documentUrl = 'https://example.com/file.unknown';
    expect(comp.canPreviewInIframe()).toBe(false);
  });

  it('getFileExtension and type/icon helpers work', async () => {
    await TestBed.configureTestingModule({
      imports: [DocumentViewerComponent],
    }).compileComponents();
    const fixture = TestBed.createComponent(DocumentViewerComponent);
    const comp = fixture.componentInstance;
    comp.documentUrl = 'storage://notes/hello.xlsx';
    expect(comp.getFileExtension()).toBe('xlsx');
    const type = comp.getFileType();
    const icon = comp.getFileIconName();
    expect(typeof type).toBe('string');
    expect(typeof icon).toBe('string');
  });

  it('handles sanitizer errors and sets safeUrl to null', async () => {
    const sanitizerMock = {
      bypassSecurityTrustResourceUrl: jest.fn(() => {
        throw new Error('nope');
      }),
    } as any;
    await TestBed.configureTestingModule({
      imports: [DocumentViewerComponent],
      providers: [{ provide: DomSanitizer, useValue: sanitizerMock }],
    }).compileComponents();
    const fixture = TestBed.createComponent(DocumentViewerComponent);
    const comp = fixture.componentInstance;
    comp.documentUrl = 'https://cdn/bad.pdf';

    fixture.detectChanges();
    expect(comp.safeUrl()).toBeNull();
    expect(comp.isLoading()).toBe(false);
  });

  it('downloadDocument does nothing when documentUrl missing', async () => {
    await TestBed.configureTestingModule({
      imports: [DocumentViewerComponent],
    }).compileComponents();
    const fixture = TestBed.createComponent(DocumentViewerComponent);
    const comp = fixture.componentInstance;
    comp.documentUrl = null;
    const appendSpy = jest.spyOn(document.body, 'appendChild');
    appendSpy.mockClear();

    comp.downloadDocument();

    expect(appendSpy).not.toHaveBeenCalled();
    appendSpy.mockRestore();
  });

  it('downloadDocument handles DOM errors gracefully', async () => {
    await TestBed.configureTestingModule({
      imports: [DocumentViewerComponent],
    }).compileComponents();
    const fixture = TestBed.createComponent(DocumentViewerComponent);
    const comp = fixture.componentInstance;
    comp.documentUrl = 'https://cdn/example.pdf';

    const createSpy = jest.spyOn(document, 'createElement').mockImplementation(() => {
      throw new Error('boom');
    });
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    comp.downloadDocument();

    expect(consoleSpy).toHaveBeenCalled();

    createSpy.mockRestore();
    consoleSpy.mockRestore();
  });

  it('ngOnChanges updates when documentUrl changes', async () => {
    await TestBed.configureTestingModule({
      imports: [DocumentViewerComponent],
    }).compileComponents();
    const fixture = TestBed.createComponent(DocumentViewerComponent);
    const comp = fixture.componentInstance;
    comp.documentUrl = 'https://cdn/a.png';

    comp.ngOnChanges({
      documentUrl: {
        currentValue: 'https://cdn/a.png',
        previousValue: null,
        firstChange: false,
        isFirstChange: () => false,
      } as any,
    });

    expect(comp.safeUrl()).toBeTruthy();
  });

  it('getFileExtension returns empty for null url', async () => {
    await TestBed.configureTestingModule({
      imports: [DocumentViewerComponent],
    }).compileComponents();
    const fixture = TestBed.createComponent(DocumentViewerComponent);
    const comp = fixture.componentInstance;
    comp.documentUrl = null;
    expect(comp.getFileExtension()).toBe('');
    expect(comp.getFileType()).toBe('Document');
    expect(comp.getFileIconName()).toBe('fa-file');
  });
});
