import { TestBed } from '@angular/core/testing';
import { ResetPasswordComponent } from './reset-password.component';

describe('ResetPasswordComponent', () => {
  it('shows a heading and link', async () => {
    await TestBed.configureTestingModule({
      imports: [
        ResetPasswordComponent,
        (await import('@angular/router/testing')).RouterTestingModule,
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(ResetPasswordComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('h2').textContent).toContain('Reset Password');
    expect(fixture.nativeElement.querySelector('a[routerlink]')).toBeTruthy();
  });
});
