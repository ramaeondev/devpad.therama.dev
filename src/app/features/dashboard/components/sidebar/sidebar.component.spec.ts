import { TestBed } from '@angular/core/testing';
import { SidebarComponent } from './sidebar.component';

class MockFolderService {
  async getFolderTree() {
    return [];
  }
}
class MockAuth {
  userId() {
    return 'u1';
  }
}
class MockWorkspace {
  foldersChanged$ = { subscribe: () => {} };
  setSelectedFolder() {}
  emitNoteSelected() {}
}

const DRIVE_MOCK = {
  isConnected: () => false,
  checkConnection: async () => true,
  connect: async () => {},
  disconnect: async () => {},
  renameFile: async () => {},
  deleteFile: async () => {},
};

describe('SidebarComponent', () => {
  it('shows empty state when no folders', async () => {
    await TestBed.configureTestingModule({
      imports: [SidebarComponent],
      providers: [
        {
          provide: (await import('../../../folders/services/folder.service')).FolderService,
          useClass: MockFolderService,
        },
        {
          provide: (await import('../../../../core/services/auth-state.service')).AuthStateService,
          useClass: MockAuth,
        },
        {
          provide: (await import('../../../../core/services/workspace-state.service'))
            .WorkspaceStateService,
          useClass: MockWorkspace,
        },
        {
          provide: (await import('../../../../core/services/google-drive.service'))
            .GoogleDriveService,
          useValue: {
            isConnected: () => false,
            checkConnection: async () => true,
            connect: async () => {},
            disconnect: async () => {},
            renameFile: async () => {},
            deleteFile: async () => {},
          },
        },
        {
          provide: (await import('../../../../core/services/onedrive.service')).OneDriveService,
          useValue: {
            isConnected: () => false,
            checkConnection: async () => true,
            connect: async () => {},
            disconnect: async () => {},
            renameFile: async () => {},
            deleteFile: async () => {},
          },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(SidebarComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Google Drive not connected');
  });

  it('loadFolders sets folderTree when folders returned', async () => {
    TestBed.resetTestingModule();
    const mockFolderSvc: any = {
      getFolderTree: jest.fn().mockResolvedValue([{ id: 'f1', name: 'Root', is_root: true }]),
    };
    const mockWS: any = {
      foldersChanged$: { subscribe: () => {} },
      setSelectedFolder: jest.fn(),
      emitNoteSelected: jest.fn(),
    };
    await TestBed.configureTestingModule({
      imports: [SidebarComponent],
      providers: [
        {
          provide: (await import('../../../folders/services/folder.service')).FolderService,
          useValue: mockFolderSvc,
        },
        {
          provide: (await import('../../../../core/services/auth-state.service')).AuthStateService,
          useClass: MockAuth,
        },
        {
          provide: (await import('../../../../core/services/workspace-state.service'))
            .WorkspaceStateService,
          useValue: mockWS,
        },
        {
          provide: (await import('../../../../core/services/google-drive.service'))
            .GoogleDriveService,
          useValue: {
            isConnected: () => false,
            checkConnection: async () => true,
            connect: async () => {},
            disconnect: async () => {},
            renameFile: async () => {},
            deleteFile: async () => {},
          },
        },
        {
          provide: (await import('../../../../core/services/onedrive.service')).OneDriveService,
          useValue: {
            isConnected: () => false,
            checkConnection: async () => true,
            connect: async () => {},
            disconnect: async () => {},
            renameFile: async () => {},
            deleteFile: async () => {},
          },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(SidebarComponent);
    const comp = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();

    expect(comp.folderTree().length).toBe(1);
    expect(comp.loading()).toBe(false);
    expect(mockFolderSvc.getFolderTree).toHaveBeenCalled();
  });

  it('loadFolders handles errors and resets loading', async () => {
    TestBed.resetTestingModule();
    const mockFolderSvc: any = { getFolderTree: jest.fn().mockRejectedValue(new Error('boom')) };
    const mockWS: any = { foldersChanged$: { subscribe: () => {} } };

    await TestBed.configureTestingModule({
      imports: [SidebarComponent],
      providers: [
        {
          provide: (await import('../../../folders/services/folder.service')).FolderService,
          useValue: mockFolderSvc,
        },
        {
          provide: (await import('../../../../core/services/auth-state.service')).AuthStateService,
          useClass: MockAuth,
        },
        {
          provide: (await import('../../../../core/services/workspace-state.service'))
            .WorkspaceStateService,
          useValue: mockWS,
        },
        {
          provide: (await import('../../../../core/services/google-drive.service'))
            .GoogleDriveService,
          useValue: DRIVE_MOCK,
        },
        {
          provide: (await import('../../../../core/services/onedrive.service')).OneDriveService,
          useValue: DRIVE_MOCK,
        },
      ],
    }).compileComponents();

    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const fixture = TestBed.createComponent(SidebarComponent);
    const comp = fixture.componentInstance;
    // call loadFolders directly and await it to ensure rejection is handled here
    await comp.loadFolders();

    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining('Error loading folders:'),
      expect.any(Error),
    );
    expect(comp.loading()).toBe(false);
    spy.mockRestore();
  });

  it('loadFolders does nothing when no user', async () => {
    TestBed.resetTestingModule();
    const mockFolderSvc: any = { getFolderTree: jest.fn() };
    const mockAuth: any = { userId: () => null };

    await TestBed.configureTestingModule({
      imports: [SidebarComponent],
      providers: [
        {
          provide: (await import('../../../folders/services/folder.service')).FolderService,
          useValue: mockFolderSvc,
        },
        {
          provide: (await import('../../../../core/services/auth-state.service')).AuthStateService,
          useValue: mockAuth,
        },
        {
          provide: (await import('../../../../core/services/workspace-state.service'))
            .WorkspaceStateService,
          useValue: { foldersChanged$: { subscribe: () => {} } },
        },
        {
          provide: (await import('../../../../core/services/google-drive.service'))
            .GoogleDriveService,
          useValue: {
            isConnected: () => false,
            checkConnection: async () => true,
            connect: async () => {},
            disconnect: async () => {},
            renameFile: async () => {},
            deleteFile: async () => {},
          },
        },
        {
          provide: (await import('../../../../core/services/onedrive.service')).OneDriveService,
          useValue: {
            isConnected: () => false,
            checkConnection: async () => true,
            connect: async () => {},
            disconnect: async () => {},
            renameFile: async () => {},
            deleteFile: async () => {},
          },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(SidebarComponent);
    const comp = fixture.componentInstance;
    await comp.loadFolders();
    expect(mockFolderSvc.getFolderTree).not.toHaveBeenCalled();
  });

  it('onFolderSelected sets selection and notifies workspace', async () => {
    TestBed.resetTestingModule();
    const mockWS: any = { foldersChanged$: { subscribe: () => {} }, setSelectedFolder: jest.fn() };

    await TestBed.configureTestingModule({
      imports: [SidebarComponent],
      providers: [
        {
          provide: (await import('../../../folders/services/folder.service')).FolderService,
          useClass: MockFolderService,
        },
        {
          provide: (await import('../../../../core/services/auth-state.service')).AuthStateService,
          useClass: MockAuth,
        },
        {
          provide: (await import('../../../../core/services/workspace-state.service'))
            .WorkspaceStateService,
          useValue: mockWS,
        },
        {
          provide: (await import('../../../../core/services/google-drive.service'))
            .GoogleDriveService,
          useValue: {
            isConnected: () => false,
            checkConnection: async () => true,
            connect: async () => {},
            disconnect: async () => {},
            renameFile: async () => {},
            deleteFile: async () => {},
          },
        },
        {
          provide: (await import('../../../../core/services/onedrive.service')).OneDriveService,
          useValue: {
            isConnected: () => false,
            checkConnection: async () => true,
            connect: async () => {},
            disconnect: async () => {},
            renameFile: async () => {},
            deleteFile: async () => {},
          },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(SidebarComponent);
    const comp = fixture.componentInstance;

    comp.onFolderSelected({ id: 'f9' } as any);

    expect(comp.selectedFolderId()).toBe('f9');
    expect(mockWS.setSelectedFolder).toHaveBeenCalledWith('f9');
  });

  it('onNoteSelected sets folder, emits selection and handles null folder', async () => {
    TestBed.resetTestingModule();
    const mockWS: any = {
      foldersChanged$: { subscribe: () => {} },
      setSelectedFolder: jest.fn(),
      emitNoteSelected: jest.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [SidebarComponent],
      providers: [
        {
          provide: (await import('../../../folders/services/folder.service')).FolderService,
          useClass: MockFolderService,
        },
        {
          provide: (await import('../../../../core/services/auth-state.service')).AuthStateService,
          useClass: MockAuth,
        },
        {
          provide: (await import('../../../../core/services/workspace-state.service'))
            .WorkspaceStateService,
          useValue: mockWS,
        },
        {
          provide: (await import('../../../../core/services/google-drive.service'))
            .GoogleDriveService,
          useValue: {
            isConnected: () => false,
            checkConnection: async () => true,
            connect: async () => {},
            disconnect: async () => {},
            renameFile: async () => {},
            deleteFile: async () => {},
          },
        },
        {
          provide: (await import('../../../../core/services/onedrive.service')).OneDriveService,
          useValue: {
            isConnected: () => false,
            checkConnection: async () => true,
            connect: async () => {},
            disconnect: async () => {},
            renameFile: async () => {},
            deleteFile: async () => {},
          },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(SidebarComponent);
    const comp = fixture.componentInstance;

    comp.onNoteSelected({ id: 'n1', folder_id: 'f2' } as any);
    expect(comp.selectedFolderId()).toBe('f2');
    expect(mockWS.setSelectedFolder).toHaveBeenCalledWith('f2');
    expect(mockWS.emitNoteSelected).toHaveBeenCalledWith({ id: 'n1', folder_id: 'f2' });

    // null folder case
    comp.onNoteSelected({ id: 'n2', folder_id: undefined } as any);
    expect(comp.selectedFolderId()).toBeUndefined();
    expect(mockWS.setSelectedFolder).toHaveBeenCalledWith(null);
  });

  it('foldersChanged subscription triggers reload', async () => {
    TestBed.resetTestingModule();
    const mockFolderSvc: any = { getFolderTree: jest.fn().mockResolvedValue([]) };
    const mockWS: any = {
      foldersChanged$: {
        _subs: [] as any[],
        subscribe(fn: any) {
          this._subs.push(fn);
          return { unsubscribe: () => {} };
        },
        emit() {
          this._subs.forEach((s: any) => s());
        },
      },
      setSelectedFolder: jest.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [SidebarComponent],
      providers: [
        {
          provide: (await import('../../../folders/services/folder.service')).FolderService,
          useValue: mockFolderSvc,
        },
        {
          provide: (await import('../../../../core/services/auth-state.service')).AuthStateService,
          useClass: MockAuth,
        },
        {
          provide: (await import('../../../../core/services/workspace-state.service'))
            .WorkspaceStateService,
          useValue: mockWS,
        },
        {
          provide: (await import('../../../../core/services/google-drive.service'))
            .GoogleDriveService,
          useValue: DRIVE_MOCK,
        },
        {
          provide: (await import('../../../../core/services/onedrive.service')).OneDriveService,
          useValue: DRIVE_MOCK,
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(SidebarComponent);
    const comp = fixture.componentInstance;
    fixture.detectChanges();
    // initial call from ngOnInit
    await fixture.whenStable();
    // allow any microtasks from loadFolders to complete and stabilize view
    fixture.detectChanges();
    await fixture.whenStable();
    expect(mockFolderSvc.getFolderTree).toHaveBeenCalledTimes(1);

    // ensure we injected the mock instance into the component
    const injectedWS = (comp as any).workspaceState;
    expect(injectedWS).toBe(mockWS);

    // ensure subscription registered
    expect(mockWS.foldersChanged$._subs.length).toBeGreaterThan(0);

    // invoke the registered subscriber directly and await async work
    const fn = mockWS.foldersChanged$._subs[0];
    fn();
    await fixture.whenStable();
    expect(mockFolderSvc.getFolderTree).toHaveBeenCalledTimes(2);
  });
});
