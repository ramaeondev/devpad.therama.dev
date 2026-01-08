import { TestBed } from '@angular/core/testing';
import { NotificationService } from './notification.service';
import { SupabaseService } from './supabase.service';

const makeSupabaseMock = () => ({
  from: jest.fn().mockImplementation(() => ({
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
  })),
  realtimeClient: {
    channel: jest.fn().mockReturnThis(),
    on: jest.fn().mockReturnThis(),
    subscribe: jest.fn().mockReturnValue({ id: 'ch1' }),
    removeChannel: jest.fn(),
  }
});

describe('NotificationService', () => {
  let service: NotificationService;
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = makeSupabaseMock();
    TestBed.configureTestingModule({ providers: [NotificationService, { provide: SupabaseService, useValue: mockSupabase }] });
    service = TestBed.inject(NotificationService);
  });

  afterEach(() => jest.restoreAllMocks());

  it('getUserNotifications returns data and handles unreadOnly', async () => {
    const q: any = { data: [{ id: 'n1' }], error: null };
    mockSupabase.from.mockReturnValueOnce({ select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), order: jest.fn().mockReturnThis(), limit: jest.fn().mockReturnValue(Promise.resolve(q)) });

    const res = await service.getUserNotifications('u1');
    expect(res.length).toBe(1);

    // test unreadOnly branch
    mockSupabase.from.mockReturnValueOnce({ select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), order: jest.fn().mockReturnThis(), limit: jest.fn().mockReturnValue(Promise.resolve({ data: [], error: null })) });
    const res2 = await service.getUserNotifications('u1', true);
    expect(res2.length).toBe(0);
  });

  it('getUnreadCount sets signal and returns count', async () => {
    mockSupabase.from.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnValue({ eq: jest.fn().mockReturnValue(Promise.resolve({ count: 3, error: null })) })
    });
    const cnt = await service.getUnreadCount('u1');
    expect(cnt).toBe(3);
    expect(service.unreadCount()).toBe(3);

    mockSupabase.from.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnValue({ eq: jest.fn().mockReturnValue(Promise.resolve({ count: null, error: { code: 'E' } })) })
    });
    const cnt2 = await service.getUnreadCount('u1');
    expect(cnt2).toBe(0);
  });

  it('markAsRead and markAllAsRead handle success and failure', async () => {
    mockSupabase.from.mockReturnValueOnce({ update: jest.fn().mockReturnValue({ eq: jest.fn().mockReturnValue(Promise.resolve({ error: null })) }) });
    const ok = await service.markAsRead('n1');
    expect(ok).toBe(true);

    mockSupabase.from.mockReturnValueOnce({ update: jest.fn().mockReturnValue({ eq: jest.fn().mockReturnValue(Promise.resolve({ error: { code: 'E' } })) }) });
    const ok2 = await service.markAsRead('n1');
    expect(ok2).toBe(false);

    mockSupabase.from.mockReturnValueOnce({ update: jest.fn().mockReturnValue({ eq: jest.fn().mockReturnValue({ eq: jest.fn().mockReturnValue(Promise.resolve({ error: null })) }) }) });
    const allOk = await service.markAllAsRead('u1');
    expect(allOk).toBe(true);
    expect(service.unreadCount()).toBe(0);
  });

  it('deleteNotification returns true/false', async () => {
    mockSupabase.from.mockReturnValueOnce({ delete: jest.fn().mockReturnValue({ eq: jest.fn().mockReturnValue(Promise.resolve({ error: null })) }) });
    const ok = await service.deleteNotification('n1');
    expect(ok).toBe(true);

    mockSupabase.from.mockReturnValueOnce({ delete: jest.fn().mockReturnValue({ eq: jest.fn().mockReturnValue(Promise.resolve({ error: { code: 'E' } })) }) });
    const ok2 = await service.deleteNotification('n1');
    expect(ok2).toBe(false);
  });

  it('createNotification returns data or null on error', async () => {
    mockSupabase.from.mockReturnValueOnce({ insert: jest.fn().mockReturnThis(), select: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: { id: 'n1' }, error: null }) });
    const n = await service.createNotification('u1', { title: 'T', message: 'M', type: 'info' } as any);
    expect(n).toBeTruthy();

    mockSupabase.from.mockReturnValueOnce({ insert: jest.fn().mockReturnThis(), select: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: null, error: { code: 'E' } }) });
    const n2 = await service.createNotification('u1', { title: 'T', message: 'M', type: 'info' } as any);
    expect(n2).toBeNull();
  });

  it('subscribeToNotifications returns channel and unsubscribe removes it', () => {
    const channel = service.subscribeToNotifications('u1', jest.fn());
    expect(channel).toBeTruthy();
    service.unsubscribeFromNotifications(channel);
    expect(mockSupabase.realtimeClient.removeChannel).toHaveBeenCalledWith(channel);
  });

});