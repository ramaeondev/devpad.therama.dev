import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme.service';

class MockAuth {
  user = jest.fn();
  userId = jest.fn().mockReturnValue(null);
}

class MockSupabase {
  auth = { updateUser: jest.fn().mockResolvedValue({}) } as any;
}

describe('ThemeService', () => {
  let svc: ThemeService;
  let mockAuth: MockAuth;
  let mockSupabase: MockSupabase;

  beforeEach(async () => {
    mockAuth = new MockAuth();
    mockSupabase = new MockSupabase();

    // Reset storage and document class
    localStorage.removeItem('theme');
    document.documentElement.classList.remove('dark');

    await TestBed.configureTestingModule({ providers: [ { provide: (await import('./auth-state.service')).AuthStateService, useValue: mockAuth }, { provide: (await import('./supabase.service')).SupabaseService, useValue: mockSupabase } ] }).compileComponents();

    svc = TestBed.inject(ThemeService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    try { localStorage.removeItem('theme'); } catch {}
    document.documentElement.classList.remove('dark');
  });

  it('initializeTheme uses saved theme from localStorage', () => {
    localStorage.setItem('theme', 'dark');
    svc.initializeTheme();
    expect(svc.theme()).toBe('dark');
  });

  it('initializeTheme falls back to system when no saved', () => {
    localStorage.removeItem('theme');
    svc.initializeTheme();
    expect(svc.theme()).toBe('system');
  });

  it('setTheme persists to localStorage and persists to Supabase when authenticated', async () => {
    mockAuth.userId = jest.fn().mockReturnValue('u1');
    const spy = jest.spyOn(mockSupabase.auth, 'updateUser');

    svc.setTheme('light');
    expect(localStorage.getItem('theme')).toBe('light');

    // Should call updateUser asynchronously
    await Promise.resolve();
    expect(spy).toHaveBeenCalledWith({ data: { theme: 'light' } });
  });

  it('toggleTheme switches between light and dark', () => {
    svc.setTheme('light');
    svc.toggleTheme();
    expect(svc.theme()).toBe('dark');
    svc.toggleTheme();
    expect(svc.theme()).toBe('light');
  });

  it('applyTheme adds or removes dark class based on matchMedia (system)', async () => {
    // mock matchMedia to report prefers dark
    const mm = { matches: true, media: '(prefers-color-scheme: dark)' } as any;
    (window as any).matchMedia = jest.fn().mockReturnValue(mm);

    // Call applyTheme directly to deterministically assert DOM class changes
    (svc as any).applyTheme('system');
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    // simulate prefers light now
    mm.matches = false;
    (svc as any).applyTheme('system');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('applyTheme auto uses night time to decide dark mode', async () => {
    // Ensure matchMedia false so system doesn't set dark
    (window as any).matchMedia = jest.fn().mockReturnValue({ matches: false });

    // Simulate night time by mocking Date.prototype.getHours
    const hoursSpy = jest.spyOn(Date.prototype, 'getHours').mockReturnValue(20);

    (svc as any).applyTheme('auto');
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    // Simulate day time
    hoursSpy.mockReturnValue(10);
    (svc as any).applyTheme('auto');
    expect(document.documentElement.classList.contains('dark')).toBe(false);

    hoursSpy.mockRestore();
  });

  it('constructor effect sets theme to auto when user logs in with no saved theme', async () => {
    // No saved theme
    localStorage.removeItem('theme');

    // Provide a user without metadata
    mockAuth.user = jest.fn().mockReturnValue({ id: 'u2', user_metadata: {} });
    // Recreate TestBed to get new service with updated auth stub
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({ providers: [ { provide: (await import('./auth-state.service')).AuthStateService, useValue: mockAuth }, { provide: (await import('./supabase.service')).SupabaseService, useValue: mockSupabase } ] }).compileComponents();
    const svc2 = TestBed.inject(ThemeService);

    // allow microtask loop for effect to set theme
    await new Promise((r) => setTimeout(r, 0));
    expect(svc2.theme()).toBe('auto');
  });

  it('setTheme tolerates localStorage.setItem throwing and supabase update failing', async () => {
    // throw on setItem
    const orig = localStorage.setItem;
    (localStorage as any).setItem = jest.fn(() => { throw new Error('no storage'); });

    mockAuth.userId = jest.fn().mockReturnValue('uX');
    mockSupabase.auth.updateUser = jest.fn().mockRejectedValue(new Error('fail'));

    expect(() => svc.setTheme('dark')).not.toThrow();

    // restore
    (localStorage as any).setItem = orig;
  });
});
