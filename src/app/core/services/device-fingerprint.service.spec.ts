import { TestBed } from '@angular/core/testing';
import { DeviceFingerprintService } from './device-fingerprint.service';

// Mock FingerprintJS module
jest.mock('@fingerprintjs/fingerprintjs', () => ({
  default: { load: jest.fn() },
}));

describe('DeviceFingerprintService', () => {
  let service: DeviceFingerprintService;
  let fpMod: any;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [DeviceFingerprintService] });
    service = TestBed.inject(DeviceFingerprintService);
    fpMod = require('@fingerprintjs/fingerprintjs').default;

    // Default navigator / screen values for deterministic tests
    (global as any).navigator = Object.assign({}, global.navigator, {
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.0.0 Safari/537.36',
      language: 'en-US',
      platform: 'MacIntel',
    });

    (global as any).window = Object.assign({}, global.window, {
      screen: { width: 1280, height: 720, colorDepth: 24 },
    });
  });

  it('returns visitor id when fingerprinting succeeds', async () => {
    const fakeFp = { get: jest.fn().mockResolvedValue({ visitorId: 'VID123' }) };
    fpMod.load.mockResolvedValue(fakeFp);

    const vid = await service.getDeviceFingerprint();
    expect(vid).toBe('VID123');

    // Cached subsequent call returns same id and does not call load again
    fpMod.load.mockClear();
    const vid2 = await service.getDeviceFingerprint();
    expect(vid2).toBe('VID123');
    expect(fpMod.load).not.toHaveBeenCalled();
  });

  it('generates fallback id when fingerprinting fails', async () => {
    fpMod.load.mockRejectedValue(new Error('fail'));
    const id = await service.getDeviceFingerprint();
    expect(id).toMatch(/^fallback-/);
  });

  it('getDeviceInfo includes expected properties', async () => {
    const fakeFp = { get: jest.fn().mockResolvedValue({ visitorId: 'VIDX' }) };
    fpMod.load.mockResolvedValue(fakeFp);

    // Ensure screen values are set explicitly in jsdom
    Object.defineProperty((global as any).window, 'screen', {
      configurable: true,
      value: { width: 1280, height: 720, colorDepth: 24 },
    });

    const info = await service.getDeviceInfo();
    expect(info.fingerprint_id).toBe('VIDX');
    expect(info.user_agent).toBe((global as any).navigator.userAgent);
    expect(info.additional_data.screen_resolution).toBe('1280x720');
    expect(info.device_type).toBeTruthy();
    expect(info.browser_name).toBeTruthy();
    expect(info.os_name).toBeTruthy();
  });

  it('registerDevice creates a new device when none exists', async () => {
    // Minimal supabase mock that simulates no existing device then successful insert
    const chain: any = {
      _op: null,
      _insertData: null,
      select() { this._op = 'select'; return this; },
      eq() { return this; },
      order() { return this; },
      single: jest.fn().mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } }).mockResolvedValue({ data: { id: 'new' }, error: null }),
      update() { this._op = 'update'; return this; },
      insert(data: any) { this._op = 'insert'; this._insertData = { ...data, id: 'new' }; return this; },
    };

    const supabase = { from: jest.fn(() => chain) } as any;

    // Replace service's supabase instance
    (service as any).supabase = supabase;

    // Ensure fingerprint generation returns fixed id
    const fakeFp = { get: jest.fn().mockResolvedValue({ visitorId: 'F1' }) };
    fpMod.load.mockResolvedValue(fakeFp);

    const res = await service.registerDevice('user1');
    expect(res).toEqual({ id: 'new' });
  });

  it('registerDevice updates an existing device', async () => {
    const existing = { id: 'exists', fingerprint_id: 'F2' };
    const chain: any = {
      select() { return this; },
      eq() { return this; },
      single: jest.fn().mockResolvedValueOnce({ data: existing, error: null }).mockResolvedValue({ data: { id: 'exists', updated: true }, error: null }),
      update() { return this; },
    };
    const supabase = { from: jest.fn(() => chain) } as any;
    (service as any).supabase = supabase;

    const fakeFp = { get: jest.fn().mockResolvedValue({ visitorId: 'F2' }) };
    fpMod.load.mockResolvedValue(fakeFp);

    const res = await service.registerDevice('user1');
    expect(res).toEqual({ id: 'exists', updated: true });
  });

  it('getUserDevices returns [] on error', async () => {
    const chain: any = {
      select() { return this; },
      eq() { return this; },
      order() { return this; },
    };
    const supabase = { from: jest.fn(() => ({ select: () => ({ eq: () => ({ order: () => ({ then: () => { throw new Error('fail') } }) }) }) })) } as any;
    (service as any).supabase = supabase;

    const devices = await service.getUserDevices('u1');
    expect(Array.isArray(devices)).toBe(true);
  });

  it('trustDevice returns true on success and false on error', async () => {
    const chainSuccess: any = { update: () => ({ eq: () => Promise.resolve({ error: null }) }) };
    const supabaseSuccess = { from: jest.fn(() => chainSuccess) } as any;
    (service as any).supabase = supabaseSuccess;
    const ok = await service.trustDevice('d1');
    expect(ok).toBe(true);

    const chainFail: any = { update: () => ({ eq: () => Promise.resolve({ error: { msg: 'err' } }) }) };
    const supabaseFail = { from: jest.fn(() => chainFail) } as any;
    (service as any).supabase = supabaseFail;
    const notOk = await service.trustDevice('d1');
    expect(notOk).toBe(false);
  });

  it('getCurrentDevice returns null on PGRST116 and returns data when available', async () => {
    const chainNone: any = { select() { return this; }, eq() { return this; }, single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }) };
    (service as any).supabase = { from: jest.fn(() => chainNone) } as any;

    // Ensure fingerprint is deterministic
    const fakeFp = { get: jest.fn().mockResolvedValue({ visitorId: 'F6' }) };
    fpMod.load.mockResolvedValue(fakeFp);

    const none = await service.getCurrentDevice('u1');
    expect(none).toBeNull();

    // When data exists
    const chainData: any = { select() { return this; }, eq() { return this; }, single: jest.fn().mockResolvedValue({ data: { id: 'cd1' }, error: null }) };
    (service as any).supabase = { from: jest.fn(() => chainData) } as any;
    const data = await service.getCurrentDevice('u1');
    expect(data).toEqual({ id: 'cd1' });
  });

  it('isCurrentDeviceTrusted returns correct boolean', async () => {
    jest.spyOn(service, 'getCurrentDevice').mockResolvedValue({ is_trusted: true } as any);
    const t = await service.isCurrentDeviceTrusted('u1');
    expect(t).toBe(true);

    (service as any).getCurrentDevice = jest.fn().mockResolvedValue({ is_trusted: false } as any);
    const f = await service.isCurrentDeviceTrusted('u1');
    expect(f).toBe(false);
  });

  it('removeDevice and updateDeviceName react to error/success', async () => {
    const chainDel: any = { delete: () => ({ eq: () => Promise.resolve({ error: null }) }) };
    (service as any).supabase = { from: jest.fn(() => chainDel) } as any;
    expect(await service.removeDevice('d1')).toBe(true);

    const chainDelFail: any = { delete: () => ({ eq: () => Promise.resolve({ error: { msg: 'err' } }) }) };
    (service as any).supabase = { from: jest.fn(() => chainDelFail) } as any;
    expect(await service.removeDevice('d1')).toBe(false);

    const chainUpd: any = { update: () => ({ eq: () => Promise.resolve({ error: null }) }) };
    (service as any).supabase = { from: jest.fn(() => chainUpd) } as any;
    expect(await service.updateDeviceName('d1', 'Name')).toBe(true);

    const chainUpdFail: any = { update: () => ({ eq: () => Promise.resolve({ error: { msg: 'err' } }) }) };
    (service as any).supabase = { from: jest.fn(() => chainUpdFail) } as any;
    expect(await service.updateDeviceName('d1', 'Name')).toBe(false);
  });

  it('getDeviceFingerprint waits on existing fingerprintPromise', async () => {
    // Simulate fingerprintPromise already holding the final result shape
    (service as any).fingerprintPromise = Promise.resolve({ visitorId: 'VIDX2' });
    (service as any).currentFingerprint = null;

    const v = await service.getDeviceFingerprint();
    expect(v).toBe('VIDX2');
    // fingerprintPromise is left as-is by the implementation when already set
    expect((service as any).fingerprintPromise).toBeDefined();
  });

});
