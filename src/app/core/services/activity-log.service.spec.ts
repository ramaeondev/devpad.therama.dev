import { TestBed } from '@angular/core/testing';
import { ActivityLogService } from './activity-log.service';
import { SupabaseService } from './supabase.service';
import { DeviceFingerprintService } from './device-fingerprint.service';
import { ActivityAction, ActivityResource } from '../models/activity-log.model';

const makeSupabaseMock = () => ({
  from: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  single: jest.fn().mockResolvedValue({ data: { id: 'a1' }, error: null }),
  in: jest.fn().mockReturnThis(),
  or: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  gte: jest.fn().mockReturnThis(),
  lte: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  range: jest.fn().mockReturnThis(),
});

const makeDeviceMock = () => ({
  getDeviceInfo: jest.fn().mockResolvedValue({
    fingerprint_id: 'f1',
    device_name: 'Mac',
    device_type: 'desktop',
    browser_name: 'Chrome',
    browser_version: 'v',
    os_name: 'macOS',
    os_version: '13'
  })
});

describe('ActivityLogService', () => {
  let service: ActivityLogService;
  let mockSupabase: any;
  let mockDevice: any;

  beforeEach(() => {
    mockSupabase = makeSupabaseMock();
    mockDevice = makeDeviceMock();

    TestBed.configureTestingModule({ providers: [ActivityLogService, { provide: SupabaseService, useValue: mockSupabase }, { provide: DeviceFingerprintService, useValue: mockDevice }] });
    service = TestBed.inject(ActivityLogService);
  });

  afterEach(() => jest.restoreAllMocks());

  it('logActivity inserts row and returns data', async () => {
    const res = await service.logActivity('u1', { action_type: ActivityAction.Create, resource_type: ActivityResource.Note, resource_id: 'n1', resource_name: 'N' } as any);
    expect(mockDevice.getDeviceInfo).toHaveBeenCalled();
    expect(mockSupabase.insert).toHaveBeenCalled();
    expect(res).toBeTruthy();
  });

  it('getUserActivityLogs applies filters and returns empty array on error', async () => {
    // when query promise resolves to { data: null, error: { code: 'E' } }
    mockSupabase.order.mockReturnValue(Promise.resolve({ data: null, error: { code: 'E' } }));
    const res = await service.getUserActivityLogs('u1', { action_type: ActivityAction.Create as any });
    expect(res).toEqual([]);
  });

  it('getActivityLogsByResource returns data or empty on error', async () => {
    mockSupabase.order.mockReturnValue(Promise.resolve({ data: [{ id: 'a1' }], error: null }));
    const res = await service.getActivityLogsByResource(ActivityResource.Note, 'n1');
    expect(res.length).toBe(1);

    mockSupabase.order.mockReturnValue(Promise.resolve({ data: null, error: { code: 'E' } }));
    const res2 = await service.getActivityLogsByResource(ActivityResource.Note, 'n1');
    expect(res2).toEqual([]);
  });

  it('getActivityLogCount returns count or 0 on error', async () => {
    // getActivityLogCount awaits the query (which is the result of .or(...))
    mockSupabase.or.mockReturnValue(Promise.resolve({ count: 5, error: null }));
    const res = await service.getActivityLogCount('u1');
    expect(res).toBe(5);

    mockSupabase.or.mockReturnValue(Promise.resolve({ count: null, error: { code: 'E' } }));
    const res2 = await service.getActivityLogCount('u1');
    expect(res2).toBe(0);
  });

  it('logActivity returns null when device info fails', async () => {
    mockDevice.getDeviceInfo.mockRejectedValue(new Error('fp fail'));
    const res = await service.logActivity('u1', { action_type: ActivityAction.Create, resource_type: ActivityResource.Note } as any);
    expect(res).toBeNull();
  });

  it('logActivity returns null when insert returns error and supports undefined userId (anonymous)', async () => {
    mockSupabase.single.mockResolvedValueOnce({ data: null, error: { code: 'E' } });
    const res = await service.logActivity(undefined as any, { action_type: ActivityAction.Create, resource_type: ActivityResource.Note } as any);
    expect(res).toBeNull();
  });

  it('logContentAction, logShareAction, logAuthAction call logActivity', async () => {
    const spy = jest.spyOn(service as any, 'logActivity').mockResolvedValue({ id: 'a3' } as any);
    await service.logContentAction('u1', ActivityAction.Create, ActivityResource.Note, 'n1', 'N');
    expect(spy).toHaveBeenCalled();

    await service.logShareAction('u1', ActivityAction.ShareCreate, 's1', 'S');
    expect(spy).toHaveBeenCalled();

    await service.logAuthAction('u1', ActivityAction.Login);
    expect(spy).toHaveBeenCalled();
  });

  it('getUserActivityLogs returns data with filters and handles thrown exception', async () => {
    mockSupabase.order.mockReturnValue(Promise.resolve({ data: [{ id: 'a2' }], error: null }));
    const res = await service.getUserActivityLogs('u1', { action_type: [ActivityAction.Create], resource_type: ActivityResource.Note as any, category: undefined });
    expect(res.length).toBe(1);
    expect(mockSupabase.in).toHaveBeenCalled();

    // thrown exception returns []
    mockSupabase.from = jest.fn().mockImplementation(() => { throw new Error('boom'); });
    const res2 = await service.getUserActivityLogs('u1');
    expect(res2).toEqual([]);
  });

  it('getActivityLogsByResource handles thrown exception', async () => {
    mockSupabase.from = jest.fn().mockImplementation(() => { throw new Error('boom'); });
    const res = await service.getActivityLogsByResource(ActivityResource.Note, 'n1');
    expect(res).toEqual([]);
  });

  it('getActivityLogCount handles rejected promise', async () => {
    mockSupabase.or.mockReturnValue(Promise.reject(new Error('boom')));
    const res = await service.getActivityLogCount('u1');
    expect(res).toBe(0);
  });

  it('logActivity infers categories correctly and logs with inferred category', async () => {
    jest.clearAllMocks();
    await service.logActivity('u1', { action_type: ActivityAction.Login, resource_type: ActivityResource.Auth } as any);
    expect(mockSupabase.insert).toHaveBeenCalledWith(expect.objectContaining({ category: expect.any(String) }));
    expect(mockSupabase.insert.mock.calls[0][0].category).toBeDefined();

    jest.clearAllMocks();
    await service.logActivity('u1', { action_type: ActivityAction.Create, resource_type: ActivityResource.Note } as any);
    expect(mockSupabase.insert).toHaveBeenCalledWith(expect.objectContaining({ category: expect.any(String) }));
    expect(mockSupabase.insert.mock.calls[0][0].category).toBe('content');

    jest.clearAllMocks();
    await service.logActivity('u1', { action_type: ActivityAction.ShareCreate, resource_type: ActivityResource.PublicShare } as any);
    expect(mockSupabase.insert).toHaveBeenCalledWith(expect.objectContaining({ category: 'access' }));

    jest.clearAllMocks();
    // Unknown action should fallback to system
    await service.logActivity('u1', { action_type: 'unknown' as any, resource_type: ActivityResource.Note } as any);
    expect(mockSupabase.insert).toHaveBeenCalledWith(expect.objectContaining({ category: 'system' }));
  });

  it('logActivity marks anonymous when userId undefined', async () => {
    jest.clearAllMocks();
    await service.logActivity(undefined as any, { action_type: ActivityAction.Create, resource_type: ActivityResource.Note } as any);
    expect(mockSupabase.insert).toHaveBeenCalledWith(expect.objectContaining({ is_anonymous: true, user_id: null }));
  });

  it('getUserActivityLogs applies complex filters and pagination', async () => {
    const filters = {
      resource_type: [ActivityResource.Note],
      category: ["content" as any],
      start_date: '2020-01-01',
      end_date: '2020-12-31',
      device_fingerprint: 'fp-1',
      limit: 5,
      offset: 10
    } as any;

    mockSupabase.order.mockReturnValue(Promise.resolve({ data: [{ id: 'a5' }], error: null }));

    const res = await service.getUserActivityLogs('u1', filters);
    expect(res.length).toBe(1);
    expect(mockSupabase.in).toHaveBeenCalled();
    expect(mockSupabase.gte).toHaveBeenCalledWith('created_at', '2020-01-01');
    expect(mockSupabase.lte).toHaveBeenCalledWith('created_at', '2020-12-31');
    expect(mockSupabase.eq).toHaveBeenCalledWith('device_fingerprint', 'fp-1');
    expect(mockSupabase.limit).toHaveBeenCalledWith(5);
    expect(mockSupabase.range).toHaveBeenCalledWith(10, 14);
  });

  it('getActivityLogCount applies filters and returns count', async () => {
    const filters = { action_type: [ActivityAction.Create], resource_type: ActivityResource.Note, start_date: '2021-01-01', end_date: '2021-02-01' } as any;
    // construct a chain object that supports further chaining and is awaited to the result
    const chain: any = {
      in: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      then: (resolve: any) => resolve({ count: 7, error: null })
    };
    // first in call returns the chain
    mockSupabase.in.mockReturnValue(chain);

    const count = await service.getActivityLogCount('u1', filters);
    expect(count).toBe(7);
    // initial in call (action_type) happened on the supabase mock
    expect(mockSupabase.in).toHaveBeenCalledWith('action_type', [ActivityAction.Create]);
    // subsequent chain.in called for resource_type
    expect(chain.in).toHaveBeenCalledWith('resource_type', [ActivityResource.Note]);
    expect(chain.gte).toHaveBeenCalledWith('created_at', '2021-01-01');
    expect(chain.lte).toHaveBeenCalledWith('created_at', '2021-02-01');
  });

});