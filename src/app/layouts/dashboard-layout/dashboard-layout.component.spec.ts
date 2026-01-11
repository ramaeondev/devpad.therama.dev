import { TestBed } from '@angular/core/testing';
import { DashboardLayoutComponent } from './dashboard-layout.component';
import { RouterTestingModule } from '@angular/router/testing';

class MockAuth {
  userId() {
    return 'u1';
  }
  userEmail() {
    return 'e@example.com';
  }
  clear() {}
}
class MockUserService {
  async getUserProfile() {
    return { first_name: 'Sam', last_name: 'Lee', avatar_url: null };
  }
}
class MockLoading {
  withLoading(fn: any) {
    return fn();
  }
  isLoading() {
    return false;
  }
}

describe('DashboardLayoutComponent', () => {
  async function setup(overrides: any[] = []) {
    const providers = [
      {
        provide: (await import('../../core/services/auth-state.service')).AuthStateService,
        useClass: MockAuth,
      },
      {
        provide: (await import('../../core/services/user.service')).UserService,
        useClass: MockUserService,
      },
      {
        provide: (await import('../../core/services/loading.service')).LoadingService,
        useClass: MockLoading,
      },
      {
        provide: (await import('../../core/services/google-drive.service')).GoogleDriveService,
        useValue: { isConnected: () => false, checkConnection: async () => false },
      },
      {
        provide: (await import('../../core/services/onedrive.service')).OneDriveService,
        useValue: { isConnected: () => false, checkConnection: async () => false },
      },
      {
        provide: (await import('../../core/services/supabase.service')).SupabaseService,
        useValue: {
          getSession: async () => ({ session: { user: { id: 'u1' } } }),
          getUser: async () => null,
        },
      },
      {
        provide: (await import('../../features/folders/services/folder.service')).FolderService,
        useValue: { getFolderTree: async () => [] },
      },
      // allow overrides
      ...overrides,
    ];

    // Prevent NotificationIconComponent from running its ngOnInit during layout tests (it hits Supabase.getSession)
    const NotificationIcon = (
      await import('../../shared/components/notification-icon/notification-icon')
    ).NotificationIconComponent;
    jest.spyOn(NotificationIcon.prototype, 'ngOnInit').mockImplementation(() => {});
    jest.spyOn(NotificationIcon.prototype, 'ngOnDestroy').mockImplementation(() => {});

    await TestBed.configureTestingModule({
      imports: [DashboardLayoutComponent, RouterTestingModule],
      providers,
    }).compileComponents();

    const fixture = TestBed.createComponent(DashboardLayoutComponent);
    fixture.detectChanges();

    // Wait for async effects like profile load
    await new Promise((r) => setTimeout(r, 0));
    fixture.detectChanges();

    return { fixture, comp: fixture.componentInstance };
  }

  it('computes initials from profile and toggles mobile sidebar', async () => {
    const { comp } = await setup();
    expect(comp.initials()).toBe('SL');

    expect(comp.showMobileSidebar()).toBe(false);
    comp.toggleMobileSidebar();
    expect(comp.showMobileSidebar()).toBe(true);
    comp.closeMobileSidebar();
    expect(comp.showMobileSidebar()).toBe(false);
  });

  it('reacts to router navigation and sets activity log page flag', async () => {
    const { comp, fixture } = await setup();
    const router = TestBed.inject((await import('@angular/router')).Router as any);
    const { NavigationEnd } = await import('@angular/router');

    // simulate NavigationEnd event to activity log
    (router.events as any).next(new NavigationEnd(1, '/activity-log', '/activity-log'));
    await new Promise((r) => setTimeout(r, 0));
    fixture.detectChanges();
    expect(comp.isActivityLogPage()).toBe(true);

    // simulate navigating away
    (router.events as any).next(new NavigationEnd(2, '/dashboard', '/dashboard'));
    await new Promise((r) => setTimeout(r, 0));
    fixture.detectChanges();
    expect(comp.isActivityLogPage()).toBe(false);
  });

  it('openSettings closes mobile sidebar and hides dropdown', async () => {
    const { comp } = await setup();
    comp.showMobileSidebar.set(true);
    comp.showDropdown.set(true);

    comp.openSettings();

    expect(comp.showSettings()).toBe(true);
    expect(comp.showMobileSidebar()).toBe(false);
    expect(comp.showDropdown()).toBe(false);
  });

  it('onResize hides mobile sidebar when width >= lg', async () => {
    const { comp } = await setup();
    comp.showMobileSidebar.set(true);
    // simulate large screen
    const orig = (window as any).innerWidth;
    (window as any).innerWidth = 1200;

    comp.onResize();

    expect(comp.showMobileSidebar()).toBe(false);

    (window as any).innerWidth = orig;
  });

  it('onDocumentClick closes dropdown when clicking outside and keeps it open when clicking inside', async () => {
    const { comp } = await setup();

    // case: clicking outside should close
    comp.showDropdown.set(true);
    const outside = document.createElement('div');
    document.body.appendChild(outside);

    comp.onDocumentClick(new MouseEvent('click', { bubbles: true, cancelable: true }));
    expect(comp.showDropdown()).toBe(false);

    // case: clicking inside dropdown content should NOT close
    comp.showDropdown.set(true);
    const content = document.createElement('div');
    content.setAttribute('data-dropdown-content', 'true');
    document.body.appendChild(content);
    // Simulate click event whose target is the dropdown content
    comp.onDocumentClick({ target: content } as any);
    expect(comp.showDropdown()).toBe(true);

    // cleanup
    document.body.removeChild(outside);
    document.body.removeChild(content);
  });

  it('signOut logs activity, signs out, clears auth and navigates', async () => {
    const mockActivity: any = { logActivity: jest.fn().mockResolvedValue({}) };
    const mockSupabase: any = { auth: { signOut: jest.fn().mockResolvedValue({}) } };
    const mockLoading: any = { withLoading: (fn: any) => fn(), isLoading: () => false };
    const mockAuth: any = {
      userId: () => 'u1',
      clear: jest.fn(),
      userEmail: () => 'e@example.com',
    };

    const { comp } = await setup([
      {
        provide: (await import('../../core/services/activity-log.service')).ActivityLogService,
        useValue: mockActivity,
      },
      {
        provide: (await import('../../core/services/supabase.service')).SupabaseService,
        useValue: mockSupabase,
      },
      {
        provide: (await import('../../core/services/loading.service')).LoadingService,
        useValue: mockLoading,
      },
      {
        provide: (await import('../../core/services/auth-state.service')).AuthStateService,
        useValue: mockAuth,
      },
    ]);

    const router = TestBed.inject((await import('@angular/router')).Router as any);
    const navSpy = jest.spyOn(router, 'navigate').mockResolvedValue(true);

    await comp.signOut();

    expect(mockActivity.logActivity).toHaveBeenCalledWith('u1', expect.any(Object));
    expect(mockSupabase.auth.signOut).toHaveBeenCalled();
    expect(mockAuth.clear).toHaveBeenCalled();
    expect(navSpy).toHaveBeenCalledWith(['/auth/signin']);
  });
});
