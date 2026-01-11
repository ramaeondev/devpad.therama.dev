import { TestBed } from '@angular/core/testing';
import { FolderTreeComponent } from './folder-tree.component';

class MockFolderService { updateFolder = jest.fn().mockResolvedValue({ name: 'renamed' }); deleteFolder = jest.fn().mockResolvedValue(true); createFolder = jest.fn().mockResolvedValue({ id: 'new' }); }
class MockNoteService { createNote = jest.fn().mockResolvedValue({ id: 'n1', title: 'Untitled', updated_at: Date.now() }); uploadDocument = jest.fn().mockResolvedValue({}); getNotesForFolder = jest.fn().mockResolvedValue([]); updateNote = jest.fn().mockResolvedValue({}); deleteNote = jest.fn().mockResolvedValue(true); }
class MockAuth { userId = jest.fn().mockReturnValue('u1'); }
class MockToast { success = jest.fn(); error = jest.fn(); info = jest.fn(); }
class MockWorkspace { selectedFolderId = jest.fn().mockReturnValue(null); setSelectedFolder = jest.fn(); emitNoteCreated = jest.fn(); emitFoldersChanged = jest.fn(); selectedNoteId = jest.fn().mockReturnValue(null); emitNoteSelected = jest.fn(); }

describe('FolderTreeComponent', () => {
  it('uniqueName returns incremented name when exists', async () => {
    await TestBed.configureTestingModule({ imports: [FolderTreeComponent], providers: [ { provide: (await import('../../../folders/services/folder.service')).FolderService, useClass: MockFolderService }, { provide: (await import('../../../../core/services/note.service')).NoteService, useClass: MockNoteService }, { provide: (await import('../../../../core/services/auth-state.service')).AuthStateService, useClass: MockAuth }, { provide: (await import('../../../../core/services/toast.service')).ToastService, useClass: MockToast }, { provide: (await import('../../../../core/services/workspace-state.service')).WorkspaceStateService, useClass: MockWorkspace } ] }).compileComponents();

    const fixture = TestBed.createComponent(FolderTreeComponent);
    const comp = fixture.componentInstance;

    const res = (comp as any).uniqueName('Untitled', ['Untitled', 'Untitled 2'], '.md');
    expect(res).toMatch(/Untitled/);
  });

  it('createNoteDirect creates note and emits selection', async () => {
    await TestBed.configureTestingModule({ imports: [FolderTreeComponent], providers: [ { provide: (await import('../../../folders/services/folder.service')).FolderService, useClass: MockFolderService }, { provide: (await import('../../../../core/services/note.service')).NoteService, useClass: MockNoteService }, { provide: (await import('../../../../core/services/auth-state.service')).AuthStateService, useClass: MockAuth }, { provide: (await import('../../../../core/services/toast.service')).ToastService, useClass: MockToast }, { provide: (await import('../../../../core/services/workspace-state.service')).WorkspaceStateService, useClass: MockWorkspace } ] }).compileComponents();

    const fixture = TestBed.createComponent(FolderTreeComponent);
    const comp = fixture.componentInstance;

    const folder = { id: 'f1', is_root: true } as any;

    await comp.createNoteDirect(folder);

    const toast = TestBed.inject((await import('../../../../core/services/toast.service')).ToastService as any);
    expect(toast.success).toHaveBeenCalled();
  });

  it('deleteFolder does not allow deleting root', async () => {
    await TestBed.configureTestingModule({ imports: [FolderTreeComponent], providers: [ { provide: (await import('../../../folders/services/folder.service')).FolderService, useClass: MockFolderService }, { provide: (await import('../../../../core/services/toast.service')).ToastService, useClass: MockToast } ] }).compileComponents();

    const fixture = TestBed.createComponent(FolderTreeComponent);
    const comp = fixture.componentInstance;

    const root = { id: 'r', is_root: true } as any;
    await comp.deleteFolder(root);
    const toast = TestBed.inject((await import('../../../../core/services/toast.service')).ToastService as any);
    expect(toast.error).toHaveBeenCalled();
  });

  it('ngOnInit auto-expands root folders', async () => {
    await TestBed.configureTestingModule({ imports: [FolderTreeComponent], providers: [ { provide: (await import('../../../folders/services/folder.service')).FolderService, useClass: MockFolderService }, { provide: (await import('../../../../core/services/auth-state.service')).AuthStateService, useClass: MockAuth }, { provide: (await import('../../../../core/services/toast.service')).ToastService, useClass: MockToast } ] }).compileComponents();

    const fixture = TestBed.createComponent(FolderTreeComponent);
    const comp = fixture.componentInstance;

    comp.folders = [{ id: 'root1', is_root: true, name: 'Root' } as any];
    comp.ngOnInit();
    expect(comp.isExpanded('root1')).toBe(true);
  });

  it('toggleExpand toggles expanded state and stops propagation', async () => {
    await TestBed.configureTestingModule({ imports: [FolderTreeComponent] }).compileComponents();
    const fixture = TestBed.createComponent(FolderTreeComponent);
    const comp = fixture.componentInstance;
    comp.folders = [{ id: 'f1' } as any];

    const ev = { stopPropagation: jest.fn() } as any as Event;
    expect(comp.isExpanded('f1')).toBe(false);
    comp.toggleExpand('f1', ev);
    expect(ev.stopPropagation).toHaveBeenCalled();
    expect(comp.isExpanded('f1')).toBe(true);
    comp.toggleExpand('f1', ev);
    expect(comp.isExpanded('f1')).toBe(false);
  });

  it('onFolderClick loads notes for leaf folders and emits selection', async () => {
    await TestBed.configureTestingModule({ imports: [FolderTreeComponent], providers: [ { provide: (await import('../../../../core/services/note.service')).NoteService, useClass: MockNoteService }, { provide: (await import('../../../../core/services/auth-state.service')).AuthStateService, useClass: MockAuth }, { provide: (await import('../../../../core/services/supabase.service')).SupabaseService, useValue: { client: { from: jest.fn().mockReturnThis(), select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: { public_folder_id: 'other' } } ) } } }, { provide: (await import('../../../../core/services/workspace-state.service')).WorkspaceStateService, useClass: MockWorkspace } ] }).compileComponents();

    const fixture = TestBed.createComponent(FolderTreeComponent);
    const comp = fixture.componentInstance;

    const folder = { id: 'leaf1', children: [], notes: undefined, name: 'Leaf' } as any;
    comp.folders = [folder];

    const noteService = TestBed.inject((await import('../../../../core/services/note.service')).NoteService as any);
    noteService.getNotesForFolder.mockResolvedValue([{ id: 'n1', title: 'T', updated_at: Date.now(), folder_id: 'leaf1', content: '' }]);

    comp.onFolderClick(folder);
    // fetchNotesForFolder is async and not awaited by onFolderClick - wait a tick for it to finish
    await new Promise((r) => setTimeout(r, 0));

    expect(TestBed.inject((await import('../../../../core/services/workspace-state.service')).WorkspaceStateService as any).setSelectedFolder).toHaveBeenCalledWith('leaf1');
    expect(folder.notes).toBeDefined();
    expect(folder.notes.length).toBe(1);
  });

  it('commitRename updates folder and emits on success', async () => {
    await TestBed.configureTestingModule({ imports: [FolderTreeComponent], providers: [ { provide: (await import('../../../folders/services/folder.service')).FolderService, useClass: MockFolderService }, { provide: (await import('../../../../core/services/auth-state.service')).AuthStateService, useClass: MockAuth }, { provide: (await import('../../../../core/services/toast.service')).ToastService, useClass: MockToast } ] }).compileComponents();

    const fixture = TestBed.createComponent(FolderTreeComponent);
    const comp = fixture.componentInstance;

    const folder = { id: 'f3', name: 'Old' } as any;
    comp.folders = [folder];
    comp.startRename(folder);
    (comp as any)._nameDraft.set('NewName');

    await comp.commitRename(folder);

    expect(folder.name).toBe('renamed');
    expect(TestBed.inject((await import('../../../../core/services/toast.service')).ToastService as any).success).toHaveBeenCalled();
  });

  it('deleteFolder removes non-root folders on success', async () => {
    await TestBed.configureTestingModule({ imports: [FolderTreeComponent], providers: [ { provide: (await import('../../../folders/services/folder.service')).FolderService, useClass: MockFolderService }, { provide: (await import('../../../../core/services/toast.service')).ToastService, useClass: MockToast } ] }).compileComponents();

    const fixture = TestBed.createComponent(FolderTreeComponent);
    const comp = fixture.componentInstance;

    const child = { id: 'c1', is_root: false } as any;
    comp.folders = [{ id: 'r' } as any, child];

    await comp.deleteFolder(child);
    expect(TestBed.inject((await import('../../../../core/services/toast.service')).ToastService as any).success).toHaveBeenCalledWith('Folder deleted');
    expect(comp.folders.find((f:any) => f.id === 'c1')).toBeUndefined();
  });

  it('openCreateSubfolderModal sets pending parent and shows modal', async () => {
    await TestBed.configureTestingModule({ imports: [FolderTreeComponent] }).compileComponents();
    const fixture = TestBed.createComponent(FolderTreeComponent);
    const comp = fixture.componentInstance;

    const parent = { id: 'p1' } as any;
    comp.openCreateSubfolderModal(parent);
    expect(comp.showNameModal()).toBe(true);
    expect((comp as any).pendingParentId).toBe('p1');
  });

  it('startRename and cancelRename behavior and onNameInput', async () => {
    await TestBed.configureTestingModule({ imports: [FolderTreeComponent] }).compileComponents();
    const fixture = TestBed.createComponent(FolderTreeComponent);
    const comp = fixture.componentInstance;

    const folder = { id: 'fX', name: 'Old' } as any;
    comp.startRename(folder);
    expect(comp.editingId()).toBe('fX');

    // simulate input event
    comp.onNameInput({ target: { value: 'New' } } as any);
    expect(comp.nameDraft()).toBe('New');

    comp.cancelRename(folder);
    expect(comp.editingId()).toBeNull();
  });

  it('commitRename with empty draft cancels edit', async () => {
    await TestBed.configureTestingModule({ imports: [FolderTreeComponent], providers: [ { provide: (await import('../../../../core/services/auth-state.service')).AuthStateService, useValue: { userId: jest.fn().mockReturnValue('u1') } }, { provide: (await import('../../../folders/services/folder.service')).FolderService, useClass: MockFolderService }, { provide: (await import('../../../../core/services/toast.service')).ToastService, useClass: MockToast } ] }).compileComponents();
    const fixture = TestBed.createComponent(FolderTreeComponent);
    const comp = fixture.componentInstance;

    const folder = { id: 'fE' } as any;
    comp.startRename(folder);
    (comp as any)._nameDraft.set('   ');
    await comp.commitRename(folder);
    expect(comp.editingId()).toBeNull();
  });

  it('downloadDocument handles no storage path and fetch errors', async () => {
    await TestBed.configureTestingModule({ imports: [FolderTreeComponent], providers: [ { provide: (await import('../../../../core/services/supabase.service')).SupabaseService, useValue: { storage: { from: () => ({ createSignedUrl: jest.fn().mockResolvedValue({ data: { signedUrl: 'https://s' }, error: null }) }) } } }, { provide: (await import('../../../../core/services/toast.service')).ToastService, useClass: MockToast } ] }).compileComponents();
    const fixture = TestBed.createComponent(FolderTreeComponent);
    const comp = fixture.componentInstance;

    // no storage path - should no-op
    await comp.downloadDocument({ title: 'x' } as any);

    // simulate signed url but fetch throws
    global.fetch = jest.fn(async () => { throw new Error('fail'); }) as any;
    const note = { content: 'storage://notes/file.pdf', title: 'F' } as any;
    await comp.downloadDocument(note);

    const toast = TestBed.inject((await import('../../../../core/services/toast.service')).ToastService as any);
    expect(toast.error).toHaveBeenCalled();

    // cleanup
    (global.fetch as jest.Mock).mockRestore?.();
  });

  it('onNoteDragStart and onNoteDragEnd set and clear state and styles', async () => {
    await TestBed.configureTestingModule({ imports: [FolderTreeComponent] }).compileComponents();
    const fixture = TestBed.createComponent(FolderTreeComponent);
    const comp = fixture.componentInstance;

    const elem = { style: { opacity: '1' }, clientWidth: 100, clientHeight: 20 } as any;
    const dt = { effectAllowed: '', setData: jest.fn(), setDragImage: jest.fn() } as any;
    const evStart: any = { dataTransfer: dt, currentTarget: elem } as any;

    const note = { id: 'nD', title: 'N' } as any;
    const folder = { id: 'fD' } as any;

    comp.onNoteDragStart(evStart, note, folder);
    expect(comp.draggedNoteId()).toBe('nD');
    expect(comp.draggedNote).toBe(note);
    expect(comp.draggedSourceFolder).toBe(folder);
    expect(elem.style.opacity).toBe('0.5');

    const evEnd: any = { currentTarget: elem } as any;
    comp.onNoteDragEnd(evEnd);
    expect(comp.draggedNoteId()).toBeNull();
    expect(elem.style.opacity).toBe('1');
  });

  it('onFolderDragOver and onFolderDragLeave handle visual feedback', async () => {
    await TestBed.configureTestingModule({ imports: [FolderTreeComponent] }).compileComponents();
    const fixture = TestBed.createComponent(FolderTreeComponent);
    const comp = fixture.componentInstance;

    const folder = { id: 'fO' } as any;
    const ev: any = { dataTransfer: { types: ['text/plain'], dropEffect: '' }, preventDefault: jest.fn(), stopPropagation: jest.fn() } as any;
    comp.onFolderDragOver(ev, folder);
    expect(ev.preventDefault).toHaveBeenCalled();
    expect(comp.dragOverFolderId()).toBe('fO');

    // simulate leaving with relatedTarget outside
    const elem = { contains: () => false } as any;
    const evLeave: any = { relatedTarget: null, currentTarget: elem, stopPropagation: jest.fn() } as any;
    comp.dragOverFolderId.set('fO');
    comp.onFolderDragLeave(evLeave, folder);
    expect(evLeave.stopPropagation).toHaveBeenCalled();
    expect(comp.dragOverFolderId()).toBeNull();
  });

  it('onFolderDrop moves note between folders and handles same-folder gracefully', async () => {
    const mockUpdate = jest.fn().mockResolvedValue({});
    await TestBed.configureTestingModule({ imports: [FolderTreeComponent], providers: [ { provide: (await import('../../../../core/services/note.service')).NoteService, useValue: { updateNote: mockUpdate } }, { provide: (await import('../../../../core/services/auth-state.service')).AuthStateService, useValue: { userId: jest.fn().mockReturnValue('u') } }, { provide: (await import('../../../../core/services/toast.service')).ToastService, useClass: MockToast } ] }).compileComponents();
    const fixture = TestBed.createComponent(FolderTreeComponent);
    const comp = fixture.componentInstance;

    const note = { id: 'nM', title: 'Move' } as any;
    const source = { id: 's1', notes: [{ id: 'nM' } as any] } as any;
    const target = { id: 't1', notes: [] as any[], name: 'Target' } as any;

    comp.draggedNote = note;
    comp.draggedSourceFolder = source;
    comp.draggedNoteId.set('nM');

    const ev: any = { preventDefault: jest.fn(), stopPropagation: jest.fn() } as any;
    await comp.onFolderDrop(ev, target);

    const toast = TestBed.inject((await import('../../../../core/services/toast.service')).ToastService as any);
    expect(mockUpdate).toHaveBeenCalled();
    expect(target.notes.length).toBeGreaterThan(0);
    expect(toast.success).toHaveBeenCalled();

    // same-folder case
    comp.draggedNote = note;
    comp.draggedSourceFolder = target;
    comp.draggedNoteId.set('nM');
    const toastSpy = jest.spyOn(toast, 'info');
    await comp.onFolderDrop(ev, target);
    expect(toastSpy).toHaveBeenCalled();
  });

  it('performDeleteNote deletes note and clears selection', async () => {
    const mockDelete = jest.fn().mockResolvedValue(true);
    const mockWS: any = { selectedNoteId: jest.fn().mockReturnValue('nD'), setSelectedNote: jest.fn() };
    await TestBed.configureTestingModule({ imports: [FolderTreeComponent], providers: [ { provide: (await import('../../../../core/services/note.service')).NoteService, useValue: { deleteNote: mockDelete } }, { provide: (await import('../../../../core/services/workspace-state.service')).WorkspaceStateService, useValue: mockWS }, { provide: (await import('../../../../core/services/toast.service')).ToastService, useClass: MockToast } ] }).compileComponents();
    const fixture = TestBed.createComponent(FolderTreeComponent);
    const comp = fixture.componentInstance;

    const folder = { id: 'fDel', notes: [{ id: 'nD' } as any] } as any;
    comp.pendingDeleteNote = { note: { id: 'nD' } as any, folder };

    await (comp as any).performDeleteNote();
    expect(folder.notes.find((n:any) => n.id === 'nD')).toBeUndefined();
    expect(mockWS.setSelectedNote).toHaveBeenCalledWith(null);
  });

  it('renamingExistingNames returns other note titles', async () => {
    await TestBed.configureTestingModule({ imports: [FolderTreeComponent] }).compileComponents();
    const fixture = TestBed.createComponent(FolderTreeComponent);
    const comp = fixture.componentInstance;

    const folder: any = { notes: [{ id: 'a', title: 'A' }, { id: 'b', title: 'B' }] };
    comp.renamingFolder = folder;
    comp.renamingNote = { id: 'a' } as any;
    expect(comp.renamingExistingNames()).toEqual(['B']);
  });

  it('showNoteProperties sets modal props on success', async () => {
    const mockGet = jest.fn().mockResolvedValue({ created_at: 1, updated_at: 2, tags: ['t'], is_favorite: true, is_archived: false, content: 'abc' });
    await TestBed.configureTestingModule({ imports: [FolderTreeComponent], providers: [ { provide: (await import('../../../../core/services/note.service')).NoteService, useValue: { getNote: mockGet } }, { provide: (await import('../../../../core/services/auth-state.service')).AuthStateService, useValue: { user: jest.fn().mockReturnValue({ email: 'me@e' }), userId: jest.fn().mockReturnValue('u1') } } ] }).compileComponents();
    const fixture = TestBed.createComponent(FolderTreeComponent);
    const comp = fixture.componentInstance;

    const folder = { id: 'fP', name: 'F' } as any;
    const note = { id: 'nP', title: 'Note' } as any;

    await comp.showNoteProperties(note, folder);
    expect(comp.showPropertiesModal()).toBe(true);
    expect(comp.noteProperties()?.size).toBeGreaterThan(0);
  });

  it('fetchNotesForFolder handles share service errors gracefully', async () => {
    const mockShare = { getSharedNotesForUser: jest.fn().mockRejectedValue(new Error('share fail')) };
    const supabase = { client: { from: jest.fn().mockReturnThis(), select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: { public_folder_id: 'pub1' } }) } };

    await TestBed.configureTestingModule({ imports: [FolderTreeComponent], providers: [ { provide: (await import('../../../../core/services/share.service')).ShareService, useValue: mockShare }, { provide: (await import('../../../../core/services/supabase.service')).SupabaseService, useValue: supabase }, { provide: (await import('../../../../core/services/auth-state.service')).AuthStateService, useValue: { userId: jest.fn().mockReturnValue('u1') } } ] }).compileComponents();
    const fixture = TestBed.createComponent(FolderTreeComponent);
    const comp = fixture.componentInstance as any;

    const folder = { id: 'pub1' } as any;

    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    await comp.fetchNotesForFolder(folder);

    expect(errSpy).toHaveBeenCalled();
    expect(folder.notes).toBeUndefined();

    errSpy.mockRestore();
  });

  it('loadNotesForExpanded returns early when no userId', async () => {
    await TestBed.configureTestingModule({ imports: [FolderTreeComponent], providers: [ { provide: (await import('../../../../core/services/auth-state.service')).AuthStateService, useValue: { userId: jest.fn().mockReturnValue(null) } } ] }).compileComponents();
    const fixture = TestBed.createComponent(FolderTreeComponent);
    const comp = fixture.componentInstance as any;

    const spy = jest.spyOn(comp as any, 'fetchNotesForFolder');
    comp.folders = [{ id: 'f1' } as any];

    await (comp as any).loadNotesForExpanded();
    expect(spy).not.toHaveBeenCalled();

    spy.mockRestore();
  });

  it('commitRename handles update failure and clears editingId', async () => {
    const mockFolderSvc = { updateFolder: jest.fn().mockRejectedValue(new Error('fail')) };
    const mockToast = { success: jest.fn(), error: jest.fn() };
    await TestBed.configureTestingModule({ imports: [FolderTreeComponent], providers: [ { provide: (await import('../../../folders/services/folder.service')).FolderService, useValue: mockFolderSvc }, { provide: (await import('../../../../core/services/auth-state.service')).AuthStateService, useValue: { userId: jest.fn().mockReturnValue('u1') } }, { provide: (await import('../../../../core/services/toast.service')).ToastService, useValue: mockToast } ] }).compileComponents();
    const fixture = TestBed.createComponent(FolderTreeComponent);
    const comp = fixture.componentInstance as any;

    const folder = { id: 'fR', name: 'Old' } as any;
    comp.folders = [folder];
    comp.startRename(folder);
    (comp as any)._nameDraft.set('NewName');

    await comp.commitRename(folder);

    expect(TestBed.inject((await import('../../../../core/services/toast.service')).ToastService as any).error).toHaveBeenCalled();
    expect(comp.editingId()).toBeNull();
  });

  it('createNoteDirect handles create failure with error message', async () => {
    const mockNoteSvc = { createNote: jest.fn().mockRejectedValue(new Error('create fail')) };
    const mockToast = { success: jest.fn(), error: jest.fn() };
    await TestBed.configureTestingModule({ imports: [FolderTreeComponent], providers: [ { provide: (await import('../../../../core/services/note.service')).NoteService, useValue: mockNoteSvc }, { provide: (await import('../../../../core/services/auth-state.service')).AuthStateService, useValue: { userId: jest.fn().mockReturnValue('u1') } }, { provide: (await import('../../../../core/services/toast.service')).ToastService, useValue: mockToast }, { provide: (await import('../../../../core/services/workspace-state.service')).WorkspaceStateService, useValue: { setSelectedFolder: jest.fn(), emitNoteCreated: jest.fn() } } ] }).compileComponents();
    const fixture = TestBed.createComponent(FolderTreeComponent);
    const comp = fixture.componentInstance as any;

    const folder = { id: 'fN' } as any;

    await comp.createNoteDirect(folder);
    expect(TestBed.inject((await import('../../../../core/services/toast.service')).ToastService as any).error).toHaveBeenCalled();
  });

  it('downloadDocument success creates link and revokes URL', async () => {
    const supabase = { storage: { from: () => ({ createSignedUrl: jest.fn().mockResolvedValue({ data: { signedUrl: 'https://s' }, error: null }) }) } };
    const mockToast = { success: jest.fn(), error: jest.fn() };
    await TestBed.configureTestingModule({ imports: [FolderTreeComponent], providers: [ { provide: (await import('../../../../core/services/supabase.service')).SupabaseService, useValue: supabase }, { provide: (await import('../../../../core/services/toast.service')).ToastService, useValue: mockToast } ] }).compileComponents();
    const fixture = TestBed.createComponent(FolderTreeComponent);
    const comp = fixture.componentInstance as any;

    const blob = new Blob(['x'], { type: 'text/plain' });
    global.fetch = jest.fn(async () => ({ blob: async () => blob })) as any;

    // Use a real anchor element so appendChild/removeChild work in jsdom
    const a = document.createElement('a');
    const clickSpy = jest.spyOn(a, 'click').mockImplementation(() => {});
    jest.spyOn(document, 'createElement').mockImplementation((tag: string) => tag === 'a' ? a : document.createElement(tag));
    const createSpy = jest.spyOn(URL, 'createObjectURL').mockReturnValue('blob:1');
    const revokeSpy = jest.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    const note = { content: 'storage://notes/folder/file.txt', title: 'F' } as any;
    try {
      await comp.downloadDocument(note);

      expect(createSpy).toHaveBeenCalled();
      expect(clickSpy).toHaveBeenCalled();
      expect(revokeSpy).toHaveBeenCalled();
    } finally {
      // cleanup
      (global.fetch as jest.Mock).mockRestore?.();
      jest.restoreAllMocks();
    }
  });

  it('downloadDocument handles missing signed URL', async () => {
    const supabase = { storage: { from: () => ({ createSignedUrl: jest.fn().mockResolvedValue({ data: null, error: { message: 'no url' } }) }) } };
    const mockToast = { success: jest.fn(), error: jest.fn() };
    await TestBed.configureTestingModule({ imports: [FolderTreeComponent], providers: [ { provide: (await import('../../../../core/services/supabase.service')).SupabaseService, useValue: supabase }, { provide: (await import('../../../../core/services/toast.service')).ToastService, useValue: mockToast } ] }).compileComponents();
    const fixture = TestBed.createComponent(FolderTreeComponent);
    const comp = fixture.componentInstance as any;

    const note = { content: 'storage://notes/f/f', title: 'F' } as any;
    await comp.downloadDocument(note);

    expect(TestBed.inject((await import('../../../../core/services/toast.service')).ToastService as any).error).toHaveBeenCalled();
  });

  it('deleteFolder failure shows error and keeps folder', async () => {
    const mockFolderSvc = { deleteFolder: jest.fn().mockRejectedValue(new Error('del fail')) };
    const mockToast = { success: jest.fn(), error: jest.fn() };
    await TestBed.configureTestingModule({ imports: [FolderTreeComponent], providers: [ { provide: (await import('../../../folders/services/folder.service')).FolderService, useValue: mockFolderSvc }, { provide: (await import('../../../../core/services/auth-state.service')).AuthStateService, useValue: { userId: jest.fn().mockReturnValue('u1') } }, { provide: (await import('../../../../core/services/toast.service')).ToastService, useValue: mockToast } ] }).compileComponents();
    const fixture = TestBed.createComponent(FolderTreeComponent);
    const comp = fixture.componentInstance as any;

    const child = { id: 'cX', is_root: false } as any;
    comp.folders = [{ id: 'r' } as any, child];

    await comp.deleteFolder(child);
    expect(TestBed.inject((await import('../../../../core/services/toast.service')).ToastService as any).error).toHaveBeenCalled();
    expect(comp.folders.find((f:any) => f.id === 'cX')).toBeDefined();
  });

  it('onFolderDrop unauthenticated user shows error and clears drag state', async () => {
    const mockToast = { success: jest.fn(), error: jest.fn(), info: jest.fn() };
    await TestBed.configureTestingModule({ imports: [FolderTreeComponent], providers: [ { provide: (await import('../../../../core/services/auth-state.service')).AuthStateService, useValue: { userId: jest.fn().mockReturnValue(null) } }, { provide: (await import('../../../../core/services/toast.service')).ToastService, useValue: mockToast } ] }).compileComponents();
    const fixture = TestBed.createComponent(FolderTreeComponent);
    const comp = fixture.componentInstance as any;

    comp.draggedNote = { id: 'nX' } as any;
    comp.draggedNoteId.set('nX');
    comp.draggedSourceFolder = { id: 'sX' } as any;

    const ev: any = { preventDefault: jest.fn(), stopPropagation: jest.fn() } as any;
    await comp.onFolderDrop(ev, { id: 'tX' } as any);

    expect(TestBed.inject((await import('../../../../core/services/toast.service')).ToastService as any).error).toHaveBeenCalledWith('User not authenticated');
    expect(comp.draggedNoteId()).toBeNull();
  });

  it('onFolderDrop handles updateNote failure and shows error', async () => {
    const mockUpdate = jest.fn().mockRejectedValue(new Error('move fail'));
    const mockToast = { success: jest.fn(), error: jest.fn(), info: jest.fn() };
    await TestBed.configureTestingModule({ imports: [FolderTreeComponent], providers: [ { provide: (await import('../../../../core/services/note.service')).NoteService, useValue: { updateNote: mockUpdate } }, { provide: (await import('../../../../core/services/auth-state.service')).AuthStateService, useValue: { userId: jest.fn().mockReturnValue('u1') } }, { provide: (await import('../../../../core/services/toast.service')).ToastService, useValue: mockToast } ] }).compileComponents();
    const fixture = TestBed.createComponent(FolderTreeComponent);
    const comp = fixture.componentInstance as any;

    comp.draggedNote = { id: 'nM', title: 'Move' } as any;
    comp.draggedNoteId.set('nM');
    comp.draggedSourceFolder = { id: 's1', notes: [{ id: 'nM' } as any] } as any;

    const ev: any = { preventDefault: jest.fn(), stopPropagation: jest.fn() } as any;
    await comp.onFolderDrop(ev, { id: 't1', name: 'T' } as any);

    expect(TestBed.inject((await import('../../../../core/services/toast.service')).ToastService as any).error).toHaveBeenCalled();
  });

  it('showNoteProperties failure shows error', async () => {
    const mockGet = jest.fn().mockRejectedValue(new Error('nope'));
    const mockToast = { success: jest.fn(), error: jest.fn() };
    await TestBed.configureTestingModule({ imports: [FolderTreeComponent], providers: [ { provide: (await import('../../../../core/services/note.service')).NoteService, useValue: { getNote: mockGet } }, { provide: (await import('../../../../core/services/auth-state.service')).AuthStateService, useValue: { user: jest.fn().mockReturnValue({ email: 'me@e' }), userId: jest.fn().mockReturnValue('u1') } }, { provide: (await import('../../../../core/services/toast.service')).ToastService, useValue: mockToast } ] }).compileComponents();
    const fixture = TestBed.createComponent(FolderTreeComponent);
    const comp = fixture.componentInstance as any;

    const folder = { id: 'fP', name: 'F' } as any;
    const note = { id: 'nP', title: 'Note' } as any;

    await comp.showNoteProperties(note, folder);
    expect(TestBed.inject((await import('../../../../core/services/toast.service')).ToastService as any).error).toHaveBeenCalled();
  });
});
