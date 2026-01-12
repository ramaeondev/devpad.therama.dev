import { TestBed } from '@angular/core/testing';
import { PrivacyComponent } from './privacy.component';

describe('PrivacyComponent', () => {
  it('renders', async () => {
    await TestBed.configureTestingModule({ imports: [PrivacyComponent, (await import('@angular/router/testing')).RouterTestingModule] }).compileComponents();
    const fixture = TestBed.createComponent(PrivacyComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toBeTruthy();
  });
});