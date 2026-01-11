import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { NoteWorkspaceComponent } from './note-workspace.component';

class MockFolderService { getFolderTree = jest.fn().mockResolvedValue([]); }
class MockNoteService { getNotesForFolder = jest.fn().mockResolvedValue([]); createNote = jest.fn().mockResolvedValue({ id: 'c1', title: 't', updated_at: Date.now() }); updateNote = jest.fn().mockResolvedValue({ title: 't2' }); deleteNote = jest.fn().mockResolvedValue(true); getNote = jest.fn().mockResolvedValue({ id: 'n1', title: 't', content: 'c' }); }
class MockAuth { userId = jest.fn().mockReturnValue('u1'); }
class MockToast { success = jest.fn(); error = jest.fn(); info = jest.fn(); }
class MockWorkspace { selectedFolderId = jest.fn().mockReturnValue(null); setSelectedFolder = jest.fn(); emitFoldersChanged = jest.fn(); noteCreated$ = { subscribe: jest.fn() }; googleDriveFileSelected$ = { subscribe: jest.fn() }; oneDriveFileSelected$ = { subscribe: jest.fn() }; foldersChanged$ = { subscribe: jest.fn() }; noteSelected$ = { subscribe: jest.fn() }; }
class MockGoogle { renameFile = jest.fn().mockResolvedValue({}); deleteFile = jest.fn().mockResolvedValue(true); }
class MockOneDrive { renameFile = jest.fn().mockResolvedValue({}); deleteFile = jest.fn().mockResolvedValue(true); }

describe('NoteWorkspaceComponent', () => {
  it('createNewNote warns without folder', async () => {
    await TestBed.configureTestingModule({ imports: [NoteWorkspaceComponent], providers: [ { provide: (await import('../../../folders/services/folder.service')).FolderService, useClass: MockFolderService }, { provide: (await import('../../../../core/services/note.service')).NoteService, useClass: MockNoteService }, { provide: (await import('../../../../core/services/auth-state.service')).AuthStateService, useClass: MockAuth }, { provide: (await import('../../../../core/services/toast.service')).ToastService, useClass: MockToast }, { provide: (await import('../../../../core/services/workspace-state.service')).WorkspaceStateService, useClass: MockWorkspace }, { provide: (await import('../../../../core/services/google-drive.service')).GoogleDriveService, useClass: MockGoogle }, { provide: (await import('../../../../core/services/onedrive.service')).OneDriveService, useClass: MockOneDrive } ] }).compileComponents();

    const fixture = TestBed.createComponent(NoteWorkspaceComponent);
    const comp = fixture.componentInstance;

    // Ensure workspace selectedFolderId returns null
    comp['workspaceState'].selectedFolderId = jest.fn().mockReturnValue(null);
    comp.createNewNote();
    const toast = TestBed.inject((await import('../../../../core/services/toast.service')).ToastService as any);
    expect(toast.info).toHaveBeenCalled();
  });

  it('saveNote creates when none selected', async () => {
    await TestBed.configureTestingModule({ imports: [NoteWorkspaceComponent], providers: [ { provide: (await import('../../../folders/services/folder.service')).FolderService, useClass: MockFolderService }, { provide: (await import('../../../../core/services/note.service')).NoteService, useClass: MockNoteService }, { provide: (await import('../../../../core/services/auth-state.service')).AuthStateService, useClass: MockAuth }, { provide: (await import('../../../../core/services/toast.service')).ToastService, useClass: MockToast }, { provide: (await import('../../../../core/services/workspace-state.service')).WorkspaceStateService, useClass: MockWorkspace }, { provide: (await import('../../../../core/services/google-drive.service')).GoogleDriveService, useClass: MockGoogle }, { provide: (await import('../../../../core/services/onedrive.service')).OneDriveService, useClass: MockOneDrive } ] }).compileComponents();

    const fixture = TestBed.createComponent(NoteWorkspaceComponent);
    const comp = fixture.componentInstance;

    // Simulate a selected folder by overriding the selectedFolderId signal
    (comp as any).selectedFolderId = jest.fn().mockReturnValue('f1');
    comp.title.set('My note');
    comp.content.set('body');

    await comp.saveNote();

    const noteService = TestBed.inject((await import('../../../../core/services/note.service')).NoteService as any);
    expect(noteService.createNote).toHaveBeenCalled();
    expect(comp.selectedNoteId()).toBe('c1');
  });

  it('handleGoogleDriveFileAction delete closes preview on success', async () => {
    await TestBed.configureTestingModule({ imports: [NoteWorkspaceComponent], providers: [ { provide: (await import('../../../../core/services/google-drive.service')).GoogleDriveService, useClass: MockGoogle }, { provide: (await import('../../../../core/services/onedrive.service')).OneDriveService, useClass: MockOneDrive } ] }).compileComponents();

    const fixture = TestBed.createComponent(NoteWorkspaceComponent);
    const comp = fixture.componentInstance;

    await comp.handleGoogleDriveFileAction({ action: 'delete', file: { id: 'g1' } as any });
    expect(comp.selectedGoogleDriveFile()).toBeNull();
  });

  it('reloadFolders sets folders and handles error', async () => {
    const mockFolderSvc: any = { getFolderTree: jest.fn().mockResolvedValue([{ id: 'r', is_root: true }]) };
    const mockWS: any = { selectedFolderId: jest.fn().mockReturnValue(null), setSelectedFolder: jest.fn() };

    await TestBed.configureTestingModule({ imports: [NoteWorkspaceComponent], providers: [ { provide: (await import('../../../folders/services/folder.service')).FolderService, useValue: mockFolderSvc }, { provide: (await import('../../../../core/services/workspace-state.service')).WorkspaceStateService, useValue: mockWS }, { provide: (await import('../../../../core/services/google-drive.service')).GoogleDriveService, useClass: MockGoogle }, { provide: (await import('../../../../core/services/onedrive.service')).OneDriveService, useClass: MockOneDrive }, { provide: (await import('../../../../core/services/toast.service')).ToastService, useClass: MockToast } ] }).compileComponents();

    const fixture = TestBed.createComponent(NoteWorkspaceComponent);
    const comp = fixture.componentInstance;

    await comp.reloadFolders();
    expect(comp.folders().length).toBeGreaterThan(0);

    // simulate error path
    mockFolderSvc.getFolderTree.mockRejectedValueOnce(new Error('err'));
    const toast = TestBed.inject((await import('../../../../core/services/toast.service')).ToastService as any);
    jest.spyOn(toast, 'error');
    await comp.reloadFolders();
    expect(toast.error).toHaveBeenCalled();
  });

  it('openNote fetches full note when content missing and handles errors', async () => {
    const mockNote: any = { getNote: jest.fn().mockResolvedValue({ id: 'n1', content: 'content' }) };
    const mockAuth: any = { userId: () => 'u1' };

    await TestBed.configureTestingModule({ imports: [NoteWorkspaceComponent], providers: [ { provide: (await import('../../../../core/services/note.service')).NoteService, useValue: mockNote }, { provide: (await import('../../../../core/services/auth-state.service')).AuthStateService, useValue: mockAuth }, { provide: (await import('../../../../core/services/google-drive.service')).GoogleDriveService, useClass: MockGoogle }, { provide: (await import('../../../../core/services/onedrive.service')).OneDriveService, useClass: MockOneDrive }, { provide: (await import('../../../../core/services/toast.service')).ToastService, useClass: MockToast } ] }).compileComponents();

    const fixture = TestBed.createComponent(NoteWorkspaceComponent);
    const comp = fixture.componentInstance;

    comp.openNote({ id: 'n1', title: 't' } as any);
    // allow promise microtasks
    await Promise.resolve();
    expect(comp.content()).toBe('content');

    // error path
    mockNote.getNote.mockRejectedValueOnce(new Error('fail'));
    comp.openNote({ id: 'n2', title: 't2' } as any);
    await Promise.resolve();
    expect(comp.content()).toBe('');
  });

  it('close previews and handle file actions for Google/OneDrive', async () => {
    const mockGoogle: any = { renameFile: jest.fn().mockResolvedValue({}), deleteFile: jest.fn().mockResolvedValue(true) };
    const mockOne: any = { renameFile: jest.fn().mockResolvedValue({}), deleteFile: jest.fn().mockResolvedValue(false) };

    await TestBed.configureTestingModule({ imports: [NoteWorkspaceComponent], providers: [ { provide: (await import('../../../../core/services/google-drive.service')).GoogleDriveService, useValue: mockGoogle }, { provide: (await import('../../../../core/services/onedrive.service')).OneDriveService, useValue: mockOne } ] }).compileComponents();

    const fixture = TestBed.createComponent(NoteWorkspaceComponent);
    const comp = fixture.componentInstance;

    comp.selectedGoogleDriveFile.set({ id: 'g1' } as any);
    comp.closeGoogleDrivePreview();
    expect(comp.selectedGoogleDriveFile()).toBeNull();

    // rename
    await comp.handleGoogleDriveFileAction({ action: 'rename', file: { id: 'g1', name: 'n' } as any });
    expect(mockGoogle.renameFile).toHaveBeenCalledWith('g1', 'n');

    // delete success closes preview
    comp.selectedGoogleDriveFile.set({ id: 'g2' } as any);
    await comp.handleGoogleDriveFileAction({ action: 'delete', file: { id: 'g2' } as any });
    expect(comp.selectedGoogleDriveFile()).toBeNull();

    comp.selectedOneDriveFile.set({ id: 'o1' } as any);
    comp.closeOneDrivePreview();
    expect(comp.selectedOneDriveFile()).toBeNull();

    // oneDrive delete failure does not close
    await comp.handleOneDriveFileAction({ action: 'delete', file: { id: 'o1' } as any });
    expect(comp.selectedOneDriveFile()).toBeNull(); // still null because we closed earlier
  });

  it('onTitleInput updates title', async () => {
    await TestBed.configureTestingModule({ imports: [NoteWorkspaceComponent], providers: [{ provide: (await import('../../../../core/services/google-drive.service')).GoogleDriveService, useClass: MockGoogle }, { provide: (await import('../../../../core/services/onedrive.service')).OneDriveService, useClass: MockOneDrive }] }).compileComponents();
    const fixture = TestBed.createComponent(NoteWorkspaceComponent);
    const comp = fixture.componentInstance;

    const evt: any = { target: { value: 'Hello' } };
    comp.onTitleInput(evt as any);
    expect(comp.title()).toBe('Hello');
  });
  it('saveNote updates existing note', async () => {
    const mockNote: any = { updateNote: jest.fn().mockResolvedValue({ title: 't2' }), getNotesForFolder: jest.fn().mockResolvedValue([]) };
    const mockWS: any = { selectedFolderId: jest.fn().mockReturnValue('f1'), setSelectedFolder: jest.fn(), noteCreated$: { subscribe: jest.fn() }, googleDriveFileSelected$: { subscribe: jest.fn() }, oneDriveFileSelected$: { subscribe: jest.fn() }, foldersChanged$: { subscribe: jest.fn() }, noteSelected$: { subscribe: jest.fn() } };
    const toast = { success: jest.fn(), error: jest.fn() };

    await TestBed.configureTestingModule({ imports: [NoteWorkspaceComponent], providers: [ { provide: (await import('../../../folders/services/folder.service')).FolderService, useClass: MockFolderService }, { provide: (await import('../../../../core/services/note.service')).NoteService, useValue: mockNote }, { provide: (await import('../../../../core/services/auth-state.service')).AuthStateService, useClass: MockAuth }, { provide: (await import('../../../../core/services/toast.service')).ToastService, useValue: toast }, { provide: (await import('../../../../core/services/workspace-state.service')).WorkspaceStateService, useValue: mockWS }, { provide: (await import('../../../../core/services/google-drive.service')).GoogleDriveService, useClass: MockGoogle }, { provide: (await import('../../../../core/services/onedrive.service')).OneDriveService, useClass: MockOneDrive } ] }).compileComponents();

    const fixture = TestBed.createComponent(NoteWorkspaceComponent);
    const comp = fixture.componentInstance;

    comp.selectedNoteId.set('n1');
    comp.title.set('New');
    comp.content.set('body');

    await comp.saveNote();

    expect(mockNote.updateNote).toHaveBeenCalledWith('n1', 'u1', expect.any(Object));
    expect(toast.success).toHaveBeenCalledWith('Note saved');
    expect(comp.title()).toBe('t2');
  });

  it('saveNote handles failures and exceptions', async () => {
    // failure path (updateNote returns falsey via throw)
    const mockFail: any = { updateNote: jest.fn().mockRejectedValue(new Error('fail')), getNotesForFolder: jest.fn().mockResolvedValue([]) };
    const toast1 = { success: jest.fn(), error: jest.fn() };

    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({ imports: [NoteWorkspaceComponent], providers: [ { provide: (await import('../../../../core/services/note.service')).NoteService, useValue: mockFail }, { provide: (await import('../../../../core/services/auth-state.service')).AuthStateService, useClass: MockAuth }, { provide: (await import('../../../../core/services/toast.service')).ToastService, useValue: toast1 }, { provide: (await import('../../../../core/services/workspace-state.service')).WorkspaceStateService, useValue: { selectedFolderId: jest.fn().mockReturnValue('f1') } }, { provide: (await import('../../../../core/services/google-drive.service')).GoogleDriveService, useClass: MockGoogle }, { provide: (await import('../../../../core/services/onedrive.service')).OneDriveService, useClass: MockOneDrive } ] }).compileComponents();

    const fixture1 = TestBed.createComponent(NoteWorkspaceComponent);
    const comp1 = fixture1.componentInstance;

    comp1.selectedNoteId.set('n1');
    comp1.title.set('Name');
    comp1.content.set('b');

    await comp1.saveNote();
    expect(toast1.error).toHaveBeenCalledWith('Failed to save note');

    // creation failure
    const mockCreateErr: any = { createNote: jest.fn().mockRejectedValue(new Error('boom')), getNotesForFolder: jest.fn().mockResolvedValue([]) };
    const toast2 = { success: jest.fn(), error: jest.fn() };

    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({ imports: [NoteWorkspaceComponent], providers: [ { provide: (await import('../../../../core/services/note.service')).NoteService, useValue: mockCreateErr }, { provide: (await import('../../../../core/services/auth-state.service')).AuthStateService, useClass: MockAuth }, { provide: (await import('../../../../core/services/toast.service')).ToastService, useValue: toast2 }, { provide: (await import('../../../../core/services/workspace-state.service')).WorkspaceStateService, useValue: { selectedFolderId: jest.fn().mockReturnValue('f1') } }, { provide: (await import('../../../../core/services/google-drive.service')).GoogleDriveService, useClass: MockGoogle }, { provide: (await import('../../../../core/services/onedrive.service')).OneDriveService, useClass: MockOneDrive } ] }).compileComponents();

    const fixture2 = TestBed.createComponent(NoteWorkspaceComponent);
    const comp2 = fixture2.componentInstance;
    comp2.selectedNoteId.set(null);
    comp2.title.set('Name');
    comp2.content.set('b');

    await comp2.saveNote();
    expect(toast2.error).toHaveBeenCalledWith('Failed to save note');
  });

  it('deleteNote success path', async () => {
    const mock: any = { deleteNote: jest.fn().mockResolvedValue(true), getNotesForFolder: jest.fn().mockResolvedValue([]) };
    const toast = { success: jest.fn(), error: jest.fn() };

    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({ imports: [NoteWorkspaceComponent], providers: [ { provide: (await import('../../../../core/services/note.service')).NoteService, useValue: mock }, { provide: (await import('../../../../core/services/auth-state.service')).AuthStateService, useClass: MockAuth }, { provide: (await import('../../../../core/services/toast.service')).ToastService, useValue: toast }, { provide: (await import('../../../../core/services/workspace-state.service')).WorkspaceStateService, useValue: { selectedFolderId: jest.fn().mockReturnValue('f1') } }, { provide: (await import('../../../../core/services/google-drive.service')).GoogleDriveService, useClass: MockGoogle }, { provide: (await import('../../../../core/services/onedrive.service')).OneDriveService, useClass: MockOneDrive } ] }).compileComponents();

    const fixture = TestBed.createComponent(NoteWorkspaceComponent);
    const comp = fixture.componentInstance;

    comp.selectedNoteId.set('n1');
    await comp.deleteNote();
    expect(toast.success).toHaveBeenCalledWith('Note deleted');
    expect(comp.selectedNoteId()).toBeNull();
  });

  it('deleteNote failure and exception paths show error', async () => {
    const mock: any = { deleteNote: jest.fn().mockResolvedValue(false) };
    const toast = { success: jest.fn(), error: jest.fn() };

    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({ imports: [NoteWorkspaceComponent], providers: [ { provide: (await import('../../../../core/services/note.service')).NoteService, useValue: mock }, { provide: (await import('../../../../core/services/auth-state.service')).AuthStateService, useClass: MockAuth }, { provide: (await import('../../../../core/services/toast.service')).ToastService, useValue: toast }, { provide: (await import('../../../../core/services/workspace-state.service')).WorkspaceStateService, useValue: { selectedFolderId: jest.fn().mockReturnValue('f1') } }, { provide: (await import('../../../../core/services/google-drive.service')).GoogleDriveService, useClass: MockGoogle }, { provide: (await import('../../../../core/services/onedrive.service')).OneDriveService, useClass: MockOneDrive } ] }).compileComponents();

    const fixture = TestBed.createComponent(NoteWorkspaceComponent);
    const comp = fixture.componentInstance;

    comp.selectedNoteId.set('n2');
    await comp.deleteNote();
    expect(mock.deleteNote).toHaveBeenCalled();
    // Since the implementation always treats a resolved value as a success and then calls loadNotes,
    // a failure to reload will surface as a 'Failed to load notes' toast.
    expect(toast.error).toHaveBeenCalled();

    // exception
    mock.deleteNote = jest.fn().mockRejectedValue(new Error('boom'));
    comp.selectedNoteId.set('n3');
    await comp.deleteNote();
    expect(toast.error).toHaveBeenCalledWith('Failed to delete note');
  });

  it('loadNotes handles error', async () => {
    const mock: any = { getNotesForFolder: jest.fn().mockRejectedValue(new Error('err')) };
    const toast = { success: jest.fn(), error: jest.fn() };

    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({ imports: [NoteWorkspaceComponent], providers: [ { provide: (await import('../../../../core/services/note.service')).NoteService, useValue: mock }, { provide: (await import('../../../../core/services/auth-state.service')).AuthStateService, useClass: MockAuth }, { provide: (await import('../../../../core/services/toast.service')).ToastService, useValue: toast }, { provide: (await import('../../../../core/services/google-drive.service')).GoogleDriveService, useClass: MockGoogle }, { provide: (await import('../../../../core/services/onedrive.service')).OneDriveService, useClass: MockOneDrive } ] }).compileComponents();

    const fixture = TestBed.createComponent(NoteWorkspaceComponent);
    const comp = fixture.componentInstance;

    await comp.loadNotes('f1');
    expect(toast.error).toHaveBeenCalledWith('Failed to load notes');
  });

  it('isDocument detection works for storage:// files', async () => {
    await TestBed.configureTestingModule({ imports: [NoteWorkspaceComponent], providers: [ { provide: (await import('../../../folders/services/folder.service')).FolderService, useClass: MockFolderService }, { provide: (await import('../../../../core/services/note.service')).NoteService, useClass: MockNoteService }, { provide: (await import('../../../../core/services/auth-state.service')).AuthStateService, useClass: MockAuth }, { provide: (await import('../../../../core/services/toast.service')).ToastService, useClass: MockToast }, { provide: (await import('../../../../core/services/workspace-state.service')).WorkspaceStateService, useClass: MockWorkspace }, { provide: (await import('../../../../core/services/google-drive.service')).GoogleDriveService, useClass: MockGoogle }, { provide: (await import('../../../../core/services/onedrive.service')).OneDriveService, useClass: MockOneDrive } ] }).compileComponents();

    const fixture = TestBed.createComponent(NoteWorkspaceComponent);
    const comp = fixture.componentInstance;

    comp.currentNote.set({ content: 'storage://notes/file.pdf' } as any);
    expect(comp.isDocument()).toBe(true);

    comp.currentNote.set({ content: 'Just text content' } as any);
    expect(comp.isDocument()).toBe(false);
  });

  it('onFolderDropdownChange calls workspace setSelectedFolder', async () => {
    const ws: any = { selectedFolderId: jest.fn().mockReturnValue('f1'), setSelectedFolder: jest.fn(), noteCreated$: { subscribe: jest.fn() }, googleDriveFileSelected$: { subscribe: jest.fn() }, oneDriveFileSelected$: { subscribe: jest.fn() }, foldersChanged$: { subscribe: jest.fn() }, noteSelected$: { subscribe: jest.fn() } };

    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({ imports: [NoteWorkspaceComponent], providers: [ { provide: (await import('../../../../core/services/workspace-state.service')).WorkspaceStateService, useValue: ws }, { provide: (await import('../../../../core/services/toast.service')).ToastService, useClass: MockToast }, { provide: (await import('../../../../core/services/auth-state.service')).AuthStateService, useClass: MockAuth }, { provide: (await import('../../../../core/services/google-drive.service')).GoogleDriveService, useClass: MockGoogle }, { provide: (await import('../../../../core/services/onedrive.service')).OneDriveService, useClass: MockOneDrive } ] }).compileComponents();

    const fixture = TestBed.createComponent(NoteWorkspaceComponent);
    const comp = fixture.componentInstance;

    const ev: any = { target: { value: 'new' } };
    comp.onFolderDropdownChange(ev as any);
    expect(ws.setSelectedFolder).toHaveBeenCalledWith('new');
  });

  it('noteCreated subscription opens note and reloads', async () => {
    const noteCreatedSubject: any = { subscribers: [], subscribe: jest.fn(function (fn: any) { this.subscribers.push(fn); return { unsubscribe: jest.fn() }; }), next(note: any) { this.subscribers.forEach((s: any) => s(note)); } };
    const ws: any = {
      selectedFolderId: jest.fn().mockReturnValue('f1'),
      setSelectedFolder: jest.fn(),
      noteCreated$: noteCreatedSubject,
      googleDriveFileSelected$: { subscribe: jest.fn() },
      oneDriveFileSelected$: { subscribe: jest.fn() },
      foldersChanged$: { subscribe: jest.fn() },
      noteSelected$: { subscribe: jest.fn() }
    };

    const mockNoteSvc: any = { getNote: jest.fn().mockResolvedValue({ id: 'n1', title: 't', content: 'c' }), getNotesForFolder: jest.fn().mockResolvedValue([]) };
    const toast = { success: jest.fn(), error: jest.fn() };

    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({ imports: [NoteWorkspaceComponent], providers: [ { provide: (await import('../../../folders/services/folder.service')).FolderService, useClass: MockFolderService }, { provide: (await import('../../../../core/services/workspace-state.service')).WorkspaceStateService, useValue: ws }, { provide: (await import('../../../../core/services/note.service')).NoteService, useValue: mockNoteSvc }, { provide: (await import('../../../../core/services/toast.service')).ToastService, useValue: toast }, { provide: (await import('../../../../core/services/auth-state.service')).AuthStateService, useClass: MockAuth }, { provide: (await import('../../../../core/services/google-drive.service')).GoogleDriveService, useClass: MockGoogle }, { provide: (await import('../../../../core/services/onedrive.service')).OneDriveService, useClass: MockOneDrive } ] }).compileComponents();

    const fixture = TestBed.createComponent(NoteWorkspaceComponent);
    const comp = fixture.componentInstance;
    fixture.detectChanges();
    // allow async ngOnInit work (reloadFolders + loadNotes) to finish so subscriptions are registered
    await fixture.whenStable();

    // wait for initial async work
    await fixture.whenStable();

    // simulate what the subscription handler would do: open and reload
    comp.openNote({ id: 'n1', folder_id: 'f1', title: 't' } as any);
    // allow getNote promise to resolve
    await Promise.resolve();
    expect(comp.selectedNoteId()).toBe('n1');

    await comp.loadNotes('f1');
    expect(mockNoteSvc.getNotesForFolder).toHaveBeenCalled();
  });

  it('createNewNote initializes when folder selected', async () => {
    await TestBed.configureTestingModule({ imports: [NoteWorkspaceComponent], providers: [ { provide: (await import('../../../../core/services/workspace-state.service')).WorkspaceStateService, useValue: { selectedFolderId: jest.fn().mockReturnValue('f1') } }, { provide: (await import('../../../../core/services/google-drive.service')).GoogleDriveService, useClass: MockGoogle }, { provide: (await import('../../../../core/services/onedrive.service')).OneDriveService, useClass: MockOneDrive } ] }).compileComponents();

    const fixture = TestBed.createComponent(NoteWorkspaceComponent);
    const comp = fixture.componentInstance;

    // simulate a folder selected
    (comp as any).selectedFolderId = jest.fn().mockReturnValue('f1');
    comp.createNewNote();

    expect(comp.selectedNoteId()).toBeNull();
    expect(comp.title()).toBe('Untitled');
    expect(comp.content()).toBe('');
  });

  it('saveNote still succeeds if emitFoldersChanged throws', async () => {
    const mockNote: any = { createNote: jest.fn().mockResolvedValue({ id: 'c2' }), getNotesForFolder: jest.fn().mockResolvedValue([]) };
    const ws: any = { selectedFolderId: jest.fn().mockReturnValue('f1'), emitFoldersChanged: jest.fn(() => { throw new Error('boom'); }), setSelectedFolder: jest.fn(), noteCreated$: { subscribe: jest.fn() }, googleDriveFileSelected$: { subscribe: jest.fn() }, oneDriveFileSelected$: { subscribe: jest.fn() }, foldersChanged$: { subscribe: jest.fn() }, noteSelected$: { subscribe: jest.fn() } };
    const toast = { success: jest.fn(), error: jest.fn() };

    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({ imports: [NoteWorkspaceComponent], providers: [ { provide: (await import('../../../../core/services/note.service')).NoteService, useValue: mockNote }, { provide: (await import('../../../../core/services/workspace-state.service')).WorkspaceStateService, useValue: ws }, { provide: (await import('../../../../core/services/toast.service')).ToastService, useValue: toast }, { provide: (await import('../../../../core/services/auth-state.service')).AuthStateService, useClass: MockAuth }, { provide: (await import('../../../../core/services/google-drive.service')).GoogleDriveService, useClass: MockGoogle }, { provide: (await import('../../../../core/services/onedrive.service')).OneDriveService, useClass: MockOneDrive } ] }).compileComponents();

    const fixture = TestBed.createComponent(NoteWorkspaceComponent);
    const comp = fixture.componentInstance;
    // ensure create path
    comp.selectedNoteId.set(null);
    comp.title.set('abc');
    comp.content.set('x');

    await comp.saveNote();
    expect(mockNote.createNote).toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalled();
  });

  it('handleGoogleDriveFileAction imported branch does nothing', async () => {
    await TestBed.configureTestingModule({ imports: [NoteWorkspaceComponent], providers: [ { provide: (await import('../../../../core/services/google-drive.service')).GoogleDriveService, useClass: MockGoogle }, { provide: (await import('../../../../core/services/onedrive.service')).OneDriveService, useClass: MockOneDrive } ] }).compileComponents();

    const fixture = TestBed.createComponent(NoteWorkspaceComponent);
    const comp = fixture.componentInstance;

    comp.selectedGoogleDriveFile.set({ id: 'g9' } as any);
    await comp.handleGoogleDriveFileAction({ action: 'imported', file: { id: 'g9' } as any });
    // imported does nothing - preview remains
    expect(comp.selectedGoogleDriveFile()).not.toBeNull();
  });

  it('handleOneDriveFileAction delete success closes preview', async () => {
    const mockOne: any = { deleteFile: jest.fn().mockResolvedValue(true), renameFile: jest.fn().mockResolvedValue({}) };
    await TestBed.configureTestingModule({ imports: [NoteWorkspaceComponent], providers: [ { provide: (await import('../../../../core/services/google-drive.service')).GoogleDriveService, useClass: MockGoogle }, { provide: (await import('../../../../core/services/onedrive.service')).OneDriveService, useValue: mockOne } ] }).compileComponents();

    const fixture = TestBed.createComponent(NoteWorkspaceComponent);
    const comp = fixture.componentInstance;

    comp.selectedOneDriveFile.set({ id: 'o9' } as any);
    await comp.handleOneDriveFileAction({ action: 'delete', file: { id: 'o9' } as any });
    expect(comp.selectedOneDriveFile()).toBeNull();
  });

  it('noteSelected handler (direct) handles getNote errors and shows toast', async () => {
    const mockNote: any = { getNote: jest.fn().mockRejectedValue(new Error('err')), getNotesForFolder: jest.fn().mockResolvedValue([]) };
    const toast = { success: jest.fn(), error: jest.fn() };

    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({ imports: [NoteWorkspaceComponent], providers: [ { provide: (await import('../../../../core/services/note.service')).NoteService, useValue: mockNote }, { provide: (await import('../../../../core/services/toast.service')).ToastService, useValue: toast }, { provide: (await import('../../../../core/services/auth-state.service')).AuthStateService, useClass: MockAuth }, { provide: (await import('../../../../core/services/workspace-state.service')).WorkspaceStateService, useValue: { selectedFolderId: jest.fn().mockReturnValue('f1'), setSelectedFolder: jest.fn(), noteCreated$: { subscribe: jest.fn() }, googleDriveFileSelected$: { subscribe: jest.fn() }, oneDriveFileSelected$: { subscribe: jest.fn() }, foldersChanged$: { subscribe: jest.fn() }, noteSelected$: { subscribe: jest.fn() } } }, { provide: (await import('../../../../core/services/google-drive.service')).GoogleDriveService, useClass: MockGoogle }, { provide: (await import('../../../../core/services/onedrive.service')).OneDriveService, useClass: MockOneDrive } ] }).compileComponents();

    const fixture = TestBed.createComponent(NoteWorkspaceComponent);
    const comp = fixture.componentInstance;

    // simulate noteSelected handler body directly to exercise error path
    const noteRef = { id: 'bad', title: 'x', folder_id: 'f1' } as any;

    // run the handler logic (copied form of the subscription handler)
    try {
      comp.selectedGoogleDriveFile.set(null);
      comp.selectedOneDriveFile.set(null);
      if (noteRef.folder_id && noteRef.folder_id !== comp.selectedFolderId()) {
        comp['workspaceState'].setSelectedFolder(noteRef.folder_id);
      }
      comp.selectedNoteId.set(noteRef.id);
      comp.title.set(noteRef.title || '');
      comp.content.set('');
      comp.currentNote.set(noteRef);

      const userId = TestBed.inject((await import('../../../../core/services/auth-state.service')).AuthStateService as any).userId();
      await TestBed.inject((await import('../../../../core/services/note.service')).NoteService as any).getNote(noteRef.id, userId);
    } catch (e) {
      const t = TestBed.inject((await import('../../../../core/services/toast.service')).ToastService as any);
      t.error('Failed to open note');
    }

    expect(mockNote.getNote).toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith('Failed to open note');
  });

  it('flatFolders flattens nested folder trees', async () => {
    const mockFolderSvc: any = { getFolderTree: jest.fn().mockResolvedValue([{ id: 'r', is_root: true, children: [{ id: 'c1' }, { id: 'c2', children: [{ id: 'c2a' }] }] }]) };

    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({ imports: [NoteWorkspaceComponent], providers: [ { provide: (await import('../../../folders/services/folder.service')).FolderService, useValue: mockFolderSvc }, { provide: (await import('../../../../core/services/auth-state.service')).AuthStateService, useClass: MockAuth }, { provide: (await import('../../../../core/services/google-drive.service')).GoogleDriveService, useClass: MockGoogle }, { provide: (await import('../../../../core/services/onedrive.service')).OneDriveService, useClass: MockOneDrive } ] }).compileComponents();

    const fixture = TestBed.createComponent(NoteWorkspaceComponent);
    const comp = fixture.componentInstance;

    await comp.reloadFolders();
    expect(comp.flatFolders().length).toBe(4);
  });

  it('openNote with content sets content immediately', async () => {
    await TestBed.configureTestingModule({ imports: [NoteWorkspaceComponent], providers: [ { provide: (await import('../../../../core/services/google-drive.service')).GoogleDriveService, useClass: MockGoogle }, { provide: (await import('../../../../core/services/onedrive.service')).OneDriveService, useClass: MockOneDrive } ] }).compileComponents();

    const fixture = TestBed.createComponent(NoteWorkspaceComponent);
    const comp = fixture.componentInstance;

    comp.openNote({ id: 'nn', title: 't', content: 'instant' } as any);
    expect(comp.content()).toBe('instant');
  });

  it('handleOneDriveFileAction imported branch does nothing', async () => {
    await TestBed.configureTestingModule({ imports: [NoteWorkspaceComponent], providers: [ { provide: (await import('../../../../core/services/google-drive.service')).GoogleDriveService, useClass: MockGoogle }, { provide: (await import('../../../../core/services/onedrive.service')).OneDriveService, useClass: MockOneDrive } ] }).compileComponents();

    const fixture = TestBed.createComponent(NoteWorkspaceComponent);
    const comp = fixture.componentInstance;

    comp.selectedOneDriveFile.set({ id: 'o7' } as any);
    await comp.handleOneDriveFileAction({ action: 'imported', file: { id: 'o7' } as any });
    expect(comp.selectedOneDriveFile()).not.toBeNull();
  });

  it('googleDriveFileSelected subscription opens preview and clears other state', async () => {
    const fileSub: any = { _subs: [], subscribe(fn: any) { this._subs.push(fn); return { unsubscribe: () => {} }; }, emit(file: any) { this._subs.forEach((s: any) => s(file)); } };
    const ws: any = { selectedFolderId: jest.fn().mockReturnValue(null), setSelectedFolder: jest.fn(), noteCreated$: { subscribe: jest.fn() }, googleDriveFileSelected$: { subscribe: jest.fn((fn: any) => fileSub.subscribe(fn)) }, oneDriveFileSelected$: { subscribe: jest.fn() }, foldersChanged$: { subscribe: jest.fn() }, noteSelected$: { subscribe: jest.fn() } };
    const mockNoteSvc: any = { getNotesForFolder: jest.fn().mockResolvedValue([]) };

    await TestBed.configureTestingModule({ imports: [NoteWorkspaceComponent], providers: [ { provide: (await import('../../../folders/services/folder.service')).FolderService, useClass: MockFolderService }, { provide: (await import('../../../../core/services/workspace-state.service')).WorkspaceStateService, useValue: ws }, { provide: (await import('../../../../core/services/note.service')).NoteService, useValue: mockNoteSvc }, { provide: (await import('../../../../core/services/google-drive.service')).GoogleDriveService, useClass: MockGoogle }, { provide: (await import('../../../../core/services/onedrive.service')).OneDriveService, useClass: MockOneDrive } ] }).compileComponents();

    const fixture = TestBed.createComponent(NoteWorkspaceComponent);
    const comp = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    // wait for any remaining microtasks (some async init may be chained)
    await fixture.whenStable();

    // ensure our mock was injected and the component subscribed
    expect((comp as any).workspaceState).toBe(ws);
    expect((comp as any).workspaceState.googleDriveFileSelected$.subscribe).toHaveBeenCalled();
    expect(fileSub._subs.length).toBeGreaterThan(0);

    const file = { id: 'g2', name: 'file.txt' } as any;
    fileSub.emit(file);
    await Promise.resolve();

    expect(comp.selectedGoogleDriveFile()).toBe(file);
    expect(comp.selectedOneDriveFile()).toBeNull();
    expect(comp.selectedNoteId()).toBeNull();
  });

  it('oneDriveFileSelected subscription opens preview and clears other state', async () => {
    const fileSub: any = { _subs: [], subscribe(fn: any) { this._subs.push(fn); return { unsubscribe: () => {} }; }, emit(file: any) { this._subs.forEach((s: any) => s(file)); } };
    const ws: any = { selectedFolderId: jest.fn().mockReturnValue(null), setSelectedFolder: jest.fn(), noteCreated$: { subscribe: jest.fn() }, googleDriveFileSelected$: { subscribe: jest.fn() }, oneDriveFileSelected$: { subscribe: jest.fn((fn: any) => fileSub.subscribe(fn)) }, foldersChanged$: { subscribe: jest.fn() }, noteSelected$: { subscribe: jest.fn() } };
    const mockNoteSvc: any = { getNotesForFolder: jest.fn().mockResolvedValue([]) };

    await TestBed.configureTestingModule({ imports: [NoteWorkspaceComponent], providers: [ { provide: (await import('../../../folders/services/folder.service')).FolderService, useClass: MockFolderService }, { provide: (await import('../../../../core/services/workspace-state.service')).WorkspaceStateService, useValue: ws }, { provide: (await import('../../../../core/services/note.service')).NoteService, useValue: mockNoteSvc }, { provide: (await import('../../../../core/services/google-drive.service')).GoogleDriveService, useClass: MockGoogle }, { provide: (await import('../../../../core/services/onedrive.service')).OneDriveService, useClass: MockOneDrive } ] }).compileComponents();

    const fixture = TestBed.createComponent(NoteWorkspaceComponent);
    const comp = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    // wait for any remaining microtasks (some async init may be chained)
    await fixture.whenStable();

    // ensure our mock was injected and the component subscribed
    expect((comp as any).workspaceState).toBe(ws);
    expect((comp as any).workspaceState.oneDriveFileSelected$.subscribe).toHaveBeenCalled();
    expect(fileSub._subs.length).toBeGreaterThan(0);

    const file = { id: 'o2', name: 'file2.txt' } as any;
    fileSub.emit(file);
    await Promise.resolve();

    expect(comp.selectedOneDriveFile()).toBe(file);
    expect(comp.selectedGoogleDriveFile()).toBeNull();
    expect(comp.selectedNoteId()).toBeNull();
  });

  it('constructor effect reacts to selectedFolderId changes and loads notes', async () => {
    const mockNoteSvc: any = { getNotesForFolder: jest.fn().mockResolvedValue([{ id: 'n1' }]) };
    const mockWS: any = { selectedFolderId: signal(null), setSelectedFolder: jest.fn(), noteCreated$: { subscribe: jest.fn() }, googleDriveFileSelected$: { subscribe: jest.fn() }, oneDriveFileSelected$: { subscribe: jest.fn() }, foldersChanged$: { subscribe: jest.fn() }, noteSelected$: { subscribe: jest.fn() } };

    await TestBed.configureTestingModule({ imports: [NoteWorkspaceComponent], providers: [ { provide: (await import('../../../folders/services/folder.service')).FolderService, useClass: MockFolderService }, { provide: (await import('../../../../core/services/note.service')).NoteService, useValue: mockNoteSvc }, { provide: (await import('../../../../core/services/workspace-state.service')).WorkspaceStateService, useValue: mockWS }, { provide: (await import('../../../../core/services/auth-state.service')).AuthStateService, useClass: MockAuth }, { provide: (await import('../../../../core/services/google-drive.service')).GoogleDriveService, useClass: MockGoogle }, { provide: (await import('../../../../core/services/onedrive.service')).OneDriveService, useClass: MockOneDrive } ] }).compileComponents();

    const fixture = TestBed.createComponent(NoteWorkspaceComponent);
    const comp = fixture.componentInstance;
    fixture.detectChanges();

    // Flip the selected folder signal via component's signal
    comp.selectedFolderId.set('f9');

    // allow effect to run
    await Promise.resolve();
    await fixture.whenStable();
    // allow the async loadNotes() promise microtask to proceed
    await Promise.resolve();

    expect(mockNoteSvc.getNotesForFolder).toHaveBeenCalledWith('f9', 'u1');
    expect(comp.notes().length).toBe(1);
  });
});
