import { TestBed } from '@angular/core/testing';
import { UserService } from './user.service';
import { SupabaseService } from './supabase.service';
import { LoadingService } from './loading.service';

const makeSupabaseMock = () => ({
  from: jest.fn().mockImplementation(() => ({
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    upsert: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
  })),
  storage: {
    from: jest.fn().mockReturnValue({
      upload: jest.fn().mockResolvedValue({ error: null }),
      getPublicUrl: jest.fn().mockReturnValue({ data: { publicUrl: 'https://cdn/avatars/u1.png' } }),
    }),
  },
});

const makeLoadingMock = () => ({
  withLoading: jest.fn().mockImplementation((fn: any) => fn()),
});

describe('UserService', () => {
  let service: UserService;
  let mockSupabase: any;
  let mockLoading: any;

  beforeEach(() => {
    mockSupabase = makeSupabaseMock();
    mockLoading = makeLoadingMock();

    TestBed.configureTestingModule({ providers: [UserService, { provide: SupabaseService, useValue: mockSupabase }, { provide: LoadingService, useValue: mockLoading }] });
    service = TestBed.inject(UserService);
  });

  afterEach(() => jest.restoreAllMocks());

  it('getUserProfile returns profile when found', async () => {
    const expected = { user_id: 'u1', first_name: 'Ramu' } as any;
    mockSupabase.from.mockReturnValueOnce({ select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: expected, error: null }) });

    const profile = await service.getUserProfile('u1');
    expect(profile).toEqual(expected);
  });

  it('getUserProfile creates profile when not found (PGRST116)', async () => {
    const created = { user_id: 'u1', is_root_folder_created: false } as any;
    // first call (select) returns PGRST116
    mockSupabase.from.mockReturnValueOnce({ select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }) });
    // second call (insert in createUserProfile) returns created
    mockSupabase.from.mockReturnValueOnce({ insert: jest.fn().mockReturnThis(), select: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: created, error: null }) });

    const profile = await service.getUserProfile('u1');
    expect(profile).toEqual(created);
  });

  it('getUserProfile throws on unknown error', async () => {
    mockSupabase.from.mockReturnValueOnce({ select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: null, error: { code: 'E' } }) });
    await expect(service.getUserProfile('u1')).rejects.toEqual({ code: 'E' });
  });

  it('createUserProfile returns created profile or throws on error', async () => {
    const created = { user_id: 'u1' } as any;
    mockSupabase.from.mockReturnValueOnce({ insert: jest.fn().mockReturnThis(), select: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: created, error: null }) });
    const p = await service.createUserProfile('u1');
    expect(p).toEqual(created);

    mockSupabase.from.mockReturnValueOnce({ insert: jest.fn().mockReturnThis(), select: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: null, error: { code: 'E' } }) });
    await expect(service.createUserProfile('u1')).rejects.toEqual({ code: 'E' });
  });

  it('updateUserProfile returns updated profile or throws', async () => {
    const updated = { user_id: 'u1', first_name: 'X' } as any;
    mockSupabase.from.mockReturnValueOnce({ update: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), select: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: updated, error: null }) });
    const p = await service.updateUserProfile('u1', { first_name: 'X' });
    expect(p).toEqual(updated);

    mockSupabase.from.mockReturnValueOnce({ update: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), select: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: null, error: { code: 'E' } }) });
    await expect(service.updateUserProfile('u1', {})).rejects.toEqual({ code: 'E' });
  });

  it('upsertUserProfile works', async () => {
    const up = { user_id: 'u1', updated_at: new Date().toISOString() } as any;
    mockSupabase.from.mockReturnValueOnce({ upsert: jest.fn().mockReturnThis(), select: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: up, error: null }) });
    const p = await service.upsertUserProfile('u1', { first_name: 'A' });
    expect(p).toEqual(up);
  });

  it('markRootFolderCreated delegates to updateUserProfile', async () => {
    const spy = jest.spyOn(service as any, 'updateUserProfile').mockResolvedValue({} as any);
    await service.markRootFolderCreated('u1');
    expect(spy).toHaveBeenCalledWith('u1', { is_root_folder_created: true });
  });

  it('hasRootFolder returns correct boolean and handles errors', async () => {
    jest.spyOn(service as any, 'getUserProfile').mockResolvedValue({ is_root_folder_created: true } as any);
    expect(await service.hasRootFolder('u1')).toBe(true);

    jest.spyOn(service as any, 'getUserProfile').mockResolvedValue({ is_root_folder_created: false } as any);
    expect(await service.hasRootFolder('u1')).toBe(false);

    jest.spyOn(service as any, 'getUserProfile').mockRejectedValue(new Error('boom'));
    expect(await service.hasRootFolder('u1')).toBe(false);
  });

  it('uploadAvatar uploads and returns public url with timestamp or throws', async () => {
    // ensure upload succeeds
    const getPublic = { data: { publicUrl: 'https://cdn/avatars/u1.png' } };
    mockSupabase.storage.from.mockReturnValueOnce({ upload: jest.fn().mockResolvedValue({ error: null }), getPublicUrl: jest.fn().mockReturnValue(getPublic) });
    jest.spyOn(Date, 'now').mockReturnValue(123456);
    const url = await service.uploadAvatar('u1', new File(['x'], 'avatar.png', { type: 'image/png' }));
    expect(url).toBe('https://cdn/avatars/u1.png?t=123456');

    // upload error
    mockSupabase.storage.from.mockReturnValueOnce({ upload: jest.fn().mockResolvedValue({ error: { code: 'E' } }), getPublicUrl: jest.fn().mockReturnValue(getPublic) });
    await expect(service.uploadAvatar('u1', new File(['x'], 'avatar.png', { type: 'image/png' }))).rejects.toEqual({ code: 'E' });
  });

  it('disableUser calls updateUserProfile with disabled true', async () => {
    const spy = jest.spyOn(service as any, 'updateUserProfile').mockResolvedValue({} as any);
    await service.disableUser('u1');
    expect(spy).toHaveBeenCalledWith('u1', { disabled: true });
  });
});