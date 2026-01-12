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

  it('decryptNoteAtSource throws when note not found', async () => {
    const q: any = { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: null, error: null }) };
    mockSupabase.from = jest.fn().mockReturnValue(q);
    await expect(service.decryptNoteAtSource('n1', 'u')).rejects.toThrow('Note not found or access denied');
  });

  it('decryptNoteAtSource re-uploads and marks unencrypted when content already plain', async () => {
    const note = { id: 'n2', content: 'plain text', is_encrypted: true };
    const q: any = { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: note, error: null }) };
    mockSupabase.from = jest.fn().mockReturnValue(q);
    mockSupabase.storage = { from: jest.fn().mockReturnThis(), upload: jest.fn().mockResolvedValue({ error: null }) } as any;
    // update should resolve
    const updateQ: any = { update: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: {}, error: null }) };
    mockSupabase.from = jest.fn().mockReturnValueOnce(q).mockReturnValueOnce(updateQ);

    await expect(service.decryptNoteAtSource('n2', 'u')).resolves.toBeUndefined();
    expect(mockSupabase.storage.upload).toHaveBeenCalled();
  });

  it('decryptNoteAtSource throws when encrypted and key not loaded', async () => {
    const note = { id: 'n3', content: 'enc:v1:payload', is_encrypted: true };
    const q: any = { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: note, error: null }) };
    mockSupabase.from = jest.fn().mockReturnValue(q);
    (mockEncryption as any).hasKey.mockReturnValue(false);
    await expect(service.decryptNoteAtSource('n3', 'u')).rejects.toThrow('Encryption key not loaded');
  });

  it('decryptNoteAtSource decrypts and reuploads when key present', async () => {
    const note = { id: 'n4', content: 'enc:v1:payload', is_encrypted: true };
    const q: any = { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: note, error: null }) };
    const signedResp = { data: { signedUrl: 'https://signed' }, error: null };
    const storage = { from: jest.fn().mockReturnThis(), createSignedUrl: jest.fn().mockResolvedValue(signedResp), upload: jest.fn().mockResolvedValue({ error: null }) } as any;
    mockSupabase.from = jest.fn().mockReturnValue(q);
    mockSupabase.storage = storage;
    (mockEncryption as any).hasKey.mockReturnValue(true);
    (mockEncryption as any).decryptText.mockResolvedValue('plain');

    const updateQ: any = { update: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: {}, error: null }) };
    mockSupabase.from = jest.fn().mockReturnValueOnce(q).mockReturnValueOnce(updateQ);

    // fetch signed URL and return text
    (global as any).fetch = jest.fn().mockResolvedValue({ ok: true, text: jest.fn().mockResolvedValue('encpayload') });

    await expect(service.decryptNoteAtSource('n4', 'u')).resolves.toBeUndefined();
    expect(storage.upload).toHaveBeenCalled();
  });

  // fetchStorageContent tests
  it('fetchStorageContent returns decrypted content when key present', async () => {
    mockSupabase.storage.createSignedUrl.mockResolvedValue({ data: { signedUrl: 'https://signed' }, error: null });
    (global as any).fetch = jest.fn().mockResolvedValue({ ok: true, text: jest.fn().mockResolvedValue('encdata') });
    mockEncryption.hasKey.mockReturnValue(true);
    mockEncryption.decryptText.mockResolvedValue('plain');

    const res = await (service as any).fetchStorageContent('storage://notes/u/n1.md');
    expect(res).toBe('plain');
  });

  it('fetchStorageContent returns raw content when decryption fails', async () => {
    mockSupabase.storage.createSignedUrl.mockResolvedValue({ data: { signedUrl: 'https://signed' }, error: null });
    (global as any).fetch = jest.fn().mockResolvedValue({ ok: true, text: jest.fn().mockResolvedValue('encdata') });
    mockEncryption.hasKey.mockReturnValue(true);
    mockEncryption.decryptText.mockRejectedValue(new Error('boom'));
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const res = await (service as any).fetchStorageContent('storage://notes/u/n1.md');
    expect(res).toBe('encdata');
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('fetchStorageContent throws when signed URL creation fails', async () => {
    mockSupabase.storage.createSignedUrl.mockResolvedValue({ data: null, error: { code: 'ERR' } });
    await expect((service as any).fetchStorageContent('storage://notes/u/n1.md')).rejects.toBeTruthy();
  });

  it('fetchStorageContent throws when fetch returns non-ok', async () => {
    mockSupabase.storage.createSignedUrl.mockResolvedValue({ data: { signedUrl: 'https://signed' }, error: null });
    (global as any).fetch = jest.fn().mockResolvedValue({ ok: false, status: 404, statusText: 'Not Found' });
    await expect((service as any).fetchStorageContent('storage://notes/u/n1.md')).rejects.toThrow('Failed to fetch content');
  });

  // getFileBlob and getFileObjectUrl tests
  it('getFileBlob returns decrypted blob when encrypted and key present', async () => {
    const blob = new Blob(['data']);
    jest.spyOn(service as any, 'getNote').mockResolvedValue({ content: 'storage://notes/u/nfile.md', is_encrypted: true } as any);
    mockSupabase.storage.createSignedUrl.mockResolvedValue({ data: { signedUrl: 'https://signed' }, error: null });
    (global as any).fetch = jest.fn().mockResolvedValue({ ok: true, blob: jest.fn().mockResolvedValue(blob) });
    mockEncryption.hasKey.mockReturnValue(true);
    (mockEncryption as any).decryptBlob = jest.fn().mockResolvedValue(new Blob(['dec']));

    const res = await service.getFileBlob('nfile', 'u');
    expect(res).toBeInstanceOf(Blob);
    expect((mockEncryption as any).decryptBlob).toHaveBeenCalled();
  });

  it('getFileBlob throws when note not found or content not storage', async () => {
    jest.spyOn(service as any, 'getNote').mockResolvedValue(null);
    await expect(service.getFileBlob('missing', 'u')).rejects.toThrow('Note not found');

    jest.spyOn(service as any, 'getNote').mockResolvedValue({ content: 'plain text' } as any);
    await expect(service.getFileBlob('plain', 'u')).rejects.toThrow('Note content is not a file');
  });

  it('getFileObjectUrl returns url and revoke works', async () => {
    const blob = new Blob(['abc']);
    jest.spyOn(service as any, 'getFileBlob').mockResolvedValue(blob);
    const createSpy = jest.spyOn(URL, 'createObjectURL').mockReturnValue('blob:url');
    const revokeSpy = jest.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    const res = await service.getFileObjectUrl('nfile', 'u');
    expect(res.url).toBe('blob:url');
    res.revoke();
    expect(revokeSpy).toHaveBeenCalledWith('blob:url');

    createSpy.mockRestore();
    revokeSpy.mockRestore();
  });

  // Additional branch tests
  it('createNote throws when storage upload fails', async () => {
    const created = { id: 'nx', title: 'T' };
    const client = makeMockClient({ insertData: created });
    // make upload return an error
    client.storage.upload = jest.fn().mockResolvedValue({ error: new Error('upload fail') });
    mockSupabase.from = client.from;
    mockSupabase.storage = client.storage;

    await expect(service.createNote('u', { title: 'T', content: 'ok' } as any)).rejects.toBeTruthy();
  });

  it('createNote falls back to plaintext when encryption fails', async () => {
    mockEncryption.hasKey.mockReturnValue(true);
    mockEncryption.encryptText.mockRejectedValue(new Error('boom')); // force encryption to fail

    const created = { id: 'n5', title: 'T' };
    const client = makeMockClient({ insertData: created, updateData: { ...created, content: 'storage://notes/u/n5.md' } });
    client.storage.upload = jest.fn().mockResolvedValue({ error: null });
    client.storage.createSignedUrl = jest.fn().mockResolvedValue({ data: { signedUrl: 'https://signed' }, error: null });
    mockSupabase.from = client.from;
    mockSupabase.storage = client.storage;

    // stub fetch used by verifyUpload and getNote
    (global as any).fetch = jest.fn().mockResolvedValue({ ok: true, text: jest.fn().mockResolvedValue('file content') });

    const res = await service.createNote('u', { title: 'T', content: 'secret' } as any);
    expect(res).toBeTruthy();
    // encryption was attempted and failed
    expect(mockEncryption.encryptText).toHaveBeenCalled();
  });

  it('verifyUpload rejects when fetch throws', async () => {
    mockSupabase.storage.createSignedUrl.mockResolvedValue({ data: { signedUrl: 'https://signed' }, error: null });
    (global as any).fetch = jest.fn().mockRejectedValue(new Error('network'));
    await expect((service as any).verifyUpload('u/n2.md')).rejects.toThrow();
  });

  it('updateNote throws when storage upload fails during migration', async () => {
    const selectQ: any = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { id: 'nm', content: 'raw old content' }, error: null }),
      update: jest.fn().mockImplementation(() => ({ eq: jest.fn().mockReturnThis(), select: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: { id: 'nm' }, error: null }) }))
    };
    mockSupabase.from = jest.fn().mockReturnValue(selectQ);
    mockSupabase.storage = { from: jest.fn().mockReturnThis(), upload: jest.fn().mockResolvedValue({ error: new Error('upload fail') }), createSignedUrl: jest.fn().mockResolvedValue({ data: { signedUrl: 'https://signed' }, error: null }) };
    (global as any).fetch = jest.fn().mockResolvedValue({ ok: true, text: jest.fn().mockResolvedValue('ok') });

    await expect(service.updateNote('nm', 'u', { title: 'X' } as any)).rejects.toBeTruthy();
  });

  it('decryptNoteAtSource throws when signed URL creation fails', async () => {
    const note = { id: 'nd1', content: 'storage://notes/nd1.md', is_encrypted: true };
    const q: any = { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: note, error: null }) };
    mockSupabase.from = jest.fn().mockReturnValueOnce(q);
    mockSupabase.storage = { from: jest.fn().mockReturnThis(), createSignedUrl: jest.fn().mockResolvedValue({ data: null, error: { code: 'ERR' } }) } as any;

    await expect(service.decryptNoteAtSource('nd1', 'u')).rejects.toThrow('Failed to fetch encrypted content from storage');
  });

  it('decryptNoteAtSource throws when download fails', async () => {
    const note = { id: 'nd2', content: 'storage://notes/nd2.md', is_encrypted: true };
    const q: any = { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: note, error: null }) };
    const storage = { from: jest.fn().mockReturnThis(), createSignedUrl: jest.fn().mockResolvedValue({ data: { signedUrl: 'https://signed' }, error: null }) } as any;
    mockSupabase.from = jest.fn().mockReturnValueOnce(q);
    mockSupabase.storage = storage;
    (global as any).fetch = jest.fn().mockResolvedValue({ ok: false, status: 500 });

    await expect(service.decryptNoteAtSource('nd2', 'u')).rejects.toThrow('Failed to download encrypted content');
  });

  it('decryptNoteAtSource throws when re-upload fails for plain content', async () => {
    const note = { id: 'nd3', content: 'plain text', is_encrypted: true };
    const q: any = { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: note, error: null }) };
    const uploadQ: any = { update: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: {}, error: null }) };
    mockSupabase.from = jest.fn().mockReturnValueOnce(q).mockReturnValueOnce(uploadQ);
    mockSupabase.storage = { from: jest.fn().mockReturnThis(), upload: jest.fn().mockResolvedValue({ error: new Error('reupload fail') }) } as any;

    await expect(service.decryptNoteAtSource('nd3', 'u')).rejects.toThrow('Failed to re-upload content');
  });

  it('uploadDocument returns updated note on success', async () => {
    const created = { id: 'ud1', title: 'file' };
    const client = makeMockClient({ insertData: created, updateData: { ...created, content: 'storage://notes/u/ud1.md' } });
    client.storage.upload = jest.fn().mockResolvedValue({ error: null });
    client.storage.createSignedUrl = jest.fn().mockResolvedValue({ data: { signedUrl: 'https://signed' }, error: null });
    mockSupabase.from = client.from;
    mockSupabase.storage = client.storage;
    (global as any).fetch = jest.fn().mockResolvedValue({ ok: true, text: jest.fn().mockResolvedValue('ok') });

    const file = new File([new Blob(['x'])], 'a.txt', { type: 'text/plain' });
    const res = await service.uploadDocument('u', file, null);
    expect(res).toBeTruthy();
    expect(mockActivity.logActivity).toHaveBeenCalled();
  });

  it('deleteNote creates notification when activity exists', async () => {
    const qSelect: any = { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: { title: 'T' }, error: null }) };
    const qDelete: any = { delete: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: {}, error: null }) };
    const activity = { id: 'act1' };
    mockSupabase.from = jest.fn().mockReturnValueOnce(qSelect).mockReturnValueOnce(qDelete);
    jest.spyOn(mockActivity, 'logActivity').mockResolvedValue(activity as any);
    const spy = jest.spyOn(mockNotification, 'createNotification').mockResolvedValue({});

    await service.deleteNote('d1', 'u');
    expect(spy).toHaveBeenCalled();
  });


});