import { TestBed } from '@angular/core/testing';
import { TermsModalComponent } from './terms-modal.component';

describe('TermsModalComponent', () => {
  it('emits close when close button clicked', async () => {
    await TestBed.configureTestingModule({ imports: [TermsModalComponent] }).compileComponents();
    const fixture = TestBed.createComponent(TermsModalComponent);
    const comp = fixture.componentInstance;
    const spy = jest.fn();
    comp.close.subscribe(spy);
    const btn = fixture.nativeElement.querySelector('button');
    btn.click();
    expect(spy).toHaveBeenCalled();
  });

  it('uses DomSanitizer via trustSrc', async () => {
    await TestBed.configureTestingModule({ imports: [TermsModalComponent] }).compileComponents();
    const sanitizer = TestBed.inject((await import('@angular/platform-browser')).DomSanitizer);
    const spy = jest.spyOn(sanitizer, 'bypassSecurityTrustResourceUrl');
    const fixture = TestBed.createComponent(TermsModalComponent);
    const comp = fixture.componentInstance;
    comp.termsSrc = '/custom-terms';
    comp.ngOnChanges({ termsSrc: { currentValue: '/custom-terms', previousValue: '/terms', firstChange: false, isFirstChange() { return false; } } as any });
    expect(spy).toHaveBeenCalledWith('/custom-terms');
  });
});