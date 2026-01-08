import { TestBed } from '@angular/core/testing';
import { OneDriveTreeComponent } from './onedrive-tree.component';

class MockOneDriveService { async checkConnection(){} async downloadFile(){ return new Blob(['ok']); } async renameFile(){} async deleteFile(){} }
class MockNoteService { uploadDocument = jest.fn().mockResolvedValue({}); }
class MockAuth { userId = jest.fn().mockReturnValue('u1'); }
class MockToast { success = jest.fn(); error = jest.fn(); }
class MockWorkspace { emitOneDriveFileSelected = jest.fn(); emitFoldersChanged = jest.fn(); }
class MockFolderService { getFolders = jest.fn().mockResolvedValue([]); createFolder = jest.fn().mockResolvedValue({ id: 'imports' }); }

describe('OneDriveTreeComponent', () => {
  it('toggles expanded folders and properties modal', async () => {
    await TestBed.configureTestingModule({ imports: [OneDriveTreeComponent], providers: [ { provide: (await import('../../../../core/services/onedrive.service')).OneDriveService, useClass: MockOneDriveService }, { provide: (await import('../../../../core/services/note.service')).NoteService, useClass: MockNoteService }, { provide: (await import('../../../../core/services/auth-state.service')).AuthStateService, useClass: MockAuth }, { provide: (await import('../../../../core/services/toast.service')).ToastService, useClass: MockToast }, { provide: (await import('../../../../core/services/workspace-state.service')).WorkspaceStateService, useClass: MockWorkspace }, { provide: (await import('../../../folders/services/folder.service')).FolderService, useClass: MockFolderService } ] }).compileComponents();

    const fixture = TestBed.createComponent(OneDriveTreeComponent);
    const comp = fixture.componentInstance;

    expect(comp.isExpanded('a')).toBe(false);
    comp.toggleFolder('a');
    expect(comp.isExpanded('a')).toBe(true);

    const file = { id: 'f1', name: 'file.txt', mimeType: 'text/plain', size: 1024 } as any;
    comp.handleProperties(file);
    expect(comp.showPropertiesModal()).toBe(true);
    expect(comp.propertiesModalData().length).toBeGreaterThan(0);
  });

  it('handles download flow and toast on success', async () => {
    await TestBed.configureTestingModule({ imports: [OneDriveTreeComponent], providers: [ { provide: (await import('../../../../core/services/onedrive.service')).OneDriveService, useClass: MockOneDriveService }, { provide: (await import('../../../../core/services/toast.service')).ToastService, useClass: MockToast } ] }).compileComponents();

    const fixture = TestBed.createComponent(OneDriveTreeComponent);
    const comp = fixture.componentInstance;

    // Ensure URL.createObjectURL is available in test env
    const file = { id: 'f1', name: 'file.txt', mimeType: 'text/plain' } as any;
    const toast = TestBed.inject((await import('../../../../core/services/toast.service')).ToastService as any);

    await comp.handleDownload(file);

    expect(toast.success).toHaveBeenCalled();
  });

  it('imports file to DevPad', async () => {
    await TestBed.configureTestingModule({ imports: [OneDriveTreeComponent], providers: [ { provide: (await import('../../../../core/services/onedrive.service')).OneDriveService, useClass: MockOneDriveService }, { provide: (await import('../../../../core/services/note.service')).NoteService, useClass: MockNoteService }, { provide: (await import('../../../folders/services/folder.service')).FolderService, useClass: MockFolderService }, { provide: (await import('../../../../core/services/auth-state.service')).AuthStateService, useClass: MockAuth }, { provide: (await import('../../../../core/services/toast.service')).ToastService, useClass: MockToast }, { provide: (await import('../../../../core/services/workspace-state.service')).WorkspaceStateService, useClass: MockWorkspace } ] }).compileComponents();

    const fixture = TestBed.createComponent(OneDriveTreeComponent);
    const comp = fixture.componentInstance;

    const file = { id: 'f1', name: 'file.txt', mimeType: 'text/plain' } as any;

    await comp.handleImportToDevPad(file);

    const toast = TestBed.inject((await import('../../../../core/services/toast.service')).ToastService as any);
    expect(toast.success).toHaveBeenCalled();
  });
});
