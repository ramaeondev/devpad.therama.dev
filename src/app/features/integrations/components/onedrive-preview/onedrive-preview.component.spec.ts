import { TestBed } from '@angular/core/testing';
import { OneDrivePreviewComponent } from './onedrive-preview.component';

describe('OneDrivePreviewComponent', () => {
  it('shows fallback when no webUrl', async () => {
    await TestBed.configureTestingModule({
      imports: [OneDrivePreviewComponent],
    }).compileComponents();
    const fixture = TestBed.createComponent(OneDrivePreviewComponent);
    const comp = fixture.componentInstance;
    comp.file = { name: 'file.txt', size: 10 } as any;
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Preview not available');
  });

  it('embeds when webUrl provided', async () => {
    await TestBed.configureTestingModule({
      imports: [OneDrivePreviewComponent],
    }).compileComponents();
    const fixture = TestBed.createComponent(OneDrivePreviewComponent);
    const comp = fixture.componentInstance;
    comp.file = {
      name: 'file.pdf',
      size: 10,
      webUrl: 'https://onedrive.example.com/view.aspx',
    } as any;
    fixture.detectChanges();
    const iframe = fixture.nativeElement.querySelector('iframe');
    expect(iframe).toBeTruthy();
  });

  it('calls sanitizer with embed url when webUrl contains view.aspx', async () => {
    await TestBed.configureTestingModule({
      imports: [OneDrivePreviewComponent],
    }).compileComponents();
    // spy on the real DomSanitizer to avoid throwing when Angular binds the value
    const sanitizer = TestBed.inject((await import('@angular/platform-browser')).DomSanitizer);
    const spy = jest.spyOn(sanitizer, 'bypassSecurityTrustResourceUrl');

    const fixture = TestBed.createComponent(OneDrivePreviewComponent);
    const comp = fixture.componentInstance;
    comp.file = {
      name: 'file.docx',
      size: 1,
      webUrl: 'https://onedrive.example.com/path/view.aspx?id=123',
    } as any;

    // trigger the getter without forcing template iframe binding
    const _ = comp.sanitizedUrl;

    const expected = 'https://onedrive.example.com/path/embed?id=123';
    expect(spy).toHaveBeenCalledWith(expected);
  });

  it('emits onClose when close button clicked', async () => {
    await TestBed.configureTestingModule({
      imports: [OneDrivePreviewComponent],
    }).compileComponents();
    const fixture = TestBed.createComponent(OneDrivePreviewComponent);
    const comp = fixture.componentInstance;
    comp.file = { name: 'file.txt', size: 1 } as any;
    fixture.detectChanges();

    const spy = jest.fn();
    comp.onClose.subscribe(spy);
    const btn = fixture.nativeElement.querySelector('button');
    btn.click();
    expect(spy).toHaveBeenCalled();
  });
});
