import { TestBed } from '@angular/core/testing';
import { GoogleDriveTreeComponent } from './google-drive-tree.component';

class MockGoogleDrive { async checkConnection(){} async downloadFile(){ return new Blob(['a']); } }
class MockToast { success = jest.fn(); error = jest.fn(); }

describe('GoogleDriveTreeComponent', () => {
  it('toggles root and menus and properties', async () => {
    await TestBed.configureTestingModule({ imports: [GoogleDriveTreeComponent], providers: [ { provide: (await import('../../../../core/services/google-drive.service')).GoogleDriveService, useClass: MockGoogleDrive }, { provide: (await import('../../../../core/services/toast.service')).ToastService, useClass: MockToast } ] }).compileComponents();
    const fixture = TestBed.createComponent(GoogleDriveTreeComponent);
    const comp = fixture.componentInstance;

    expect(comp.isRootExpanded()).toBe(true);
    comp.toggleRootFolder();
    expect(comp.isRootExpanded()).toBe(false);

    comp.toggleFileMenu('f1');
    expect(comp.openMenuId()).toBe('f1');
    comp.toggleFileMenu('f1');
    expect(comp.openMenuId()).toBeNull();

    const file = { id: 'x', name: 'n', size: '1024', mimeType: 'text/plain' } as any;
    comp.handleProperties(file);
    expect(comp.showPropertiesModal()).toBe(true);
    expect(comp.propertiesModalData().length).toBeGreaterThan(0);
  });

  it('ngOnInit calls checkConnection', async () => {
    const checkSpy = jest.fn().mockResolvedValue(undefined);
    class InitGoogle { async checkConnection(){ return checkSpy(); } }

    await TestBed.configureTestingModule({ imports: [GoogleDriveTreeComponent], providers: [ { provide: (await import('../../../../core/services/google-drive.service')).GoogleDriveService, useClass: InitGoogle } ] }).compileComponents();
    const fixture = TestBed.createComponent(GoogleDriveTreeComponent);
    const comp = fixture.componentInstance;

    await comp.ngOnInit();
    expect(checkSpy).toHaveBeenCalled();
  });

  it('handleDownload adds extension for Google Workspace files and shows toast', async () => {
    class DocOneDrive { async downloadFile(){ return new Blob(['doc']); } }
    const mockToast = new MockToast();

    await TestBed.configureTestingModule({ imports: [GoogleDriveTreeComponent], providers: [ { provide: (await import('../../../../core/services/google-drive.service')).GoogleDriveService, useClass: DocOneDrive }, { provide: (await import('../../../../core/services/toast.service')).ToastService, useValue: mockToast } ] }).compileComponents();
    const fixture = TestBed.createComponent(GoogleDriveTreeComponent);
    const comp = fixture.componentInstance;

    const file = { id: 'f1', name: 'doc', mimeType: 'application/vnd.google-apps.document' } as any;

    await comp.handleDownload(file);

    expect(mockToast.success).toHaveBeenCalledWith(expect.stringContaining('Downloaded'));
  });

  it('handleDownload shows error when download fails', async () => {
    class FailGoogle { async downloadFile(){ throw new Error('dl fail'); } }
    const mockToast = new MockToast();

    await TestBed.configureTestingModule({ imports: [GoogleDriveTreeComponent], providers: [ { provide: (await import('../../../../core/services/google-drive.service')).GoogleDriveService, useClass: FailGoogle }, { provide: (await import('../../../../core/services/toast.service')).ToastService, useValue: mockToast } ] }).compileComponents();
    const fixture = TestBed.createComponent(GoogleDriveTreeComponent);
    const comp = fixture.componentInstance;

    const file = { id: 'f1', name: 'file.txt' } as any;
    await comp.handleDownload(file);
    expect(mockToast.error).toHaveBeenCalled();
  });

  it('handleDownload returns early when download returns null', async () => {
    class NullGD { async downloadFile(){ return null; } }
    const mockToast = new MockToast();

    await TestBed.configureTestingModule({ imports: [GoogleDriveTreeComponent], providers: [ { provide: (await import('../../../../core/services/google-drive.service')).GoogleDriveService, useClass: NullGD }, { provide: (await import('../../../../core/services/toast.service')).ToastService, useValue: mockToast } ] }).compileComponents();
    const fixture = TestBed.createComponent(GoogleDriveTreeComponent);
    const comp = fixture.componentInstance;

    const file = { id: 'f1', name: 'file', mimeType: 'application/pdf' } as any;
    await comp.handleDownload(file);
    expect(mockToast.success).not.toHaveBeenCalled();
    expect(mockToast.error).not.toHaveBeenCalled();
  });

  it('handleDownload uses URL.createObjectURL and revokes it and appends anchor to DOM', async () => {
    const blob = new Blob(['x']);
    class BlobGD { async downloadFile(){ return blob; } }
    const mockToast = new MockToast();

    const createSpy = jest.spyOn(URL, 'createObjectURL').mockReturnValue('blob:url' as any);
    const revokeSpy = jest.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    const origCreate = document.createElement;
    // create a real anchor element so appendChild accepts it
    const realAnchor = origCreate.call(document, 'a') as HTMLAnchorElement;
    const clickSpy = jest.spyOn(realAnchor, 'click');
    const appendSpy = jest.spyOn(document.body, 'appendChild');
    const removeSpy = jest.spyOn(document.body, 'removeChild');

    await TestBed.configureTestingModule({ imports: [GoogleDriveTreeComponent], providers: [ { provide: (await import('../../../../core/services/google-drive.service')).GoogleDriveService, useClass: BlobGD }, { provide: (await import('../../../../core/services/toast.service')).ToastService, useValue: mockToast } ] }).compileComponents();
    const fixture = TestBed.createComponent(GoogleDriveTreeComponent);
    const comp = fixture.componentInstance;

    // override createElement AFTER Angular has created root elements
    document.createElement = jest.fn().mockReturnValue(realAnchor) as any;

    const file = { id: 'f1', name: 'file', mimeType: 'application/pdf' } as any;
    await comp.handleDownload(file);

    expect(createSpy).toHaveBeenCalledWith(blob);
    expect(clickSpy).toHaveBeenCalled();
    expect(appendSpy).toHaveBeenCalledWith(realAnchor);
    expect(removeSpy).toHaveBeenCalledWith(realAnchor);
    expect(revokeSpy).toHaveBeenCalledWith('blob:url');
    expect(mockToast.success).toHaveBeenCalledWith(expect.stringContaining('Downloaded'));

    // restore
    document.createElement = origCreate;
    createSpy.mockRestore();
    revokeSpy.mockRestore();
  });

  it('handleImportToDevPad creates Imports when missing and uploads', async () => {
    const mockFolderSvc: any = { getFolders: jest.fn().mockResolvedValue([]), createFolder: jest.fn().mockResolvedValue({ id: 'imp' }) };
    const mockNote: any = { uploadDocument: jest.fn().mockResolvedValue({}) };
    class GD { async downloadFile(){ return new Blob(['x']); } }
    const mockToast = new MockToast();
    const mockWS: any = { emitFoldersChanged: jest.fn() };
    const mockAuth: any = { userId: () => 'u1' };

    await TestBed.configureTestingModule({ imports: [GoogleDriveTreeComponent], providers: [ { provide: (await import('../../../../core/services/google-drive.service')).GoogleDriveService, useClass: GD }, { provide: (await import('../../../folders/services/folder.service')).FolderService, useValue: mockFolderSvc }, { provide: (await import('../../../../core/services/note.service')).NoteService, useValue: mockNote }, { provide: (await import('../../../../core/services/toast.service')).ToastService, useValue: mockToast }, { provide: (await import('../../../../core/services/workspace-state.service')).WorkspaceStateService, useValue: mockWS }, { provide: (await import('../../../../core/services/auth-state.service')).AuthStateService, useValue: mockAuth } ] }).compileComponents();

    const fixture = TestBed.createComponent(GoogleDriveTreeComponent);
    const comp = fixture.componentInstance;

    const file = { id: 'f1', name: 'file', mimeType: 'application/vnd.google-apps.document' } as any;
    await comp.handleImportToDevPad(file);

    expect(mockFolderSvc.createFolder).toHaveBeenCalled();
    expect(mockNote.uploadDocument).toHaveBeenCalled();
    expect(mockToast.success).toHaveBeenCalled();
    expect(mockWS.emitFoldersChanged).toHaveBeenCalled();
  });

  it('handleImportToDevPad returns early when download returns null', async () => {
    class NullGD { async downloadFile(){ return null; } }
    const mockFolderSvc: any = { getFolders: jest.fn().mockResolvedValue([]), createFolder: jest.fn().mockResolvedValue({ id: 'imp' }) };
    const mockToast = new MockToast();
    const mockAuth: any = { userId: () => 'u1' };

    await TestBed.configureTestingModule({ imports: [GoogleDriveTreeComponent], providers: [ { provide: (await import('../../../../core/services/google-drive.service')).GoogleDriveService, useClass: NullGD }, { provide: (await import('../../../folders/services/folder.service')).FolderService, useValue: mockFolderSvc }, { provide: (await import('../../../../core/services/toast.service')).ToastService, useValue: mockToast }, { provide: (await import('../../../../core/services/auth-state.service')).AuthStateService, useValue: mockAuth } ] }).compileComponents();

    const fixture = TestBed.createComponent(GoogleDriveTreeComponent);
    const comp = fixture.componentInstance;

    const file = { id: 'f1', name: 'file', mimeType: 'application/pdf' } as any;
    await comp.handleImportToDevPad(file);
    expect(mockToast.success).not.toHaveBeenCalled();
  });

  it('handleRename respects prompt and renames when valid', async () => {
    const renameSpy = jest.fn().mockResolvedValue(undefined);
    class OpsGD { async renameFile(id: string, name: string){ return renameSpy(id, name); } }

    await TestBed.configureTestingModule({ imports: [GoogleDriveTreeComponent], providers: [ { provide: (await import('../../../../core/services/google-drive.service')).GoogleDriveService, useClass: OpsGD } ] }).compileComponents();
    const fixture = TestBed.createComponent(GoogleDriveTreeComponent);
    const comp = fixture.componentInstance;

    const file = { id: 'f1', name: 'old' } as any;
    jest.spyOn(window as any, 'prompt').mockReturnValue('new');

    await comp.handleRename(file);
    expect(renameSpy).toHaveBeenCalledWith('f1', 'new');

    // same name or cancel
    jest.spyOn(window as any, 'prompt').mockReturnValue('old');
    await comp.handleRename(file);
    expect(renameSpy).toHaveBeenCalledTimes(1);

    jest.spyOn(window as any, 'prompt').mockReturnValue(null);
    await comp.handleRename(file);
    expect(renameSpy).toHaveBeenCalledTimes(1);
  });

  it('handleDelete confirm and cancel workflows', async () => {
    const deleteSpy = jest.fn().mockResolvedValue(undefined);
    class DelGD { async deleteFile(id: string){ return deleteSpy(id); } }

    await TestBed.configureTestingModule({ imports: [GoogleDriveTreeComponent], providers: [ { provide: (await import('../../../../core/services/google-drive.service')).GoogleDriveService, useClass: DelGD } ] }).compileComponents();
    const fixture = TestBed.createComponent(GoogleDriveTreeComponent);
    const comp = fixture.componentInstance;

    const file = { id: 'f1', name: 'file.txt' } as any;
    comp.handleDelete(file);
    expect(comp.showDeleteConfirm()).toBe(true);
    expect(comp.fileToDelete()).toBe(file);

    comp.onDeleteCancel();
    expect(comp.showDeleteConfirm()).toBe(false);
    expect(comp.fileToDelete()).toBeNull();

    comp.handleDelete(file);
    await comp.onDeleteConfirm();
    expect(deleteSpy).toHaveBeenCalledWith('f1');
    expect(comp.fileToDelete()).toBeNull();
  });

  it('downloadToLocal uploads to local storage and handles errors', async () => {
    class DLGD { async downloadFile(){ return new Blob(['x']); } }
    const mockNote: any = { uploadDocument: jest.fn().mockResolvedValue({}) };
    const mockToast = new MockToast();
    const mockAuth: any = { userId: () => 'u1' };

    await TestBed.configureTestingModule({ imports: [GoogleDriveTreeComponent], providers: [ { provide: (await import('../../../../core/services/google-drive.service')).GoogleDriveService, useClass: DLGD }, { provide: (await import('../../../../core/services/note.service')).NoteService, useValue: mockNote }, { provide: (await import('../../../../core/services/toast.service')).ToastService, useValue: mockToast }, { provide: (await import('../../../../core/services/auth-state.service')).AuthStateService, useValue: mockAuth } ] }).compileComponents();
    const fixture = TestBed.createComponent(GoogleDriveTreeComponent);
    const comp = fixture.componentInstance;

    const file = { id: 'f1', name: 'f', mimeType: 'application/pdf' } as any;
    await comp.downloadToLocal(file);
    expect(mockNote.uploadDocument).toHaveBeenCalled();
    expect(mockToast.success).toHaveBeenCalled();

    mockNote.uploadDocument.mockRejectedValueOnce(new Error('err'));
    await comp.downloadToLocal(file);
    expect(mockToast.error).toHaveBeenCalled();
  });

  it('onFileClick emits workspace event', async () => {
    const mockWS: any = { emitGoogleDriveFileSelected: jest.fn() };
    await TestBed.configureTestingModule({ imports: [GoogleDriveTreeComponent], providers: [{ provide: (await import('../../../../core/services/workspace-state.service')).WorkspaceStateService, useValue: mockWS }, { provide: (await import('../../../../core/services/google-drive.service')).GoogleDriveService, useClass: MockGoogleDrive }] }).compileComponents();
    const fixture = TestBed.createComponent(GoogleDriveTreeComponent);
    const comp = fixture.componentInstance;

    const file = { id: 'f1', name: 'file.txt' } as any;
    comp.onFileClick(file);
    expect(mockWS.emitGoogleDriveFileSelected).toHaveBeenCalledWith(file);
  });
});