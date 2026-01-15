import { TestBed } from '@angular/core/testing';
import { AppComponent } from './app';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        // Provide minimal mocks to avoid instantiating real clients during unit tests
        { provide: (await import('./core/services/supabase.service')).SupabaseService, useValue: {} },
        { provide: (await import('./core/services/theme.service')).ThemeService, useValue: { initializeTheme: () => {}, setTheme: () => {} } }
      ]
    }).compileComponents();
    // Ensure external templates and styles are resolved for JIT tests
    const resolver = (TestBed as unknown as { resolveComponentResources?: () => Promise<void> }).resolveComponentResources;
    await resolver?.();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('renders router outlet', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('router-outlet')).not.toBeNull();
  });
});
