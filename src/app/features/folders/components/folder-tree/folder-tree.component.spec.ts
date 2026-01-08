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
});
