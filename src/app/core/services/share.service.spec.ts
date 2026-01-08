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
    single: jest.fn().mockResolvedValue({ data: overrides.insertData || null, error: overrides.insertError || null }),
    maybeSingle: jest.fn().mockResolvedValue({ data: overrides.maybeSingleData || null, error: null }),
    update: jest.fn().mockResolvedValue({ error: overrides.updateError || null }),
    delete: jest.fn().mockResolvedValue({ error: overrides.deleteError || null }),
  })),
  rpc: jest.fn().mockResolvedValue({ error: overrides.rpcError || null }),
  storage: {
    from: jest.fn().mockReturnThis(),
    upload: jest.fn().mockResolvedValue({ error: overrides.uploadError || null })
  }
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
      createNote: jest.fn().mockResolvedValue({ id: 'new1' })
    };
    mockAuth = { userId: jest.fn().mockReturnValue('u1') };
    mockLoading = { start: jest.fn(), stop: jest.fn() };
    mockFingerprint = { getDeviceFingerprint: jest.fn().mockResolvedValue('fp1') };
    mockEncryption = { hasKey: jest.fn().mockReturnValue(true), decryptText: jest.fn().mockResolvedValue('decrypted') };
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
      ]
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
    await expect(service.createShare('n1', 'readonly')).rejects.toThrow('Failed to decrypt note for sharing');
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
    const inner = { eq: jest.fn().mockImplementation(() => ({ eq: jest.fn().mockResolvedValue({ data, error: null }) })) };
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
    await expect(service.updatePublicContent('tok', 'c')).rejects.toThrow('Authentication required to edit shared notes');
  });

  it('updatePublicContent workflow when editable and saved by another user', async () => {
    // setup authenticated user different to share owner
    mockAuth.userId.mockReturnValue('editor');
    // stub getShareByToken to return editable share
    jest.spyOn(service as any, 'getShareByToken').mockResolvedValue({ id: 's1', user_id: 'owner', permission: 'editable', note_id: 'n1', note_title: 'T' });

    // mock storage upload success and notes.update success
    mockSupabase.client.storage = { from: jest.fn().mockReturnThis(), upload: jest.fn().mockResolvedValue({ error: null }) };
    mockSupabase.client.from = jest.fn().mockImplementation((table: string) => ({ update: jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) }) }));

    await expect(service.updatePublicContent('tok', 'content')).resolves.toBeUndefined();

    expect(mockSupabase.client.storage.from).toHaveBeenCalled();
    expect(mockActivityLog.logActivity).toHaveBeenCalled();
    expect(mockNotification.createNotification).toHaveBeenCalled();
  });

});
