import { TestBed } from '@angular/core/testing';
import { ShareService } from './share.service';
import { SupabaseService } from './supabase.service';
import { NoteService } from './note.service';
import { AuthStateService } from './auth-state.service';
import { LoadingService } from './loading.service';
import { DeviceFingerprintService } from './device-fingerprint.service';
import { EncryptionService } from './encryption.service';
import { ActivityLogService } from './activity-log.service';
import { NotificationService } from './notification.service';

const makeMockClient = (overrides: any = {}) => ({
  from: jest.fn().mockImplementation((table: string) => ({
    insert: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({
      data: overrides.insertData || null,
      error: overrides.insertError || null,
    }),
    maybeSingle: jest
      .fn()
      .mockResolvedValue({ data: overrides.maybeSingleData || null, error: null }),
    update: jest.fn().mockResolvedValue({ error: overrides.updateError || null }),
    delete: jest.fn().mockResolvedValue({ error: overrides.deleteError || null }),
  })),
  rpc: jest.fn().mockResolvedValue({ error: overrides.rpcError || null }),
  storage: {
    from: jest.fn().mockReturnThis(),
    upload: jest.fn().mockResolvedValue({ error: overrides.uploadError || null }),
  },
});

describe('ShareService', () => {
  let service: ShareService;
  let mockSupabase: any;
  let mockNoteService: any;
  let mockAuth: any;
  let mockLoading: any;
  let mockFingerprint: any;
  let mockEncryption: any;
  let mockActivityLog: any;
  let mockNotification: any;

  beforeEach(() => {
    mockSupabase = { client: makeMockClient() };
    mockNoteService = {
      getNote: jest.fn().mockResolvedValue({ id: 'n1', title: 'T' }),
      decryptNoteAtSource: jest.fn().mockResolvedValue(undefined),
      fetchStorageContent: jest.fn().mockResolvedValue('file content'),
      createNote: jest.fn().mockResolvedValue({ id: 'new1' }),
    };
    mockAuth = { userId: jest.fn().mockReturnValue('u1') };
    mockLoading = { start: jest.fn(), stop: jest.fn() };
    mockFingerprint = { getDeviceFingerprint: jest.fn().mockResolvedValue('fp1') };
    mockEncryption = {
      hasKey: jest.fn().mockReturnValue(true),
      decryptText: jest.fn().mockResolvedValue('decrypted'),
    };
    mockActivityLog = { logActivity: jest.fn().mockResolvedValue({ id: 'a1' }) };
    mockNotification = { createNotification: jest.fn().mockResolvedValue({}) };

    TestBed.configureTestingModule({
      providers: [
        { provide: SupabaseService, useValue: mockSupabase },
        { provide: NoteService, useValue: mockNoteService },
        { provide: AuthStateService, useValue: mockAuth },
        { provide: LoadingService, useValue: mockLoading },
        { provide: DeviceFingerprintService, useValue: mockFingerprint },
        { provide: EncryptionService, useValue: mockEncryption },
        { provide: ActivityLogService, useValue: mockActivityLog },
        { provide: NotificationService, useValue: mockNotification },
      ],
    });

    // Inject the service so Angular's inject() field initializers work
    service = TestBed.inject(ShareService);
  });

  it('generateShareUrl uses window.origin', () => {
    const origin = window.location.origin;
    const url = service.generateShareUrl('tok');
    expect(url).toBe(`${origin}/share/tok`);
  });

  it('createShare throws when unauthenticated', async () => {
    mockAuth.userId.mockReturnValueOnce(null);
    await expect(service.createShare('n1', 'readonly')).rejects.toThrow('User not authenticated');
  });

  it('createShare throws when note not found', async () => {
    mockNoteService.getNote.mockResolvedValueOnce(null);
    await expect(service.createShare('n1', 'readonly')).rejects.toThrow('Note not found');
  });

  it('createShare throws when decrypt fails', async () => {
    mockNoteService.getNote.mockResolvedValueOnce({ id: 'n1', is_encrypted: true });
    mockNoteService.decryptNoteAtSource.mockRejectedValueOnce(new Error('decrypt fail'));
    await expect(service.createShare('n1', 'readonly')).rejects.toThrow(
      'Failed to decrypt note for sharing',
    );
  });

  it('createShare success calls insert and logs activity', async () => {
    const expectedShare = { id: 's1', share_token: 'tok' };
    // Spy on the internal token generator to avoid relying on crypto
    jest.spyOn(service as any, 'generateShareToken').mockReturnValue('tok');
    mockSupabase.client = makeMockClient({ insertData: expectedShare });
    // avoid actually creating public folder
    jest.spyOn(service as any, 'addToPublicFolder').mockResolvedValue(undefined);

    const res = await service.createShare('n1', 'readonly', null, null);

    expect(res).toEqual(expectedShare);
    expect(mockLoading.start).toHaveBeenCalled();
    expect(mockActivityLog.logActivity).toHaveBeenCalled();
  });

  it('getSharesForNote throws if unauthenticated', async () => {
    mockAuth.userId.mockReturnValueOnce(null);
    await expect(service.getSharesForNote('n1')).rejects.toThrow('User not authenticated');
  });

  it('getSharesForNote returns data', async () => {
    const data = [{ id: 's1' }];
    // setup from(...) chain to support .select().eq().eq()
    const inner = {
      eq: jest
        .fn()
        .mockImplementation(() => ({ eq: jest.fn().mockResolvedValue({ data, error: null }) })),
    };
    const obj = { select: jest.fn().mockReturnValue(inner) };
    mockSupabase.client.from = jest.fn().mockReturnValue(obj as any);

    const shares = await service.getSharesForNote('n1');
    expect(shares).toEqual(data);
  });

  it('updatePublicShare requires auth', async () => {
    mockAuth.userId.mockReturnValueOnce(null);
    await expect(service.updatePublicShare('s1', {})).rejects.toThrow('User not authenticated');
  });

  it('deleteShare requires auth', async () => {
    mockAuth.userId.mockReturnValueOnce(null);
    await expect(service.deleteShare('s1')).rejects.toThrow('User not authenticated');
  });

  it('updatePublicContent throws when unauthenticated', async () => {
    mockAuth.userId.mockReturnValueOnce(null);
    await expect(service.updatePublicContent('tok', 'c')).rejects.toThrow(
      'Authentication required to edit shared notes',
    );
  });

  it('updatePublicContent workflow when editable and saved by another user', async () => {
    // setup authenticated user different to share owner
    mockAuth.userId.mockReturnValue('editor');
    // stub getShareByToken to return editable share
    jest.spyOn(service as any, 'getShareByToken').mockResolvedValue({
      id: 's1',
      user_id: 'owner',
      permission: 'editable',
      note_id: 'n1',
      note_title: 'T',
    });

    // mock storage upload success and notes.update success
    mockSupabase.client.storage = {
      from: jest.fn().mockReturnThis(),
      upload: jest.fn().mockResolvedValue({ error: null }),
    };
    mockSupabase.client.from = jest.fn().mockImplementation((table: string) => ({
      update: jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) }),
    }));

    await expect(service.updatePublicContent('tok', 'content')).resolves.toBeUndefined();

    expect(mockSupabase.client.storage.from).toHaveBeenCalled();
    expect(mockActivityLog.logActivity).toHaveBeenCalled();
    expect(mockNotification.createNotification).toHaveBeenCalled();
  });

  it('getShareByToken returns null for expired shares', async () => {
    // expired share
    const expiredShare = {
      id: 's1',
      expires_at: '2000-01-01',
      max_views: null,
      view_count: 0,
      user_id: 'u1',
    };
    mockSupabase.client.from = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: expiredShare, error: null }),
    } as any);
    const res = await service.getShareByToken('tok');
    expect(res).toBeNull();
  });

  it('getShareByToken returns null when max views reached', async () => {
    const share = { id: 's2', expires_at: null, max_views: 5, view_count: 5, user_id: 'u1' };
    mockSupabase.client.from = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: share, error: null }),
    } as any);
    const res = await service.getShareByToken('tok2');
    expect(res).toBeNull();
  });

  it('getShareByTokenInternal handles storage fetch errors gracefully', async () => {
    // share and RPC returns storage path that then fails to fetch
    const share = { id: 's3', expires_at: null, max_views: null, view_count: 0, user_id: 'u1' };
    mockSupabase.client.from = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: share, error: null }),
    } as any);
    mockSupabase.client.rpc = jest.fn().mockResolvedValue({
      data: [{ note_content: 'storage://notes/x.md', note_title: 'T', is_encrypted: false }],
      error: null,
    });
    (TestBed.inject(NoteService) as any).fetchStorageContent.mockRejectedValueOnce(
      new Error('storage fail'),
    );

    const res = await (service as any).getShareByTokenInternal('tok3');
    expect(res).not.toBeNull();
    expect((res as any).content).toContain('Content unavailable');
  });

  it('getShareByTokenInternal marks encrypted content when no key present', async () => {
    const share = { id: 's4', expires_at: null, max_views: null, view_count: 0, user_id: 'u1' };
    mockSupabase.client.from = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: share, error: null }),
    } as any);
    mockSupabase.client.rpc = jest.fn().mockResolvedValue({
      data: [{ note_content: 'encryptedcontent', note_title: 'T', is_encrypted: true }],
      error: null,
    });
    (TestBed.inject(EncryptionService) as any).hasKey = jest.fn().mockReturnValue(false);

    const res = await (service as any).getShareByTokenInternal('tok4');
    expect(res).not.toBeNull();
    expect((res as any).requiresEncryptionKey).toBe(true);
    expect((res as any).content).toContain('encrypted');
  });

  it('incrementViewCount falls back to manual update when RPC errors', async () => {
    // setup fingerprint
    (TestBed.inject(DeviceFingerprintService) as any).getDeviceFingerprint.mockResolvedValue('fpx');
    // make RPC return error
    mockSupabase.client.rpc = jest.fn().mockResolvedValue({ error: { code: 'E' } });

    // mock select single to return a share with view_count
    const selectSingle = jest.fn().mockResolvedValue({ data: { view_count: 2 } });
    const updateMock = jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({}) });
    mockSupabase.client.from = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: selectSingle,
      update: updateMock,
    } as any);

    await (service as any).incrementViewCount('s5');

    expect(selectSingle).toHaveBeenCalled();
    expect(updateMock).toHaveBeenCalled();
  });

  it('getShareByTokenInternal handles decrypt failure when key present', async () => {
    const share = { id: 's6', expires_at: null, max_views: null, view_count: 0, user_id: 'u1' };
    mockSupabase.client.from = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: share, error: null }),
    } as any);
    mockSupabase.client.rpc = jest.fn().mockResolvedValue({
      data: [{ note_content: 'encdata', note_title: 'T', is_encrypted: true }],
      error: null,
    });
    (TestBed.inject(EncryptionService) as any).hasKey = jest.fn().mockReturnValue(true);
    (TestBed.inject(EncryptionService) as any).decryptText = jest
      .fn()
      .mockRejectedValue(new Error('boom'));

    const res = await (service as any).getShareByTokenInternal('tok6');
    expect(res).not.toBeNull();
    expect((res as any).requiresEncryptionKey).toBe(true);
    expect((res as any).content).toContain('Failed to decrypt');
  });

  it('incrementViewCount RPC success avoids manual update', async () => {
    (TestBed.inject(DeviceFingerprintService) as any).getDeviceFingerprint.mockResolvedValue('fp2');
    const rpcMock = jest.fn().mockResolvedValue({ error: null });
    mockSupabase.client.rpc = rpcMock;
    // ensure fallback path not executed
    mockSupabase.client.from = jest.fn();

    await (service as any).incrementViewCount('s7');

    expect(rpcMock).toHaveBeenCalled();
    expect(mockSupabase.client.from).not.toHaveBeenCalled();
  });

  it('incrementViewCount when no share data does not throw', async () => {
    (TestBed.inject(DeviceFingerprintService) as any).getDeviceFingerprint.mockResolvedValue('fp3');
    mockSupabase.client.rpc = jest.fn().mockResolvedValue({ error: { code: 'E' } });
    const selectSingle = jest.fn().mockResolvedValue({ data: null });
    mockSupabase.client.from = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: selectSingle,
    } as any);

    await expect((service as any).incrementViewCount('s8')).resolves.toBeUndefined();
    expect(selectSingle).toHaveBeenCalled();
  });

  it('getShareByToken increments view count when share found', async () => {
    jest.spyOn(service as any, 'getShareByTokenInternal').mockResolvedValue({ id: 's9' } as any);
    const incSpy = jest.spyOn(service as any, 'incrementViewCount').mockResolvedValue(undefined);

    const res = await service.getShareByToken('tok9');
    expect(res).toEqual({ id: 's9' });
    expect(incSpy).toHaveBeenCalledWith('s9');
  });

  it('getShareByToken does not increment when no share', async () => {
    jest.spyOn(service as any, 'getShareByTokenInternal').mockResolvedValue(null);
    const incSpy = jest.spyOn(service as any, 'incrementViewCount').mockResolvedValue(undefined);

    const res = await service.getShareByToken('tok10');
    expect(res).toBeNull();
    expect(incSpy).not.toHaveBeenCalled();
  });

  it('createShare throws when insert fails', async () => {
    jest.spyOn(service as any, 'generateShareToken').mockReturnValue('tokx');
    // Make insert return an error
    mockSupabase.client = makeMockClient({ insertError: new Error('insert fail') });
    await expect(service.createShare('n1', 'readonly')).rejects.toThrow();
  });

  it('createShare throws when addToPublicFolder fails', async () => {
    jest.spyOn(service as any, 'generateShareToken').mockReturnValue('toky');
    mockSupabase.client = makeMockClient({ insertData: { id: 's2', share_token: 'toky' } });
    jest.spyOn(service as any, 'addToPublicFolder').mockRejectedValue(new Error('folder fail'));

    await expect(service.createShare('n1', 'readonly')).rejects.toThrow('folder fail');
  });

  it('updatePublicContent throws when storage upload fails', async () => {
    // Setup editable share
    jest.spyOn(service as any, 'getShareByToken').mockResolvedValue({
      id: 's3',
      user_id: 'uowner',
      permission: 'editable',
      note_id: 'n1',
      note_title: 'T',
    } as any);
    mockSupabase.client.storage = {
      from: jest.fn().mockReturnThis(),
      upload: jest.fn().mockResolvedValue({ error: new Error('boom') }),
    } as any;

    await expect(service.updatePublicContent('tok', 'new')).rejects.toThrow(
      'Failed to save changes to storage',
    );
  });

  it('updatePublicContent proceeds when note update fails (warns but does not throw) and still notifies', async () => {
    jest.spyOn(service as any, 'getShareByToken').mockResolvedValue({
      id: 's4',
      user_id: 'uowner',
      permission: 'editable',
      note_id: 'n2',
      note_title: 'T',
    } as any);
    mockSupabase.client.storage = {
      from: jest.fn().mockReturnThis(),
      upload: jest.fn().mockResolvedValue({ error: null }),
    } as any;
    mockSupabase.client.from = jest.fn().mockReturnValue({
      update: jest
        .fn()
        .mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: { code: 'E' } }) }),
    } as any);

    const spy = jest.spyOn(mockNotification, 'createNotification').mockResolvedValue({});
    const activitySpy = jest
      .spyOn(mockActivityLog, 'logActivity')
      .mockResolvedValue({ id: 'a2' } as any);

    // When edited by another user
    mockAuth.userId.mockReturnValue('editor');

    await expect(service.updatePublicContent('tok', 'new')).resolves.toBeUndefined();
    expect(activitySpy).toHaveBeenCalled();
    expect(spy).toHaveBeenCalled();
  });

  it('getShareByTokenInternal handles RPC error by returning share without content', async () => {
    const share = { id: 's5', expires_at: null, max_views: null, view_count: 0, user_id: 'u1' };
    mockSupabase.client.from = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: share, error: null }),
    } as any);
    mockSupabase.client.rpc = jest.fn().mockResolvedValue({ data: null, error: { code: 'E' } });

    const res = await (service as any).getShareByTokenInternal('tk');
    expect(res).not.toBeNull();
    expect((res as any).content).toBeUndefined();
  });

  it('incrementViewCount fallback update error does not throw', async () => {
    (TestBed.inject(DeviceFingerprintService) as any).getDeviceFingerprint.mockResolvedValue('fpz');
    mockSupabase.client.rpc = jest.fn().mockResolvedValue({ error: { code: 'E' } });
    const selectSingle = jest
      .fn()
      .mockResolvedValue({ data: { view_count: 1, id: 's6', note_id: 'n1' } });
    const updateMock = jest
      .fn()
      .mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: new Error('update fail') }) });
    mockSupabase.client.from = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: selectSingle,
      update: updateMock,
    } as any);

    await expect((service as any).incrementViewCount('s6')).resolves.toBeUndefined();
    expect(updateMock).toHaveBeenCalled();
  });

  it('ensurePublicFolder returns linked folder when profile has public_folder_id', async () => {
    const folder = { id: 'pf1' };
    mockSupabase.client.from = jest.fn().mockImplementation((table: string) => {
      if (table === 'user_profiles') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: { public_folder_id: 'pf1' } }),
        } as any;
      }
      if (table === 'folders') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({ data: folder }),
        } as any;
      }
      return makeMockClient();
    });

    const res = await (service as any).ensurePublicFolder('u1');
    expect(res).toEqual(folder);
  });

  it('ensurePublicFolder links and returns existing Public folder when found', async () => {
    const existing = { id: 'existing1' };
    mockSupabase.client.from = jest.fn().mockImplementation((table: string) => {
      if (table === 'user_profiles') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: { public_folder_id: null } }),
          update: jest.fn().mockReturnThis(),
        } as any;
      }
      if (table === 'folders') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          is: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({ data: existing }),
        } as any;
      }
      return makeMockClient();
    });

    const res = await (service as any).ensurePublicFolder('u2');
    expect(res).toEqual(existing);
  });

  it('ensurePublicFolder creates new Public folder when none exists', async () => {
    const pub = { id: 'pub1' };
    mockSupabase.client.from = jest.fn().mockImplementation((table: string) => {
      if (table === 'user_profiles') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: { public_folder_id: null } }),
          update: jest.fn().mockReturnThis(),
        } as any;
      }
      if (table === 'folders') {
        // First maybeSingle returns { data: null }, then insert returns public folder
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          // ensure is() is present for the chain in production code
          is: jest
            .fn()
            .mockReturnValue({ maybeSingle: jest.fn().mockResolvedValue({ data: null }) }),
          maybeSingle: jest.fn().mockResolvedValue({ data: null }),
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: pub, error: null }),
          }),
        } as any;
      }
      return makeMockClient();
    });

    const res = await (service as any).ensurePublicFolder('u3');
    expect(res).toEqual(pub);
  });

  it('getSharedNotesForUser returns empty array on error', async () => {
    mockSupabase.client.from = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ data: null, error: { code: 'E' } }),
    } as any);
    const res = await (service as any).getSharedNotesForUser('u1');
    expect(res).toEqual([]);
  });

  it('importPublicShare throws when original share not found', async () => {
    jest.spyOn(service as any, 'getShareByToken').mockResolvedValue(null);
    await expect(service.importPublicShare('u1', 'tokx')).rejects.toThrow('Share not found');
  });

  it('importPublicShare success flow creates note and share', async () => {
    const original = { id: 'os', content: 'c', note_title: 'T', user_id: 'owner' } as any;
    jest.spyOn(service as any, 'getShareByToken').mockResolvedValue(original);
    jest.spyOn(service as any, 'ensureImportsFolder').mockResolvedValue({ id: 'imp1' } as any);
    (TestBed.inject(NoteService) as any).createNote.mockResolvedValue({ id: 'newn' });
    jest.spyOn(service as any, 'createShare').mockResolvedValue({ id: 'snew' } as any);

    const res = await service.importPublicShare('u2', 'orig');
    expect((TestBed.inject(NoteService) as any).createNote).toHaveBeenCalled();
    expect(res).toEqual({ id: 'snew' });
  });

  it('updatePublicShare succeeds when supabase returns no error', async () => {
    mockAuth.userId.mockReturnValue('u1');
    mockSupabase.client.from = jest.fn().mockReturnValue({
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) }),
      }),
    } as any);

    await expect(
      service.updatePublicShare('s1', { permission: 'readonly' }),
    ).resolves.toBeUndefined();
  });

  it('updatePublicShare throws when supabase returns error', async () => {
    mockAuth.userId.mockReturnValue('u1');
    mockSupabase.client.from = jest.fn().mockReturnValue({
      update: jest
        .fn()
        .mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: { code: 'E' } }) }),
    } as any);

    await expect(service.updatePublicShare('s1', { permission: 'readonly' })).rejects.toThrow();
  });

  it('deleteShare removes public folder link when no other shares exist', async () => {
    mockAuth.userId.mockReturnValue('u1');
    const share = {
      id: 'sdel',
      note_id: 'n1',
      share_token: 'tok',
      permission: 'readonly',
      user_id: 'u1',
    } as any;
    mockSupabase.client.from = jest.fn().mockImplementation((table: string) => {
      if (table === 'public_shares') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: share }),
          delete: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) }),
          }),
        } as any;
      }
      return makeMockClient();
    });

    const removeSpy = jest
      .spyOn(service as any, 'removeFromPublicFolder')
      .mockResolvedValue(undefined);
    jest.spyOn(service as any, 'getSharesForNote').mockResolvedValue([] as any);

    await service.deleteShare('sdel');

    expect(removeSpy).toHaveBeenCalledWith('n1', 'u1');
  });

  it('deleteShare throws when share not found', async () => {
    mockAuth.userId.mockReturnValue('u1');
    mockSupabase.client.from = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null }),
    } as any);

    await expect(service.deleteShare('missing')).rejects.toThrow('Share not found');
  });

  it('incrementViewCount throws when fingerprint retrieval fails', async () => {
    (TestBed.inject(DeviceFingerprintService) as any).getDeviceFingerprint.mockRejectedValue(
      new Error('fpfail'),
    );
    await expect((service as any).incrementViewCount('sx')).rejects.toThrow('fpfail');
  });
});
