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

});