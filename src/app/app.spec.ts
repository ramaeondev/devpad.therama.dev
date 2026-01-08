import { TestBed } from '@angular/core/testing';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        // Provide minimal mocks to avoid instantiating real clients during unit tests
        { provide: (await import('./core/services/supabase.service')).SupabaseService, useValue: {} },
        { provide: (await import('./core/services/theme.service')).ThemeService, useValue: { initializeTheme: () => {}, setTheme: () => {} } }
      ]
    }).compileComponents();
    // Ensure external templates and styles are resolved for JIT tests
    await (TestBed as any).resolveComponentResources?.();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('renders router outlet', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('router-outlet')).not.toBeNull();
  });
});
