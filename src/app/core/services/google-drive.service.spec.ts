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
      ],
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
    mockHttp.post.mockReturnValue({
      toPromise: () =>
        Promise.resolve({
          access_token: 'at',
          expires_in: 3600,
          email: 'me@example.com',
          refresh_token: 'rt',
        }),
    });
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
    mockSupabase.maybeSingle.mockResolvedValue({
      data: { id: 'i1', provider: 'google_drive', settings: { selected_files: files } },
      error: null,
    });

    await service.checkConnection();

    expect(service.isConnected()).toBe(true);
    expect(service.files()).toEqual(files);
    expect(service.rootFolder()).toBeTruthy();
    expect(service.rootFolder()?.files.length).toBeGreaterThanOrEqual(0);
  });

  it('downloadFile uses export endpoint for Google Workspace docs and returns blob', async () => {
    const spy = jest
      .spyOn(service as any, 'authFetch')
      .mockResolvedValue({ ok: true, blob: jest.fn().mockResolvedValue(new Blob(['ok'])) } as any);
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
    jest.spyOn(service as any, 'authFetch').mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        id: 'f1',
        name: 'a.txt',
        mimeType: 'text/plain',
        modifiedTime: 't',
        size: 1,
        webViewLink: 'w',
        iconLink: 'i',
        parents: [],
      }),
    } as any);

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

  it('saveSelectedFiles updates integration settings and logs activity', async () => {
    const files = [{ id: 'f1', name: 'A' } as any];
    // mock the update chain to return { error: null }
    // Create a thenable chain object so .update().eq().eq() can be awaited
    const chain: any = { eq: jest.fn().mockReturnThis() };
    chain.then = (res: any) => res({ error: null });
    mockSupabase.from = jest.fn().mockReturnValue({
      update: jest.fn().mockReturnValue(chain),
      eq: jest.fn().mockReturnThis(),
    } as any);

    // set current integration
    service.integration.set({ id: 'i1', settings: {} } as any);

    await (service as any).saveSelectedFiles(files);

    expect(mockSupabase.from).toHaveBeenCalledWith('integrations');
    expect(mockActivity.logActivity).toHaveBeenCalled();
  });

  it('disconnect clears state on success and shows toast', async () => {
    // mock delete success
    // make delete return a thenable chain so .delete().eq().eq() can be awaited
    const delChain: any = { eq: jest.fn().mockReturnThis() };
    delChain.then = (res: any) => res({ error: null });
    mockSupabase.from = jest.fn().mockReturnValue({
      delete: jest.fn().mockReturnValue(delChain),
      eq: jest.fn().mockReturnThis(),
    } as any);
    service.integration.set({ id: 'i1', access_token: 'at' } as any);

    await service.disconnect();

    expect(service.integration()).toBeNull();
    expect(service.isConnected()).toBe(false);
    expect(mockToast.success).toHaveBeenCalledWith('Google Drive disconnected');
  });

  it('disconnect shows error when delete fails', async () => {
    mockSupabase.from = jest.fn().mockReturnValue({
      delete: jest.fn().mockResolvedValue({ error: new Error('no') }),
      eq: jest.fn().mockReturnThis(),
    } as any);
    service.integration.set({ id: 'i1', access_token: 'at' } as any);

    await service.disconnect();

    expect(mockToast.error).toHaveBeenCalledWith('Failed to disconnect Google Drive');
  });

  it('authFetch throws when no token present', async () => {
    service.integration.set(null);
    await expect((service as any).authFetch('https://example')).rejects.toThrow(
      'Not connected to Google Drive',
    );
  });

  it('refreshViaServer returns false when no token returned', async () => {
    mockHttp.post.mockReturnValue({ toPromise: () => Promise.resolve({}) });
    const res = await (service as any).refreshViaServer();
    expect(res).toBe(false);
  });

  it('downloadFile returns null and shows toast on non-ok response', async () => {
    // set token
    service.integration.set({ access_token: 'at' } as any);
    jest
      .spyOn(service as any, 'authFetch')
      .mockResolvedValue({ ok: false, json: jest.fn().mockResolvedValue({ error: 'e' }) } as any);

    const res = await service.downloadFile('f1');
    expect(res).toBeNull();
    expect(mockToast.error).toHaveBeenCalledWith('Failed to download file from Google Drive');
  });

  it('deleteFile removes file and returns true on success', async () => {
    service.integration.set({ access_token: 'at' } as any);
    // set files
    service.files.set([{ id: 'x', name: 'X' } as any]);
    jest.spyOn(service as any, 'authFetch').mockResolvedValue({ ok: true } as any);
    const saveSpy = jest
      .spyOn(service as any, 'saveSelectedFiles')
      .mockResolvedValue(undefined as any);

    const res = await service.deleteFile('x');
    expect(res).toBe(true);
    expect(service.files().length).toBe(0);
    expect(saveSpy).toHaveBeenCalled();
    expect(mockToast.success).toHaveBeenCalledWith('File deleted from Google Drive');
  });

  it('renameFile returns false and shows toast when API fails', async () => {
    jest.spyOn(service as any, 'authFetch').mockResolvedValue({ ok: false } as any);
    const res = await service.renameFile('id1', 'new');
    expect(res).toBe(false);
    expect(mockToast.error).toHaveBeenCalledWith('Failed to rename file');
  });

  it('createFolder returns folder and shows success', async () => {
    service.integration.set({ access_token: 'at' } as any);
    const folderData = {
      id: 'fold1',
      name: 'N',
      mimeType: 'application/vnd.google-apps.folder',
      modifiedTime: 't',
      parents: [],
    };
    jest
      .spyOn(service as any, 'authFetch')
      .mockResolvedValue({ ok: true, json: jest.fn().mockResolvedValue(folderData) } as any);

    const res = await service.createFolder('N');
    expect(res).toBeTruthy();
    expect(mockToast.success).toHaveBeenCalledWith('Folder created in Google Drive');
  });

  it('renameFile returns true and logs activity on success', async () => {
    service.integration.set({ access_token: 'at' } as any);
    jest
      .spyOn(service as any, 'authFetch')
      .mockResolvedValue({ ok: true, json: jest.fn().mockResolvedValue({}) } as any);
    const spy = jest.spyOn(mockActivity, 'logActivity').mockResolvedValue({});

    const res = await service.renameFile('id1', 'newname');
    expect(res).toBe(true);
    expect(mockToast.success).toHaveBeenCalledWith('File renamed successfully');
    expect(spy).toHaveBeenCalled();
  });

  it('pickFiles shows not connected when integration missing', async () => {
    service.pickerLoaded.set(true);
    service.integration.set(null);

    await service.pickFiles();
    expect(mockToast.error).toHaveBeenCalledWith('Not connected to Google Drive');
  });

  it('showPicker errors when Google Picker API missing', async () => {
    service.pickerLoaded.set(true);
    service.integration.set({ access_token: 'at' } as any);
    (global as any).google = {}; // no picker

    await (service as any).showPicker('files');
    expect(mockToast.error).toHaveBeenCalledWith('Google Picker API not loaded');
  });

  it('pickFiles merges picked files, builds tree and saves selection', async () => {
    service.pickerLoaded.set(true);
    service.integration.set({ access_token: 'at' } as any);

    // mock google.picker behavior
    const pickedDocs = [
      {
        id: 'd1',
        name: 'Doc 1',
        mimeType: 'text/plain',
        lastEditedUtc: 't',
        sizeBytes: 10,
        url: 'u',
        iconUrl: 'i',
        parents: [],
      },
    ];

    // DocsView should return an object with fluent API methods
    const mockDocsView = jest.fn().mockImplementation(() => {
      return new (class {
        setIncludeFolders() {
          return this;
        }
        setSelectFolderEnabled() {
          return this;
        }
        setOwnedByMe() {
          return this;
        }
        setQuery() {
          return this;
        }
        setMimeTypes() {
          return this;
        }
      })();
    });

    const mockPickerBuilder = jest.fn().mockImplementation(() => {
      let cb: any;
      return {
        addView: function () {
          return this;
        },
        setOAuthToken: function () {
          return this;
        },
        setDeveloperKey: function () {
          return this;
        },
        setAppId: function () {
          return this;
        },
        setOrigin: function () {
          return this;
        },
        setCallback: function (c: any) {
          cb = c;
          return this;
        },
        enableFeature: function () {
          return this;
        },
        build: function () {
          return {
            setVisible: () => {
              /* simulate picked */ cb({
                action: (global as any).google.picker.Action.PICKED,
                docs: pickedDocs,
              });
            },
          };
        },
      } as any;
    });

    (global as any).google = {
      picker: {
        DocsView: mockDocsView,
        PickerBuilder: mockPickerBuilder as any,
        Action: { PICKED: 'picked', CANCEL: 'canceled' },
        Feature: { MULTISELECT_ENABLED: 'm' },
      },
    };

    const saveSpy = jest
      .spyOn(service as any, 'saveSelectedFiles')
      .mockResolvedValue(undefined as any);
    const buildSpy = jest.spyOn(service as any, 'buildFolderTree');

    await service.pickFiles();

    expect(service.files().length).toBeGreaterThan(0);
    expect(saveSpy).toHaveBeenCalled();
    expect(buildSpy).toHaveBeenCalled();
    expect(mockToast.success).toHaveBeenCalledWith('Files added from Google Drive');

    saveSpy.mockRestore();
    buildSpy.mockRestore();
  });

  it('authFetch marks disconnected and shows toast when refresh fails on 401', async () => {
    service.integration.set({ access_token: 'old' } as any);
    (global as any).fetch = jest.fn().mockResolvedValue({
      status: 401,
      ok: false,
      statusText: 'Unauthorized',
      json: jest.fn().mockResolvedValue({}),
    });
    jest.spyOn(service as any, 'refreshViaServer').mockResolvedValue(false);

    const resp = await (service as any).authFetch('https://example');

    expect((global as any).fetch).toHaveBeenCalledTimes(1);
    expect(service.isConnected()).toBe(false);
    expect(mockToast.error).toHaveBeenCalledWith('Google Drive session expired. Please reconnect.');
    expect(resp.ok).toBe(false);
  });

  it('downloadFile returns null when blob retrieval fails', async () => {
    service.integration.set({ access_token: 'at' } as any);
    jest
      .spyOn(service as any, 'authFetch')
      .mockResolvedValue({ ok: true, blob: jest.fn().mockRejectedValue(new Error('boom')) } as any);

    const res = await service.downloadFile('f1');
    expect(res).toBeNull();
    expect(mockToast.error).toHaveBeenCalledWith('Failed to download file from Google Drive');
  });

  it('deleteFile returns false and shows toast on API failure', async () => {
    service.integration.set({ access_token: 'at' } as any);
    jest.spyOn(service as any, 'authFetch').mockResolvedValue({
      ok: false,
      status: 400,
      statusText: 'Bad',
      json: jest.fn().mockResolvedValue({}),
    } as any);

    const res = await service.deleteFile('x');
    expect(res).toBe(false);
    expect(mockToast.error).toHaveBeenCalledWith('Failed to delete file from Google Drive');
  });

  it('showPicker handles CANCEL action and shows info toast', async () => {
    service.pickerLoaded.set(true);
    service.integration.set({ access_token: 'at' } as any);

    const mockPickerBuilder = jest.fn().mockImplementation(() => {
      let cb: any;
      return {
        addView: function () {
          return this;
        },
        setOAuthToken: function () {
          return this;
        },
        setDeveloperKey: function () {
          return this;
        },
        setAppId: function () {
          return this;
        },
        setOrigin: function () {
          return this;
        },
        setCallback: function (c: any) {
          cb = c;
          return this;
        },
        enableFeature: function () {
          return this;
        },
        build: function () {
          return {
            setVisible: () => {
              cb({ action: (global as any).google.picker.Action.CANCEL });
            },
          };
        },
      } as any;
    });

    (global as any).google = {
      picker: {
        DocsView: jest.fn().mockImplementation(() => ({
          setIncludeFolders: jest.fn().mockReturnThis(),
          setSelectFolderEnabled: jest.fn().mockReturnThis(),
          setOwnedByMe: jest.fn().mockReturnThis(),
          setQuery: jest.fn().mockReturnThis(),
          setMimeTypes: jest.fn().mockReturnThis(),
        })),
        PickerBuilder: mockPickerBuilder as any,
        Action: { PICKED: 'picked', CANCEL: 'canceled' },
        Feature: { MULTISELECT_ENABLED: 'm' },
      },
    };

    await (service as any).showPicker('files');
    expect(mockToast.info).toHaveBeenCalledWith('Picker action canceled');
  });

  it('showPicker logs picker errors for unknown action', async () => {
    service.pickerLoaded.set(true);
    service.integration.set({ access_token: 'at' } as any);

    const mockPickerBuilder = jest.fn().mockImplementation(() => {
      let cb: any;
      return {
        addView: function () {
          return this;
        },
        setOAuthToken: function () {
          return this;
        },
        setDeveloperKey: function () {
          return this;
        },
        setAppId: function () {
          return this;
        },
        setOrigin: function () {
          return this;
        },
        setCallback: function (c: any) {
          cb = c;
          return this;
        },
        enableFeature: function () {
          return this;
        },
        build: function () {
          return {
            setVisible: () => {
              cb({ action: 'UNKNOWN', message: 'oops' });
            },
          };
        },
      } as any;
    });

    (global as any).google = {
      picker: {
        DocsView: jest.fn().mockImplementation(() => ({
          setIncludeFolders: jest.fn().mockReturnThis(),
          setSelectFolderEnabled: jest.fn().mockReturnThis(),
          setOwnedByMe: jest.fn().mockReturnThis(),
          setQuery: jest.fn().mockReturnThis(),
          setMimeTypes: jest.fn().mockReturnThis(),
        })),
        PickerBuilder: mockPickerBuilder as any,
        Action: { PICKED: 'picked', CANCEL: 'canceled' },
        Feature: { MULTISELECT_ENABLED: 'm' },
      },
    };

    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    await (service as any).showPicker('files');
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('saveSelectedFiles handles supabase update errors gracefully', async () => {
    const files = [{ id: 'f1', name: 'A' } as any];
    const chain: any = { eq: jest.fn().mockReturnThis() };
    chain.then = (res: any) => res({ error: new Error('fail') });
    mockSupabase.from = jest.fn().mockReturnValue({
      update: jest.fn().mockReturnValue(chain),
      eq: jest.fn().mockReturnThis(),
    } as any);

    service.integration.set({ id: 'i1', settings: {} } as any);
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    await (service as any).saveSelectedFiles(files);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('refreshViaServer success sets new token and shows success toast', async () => {
    mockHttp.post.mockReturnValue({
      toPromise: () => Promise.resolve({ access_token: 'nt', expires_at: 12345 }),
    });
    service.integration.set({ access_token: 'old', id: 'i1' } as any);
    const res = await (service as any).refreshViaServer();
    expect(res).toBe(true);
    expect(service.integration()?.access_token).toBe('nt');
    expect(service.isConnected()).toBe(true);
    expect(mockToast.success).toHaveBeenCalledWith('Google Drive session refreshed');
  });

  it('uploadFile returns null and shows toast when authFetch throws', async () => {
    service.integration.set({ access_token: 'at' } as any);
    jest.spyOn(service as any, 'authFetch').mockRejectedValue(new Error('boom'));
    const file = new File(['x'], 'a.txt', { type: 'text/plain' });
    const res = await service.uploadFile(file);
    expect(res).toBeNull();
    expect(mockToast.error).toHaveBeenCalledWith('Failed to upload file to Google Drive');
  });
});
