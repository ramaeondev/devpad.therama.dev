import { TestBed } from '@angular/core/testing';
import { TermsComponent } from './terms.component';

describe('TermsComponent', () => {
  it('renders', async () => {
    await TestBed.configureTestingModule({
      imports: [TermsComponent, (await import('@angular/router/testing')).RouterTestingModule],
    }).compileComponents();
    const fixture = TestBed.createComponent(TermsComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toBeTruthy();
  });
});
