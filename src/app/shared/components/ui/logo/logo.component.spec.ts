import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { LogoComponent } from './logo.component';

describe('LogoComponent', () => {
  it('renders label and non-clickable by default', async () => {
    await TestBed.configureTestingModule({
      imports: [LogoComponent, RouterTestingModule],
    }).compileComponents();

    const fixture = TestBed.createComponent(LogoComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.textContent).toContain('DevPad');
    expect(el.querySelector('a')).toBeNull();
  });

  it('renders anchor when isClickable is true', async () => {
    await TestBed.configureTestingModule({
      imports: [LogoComponent, RouterTestingModule],
    }).compileComponents();

    const fixture = TestBed.createComponent(LogoComponent);
    const comp = fixture.componentInstance;
    comp.isClickable = true;
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('a')).not.toBeNull();
  });
});