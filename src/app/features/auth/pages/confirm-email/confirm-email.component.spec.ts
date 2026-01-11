import { TestBed } from '@angular/core/testing';
import { ConfirmEmailComponent } from './confirm-email.component';
import { RouterTestingModule } from '@angular/router/testing';

describe('ConfirmEmailComponent', () => {
  it('displays provided email', async () => {
    await TestBed.configureTestingModule({
      imports: [ConfirmEmailComponent, RouterTestingModule],
    }).compileComponents();
    const fixture = TestBed.createComponent(ConfirmEmailComponent);
    const comp = fixture.componentInstance;
    fixture.detectChanges();
    // Set the signal after init to avoid being overwritten by route subscription
    comp.email.set('test@example.com');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('test@example.com');
  });
});
