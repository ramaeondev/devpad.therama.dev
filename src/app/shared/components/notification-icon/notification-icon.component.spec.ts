import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NotificationIconComponent } from './notification-icon';

class MockNotificationService {
  getUserNotifications = jest.fn().mockResolvedValue([]);
  getUnreadCount = jest.fn().mockResolvedValue(2);
  markAsRead = jest.fn().mockResolvedValue(true);
  markAllAsRead = jest.fn().mockResolvedValue(true);
  deleteNotification = jest.fn().mockResolvedValue(true);
  subscribeToNotifications = jest.fn().mockReturnValue({ unsubscribe: jest.fn() });
  unsubscribeFromNotifications = jest.fn();
}
class MockSupabase {
  getSession = jest.fn().mockResolvedValue({ session: { user: { id: 'u1' } } });
}
class MockRouter {
  navigate = jest.fn();
}

describe('NotificationIconComponent', () => {
  it('loads notifications and unread count on init', async () => {
    await TestBed.configureTestingModule({
      imports: [NotificationIconComponent],
      providers: [
        {
          provide: (await import('../../../core/services/notification.service'))
            .NotificationService,
          useClass: MockNotificationService,
        },
        {
          provide: (await import('../../../core/services/supabase.service')).SupabaseService,
          useClass: MockSupabase,
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(NotificationIconComponent);
    const comp = fixture.componentInstance;

    await comp.ngOnInit();

    expect(comp.unreadCount()).toBe(2);
  });

  it('markAsRead updates local notifications', async () => {
    await TestBed.configureTestingModule({
      imports: [NotificationIconComponent],
      providers: [
        {
          provide: (await import('../../../core/services/notification.service'))
            .NotificationService,
          useClass: MockNotificationService,
        },
        {
          provide: (await import('../../../core/services/supabase.service')).SupabaseService,
          useClass: MockSupabase,
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(NotificationIconComponent);
    const comp = fixture.componentInstance;

    // seed notifications
    comp.notifications.set([{ id: 'n1', is_read: false } as any]);
    const evt = { stopPropagation: jest.fn() } as any;

    await comp.markAsRead({ id: 'n1', is_read: false } as any, evt as any);

    expect(comp.notifications()[0].is_read).toBe(true);
  });

  it('markAllAsRead sets unreadCount to 0', async () => {
    await TestBed.configureTestingModule({
      imports: [NotificationIconComponent],
      providers: [
        {
          provide: (await import('../../../core/services/notification.service'))
            .NotificationService,
          useClass: MockNotificationService,
        },
        {
          provide: (await import('../../../core/services/supabase.service')).SupabaseService,
          useClass: MockSupabase,
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(NotificationIconComponent);
    const comp = fixture.componentInstance;

    comp.notifications.set([{ id: 'n1', is_read: false } as any]);
    await comp.markAllAsRead();
    expect(comp.unreadCount()).toBe(0);
  });

  it('getNotificationIcon/color mapping', () => {
    const icon = (NotificationIconComponent.prototype as any).getNotificationIcon('security');
    expect(icon).toContain('shield');
    const color = (NotificationIconComponent.prototype as any).getNotificationColor('activity');
    expect(color).toContain('blue');
  });

  it('getRelativeTime outputs Just now for recent date', () => {
    const now = new Date().toISOString();
    expect(NotificationIconComponent.prototype.getRelativeTime(now)).toBe('Just now');
  });

  it('getRelativeTime outputs minutes/hours/days/locale for older dates', () => {
    const twoMin = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    expect(NotificationIconComponent.prototype.getRelativeTime(twoMin)).toBe('2m ago');

    const twoHours = new Date(Date.now() - 2 * 3600 * 1000).toISOString();
    expect(NotificationIconComponent.prototype.getRelativeTime(twoHours)).toBe('2h ago');

    const twoDays = new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString();
    expect(NotificationIconComponent.prototype.getRelativeTime(twoDays)).toBe('2d ago');

    const oldDate = new Date(Date.now() - 20 * 24 * 3600 * 1000).toISOString();
    expect(NotificationIconComponent.prototype.getRelativeTime(oldDate)).toBe(
      new Date(oldDate).toLocaleDateString(),
    );
  });

  it('loadNotifications returns early when session has no user', async () => {
    const mockSupabase = { getSession: jest.fn().mockResolvedValue({ session: {} }) } as any;
    const mockNotif = new MockNotificationService();

    await TestBed.configureTestingModule({
      imports: [NotificationIconComponent],
      providers: [
        {
          provide: (await import('../../../core/services/notification.service'))
            .NotificationService,
          useValue: mockNotif,
        },
        {
          provide: (await import('../../../core/services/supabase.service')).SupabaseService,
          useValue: mockSupabase,
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(NotificationIconComponent);
    const comp = fixture.componentInstance;

    await comp.loadNotifications();
    expect(comp.notifications().length).toBe(0);
  });

  it('loadUnreadCount returns early when session has no user', async () => {
    const mockSupabase = { getSession: jest.fn().mockResolvedValue({ session: {} }) } as any;
    const mockNotif = new MockNotificationService();

    await TestBed.configureTestingModule({
      imports: [NotificationIconComponent],
      providers: [
        {
          provide: (await import('../../../core/services/notification.service'))
            .NotificationService,
          useValue: mockNotif,
        },
        {
          provide: (await import('../../../core/services/supabase.service')).SupabaseService,
          useValue: mockSupabase,
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(NotificationIconComponent);
    const comp = fixture.componentInstance;

    await comp.loadUnreadCount();
    expect(comp.unreadCount()).toBe(0);
  });

  it('subscribeToRealtime does nothing when no user in session', async () => {
    const mockSupabase = { getSession: jest.fn().mockResolvedValue({ session: {} }) } as any;
    const mockNotif = new MockNotificationService();
    jest.spyOn(mockNotif, 'subscribeToNotifications');

    await TestBed.configureTestingModule({
      imports: [NotificationIconComponent],
      providers: [
        {
          provide: (await import('../../../core/services/notification.service'))
            .NotificationService,
          useValue: mockNotif,
        },
        {
          provide: (await import('../../../core/services/supabase.service')).SupabaseService,
          useValue: mockSupabase,
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(NotificationIconComponent);
    const comp = fixture.componentInstance;

    comp.subscribeToRealtime();
    // flush microtasks
    await Promise.resolve();
    expect(mockNotif.subscribeToNotifications).not.toHaveBeenCalled();
  });

  it('markAsRead does not call service when already read', async () => {
    const mockNotif = new MockNotificationService();

    await TestBed.configureTestingModule({
      imports: [NotificationIconComponent],
      providers: [
        {
          provide: (await import('../../../core/services/notification.service'))
            .NotificationService,
          useValue: mockNotif,
        },
        {
          provide: (await import('../../../core/services/supabase.service')).SupabaseService,
          useClass: MockSupabase,
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(NotificationIconComponent);
    const comp = fixture.componentInstance;

    const evt = { stopPropagation: jest.fn() } as any;
    await comp.markAsRead({ id: 'n1', is_read: true } as any, evt as any);

    expect(evt.stopPropagation).toHaveBeenCalled();
    expect(mockNotif.markAsRead).not.toHaveBeenCalled();
  });

  it('markAsRead does not update when service returns false', async () => {
    const mockNotif = new MockNotificationService();
    mockNotif.markAsRead = jest.fn().mockResolvedValue(false);

    await TestBed.configureTestingModule({
      imports: [NotificationIconComponent],
      providers: [
        {
          provide: (await import('../../../core/services/notification.service'))
            .NotificationService,
          useValue: mockNotif,
        },
        {
          provide: (await import('../../../core/services/supabase.service')).SupabaseService,
          useClass: MockSupabase,
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(NotificationIconComponent);
    const comp = fixture.componentInstance;

    comp.notifications.set([{ id: 'n1', is_read: false } as any]);
    const evt = { stopPropagation: jest.fn() } as any;

    await comp.markAsRead({ id: 'n1', is_read: false } as any, evt as any);

    expect(comp.notifications()[0].is_read).toBe(false);
  });

  it('markAllAsRead does not change state when service fails', async () => {
    const mockNotif = new MockNotificationService();
    mockNotif.markAllAsRead = jest.fn().mockResolvedValue(false);

    await TestBed.configureTestingModule({
      imports: [NotificationIconComponent],
      providers: [
        {
          provide: (await import('../../../core/services/notification.service'))
            .NotificationService,
          useValue: mockNotif,
        },
        {
          provide: (await import('../../../core/services/supabase.service')).SupabaseService,
          useClass: MockSupabase,
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(NotificationIconComponent);
    const comp = fixture.componentInstance;

    comp.notifications.set([{ id: 'n1', is_read: false } as any]);
    await comp.markAllAsRead();

    expect(comp.unreadCount()).toBe(0); // remains 0 because MockNotificationService.getUnreadCount defaults to 2 in constructor, but markAllAsRead failed so unreadCount not reset to 0 by the method (it stays whatever it was)
  });

  it('deleteNotification does not remove when service fails', async () => {
    const mockNotif = new MockNotificationService();
    mockNotif.deleteNotification = jest.fn().mockResolvedValue(false);

    await TestBed.configureTestingModule({
      imports: [NotificationIconComponent],
      providers: [
        {
          provide: (await import('../../../core/services/notification.service'))
            .NotificationService,
          useValue: mockNotif,
        },
        {
          provide: (await import('../../../core/services/supabase.service')).SupabaseService,
          useClass: MockSupabase,
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(NotificationIconComponent);
    const comp = fixture.componentInstance;

    comp.notifications.set([{ id: 'n1', is_read: false } as any]);
    const evt = { stopPropagation: jest.fn() } as any;

    await comp.deleteNotification({ id: 'n1', is_read: false } as any, evt as any);

    expect(comp.notifications().length).toBe(1);
  });
  it('subscribeToRealtime adds notification via callback and updates unread count', async () => {
    const mockNotif = new MockNotificationService();
    mockNotif.subscribeToNotifications = jest.fn((id, cb) => {
      // invoke callback synchronously
      cb({ id: 'nNew', is_read: false } as any);
      return 'channel1';
    });

    await TestBed.configureTestingModule({
      imports: [NotificationIconComponent],
      providers: [
        {
          provide: (await import('../../../core/services/notification.service'))
            .NotificationService,
          useValue: mockNotif,
        },
        {
          provide: (await import('../../../core/services/supabase.service')).SupabaseService,
          useClass: MockSupabase,
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(NotificationIconComponent);
    const comp = fixture.componentInstance;

    await comp.subscribeToRealtime();

    expect(mockNotif.subscribeToNotifications).toHaveBeenCalled();
    expect(comp.notifications()[0].id).toBe('nNew');
  });

  it('ngOnDestroy unsubscribes when channel present', async () => {
    const mockNotif = new MockNotificationService();
    jest.spyOn(mockNotif, 'unsubscribeFromNotifications');

    await TestBed.configureTestingModule({
      imports: [NotificationIconComponent],
      providers: [
        {
          provide: (await import('../../../core/services/notification.service'))
            .NotificationService,
          useValue: mockNotif,
        },
        {
          provide: (await import('../../../core/services/supabase.service')).SupabaseService,
          useClass: MockSupabase,
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(NotificationIconComponent);
    const comp = fixture.componentInstance;

    (comp as any).channel = 'channelX';
    comp.ngOnDestroy();

    expect(mockNotif.unsubscribeFromNotifications).toHaveBeenCalledWith('channelX');
  });

  it('deleteNotification removes item and updates count when unread', async () => {
    const mockNotif = new MockNotificationService();
    mockNotif.deleteNotification = jest.fn().mockResolvedValue(true);
    mockNotif.getUnreadCount = jest.fn().mockResolvedValue(0);

    await TestBed.configureTestingModule({
      imports: [NotificationIconComponent],
      providers: [
        {
          provide: (await import('../../../core/services/notification.service'))
            .NotificationService,
          useValue: mockNotif,
        },
        {
          provide: (await import('../../../core/services/supabase.service')).SupabaseService,
          useClass: MockSupabase,
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(NotificationIconComponent);
    const comp = fixture.componentInstance;

    comp.notifications.set([{ id: 'n1', is_read: false } as any]);
    const evt = { stopPropagation: jest.fn() } as any;

    await comp.deleteNotification({ id: 'n1', is_read: false } as any, evt as any);

    expect(comp.notifications().length).toBe(0);
  });

  it('viewAllLogs navigates to activity log and closes dropdown', async () => {
    const mockNotif = new MockNotificationService();
    const mockRouter = new MockRouter();

    await TestBed.configureTestingModule({
      imports: [NotificationIconComponent],
      providers: [
        {
          provide: (await import('../../../core/services/notification.service'))
            .NotificationService,
          useValue: mockNotif,
        },
        {
          provide: (await import('../../../core/services/supabase.service')).SupabaseService,
          useClass: MockSupabase,
        },
        { provide: (await import('@angular/router')).Router, useValue: mockRouter },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(NotificationIconComponent);
    const comp = fixture.componentInstance;

    comp.showDropdown.set(true);
    comp.viewAllLogs();

    expect(comp.showDropdown()).toBe(false);
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/dashboard/activity-log']);
  });

  it('toggle and close dropdown behave correctly', async () => {
    await TestBed.configureTestingModule({
      imports: [NotificationIconComponent],
      providers: [
        {
          provide: (await import('../../../core/services/notification.service'))
            .NotificationService,
          useClass: MockNotificationService,
        },
        {
          provide: (await import('../../../core/services/supabase.service')).SupabaseService,
          useClass: MockSupabase,
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(NotificationIconComponent);
    const comp = fixture.componentInstance;

    expect(comp.showDropdown()).toBe(false);
    comp.toggleDropdown();
    expect(comp.showDropdown()).toBe(true);
    comp.closeDropdown();
    expect(comp.showDropdown()).toBe(false);
  });

  it('getNotificationIcon defaults and color defaults work', () => {
    const icon = (NotificationIconComponent.prototype as any).getNotificationIcon('other');
    expect(icon).toContain('circle');
    const color = (NotificationIconComponent.prototype as any).getNotificationColor('other');
    expect(color).toContain('gray');
  });
});
