import { TestBed } from '@angular/core/testing';
import { GoogleDriveService } from './google-drive.service';
import { SupabaseService } from './supabase.service';
import { AuthStateService } from './auth-state.service';
import { ToastService } from './toast.service';
import { LoadingService } from './loading.service';
import { HttpClient } from '@angular/common/http';
import { ActivityLogService } from './activity-log.service';

// Minimal supabase mock used across tests
const makeSupabaseMock = () => ({
  from: jest.fn().mockReturnThis(),
  upsert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
  insert: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: jest.fn().mockResolvedValue({ data: null, error: null }),
});

describe('GoogleDriveService', () => {
  let service: GoogleDriveService;
  let mockSupabase: any;
  let mockAuth: any;
  let mockToast: any;
  let mockLoading: any;
  let mockHttp: any;
  let mockActivity: any;

  beforeEach(() => {
    mockSupabase = makeSupabaseMock();
    mockAuth = { userId: jest.fn().mockReturnValue('u1') };
    mockToast = { success: jest.fn(), error: jest.fn(), info: jest.fn() };
    mockLoading = { start: jest.fn(), stop: jest.fn() };
    mockHttp = { post: jest.fn() };
    mockActivity = { logActivity: jest.fn().mockResolvedValue({}) };

    TestBed.configureTestingModule({
      providers: [
        GoogleDriveService,
        { provide: SupabaseService, useValue: mockSupabase },
        { provide: AuthStateService, useValue: mockAuth },
        { provide: ToastService, useValue: mockToast },
        { provide: LoadingService, useValue: mockLoading },
        { provide: HttpClient, useValue: mockHttp },
        { provide: ActivityLogService, useValue: mockActivity },
      ]
    });

    service = TestBed.inject(GoogleDriveService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    (global as any).fetch = undefined;
    (global as any).google = undefined;
    (window as any).gapi = undefined;
  });

  it('initGoogleAuth sets pickerLoaded when google and gapi present', async () => {
    // If google is defined and gapi has load, both branches call checkLoaded immediately
    (global as any).google = {};
    (window as any).gapi = { load: jest.fn((_, cb) => cb()) };

    await service.initGoogleAuth();
    expect(service.pickerLoaded()).toBe(true);
  });

  it('handleAuthCode exchanges code and saves integration', async () => {
    // mock http post to return token payload
    mockHttp.post.mockReturnValue({ toPromise: () => Promise.resolve({ access_token: 'at', expires_in: 3600, email: 'me@example.com', refresh_token: 'rt' }) });
    // supabase upsert flow should resolve without error
    mockSupabase.single.mockResolvedValue({ data: null, error: null });

    await (service as any).handleAuthCode('the-code');

    expect(mockHttp.post).toHaveBeenCalled();
    expect(mockSupabase.upsert).toHaveBeenCalled();
    expect(service.integration()).toBeTruthy();
    expect(service.isConnected()).toBe(true);
    expect(mockToast.success).toHaveBeenCalledWith('Google Drive connected successfully');
  });

  it('checkConnection loads saved files and builds folder tree', async () => {
    const files = [{ id: 'f1', name: 'A', mimeType: 'text/plain', isFolder: false, parents: [] }];
    mockSupabase.maybeSingle.mockResolvedValue({ data: { id: 'i1', provider: 'google_drive', settings: { selected_files: files } }, error: null });

    await service.checkConnection();

    expect(service.isConnected()).toBe(true);
    expect(service.files()).toEqual(files);
    expect(service.rootFolder()).toBeTruthy();
    expect(service.rootFolder()?.files.length).toBeGreaterThanOrEqual(0);
  });

  it('downloadFile uses export endpoint for Google Workspace docs and returns blob', async () => {
    const spy = jest.spyOn(service as any, 'authFetch').mockResolvedValue({ ok: true, blob: jest.fn().mockResolvedValue(new Blob(['ok'])) } as any);
    // set integration token
    service.integration.set({ access_token: 'at' } as any);

    const b = await service.downloadFile('doc-id', 'application/vnd.google-apps.document');
    expect(spy).toHaveBeenCalled();
    // the first call should have included /export?mimeType= in the URL
    const calledUrl = spy.mock.calls[0][0];
    expect(calledUrl.includes('/export?mimeType=')).toBe(true);
    expect(b).toBeInstanceOf(Blob);
  });

  it('authFetch retries once when server refresh succeeds', async () => {
    // initial fetch returns 401, second returns ok
    let callCount = 0;
    (global as any).fetch = jest.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) return Promise.resolve({ status: 401, ok: false });
      return Promise.resolve({ status: 200, ok: true, text: jest.fn().mockResolvedValue('ok') });
    });

    // spy on refreshViaServer to simulate successful refresh and set a new token
    jest.spyOn(service as any, 'refreshViaServer').mockImplementation(async () => {
      service.integration.set({ access_token: 'newtoken' } as any);
      return true;
    });

    // set old token
    service.integration.set({ access_token: 'old' } as any);

    const resp = await (service as any).authFetch('https://example', { method: 'GET' });
    expect((global as any).fetch).toHaveBeenCalledTimes(2);
    expect(resp.ok).toBe(true);
  });

  it('uploadFile returns null when not connected and succeeds when connected', async () => {
    // not connected
    service.integration.set(null);
    const file = new File(['x'], 'a.txt', { type: 'text/plain' });
    const res1 = await service.uploadFile(file);
    expect(res1).toBeNull();
    expect(mockToast.error).toHaveBeenCalledWith('Not connected to Google Drive');

    // connected -> mock authFetch to return uploaded file data
    service.integration.set({ access_token: 'at' } as any);
    jest.spyOn(service as any, 'authFetch').mockResolvedValue({ ok: true, json: jest.fn().mockResolvedValue({ id: 'f1', name: 'a.txt', mimeType: 'text/plain', modifiedTime: 't', size: 1, webViewLink: 'w', iconLink: 'i', parents: [] }) } as any);

    const res2 = await service.uploadFile(file, 'p1');
    expect(res2).toBeTruthy();
    expect(mockToast.success).toHaveBeenCalledWith('File uploaded to Google Drive');
    expect(mockActivity.logActivity).toHaveBeenCalled();
  });

  it('buildFolderTree creates a root node and nests folders/files', () => {
    const files = [
      { id: 'd1', name: 'root file', isFolder: false, parents: [] },
      { id: 'f1', name: 'Folder A', isFolder: true, parents: [] },
      { id: 'f2', name: 'file in folder', isFolder: false, parents: ['f1'] },
    ] as any;

    (service as any).buildFolderTree(files);

    const root = service.rootFolder();
    expect(root).toBeTruthy();
    // folder node should exist
    const folderNode = (root?.folders || []).find((f: any) => f.id === 'f1');
    expect(folderNode).toBeTruthy();
    expect(folderNode.files.length).toBe(1);
  });

});
