import { TestBed } from '@angular/core/testing';
import { GoogleDrivePreviewComponent } from './google-drive-preview.component';
import { DomSanitizer } from '@angular/platform-browser';

describe('GoogleDrivePreviewComponent', () => {
  it('renders name and fallback when no webViewLink', async () => {
    await TestBed.configureTestingModule({
      imports: [GoogleDrivePreviewComponent],
    }).compileComponents();
    const fixture = TestBed.createComponent(GoogleDrivePreviewComponent);
    const comp = fixture.componentInstance;
    comp.file = { name: 'doc.txt', size: 123, mimeType: 'text/plain' } as any;
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('doc.txt');
    expect(fixture.nativeElement.textContent).toContain('Preview not available');
  });

  it('sanitizes webViewLink when present', async () => {
    await TestBed.configureTestingModule({
      imports: [GoogleDrivePreviewComponent],
    }).compileComponents();
    const fixture = TestBed.createComponent(GoogleDrivePreviewComponent);
    const comp = fixture.componentInstance;
    comp.file = {
      name: 'file.pdf',
      size: 1000,
      mimeType: 'application/pdf',
      webViewLink: 'https://example.com',
    } as any;
    fixture.detectChanges();

    const iframe = fixture.nativeElement.querySelector('iframe');
    expect(iframe).toBeTruthy();
  });

  it('emits onClose when close button clicked', async () => {
    await TestBed.configureTestingModule({
      imports: [GoogleDrivePreviewComponent],
    }).compileComponents();
    const fixture = TestBed.createComponent(GoogleDrivePreviewComponent);
    const comp = fixture.componentInstance;
    comp.file = { name: 'doc', size: 1 } as any;
    fixture.detectChanges();

    const spy = jest.fn();
    comp.onClose.subscribe(spy);
    const btn = fixture.nativeElement.querySelector('button');
    btn.click();
    expect(spy).toHaveBeenCalled();
  });

  it('returns empty sanitizedUrl when webViewLink is not present', async () => {
    await TestBed.configureTestingModule({
      imports: [GoogleDrivePreviewComponent],
    }).compileComponents();
    const fixture = TestBed.createComponent(GoogleDrivePreviewComponent);
    const comp = fixture.componentInstance;
    comp.file = { name: 'no-link', size: 0 } as any;
    fixture.detectChanges();

    expect(comp.sanitizedUrl).toBe('');
  });
});
