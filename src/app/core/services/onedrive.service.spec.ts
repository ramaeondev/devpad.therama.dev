import { TestBed } from '@angular/core/testing';
import { OneDriveService } from './onedrive.service';
import { SupabaseService } from './supabase.service';
import { AuthStateService } from './auth-state.service';
import { ToastService } from './toast.service';
import { LoadingService } from './loading.service';
import { HttpClient } from '@angular/common/http';
import { ActivityLogService } from './activity-log.service';

const makeSupabaseMock = () => ({
  getSession: jest.fn().mockResolvedValue({ session: { user: { id: 'u1' }, access_token: 'sbtoken' } }),
  from: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: jest.fn().mockResolvedValue({ data: null, error: null }),
});

describe('OneDriveService', () => {
  let service: OneDriveService;
  let mockSupabase: any;
  let mockAuth: any;
  let mockToast: any;
  let mockLoading: any;
  let mockHttp: any;
  let mockActivity: any;

  beforeEach(() => {
    mockSupabase = makeSupabaseMock();
    mockAuth = { userId: jest.fn().mockReturnValue('u1'), setUser: jest.fn() };
    mockToast = { success: jest.fn(), error: jest.fn(), info: jest.fn() };
    mockLoading = { start: jest.fn(), stop: jest.fn() };
    mockHttp = { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() };
    mockActivity = { logActivity: jest.fn().mockResolvedValue({}) };

    TestBed.configureTestingModule({
      providers: [
        OneDriveService,
        { provide: SupabaseService, useValue: mockSupabase },
        { provide: AuthStateService, useValue: mockAuth },
        { provide: ToastService, useValue: mockToast },
        { provide: LoadingService, useValue: mockLoading },
        { provide: HttpClient, useValue: mockHttp },
        { provide: ActivityLogService, useValue: mockActivity },
      ]
    });

    service = TestBed.inject(OneDriveService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    (global as any).fetch = undefined;
  });

  it('handleAuthSuccess saves integration and schedules refresh', async () => {
    // mock /me userinfo
    mockHttp.get.mockImplementation((url: string) => {
      if (url.includes('/me')) return { toPromise: () => Promise.resolve({ mail: 'me@example.com' }) } as any;
      return { toPromise: () => Promise.resolve([]) } as any;
    });
    // mock post to save integration (returns array with saved row)
    mockHttp.post.mockReturnValue({ toPromise: () => Promise.resolve([{ id: 'i1', provider: 'onedrive' }]) });
    // spy on scheduleTokenRefresh and loadFiles
    const scheduleSpy = jest.spyOn(service as any, 'scheduleTokenRefresh');
    jest.spyOn(service as any, 'loadFiles').mockResolvedValue();

    await (service as any).handleAuthSuccess('access-token-1', 3600);

    expect(mockHttp.get).toHaveBeenCalled();
    expect(mockHttp.post).toHaveBeenCalled();
    expect(service.integration()).toBeTruthy();
    expect(service.isConnected()).toBe(true);
    expect(scheduleSpy).toHaveBeenCalled();
    expect(mockToast.success).toHaveBeenCalledWith('OneDrive connected successfully');
  });

  it('scheduleTokenRefresh does not schedule if delay < 1min', () => {
    (service as any).tokenRefreshTimer = undefined;
    (service as any).scheduleTokenRefresh(30 * 1000); // 30s
    expect((service as any).tokenRefreshTimer).toBeUndefined();
  });

  it('loadFiles sets files on successful root children', async () => {
    service.integration.set({ access_token: 'at' } as any);
    // drive info succeeds
    mockHttp.get.mockImplementation((url: string) => {
      if (url.endsWith('/me')) return { toPromise: () => Promise.resolve({ id: 'drive1' }) } as any;
      if (url.includes('/root/children')) return { toPromise: () => Promise.resolve({ value: [{ id: '1', name: 'file', file: {}, size: 10, webUrl: 'w', createdDateTime: 't', lastModifiedDateTime: 't' }] }) } as any;
      return { toPromise: () => Promise.resolve({}) } as any;
    });

    await service.loadFiles();
    expect(service.files().length).toBe(1);
    expect(service.rootFolder()).toBeTruthy();
  });

  it('loadFiles falls back to drives and uses first drive', async () => {
    service.integration.set({ access_token: 'at' } as any);
    // first call to /me/drive fails (ensure we reject the exact /me/drive endpoint)
    mockHttp.get.mockImplementation((url: string) => {
      if (url.endsWith('/me/drive')) return { toPromise: () => Promise.reject(new Error('fail')) } as any;
      if (url.endsWith('/me/drives')) return { toPromise: () => Promise.resolve({ value: [{ id: 'd1' }] }) } as any;
      if (url.includes('/drives/d1/root/children')) return { toPromise: () => Promise.resolve({ value: [{ id: '2', name: 'f2', file: {}, size: 5 }] }) } as any;
      return { toPromise: () => Promise.resolve({}) } as any;
    });

    await service.loadFiles();
    expect(service.files().length).toBe(1);
    expect(service.rootFolder()).toBeTruthy();
  });

  it('loadFiles handles itemNotFound and uses Documents fallback', async () => {
    service.integration.set({ access_token: 'at' } as any);
    // root children throws with itemNotFound
    mockHttp.get.mockImplementation((url: string) => {
      if (url.includes('/root/children')) return { toPromise: () => Promise.reject({ error: { error: { code: 'itemNotFound' } } }) } as any;
      if (url.includes('/special/documents/children')) return { toPromise: () => Promise.resolve({ value: [{ id: 'doc1', name: 'doc' }] }) } as any;
      return { toPromise: () => Promise.resolve({}) } as any;
    });

    await service.loadFiles();
    expect(service.files().length).toBe(1);
    expect(mockToast.info).toHaveBeenCalledWith('Showing Documents folder (root not accessible)');
  });

  it('uploadFile returns null when not connected and uploads when connected', async () => {
    const file = new File(['x'], 'a.txt', { type: 'text/plain' });
    service.integration.set(null);
    const res1 = await service.uploadFile(file);
    expect(res1).toBeNull();
    expect(mockToast.error).toHaveBeenCalledWith('Not connected to OneDrive');

    service.integration.set({ access_token: 'at' } as any);
    mockHttp.put.mockReturnValue({ toPromise: () => Promise.resolve({ id: 'u1', name: 'a.txt', file: {}, size: 1, webUrl: 'w', createdDateTime: 't', lastModifiedDateTime: 't' }) } as any);
    jest.spyOn(service as any, 'loadFiles').mockResolvedValue();

    const res2 = await service.uploadFile(file);
    expect(res2).toBeTruthy();
    expect(mockToast.success).toHaveBeenCalledWith('File uploaded to OneDrive');
    expect(mockActivity.logActivity).toHaveBeenCalled();
  });

  it('downloadFile returns null when not connected and returns blob when connected', async () => {
    service.integration.set(null);
    const res1 = await service.downloadFile('f1');
    expect(res1).toBeNull();
    expect(mockToast.error).toHaveBeenCalledWith('Not connected to OneDrive');

    service.integration.set({ access_token: 'at' } as any);
    const blob = new Blob(['ok']);
    mockHttp.get.mockReturnValue({ toPromise: () => Promise.resolve(blob) } as any);

    const res2 = await service.downloadFile('f2');
    expect(res2).toBeInstanceOf(Blob);
  });

  it('deleteFile returns false when not connected and true when connected', async () => {
    service.integration.set(null);
    const res1 = await service.deleteFile('f1');
    expect(res1).toBe(false);
    expect(mockToast.error).toHaveBeenCalledWith('Not connected to OneDrive');

    service.integration.set({ access_token: 'at' } as any);
    mockHttp.delete.mockReturnValue({ toPromise: () => Promise.resolve({}) } as any);
    jest.spyOn(service as any, 'loadFiles').mockResolvedValue();

    const res2 = await service.deleteFile('f2');
    expect(res2).toBe(true);
    expect(mockToast.success).toHaveBeenCalledWith('File deleted from OneDrive');
  });

  it('revokeMicrosoftSession creates iframe and resolves', async () => {
    jest.useFakeTimers();
    const p = (service as any).revokeMicrosoftSession();
    // find iframe and trigger onload
    const iframe = document.querySelector('iframe') as HTMLIFrameElement;
    expect(iframe).toBeTruthy();
    // call onload
    if (iframe) iframe.onload && iframe.onload(new Event('load'));
    jest.advanceTimersByTime(1000);
    await p;
    jest.useRealTimers();
  });

  it('disconnect revokes session and deletes integration', async () => {
    // stub revokeMicrosoftSession to avoid iframe creation
    jest.spyOn(service as any, 'revokeMicrosoftSession').mockResolvedValue(undefined);
    service.integration.set({ id: 'i1' } as any);
    // Make from().delete().eq(...) return a resolved object with { error: null }
    mockSupabase.from = jest.fn().mockReturnValue({ delete: jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) }) });

    await service.disconnect();
    expect(service.integration()).toBeNull();
    expect(service.isConnected()).toBe(false);
    expect(mockToast.success).toHaveBeenCalled();
  });

});
