import { TestBed } from '@angular/core/testing';
import { DashboardHomeComponent } from './dashboard-home.component';

class MockWorkspace {
  public googleCb: any = null;
  public oneCb: any = null;
  public googleDriveFileSelected$ = {
    subscribe: (cb: any) => {
      this.googleCb = cb;
      return { unsubscribe: () => {} };
    },
  };
  public oneDriveFileSelected$ = {
    subscribe: (cb: any) => {
      this.oneCb = cb;
      return { unsubscribe: () => {} };
    },
  };
  triggerGoogle(file: any) {
    if (this.googleCb) this.googleCb(file);
  }
  triggerOne(file: any) {
    if (this.oneCb) this.oneCb(file);
  }
}

describe('DashboardHomeComponent', () => {
  it('renders welcome when no files selected and can close previews', async () => {
    const ws = new MockWorkspace();

    await TestBed.configureTestingModule({
      imports: [DashboardHomeComponent],
      providers: [
        {
          provide: (await import('../../../../core/services/workspace-state.service'))
            .WorkspaceStateService,
          useValue: ws,
        },
        {
          provide: (await import('../../../../core/services/google-drive.service'))
            .GoogleDriveService,
          useValue: {},
        },
        {
          provide: (await import('../../../../core/services/onedrive.service')).OneDriveService,
          useValue: {},
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(DashboardHomeComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Welcome to DevPad');

    const comp = fixture.componentInstance;
    comp.selectedGoogleDriveFile.set({ id: 'f1', name: 'file' } as any);
    comp.closeGoogleDrivePreview();
    expect(comp.selectedGoogleDriveFile()).toBeNull();
  });

  it('subscribes to workspace file selections and updates signals', async () => {
    const ws = new MockWorkspace();

    await TestBed.configureTestingModule({
      imports: [DashboardHomeComponent],
      providers: [
        {
          provide: (await import('../../../../core/services/workspace-state.service'))
            .WorkspaceStateService,
          useValue: ws,
        },
        {
          provide: (await import('../../../../core/services/google-drive.service'))
            .GoogleDriveService,
          useValue: {},
        },
        {
          provide: (await import('../../../../core/services/onedrive.service')).OneDriveService,
          useValue: {},
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(DashboardHomeComponent);
    fixture.detectChanges();
    const comp = fixture.componentInstance;

    const gFile = { id: 'g1', name: 'gfile' } as any;
    ws.triggerGoogle(gFile);
    expect(comp.selectedGoogleDriveFile()).toEqual(gFile);

    const oFile = { id: 'o1', name: 'ofile' } as any;
    ws.triggerOne(oFile);
    expect(comp.selectedOneDriveFile()).toEqual(oFile);
  });

  it('handles google drive actions: rename, delete true/false, imported', async () => {
    const ws = new MockWorkspace();
    const googleSvc: any = { renameFile: jest.fn().mockResolvedValue(true), deleteFile: jest.fn() };

    await TestBed.configureTestingModule({
      imports: [DashboardHomeComponent],
      providers: [
        {
          provide: (await import('../../../../core/services/workspace-state.service'))
            .WorkspaceStateService,
          useValue: ws,
        },
        {
          provide: (await import('../../../../core/services/google-drive.service'))
            .GoogleDriveService,
          useValue: googleSvc,
        },
        {
          provide: (await import('../../../../core/services/onedrive.service')).OneDriveService,
          useValue: {},
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(DashboardHomeComponent);
    fixture.detectChanges();
    const comp = fixture.componentInstance;

    // rename
    await comp.handleGoogleDriveFileAction({
      action: 'rename',
      file: { id: 'g1', name: 'new' } as any,
    });
    expect(googleSvc.renameFile).toHaveBeenCalledWith('g1', 'new');

    // delete returns false -> preview remains
    googleSvc.deleteFile = jest.fn().mockResolvedValue(false);
    comp.selectedGoogleDriveFile.set({ id: 'g1', name: 'x' } as any);
    await comp.handleGoogleDriveFileAction({ action: 'delete', file: { id: 'g1' } as any });
    expect(comp.selectedGoogleDriveFile()).not.toBeNull();

    // delete returns true -> preview closed
    googleSvc.deleteFile = jest.fn().mockResolvedValue(true);
    comp.selectedGoogleDriveFile.set({ id: 'g2', name: 'y' } as any);
    await comp.handleGoogleDriveFileAction({ action: 'delete', file: { id: 'g2' } as any });
    expect(comp.selectedGoogleDriveFile()).toBeNull();

    // imported: should not throw
    comp.selectedGoogleDriveFile.set({ id: 'i1', name: 'imp' } as any);
    await expect(
      comp.handleGoogleDriveFileAction({ action: 'imported', file: { id: 'i1' } as any }),
    ).resolves.not.toThrow();
  });

  it('handles onedrive actions: rename, delete true/false, imported', async () => {
    const ws = new MockWorkspace();
    const oneSvc: any = { renameFile: jest.fn().mockResolvedValue(true), deleteFile: jest.fn() };

    await TestBed.configureTestingModule({
      imports: [DashboardHomeComponent],
      providers: [
        {
          provide: (await import('../../../../core/services/workspace-state.service'))
            .WorkspaceStateService,
          useValue: ws,
        },
        {
          provide: (await import('../../../../core/services/google-drive.service'))
            .GoogleDriveService,
          useValue: {},
        },
        {
          provide: (await import('../../../../core/services/onedrive.service')).OneDriveService,
          useValue: oneSvc,
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(DashboardHomeComponent);
    fixture.detectChanges();
    const comp = fixture.componentInstance;

    // rename
    await comp.handleOneDriveFileAction({
      action: 'rename',
      file: { id: 'o1', name: 'new' } as any,
    });
    expect(oneSvc.renameFile).toHaveBeenCalledWith('o1', 'new');

    // delete returns false -> preview remains
    oneSvc.deleteFile = jest.fn().mockResolvedValue(false);
    comp.selectedOneDriveFile.set({ id: 'o1', name: 'x' } as any);
    await comp.handleOneDriveFileAction({ action: 'delete', file: { id: 'o1' } as any });
    expect(comp.selectedOneDriveFile()).not.toBeNull();

    // delete returns true -> preview closed
    oneSvc.deleteFile = jest.fn().mockResolvedValue(true);
    comp.selectedOneDriveFile.set({ id: 'o2', name: 'y' } as any);
    await comp.handleOneDriveFileAction({ action: 'delete', file: { id: 'o2' } as any });
    expect(comp.selectedOneDriveFile()).toBeNull();

    // imported: should not throw
    comp.selectedOneDriveFile.set({ id: 'i1', name: 'imp' } as any);
    await expect(
      comp.handleOneDriveFileAction({ action: 'imported', file: { id: 'i1' } as any }),
    ).resolves.not.toThrow();
  });
});
