import { TestBed } from '@angular/core/testing';
import { NoteService } from './note.service';
import { SupabaseService } from './supabase.service';
import { LoadingService } from './loading.service';
import { EncryptionService } from './encryption.service';
import { ActivityLogService } from './activity-log.service';
import { NotificationService } from './notification.service';

const makeMockClient = (overrides: any = {}) => {
  // A simple chainable query mock that remembers the last operation so `single()`
  // can return the appropriate data (insert vs update) in tests.
  let lastOp = '';
  let lastWriteOp = '';
  const query: any = {
    insert: jest.fn().mockImplementation(() => { lastOp = 'insert'; lastWriteOp = 'insert'; return query; }),
    update: jest.fn().mockImplementation(() => { lastOp = 'update'; lastWriteOp = 'update'; return query; }),
    select: jest.fn().mockImplementation(() => { lastOp = 'select'; return query; }),
    delete: jest.fn().mockImplementation(() => { lastOp = 'delete'; lastWriteOp = 'delete'; return query; }),
    order: jest.fn().mockImplementation(() => { lastOp = 'order'; return query; }),
    maybeSingle: jest.fn().mockResolvedValue({ data: overrides.maybeSingleData || null, error: null }),
    eq: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    single: jest.fn().mockImplementation(() => {
      // If the last operation was a select, and the previous write was insert/update,
      // return the corresponding write result (insert/update) — this matches PostgREST
      if (lastOp === 'select') {
        if (lastWriteOp === 'insert') {
          return Promise.resolve({ data: overrides.insertData ?? null, error: overrides.insertError ?? null });
        }
        if (lastWriteOp === 'update') {
          return Promise.resolve({ data: overrides.updateData ?? null, error: overrides.updateError ?? null });
        }
        return Promise.resolve({ data: overrides.selectData ?? overrides.maybeSingleData ?? null, error: overrides.selectError ?? null });
      }
      const data = lastWriteOp === 'update' ? (overrides.updateData ?? null) : (lastWriteOp === 'insert' ? (overrides.insertData ?? null) : null);
      const error = lastWriteOp === 'update' ? (overrides.updateError ?? null) : (lastWriteOp === 'insert' ? (overrides.insertError ?? null) : null);
      return Promise.resolve({ data, error });
    }),
  };

  return {
    from: jest.fn().mockImplementation(() => query),
    storage: {
      from: jest.fn().mockReturnThis(),
      upload: jest.fn().mockResolvedValue({ error: overrides.uploadError || null }),
      createSignedUrl: jest.fn().mockResolvedValue({ data: { signedUrl: overrides.signedUrl || 'https://signed' }, error: overrides.signedUrlError || null })
    }
  };
};

describe('NoteService', () => {
  let service: NoteService;
  let mockSupabase: any;
  let mockLoading: any;
  let mockEncryption: any;
  let mockActivity: any;
  let mockNotification: any;

  beforeEach(() => {
    mockSupabase = makeMockClient();
    mockLoading = { withLoading: jest.fn((fn: any) => fn()) };
    mockEncryption = { hasKey: jest.fn().mockReturnValue(false), encryptText: jest.fn(), decryptText: jest.fn() };
    mockActivity = { logActivity: jest.fn().mockResolvedValue({ id: 'a1' }) };
    mockNotification = { createNotification: jest.fn().mockResolvedValue({}) };

    TestBed.configureTestingModule({
      providers: [
        NoteService,
        { provide: SupabaseService, useValue: mockSupabase },
        { provide: LoadingService, useValue: mockLoading },
        { provide: EncryptionService, useValue: mockEncryption },
        { provide: ActivityLogService, useValue: mockActivity },
        { provide: NotificationService, useValue: mockNotification },
      ]
    });

    service = TestBed.inject(NoteService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    (global as any).fetch = undefined;
  });

  it('createNote uploads empty content and returns final when no content', async () => {
    const created = { id: 'n1', title: 'T' };
    const client = makeMockClient({ insertData: created, updateData: { ...created, content: 'storage://notes/u/n1.md' } });
    mockSupabase.from = client.from;
    mockSupabase.storage = client.storage;

    // stub getNote to avoid further signed url fetch resolution
    const getNoteSpy = jest.spyOn(service as any, 'getNote').mockResolvedValue({ ...created, content: 'file content' });

    const res = await service.createNote('u', { title: 'T', content: '' } as any);

    expect(mockSupabase.from).toHaveBeenCalled();
    expect(mockActivity.logActivity).toHaveBeenCalled();
    expect(getNoteSpy).toHaveBeenCalledWith(created.id, 'u');
    expect(res.content).toBe('file content');
  });

  it('createNote encrypts when key present and sets is_encrypted', async () => {
    mockEncryption.hasKey.mockReturnValue(true);
    mockEncryption.encryptText.mockResolvedValue('enc:123');

    const created = { id: 'n2', title: 'Enc' };
    const client2 = makeMockClient({ insertData: created, updateData: { ...created, content: 'storage://notes/u/n2.md', is_encrypted: true } });
    mockSupabase.from = client2.from;
    mockSupabase.storage = client2.storage;
    // avoid verify upload internals
    jest.spyOn(service as any, 'verifyUpload').mockResolvedValue(undefined);

    const res = await service.createNote('u', { title: 'Enc', content: 'secret' } as any);

    expect(mockEncryption.encryptText).toHaveBeenCalledWith('secret');
    expect(res).toBeTruthy();
  });

  it('getNote returns null on PGRST116 error', async () => {
    const q: any = { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }) };
    mockSupabase.from = jest.fn().mockReturnValue(q);

    const res = await service.getNote('n1', 'u');
    expect(res).toBeNull();
  });

  it('getNote fetches and decrypts content when is_encrypted and has key', async () => {
    mockEncryption.hasKey.mockReturnValue(true);
    mockEncryption.decryptText.mockResolvedValue('decrypted content');

    const noteRow = { id: 'n1', content: 'storage://notes/n1.md', is_encrypted: true };
    const q: any = { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: noteRow, error: null }) };
    mockSupabase.from = jest.fn().mockReturnValue(q);
    mockSupabase.storage = { from: jest.fn().mockReturnThis(), createSignedUrl: jest.fn().mockResolvedValue({ data: { signedUrl: 'https://signed' }, error: null }) };

    (global as any).fetch = jest.fn().mockResolvedValue({ ok: true, text: jest.fn().mockResolvedValue('enc:payload') });

    const res = await service.getNote('n1', 'u');
    expect(res?.content).toBe('decrypted content');
    expect(mockEncryption.decryptText).toHaveBeenCalledWith('enc:payload');
  });

  // -- Additional tests to increase coverage for NoteService --
  it('verifyUpload succeeds when signed url and fetch return content', async () => {
    mockSupabase.storage.createSignedUrl.mockResolvedValue({ data: { signedUrl: 'https://signed' }, error: null });
    (global as any).fetch = jest.fn().mockResolvedValue({ ok: true, text: jest.fn().mockResolvedValue('file content') });
    await expect((service as any).verifyUpload('u/n1.md')).resolves.toBeUndefined();
  });

  it('verifyUpload throws when createSignedUrl fails', async () => {
    mockSupabase.storage.createSignedUrl.mockResolvedValue({ data: null, error: { code: 'ERR' } });
    await expect((service as any).verifyUpload('u/n1.md')).rejects.toBeTruthy();
  });

  it('verifyUpload throws when fetch returns non-ok', async () => {
    mockSupabase.storage.createSignedUrl.mockResolvedValue({ data: { signedUrl: 'https://signed' }, error: null });
    (global as any).fetch = jest.fn().mockResolvedValue({ ok: false, status: 500 });
    await expect((service as any).verifyUpload('u/n1.md')).rejects.toThrow('Signed URL fetch failed');
  });

  it('verifyUpload throws when fetched body is empty', async () => {
    mockSupabase.storage.createSignedUrl.mockResolvedValue({ data: { signedUrl: 'https://signed' }, error: null });
    (global as any).fetch = jest.fn().mockResolvedValue({ ok: true, text: jest.fn().mockResolvedValue('') });
    await expect((service as any).verifyUpload('u/n1.md')).rejects.toThrow('Uploaded file is empty');
  });

  it('updateNote migrates raw DB content to storage and marks encrypted when encryption enabled', async () => {
    mockEncryption.hasKey.mockReturnValue(true);
    mockEncryption.encryptText.mockResolvedValue('encpayload');

    const selectQ: any = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { id: 'n3', content: 'raw old content' }, error: null }),
      update: jest.fn().mockImplementation(() => ({ eq: jest.fn().mockReturnThis(), select: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: { id: 'n3', content: 'storage://notes/u/n3.md', is_encrypted: true }, error: null }) }))
    };
    mockSupabase.from = jest.fn().mockReturnValue(selectQ);
    mockSupabase.storage = { from: jest.fn().mockReturnThis(), upload: jest.fn().mockResolvedValue({ error: null }), createSignedUrl: jest.fn().mockResolvedValue({ data: { signedUrl: 'https://signed' }, error: null }) };
    // verifyUpload calls fetch — mock fetch to return non-empty content so verification passes
    (global as any).fetch = jest.fn().mockResolvedValue({ ok: true, text: jest.fn().mockResolvedValue('ok') });

    const res = await service.updateNote('n3', 'u', { title: 'Updated' } as any);
    expect(mockEncryption.encryptText).toHaveBeenCalledWith('raw old content');
    expect(mockSupabase.storage.upload).toHaveBeenCalled();
    expect(res.content).toContain('storage://');
  });

  it('updateNote overwrites storage when dto.content provided and encrypts when needed', async () => {
    mockEncryption.hasKey.mockReturnValue(true);
    mockEncryption.encryptText.mockResolvedValue('encpayload2');

    const selectQ: any = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { id: 'n4', content: 'storage://notes/u/n4.md' }, error: null }),
      update: jest.fn().mockImplementation(() => ({ eq: jest.fn().mockReturnThis(), select: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: { id: 'n4', content: 'storage://notes/u/n4.md', is_encrypted: true }, error: null }) }))
    };
    mockSupabase.from = jest.fn().mockReturnValue(selectQ);
    mockSupabase.storage = { from: jest.fn().mockReturnThis(), upload: jest.fn().mockResolvedValue({ error: null }), createSignedUrl: jest.fn().mockResolvedValue({ data: { signedUrl: 'https://signed' }, error: null }) };
    (global as any).fetch = jest.fn().mockResolvedValue({ ok: true, text: jest.fn().mockResolvedValue('ok') });

    const res = await service.updateNote('n4', 'u', { content: 'new text' } as any);
    expect(mockEncryption.encryptText).toHaveBeenCalledWith('new text');
    expect(mockSupabase.storage.upload).toHaveBeenCalled();
    expect(res.content).toContain('storage://');
  });

  it('getNote throws when content fetch fails', async () => {
    const noteRow = { id: 'n5', content: 'storage://notes/n5.md', is_encrypted: false };
    const q: any = { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: noteRow, error: null }) };
    mockSupabase.from = jest.fn().mockReturnValue(q);
    mockSupabase.storage = { from: jest.fn().mockReturnThis(), createSignedUrl: jest.fn().mockResolvedValue({ data: { signedUrl: 'https://signed' }, error: null }) };
    (global as any).fetch = jest.fn().mockResolvedValue({ ok: false, status: 403 });

    await expect(service.getNote('n5', 'u')).rejects.toThrow('Signed URL fetch failed');
  });

  it('uploadDocument rejects large files and blocked extensions', async () => {
    const bigBlob = new Blob([new ArrayBuffer(6 * 1024 * 1024)]);
    const bigFile = new File([bigBlob], 'big.md', { type: 'text/markdown' });
    await expect(service.uploadDocument('u', bigFile, null)).rejects.toThrow('File size exceeds 5MB limit');

    const exeFile = new File([new ArrayBuffer(100)], 'bad.exe', { type: 'application/octet-stream' });
    await expect(service.uploadDocument('u', exeFile, null)).rejects.toThrow('Executable files are not allowed');
  });

});