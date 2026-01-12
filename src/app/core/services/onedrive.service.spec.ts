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

  it('scheduleTokenRefresh sets a timer and triggers refresh', async () => {
    // Ensure token is connected
    service.isConnected.set(true);
    // Spy on refreshToken implementation to simulate behavior
    const refreshSpy = jest.spyOn(service as any, 'refreshToken').mockImplementation(async () => {
      service.isConnected.set(false);
      mockToast.error('OneDrive session expired. Please reconnect.');
    });

    jest.useFakeTimers();
    (service as any).scheduleTokenRefresh(65 * 1000); // > 1 minute
    expect((service as any).tokenRefreshTimer).toBeDefined();

    // Fast-forward to trigger timer
    jest.advanceTimersByTime(65 * 1000 + 10);
    // wait a microtask for the async handler
    await Promise.resolve();

    expect(refreshSpy).toHaveBeenCalled();
    expect(service.isConnected()).toBe(false);
    expect(mockToast.error).toHaveBeenCalledWith('OneDrive session expired. Please reconnect.');
    jest.useRealTimers();
  });

  it('disconnect shows error when delete fails', async () => {
    jest.spyOn(service as any, 'revokeMicrosoftSession').mockResolvedValue(undefined);
    service.integration.set({ id: 'i1' } as any);
    // Simulate supabase delete returning an error
    mockSupabase.from = jest.fn().mockReturnValue({ delete: jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: new Error('no') }) }) });

    await service.disconnect();
    expect(mockToast.error).toHaveBeenCalledWith('Failed to disconnect OneDrive');
  });
  it('loadFiles falls back to items root when special folder fails', async () => {
    service.integration.set({ access_token: 'at' } as any);
    // /me/drive fails -> /me/drives returns drive -> root/children returns itemNotFound -> special/documents fails -> items root children succeeds
    mockHttp.get.mockImplementation((url: string) => {
      if (url.endsWith('/me/drive')) return { toPromise: () => Promise.reject(new Error('fail')) } as any;
      if (url.endsWith('/me/drives')) return { toPromise: () => Promise.resolve({ value: [{ id: 'd1' }] }) } as any;
      if (url.includes('/drives/d1/root/children')) return { toPromise: () => Promise.reject({ error: { error: { code: 'itemNotFound' } } }) } as any;
      if (url.includes('/drives/d1/special/documents/children')) return { toPromise: () => Promise.reject(new Error('special fail')) } as any;
      if (url.includes('/drives/d1/items/root/children')) return { toPromise: () => Promise.resolve({ value: [{ id: 'item1', name: 'i1', file: {}, size: 1 }] }) } as any;
      return { toPromise: () => Promise.resolve({}) } as any;
    });

    await service.loadFiles();

    expect(service.files().length).toBe(1);
    expect(service.rootFolder()).toBeTruthy();
  });

  it('loadFiles reports error and sets empty root when items fallback fails', async () => {
    service.integration.set({ access_token: 'at' } as any);
    // /me/drive fails -> /me/drives returns drive -> root/children returns itemNotFound -> special/documents fails -> items root children fails
    mockHttp.get.mockImplementation((url: string) => {
      if (url.endsWith('/me/drive')) return { toPromise: () => Promise.reject(new Error('fail')) } as any;
      if (url.endsWith('/me/drives')) return { toPromise: () => Promise.resolve({ value: [{ id: 'd1' }] }) } as any;
      if (url.includes('/drives/d1/root/children')) return { toPromise: () => Promise.reject({ error: { error: { code: 'itemNotFound' } } }) } as any;
      if (url.includes('/drives/d1/special/documents/children')) return { toPromise: () => Promise.reject(new Error('special fail')) } as any;
      if (url.includes('/drives/d1/items/root/children')) return { toPromise: () => Promise.reject(new Error('items fail')) } as any;
      return { toPromise: () => Promise.resolve({}) } as any;
    });

    await service.loadFiles();

    expect(mockToast.error).toHaveBeenCalledWith('Unable to access OneDrive files. The drive may be empty or inaccessible.');
    expect(service.rootFolder()).toBeTruthy();
    expect(service.files().length).toBe(0);
  });

  it('disconnect continues when revoke fails but still deletes integration', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(service as any, 'revokeMicrosoftSession').mockRejectedValue(new Error('revoke fail'));
    service.integration.set({ id: 'i1' } as any);
    mockSupabase.from = jest.fn().mockReturnValue({ delete: jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) }) });

    await service.disconnect();
    expect(warnSpy).toHaveBeenCalled();
    expect(service.integration()).toBeNull();
    expect(mockToast.success).toHaveBeenCalledWith('OneDrive disconnected successfully. You can now connect with a different account.');
    warnSpy.mockRestore();
  });

  it('scheduleTokenRefresh clears existing timer before setting a new one', () => {
    (service as any).tokenRefreshTimer = 123;
    const clearSpy = jest.spyOn(window, 'clearTimeout');
    jest.useFakeTimers();
    (service as any).scheduleTokenRefresh(70 * 1000);
    expect(clearSpy).toHaveBeenCalledWith(123);
    expect((service as any).tokenRefreshTimer).toBeDefined();
    jest.useRealTimers();
    clearSpy.mockRestore();
  });
  it('loadFiles shows error when no drives found', async () => {
    service.integration.set({ access_token: 'at' } as any);
    // /me/drive fails
    mockHttp.get.mockImplementation((url: string) => {
      if (url.endsWith('/me/drive')) return { toPromise: () => Promise.reject(new Error('fail')) } as any;
      // /me/drives returns empty
      if (url.endsWith('/me/drives')) return { toPromise: () => Promise.resolve({ value: [] }) } as any;
      return { toPromise: () => Promise.resolve({}) } as any;
    });

    await service.loadFiles();
    expect(mockToast.error).toHaveBeenCalledWith('No OneDrive found for this account');
  });

  it('connect shows popup blocked message when window.open returns null', async () => {
    // simulate popup blocked
    const realOpen = window.open;
    (window as any).open = jest.fn().mockReturnValue(null);
    await service.connect(true);
    expect(mockToast.error).toHaveBeenCalledWith('Please allow popups for OneDrive authentication');
    (window as any).open = realOpen;
  });

  it('buildAuthUrl includes or omits prompt based on forceAccountSelection', () => {
    const urlWith = (service as any).buildAuthUrl(true);
    expect(urlWith).toContain('prompt=select_account');
    const urlWithout = (service as any).buildAuthUrl(false);
    expect(urlWithout).not.toContain('prompt=select_account');
  });

  it('handleOAuthCallback ignores messages from other origins and calls handleAuthSuccess on success', async () => {
    const realOrigin = window.location.origin;

    const spy = jest.spyOn(service as any, 'handleAuthSuccess').mockResolvedValue(undefined);

    // Origin mismatch: should do nothing
    await (service as any).handleOAuthCallback({ origin: 'http://evil', data: { accessToken: 'x' } } as any);
    expect(spy).not.toHaveBeenCalled();

    // Valid origin with error: should show toast
    await (service as any).handleOAuthCallback({ origin: realOrigin, data: { error: 'err' } } as any);
    expect(mockToast.error).toHaveBeenCalledWith('Failed to connect OneDrive');

    // Valid origin with token should call handleAuthSuccess
    await (service as any).handleOAuthCallback({ origin: realOrigin, data: { accessToken: 'tok', expiresIn: 3600 } } as any);
    expect(spy).toHaveBeenCalledWith('tok', 3600);
    spy.mockRestore();
  });

  it('handleAuthSuccess shows error when saving integration returns no data', async () => {
    mockHttp.get.mockReturnValue({ toPromise: () => Promise.resolve({ mail: 'me@example.com' }) } as any);
    mockHttp.post.mockReturnValue({ toPromise: () => Promise.resolve([]) } as any); // no returned row

    await (service as any).handleAuthSuccess('access-token-err', 3600);
    expect(mockToast.error).toHaveBeenCalledWith('Failed to save OneDrive connection');
  });

  it('connect adds message listener and reacts to message event', async () => {
    const realOpen = window.open;
    (window as any).open = jest.fn().mockReturnValue({});
    const spy = jest.spyOn(service as any, 'handleAuthSuccess').mockResolvedValue(undefined);

    await service.connect(true);
    // dispatch a message event to window
    window.dispatchEvent(new MessageEvent('message', { origin: window.location.origin, data: { accessToken: 'x', expiresIn: 3600 } }));
    // wait a tick for handler to run
    await new Promise((r) => setTimeout(r, 0));

    expect(spy).toHaveBeenCalledWith('x', 3600);
    (window as any).open = realOpen;
    spy.mockRestore();
  });

  it('revokeMicrosoftSession rejects when iframe onerror fires', async () => {
    jest.useFakeTimers();
    const p = (service as any).revokeMicrosoftSession();
    const iframe = document.querySelector('iframe') as HTMLIFrameElement;
    expect(iframe).toBeTruthy();
    // Trigger onerror to cause rejection
    if (iframe && iframe.onerror) iframe.onerror(new Event('error') as any);
    await expect(p).rejects.toThrow('Failed to revoke session');
    jest.useRealTimers();
  });

  it('loadFolder returns empty items when http.get fails', async () => {
    const folder = { id: 'f1', name: 'Folder', isFolder: true } as any;
    mockHttp.get.mockReturnValue({ toPromise: () => Promise.reject(new Error('boom')) } as any);
    const res = await (service as any).loadFolder(folder, 'at');
    expect(res.files.length).toBe(0);
    expect(res.folders.length).toBe(0);
  });

  it('uploadFile returns null and shows error when http.put fails', async () => {
    const file = new File(['x'], 'bad.txt', { type: 'text/plain' });
    service.integration.set({ access_token: 'at' } as any);
    mockHttp.put.mockReturnValue({ toPromise: () => Promise.reject(new Error('boom')) } as any);
    const res = await service.uploadFile(file);
    expect(res).toBeNull();
    expect(mockToast.error).toHaveBeenCalledWith('Failed to upload file to OneDrive');
  });

  it('deleteFile returns false and shows error when http.delete fails', async () => {
    service.integration.set({ access_token: 'at' } as any);
    mockHttp.delete.mockReturnValue({ toPromise: () => Promise.reject(new Error('boom')) } as any);
    const res = await service.deleteFile('fX');
    expect(res).toBe(false);
    expect(mockToast.error).toHaveBeenCalledWith('Failed to delete file from OneDrive');
  });

  it('renameFile returns false and shows error when patch fails', async () => {
    service.integration.set({ access_token: 'at' } as any);
    mockHttp.patch = jest.fn().mockReturnValue({ toPromise: () => Promise.reject(new Error('boom')) } as any);
    const res = await service.renameFile('fR', 'new');
    expect(res).toBe(false);
    expect(mockToast.error).toHaveBeenCalledWith('Failed to rename file');
  });

  it('loadFiles handles InvalidAuthenticationToken by marking disconnected', async () => {
    service.integration.set({ access_token: 'at' } as any);
    // drive info succeeds but root children throws InvalidAuthenticationToken
    mockHttp.get.mockImplementation((url: string) => {
      if (url.endsWith('/me/drive')) return { toPromise: () => Promise.resolve({ id: 'd1' }) } as any;
      if (url.includes('/root/children')) return { toPromise: () => Promise.reject({ error: { error: { code: 'InvalidAuthenticationToken' } } }) } as any;
      return { toPromise: () => Promise.resolve({}) } as any;
    });

    await service.loadFiles();
    expect(service.isConnected()).toBe(false);
    expect(mockToast.error).toHaveBeenCalledWith('OneDrive session expired. Please reconnect.');
  });

});
