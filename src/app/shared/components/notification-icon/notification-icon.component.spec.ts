import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NotificationIconComponent } from './notification-icon';

class MockNotificationService { getUserNotifications = jest.fn().mockResolvedValue([]); getUnreadCount = jest.fn().mockResolvedValue(2); markAsRead = jest.fn().mockResolvedValue(true); markAllAsRead = jest.fn().mockResolvedValue(true); deleteNotification = jest.fn().mockResolvedValue(true); subscribeToNotifications = jest.fn().mockReturnValue({ unsubscribe: jest.fn() }); unsubscribeFromNotifications = jest.fn(); }
class MockSupabase { getSession = jest.fn().mockResolvedValue({ session: { user: { id: 'u1' } } }); }
class MockRouter { navigate = jest.fn(); }

describe('NotificationIconComponent', () => {
  it('loads notifications and unread count on init', async () => {
    await TestBed.configureTestingModule({ imports: [NotificationIconComponent], providers: [ { provide: (await import('../../../core/services/notification.service')).NotificationService, useClass: MockNotificationService }, { provide: (await import('../../../core/services/supabase.service')).SupabaseService, useClass: MockSupabase } ] }).compileComponents();

    const fixture = TestBed.createComponent(NotificationIconComponent);
    const comp = fixture.componentInstance;

    await comp.ngOnInit();

    expect(comp.unreadCount()).toBe(2);
  });

  it('markAsRead updates local notifications', async () => {
    await TestBed.configureTestingModule({ imports: [NotificationIconComponent], providers: [ { provide: (await import('../../../core/services/notification.service')).NotificationService, useClass: MockNotificationService }, { provide: (await import('../../../core/services/supabase.service')).SupabaseService, useClass: MockSupabase } ] }).compileComponents();

    const fixture = TestBed.createComponent(NotificationIconComponent);
    const comp = fixture.componentInstance;

    // seed notifications
    comp.notifications.set([{ id: 'n1', is_read: false } as any]);
    const evt = { stopPropagation: jest.fn() } as any;

    await comp.markAsRead({ id: 'n1', is_read: false } as any, evt as any);

    expect(comp.notifications()[0].is_read).toBe(true);
  });

  it('markAllAsRead sets unreadCount to 0', async () => {
    await TestBed.configureTestingModule({ imports: [NotificationIconComponent], providers: [ { provide: (await import('../../../core/services/notification.service')).NotificationService, useClass: MockNotificationService }, { provide: (await import('../../../core/services/supabase.service')).SupabaseService, useClass: MockSupabase } ] }).compileComponents();

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
});
