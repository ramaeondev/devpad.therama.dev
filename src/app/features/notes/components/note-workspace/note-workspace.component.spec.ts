import { TestBed } from '@angular/core/testing';
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
    await TestBed.configureTestingModule({ imports: [NoteWorkspaceComponent], providers: [ { provide: (await import('../../../../core/services/google-drive.service')).GoogleDriveService, useClass: MockGoogle }, { provide: (await import('../../../../core/services/oneDrive.service')).OneDriveService, useClass: MockOneDrive } ] }).compileComponents();

    const fixture = TestBed.createComponent(NoteWorkspaceComponent);
    const comp = fixture.componentInstance;

    await comp.handleGoogleDriveFileAction({ action: 'delete', file: { id: 'g1' } as any });
    expect(comp.selectedGoogleDriveFile()).toBeNull();
  });
});
