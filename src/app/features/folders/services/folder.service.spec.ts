import { TestBed } from '@angular/core/testing';
import { FolderService } from './folder.service';

function makeBuilder(result: any) {
  const builder: any = {
    _result: result,
    select() { return this; },
    eq() { return this; },
    is() { return this; },
    order() { return Promise.resolve(this._result); },
    insert() { return this; },
    update() { return this; },
    delete() { return this; },
    single() { return Promise.resolve(this._result); },
    maybeSingle() { return Promise.resolve(this._result); },
    then(resolve: any) { return Promise.resolve(this._result).then(resolve); },
    catch() { return Promise.resolve(this._result); },
  };
  return builder;
}

describe('FolderService', () => {
  let service: FolderService;
  let mockSupabase: any;
  let mockUserService: any;
  let mockLoading: any;
  let mockActivity: any;

  beforeEach(async () => {
    mockSupabase = { from: jest.fn() };
    mockUserService = { hasRootFolder: jest.fn(), markRootFolderCreated: jest.fn() };
    mockLoading = { withLoading: (fn: any) => fn() };
    mockActivity = { logActivity: jest.fn().mockResolvedValue({}) };

    await TestBed.configureTestingModule({
      providers: [
        FolderService,
        { provide: (await import('../../../core/services/supabase.service')).SupabaseService, useValue: mockSupabase },
        { provide: (await import('../../../core/services/user.service')).UserService, useValue: mockUserService },
        { provide: (await import('../../../core/services/loading.service')).LoadingService, useValue: mockLoading },
        { provide: (await import('../../../core/services/activity-log.service')).ActivityLogService, useValue: mockActivity },
      ],
    }).compileComponents();

    service = TestBed.inject(FolderService);
  });

  it('createRootFolder returns existing when user already has root', async () => {
    const folder = { id: 'r1', name: 'Root', is_root: true } as any;
    mockUserService.hasRootFolder.mockResolvedValue(true);
    jest.spyOn(service, 'getRootFolder').mockResolvedValue(folder);

    const res = await service.createRootFolder('u1');
    expect(res).toBe(folder);
    expect(mockUserService.markRootFolderCreated).not.toHaveBeenCalled();
  });

  it('createRootFolder creates and marks when none exists', async () => {
    const folder = { id: 'r2', name: 'My Notes', is_root: true } as any;
    mockUserService.hasRootFolder.mockResolvedValue(false);
    mockSupabase.from.mockReturnValue(makeBuilder({ data: folder, error: null }));

    const res = await service.createRootFolder('u2');
    expect(res).toEqual(folder);
    expect(mockUserService.markRootFolderCreated).toHaveBeenCalledWith('u2');
  });

  it('getRootFolder returns folder when found', async () => {
    const folder = { id: 'r3', name: 'Root3' } as any;
    mockSupabase.from.mockReturnValue(makeBuilder({ data: folder, error: null }));

    const res = await service.getRootFolder('u3');
    expect(res).toEqual(folder);
  });

  it('getRootFolder returns null on error', async () => {
    mockSupabase.from.mockReturnValue(makeBuilder({ data: null, error: new Error('fail') }));
    const res = await service.getRootFolder('u3');
    expect(res).toBeNull();
  });

  it('initializeUserFolders returns existing root if present', async () => {
    const folder = { id: 'r4' } as any;
    jest.spyOn(service, 'getRootFolder').mockResolvedValue(folder);

    const res = await service.initializeUserFolders('u4');
    expect(res).toBe(folder);
  });

  it('initializeUserFolders creates root if absent', async () => {
    const created = { id: 'r5' } as any;
    jest.spyOn(service, 'getRootFolder').mockResolvedValue(null);
    jest.spyOn(service, 'createRootFolder').mockResolvedValue(created as any);

    const res = await service.initializeUserFolders('u5');
    expect(res).toBe(created);
  });

  it('createFolder throws on duplicate name', async () => {
    const dto = { name: 'Dup', parent_id: null } as any;
    // dupCheck returns non-empty
    mockSupabase.from.mockReturnValue(makeBuilder({ data: [{ id: 'f1' }], error: null }));

    await expect(service.createFolder('u1', dto)).rejects.toThrow('A folder with this name already exists here');
  });

  it('createFolder continues when dup check returns error and creates folder', async () => {
    const dto = { name: 'Name', parent_id: null, color: 'red', icon: 'i' } as any;
    // dupQuery returns error
    mockSupabase.from.mockReturnValueOnce(makeBuilder({ data: null, error: new Error('dup') }));
    const created = { id: 'f2', name: 'Name' } as any;
    // second call for insert
    mockSupabase.from.mockReturnValueOnce(makeBuilder({ data: created, error: null }));

    const res = await service.createFolder('u1', dto);
    expect(res).toEqual(created);
    expect(mockActivity.logActivity).toHaveBeenCalledWith('u1', expect.objectContaining({ action_type: expect.anything() }));
  });

  it('getFolders returns array and empty when error', async () => {
    const f = [{ id: 'a' }];
    mockSupabase.from.mockReturnValueOnce(makeBuilder({ data: f, error: null }));
    expect(await service.getFolders('u1')).toEqual(f);

    mockSupabase.from.mockReturnValueOnce(makeBuilder({ data: null, error: new Error('fail') }));
    expect(await service.getFolders('u1')).toEqual([]);
  });

  it('getFolder returns folder or null on error', async () => {
    const f = { id: 'g1' } as any;
    mockSupabase.from.mockReturnValueOnce(makeBuilder({ data: f, error: null }));
    expect(await service.getFolder('g1', 'u1')).toEqual(f);

    mockSupabase.from.mockReturnValueOnce(makeBuilder({ data: null, error: new Error('fail') }));
    expect(await service.getFolder('g1', 'u1')).toBeNull();
  });

  it('updateFolder updates and logs activity', async () => {
    const updated = { id: 'u1', name: 'Updated' } as any;
    mockSupabase.from.mockReturnValue(makeBuilder({ data: updated, error: null }));

    const res = await service.updateFolder('u1', 'user1', { name: 'Updated' } as any);
    expect(res).toEqual(updated);
    expect(mockActivity.logActivity).toHaveBeenCalledWith('user1', expect.objectContaining({ action_type: expect.anything() }));
  });

  it('deleteFolder prevents deleting root', async () => {
    jest.spyOn(service, 'getFolder').mockResolvedValue({ id: 'root', is_root: true } as any);
    await expect(service.deleteFolder('root', 'u1')).rejects.toThrow('Cannot delete root folder');
  });

  it('deleteFolder deletes and logs activity', async () => {
    jest.spyOn(service, 'getFolder').mockResolvedValue({ id: 'f3', is_root: false, name: 'N' } as any);
    mockSupabase.from.mockReturnValue(makeBuilder({ data: null, error: null }));

    await expect(service.deleteFolder('f3', 'u1')).resolves.toBeUndefined();
    expect(mockActivity.logActivity).toHaveBeenCalledWith('u1', expect.objectContaining({ action_type: expect.anything() }));
  });

  it('getChildFolders returns list or empty on error', async () => {
    const children = [{ id: 'c1' }];
    mockSupabase.from.mockReturnValueOnce(makeBuilder({ data: children, error: null }));
    expect(await service.getChildFolders('p1', 'u1')).toEqual(children);

    mockSupabase.from.mockReturnValueOnce(makeBuilder({ data: null, error: new Error('fail') }));
    expect(await service.getChildFolders('p1', 'u1')).toEqual([]);
  });

  it('getFolderTree builds hierarchical tree', async () => {
    const folders = [
      { id: '1', parent_id: null, name: 'Root' },
      { id: '2', parent_id: '1', name: 'Child' },
      { id: '3', parent_id: '2', name: 'Grand' },
    ] as any;
    jest.spyOn(service, 'getFolders').mockResolvedValue(folders);

    const tree = await service.getFolderTree('u1');
    expect(tree.length).toBe(1);
    expect(tree[0].children[0].children[0].id).toBe('3');
  });
});
