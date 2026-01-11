import { TestBed } from '@angular/core/testing';
import { TermsModalComponent } from './terms-modal.component';

describe('TermsModalComponent', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('emits close when top close button clicked', async () => {
    await TestBed.configureTestingModule({ imports: [TermsModalComponent] }).compileComponents();
    const fixture = TestBed.createComponent(TermsModalComponent);
    const comp = fixture.componentInstance;
    const spy = jest.fn();
    comp.close.subscribe(spy);

    // top close button is the first button in the template
    const btn = fixture.nativeElement.querySelector('button');
    btn.click();
    expect(spy).toHaveBeenCalled();
  });

  it('emits close when overlay is clicked and when footer close clicked', async () => {
    await TestBed.configureTestingModule({ imports: [TermsModalComponent] }).compileComponents();
    const fixture = TestBed.createComponent(TermsModalComponent);
    const comp = fixture.componentInstance;
    const spy = jest.fn();
    comp.close.subscribe(spy);

    const container = fixture.nativeElement.querySelector('[role="dialog"]');
    // overlay is the first child div inside the dialog container
    const overlay = container.querySelector('div');
    overlay.click();
    expect(spy).toHaveBeenCalledTimes(1);

    // footer close button is the last button in the template
    const buttons = fixture.nativeElement.querySelectorAll('button');
    const footerBtn = buttons[buttons.length - 1];
    footerBtn.click();
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('renders default and custom title and updates iframe src on termsSrc change', async () => {
    await TestBed.configureTestingModule({ imports: [TermsModalComponent] }).compileComponents();
    const sanitizer = TestBed.inject((await import('@angular/platform-browser')).DomSanitizer);
    const trustedInitial = sanitizer.bypassSecurityTrustResourceUrl('/initial');
    const spy = jest
      .spyOn(sanitizer, 'bypassSecurityTrustResourceUrl')
      .mockReturnValue(trustedInitial as any);

    const fixture = TestBed.createComponent(TermsModalComponent);
    const comp = fixture.componentInstance;
    fixture.detectChanges();

    // default title
    expect(fixture.nativeElement.textContent).toContain('Terms & Conditions');
    expect(comp.safeSrc).toBe(trustedInitial);

    // change title and termsSrc
    comp.title = 'Site Terms';
    const trustedCustom = sanitizer.bypassSecurityTrustResourceUrl('/custom-terms');
    spy.mockReturnValue(trustedCustom as any);
    comp.termsSrc = '/custom-terms';
    comp.ngOnChanges({
      termsSrc: {
        currentValue: '/custom-terms',
        previousValue: '/terms',
        firstChange: false,
        isFirstChange() {
          return false;
        },
      } as any,
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Site Terms');
    // the component safeSrc should have been updated to the trusted value
    expect(comp.safeSrc).toBe(trustedCustom);
  });
});
