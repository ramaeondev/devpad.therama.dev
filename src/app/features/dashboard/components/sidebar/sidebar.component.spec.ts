import { TestBed } from '@angular/core/testing';
import { SidebarComponent } from './sidebar.component';

class MockFolderService { async getFolderTree() { return []; } }
class MockAuth { userId() { return 'u1'; } }
class MockWorkspace { foldersChanged$ = { subscribe: () => {} }; setSelectedFolder() {} emitNoteSelected() {} }

describe('SidebarComponent', () => {
  it('shows empty state when no folders', async () => {
    await TestBed.configureTestingModule({ imports: [SidebarComponent], providers: [
      { provide: (await import('../../../folders/services/folder.service')).FolderService, useClass: MockFolderService },
      { provide: (await import('../../../../core/services/auth-state.service')).AuthStateService, useClass: MockAuth },
      { provide: (await import('../../../../core/services/workspace-state.service')).WorkspaceStateService, useClass: MockWorkspace },
      { provide: (await import('../../../../core/services/google-drive.service')).GoogleDriveService, useValue: { isConnected: () => false, checkConnection: async () => true, connect: async () => {}, disconnect: async () => {}, renameFile: async () => {}, deleteFile: async () => {} } },
      { provide: (await import('../../../../core/services/onedrive.service')).OneDriveService, useValue: { isConnected: () => false, checkConnection: async () => true, connect: async () => {}, disconnect: async () => {}, renameFile: async () => {}, deleteFile: async () => {} } },
    ] }).compileComponents();

    const fixture = TestBed.createComponent(SidebarComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Google Drive not connected');
  });
});