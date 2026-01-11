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

  it('handleDownload shows error when download fails', async () => {
    class FailOneDrive { async downloadFile(){ throw new Error('dl fail'); } }
    const mockToast = new MockToast();
    await TestBed.configureTestingModule({ imports: [OneDriveTreeComponent], providers: [{ provide: (await import('../../../../core/services/onedrive.service')).OneDriveService, useClass: FailOneDrive }, { provide: (await import('../../../../core/services/toast.service')).ToastService, useValue: mockToast }] }).compileComponents();

    const fixture = TestBed.createComponent(OneDriveTreeComponent);
    const comp = fixture.componentInstance;
    const file = { id: 'f1', name: 'file.txt' } as any;

    await comp.handleDownload(file);
    expect(mockToast.error).toHaveBeenCalled();
  });

  it('handleImportToDevPad shows error when uploadDocument fails', async () => {
    class OKOneDrive { async downloadFile(){ return new Blob(['ok']); } }
    const mockNote: any = { uploadDocument: jest.fn().mockRejectedValue(new Error('upload fail')) };
    const mockToast = new MockToast();

    await TestBed.configureTestingModule({ imports: [OneDriveTreeComponent], providers: [ { provide: (await import('../../../../core/services/onedrive.service')).OneDriveService, useClass: OKOneDrive }, { provide: (await import('../../../../core/services/note.service')).NoteService, useValue: mockNote }, { provide: (await import('../../../../core/services/toast.service')).ToastService, useValue: mockToast }, { provide: (await import('../../../folders/services/folder.service')).FolderService, useClass: MockFolderService }, { provide: (await import('../../../../core/services/auth-state.service')).AuthStateService, useClass: MockAuth } ] }).compileComponents();

    const fixture = TestBed.createComponent(OneDriveTreeComponent);
    const comp = fixture.componentInstance;
    const file = { id: 'f1', name: 'file.txt', mimeType: 'text/plain' } as any;

    await comp.handleImportToDevPad(file);
    expect(mockToast.error).toHaveBeenCalled();
  });

  it('confirmRename and confirmDelete call OneDrive and reset state', async () => {
    const renameSpy = jest.fn().mockResolvedValue(undefined);
    const deleteSpy = jest.fn().mockResolvedValue(undefined);
    class OpsOneDrive { async renameFile(id: string, name: string){ return renameSpy(id, name); } async deleteFile(id: string){ return deleteSpy(id); } }

    await TestBed.configureTestingModule({ imports: [OneDriveTreeComponent], providers: [ { provide: (await import('../../../../core/services/onedrive.service')).OneDriveService, useClass: OpsOneDrive } ] }).compileComponents();
    const fixture = TestBed.createComponent(OneDriveTreeComponent);
    const comp = fixture.componentInstance;

    const file = { id: 'f1', name: 'old.txt' } as any;
    comp.fileToRename.set(file);
    comp.newFileName.set('new.txt');
    await comp.confirmRename();
    expect(renameSpy).toHaveBeenCalledWith('f1', 'new.txt');
    expect(comp.fileToRename()).toBeNull();
    expect(comp.newFileName()).toBe('');

    comp.fileToDelete.set(file);
    await comp.confirmDelete();
    expect(deleteSpy).toHaveBeenCalledWith('f1');
    expect(comp.fileToDelete()).toBeNull();
  });

  it('connect/disconnect confirm flows and cancel behave correctly', async () => {
    const connectSpy = jest.fn().mockResolvedValue(undefined);
    const disconnectSpy = jest.fn().mockResolvedValue(undefined);
    class ConnOneDrive { async connect(){ return connectSpy(); } async disconnect(){ return disconnectSpy(); } async checkConnection(){} }

    await TestBed.configureTestingModule({ imports: [OneDriveTreeComponent], providers: [{ provide: (await import('../../../../core/services/onedrive.service')).OneDriveService, useClass: ConnOneDrive }] }).compileComponents();
    const fixture = TestBed.createComponent(OneDriveTreeComponent);
    const comp = fixture.componentInstance;

    await comp.connectOneDrive();
    expect(connectSpy).toHaveBeenCalled();

    // disconnect confirm flow
    comp.disconnectOneDrive();
    expect(comp.showDisconnectConfirm()).toBe(true);
    comp.cancelDisconnect();
    expect(comp.showDisconnectConfirm()).toBe(false);

    comp.disconnectOneDrive();
    await comp.confirmDisconnect();
    expect(disconnectSpy).toHaveBeenCalled();
    expect(comp.showDisconnectConfirm()).toBe(false);
  });

  it('confirmRename cancels when new name invalid', async () => {
    await TestBed.configureTestingModule({ imports: [OneDriveTreeComponent], providers: [{ provide: (await import('../../../../core/services/onedrive.service')).OneDriveService, useClass: MockOneDriveService }] }).compileComponents();
    const fixture = TestBed.createComponent(OneDriveTreeComponent);
    const comp = fixture.componentInstance;

    const file = { id: 'f1', name: 'old.txt' } as any;
    comp.fileToRename.set(file);
    // same name -> cancel
    comp.newFileName.set('old.txt');
    await comp.confirmRename();
    expect(comp.fileToRename()).toBeNull();
    expect(comp.newFileName()).toBe('');

    // empty name -> cancel
    comp.fileToRename.set(file);
    comp.newFileName.set('');
    await comp.confirmRename();
    expect(comp.fileToRename()).toBeNull();
    expect(comp.newFileName()).toBe('');
  });

  it('cancelDelete resets state', async () => {
    await TestBed.configureTestingModule({ imports: [OneDriveTreeComponent], providers: [{ provide: (await import('../../../../core/services/onedrive.service')).OneDriveService, useClass: MockOneDriveService }] }).compileComponents();
    const fixture = TestBed.createComponent(OneDriveTreeComponent);
    const comp = fixture.componentInstance;

    const file = { id: 'f1', name: 'file.txt' } as any;
    comp.fileToDelete.set(file);
    comp.showDeleteConfirm.set(true);
    comp.cancelDelete();

    expect(comp.showDeleteConfirm()).toBe(false);
    expect(comp.fileToDelete()).toBeNull();
  });

  it('handleProperties uses Unknown for missing size and modified date', async () => {
    await TestBed.configureTestingModule({ imports: [OneDriveTreeComponent], providers: [{ provide: (await import('../../../../core/services/onedrive.service')).OneDriveService, useClass: MockOneDriveService }] }).compileComponents();
    const fixture = TestBed.createComponent(OneDriveTreeComponent);
    const comp = fixture.componentInstance;

    const file = { id: 'f1', name: 'file.txt' } as any; // no size, no lastModifiedDateTime
    comp.handleProperties(file);

    expect(comp.showPropertiesModal()).toBe(true);
    const props = comp.propertiesModalData();
    const sizeProp = props.find(p => p.label === 'Size');
    const modProp = props.find(p => p.label === 'Modified');
    expect(sizeProp?.value).toContain('Unknown');
    expect(modProp?.value).toContain('Unknown');
  });

  it('ngOnInit calls checkConnection and getFileIconName returns a string', async () => {
    const checkSpy = jest.fn().mockResolvedValue(undefined);
    class InitOneDrive { async checkConnection(){ return checkSpy(); } }

    await TestBed.configureTestingModule({ imports: [OneDriveTreeComponent], providers: [{ provide: (await import('../../../../core/services/onedrive.service')).OneDriveService, useClass: InitOneDrive }] }).compileComponents();
    const fixture = TestBed.createComponent(OneDriveTreeComponent);
    const comp = fixture.componentInstance;

    await comp.ngOnInit();
    expect(checkSpy).toHaveBeenCalled();

    const file = { id: 'f1', name: 'file.pdf', mimeType: 'application/pdf' } as any;
    const icon = comp.getFileIconName(file);
    expect(typeof icon).toBe('string');
    expect(icon.length).toBeGreaterThan(0);
  });

  it('onFileClick emits workspace event', async () => {
    await TestBed.configureTestingModule({ imports: [OneDriveTreeComponent], providers: [{ provide: (await import('../../../../core/services/workspace-state.service')).WorkspaceStateService, useClass: MockWorkspace }, { provide: (await import('../../../../core/services/onedrive.service')).OneDriveService, useClass: MockOneDriveService }] }).compileComponents();
    const fixture = TestBed.createComponent(OneDriveTreeComponent);
    const comp = fixture.componentInstance;
    const ws = TestBed.inject((await import('../../../../core/services/workspace-state.service')).WorkspaceStateService as any);

    const file = { id: 'f1', name: 'file.txt' } as any;
    comp.onFileClick(file);
    expect(ws.emitOneDriveFileSelected).toHaveBeenCalledWith(file);
  });
});
