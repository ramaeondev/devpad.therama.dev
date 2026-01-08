import { TestBed } from '@angular/core/testing';
import { GlobalSpinnerComponent } from './global-spinner.component';

class MockLoadingService {
  isLoading() { return true; }
}

describe('GlobalSpinnerComponent', () => {
  it('shows spinner when loading', async () => {
    await TestBed.configureTestingModule({
      imports: [GlobalSpinnerComponent],
      providers: [{ provide: (await import('../../../../core/services/loading.service')).LoadingService, useClass: MockLoadingService }]
    }).compileComponents();

    const fixture = TestBed.createComponent(GlobalSpinnerComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Loading');
  });

  it('hides spinner when not loading', async () => {
    class NotLoading { isLoading() { return false; } }
    await TestBed.configureTestingModule({
      imports: [GlobalSpinnerComponent],
      providers: [{ provide: (await import('../../../../core/services/loading.service')).LoadingService, useClass: NotLoading }]
    }).compileComponents();

    const fixture = TestBed.createComponent(GlobalSpinnerComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).not.toContain('Loading');
  });
});