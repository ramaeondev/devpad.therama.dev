import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DocumentViewerComponent } from './document-viewer';

describe('DocumentViewerComponent', () => {
  let component: DocumentViewerComponent;
  let fixture: ComponentFixture<DocumentViewerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DocumentViewerComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DocumentViewerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should handle PDF URLs', () => {
    component.documentUrl = 'https://example.com/document.pdf';
    component.title = 'Test PDF';
    component.ngOnChanges({
      documentUrl: {
        currentValue: 'https://example.com/document.pdf',
        previousValue: null,
        firstChange: true,
        isFirstChange: () => true,
      },
    });
    expect(component.canPreviewInIframe()).toBeTruthy();
    expect(component.getFileType()).toBe('PDF');
  });

  it('should handle image URLs', () => {
    component.documentUrl = 'https://example.com/image.jpg';
    component.ngOnChanges({
      documentUrl: {
        currentValue: 'https://example.com/image.jpg',
        previousValue: null,
        firstChange: true,
        isFirstChange: () => true,
      },
    });
    expect(component.isImage()).toBeTruthy();
    expect(component.getFileType()).toBe('Image');
  });

  it('sanitizes and sets safeUrl for iframe preview', async () => {
    // spy on real DomSanitizer
    const fixture2 = TestBed.createComponent(DocumentViewerComponent);
    const comp2 = fixture2.componentInstance;
    const sanitizer = TestBed.inject((await import('@angular/platform-browser')).DomSanitizer as any);
    const spy = jest.spyOn(sanitizer, 'bypassSecurityTrustResourceUrl');

    comp2.documentUrl = 'https://example.com/doc.pdf';
    comp2.ngOnChanges({ documentUrl: { currentValue: 'https://example.com/doc.pdf', previousValue: null, firstChange: true, isFirstChange: () => true } });

    expect(spy).toHaveBeenCalledWith('https://example.com/doc.pdf');
    expect(comp2.safeUrl()).toBeTruthy();
  });

  it('handles sanitizer throwing an error gracefully', async () => {
    const fixture2 = TestBed.createComponent(DocumentViewerComponent);
    const comp2 = fixture2.componentInstance;
    const sanitizer = TestBed.inject((await import('@angular/platform-browser')).DomSanitizer as any);
    const original = sanitizer.bypassSecurityTrustResourceUrl;
    jest.spyOn(sanitizer, 'bypassSecurityTrustResourceUrl').mockImplementation(() => { throw new Error('boom'); });
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    comp2.documentUrl = 'https://example.com/doc.pdf';
    comp2.ngOnChanges({ documentUrl: { currentValue: 'https://example.com/doc.pdf', previousValue: null, firstChange: true, isFirstChange: () => true } });

    expect(consoleSpy).toHaveBeenCalled();
    expect(comp2.safeUrl()).toBeNull();

    // restore
    (sanitizer.bypassSecurityTrustResourceUrl as any).mockRestore?.();
    consoleSpy.mockRestore();
  });

  it('downloadDocument appends, clicks and removes link', () => {
    const fixture2 = TestBed.createComponent(DocumentViewerComponent);
    const comp2 = fixture2.componentInstance;
    comp2.documentUrl = 'https://example.com/file.txt';
    comp2.title = 'MyFile';

    // spy on document body append/remove and on click. Use mockImplementation to avoid jsdom Node type checks
    const appendSpy = jest.spyOn(document.body, 'appendChild').mockImplementation(() => {});
    const removeSpy = jest.spyOn(document.body, 'removeChild').mockImplementation(() => {});
    const origCreate = document.createElement.bind(document);

    const fakeAnchor: any = {
      href: '',
      download: '',
      target: '',
      click: jest.fn(),
    };
    jest.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'a') return fakeAnchor as any;
      return origCreate(tag) as any;
    });

    comp2.downloadDocument();

    expect(appendSpy).toHaveBeenCalled();
    expect(fakeAnchor.click).toHaveBeenCalled();
    expect(removeSpy).toHaveBeenCalled();

    // restore
    appendSpy.mockRestore();
    removeSpy.mockRestore();
    (document.createElement as any).mockRestore();
  });

  it('recognizes embeddable sources like google drive and txt', () => {
    component.documentUrl = 'https://drive.google.com/file/d/123';
    expect(component.canPreviewInIframe()).toBeTruthy();

    component.documentUrl = 'https://example.com/file.txt';
    expect(component.canPreviewInIframe()).toBeTruthy();
  });
});
